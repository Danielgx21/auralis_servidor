"""Expansão de 27 para 36 miniaturas. Aplicada em memória após os patches de balanceamento e clãs.

Mantém o HTML original e os demais jogos intactos.
"""
from collections import Counter

NEW_TYPES = {
    'ironhunter': ('Caçador de Ferro', 'ferro', 'selva'),
    'runesmith': ('Engenheira Rúnica', 'ferro', 'arcano'),
    'standardbearer': ('Porta-Estandarte', 'ferro', 'sagrado'),
    'chameleon': ('Camaleoa', 'selva', 'sombra'),
    'ashdruid': ('Druida das Cinzas', 'selva', 'elemental'),
    'voidweaver': ('Tecelã do Vazio', 'arcano', 'sombra'),
    'chronomancer': ('Cronomante', 'arcano', 'elemental'),
    'duskinq': ('Inquisidora do Crepúsculo', 'sombra', 'sagrado'),
    'phoenix': ('Fênix Ancestral', 'elemental', 'sagrado'),
}

TYPE_LINES = r"""
 ironhunter:{name:'Caçador de Ferro',short:'Caçador',icon:'🪤',group:'ferro',cost:3,hp:96,atk:23,armor:3,speed:1.09,range:2,skill:'Armadilha serrilhada',tip:'A cada quatro ataques, prende o alvo e causa dano físico extra.'},
 runesmith:{name:'Engenheira Rúnica',short:'Engenheira',icon:'⚙️',group:'ferro',cost:4,hp:80,atk:20,armor:2,speed:1.06,range:3,skill:'Torre de runas',tip:'Constrói uma torre temporária que dispara por três ações.'},
 standardbearer:{name:'Porta-Estandarte',short:'Estandarte',icon:'🚩',group:'ferro',cost:3,hp:133,atk:16,armor:6,speed:.95,range:1,skill:'Bandeira protetora',tip:'Intercepta ataques contra aliados e ergue escudos próximos.'},
 chameleon:{name:'Camaleoa',short:'Camaleoa',icon:'🦎',group:'selva',cost:3,hp:73,atk:27,armor:1,speed:1.34,range:1,skill:'Camuflagem letal',tip:'Desaparece por um instante e reaparece com golpe ampliado.'},
 ashdruid:{name:'Druida das Cinzas',short:'Cinzas',icon:'🍂',group:'selva',cost:4,hp:79,atk:20,armor:1,speed:1.03,range:3,skill:'Raízes incendiárias',tip:'Prende um inimigo e o queima com raízes em brasas.'},
 voidweaver:{name:'Tecelã do Vazio',short:'Tecelã',icon:'🕸️',group:'arcano',cost:4,hp:71,atk:23,armor:1,speed:1.08,range:4,skill:'Manto do silêncio',tip:'Silencia as habilidades do alvo por duas ações.'},
 chronomancer:{name:'Cronomante',short:'Cronomante',icon:'⌛',group:'arcano',cost:4,hp:74,atk:18,armor:1,speed:1.10,range:3,skill:'Dobra temporal',tip:'Acelera um aliado e atrasa as ações de um inimigo.'},
 duskinq:{name:'Inquisidora do Crepúsculo',short:'Inquisidora',icon:'⚖️',group:'sombra',cost:3,hp:99,atk:23,armor:3,speed:1.12,range:1,skill:'Marca do julgamento',tip:'Marca inimigos; ataques seguintes punem o alvo e curam aliados.'},
 phoenix:{name:'Fênix Ancestral',short:'Fênix',icon:'🦅',group:'elemental',cost:5,hp:89,atk:26,armor:2,speed:1.10,range:3,skill:'Renascimento solar',tip:'Espalha fogo e renasce uma única vez por combate com 35% de vida.'},
"""
MOVE = "ironhunter:1.12,runesmith:.97,standardbearer:.81,chameleon:1.43,ashdruid:.96,voidweaver:1.02,chronomancer:1.00,duskinq:1.13,phoenix:1.16"
RESIST = "ironhunter:3,runesmith:6,standardbearer:5,chameleon:3,ashdruid:6,voidweaver:8,chronomancer:7,duskinq:5,phoenix:8"
SKILL = "ironhunter:'physical',runesmith:'magic',standardbearer:'support',chameleon:'physical',ashdruid:'magic',voidweaver:'magic',chronomancer:'support',duskinq:'magic',phoenix:'magic'"
ROLES = "ironhunter:'fighter',runesmith:'caster',standardbearer:'front',chameleon:'flank',ashdruid:'caster',voidweaver:'caster',chronomancer:'support',duskinq:'fighter',phoenix:'fighter'"

