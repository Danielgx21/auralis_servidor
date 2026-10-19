"""Relay privado de Auralis. Python 3.10+, websockets>=12."""
import asyncio
import json
import os
import secrets
import string
from http import HTTPStatus
from websockets.asyncio.server import serve

rooms = {}
clients = {}
ready = set()
started = set()
ALPHABET = string.ascii_uppercase + string.digits

async def send(ws, data):
    await ws.send(json.dumps(data, ensure_ascii=False))

async def handler(ws):
    try:
        async for raw in ws:
            if len(raw) > 65536:
                await send(ws, {"type":"error","message":"Mensagem muito grande"})
                continue
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                continue
            if not isinstance(msg, dict):
                continue
            kind = msg.get("type")
            if kind == "create" and ws not in clients:
                code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                while code in rooms:
                    code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                rooms[code] = [ws]
                clients[ws] = code
                await send(ws, {"type":"created", "code":code})
            elif kind == "join" and ws not in clients:
                code = str(msg.get("code", "")).strip().upper()
                if len(code) != 6 or any(c not in ALPHABET for c in code):
                    await send(ws, {"type":"error", "message":"Codigo de sala invalido"})
                    continue
                if code not in rooms or len(rooms[code]) != 1:
                    await send(ws, {"type":"error", "message":"Sala inexistente ou cheia"})
                    continue
                rooms[code].append(ws)
                clients[ws] = code
                await send(ws, {"type":"joined", "code":code})
                for member in rooms[code]:
                    await send(member, {"type":"paired"})
            elif kind == "ready" and ws in clients:
                code = clients[ws]
                members = rooms.get(code, [])
                if len(members) != 2 or code in started:
                    continue
                ready.add(ws)
                if all(member in ready for member in members):
                    started.add(code)
                    ready.difference_update(members)
                    for member in members:
                        await send(member, {"type": "start"})
            elif kind in ("roster", "snapshot", "round_result", "combat_state", "arena_open") and ws in clients:
                code = clients[ws]
                if len(rooms.get(code, [])) != 2:
                    continue
                if kind == "arena_open":
                    if rooms[code][0] is not ws or code not in started:
                        continue
                    match_number = msg.get("match")
                    if type(match_number) is not int or not 1 <= match_number <= 100:
                        continue
                    payload = {"type":"arena_open", "match":match_number}
                elif kind == "roster":
                    ids = msg.get("ids")
                    if not isinstance(ids, list) or len(ids) != 10:
                        continue
                    payload = {"type":"roster", "ids":ids}
                elif kind == "combat_state":
                    if rooms[code][0] is not ws:
                        continue
                    state = msg.get("state")
                    if not isinstance(state, dict) or not all(isinstance(state.get(k), int) for k in ("match", "round", "sequence")):
                        continue
                    if not 1 <= state["round"] <= 5 or not isinstance(state.get("fighters"), list) or len(state["fighters"]) > 10:
                        continue
                    payload = {"type":"combat_state", "state":state}
                elif kind == "round_result":
                    if rooms[code][0] is not ws:
                        await send(ws, {"type":"error", "message":"Apenas o anfitriao confirma resultados"})
                        continue
                    result = msg.get("result")
                    if not isinstance(result, dict) or not all(type(result.get(k)) is int for k in ("match", "round")) or not 1 <= result["round"] <= 5:
                        continue
                    event = result.get("event", "")
                    if event not in ("", "next_round", "match_complete"):
                        continue
                    if event == "" and (type(result.get("winner")) is not int or result["winner"] not in (-1, 0, 1)):
                        continue
                    if event == "match_complete" and (type(result.get("blue_wins")) is not int or type(result.get("red_wins")) is not int):
                        continue
                    payload = {"type":"round_result", "result":result}
                else:
                    snapshot = msg.get("snapshot")
                    if not isinstance(snapshot, dict):
                        continue
                    payload = {"type":"snapshot", "snapshot":snapshot}
                for member in rooms[code]:
                    if member is not ws:
                        await send(member, payload)
    finally:
        ready.discard(ws)
        code = clients.pop(ws, None)
        if code in rooms:
            room = rooms[code]
            if ws in room:
                room.remove(ws)
            # Encerra a sala quando qualquer participante sai. Isso impede
            # que uma nova pessoa entre em uma partida antiga e herde seu estado.
            rooms.pop(code, None)
            started.discard(code)
            ready.difference_update(room)
            for member in room:
                clients.pop(member, None)
                try:
                    await send(member, {"type":"peer_left"})
                except Exception:
                    pass

def health_response(connection, request):
    """Health check HTTP sem interferir no handshake WebSocket dos clientes Godot."""
    if request.path in ("/", "/healthz") and request.headers.get("Upgrade", "").lower() != "websocket":
        return connection.respond(HTTPStatus.OK, "Auralis relay OK\n")
    return None


async def main():
    host = os.getenv("AURALIS_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8765"))
    async with serve(handler, host, port, max_size=65536, ping_interval=20, process_request=health_response):
        print(f"Auralis relay listening on {host}:{port}", flush=True)
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
