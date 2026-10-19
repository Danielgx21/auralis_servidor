"""Teste de integração do protocolo WebSocket com dois clientes reais em localhost.
Execute: python -m unittest test_relay.py -v
Não substitui teste do jogo dentro do Godot.
"""
import asyncio
import json
import unittest

from websockets.asyncio.client import connect
from websockets.asyncio.server import serve
from server import handler, health_response, rooms, clients, ready, started


async def send(ws, message):
    await ws.send(json.dumps(message))


async def recv(ws):
    return json.loads(await asyncio.wait_for(ws.recv(), timeout=1.5))


class RelayTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rooms.clear(); clients.clear(); ready.clear(); started.clear()
        self.server = await serve(handler, "127.0.0.1", 0, process_request=health_response)
        self.url = f"ws://127.0.0.1:{self.server.sockets[0].getsockname()[1]}"
        self.host = await connect(self.url)
        self.guest = await connect(self.url)
        await send(self.host, {"type": "create"})
        self.code = (await recv(self.host))["code"]
        self.assertEqual(len(self.code), 6)
        await send(self.guest, {"type":"join", "code":self.code})
        self.assertEqual((await recv(self.guest))["type"], "joined")
        self.assertEqual((await recv(self.host))["type"], "paired")
        self.assertEqual((await recv(self.guest))["type"], "paired")

    async def asyncTearDown(self):
        await self.host.close()
        await self.guest.close()
        self.server.close()
        await self.server.wait_closed()

    async def test_full_protocol_and_host_authority(self):
        await send(self.host, {"type":"ready"})
        with self.assertRaises(asyncio.TimeoutError):
            await asyncio.wait_for(self.host.recv(), timeout=0.10)
        await send(self.guest, {"type":"ready"})
        self.assertEqual((await recv(self.host))["type"], "start")
        self.assertEqual((await recv(self.guest))["type"], "start")
        await send(self.guest, {"type":"roster", "ids": [f"h{i}" for i in range(10)]})
        self.assertEqual((await recv(self.host))["type"], "roster")
        plan = {"round":1,"combat_round":1,"heroes":[],"lineup":[],"inventory":[],"equipment":{},"source":"arena","ready":True,"sequence":8}
        await send(self.guest, {"type":"snapshot", "snapshot":plan})
        self.assertEqual((await recv(self.host))["snapshot"], plan)
        await send(self.guest, {"type":"arena_open", "match":1})
        # Cliente convidado não pode abrir a arena do anfitrião.
        with self.assertRaises(asyncio.TimeoutError):
            await asyncio.wait_for(self.host.recv(), timeout=0.10)
        await send(self.host, {"type":"arena_open", "match":1})
        self.assertEqual(await recv(self.guest), {"type":"arena_open", "match":1})
        state = {"match":1,"round":1,"sequence":1,"fighters":[],"elapsed":0.0}
        await send(self.host, {"type":"combat_state", "state":state})
        self.assertEqual((await recv(self.guest))["state"], state)
        await send(self.guest, {"type":"round_result", "result":{"match":1,"round":1,"winner":0}})
        self.assertEqual((await recv(self.guest))["type"], "error")
        packets = []
        for number in range(1, 6):
            packets.append({"match":1, "round":number, "winner": 0 if number % 2 else 1})
            if number < 5:
                packets.append({"match":1, "round":number+1, "event":"next_round"})
        packets.append({"match":1,"round":5,"event":"match_complete","blue_wins":3,"red_wins":2})
        for packet in packets:
            await send(self.host, {"type":"round_result", "result":packet})
            self.assertEqual((await recv(self.guest))["result"], packet)

    async def test_http_health(self):
        reader, writer = await asyncio.open_connection("127.0.0.1", self.server.sockets[0].getsockname()[1])
        writer.write(b"GET /healthz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        await writer.drain()
        response = await asyncio.wait_for(reader.read(), timeout=2.0)
        self.assertIn(b"200 OK", response)
        self.assertIn(b"Auralis relay OK", response)
        writer.close()
        await writer.wait_closed()

    async def test_room_closed_after_disconnection(self):
        await self.guest.close()
        self.assertEqual((await recv(self.host))["type"], "peer_left")
        self.assertNotIn(self.code, rooms)


if __name__ == "__main__":
    unittest.main()
