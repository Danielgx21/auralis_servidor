"""Notificações Web Push do DGX Meu Dia (Chrome Android / PWA).
Dados individuais no Neon; somente endpoints autenticados podem assinar.
O agendador externo chama dispatch com token servidor-servidor.
"""
import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from pywebpush import webpush, WebPushException
from py_vapid import Vapid
import storage
import podcasts

TZ = ZoneInfo("America/Sao_Paulo")
PREFS_DEFAULT = {
    "payments": True,
    "tasks": True,
    "reminders": True,
    "plants": True,
    "corinthians": True,
    "mood": False,
    "podcasts": True
}
VALID_HOSTS = ("fcm.googleapis.com", "fcmregistrations.googleapis.com",
               "updates.push.services.mozilla.com", "push.services.mozilla.com",
               "web.push.apple.com", "push.apple.com", "wns.notify.windows.com")


def setup():
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS dgx_push_subscriptions (
                    endpoint_hash TEXT PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES dgx_account(id) ON DELETE CASCADE,
                    endpoint TEXT NOT NULL,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS dgx_push_delivery (
                    endpoint_hash TEXT NOT NULL REFERENCES dgx_push_subscriptions(endpoint_hash)
                        ON DELETE CASCADE,
                    event_key TEXT NOT NULL,
                    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY(endpoint_hash, event_key)
                )
            """)


def validate(subscription):
    if not isinstance(subscription, dict):
        raise ValueError("Assinatura inválida.")
    endpoint = subscription.get("endpoint", "")
    keys = subscription.get("keys", {})
    if not isinstance(endpoint, str) or len(endpoint) > 2200:
        raise ValueError("Endpoint inválido.")
    if not isinstance(keys, dict):
        raise ValueError("Chaves inválidas.")
    parsed = urlsplit(endpoint)
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or host not in VALID_HOSTS or not parsed.path:
        raise ValueError("Provedor de notificações não reconhecido.")
    p256dh, auth = keys.get("p256dh", ""), keys.get("auth", "")
    if not all(isinstance(x, str) and 15 <= len(x) <= 200 for x in (p256dh, auth)):
        raise ValueError("Chaves de navegador inválidas.")
    return endpoint, p256dh, auth


def sub_hash(endpoint):
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def subscribe(user_id, data):
    endpoint, p256dh, auth = validate(data)
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO dgx_push_subscriptions (endpoint_hash,user_id,endpoint,p256dh,auth)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT(endpoint_hash) DO UPDATE SET
                  user_id=EXCLUDED.user_id, endpoint=EXCLUDED.endpoint,
                  p256dh=EXCLUDED.p256dh, auth=EXCLUDED.auth,updated_at=now()
            """, (sub_hash(endpoint), user_id, endpoint, p256dh, auth))
    return {"ok": True}


def unsubscribe(user_id, data):
    endpoint = data.get("endpoint", "") if isinstance(data, dict) else ""
    if not isinstance(endpoint, str):
        raise ValueError("Assinatura inválida.")
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dgx_push_subscriptions WHERE user_id=%s AND endpoint_hash=%s",
                        (user_id, sub_hash(endpoint)))
    return {"ok": True}


def subscription_count(user_id):
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM dgx_push_subscriptions WHERE user_id=%s", (user_id,))
            return cur.fetchone()[0]


def _vapid():
    private = os.environ.get("VAPID_PRIVATE_BASE64", "")
    if not private:
        raise RuntimeError("Chave VAPID ainda não configurada.")
    return Vapid.from_pem(base64.b64decode(private))


def _send(endpoint, p256dh, auth, payload):
    webpush(
        subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
        data=json.dumps(payload, ensure_ascii=False),
        vapid_private_key=_vapid(),
        vapid_claims={"sub": "https://dgx-meu-dia.onrender.com"},
        ttl=10800,
        timeout=15,
    )


