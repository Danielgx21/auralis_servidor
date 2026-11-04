"""Loja dos Reinos — compras persistentes e verificadas no servidor."""
import json
import time

# O elenco inicial mantém as 14 escolhas do baralho padrão, além de 3 alternativas.
STARTER_MINIS=('guard','spear','axe','bow','druid','hunter','mage','cleric','rogue','ghost','paladin','pyro','seraph','frost','earth','monk','tide')
LOCKED_MINIS={
    'golem':('Golem',180),
    'sentinel':('Sentinela',140),
    'toxic':('Arqueira Venenosa',175),
    'shaman':('Xamã',185),
    'storm':('Tempestade',220),
    'necro':('Necromante',280),
    'shade':('Sombra Errante',215),
    'spark':('Mago do Raio',205),
    'templar':('Templário',235),
    'oracle':('Oráculo Sagrado',190),
}
# Propostas de campanha usam mecânicas do jogo, não anúncios de conteúdo inexistente.
CAMPAIGNS={
    'reinos':('Campanha dos Reinos', 'free',0,'A campanha clássica dos cinco reinos e 25 batalhas.'),
    'inverno':('Inverno Eterno','coins',450,'Inimigos velozes, arenas geladas e avanço sob tempestades.'),
    'sombras':('Noite dos Mortos','crystals',75,'Inimigos com mais vida e confrontos nas ruínas escuras.'),
    'cerco':('Guerra dos Bastiões','coins',590,'Defensores mais resistentes e arenas de muralhas.'),
}
SKINS={
    'skin_rogue_crimson':('Assassina Carmesim','rogue','crystals',55,'Visual com tons rubros.'),
    'skin_necro_spectral':('Necromante Espectral','necro','crystals',70,'Visual violeta-espectral.'),
    'skin_guard_royal':('Guardião Real','guard','crystals',35,'Armadura em ouro e azul.'),
    'skin_bow_winter':('Arqueira Invernal','bow','crystals',40,'Armadura em tons glaciais.'),
    'skin_mage_rune':('Feiticeira Rúnica','mage','crystals',50,'Efeito de magia violeta.'),
    'skin_seraph_eclipse':('Serafina do Eclipse','seraph','crystals',65,'Visual dourado e púrpura.'),
}
PRODUCTS={}
for key,(name,price) in LOCKED_MINIS.items():
    PRODUCTS['mini_'+key]={'id':'mini_'+key,'category':'miniatures','mini':key,'name':name,'currency':'coins','price':price,'description':'Desbloqueia permanentemente esta miniatura para seus elencos.'}
for key,(name,currency,price,desc) in CAMPAIGNS.items():
    PRODUCTS['campaign_'+key]={'id':'campaign_'+key,'category':'campaigns','campaign':key,'name':name,'currency':currency,'price':price,'description':desc}
for key,(name,mini,currency,price,desc) in SKINS.items():
    PRODUCTS[key]={'id':key,'category':'skins','mini':mini,'name':name,'currency':currency,'price':price,'description':desc}
PRODUCTS['ticket_arena']={'id':'ticket_arena','category':'tickets','name':'Ingresso de Torneio','currency':'coins','price':120,'description':'1 ingresso para torneios especiais, quando houver evento ativo.'}
PRODUCTS['ticket_royal']={'id':'ticket_royal','category':'tickets','name':'Ingresso Real','currency':'crystals','price':35,'description':'1 ingresso para torneios especiais; sem evento ativo no momento.'}

