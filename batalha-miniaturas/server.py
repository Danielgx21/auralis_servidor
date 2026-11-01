"""Servidor PvP para Batalha de Miniaturas (2 jogadores, salas temporárias)."""
import asyncio
import json
import logging
import os
import secrets
import time
from dataclasses import dataclass, field
from pathlib import Path
from aiohttp import web, WSMsgType

logging.basicConfig(level=logging.INFO)
ROOT = Path(__file__).resolve().parent
MAX_ROOMS = 200
ROOM_TTL = 7200
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ALLOWED_TYPES = set("guard spear axe bow druid hunter mage cleric golem rogue ghost paladin sentinel toxic shaman frost storm necro shade".split())
ROOMS = {}

@dataclass
class Room:
    code: str
    clients: list = field(default_factory=lambda: [None, None])
    names: list = field(default_factory=lambda: ["Jogador 1", "Jogador 2"])
    ready: list = field(default_factory=lambda: [False, False])
    next_ready: list = field(default_factory=lambda: [False, False])
    units: list = field(default_factory=lambda: [[], []])
    wins: list = field(default_factory=lambda: [0, 0])
    round: int = 1
    phase: str = "prep"
    last_winner: int | None = None
    updated: float = field(default_factory=time.monotonic)

    def touch(self):
        self.updated = time.monotonic()

    def message(self):
        return {"type": "state", "code": self.code, "round": self.round,
                "wins": self.wins, "names": self.names,
                "connected": [bool(c and not c.closed) for c in self.clients],
                "ready": self.ready, "phase": self.phase}

async def send(ws, data):
    if ws and not ws.closed:
        try:
            await ws.send_json(data)
        except (ConnectionError, RuntimeError):
            pass

async def broadcast(room, data):
    for ws in room.clients:
        await send(ws, data)

async def error(ws, msg):
    await send(ws, {"type": "error", "message": msg})

