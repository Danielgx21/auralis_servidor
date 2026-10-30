"""Manual das Criaturas v1.0 — servidor de expedições persistentes.
Uso: pip install -r requirements.txt && python server.py
Acesso: http://localhost:8765  |  WebSocket /ws
"""
from __future__ import annotations
import asyncio, hashlib, json, os, random, secrets, sqlite3, string, time
from pathlib import Path
from aiohttp import web, WSMsgType

BASE = Path(__file__).resolve().parent
META = json.loads((BASE / 'case_meta.json').read_text(encoding='utf-8'))
DATA_DIR = Path(os.environ.get('DATA_DIR', str(BASE / 'data')))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / 'expeditions.sqlite3'
TTL = 30 * 24 * 3600
PORT = int(os.environ.get('PORT', '8765'))
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_LOCK = asyncio.Lock()
LIVE: dict[str, dict[int, web.WebSocketResponse]] = {}

# Suporta Postgres para hospedagem sem disco persistente e SQLite com disco local/persistente.
if DATABASE_URL:
    import psycopg
    from psycopg.rows import dict_row
    pg = psycopg.connect(DATABASE_URL, autocommit=True, row_factory=dict_row)
    pg.execute('CREATE TABLE IF NOT EXISTS manual_expedition_rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, updated BIGINT NOT NULL)')
    def db_read(code):
        row = pg.execute('SELECT state FROM manual_expedition_rooms WHERE code=%s', (code,)).fetchone()
        return json.loads(row['state']) if row else None
    def db_write(state):
        pg.execute('INSERT INTO manual_expedition_rooms(code,state,updated) VALUES(%s,%s,%s) ON CONFLICT (code) DO UPDATE SET state=EXCLUDED.state, updated=EXCLUDED.updated', (state['code'],json.dumps(state,ensure_ascii=False),int(time.time())))
    def db_count():
        return pg.execute('SELECT count(*) AS n FROM manual_expedition_rooms').fetchone()['n']
else:
    db = sqlite3.connect(DB_PATH, check_same_thread=False)
    db.execute('PRAGMA journal_mode=WAL')
    db.execute('CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, updated INTEGER NOT NULL)')
    db.commit()
    def db_read(code):
        row=db.execute('SELECT state FROM rooms WHERE code=?',(code,)).fetchone()
        return json.loads(row[0]) if row else None
    def db_write(state):
        db.execute('INSERT INTO rooms(code,state,updated) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state, updated=excluded.updated',(state['code'],json.dumps(state,ensure_ascii=False),int(time.time())))
        db.commit()
    def db_count():
        return db.execute('SELECT count(*) FROM rooms').fetchone()[0]

def now(): return int(time.time())
def token_hash(token): return hashlib.sha256(str(token).encode()).hexdigest()
def clean_name(value): return str(value or 'Pesquisador').strip()[:24] or 'Pesquisador'
def safe_profile(profile):
    if not isinstance(profile,dict):return {}
    # O salvamento local continua autoritativo para compras; cópia opcional para recuperar no MESMO perfil.
    allow=('wallet','owned','stock','rooms','contracts','paid','dailyPayout','cases','completions','histories','current','economyV1','soundtrack')
    return {k:profile[k] for k in allow if k in profile} if len(json.dumps(profile,ensure_ascii=False))<120_000 else {}


# Relógio autoritativo, preservado em banco. Pausa se um participante desconectar.
MISSION_TIME_MS = {'lago': 20*60*1000, 'lago2': 23*60*1000}
def mission_limit_ms(case):
    if case in MISSION_TIME_MS: return MISSION_TIME_MS[case]
    difficulty = META.get(case,{}).get('difficulty','Intermediário')
    return {'Iniciante': 20,'Intermediário': 23,'Avançado': 26}.get(difficulty,23)*60*1000
def clock_elapsed(state):
    t = state.get('worldClock') or {}
    elapsed = max(0,int(t.get('elapsedMs',0)))
    if state.get('phase')=='case' and t.get('runFrom'):
        elapsed += max(0,int(time.time()*1000)-int(t['runFrom']))
    return elapsed
def clock_sync(state):
    if state.get('phase')!='case': return
    t = state.setdefault('worldClock', {'elapsedMs':0,'runFrom':None})
    running = len(LIVE.get(state['code'],{}))==state['size'] and not state['team'].get('outcome')
    if running and not t.get('runFrom'):
        t['runFrom']=int(time.time()*1000)
    elif not running and t.get('runFrom'):
        t['elapsedMs']=clock_elapsed(state)
        t['runFrom']=None