def install_storefront(app,store):
    from account_api import AuthError
    async def setup(_app):
        import asyncio
        await asyncio.to_thread(ensure_schema)
    def ensure_schema():
        with store.connection() as con:
            store.query(con,'''CREATE TABLE IF NOT EXISTS mini_store_inventory(
                user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                minis TEXT NOT NULL,
                campaigns TEXT NOT NULL,
                skins TEXT NOT NULL,
                equipped_skins TEXT NOT NULL,
                tickets INTEGER NOT NULL DEFAULT 0,
                selected_campaign TEXT NOT NULL DEFAULT 'reinos',
                updated_at BIGINT NOT NULL
            )''')
    app.on_startup.append(setup)

    def row_for(con,uid):
        now=int(time.time())
        # Conta antiga também recebe o kit inicial apenas na PRIMEIRA criação do inventário.
        store.query(con,'''INSERT INTO mini_wallets
            (user_id,coins,crystals,banner,owned_banners,updated_at)
            VALUES (?,0,0,'castelo','["castelo"]',?)
            ON CONFLICT(user_id) DO NOTHING''',(uid,now))
        inserted=store.query(con,'''INSERT INTO mini_store_inventory
            (user_id,minis,campaigns,skins,equipped_skins,tickets,selected_campaign,updated_at)
            VALUES (?,?,?,?,?,0,'reinos',?)
            ON CONFLICT(user_id) DO NOTHING''',
            (uid,json.dumps(STARTER_MINIS),json.dumps(['reinos']),json.dumps([]),json.dumps({}),now))
        if inserted.rowcount==1:
            # Saldo inicial concedido uma única vez por conta, inclusive contas existentes.
            store.query(con,'UPDATE mini_wallets SET coins=coins+240, crystals=crystals+25, updated_at=? WHERE user_id=?',(now,uid))
        inv=store.query(con,'SELECT * FROM mini_store_inventory WHERE user_id=?'+(' FOR UPDATE' if store.postgres else ''),(uid,)).fetchone()
        wallet=store.query(con,'SELECT coins,crystals FROM mini_wallets WHERE user_id=?'+(' FOR UPDATE' if store.postgres else ''),(uid,)).fetchone()
        user=store.query(con,'SELECT username FROM mini_users WHERE id=?',(uid,)).fetchone()
        return inv,wallet,bool(user and user['username'].lower()=='daniel')

    def owned(user_id):
        with store.connection() as con:
            inv,_,infinite=row_for(con,user_id)
            return set(json.loads(inv['minis']))

    def economy(user_id,action=None,item=None):
        if action is not None and (not isinstance(item,str) or item not in PRODUCTS):
            raise AuthError('Produto desconhecido.',400)
        now=int(time.time())
        with store.connection() as con:
            inv,wallet,unlimited=row_for(con,user_id)
            minis=set(json.loads(inv['minis']))
            campaigns=set(json.loads(inv['campaigns']))
            skins=set(json.loads(inv['skins']))
            equipped=dict(json.loads(inv['equipped_skins']))
            tickets=int(inv['tickets'])
            selected=inv['selected_campaign']
            if action is not None:
                product=PRODUCTS[item]
                kind=product['category']
                already=item in (('mini_'+m for m in minis) if kind=='miniatures' else
                            ('campaign_'+c for c in campaigns) if kind=='campaigns' else skins)
                if action=='buy':
                    if kind!='tickets' and already:raise AuthError('Você já possui este produto.',409)
                    if kind=='tickets' and tickets>=25:raise AuthError('Limite de 25 ingressos atingido.',409)
                    if not unlimited and product['price']>0:
                        currency=product['currency']
                        if currency not in ('coins','crystals'):raise AuthError('Moeda inválida.')
                        q=store.query(con,'UPDATE mini_wallets SET '+currency+'='+currency+'-?,updated_at=? WHERE user_id=? AND '+currency+'>=?',
                            (product['price'],now,user_id,product['price']))
                        if q.rowcount!=1:raise AuthError('Saldo insuficiente.',409)
                    if kind=='miniatures':minis.add(product['mini'])
                    elif kind=='campaigns':campaigns.add(product['campaign'])
                    elif kind=='skins':skins.add(item)
                    elif kind=='tickets':tickets+=1
                elif action=='equip':
                    if kind=='campaigns':
                        if product['campaign'] not in campaigns:raise AuthError('Campanha bloqueada.',403)
                        selected=product['campaign']
                    elif kind=='skins':
                        if item not in skins:raise AuthError('Skin não adquirida.',403)
                        equipped[product['mini']]=item
                    else:raise AuthError('Este produto não pode ser equipado.',400)
                elif action=='unequip':
                    if kind!='skins':raise AuthError('Operação inválida.',400)
                    equipped.pop(product['mini'],None)
                else:raise AuthError('Ação desconhecida.',400)
                store.query(con,'''UPDATE mini_store_inventory SET
                    minis=?,campaigns=?,skins=?,equipped_skins=?,tickets=?,
                    selected_campaign=?,updated_at=? WHERE user_id=?''',
                    (json.dumps(sorted(minis)),json.dumps(sorted(campaigns)),json.dumps(sorted(skins)),
                     json.dumps(equipped),tickets,selected,now,user_id))
                wallet=store.query(con,'SELECT coins,crystals FROM mini_wallets WHERE user_id=?',(user_id,)).fetchone()
            catalog=[]
            for product in PRODUCTS.values():
                state=dict(product)
                kind=product['category']
                state['owned']=(product['mini'] in minis if kind=='miniatures' else
                              product['campaign'] in campaigns if kind=='campaigns' else
                              product['id'] in skins if kind=='skins' else False)
                state['selected']=(kind=='campaigns' and product['campaign']==selected or
                                 kind=='skins' and equipped.get(product['mini'])==product['id'])
                catalog.append(state)
            return {'coins':'∞' if unlimited else int(wallet['coins']),
                    'crystals':'∞' if unlimited else int(wallet['crystals']),
                    'unlimited':unlimited,
                    'ownedMinis':sorted(minis),'ownedCampaigns':sorted(campaigns),
                    'ownedSkins':sorted(skins),'equippedSkins':equipped,
                    'selectedCampaign':selected,'tickets':tickets,
                    'catalog':catalog}
    def credit(user_id,coins=0,crystals=0,con=None):
        # Chamado somente após resultado autoritativo do servidor, não pelo navegador.
        if coins<0 or crystals<0 or coins>1000 or crystals>200:raise ValueError('Crédito inválido')
        if con is None:
            with store.connection() as dbc:credit(user_id,coins,crystals,dbc)
            return
        row_for(con,user_id)
        store.query(con,'UPDATE mini_wallets SET coins=coins+?,crystals=crystals+?,updated_at=? WHERE user_id=?',
                    (coins,crystals,int(time.time()),user_id))
    store.economy=economy
    store.store_owned=owned
    store.store_credit=credit
    store.store_catalog=PRODUCTS
    return store