def validate_units(raw, round_number):
    limit = min(6, 3 + (round_number - 1) // 3)
    if not isinstance(raw, list) or not 1 <= len(raw) <= limit:
        raise ValueError(f"A formação deve ter entre 1 e {limit} miniaturas.")
    coords = set()
    units = []
    for u in raw:
        if not isinstance(u, dict):
            raise ValueError("Miniatura inválida.")
        typ, star, x, y = u.get("type"), u.get("star"), u.get("x"), u.get("y")
        items = u.get("items", [])
        if typ not in ALLOWED_TYPES or type(star) is not int or not 1 <= star <= 3:
            raise ValueError("Tipo ou estrela inválido.")
        if type(x) is not int or type(y) is not int or not 0 <= x < 6 or y not in (4, 5) or (x, y) in coords:
            raise ValueError("Posição fora da área ou ocupada.")
        if not isinstance(items, list) or len(items) > 2 or any(not isinstance(i, str) or len(i) > 25 for i in items):
            raise ValueError("Equipamento inválido.")
        coords.add((x, y))
        units.append({"type": typ, "star": star, "x": x, "y": y, "items": items})
    return units

async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=30, max_msg_size=180000)
    await ws.prepare(request)
    room = None
    seat = None
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                data = json.loads(msg.data)
                if not isinstance(data, dict):
                    raise ValueError("Mensagem inválida.")
                kind = data.get("type")
                if kind in ("create", "join"):
                    if room:
                        await error(ws, "Você já entrou em uma sala.")
                        continue
                    name = str(data.get("name", "Jogador")).strip()[:24] or "Jogador"
                    if kind == "create":
                        if len(ROOMS) >= MAX_ROOMS:
                            await error(ws, "Servidor cheio. Tente mais tarde.")
                            continue
                        code = "".join(secrets.choice(ALPHABET) for _ in range(6))
                        while code in ROOMS:
                            code = "".join(secrets.choice(ALPHABET) for _ in range(6))
                        room = Room(code)
                        ROOMS[code] = room
                        seat = 0
                    else:
                        code = str(data.get("code", "")).upper().strip()
                        candidate = ROOMS.get(code)
                        if not candidate:
                            await error(ws, "Sala não encontrada. Confira o código.")
                            continue
                        if candidate.phase != "prep" or candidate.clients[1] is not None:
                            await error(ws, "Esta sala já está ocupada ou em andamento.")
                            continue
                        room, seat = candidate, 1
                    room.clients[seat] = ws
                    room.names[seat] = name
                    room.touch()
                    await send(ws, {"type": "joined", "code": room.code, "seat": seat,
                                    "round": room.round, "wins": room.wins,
                                    "names": room.names,
                                    "connected": [bool(c and not c.closed) for c in room.clients]})
                    await broadcast(room, room.message())
                elif kind == "leave":
                    break
                elif not room or seat is None or room.clients[seat] is not ws:
                    await error(ws, "Entre em uma sala primeiro.")
                elif kind == "ready":
                    if room.phase != "prep":
                        await error(ws, "A partida não está em preparação.")
                        continue
                    if not all(c and not c.closed for c in room.clients):
                        await error(ws, "Aguardando seu amigo entrar na sala.")
                        continue
                    try:
                        units = validate_units(data.get("units"), room.round)
                    except ValueError as exc:
                        await error(ws, str(exc))
                        continue
                    room.units[seat] = units
                    room.ready[seat] = True
                    room.touch()
                    if all(room.ready):
                        room.phase = "combat"
                        for i, client in enumerate(room.clients):
                            await send(client, {"type": "start", "round": room.round,
                                                "opponentUnits": room.units[1 - i]})
                    else:
                        await broadcast(room, room.message())
                elif kind == "frame":
                    if room.phase != "combat" or seat != 0:
                        continue
                    frame = data.get("frame")
                    if not isinstance(frame, dict) or not isinstance(frame.get("allies"), list) or not isinstance(frame.get("enemies"), list):
                        continue
                    if len(frame["allies"]) > 12 or len(frame["enemies"]) > 12:
                        continue
                    await send(room.clients[1], {"type": "frame", "frame": frame})
                elif kind == "finish":
                    if room.phase != "combat" or seat != 0 or type(data.get("hostWin")) is not bool:
                        continue
                    room.phase = "result"
                    room.last_winner = 0 if data["hostWin"] else 1
                    room.wins[room.last_winner] += 1
                    done = max(room.wins) >= 3
                    if done:
                        room.phase = "done"
                    room.next_ready = [False, False]
                    room.touch()
                    await broadcast(room, {"type": "result", "hostWin": data["hostWin"],
                                           "wins": room.wins, "done": done})
                elif kind == "next":
                    if room.phase not in ("result", "done"):
                        continue
                    room.next_ready[seat] = True
                    room.touch()
                    if all(room.next_ready):
                        rematch = room.phase == "done"
                        room.round = 1 if rematch else room.round + 1
                        if rematch:
                            room.wins = [0, 0]
                        room.ready = [False, False]
                        room.next_ready = [False, False]
                        room.units = [[], []]
                        room.phase = "prep"
                        await broadcast(room, {"type": "nextRound", "round": room.round,
                                               "wins": room.wins, "rematch": rematch,
                                               "lastWinner": room.last_winner})
                        room.last_winner = None
                    else:
                        await broadcast(room, room.message())
            except (ValueError, TypeError, KeyError) as exc:
                await error(ws, f"Pedido inválido: {str(exc)[:110]}")
    finally:
        if room and seat is not None and room.clients[seat] is ws:
            room.clients[seat] = None
            room.ready[seat] = False
            room.touch()
            if seat == 0:
                ROOMS.pop(room.code, None)
                if room.clients[1] is not None:
                    await send(room.clients[1], {"type": "room_closed"})
            elif not any(room.clients):
                ROOMS.pop(room.code, None)
            else:
                room.phase = "prep"
                room.ready = [False, False]
                await broadcast(room, room.message())
    return ws

async def index(_):
    return web.FileResponse(ROOT / "index.html", headers={"Cache-Control": "no-store"})

async def health(_):
    return web.json_response({"ok": True, "rooms": len(ROOMS)})

async def cleanup(app):
    while True:
        await asyncio.sleep(600)
        cutoff = time.monotonic() - ROOM_TTL
        for code, room in list(ROOMS.items()):
            if room.updated < cutoff and not any(room.clients):
                ROOMS.pop(code, None)

async def background(app):
    task = asyncio.create_task(cleanup(app))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = web.Application(client_max_size=220000)
app.add_routes([web.get("/", index), web.get("/ws", ws_handler), web.get("/health", health)])
app.cleanup_ctx.append(background)
if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
