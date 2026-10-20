"""Teste de duelo entre dois jogadores: séries melhor de cinco, preservadas ao lado dos torneios multi."""
import asyncio
import json
import unittest
from websockets.asyncio.client import connect
from websockets.asyncio.server import serve
from server import handler, health_response, rooms, clients

async def send(ws, message):
    await ws.send(json.dumps(message))

async def recv_type(ws, kind):
    for _ in range(20):
        data=json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0))
        if data.get('type') == kind:
            return data
    raise AssertionError(kind)

class RelayTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        rooms.clear();clients.clear()
        self.server=await serve(handler,'127.0.0.1',0,process_request=health_response)
        self.url=f'ws://127.0.0.1:{self.server.sockets[0].getsockname()[1]}'
        self.host=await connect(self.url)
        self.guest=await connect(self.url)
        await send(self.host,{'type':'create','capacity':2})
        self.code=(await recv_type(self.host,'created'))['code']
        await send(self.guest,{'type':'join','code':self.code})
        await recv_type(self.guest,'joined')
        await recv_type(self.host,'paired')
        await recv_type(self.guest,'paired')

    async def asyncTearDown(self):
        await self.host.close();await self.guest.close()
        self.server.close();await self.server.wait_closed()

    async def test_protocol(self):
        await send(self.host,{'type':'ready'})
        await send(self.guest,{'type':'ready'})
        await recv_type(self.host,'start')
        await recv_type(self.guest,'start')
        await send(self.guest,{'type':'roster','ids':[f'h{i}' for i in range(10)]})
        self.assertEqual((await recv_type(self.host,'roster'))['ids'][0],'h0')
        await send(self.host,{'type':'arena_open','match':1})
        self.assertEqual((await recv_type(self.guest,'arena_open'))['match'],1)
        await send(self.guest,{'type':'round_result','result':{'match':1,'round':1,'winner':0}})
        self.assertEqual((await recv_type(self.guest,'error'))['type'],'error')
        for idx,winner in ((1,0),(2,1),(3,0),(4,1),(5,0)):
            record={'match':1,'round':idx,'winner':winner}
            await send(self.host,{'type':'round_result','result':record})
            self.assertEqual((await recv_type(self.guest,'round_result'))['result'],record)
        # O relay aceita o quinto round de um duelo e recusa o sexto.
        frame={'match':1,'round':5,'sequence':1,'fighters':[]}
        await send(self.host,{'type':'combat_state','state':frame})
        self.assertEqual((await recv_type(self.guest,'combat_state'))['state'],frame)
        await send(self.host,{'type':'combat_state','state':{'match':1,'round':6,'sequence':2,'fighters':[]}})
        with self.assertRaises(asyncio.TimeoutError):
            await asyncio.wait_for(self.guest.recv(),0.12)
        end={'match':1,'round':5,'event':'match_complete','blue_wins':3,'red_wins':2}
        await send(self.host,{'type':'round_result','result':end})
        self.assertEqual((await recv_type(self.guest,'round_result'))['result'],end)

    async def test_http_health(self):
        reader,writer=await asyncio.open_connection('127.0.0.1',self.server.sockets[0].getsockname()[1])
        writer.write(b'GET /healthz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n')
        await writer.drain()
        result=await asyncio.wait_for(reader.read(),2.0)
        self.assertIn(b'200 OK',result)
        writer.close();await writer.wait_closed()

    async def test_disconnection(self):
        await self.guest.close()
        await recv_type(self.host,'peer_left')
        self.assertNotIn(self.code,rooms)

if __name__=='__main__':
    unittest.main()