# Arte original em SVG: não reaproveita personagens existentes nem interfere nas skins.
ART = r"""
// Retratos premium do atlas 3x3. O mesmo círculo e o mesmo tamanho do elenco
// original são usados no catálogo, na loja e no tabuleiro; os recortes focam
// nos rostos (não diminuem a miniatura).
const NEW_PORTRAIT_ORDER=['ironhunter','runesmith','standardbearer','chameleon','ashdruid','voidweaver','chronomancer','duskinq','phoenix'];
const NEW_PORTRAIT_ATLAS='/assets/miniaturas-novos-retratos-20261104.avif';
const NEW_PORTRAIT_CROPS={
 ironhunter:[27,8,132],
 runesmith:[27,6,132],
 standardbearer:[27,5,132],
 chameleon:[27,7,132],
 ashdruid:[28,6,132],
 voidweaver:[26,6,132],
 chronomancer:[21,8,132],
 duskinq:[26,5,132],
 phoenix:[27,14,138]
};
function newMiniatureArt(type){
 const index=NEW_PORTRAIT_ORDER.indexOf(type);
 if(index<0)return null;
 const [cx,cy,side]=NEW_PORTRAIT_CROPS[type];
 const zoom=100/side;
 const x=((index%3)*192+cx)*zoom;
 const y=(Math.floor(index/3)*192+cy)*zoom;
 const full=576*zoom;
 // O recorte circular é desenhado dentro do SVG. Isso evita as imagens
 // quadradas mesmo onde o contêiner da ficha não tem border-radius.
 const clipId='new-portrait-clip-'+type;
 return `<svg viewBox="0 0 100 100" class="mini-art portrait-exact new-portrait" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
   <defs><clipPath id="${clipId}"><circle cx="50" cy="50" r="47.5"/></clipPath></defs>
   <image href="${NEW_PORTRAIT_ATLAS}" x="${-x}" y="${-y}" width="${full}" height="${full}" preserveAspectRatio="none" clip-path="url(#${clipId})"/>
   <circle cx="50" cy="50" r="47.5" fill="none" stroke="#f6d69c" stroke-width="2.6"/>
   <circle cx="50" cy="50" r="45.4" fill="none" stroke="#9e6034" stroke-opacity=".68" stroke-width=".65"/>
 </svg>`;
}
"""

