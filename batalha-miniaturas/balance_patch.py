# Patch gerado a partir das fórmulas auditadas. Aplica-se apenas à batalha.
def apply_balance_html(html):
    changes = [
  [
    "focus:{name:'Foco arcano',icon:'💠',cost:5,tip:'Ignora 5 de resistência mágica',magicPierce:5}",
    "focus:{name:'Foco arcano',icon:'💠',cost:5,tip:'+5 AP e ignora 9 de resistência mágica',ap:5,magicPierce:9}",
    "Foco Arcano diferenciado"
  ],
  [
    "lance:{name:'Lança perfurante',icon:'🔱',cost:5,tip:'Ignora 5 de armadura física',pierce:5}",
    "lance:{name:'Lança perfurante',icon:'🔱',cost:5,tip:'+3 AD e ignora 7 de armadura física',ad:3,pierce:7}",
    "Lança perfurante diferenciada"
  ],
  [
    "focus:'Aumenta a eficácia de ataques e habilidades mágicas ao ignorar parte da resistência mágica do alvo.'",
    "focus:'Concede +5 AP e ignora 9 pontos de resistência mágica, especialmente útil contra alvos resistentes.'",
    "descrição Foco"
  ],
  [
    "lance:'Os ataques físicos ignoram parte da armadura do alvo antes de calcular o dano.'",
    "lance:'Concede +3 AD e ignora 7 pontos de armadura física, especialmente útil contra tanques.'",
    "descrição Lança"
  ],
  [
    "moveSpeed:baseMove*(1+sum('moveSpeed'))*(piece.bossTag?1.03:1),moveMeter:0,cdr:",
    "moveSpeed:baseMove*(1+sum('moveSpeed'))*(piece.bossTag?1.03:1),moveMeter:0,attackHits:0,magicShredActions:0,magicShredAmount:0,cdr:",
    "novos contadores"
  ],
  [
    "flanks:0,retreats:0,pierces:0}};",
    "flanks:0,retreats:0,moves:0,pierces:0}};",
    "estatísticas de movimento"
  ],
  [
    "function selectTarget(actor,opponents,team){",
    "function selectTarget(actor,opponents,team,consumeTaunt=true){",
    "seleção de alvo"
  ],
  [
    "actor.tauntActions--;if(actor.tauntActions<=0)actor.tauntId=null;",
    "if(consumeTaunt){actor.tauntActions--;if(actor.tauntActions<=0)actor.tauntId=null;}",
    "provocação"
  ],
  [
    "const defense=kind==='magic'?(target.resist||0):(target.armor||0);",
    "const defense=kind==='magic'?Math.max(0,(target.resist||0)-(target.magicShredActions>0?(target.magicShredAmount||0):0)):(target.armor||0);",
    "resistência mágica temporária"
  ],
  [
    "const got=Math.max(0,Math.min(target.maxHp-target.hp,Math.round(amount*(target.antiheal>0?1-Math.min(.8,Math.max(0,target.antihealPower||.5)):1)*(1+(source.sacredBoost||0)))));",
    "const healItem=style==='leech'?1:(1+(source.healBoost||0));\n const got=Math.max(0,Math.min(target.maxHp-target.hp,Math.round(amount*(target.antiheal>0?1-Math.min(.8,Math.max(0,target.antihealPower||.5)):1)*(1+(source.sacredBoost||0))*healItem)));",
    "bônus de cura universal"
  ],
  [
    "const prev=actor.shield,actual=Math.min(max,prev+Math.round(amount*(1+(source.sacredBoost||0))));\n actor.shield=actual;const gained=Math.max(0,actual-prev);\n ",
    "const prev=Math.max(0,actor.shield||0),space=Math.max(0,max-prev);\n const gained=Math.max(0,Math.min(space,Math.round(amount*(1+(source.sacredBoost||0)))));\n actor.shield=prev+gained;\n ",
    "escudo não diminui"
  ],
  [
    "if(actor.antiheal>0){actor.antiheal--;if(actor.antiheal===0)actor.antihealPower=0;}",
    "if(actor.antiheal>0){actor.antiheal--;if(actor.antiheal===0)actor.antihealPower=0;}\n if(actor.magicShredActions>0){actor.magicShredActions--;if(actor.magicShredActions===0)actor.magicShredAmount=0;}",
    "expiração resistência mágica"
  ],
  [
    "patients.forEach(p=>restoreHealth(actor,p,actor.ap*(type==='druid'?1.6:3.4)*(1+(actor.healBoost||0))));",
    "patients.forEach(p=>restoreHealth(actor,p,actor.ap*(type==='druid'?1.6:3.4)));",
    "cura Druida/Oráculo"
  ],
  [
    "restoreHealth(actor,u,Math.round(actor.ap*1.15*(1+actor.sacredBoost)))",
    "restoreHealth(actor,u,Math.round(actor.ap*1.15))",
    "Ondina cura"
  ],
  [
    "target.resist=Math.max(0,target.resist-3);effectDamage(actor,target,.55,'magic');",
    "target.magicShredAmount=Math.max(target.magicShredAmount||0,3);target.magicShredActions=Math.max(target.magicShredActions||0,4);effectDamage(actor,target,.55,'magic');",
    "Vidente temporária"
  ],
  [
    "if(type==='shade'&&skillReady(actor,3)&&target.hp>0){skillCue(actor,'CORTE SOMBRIO','shadow');effectDamage(actor,target,.45,'magic');target.antiheal=3}",
    "if(type==='shade'&&skillReady(actor,3)&&target.hp>0){skillCue(actor,'CORTE SOMBRIO','shadow');effectDamage(actor,target,.45,'magic');if(target.hp>0)applyAntiHeal(target,.5,3)}",
    "Sombra corta-cura"
  ],
  [
    "if(type==='ghost'&&skillReady(actor,3)){skillCue(actor,'DRENAR VIDA','shadow');if(target.hp>0)target.antiheal=2;}",
    "if(type==='ghost'&&skillReady(actor,3)){skillCue(actor,'DRENAR VIDA','shadow');if(target.hp>0)applyAntiHeal(target,.5,3);}",
    "Espectro corta-cura"
  ],
  [
    "if(type==='hunter'&&skillReady(actor,4)){boost=1.25;skill='TIRO CERTEIRO'}",
    "if(type==='hunter'&&(actor.attackHits||0)%4===3){boost=1.25;skill='TIRO CERTEIRO'}",
    "Caçadora a cada 4 ataques"
  ],
  [
    "const skillAttack=type==='hunter'&&skillReady(actor,4)?'true':null;",
    "const skillAttack=type==='hunter'&&(actor.attackHits||0)%4===3?'true':null;",
    "Caçadora dano verdadeiro"
  ],
  [
    "const {dmg,critical,kind}=effectDamage(actor,target,boost,skillAttack);",
    "actor.attackHits=(actor.attackHits||0)+1;\n const attackCycle=actor.attackHits;\n const {dmg,critical,kind}=effectDamage(actor,target,boost,skillAttack);",
    "contador de ataques"
  ],
  [
    "if(type==='bow'&&skillReady(actor,4)&&target.hp>0)",
    "if(type==='bow'&&attackCycle%4===0&&target.hp>0)",
    "Arqueira disparo duplo"
  ],
  [
    "if(type==='monk'&&skillReady(actor,3)&&target.hp>0)",
    "if(type==='monk'&&attackCycle%3===0&&target.hp>0)",
    "Monge Solar golpes"
  ],
  [
    "${st.kills} / ${st.skills}</b>💥 KOs / skills</span></div>",
    "${st.kills} / ${st.skills}</b>💥 KOs / skills</span><span><b>${st.moves||0}</b>👟 Casas percorridas</span></div>",
    "relatório movimento"
  ]
]
    for before, after, label in changes:
        count = html.count(before)
        if count != 1:
            raise RuntimeError(f'Balance patch {label}: esperado 1 trecho, encontrado {count}')
        html = html.replace(before, after, 1)
    return _adjust_forge_prices(html)


