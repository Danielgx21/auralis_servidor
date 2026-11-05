"""DGX Meu Dia — servidor mínimo para a PWA pessoal."""
import json
import os
import urllib.request
from http.cookies import SimpleCookie
from urllib.parse import urlsplit
import storage
import push_service
import podcasts
from urllib.parse import parse_qs
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
FALLBACK = [
    {"id": "cor-bot-20261118", "date": "2026-11-18T21:30:00-03:00",
     "home": "Corinthians", "away": "Botafogo", "competition": "Brasileirão",
     "source": "https://ge.globo.com/futebol/times/corinthians/noticia/2026/10/30/cbf-define-datas-para-jogos-do-corinthians-contra-botafogo-e-atletico-mg-pelo-brasileirao.ghtml"},
    {"id": "cam-cor-20261125", "date": "2026-11-25T20:00:00-03:00",
     "home": "Atlético-MG", "away": "Corinthians", "competition": "Brasileirão",
     "source": "https://ge.globo.com/futebol/times/corinthians/noticia/2026/10/30/cbf-define-datas-para-jogos-do-corinthians-contra-botafogo-e-atletico-mg-pelo-brasileirao.ghtml"}
]
_cache = {"until": None, "data": None}
_lock = Lock()


def fixtures():
    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    with _lock:
        if _cache["until"] and now < _cache["until"]:
            return _cache["data"]
    # A API de placares da ESPN não aceita intervalos longos YYYYMMDD-YYYYMMDD:
    # consultar por mês e filtrar os eventos futuros. Fonte não oficial.
    this_month = now.replace(day=1)
    next_month = (this_month + timedelta(days=35)).replace(day=1)
    months = [this_month.strftime("%Y%m"), next_month.strftime("%Y%m")]
    games = []
    origin = "ESPN (dados públicos não oficiais)"
    failed_months = 0
    for month in months:
        url = ("https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard"
               f"?dates={month}&limit=600")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "DGXMeuDia/1.0"})
            with urllib.request.urlopen(req, timeout=7) as response:
                raw = json.load(response)
            for event in raw.get("events", []):
                comp = (event.get("competitions") or [{}])[0]
                sides = comp.get("competitors", [])
                if len(sides) != 2:
                    continue
                names = [x.get("team", {}).get("displayName", "") for x in sides]
                if not any("corinthians" in name.lower() for name in names):
                    continue
                stamp = event.get("date")
                if not stamp:
                    continue
                event_time = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
                if event_time < now:
                    continue
                home = next((x for x in sides if x.get("homeAway") == "home"), sides[0])
                away = next((x for x in sides if x.get("homeAway") == "away"), sides[1])
                games.append({
                    "id": "espn-" + str(event.get("id", "")),
                    "date": stamp,
                    "home": home.get("team", {}).get("displayName", "Mandante"),
                    "away": away.get("team", {}).get("displayName", "Visitante"),
                    "competition": "Brasileirão",
                    "source": "https://www.espn.com.br/futebol/time/agenda/_/id/874",
                })
        except Exception as exc:
            failed_months += 1
            print("Agenda dinâmica indisponível para", month, repr(exc), flush=True)
    if failed_months:
        origin = "ESPN (consulta parcial, dados não oficiais)"
    games = sorted(games, key=lambda item: item["date"])
    if not games:
        games = [g for g in FALLBACK if datetime.fromisoformat(g["date"]) >= now]
        origin = "Agenda de referência (30/10/2026); confirmar alterações"
    result = {"games": games[:8], "source_label": origin,
              "checked_at": now.isoformat()}
    with _lock:
        _cache.update(until=now + timedelta(minutes=45), data=result)
    return result


