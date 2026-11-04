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
function newMiniatureArt(type){
 const paints={
  ironhunter:['#93674a','#d9a86d','#3d4756'],
  runesmith:['#3a8796','#7ce4ef','#264d65'],
  standardbearer:['#ab714e','#ffe09b','#445b75'],
  chameleon:['#3a7968','#b4edaa','#233d55'],
  ashdruid:['#8f5848','#ffab56','#41383c'],
  voidweaver:['#503766','#c9a2ef','#211f40'],
  chronomancer:['#477aaa','#e5cc8b','#344870'],
  duskinq:['#704e67','#f5c37f','#423547'],
  phoenix:['#e67431','#ffe68b','#aa352d']
 };
 const c=paints[type];if(!c)return null;
 const [robe,shine,shadow]=c;
 const outline=' stroke="#182539" stroke-width="2" stroke-linejoin="round"';
 const base='<path d="M11 55L13 37L20 33L36 33L44 39L48 55Z" fill="'+robe+'"'+outline+'/>'+
   '<path d="M21 33L27 39L34 33L36 55H19Z" fill="'+shadow+'" opacity=".78"/>'+
   '<ellipse cx="28" cy="24" rx="10" ry="11.5" fill="#d9ab8b"'+outline+'/>'+
   '<circle cx="24" cy="24" r="1.3" fill="#212837"/><circle cx="32" cy="24" r="1.3" fill="#212837"/>';
 let parts=base,gear='';
 if(type==='ironhunter'){
  parts+='<path d="M13 18L18 8L33 7L43 17L38 21L16 21Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M16 12L36 12" stroke="'+shine+'" stroke-width="3"/><path d="M26 8V19" stroke="'+shine+'" stroke-width="2"/>';
  gear='<path d="M45 51L46 6" stroke="#83603d" stroke-width="4"/>'+
   '<path d="M42 6L46 0L50 6L48 16L44 16Z" fill="#e0e9ec"/>'+
   '<path d="M4 49L12 40L21 48L18 55H8Z" fill="#a3aeb9" stroke="#304250" stroke-width="2"/>';
 }else if(type==='runesmith'){
  parts+='<path d="M14 21L18 9L40 9L43 22Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M14 20H42M27 8V18" stroke="'+shine+'" stroke-width="3"/>'+
   '<circle cx="28" cy="18" r="5" fill="none" stroke="'+shine+'" stroke-width="2"/>';
  gear='<path d="M44 51L47 17" stroke="#98837b" stroke-width="4"/>'+
   '<circle cx="47" cy="14" r="9" fill="#284a61" stroke="'+shine+'" stroke-width="3"/>'+
   '<path d="M47 7V21M40 14H54" stroke="'+shine+'" stroke-width="2"/>';
 }else if(type==='standardbearer'){
  parts+='<path d="M16 18L20 8L28 5L38 9L41 20H15Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M28 5V21M19 14H37" stroke="'+shine+'" stroke-width="2"/>';
  gear='<path d="M48 56V1" stroke="#f1e2b2" stroke-width="4"/>'+
   '<path d="M48 3Q32 8 37 28Q45 23 48 28Z" fill="#b85b3c" stroke="'+shine+'" stroke-width="1.6"/>'+
   '<path d="M6 36L17 31L23 38L19 52L7 49Z" fill="#a4bac9"'+outline+'/>';
 }else if(type==='chameleon'){
  parts+='<path d="M13 32Q10 5 28 7Q46 5 43 32L38 30Q38 15 28 15Q18 15 18 31Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M15 19L3 14L15 25M41 19L53 14L42 26" fill="'+robe+'"'+outline+'/>'+
   '<path d="M21 24H26M30 24H35" stroke="'+shine+'" stroke-width="3"/>';
  gear='<path d="M6 54L20 36L17 31L4 46Z" fill="'+shine+'"/>'+
    '<path d="M43 53L55 33L50 30L36 52Z" fill="#a5d8d0"/>';
 }else if(type==='ashdruid'){
  parts+='<path d="M11 32Q10 9 27 4Q47 8 45 32L38 31Q41 15 28 14Q16 15 18 31Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M18 12L10 4M34 11L44 2" stroke="'+shine+'" stroke-width="3"/>';
  gear='<path d="M47 56L44 15" stroke="#684732" stroke-width="4"/>'+
   '<path d="M46 5Q34 18 47 20Q56 18 54 8L51 1Z" fill="'+shine+'" stroke="#ffdf91" stroke-width="2"/>'+
   '<path d="M6 55Q7 39 13 34" fill="none" stroke="#ec864b" stroke-width="3"/>';
 }else if(type==='voidweaver'){
  parts+='<path d="M12 31Q9 8 27 4Q47 9 45 31L36 32Q39 13 27 15Q17 15 20 32Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M13 14L28 5L42 15M18 12L34 12" fill="none" stroke="'+shine+'" stroke-width="1.5"/>';
  gear='<circle cx="48" cy="23" r="11" fill="none" stroke="'+shine+'" stroke-width="1.8"/>'+
   '<path d="M39 15L57 31M39 31L57 15M48 12V34M37 23H59" stroke="'+shine+'" stroke-width="1.2"/>'+
   '<circle cx="48" cy="23" r="3" fill="#5c3a88"/>';
 }else if(type==='chronomancer'){
  parts+='<path d="M14 17L28 2L42 17Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M12 20Q28 14 44 20" fill="none" stroke="'+shine+'" stroke-width="4"/>';
  gear='<path d="M47 53V6" stroke="#89704e" stroke-width="4"/>'+
   '<path d="M42 8H54L47 18L54 28H42L49 18Z" fill="#f9e0ac" stroke="'+shadow+'" stroke-width="1.3"/>'+
   '<path d="M45 11H50M45 25H50" stroke="#7f90b9" stroke-width="1.5"/>';
 }else if(type==='duskinq'){
  parts+='<path d="M16 17L22 6L28 11L35 5L42 18Z" fill="'+shadow+'"'+outline+'/>'+
   '<path d="M28 11V21M21 15H35" stroke="'+shine+'" stroke-width="2"/>';
  gear='<path d="M47 52L47 9" stroke="#d6e3ec" stroke-width="3"/>'+
   '<path d="M37 16H56M43 16L39 27L47 27L43 16M51 16L47 27L55 27L51 16" fill="none" stroke="'+shine+'" stroke-width="2"/>'+
   '<path d="M6 53L18 34L22 39L14 56Z" fill="#d8c6e2"/>';
 }else if(type==='phoenix'){
  parts='<path d="M28 13Q7 1 2 19Q7 32 25 36L10 50Q25 49 28 55Q31 49 46 50L31 36Q49 32 55 19Q47 0 28 13Z" fill="'+robe+'" stroke="#8e382b" stroke-width="2"/>'+
   '<path d="M27 20Q4 10 6 24L25 36M29 20Q51 9 52 24L31 36" fill="'+shine+'" stroke="#ef932f" stroke-width="2"/>'+
   '<path d="M21 18L28 5L36 18L28 27Z" fill="#ffde78" stroke="#ad5230" stroke-width="2"/>'+
   '<circle cx="25" cy="22" r="1.6" fill="#3b2b34"/><circle cx="32" cy="22" r="1.6" fill="#3b2b34"/>'+
   '<path d="M27 27L28 33L34 27Z" fill="#f7d3a0"/>'+
   '<path d="M28 44Q20 52 27 57M31 44Q39 52 33 57" stroke="#8a342e" stroke-width="3" fill="none"/>';
 }
 return '<svg viewBox="0 0 58 58" class="mini-art mini-art-new" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+parts+gear+'</svg>';
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
    for marker in ('tryPhoenixRebirth(target)','silencedActions','newMiniatureArt(type)','actor.turretActions=3','actor.hasteActions>0?1.18:1'):
        if marker not in after:raise RuntimeError('Habilidade ausente: '+marker)
    counts=Counter()
    for _,(_,a,b) in NEW_TYPES.items():counts.update((a,b))
    if set(counts.values())!={3}:raise RuntimeError('Distribuição de clãs inválida')
    return True