def fail_expired(state):
    if state.get('phase')!='case' or clock_elapsed(state)<mission_limit_ms(state.get('caseId')): return False
    if state['mode']=='coop' and state['team'].get('outcome'): return False
    if state['mode']=='versus' and all(p.get('finished') for p in state['players']): return False
    state['lastFailure']={'caseId':state['caseId'],'reason':'deadline','timestamp':int(time.time()*1000)}
    state['phase']='camp'
    state['worldClock']={'elapsedMs':mission_limit_ms(state['caseId']),'runFrom':None}
    state['team']=team_default(None)
    state['caseId']=None
    state['startedAt']=0
    state['nominees']={}
    restart_votes(state)
    for p in state['players']:
        p['finished']=False;p['score']=0
    return True

def public(state):
    sockets=LIVE.get(state['code'],{})
    roster=[dict(slot=p['slot'],name=p['name'],connected=(p['slot'] in sockets and not sockets[p['slot']].closed),completed=p['completed'],score=p.get('score',0),finished=p.get('finished',False),rooms=p.get('rooms',{})) for p in state['players']]
    return dict(code=state['code'],mode=state['mode'],size=state['size'],hostSlot=state['hostSlot'],phase=state['phase'],caseId=state.get('caseId'),startedAt=state.get('startedAt',0),inGame=state['phase']=='case',players=roster,team=state['team'],votes=state['votes'],round=state['round'],firstFinish=state.get('firstFinish'),nominees=state['nominees'],bank=state['bank'],upgrades=state['upgrades'],completedCases=state['completedCases'],updated=state['updated'],worldClock={'elapsedMs':clock_elapsed(state),'running':bool((state.get('worldClock') or {}).get('runFrom')),'durationMs':mission_limit_ms(state.get('caseId')) if state.get('caseId') in META else 0},serverNow=int(time.time()*1000),lastFailure=state.get('lastFailure'))

async def send(ws, payload):
    if ws and not ws.closed:
        try: await ws.send_json(payload)
        except (ConnectionResetError,RuntimeError): pass

async def tell_all(state, event='state'):
    msg={'event':event,'state':public(state)}
    for ws in list(LIVE.get(state['code'],{}).values()): await send(ws,msg)

async def commit(state):
    state['updated']=now()
    db_write(state)

def require_player(state,slot):
    return next((p for p in state['players'] if p['slot']==slot),None)

def team_default(case):
    return {'caseId':case,'evidence':[],'witness':[],'boardSolved':False,'puzzleSolved':False,'roleContributions':{},'theory':None,'outcome':None}

def sanitize_progress(data,case):
    meta=META[case]
    return dict(evidence=[x for x in (data.get('evidence') or []) if x in meta['clues']][:9],witness=[x for x in (data.get('witness') or []) if x in meta['witness']][:3],boardSolved=bool(data.get('boardSolved')),puzzleSolved=bool(data.get('puzzleSolved')),roleContributions={k:str(v)[:400] for k,v in (data.get('roleContributions') or {}).items() if k.startswith('p') and len(k)<5})

def unique_str_list(seq, valid):
    return list(dict.fromkeys(x for x in seq if x in valid))

def eligible(state,case):
    parent=META[case]['prerequisite']
    return not parent or all(parent in p['completed'] for p in state['players'])

def restart_votes(state):
    state['votes']={'theory':{},'end':{},'next':{}}
    state['round']={'theory':0,'end':0,'next':0}

def start_case(state,case):
    state['caseId']=case
    state['startedAt']=int(time.time()*1000)
    state['phase']='case'
    state['worldClock']={'elapsedMs':0,'runFrom':int(time.time()*1000)}
    state['lastFailure']=None
    state['team']=team_default(case)
    state['nominees']={}
    state['firstFinish']=None
    restart_votes(state)
    for p in state['players']:
        p['finished']=False;p['score']=0

def room_new(code,mode,size):
    return {'code':code,'mode':mode,'size':size,'hostSlot':0,'players':[],'phase':'lobby','caseId':None,'startedAt':0,'team':team_default(None),'votes':{'theory':{},'end':{},'next':{}},'round':{'theory':0,'end':0,'next':0},'nominees':{},'firstFinish':None,'bank':0,'upgrades':{},'completedCases':[],'updated':now(),'ledger':[]}