def send_test(user_id):
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT endpoint_hash,endpoint,p256dh,auth FROM dgx_push_subscriptions WHERE user_id=%s",
                        (user_id,))
            subs = cur.fetchall()
    count = 0
    for endpoint_hash, endpoint, p256dh, auth in subs:
        try:
            _send(endpoint, p256dh, auth, {
                "title": "DGX Meu Dia: notificações ativas",
                "body": "Teste recebido! Os avisos também podem chegar com o aplicativo fechado.",
                "tag": "dgx-test", "url": "/"
            })
            count += 1
        except WebPushException as error:
            if error.status_code in (404, 410):
                _remove_stale(endpoint_hash)
            print("Falha no push de teste:", error.status_code, flush=True)
    return {"sent": count, "subscriptions": len(subs)}


def _remove_stale(endpoint_hash):
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dgx_push_subscriptions WHERE endpoint_hash=%s", (endpoint_hash,))


def _day(s):
    return datetime.strptime(s[:10], "%Y-%m-%d").date()


def _money(cents):
    cents = int(cents)
    value = f"{cents/100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return "R$ " + value


def _prefs(data):
    prefs = dict(PREFS_DEFAULT)
    custom = data.get("dgx_push_prefs_v1", {})
    if isinstance(custom, dict):
        for key in prefs:
            if isinstance(custom.get(key), bool):
                prefs[key] = custom[key]
    return prefs


def _events(data, now, games):
    """Retorna eventos identificados de forma estável, nunca uma notificação por varredura."""
    today = now.date()
    hour, minute = now.hour, now.minute
    events = []
    prefs = _prefs(data)
    def add(key, title, body, target):
        events.append((key, {"title": title, "body": body,
                             "tag": key[:100], "url": target}))
    if prefs["payments"]:
        for bill in data.get("dgx_payments_v1", []):
            if not isinstance(bill, dict) or not bill.get("id"):
                continue
            month = today.strftime("%Y-%m")
            if bill.get("startMonth", "") > month or (bill.get("endMonth") and bill["endMonth"] <= month):
                continue
            if (bill.get("paid") or {}).get(month):
                continue
            from calendar import monthrange
            due_day = min(max(int(bill.get("dueDay", 10)), 1), monthrange(today.year, today.month)[1])
            due = today.replace(day=due_day)
            ahead = (due-today).days
            if ahead in (0, 1, 2) and 7 <= hour <= 22:
                title = "Conta vence hoje" if ahead == 0 else ("Conta vence amanhã" if ahead == 1 else "Conta vence em 2 dias")
                add(f"pay:{bill['id']}:{month}:{ahead}", title,
                    f"{str(bill.get('title','Pagamento'))[:80]} · confira em Contas.", "/#payments")
    if prefs["tasks"]:
        for t in data.get("dgx_tasks_v1", []):
            if not isinstance(t, dict) or t.get("done"):
                continue
            due = t.get("date", "")
            if not due:
                continue
            try:
                ahead = (_day(due)-today).days
            except Exception:
                continue
            if ahead in (0,1) and 7 <= hour <= 22:
                label = "hoje" if ahead == 0 else "amanhã"
                add(f"task:{t.get('id')}:{due}:{ahead}", "Tarefa "+label,
                    f"{str(t.get('title','Compromisso'))[:90]} · {str(t.get('type','pessoal')).upper()}",
                    "/#calendar")
    if prefs["reminders"]:
        for r in data.get("dgx_reminders_v1", []):
            if not isinstance(r, dict) or not r.get("at"):
                continue
            try:
                at = datetime.fromisoformat(r["at"])
                at = at.replace(tzinfo=TZ) if at.tzinfo is None else at.astimezone(TZ)
                diff = (at - now).total_seconds()
            except Exception:
                continue
            if -900 < diff <= 900:
                add(f"reminder:{r.get('id')}", "Lembrete DGX", str(r.get("title", "Compromisso"))[:110], "/#alerts")
    if prefs["plants"] and 7 <= hour <= 22:
        for p in data.get("dgx_plants_v1", []):
            hist = [h.get("date") for h in p.get("history", []) if isinstance(h, dict) and h.get("date")]
            if not hist: continue
            try:
                next_due = _day(max(hist)) + timedelta(days=int(p.get("interval", 30)))
                ahead = (next_due-today).days
            except Exception:
                continue
            if ahead in (0,1):
                add(f"plant:{p.get('id')}:{next_due}:{ahead}",
                    "Lembrete de adubação",
                    str(p.get("name", "Uma planta"))[:90] + (" · referência para hoje." if ahead==0 else " · referência para amanhã."),
                    "/#plants")
    if prefs["mood"]:
        moods = data.get("dgx_moods_v1", [])
        for period, wake_hour in (("manha", 8), ("noite", 21)):
            if hour == wake_hour and 0 <= minute <= 25:
                if not any(x.get("day")==today.isoformat() and x.get("period")==period for x in moods):
                    add(f"mood:{today}:{period}", "Como você está se sentindo?",
                        "Faça seu registro de humor de "+("manhã." if period=="manha" else "noite."), "/#mood")
    if prefs["corinthians"]:
        for g in games:
            try:
                when = datetime.fromisoformat(g["date"].replace("Z","+00:00")).astimezone(TZ)
                mins = (when-now).total_seconds()/60
            except Exception:continue
            if 0 < mins <= 60:
                add(f"game:{g.get('id')}:{when.date()}:60", "Corinthians joga em menos de 1 hora",
                    f"{g.get('home')} × {g.get('away')} · confira o horário.", "/")
            elif 1380 <= mins <= 1440:
                add(f"game:{g.get('id')}:{when.date()}:1440", "Corinthians joga amanhã",
                    f"{g.get('home')} × {g.get('away')} · confira o horário.", "/")
    return events


