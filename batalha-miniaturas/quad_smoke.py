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
    # Reproduzir o clique real em "Confirmar equipe" na rodada 1.
    # Antes da correção, o servidor rejeitava todos os jogadores exigindo uma bênção.
    assert all(not seat.blessing_choices for seat in g.seats)
    units=[{'type':'guard','star':1,'x':0,'y':5,'items':[]}]
    deck=['guard','spear','axe','bow','druid','hunter','mage',
          'cleric','golem','rogue','ghost','paladin','sentinel','toxic']
    for i,seat in enumerate(g.seats):
        await l.handle(seat.ws,g,i,{'type':'quad_ready','units':units,'deck':deck})
    assert all(seat.ready for seat in g.seats), "A confirmação da equipe foi bloqueada."
    assert g.phase=='combat', "A batalha não começou após todos confirmarem."
    assert all(any(e['type']=='quad_ready_confirmed' for e in ws.events)
               for ws in sockets.values())
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
    assert all(not seat.blessing_choices for seat in g.seats), "Bênção apareceu na rodada 2."

    # A primeira bênção deve existir na rodada 5, e apenas nela ser obrigatória.
    g.round=5
    l.assign_blessings(g)
    first=g.seats[0]
    assert len(first.blessing_choices)==3, "Bênção ausente na rodada 5."
    before=len(first.ws.events)
    await l.handle(first.ws,g,0,{'type':'quad_ready','units':units,'deck':deck})
    assert not first.ready, "Equipe foi aceita sem selecionar a bênção da rodada 5."
    assert any(e.get('type')=='error' and 'bênção' in e.get('message','')
               for e in first.ws.events[before:])
    choice=first.blessing_choices[0]
    await l.handle(first.ws,g,0,{'type':'quad_blessing','id':choice})
    assert first.blessing_used==5
    await l.handle(first.ws,g,0,{'type':'quad_ready','units':units,'deck':deck})
    assert first.ready, "Equipe não foi aceita após selecionar a bênção da rodada 5."

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
    assert not human.blessing_choices, "Um bot forçou uma bênção na rodada 1."
    async def dont_write_score(_game):pass
    l2.score=dont_write_score
    await l2.handle(ws,g2,0,{'type':'quad_ready','units':units,'deck':deck})
    assert human.ready, "Confirmar equipe falhou em partida contra três bots."
    assert g2.phase=='combat'
    assert 1 in g2.finished_pairs # bot vs bot já foi resolvido
    g2.seats[0].hp=1
    bot=next(s for s in g2.seats if s.bot)
    await l2.resolve_pair(g2,0,False,[u['star'] for u in bot.units])
    assert g2.phase=='done',g2.phase
    assert any(e['type']=='quad_final' for e in ws.events)
    # Testes de integração da fila: nunca iniciar antes de preencher os quatro assentos.
    for age,human_count,expected_bots in ((59,1,None),(61,3,1),(76,2,2),(91,1,3)):
        check=build_league()
        started=time.monotonic()
        for idx in range(human_count):
            ws3=FakeSocket()
            check.queues[f'queue_{age}_{idx}']={'name':f'Pessoa {idx}','rating':100,
                'ws':ws3,'since':started-age,'rating_data':{'points':100}}
        await check.match_queue()
        if expected_bots is None:
            assert not check.games, 'Começou uma partida sem quatro participantes.'
        else:
            assert len(check.games)==1, f'Fallback dos bots falhou aos {age}s.'
            match=next(iter(check.games.values()))
            assert len(match.seats)==4 and sum(s.bot for s in match.seats)==expected_bots
            assert all(s.bot or any(e.get('type')=='quad_joined' for e in s.ws.events) for s in match.seats)
    reconnect_check=build_league()
    lost=FakeSocket()
    reconnect_check.queues['reconnect']={'name':'Jogador','rating':100,'ws':lost,
        'since':time.monotonic()-89,'rating_data':{'points':100}}
    await reconnect_check.disconnect(lost)
    assert 'reconnect' not in reconnect_check.queues
    assert 'reconnect' in reconnect_check.recent_waiting
    return {'four_human_rounds':2,'queue_fallbacks':3,'disconnection_wait_saved':True,'human_with_bots':3,'results':True,
            'first_round_ready':True,'round_five_blessing':True}


def run_sync():
    return asyncio.run(smoke())