async def handle(ws,req):
    if not isinstance(req,dict):return None,None
    op=req.get('op')
    token=req.get('token','')
    if not isinstance(token,str) or not 24<=len(token)<=150:
        await send(ws,{'event':'error','message':'Identidade inválida. Atualize a página.'});return None,None
    code=str(req.get('code','')).upper().strip()
    if op=='create':
        mode=req.get('mode') if req.get('mode') in ('coop','versus') else 'coop'
        size=max(2,min(5,int(req.get('size',2))))
        for i in range(20):
            code=''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(6))
            if not db_read(code):break
        state=room_new(code,mode,size)
        selected=req.get('caseId')
        state['caseId']=selected if selected in META else 'lago'
    elif op=='join' and len(code)==6:
        state=db_read(code)
        if not state:
            await send(ws,{'event':'error','message':'Expedição não encontrada. Confira o código.'});return None,None
        # Salas antigas não registravam o arquivo escolhido no servidor.
        if state.get('phase')=='lobby' and state.get('caseId') not in META:
            state['caseId']='lago'
    else:
        await send(ws,{'event':'error','message':'Informe um código válido ou crie uma expedição.'});return None,None
    identity=token_hash(token)
    existing=next((p for p in state['players'] if p['secret']==identity),None)
    if existing:
        player=existing
    else:
        if len(state['players'])>=state['size']:
            await send(ws,{'event':'error','message':'Expedição cheia. Use a chave de recuperação da sua identidade.'});return None,None
        slot=next(i for i in range(state['size']) if all(p['slot']!=i for p in state['players']))
        player={'secret':identity,'slot':slot,'name':clean_name(req.get('name')),'completed':[],'score':0,'finished':False,'rooms':{},'profile':{},'profileUpdated':0}
        state['players'].append(player)
    player['name']=clean_name(req.get('name') or player['name'])
    profile=safe_profile(req.get('profile'))
    profile_at=int(req.get('profileUpdated') or 0)
    # Não substituir uma cópia no servidor mais nova com o salvamento antigo de outra aba.
    if profile and (profile_at>int(player.get('profileUpdated',0)) or not player.get('profile')):
        player['profile']=profile;player['profileUpdated']=profile_at
    # Completions do dispositivo importadas em caso de upgrade da 0.9.
    player['completed']=unique_str_list(player['completed'] + list((player.get('profile',{}).get('completions') or {}).keys()), META)
    player['rooms']=player.get('profile',{}).get('rooms',player.get('rooms',{}))
    sockets=LIVE.setdefault(code,{})
    old=sockets.get(player['slot'])
    if old and old is not ws and not old.closed:
        await send(old,{'event':'replaced','message':'Esta identidade entrou em outro aparelho.'})
        await old.close()
    sockets[player['slot']]=ws
    if state['hostSlot'] not in sockets:state['hostSlot']=min(sockets)
    clock_sync(state)
    await commit(state)
    await send(ws,{'event':'welcome','slot':player['slot'],'token':token,'profile':player.get('profile',{}),'profileUpdated':player.get('profileUpdated',0),'state':public(state)})
    await tell_all(state)
    return state,player['slot']

