"""DGX Meu Dia — servidor mínimo para a PWA pessoal."""
import json
import os
import re
import urllib.request
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
    start = now.strftime("%Y%m%d")
    end = (now + timedelta(days=40)).strftime("%Y%m%d")
    url = ("https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard"
           f"?dates={start}-{end}&limit=600")
    games = []
    origin = "ESPN (dados públicos não oficiais)"
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
        print("Agenda dinâmica indisponível:", repr(exc), flush=True)
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
    def send(self, data, content_type, status=200):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store" if content_type.startswith("application/json") else "public, max-age=900")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/fixtures":
            return self.send(json.dumps(fixtures(), ensure_ascii=False).encode(), "application/json; charset=utf-8")
        if path == "/health":
            return self.send(b'{"ok":true,"app":"dgx-meu-dia"}', "application/json")
        allow = {"/": ("index.html", "text/html; charset=utf-8"),
                 "/index.html": ("index.html", "text/html; charset=utf-8"),
                 "/manifest.webmanifest": ("manifest.webmanifest", "application/manifest+json"),
                 "/icon.svg": ("icon.svg", "image/svg+xml"),
                 "/sw.js": ("sw.js", "application/javascript; charset=utf-8")}
        if path not in allow:
            return self.send(b"Not found", "text/plain; charset=utf-8", 404)
        filename, mime = allow[path]
        return self.send((ROOT / filename).read_bytes(), mime)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8766))
    print(f"DGX Meu Dia v0.1 ouvindo em {host}:{port}", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
