"""DGX Meu Dia — descoberta e acompanhamento de podcasts por RSS público.

Metadados pesquisados via catálogo Apple Podcasts/iTunes (sem credenciais).
Não importa informações privadas da conta Spotify nem baixa o áudio.
"""
import email.utils
import hashlib
import ipaddress
import json
import re
import socket
import threading
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

import storage
from psycopg.types.json import Jsonb

_CACHE = {}
_LOCK = threading.Lock()
MAX_SHOWS = 15
ATOM = "{http://www.w3.org/2005/Atom}"


def setup():
    with storage.connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS dgx_podcast_watch (
                    user_id BIGINT NOT NULL REFERENCES dgx_account(id) ON DELETE CASCADE,
                    podcast_id BIGINT NOT NULL,
                    seen_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
                    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY (user_id,podcast_id)
                )
            """)


def _check_url(url):
    p = urlsplit(url)
    if p.scheme != "https" or not p.hostname or p.username or p.password or p.port not in (None, 443):
        raise ValueError("Feed deve usar HTTPS público.")
    hostname = p.hostname.lower()
    if hostname.endswith((".local", ".internal", ".localhost")):
        raise ValueError("Host privado.")
    try:
        addresses = socket.getaddrinfo(hostname, 443, proto=socket.IPPROTO_TCP)
    except OSError:
        raise ValueError("Não foi possível localizar o feed.")
    if not addresses:
        raise ValueError("Host não encontrado.")
    for row in addresses:
        ip = ipaddress.ip_address(row[4][0])
        if not ip.is_global:
            raise ValueError("Endereço privado não permitido.")


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_SafeRedirect)


def _fetch(url, max_bytes=500_000):
    _check_url(url)
    req = urllib.request.Request(url, headers={
        "User-Agent": "DGXMeuDiaPodcast/1.0 (+https://dgx-meu-dia.onrender.com/)",
        "Accept": "application/rss+xml,application/atom+xml,application/xml,application/json,text/xml,*/*"
    })
    with _opener.open(req, timeout=5) as response:
        raw = response.read(max_bytes + 1)
        if len(raw) > max_bytes:
            raise ValueError("Feed excede limite de tamanho.")
        return raw


def _cached(key, ttl, fn):
    now = datetime.now(timezone.utc).timestamp()
    with _LOCK:
        obj = _CACHE.get(key)
        if obj and now - obj[0] < ttl:
            return obj[1]
    value = fn()
    with _LOCK:
        if len(_CACHE) > 400:
            _CACHE.clear()
        _CACHE[key] = (now, value)
    return value


def search(term):
    term = str(term or "").strip()[:100]
    if len(term) < 2:
        raise ValueError("Informe pelo menos duas letras.")
    def load():
        query = urllib.parse.urlencode({
            "term": term, "media": "podcast", "entity": "podcast",
            "limit": 12, "country": "BR"
        })
        result = json.loads(_fetch("https://itunes.apple.com/search?" + query, 900_000))
        found = []
        for p in result.get("results", []):
            if p.get("kind") != "podcast" or not p.get("collectionId") or not p.get("feedUrl"):
                continue
            found.append({
                "id": int(p["collectionId"]),
                "name": str(p.get("collectionName", ""))[:150],
                "publisher": str(p.get("artistName", ""))[:120],
                "artwork": p.get("artworkUrl100", ""),
                "itunes": p.get("collectionViewUrl", ""),
            })
        return found
    return _cached("search:" + term.lower(), 600, load)


def _directory(podcast_id):
    podcast_id = int(podcast_id)
    if podcast_id < 1 or podcast_id > 9_999_999_999_999_999:
        raise ValueError("Podcast inválido.")
    def load():
        query = urllib.parse.urlencode({"id": podcast_id, "entity": "podcast", "country": "BR"})
        result = json.loads(_fetch("https://itunes.apple.com/lookup?" + query))
        for item in result.get("results", []):
            if item.get("collectionId") == podcast_id and item.get("feedUrl"):
                return {
                    "id": podcast_id,
                    "name": str(item.get("collectionName", ""))[:150],
                    "publisher": str(item.get("artistName", ""))[:100],
                    "feed": str(item["feedUrl"])[:1500],
                    "itunes": str(item.get("collectionViewUrl", ""))[:500],
                }
        raise ValueError("Podcast não encontrado no catálogo.")
    return _cached("lookup:" + str(podcast_id), 3600, load)


def _when(raw):
    if not raw:
        return None
    try:
        date = email.utils.parsedate_to_datetime(raw)
        if date:
            return date if date.tzinfo else date.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        pass
    try:
        date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return date if date.tzinfo else date.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def _txt(node, tag):
    child = node.find(tag)
    return "".join(child.itertext()).strip() if child is not None else ""


def _read_feed(podcast_id):
    show = _directory(podcast_id)
    rss_url = show["feed"]
    # Alguns catálogos antigos publicam o feed com HTTP.
    if rss_url.startswith("http://"):
        rss_url = "https://" + rss_url[len("http://"):]

    # Feeds extensos, como O Assunto e Foro de Teresina, podem conter
    # milhares de episódios. Carregar todo o XML cortava o download em
    # 1 MB e impedia exibir justamente os episódios mais recentes.
    # Ler incrementalmente e encerrar após 30 episódios completos.
    _check_url(rss_url)
    req = urllib.request.Request(rss_url, headers={
        "User-Agent": "DGXMeuDiaPodcast/1.0 (+https://dgx-meu-dia.onrender.com/)",
        "Accept": "application/rss+xml,application/atom+xml,text/xml,application/xml,*/*",
    })
    parser = ET.XMLPullParser(events=("end",))
    episodes = []
    max_bytes = 10_000_000
    bytes_read = 0
    with _opener.open(req, timeout=12) as response:
        while len(episodes) < 30:
            chunk = response.read(min(65536, max_bytes - bytes_read + 1))
            if not chunk:
                break
            bytes_read += len(chunk)
            if bytes_read > max_bytes:
                if episodes:
                    break
                raise ValueError("Os primeiros episódios ultrapassaram o limite seguro do feed.")
            parser.feed(chunk)
            for _, item in parser.read_events():
                if item.tag not in ("item", ATOM+"entry"):
                    continue
                title = _txt(item, "title") or _txt(item, ATOM+"title")
                guid = _txt(item, "guid") or _txt(item, "id") or _txt(item, ATOM+"id")
                link = _txt(item, "link")
                if not link:
                    for child in item.findall(ATOM+"link"):
                        if child.attrib.get("rel", "alternate") == "alternate":
                            link = child.attrib.get("href", "")
                            break
                date = _when(_txt(item, "pubDate") or _txt(item, ATOM+"published")
                             or _txt(item, ATOM+"updated")
                             or _txt(item, "{http://purl.org/dc/elements/1.1/}date"))
                if title:
                    uid = hashlib.sha256((guid or link or title).encode()).hexdigest()[:32]
                    if not link.startswith("https://"):
                        link = show["itunes"]
                    episodes.append({
                        "id": uid, "title": title[:180],
                        "released": date.isoformat() if date else None,
                        "url": link[:850], "podcast_id": show["id"],
                    })
                item.clear()
                if len(episodes) >= 30:
                    break
    episodes.sort(key=lambda x: x.get("released") or "", reverse=True)
    return {
        "id": show["id"], "name": show["name"], "publisher": show["publisher"],
        "episodes": episodes[:20], "itunes": show["itunes"],
    }

def latest(podcast_id):
    return _cached("feed:" + str(int(podcast_id)), 600, lambda: _read_feed(podcast_id))


def allowed_show(user_id, podcast_id):
    data = storage.read_data(user_id)
    shows = data.get("dgx_podcasts_v1", [])
    return any(isinstance(x, dict) and str(x.get("id")) == str(podcast_id) for x in shows)


def episode_list(user_id, podcast_id):
    if not allowed_show(user_id, podcast_id):
        raise ValueError("Primeiro acompanhe esse podcast.")
    if podcast_id == "spotify:cafe-da-manha":
        return {
            "id": podcast_id,
            "name": "Café da Manhã",
            "publisher": "Folha de S.Paulo / Spotify",
            "episodes": [],
            "source": "spotify_only",
            "message": "Programa exclusivo do Spotify: sem RSS público para monitorar novos episódios automaticamente.",
        }
    return latest(int(podcast_id))


def monitor(user_id, podcasts, now):
    """Detecta episódios novos desde a primeira verificação; nunca notifica catálogo antigo."""
    if not isinstance(podcasts, list):
        return []
    events = []
    for p in podcasts[:MAX_SHOWS]:
        try:
            # Programas exclusivos do Spotify podem ser acompanhados na lista,
            # mas não possuem RSS público para verificação automática.
            if str(p.get("id", "")).startswith("spotify:"):
                continue
            podcast_id = int(p.get("id"))
            data = latest(podcast_id)
            episodes = data["episodes"]
            if not episodes:
                continue
            with storage.connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT seen_ids FROM dgx_podcast_watch WHERE user_id=%s AND podcast_id=%s",
                                (user_id, podcast_id))
                    row = cur.fetchone()
                    seen = set(row[0]) if row and isinstance(row[0], list) else set()
                    newest = {x["id"] for x in episodes}
                    if row:
                        # Só novos itens recentes. Episódios antigos reordenados não geram alerta.
                        for ep in reversed(episodes):
                            if ep["id"] in seen:
                                continue
                            published = _when(ep.get("released"))
                            if not published or not(now - timedelta(days=5) <= published <= now + timedelta(hours=6)):
                                continue
                            title = ep["title"][:125]
                            events.append((f"podcast:{podcast_id}:{ep['id']}",
                                           {"title":"Novo episódio · " + data["name"][:70],
                                            "body":title,
                                            "tag":"pod-"+ep["id"],
                                            "url":"/#podcasts"}))
                    combined = list(newest | seen)[:100]
                    cur.execute("""
                        INSERT INTO dgx_podcast_watch(user_id,podcast_id,seen_ids)
                        VALUES (%s,%s,%s)
                        ON CONFLICT(user_id,podcast_id) DO UPDATE
                        SET seen_ids=EXCLUDED.seen_ids, checked_at=now()
                    """, (user_id, podcast_id, Jsonb(combined)))
        except Exception as e:
            print("Verificação podcast falhou:", type(e).__name__, str(e)[:150], flush=True)
    return events[:20]