async def mutate(state,slot,m):
    code=state['code'];player=require_player(state,slot)
    if not player:return {'event':'error','message':'Pesquisador desconhecido.'}
    op=m.get('op');case=state.get('caseId')
    if fail_expired(state):
        await commit(state);await tell_all(state)
        return {'event':'error','message':'O prazo da investigação terminou. O grupo voltou ao Instituto sem a recompensa.'}
    if op=='heartbeat':
        return None
    if op=='profile':
        profile=safe_profile(m.get('profile'))
        when=int(m.get('profileUpdated') or 0)
        if profile and when>=int(player.get('profileUpdated',0)):
            player['profile']=profile;player['profileUpdated']=when
            player['completed']=unique_str_list(player['completed'] + list((profile.get('completions') or {}).keys()),META)
            player['rooms']=profile.get('rooms',player['rooms'])
        await commit(state)
        return None
    if op=='start':
        choice=m.get('caseId') or state.get('caseId')
        if slot!=state['hostSlot']:return {'event':'error','message':'Somente o coordenador inicia a missão.'}
        if state['phase'] not in ('lobby','camp'):return {'event':'error','message':'A missão atual ainda está aberta.'}
        if len(LIVE.get(code,{}))!=state['size']:return {'event':'error','message':'Aguardem todos os jogadores reconectarem.'}
        if choice not in META:return {'event':'error','message':'Missão inválida. Escolha um caso no catálogo.'}
        if not eligible(state,choice):return {'event':'error','message':'Uma continuação ainda não foi desbloqueada para todos.'}
        start_case(state,choice)
        clock_sync(state)
    elif op=='abort':
        if slot!=state['hostSlot']:return {'event':'error','message':'Somente a coordenação pode abandonar a missão para todos.'}
        if state['phase']!='case':return {'event':'error','message':'Não há missão em andamento.'}
        if state['mode']=='coop' and state['team'].get('outcome'):
            return {'event':'error','message':'A missão já foi concluída. Use Encerrar e ir ao Instituto.'}
        # Abandono não concede créditos, conclusão ou desbloqueios ao grupo.
        state['phase']='camp'
        state['caseId']=None
        state['startedAt']=0
        state['team']=team_default(None)
        state['nominees']={}
        state['firstFinish']=None
        restart_votes(state)
        for p in state['players']:
            p['finished']=False
            p['score']=0
    elif op=='camp':
        if slot!=state['hostSlot']:return {'event':'error','message':'Somente o coordenador encerra a missão coletiva.'}
        if state['phase']!='case':return None
        if state['mode']=='coop' and not state['team']['outcome']:return {'event':'error','message':'Concluam a votação do desfecho primeiro.'}
        if state['mode']=='versus' and not all(p['finished'] for p in state['players']):return {'event':'error','message':'Aguardem todos concluírem a investigação competitiva.'}
        state['phase']='camp';state['nominees']={};state['votes']['next']={}
        if case not in state['completedCases']:
            state['completedCases'].append(case);state['bank']+=50
    elif op=='nominate':
        if state['phase'] not in ('camp','lobby'):return {'event':'error','message':'Escolha outro caso no intervalo do Instituto.'}
        choice=m.get('caseId')
        if choice not in META or not eligible(state,choice):return {'event':'error','message':'Arquivo ainda bloqueado para alguém do grupo.'}
        state['nominees'][str(slot)]=choice
        state['votes']['next'][str(slot)]=choice
        participants=state['players']
        if len(participants)==state['size'] and len(state['votes']['next'])==state['size'] and len(LIVE.get(code,{}))==state['size']:
            from collections import Counter
            counts=Counter(state['votes']['next'].values())
            picked,amount=counts.most_common(1)[0]
            if amount>state['size']/2:
                start_case(state,picked)
            else:
                state['votes']['next']={};state['round']['next']+=1
    elif op=='progress':
        if state['phase']!='case' or m.get('caseId')!=case:return None
        player['score']=max(0,min(5000,int(m.get('score') or 0)))
        if state['mode']=='coop':
            data=sanitize_progress(m,case);team=state['team']
            team['evidence']=unique_str_list(team['evidence']+data['evidence'],META[case]['clues'])
            team['witness']=unique_str_list(team['witness']+data['witness'],META[case]['witness'])
            team['boardSolved']=team['boardSolved'] or data['boardSolved']
            team['puzzleSolved']=team['puzzleSolved'] or data['puzzleSolved']
            only_key='p'+str(slot)
            if only_key in data['roleContributions']:team['roleContributions'][only_key]=data['roleContributions'][only_key]
        if m.get('completed') and m.get('outcome') in META[case]['outcomes']:
            player['finished']=True
            player['completed']=unique_str_list(player['completed']+[case],META)
            if state['mode']=='versus' and not state['firstFinish']:state['firstFinish']='p'+str(slot)
    elif op=='vote':
        if state['phase']!='case' or state['mode']!='coop':return None
        kind=m.get('kind');choice=m.get('choice')
        if kind not in ('theory','end'):return None
        available=META[case]['theories' if kind=='theory' else 'outcomes']
        if choice not in available:return {'event':'error','message':'Opção de votação inválida.'}
        if kind=='end' and not state['team']['theory']:return {'event':'error','message':'Primeiro votem na hipótese.'}
        state['votes'][kind][str(slot)]=choice
        # Ninguém vence uma votação enquanto alguém estiver desconectado.
        if len(state['votes'][kind])==state['size'] and len(LIVE.get(code,{}))==state['size']:
            from collections import Counter
            counts=Counter(state['votes'][kind].values())
            winner,count=counts.most_common(1)[0]
            if count>state['size']/2:
                state['team']['theory' if kind=='theory' else 'outcome']=winner
                state['votes'][kind]={}
                if kind=='end':
                    for p in state['players']:
                        p['finished']=True
                        p['completed']=unique_str_list(p['completed']+[case],META)
            else:
                state['votes'][kind]={}
                state['round'][kind]+=1
    elif op=='donate':
        amount=int(m.get('amount') or 0)
        tx=str(m.get('tx') or '')[:70]
        if not 1<=amount<=3000 or not tx or tx in state['ledger']:return None
        state['ledger']=(state['ledger']+[tx])[-300:]
        state['bank']+=amount
    elif op=='upgrade':
        costs={'library':120,'laboratory':150,'observatory':165,'sanctuary':185}
        item=m.get('item');cost=costs.get(item)
        if cost is None or state['upgrades'].get(item):return None
        if slot!=state['hostSlot']:return {'event':'error','message':'A coordenação decide as melhorias coletivas.'}
        if state['bank']<cost:return {'event':'error','message':'Cofre coletivo insuficiente.'}
        state['bank']-=cost;state['upgrades'][item]=True
    else:return None
    await commit(state)
    await tell_all(state)
    return None