class Handler(BaseHTTPRequestHandler):
    def send(self, data, content_type, status=200, cookie=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(self), geolocation=(self)")
        self.send_header("Content-Length", str(len(data)))
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def reply(self, value, status=200, cookie=None):
        self.send(json.dumps(value, ensure_ascii=False).encode("utf-8"),
                  "application/json; charset=utf-8", status, cookie)

    def token(self):
        try:
            cookie = SimpleCookie()
            cookie.load(self.headers.get("Cookie", ""))
            part = cookie.get("dgx_session")
            return part.value if part else ""
        except Exception:
            return ""

    def auth(self):
        return storage.current_user(self.token())

    def session_cookie(self, token, expire=False):
        host = self.headers.get("Host", "")
        secure = "" if host.startswith(("localhost:", "127.0.0.1:")) else "; Secure"
        if expire:
            return "dgx_session=; Path=/; HttpOnly; SameSite=Lax" + secure + "; Max-Age=0"
        return "dgx_session=" + token + "; Path=/; HttpOnly; SameSite=Lax" + secure + "; Max-Age=5184000"

    def get_json(self):
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            raise ValueError("Envie JSON.")
        size = int(self.headers.get("Content-Length", "0"))
        if size <= 0 or size > 220_000:
            raise ValueError("Tamanho de requisição inválido.")
        obj = json.loads(self.rfile.read(size))
        if not isinstance(obj, dict):
            raise ValueError("JSON inválido.")
        return obj

    def check_origin(self):
        origin = self.headers.get("Origin")
        if not origin:
            return True
        try:
            parsed = urlsplit(origin)
            return parsed.netloc == self.headers.get("Host") and parsed.scheme in ("https", "http")
        except Exception:
            return False

    def do_GET(self):
        path = self.path.split("?")[0]
        try:
            if path == "/api/fixtures":
                return self.reply(fixtures())
            if path == "/api/bootstrap":
                return self.reply({"configured": storage.has_account()})
            if path == "/api/me":
                return self.reply({"logged_in": bool(self.auth())})
            if path == "/api/podcasts/search":
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Entre na sua conta."}, 401)
                term = parse_qs(urlsplit(self.path).query).get("q", [""])[0]
                try:
                    return self.reply({"results": podcasts.search(term)})
                except ValueError as error:
                    return self.reply({"error": str(error)}, 400)
            if path == "/api/podcasts/episodes":
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Entre na sua conta."}, 401)
                id_param = parse_qs(urlsplit(self.path).query).get("id", [""])[0]
                try:
                    return self.reply(podcasts.episode_list(user_id, id_param))
                except (ValueError, TypeError) as error:
                    return self.reply({"error": str(error)}, 400)
            if path == "/api/push/config":
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Entre na sua conta."}, 401)
                return self.reply({"public_key": os.getenv("VAPID_PUBLIC_KEY", ""),
                    "subscriptions": push_service.subscription_count(user_id),
                    "scheduler": os.getenv("PUSH_SCHEDULER_ACTIVE") == "1"})
            if path == "/api/data":
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Entre com sua senha."}, 401)
                return self.reply({"data": storage.read_data(user_id)})
            if path == "/health":
                return self.reply({"ok": True, "app": "dgx-meu-dia", "version": "0.8"})
        except Exception as e:
            print("Erro de GET", path, type(e).__name__, flush=True)
            return self.reply({"error": "Serviço de dados temporariamente indisponível."}, 503)
        allow = {"/": ("index.html", "text/html; charset=utf-8"),
                 "/index.html": ("index.html", "text/html; charset=utf-8"),
                 "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json"),
                 "/icon.svg": ("icon.svg", "image/svg+xml"),
                 "/sw.js": ("sw.js", "application/javascript; charset=utf-8"),
                 "/features.js": ("features.js", "application/javascript; charset=utf-8"),
                 "/payments.js": ("payments.js", "application/javascript; charset=utf-8"),
                 "/push_client.js": ("push_client.js", "application/javascript; charset=utf-8"),
                 "/spotify.js": ("spotify.js", "application/javascript; charset=utf-8"),
                 "/podcasts.js": ("podcasts.js", "application/javascript; charset=utf-8"),
                 "/car_mode.js": ("car_mode.js", "application/javascript; charset=utf-8"),
                 "/briefing.js": ("briefing.js", "application/javascript; charset=utf-8"),
                 "/home_panels.js": ("home_panels.js", "application/javascript; charset=utf-8")}
        if path not in allow:
            return self.send(b"Not found", "text/plain; charset=utf-8", 404)
        filename, mime = allow[path]
        return self.send((ROOT / filename).read_bytes(), mime)

    def do_HEAD(self):
        return self.do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if not self.check_origin():
            return self.reply({"error": "Origem não autorizada."}, 403)
        if path == "/api/push/dispatch" and not push_service.valid_dispatch_token(self.headers.get("Authorization", "")):
            return self.reply({"error": "Acesso negado."}, 403)
        if path not in ("/api/auth/setup", "/api/auth/login", "/api/auth/logout", "/api/data",
                        "/api/push/subscribe", "/api/push/unsubscribe", "/api/push/test", "/api/push/dispatch"):
            return self.reply({"error": "Rota inexistente."}, 404)
        try:
            body = self.get_json()
            if path == "/api/push/dispatch":
                # Executado apenas pelo agendador Neon com token secreto.
                response = fixtures()
                games = response["games"] if response.get("source_label", "").startswith("ESPN") else []
                return self.reply(push_service.dispatch(games))
            if path.startswith("/api/push/"):
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Entre na sua conta."}, 401)
                if path == "/api/push/subscribe":
                    return self.reply(push_service.subscribe(user_id, body))
                if path == "/api/push/unsubscribe":
                    return self.reply(push_service.unsubscribe(user_id, body))
                if path == "/api/push/test":
                    return self.reply(push_service.send_test(user_id))
            if path == "/api/auth/setup":
                token = storage.create_account(
                    str(body.get("password", "")), str(body.get("setup_code", "")))
                return self.reply({"ok": True}, cookie=self.session_cookie(token))
            if path == "/api/auth/login":
                token = storage.login(str(body.get("password", "")))
                return self.reply({"ok": True}, cookie=self.session_cookie(token))
            if path == "/api/auth/logout":
                storage.logout(self.token())
                return self.reply({"ok": True}, cookie=self.session_cookie("", expire=True))
            if path == "/api/data":
                user_id = self.auth()
                if user_id is None:
                    return self.reply({"error": "Sessão encerrada. Entre novamente."}, 401)
                key = body.get("key")
                storage.write_data(user_id, key, body.get("value"))
                return self.reply({"ok": True})
        except ValueError as e:
            return self.reply({"error": str(e)}, 400)
        except Exception as e:
            print("Erro de POST", path, type(e).__name__, flush=True)
            return self.reply({"error": "Não foi possível concluir a operação."}, 503)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8766))
    storage.initialize()
    push_service.setup()
    podcasts.setup()
    print(f"DGX Meu Dia v0.8 com PostgreSQL ouvindo em {host}:{port}", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
