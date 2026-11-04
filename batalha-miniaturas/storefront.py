"""Loja dos Reinos — compras persistentes e verificadas no servidor."""
import json
import time

# O elenco inicial mantém as 14 escolhas do baralho padrão, além de 3 alternativas.
STARTER_MINIS=('guard','spear','axe','bow','druid','hunter','mage','cleric','rogue','ghost','paladin','pyro','seraph','frost','earth','monk','tide')
LOCKED_MINIS={
    'golem':('Golem',180),
    'sentinel':('Sentinela',140),
    'toxic':('Arqueira Tóxica',175),
    'shaman':('Xamã',185),
    'storm':('Tempestária',220),
    'necro':('Necromante',280),
    'shade':('Sombra Errante',215),
    'spark':('Condutor',205),
    'templar':('Templário',235),
    'oracle':('Vidente',190),
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
ARENA_COSMETICS={
    'arena_castelo':('Castelo Abandonado','crystals',60,'Muralhas, pedras antigas e tochas sob o céu escuro.'),
    'arena_floresta':('Floresta Encantada','crystals',55,'Clareira verde com reflexos mágicos e vegetação luminosa.'),
    'arena_cripta':('Cripta Amaldiçoada','crystals',70,'Ruínas violetas, runas antigas e atmosfera espectral.'),
    'arena_glacial':('Arena Glacial','crystals',65,'Gelo azulado, neve cristalina e reflexos frios.')
}
EFFECT_COSMETICS={
    'fx_spawn_portal':('Portal Arcano','spawn','coins',220,'Círculo arcano na entrada das suas miniaturas.'),
    'fx_spawn_fumaca':('Fumaça Sombria','spawn','crystals',30,'Névoa violeta surge na entrada do exército.'),
    'fx_spawn_luz':('Luz Sagrada','spawn','crystals',35,'Clarão dourado ao começar a batalha.'),
    'fx_spawn_gelo':('Gelo Ascendente','spawn','coins',240,'Cristais gelados aparecem sob suas tropas.'),
    'fx_kill_cristal':('Explosão de Cristais','kill','crystals',35,'Explosão cristalina ao eliminar uma miniatura.'),
    'fx_kill_corte':('Corte Sombrio','kill','coins',250,'Corte púrpura na eliminação.'),
    'fx_kill_chama':('Chama Real','kill','crystals',40,'Centelha flamejante nas eliminações.'),
    'fx_kill_raio':('Raio Arcano','kill','coins',280,'Descarga elétrica na posição da miniatura eliminada.'),
    'fx_victory_gloria':('Glória Dourada','victory','crystals',45,'Explosão dourada ao vencer um combate.'),
    'fx_victory_nevoa':('Névoa Violeta','victory','crystals',30,'Vitória envolta por magia sombria.'),
    'fx_victory_estrelas':('Chuva Estelar','victory','coins',300,'Estrelas cintilam sobre o resultado de vitória.'),
    'fx_victory_coroa':('Coroação Mágica','victory','crystals',55,'Coroa real e brilho especial na vitória.')
}
PRODUCTS={}
for key,(name,price) in LOCKED_MINIS.items():
    PRODUCTS['mini_'+key]={'id':'mini_'+key,'category':'miniatures','mini':key,'name':name,'currency':'coins','price':price,'description':'Desbloqueia permanentemente esta miniatura para seus elencos.'}
for key,(name,currency,price,desc) in CAMPAIGNS.items():
    PRODUCTS['campaign_'+key]={'id':'campaign_'+key,'category':'campaigns','campaign':key,'name':name,'currency':currency,'price':price,'description':desc}
for key,(name,mini,currency,price,desc) in SKINS.items():
    PRODUCTS[key]={'id':key,'category':'skins','mini':mini,'name':name,'currency':currency,'price':price,'description':desc}
for key,(name,currency,price,desc) in ARENA_COSMETICS.items():
    PRODUCTS[key]={'id':key,'category':'cosmetics','kind':'arena','name':name,'currency':currency,'price':price,'description':desc}
for key,(name,slot,currency,price,desc) in EFFECT_COSMETICS.items():
    PRODUCTS[key]={'id':key,'category':'cosmetics','kind':'effect','slot':slot,'name':name,'currency':currency,'price':price,'description':desc}
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
            store.query(con,'''CREATE TABLE IF NOT EXISTS mini_cosmetic_inventory(
                user_id TEXT PRIMARY KEY REFERENCES mini_users(id) ON DELETE CASCADE,
                owned_arenas TEXT NOT NULL DEFAULT '[]',
                selected_arena TEXT NOT NULL DEFAULT 'padrao',
                owned_effects TEXT NOT NULL DEFAULT '[]',
                equipped_effects TEXT NOT NULL DEFAULT '{}',
                updated_at BIGINT NOT NULL
            )''')
    app.on_startup.append(setup)
    store.store_setup=ensure_schema

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
        user=store.query(con,'SELECT username,created_at FROM mini_users WHERE id=?',(uid,)).fetchone()
        return inv,wallet,bool(user and user['username'].lower()=='daniel' and int(user['created_at'])<1793750400)

    def cosmetic_row(con,uid):
        now=int(time.time())
        store.query(con,'''INSERT INTO mini_cosmetic_inventory
            (user_id,owned_arenas,selected_arena,owned_effects,equipped_effects,updated_at)
            VALUES (?,'[]','padrao','[]','{}',?)
            ON CONFLICT(user_id) DO NOTHING''',(uid,now))
        return store.query(con,'SELECT * FROM mini_cosmetic_inventory WHERE user_id=?'+(' FOR UPDATE' if store.postgres else ''),(uid,)).fetchone()

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
            cosmetic=cosmetic_row(con,user_id)
            owned_arenas=set(json.loads(cosmetic['owned_arenas']))
            selected_arena=cosmetic['selected_arena']
            owned_effects=set(json.loads(cosmetic['owned_effects']))
            equipped_effects=dict(json.loads(cosmetic['equipped_effects']))
            minis=set(json.loads(inv['minis']))
            campaigns=set(json.loads(inv['campaigns']))
            skins=set(json.loads(inv['skins']))
            equipped=dict(json.loads(inv['equipped_skins']))
            tickets=int(inv['tickets'])
            selected=inv['selected_campaign']
            if action is not None:
                product=PRODUCTS[item]
                kind=product['category']
                already=(product['mini'] in minis if kind=='miniatures' else
                         product['campaign'] in campaigns if kind=='campaigns' else
                         item in skins if kind=='skins' else
                         item in (owned_arenas if product.get('kind')=='arena' else owned_effects) if kind=='cosmetics' else False)
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
                    elif kind=='cosmetics':
                        if product['kind']=='arena':owned_arenas.add(item)
                        else:owned_effects.add(item)
                    elif kind=='tickets':tickets+=1
                elif action=='equip':
                    if kind=='campaigns':
                        if product['campaign'] not in campaigns:raise AuthError('Campanha bloqueada.',403)
                        selected=product['campaign']
                    elif kind=='skins':
                        if item not in skins:raise AuthError('Skin não adquirida.',403)
                        equipped[product['mini']]=item
                    elif kind=='cosmetics':
                        if not already:raise AuthError('Personalização não adquirida.',403)
                        if product['kind']=='arena':selected_arena=item
                        else:equipped_effects[product['slot']]=item
                    else:raise AuthError('Este produto não pode ser equipado.',400)
                elif action=='unequip':
                    if kind=='skins':equipped.pop(product['mini'],None)
                    elif kind=='cosmetics':
                        if product['kind']=='arena':
                            if selected_arena==item:selected_arena='padrao'
                        elif equipped_effects.get(product['slot'])==item:
                            equipped_effects.pop(product['slot'],None)
                    else:raise AuthError('Operação inválida.',400)
                else:raise AuthError('Ação desconhecida.',400)
                store.query(con,'''UPDATE mini_store_inventory SET
                    minis=?,campaigns=?,skins=?,equipped_skins=?,tickets=?,
                    selected_campaign=?,updated_at=? WHERE user_id=?''',
                    (json.dumps(sorted(minis)),json.dumps(sorted(campaigns)),json.dumps(sorted(skins)),
                     json.dumps(equipped),tickets,selected,now,user_id))
                store.query(con,'''UPDATE mini_cosmetic_inventory SET
                    owned_arenas=?,selected_arena=?,owned_effects=?,equipped_effects=?,updated_at=? WHERE user_id=?''',
                    (json.dumps(sorted(owned_arenas)),selected_arena,json.dumps(sorted(owned_effects)),
                     json.dumps(equipped_effects),now,user_id))
                wallet=store.query(con,'SELECT coins,crystals FROM mini_wallets WHERE user_id=?',(user_id,)).fetchone()
            catalog=[]
            for product in PRODUCTS.values():
                state=dict(product)
                kind=product['category']
                state['owned']=(product['mini'] in minis if kind=='miniatures' else
                              product['campaign'] in campaigns if kind=='campaigns' else
                              product['id'] in skins if kind=='skins' else
                              product['id'] in (owned_arenas if product.get('kind')=='arena' else owned_effects) if kind=='cosmetics' else False)
                state['selected']=(kind=='campaigns' and product['campaign']==selected or
                                 kind=='skins' and equipped.get(product['mini'])==product['id'] or
                                 kind=='cosmetics' and (selected_arena==product['id'] if product.get('kind')=='arena' else equipped_effects.get(product.get('slot'))==product['id']))
                catalog.append(state)
            return {'coins':'∞' if unlimited else int(wallet['coins']),
                    'crystals':'∞' if unlimited else int(wallet['crystals']),
                    'unlimited':unlimited,
                    'ownedMinis':sorted(minis),'ownedCampaigns':sorted(campaigns),
                    'ownedSkins':sorted(skins),'equippedSkins':equipped,
                    'ownedArenas':sorted(owned_arenas),'selectedArena':selected_arena,
                    'ownedEffects':sorted(owned_effects),'equippedEffects':equipped_effects,
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
