"""Exercita a orquestração do ranqueado sem contas nem banco real."""
import asyncio
import time
from ranked_quad_matchmaking import WaitingPlayer, choose_group
from quad_api import QuadLeague


class FakeSocket:
    closed=False
    def __init__(self):
        self.events=[]
    async def send_json(self, event):
        self.events.append(event)


def build_league():
    validate={
        'deck':lambda items:items,
        'units':lambda units,round_number:units,
        'survivors':lambda stars,units:stars,
        'damage':lambda r,stars:2+sum(stars),
        'blessings':{'gold':None,'item':None,'armor':('armor',2),'sword':('ad',2)},
        'max_rooms':200
    }
    return QuadLeague(None,None,None,validate)


async def smoke():
    now=time.monotonic()
    l=build_league()
    humans=[WaitingPlayer('human_'+str(i),100+i,now-5) for i in range(4)]
    sockets={}
    for p in humans:
        ws=FakeSocket();sockets[p.user_id]=ws
        l.queues[p.user_id]={'name':p.user_id,'rating':p.rating,'ws':ws,'since':p.joined_at}
    plan=choose_group(humans,now)
    assert plan and not plan.bots
    assert await l.start_match(plan)
    g=next(iter(l.games.values()))
    assert len(g.seats)==4 and len(g.pairs)==2
    assert all(any(e['type']=='quad_joined' for e in ws.events) for ws in sockets.values())
    for seat in g.seats:
        seat.units=[{'type':'guard','star':1,'x':0,'y':5,'items':[]}]
        seat.ready=True
    await l.begin_battles(g)
    assert g.phase=='combat'
    assert all(any(e['type']=='quad_start' for e in ws.events) for ws in sockets.values())
    for pair_idx,(a,b) in enumerate(g.pairs):
        await l.resolve_pair(g,pair_idx,True,[1])
    assert g.phase=='result'
    assert len(g.finished_pairs)==2
    for seat in g.seats:seat.next_ready=True
    await l.advance(g)
    assert g.round==2 and g.phase=='prep' and len(g.pairs)==2
    assert g.pairs==[(0,2),(1,3)]
    assert all(any(e['type']=='quad_next_round' for e in ws.events) for ws in sockets.values())

    # Um humano que esperou 90 s pode começar com três bots.
    l2=build_league()
    person=WaitingPlayer('human_only',100,now-91)
    ws=FakeSocket()
    l2.queues[person.user_id]={'name':'Um humano','rating':100,'ws':ws,'since':person.joined_at}
    plan=choose_group([person],now)
    assert plan and len(plan.bots)==3
    assert await l2.start_match(plan)
    g2=next(iter(l2.games.values()))
    assert sum(s.bot for s in g2.seats)==3
    assert all(s.ready and 1<=len(s.units)<=6 for s in g2.seats if s.bot)
    human=next(s for s in g2.seats if not s.bot)
    human.units=[{'type':'guard','star':1,'x':0,'y':5,'items':[]}]
    human.ready=True
    async def dont_write_score(_game):pass
    l2.score=dont_write_score
    await l2.begin_battles(g2)
    assert g2.phase=='combat'
    assert 1 in g2.finished_pairs # bot vs bot já foi resolvido
    g2.seats[0].hp=1
    bot=next(s for s in g2.seats if s.bot)
    await l2.resolve_pair(g2,0,False,[u['star'] for u in bot.units])
    assert g2.phase=='done',g2.phase
    assert any(e['type']=='quad_final' for e in ws.events)
    return {'four_human_rounds':2,'human_with_bots':3,'results':True}


def run_sync():
    return asyncio.run(smoke())