ABILITIES = r"""
function tryPhoenixRebirth(target){
 if(!target||target.type!=='phoenix'||target.hp>0||target.reborn)return false;
 target.reborn=true;
 target.hp=Math.max(1,Math.round(target.maxHp*.35));
 target.burn=null;target.poison=null;target.curse=null;target.stun=0;target.freeze=0;
 target.root=0;target.silencedActions=0;
 skillCue(target,'RENASCIMENTO','arcane');
 battle.fx.push({kind:'aura',style:'arcane',x:target.x,y:target.y});
 battle.log='A Fênix Ancestral renasceu das cinzas!';
 return true;
}
"""
ON_TURN = r"""
 // Estados temporários são individuais e reiniciados a cada combate.
 actor._silencedThisAction=(actor.silencedActions||0)>0;
 if(actor._silencedThisAction)actor.silencedActions--;
 if(actor.hasteActions>0)actor.hasteActions--;
 if(actor.turretActions>0){
   const turretTarget=opponents.filter(u=>u.hp>0&&dist(actor,u)<=4).sort((a,b)=>dist(actor,a)-dist(actor,b))[0];
   if(turretTarget){
     effectDamage(actor,turretTarget,.48,'magic');
     battle.fx.push({kind:'skill',x:actor.x,y:actor.y,label:'TORRE RÚNICA',style:'arcane'});
   }
   actor.turretActions--;
 }
 if(type==='chameleon'&&!actor._silencedThisAction&&skillReady(actor,4)&&!actor.hiddenActions){
   actor.hiddenActions=2;
   skillCue(actor,'CAMUFLAGEM','shadow');
   battle.log='Camaleoa desapareceu entre as sombras!';
   return;
 }
"""
ON_HIT = r"""
 if(type==='ironhunter'&&skillReady(actor,4)&&target.hp>0){
   skillCue(actor,'ARMADILHA','pierce');
   effectDamage(actor,target,.40,'physical');
   applyControl(target,'root',1,actor);
   battle.log='Caçador de Ferro prendeu o inimigo!';
 }
 if(type==='runesmith'&&skillReady(actor,4)){
   actor.turretActions=3;
   skillCue(actor,'TORRE DE RUNAS','arcane');
   battle.log='Engenheira construiu uma torre por três ações!';
 }
 if(type==='standardbearer'&&skillReady(actor,3)){
   const saved=team.filter(u=>u.hp>0&&u.id!==actor.id).sort((a,b)=>dist(actor,a)-dist(actor,b)).slice(0,2);
   saved.forEach(u=>raiseShield(u,Math.round(actor.ap*1.25),60,'ESTANDARTE',actor));
   opponents.filter(u=>u.hp>0&&dist(u,actor)<=2).slice(0,2).forEach(u=>{
     u.tauntId=actor.id;u.tauntActions=Math.max(u.tauntActions||0,1);
   });
   skillCue(actor,'ESTANDARTE','shield');
 }
 if(type==='ashdruid'&&skillReady(actor,3)&&target.hp>0){
   applyControl(target,'root',2,actor);
   target.burn={source:actor.id,damage:Math.max(4,Math.round(actor.ap*.22)),actions:2};
   skillCue(actor,'RAÍZES DE BRASA','poison');
 }
 if(type==='voidweaver'&&skillReady(actor,4)&&target.hp>0){
   target.silencedActions=Math.max(target.silencedActions||0,2);
   skillCue(actor,'SILÊNCIO','shadow');
   battle.fx.push({kind:'aura',style:'shadow',x:target.x,y:target.y});
 }
 if(type==='chronomancer'&&skillReady(actor,4)){
   const friend=team.filter(u=>u.hp>0&&u.id!==actor.id).sort((a,b)=>a.speed-b.speed)[0]||actor;
   friend.hasteActions=Math.max(friend.hasteActions||0,3);
   if(target.hp>0)target.slow=Math.max(target.slow||0,3);
   skillCue(actor,'DOBRA TEMPORAL','arcane');
   battle.log='Cronomante acelerou um aliado e atrasou um inimigo!';
 }
 if(type==='duskinq'&&target.hp>0){
   if(target.inquisitionBy===actor.id){
     effectDamage(actor,target,.28,'magic');
     const patient=team.filter(u=>u.hp>0&&u.hp<u.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
     if(patient)restoreHealth(actor,patient,Math.round(actor.ap*.55));
   }
   if(skillReady(actor,3)){
     target.inquisitionBy=actor.id;
     skillCue(actor,'MARCA DO JULGAMENTO','shadow');
   }
 }
 if(type==='phoenix'&&skillReady(actor,4)){
   skillCue(actor,'ASAS EM CHAMAS','arcane');
   [target,...opponents.filter(u=>u.hp>0&&u.id!==target.id&&dist(target,u)<=2).slice(0,2)].forEach((u,i)=>{
     if(u.hp<=0)return;
     if(i>0)effectDamage(actor,u,.35,'magic');
     u.burn={source:actor.id,damage:Math.max(4,Math.round(actor.ap*.18)),actions:2};
   });
 }
"""

def _replace_one(html, before, after, label):
    hits = html.count(before)
    if hits != 1:
        raise RuntimeError(f'Novos campeões: {label}: {hits} trechos, esperado 1')
    return html.replace(before, after, 1)

def _extend_object(html, start, entries):
    a=html.find(start)
    if a<0: raise RuntimeError('Objeto não encontrado: '+start)
    b=html.find('};',a)
    if b<0 or b-a>3000:raise RuntimeError('Fechamento inesperado: '+start)
    return html[:b]+','+entries+html[b:]