def dispatch(games=None):
    now = datetime.now(TZ)
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT user_id FROM dgx_push_subscriptions")
            user_ids = [r[0] for r in cur.fetchall()]
    count = failed = 0
    for user_id in user_ids:
        data = storage.read_data(user_id)
        events = _events(data, now, games or [])
        if _prefs(data)["podcasts"]:
            events.extend(podcasts.monitor(user_id, data.get("dgx_podcasts_v1", []), now))
        with storage.connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT endpoint_hash,endpoint,p256dh,auth FROM dgx_push_subscriptions WHERE user_id=%s",
                            (user_id,))
                subs = cur.fetchall()
        for event_key, payload in events:
            for endpoint_hash, endpoint, p256dh, auth in subs:
                # Claim in the database before sending to avoid duplicate events from parallel checks.
                with storage.connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                          INSERT INTO dgx_push_delivery(endpoint_hash,event_key)
                          VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING endpoint_hash
                        """, (endpoint_hash, event_key))
                        claimed = bool(cur.fetchone())
                if not claimed: continue
                try:
                    _send(endpoint, p256dh, auth, payload)
                    count += 1
                except WebPushException as error:
                    if error.status_code in (404, 410):
                        _remove_stale(endpoint_hash)
                    else:
                        _unclaim(endpoint_hash, event_key)
                    failed += 1
                    print("Envio WebPush falhou:", error.status_code, flush=True)
                except Exception as error:
                    _unclaim(endpoint_hash, event_key)
                    failed += 1
                    print("Falha WebPush:", type(error).__name__, flush=True)
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dgx_push_delivery WHERE sent_at < now() - interval '100 days'")
    return {"sent": count, "failed": failed, "subscribers": len(user_ids),
            "checked_at": now.isoformat()}


def _unclaim(endpoint_hash, event_key):
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dgx_push_delivery WHERE endpoint_hash=%s AND event_key=%s",
                        (endpoint_hash, event_key))


def valid_dispatch_token(value):
    expected = os.environ.get("PUSH_DISPATCH_SECRET", "")
    return bool(expected) and hmac.compare_digest(
        value or "", "Bearer " + expected
    )