# Preços da forja (todos os modos): aumenta o custo de escolha sem reduzir
# rendimentos por rodada, recompensas gratuitas ou custos de campeões.
# Itens raros são criados por combinação de dois itens básicos; não são vendidos.
ITEM_FORGE_PRICES = {
    'sword': 7,
    'mail': 8,
    'ward': 8,
    'focus': 8,
    'boots': 8,
    'amulet': 8,
    'ring': 10,
    'orb': 8,
    'staff': 8,
    'charm': 7,
    'shield': 7,
    'lance': 8,
    'hourglass': 10,
    'trailboots': 8,
    'plagueblade': 10,
    'hexstaff': 10,
    'thornmail': 10
}

def _adjust_forge_prices(html):
    import re
    start = html.index('const ITEMS={')
    end = html.index('const ITEM_DESCRIPTIONS={', start)
    section = html[start:end]
    for item_id, price in ITEM_FORGE_PRICES.items():
        pat = re.compile(r'(?m)^([ \\t]*' + re.escape(item_id) + r':\\{[^\\n]*?\\bcost:)(\\d+)(?=,)')
        hits = list(pat.finditer(section))
        if len(hits) != 1:
            raise RuntimeError(f'Preço do item {item_id}: esperado 1 ocorrência, encontrado {len(hits)}')
        section = pat.sub(lambda match: match.group(1) + str(price), section, count=1)
    return html[:start] + section + html[end:]