def apply_new_characters_html(html):
    html=_replace_one(html,'const TYPES={\n','const TYPES={\n'+TYPE_LINES,'nove perfis')
    html=_replace_one(html,'const MAGICAL_ATTACKERS=new Set([','const MAGICAL_ATTACKERS=new Set([\'runesmith\',\'ashdruid\',\'voidweaver\',\'chronomancer\',\'phoenix\',','ataques mágicos')
    html=_extend_object(html,'const BASE_MOVE_SPEED={',MOVE)
    html=_extend_object(html,'const MAGIC_RESIST={',RESIST)
    html=_extend_object(html,'const SKILL_KINDS={',SKILL)
    html=_extend_object(html,'const TYPE_ROLES={',ROLES)
    html=_replace_one(html,"const PROJECTILES=new Set(['bow','hunter','toxic','spear','spark']);","const PROJECTILES=new Set(['bow','hunter','toxic','spear','spark','ironhunter','runesmith']);",'interceptação de projéteis')
    html=_replace_one(html,"const FRONTLINERS=new Set(['guard','golem','paladin','sentinel','earth','templar']);","const FRONTLINERS=new Set(['guard','golem','paladin','sentinel','earth','templar','standardbearer']);",'protetor de aliados')
    html=_replace_one(html,'function miniArt(type){',''+ART+'\nfunction miniArt(type){\n const newArt=newMiniatureArt(type);if(newArt)return newArt;','arte distinta')
    # O tabuleiro reserva o encaixe retrato integral apenas para antigos aprovados.
    # Incluir os 9 novos na mesma regra preserva diâmetro e espaçamento.
    html=_replace_one(
        html,
        "APPROVED_PORTRAITS[piece.type]?'portrait-frame':''",
        "(APPROVED_PORTRAITS[piece.type]||NEW_PORTRAIT_ORDER.includes(piece.type))?'portrait-frame':''",
        'mesmo tamanho no tabuleiro'
    )
    html=_replace_one(html,'function skillReady(actor,period){','function skillReady(actor,period){\n if(actor._silencedThisAction)return false;','silêncio real')
    html=_replace_one(html,'function performTurn(actor){',ABILITIES+'\nfunction performTurn(actor){','habilidade renascimento')
    html=_replace_one(html,'actor.strikes++;const type=actor.type;','actor.strikes++;const type=actor.type;'+ON_TURN,'habilidades no início')
    html=_replace_one(html,'let boost=1,skill=\'\';','let boost=1,skill=\'\';\n if(type===\'chameleon\'&&actor.hiddenActions>0){boost=1.65;skill=\'GOLPE CAMUFLADO\';actor.hiddenActions=0;}','golpe da camaleoa')
    html=_replace_one(html,'const {dmg,critical,kind}=effectDamage(actor,target,boost,skillAttack);','const {dmg,critical,kind}=effectDamage(actor,target,boost,skillAttack);'+ON_HIT,'nove habilidades distintas')
    html=_replace_one(html,'target.hp=Math.max(0,target.hp-healthLoss);','target.hp=Math.max(0,target.hp-healthLoss);tryPhoenixRebirth(target);','reviver dano direto')
    html=_replace_one(html,'target.hp-=dealt;','target.hp-=dealt;tryPhoenixRebirth(target);','reviver dano contínuo')
    html=_replace_one(html,'if(u.hiddenActions>0)score+=80;','if(u.hiddenActions>0)score+=80;','camuflagem') if False else html
    html=_replace_one(html,'return {unit:u,score};','if(u.hiddenActions>0)score+=80;\n  return {unit:u,score};','prioridade camuflagem')
    # Movimento e ações acelerados em ambos os motores (partida e simulador).
    original='actor.meter=Math.min(3.7,(actor.meter||0)+actor.speed*moveModifier);'
    if html.count(original)!=2: raise RuntimeError('Cronomante: dois relógios de ataque esperados')
    html=html.replace(original,'actor.meter=Math.min(3.7,(actor.meter||0)+actor.speed*moveModifier*(actor.hasteActions>0?1.18:1));')
    return html

def verify_new_characters_html(html):
    after=apply_new_characters_html(html)
    for name in NEW_TYPES:
        if after.count(name)<3:raise RuntimeError('Miniatura não integrada: '+name)
    for marker in ('tryPhoenixRebirth(target)','silencedActions','newMiniatureArt(type)','portrait-exact new-portrait','NEW_PORTRAIT_CROPS','NEW_PORTRAIT_ORDER.includes(piece.type)','actor.turretActions=3','actor.hasteActions>0?1.18:1'):
        if marker not in after:raise RuntimeError('Habilidade ausente: '+marker)
    counts=Counter()
    for _,(_,a,b) in NEW_TYPES.items():counts.update((a,b))
    if set(counts.values())!={3}:raise RuntimeError('Distribuição de clãs inválida')
    return True
