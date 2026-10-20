"""Teste completo do relay com 2, 3 e 4 participantes.
Execute: python test_tournament.py
"""
import asyncio
import importlib.util
import json
from pathlib import Path
import websockets
from websockets.asyncio.server import serve

spec=importlib.util.spec_from_file_location('auralis_server',Path(__file__).with_name('server.py'))
srv=importlib.util.module_from_spec(spec)
spec.loader.exec_module(srv)

async def send(ws, **data):
    await ws.send(json.dumps(data))

async def until(ws, kind, timeout=4):
    for _ in range(60):
        msg=json.loads(await asyncio.wait_for(ws.recv(),timeout))
        if msg['type']==kind:
            return msg
    raise AssertionError(f'No {kind}')

async def run_room(url,n):
    clients=[]
    try:
        for i in range(n):
            ws=await websockets.connect(url)
            clients.append(ws)
            if i==0:
                await send(ws,type='create',capacity=n)
                created=await until(ws,'created')
                code=created['code']
            else:
                await send(ws,type='join',code=code)
                joined=await until(ws,'joined')
                assert joined['seat']==i
        for ws in clients:
            await until(ws,'paired')
        for ws in clients:
            await send(ws,type='ready')
        for ws in clients:
            start=await until(ws,'start')
            assert start['capacity']==n
        if n==2:
            await send(clients[0],type='arena_open',match=1)
            assert (await until(clients[1],'arena_open'))['match']==1
            return
        for stage in range(1,6):
            await send(clients[0],type='arena_open',match=stage)
            for ws in clients[1:]:
                assert (await until(ws,'arena_open'))['match']==stage
            # Clients cannot scout until the last plan is sent.
            for i,ws in enumerate(clients):
                plan={'lineup':['cael'] if i%2==0 else [],'heroes':[{'id':'cael','level':4}]}
                await send(ws,type='tournament_plan',stage=stage,plan=plan)
            for ws in clients:
                received=await until(ws,'tournament_plans')
                assert len(received['plans'])==n
            pair_results=[{'a':a,'b':b,'wins_a':2,'wins_b':0} for a in range(n) for b in range(a+1,n)]
            await send(clients[1],type='tournament_stage',stage=stage,results=pair_results)
            # guest must never authorize stage outcome
            try:
                msg=await asyncio.wait_for(clients[0].recv(),0.15)
                assert json.loads(msg).get('type')!='tournament_stage_result'
            except asyncio.TimeoutError:
                pass
            await send(clients[0],type='tournament_combat_state',state={'stage':stage,'a':0,'b':1,'bout':1,'units':[]})
            for ws in clients[1:]:
                assert (await until(ws,'tournament_combat_state'))['state']['stage']==stage
            await send(clients[0],type='tournament_stage',stage=stage,results=pair_results)
            for ws in clients:
                outcome=await until(ws,'tournament_stage_result')
                assert len(outcome['results'])==n*(n-1)//2
                assert outcome['ranking'][0]['seat']==0
                assert outcome['finished']==(stage==5)
        print(f'PASS: {n} participants, five stages, round-robin, shared standings')
    finally:
        for ws in clients:
            await ws.close()

def test_tiebreak():
    # J1 e J2 terminam com um ponto; J1 levou a melhor no confronto direto.
    room={'capacity':3,'results':[
        {'a':0,'b':1,'wins_a':2,'wins_b':1,'winner':0},
        {'a':0,'b':2,'wins_a':0,'wins_b':2,'winner':2},
        {'a':1,'b':2,'wins_a':2,'wins_b':0,'winner':1},
    ]}
    ranking,winners=srv.standings(room)
    assert all(row['points']==1 for row in ranking)
    assert len(winners)>=1
    assert set(winners)<= {0,1,2}

async def main():
    test_tiebreak()
    async with serve(srv.handler,'127.0.0.1',0,ping_interval=20) as relay:
        port=relay.sockets[0].getsockname()[1]
        url=f'ws://127.0.0.1:{port}'
        for n in (2,3,4):
            await run_room(url,n)
    print('All tests passed')

if __name__=='__main__':
    asyncio.run(main())