async def socket_handler(request):
    ws=web.WebSocketResponse(heartbeat=20,max_msg_size=160_000)
    await ws.prepare(request)
    code=None;slot=None
    try:
        async for item in ws:
            if item.type==WSMsgType.TEXT:
                try:payload=json.loads(item.data)
                except ValueError:continue
                async with DB_LOCK:
                    if code is None:
                        state,slot=await handle(ws,payload)
                        if state:code=state['code']
                    else:
                        state=db_read(code)
                        if state:
                            result=await mutate(state,slot,payload)
                            if result:await send(ws,result)
            elif item.type in (WSMsgType.ERROR,WSMsgType.CLOSE):break
    finally:
        if code is not None:
            async with DB_LOCK:
                slots=LIVE.get(code,{})
                if slots.get(slot) is ws:
                    slots.pop(slot,None)
                    state=db_read(code)
                    if state:
                        if slots and state['hostSlot'] not in slots:state['hostSlot']=min(slots)
                        clock_sync(state)
                        await commit(state)
                        await tell_all(state)
                if not slots:LIVE.pop(code,None)
    return ws

async def health(request):
    return web.json_response({'ok':True,'service':'manual-das-criaturas','rooms':db_count(),'persistent':bool(DATABASE_URL),'database':'postgres' if DATABASE_URL else 'sqlite','build':os.environ.get('MANUAL_BUILD_VERSION','1.0')})

async def index(request):
    # A versão da página e do módulo multiplayer precisam ser a mesma.
    # Módulo inline evita versões antigas de campaign.js mantidas pelo cache móvel.
    html = (BASE / 'index.html').read_text(encoding='utf-8')
    marker = '<script src="campaign.js?v=1.0.4"></script>'
    script = (BASE / 'campaign.js').read_text(encoding='utf-8')
    if marker not in html:
        return web.Response(text='Erro de integridade da versão. Atualize a página.', status=500)
    html = html.replace(marker, '<script>' + script.replace('</script', '<\\/script') + '</script>')
    return web.Response(text=html, content_type='text/html', headers={'Cache-Control':'no-store, max-age=0','Pragma':'no-cache'})

async def standalone(request):
    bundled=BASE/'Manual_das_Criaturas_V10_Offline_Online.html'
    return web.FileResponse(bundled) if bundled.exists() else web.HTTPFound('/')

app=web.Application(client_max_size=160_000)
app.router.add_get('/ws',socket_handler)
app.router.add_get('/health',health)
app.router.add_get('/',index)
app.router.add_get('/index.html',index)
app.router.add_get('/versao-unica',standalone)
app.router.add_static('/assets',BASE/'assets')
for filename in ('style.css','cases.js','extra_cases.js','gear.js','investigation.js','expansion.js','game.js','campaign.js','music.js','tutorial.js','lago_rework.js','lago_scenery.js','lago_visual_refino.js','lago_visual_refino.css','immersion.js','immersion.css','tempo_imersao.js'):
    app.router.add_get('/'+filename, lambda req, filename=filename:web.FileResponse(BASE/filename, headers={'Cache-Control':'no-store, max-age=0'}))

if __name__=='__main__':
    print(f'Manual das Criaturas | http://localhost:{PORT} | database: {"postgres" if DATABASE_URL else str(DB_PATH)}',flush=True)
    web.run_app(app,host='0.0.0.0',port=PORT,print=None)
