(function(){
'use strict';
const C=window.SigilsCore;
if(!C){console.error('Fenda: núcleo de campeões não carregado');return;}
const W=2750,H=1900,TAU=Math.PI*2;
// Um deslocamento base-a-base deve durar ~27–30 s, não 11–13 s como na v4.1.
const MOBA_WALK_SCALE=.55;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n}};
const SIDE=['#69e6e4','#ed829e'],HOME=[{x:205,y:1675},{x:2545,y:210}];
const PATHS=[
 [{x:230,y:1640},{x:235,y:1280},{x:235,y:790},{x:255,y:440},{x:435,y:248},{x:1090,y:245},{x:1770,y:245},{x:2470,y:235}],
 [{x:240,y:1645},{x:640,y:1360},{x:1070,y:1060},{x:1540,y:725},{x:2040,y:385},{x:2475,y:235}],
 [{x:240,y:1645},{x:780,y:1645},{x:1450,y:1645},{x:2050,y:1640},{x:2470,y:1510},{x:2480,y:1080},{x:2480,y:600},{x:2475,y:235}]
];
const roles={orun:0,nyra:1,lyria:2,seris:2,vexor:1};
const ITEMS=[
 {id:'lens',name:'Lente Astral',price:430,stat:'+13 dano',desc:'Ataques básicos mais fortes',icon:'◈'},
 {id:'ward',name:'Couraça Rúnica',price:510,stat:'+85 vida',desc:'Resistência nas trocas',icon:'⬡'},
 {id:'stride',name:'Botas do Vento',price:480,stat:'+17% velocidade',desc:'Movimento e reposicionamento',icon:'➤'},
 {id:'cell',name:'Catalisador Astral',price:500,stat:'+30 energia',desc:'Mais magias por luta',icon:'ϟ'},
 {id:'prism',name:'Prisma do Eco',price:680,stat:'+16 poder',desc:'Dano extra das habilidades',icon:'◇'},
 {id:'core',name:'Núcleo Ágil',price:620,stat:'-15% recarga',desc:'Habilidades disponíveis mais cedo',icon:'✦'}
];
const state={mode:'menu',time:0,w:W,h:H,camera:{x:0,y:0},units:[],structures:[],projectiles:[],
 effects:[],jungle:[],camps:[],obstacles:[],hero:null,focused:null,kills:[0,0],wave:0,nextWave:4,
 flash:0,score:0,marker:null,shopOpen:false,showPause:false,notice:'',noticeUntil:0,
 nextObjectives:50,buffUntil:0,win:null,selectedHero:'lyria',seq:0,sounds:true};
const rando=(a,b)=>a+Math.random()*(b-a),hData=id=>C.heroes[id],skillDef=id=>C.skills[id];
const living=(side,kind)=>state.units.filter(u=>u.hp>0&&(side==null||u.side===side)&&(!kind||u.kind===kind));
const maxEnergy=u=>100+(u.items||[]).filter(i=>i==='cell').length*30;
const attackRange=u=>u.kind==='minion'?(u.id==='siege'?235:u.ranged?150:34):u.kind==='creep'?45:
 (u.id==='orun'?65:u.id==='vexor'?68:u.id==='lyria'?315:u.id==='nyra'?300:280);
const moveSpeed=u=>u.speed*(1+(u.items||[]).filter(i=>i==='stride').length*.17)*(u.slow>0?.62:1);
const attackDamage=u=>u.atk+(u.items||[]).filter(i=>i==='lens').length*13;
const spellPower=u=>1+(u.items||[]).filter(i=>i==='prism').length*.19;
const levelXp=level=>42+level*24;
function pathPos(lane,t){
 const pts=PATHS[lane];let total=0;
 for(let j=0;j<pts.length-1;j++)total+=dist(pts[j],pts[j+1]);
 let left=clamp(t,0,1)*total;
 for(let j=0;j<pts.length-1;j++){
  const d=dist(pts[j],pts[j+1]);
  if(left<=d)return{x:pts[j].x+(pts[j+1].x-pts[j].x)*left/d,
   y:pts[j].y+(pts[j+1].y-pts[j].y)*left/d};
  left-=d;
 }
 return{...pts[pts.length-1]};
}
function buildMap(){
 state.structures=[];state.camps=[];state.obstacles=[];
 for(let side=0;side<2;side++){
  const base=HOME[side];
  state.structures.push({kind:'core',side,x:base.x,y:base.y,maxHp:1850,hp:1850,r:56,atk:53,range:220,attackCd:0,id:'core'+side});
  for(let lane=0;lane<3;lane++){
   // tier 1: externa, mais próxima do meio; tier 2: intermediária; tier 3: interna.
   // A ordem física precisa acompanhar a ordem de vulnerabilidade das torres.
   const fractions=side===0?[.40,.26,.12]:[.60,.74,.88];
   for(let i=0;i<fractions.length;i++){
    let p=pathPos(lane,fractions[i]),d=side===0?1:-1;
    // Torres da mesma equipe não ocupam exatamente o mesmo centro.
    p={x:p.x+d*(lane===1?18:0),y:p.y+(lane===1?20:lane===0?22:-22)};
    state.structures.push({kind:'tower',side,lane,tier:i+1,x:p.x,y:p.y,
      r:27,hp:side===0?880:880,maxHp:880,atk:58,range:205,attackCd:0,
      id:'tower'+side+'-'+lane+'-'+i});
   }
  }
 }
 state.camps=[
  {id:'veilA',x:870,y:610,kind:'buff',name:'Véu Azul',color:'#75caff',hp:630,maxHp:630,respawn:0,buff:'energy'},
  {id:'emberA',x:1700,y:1310,kind:'buff',name:'Brasa Rubra',color:'#ff9c74',hp:630,maxHp:630,respawn:0,buff:'damage'},
  {id:'wolvesA',x:930,y:1320,kind:'camp',name:'Lobos Astrais',color:'#a7c2ef',hp:360,maxHp:360,respawn:0},
  {id:'golemA',x:1730,y:620,kind:'camp',name:'Golem Sigilar',color:'#e5c58f',hp:450,maxHp:450,respawn:0},
  {id:'serpe',x:1570,y:1120,kind:'boss',name:'Serpe Astral',color:'#9bf6e9',hp:1750,maxHp:1750,respawn:0,unlock:55},
  {id:'titan',x:1170,y:650,kind:'boss',name:'Titã do Abismo',color:'#dfb1fa',hp:2300,maxHp:2300,respawn:0,unlock:110}
 ];
 // Pedras e árvores antigas são obstáculos reais, não apenas desenhos decorativos.
 // A floresta mantém corredores navegáveis entre as três rotas e os campos.
 let seed=14653;
 const rand=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646};
 const onRoad=(x,y,margin)=>{
  for(const pts of PATHS)for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],vx=b.x-a.x,vy=b.y-a.y;
   const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/(vx*vx+vy*vy),0,1);
   if(Math.hypot(a.x+vx*t-x,a.y+vy*t-y)<margin)return true;
  }
  return false;
 };
 for(let attempt=0;attempt<900&&state.obstacles.length<48;attempt++){
  const x=140+rand()*(W-280),y=135+rand()*(H-270);
  const r=22+rand()*21;
  if(onRoad(x,y,r+90)||HOME.some(h=>Math.hypot(h.x-x,h.y-y)<210)||
     state.camps.some(c=>Math.hypot(c.x-x,c.y-y)<r+115)||
     state.obstacles.some(o=>Math.hypot(o.x-x,o.y-y)<r+o.r+25))continue;
  state.obstacles.push({kind:rand()>.35?'tree':'rock',x,y,r,solid:true});
 }
 rebuildSolidIndex();
}
function makeHero(id,side,controlled=false){
 const h=hData(id),start=HOME[side],offset=side===0?1:-1;
 // O Núcleo é sólido; os campeões surgem na fonte, fora de sua hitbox.
 const mid=pathPos(1,.11),dir=norm(mid.x-HOME[0].x,mid.y-HOME[0].y);
 const d=side===0?dir:{x:-dir.x,y:-dir.y};
 const spawnOffset=95+(state.seq%3)*12;
 return {uid:++state.seq,kind:'hero',id,side,controlled,
 x:start.x+d.x*spawnOffset+rando(-11,11),
 y:start.y+d.y*spawnOffset+rando(-11,11),r:id==='orun'?23:19,speed:h.move*MOBA_WALK_SCALE,atk:h.damage*.82,
 baseHp:h.hp*1.3,maxHp:Math.round(h.hp*1.3),hp:Math.round(h.hp*1.3),
 energy:100,maxEnergy:100,level:1,xp:0,gold:controlled?550:350,items:[],
 lane:roles[id],waypoint:side===0?0:PATHS[roles[id]].length-1,attackCd:0,casting:null,
 cooldowns:Object.fromEntries([...h.skills,h.ultimate].map(k=>[k,0])),
 stun:0,slow:0,shield:0,guard:0,invuln:0,marked:0,attackAnim:0,
 vision:350,death:0,respawn:0,recall:0,lastDamage:0,focus:null,
 aiTimer:rando(.6,1.8),kills:0,deaths:0,cs:0,dash:null,
 healthRegen:1.3,homeBuff:0,botLane:roles[id],cs:0,focusTarget:null,focusUntil:0,isRanged:!['vexor','orun'].includes(id)};
}
function createMinion(side,lane,type=0,slot=0){
 const p=pathPos(lane,side===0?.035:.965),ranged=type>=1,siege=type===2;
 const wavePower=1+Math.min(1.45,state.time/680);
 let hp=Math.round((siege?340:ranged?117:165)*wavePower);
 return{uid:++state.seq,kind:'minion',id:siege?'siege':ranged?'caster':'guard',side,lane,
 x:p.x+rando(-9,9),y:p.y+rando(-9,9),r:siege?19:ranged?12:14,
 hp,maxHp:hp,atk:Math.round((siege?34:ranged?20:19)*wavePower),
 speed:siege?59:ranged?74:83,attackCd:rando(.1,.5),ranged,site:type,slot,
 pathIndex:side===0?0:PATHS[lane].length-1,focus:null,
 stun:0,slow:0,shield:0,invuln:0,attackAnim:0,death:0,lastDamage:0};
}
function start(hero='lyria'){
 state.mode='playing';state.time=0;state.units=[];state.projectiles=[];state.effects=[];
 state.selectedHero=C.heroes[hero]?hero:'lyria';state.hero=null;state.structures=[];
 state.kills=[0,0];state.win=null;state.marker=null;state.nextWave=5;state.wave=0;
 state.shopOpen=false;state.showPause=false;state.buffUntil=0;state.score=0;state.seq=0;
 buildMap();
 const ids=Object.keys(C.heroes);
 const blue=[state.selectedHero,...ids.filter(id=>id!==state.selectedHero)];
 for(let i=0;i<5;i++){
  const u=makeHero(blue[i],0,i===0);state.units.push(u);
  if(i===0)state.hero=u;
 }
 // Enemy team has the same five roles, in different positions.
 for(const id of ids)state.units.push(makeHero(id,1));
 state.hero.lane=roles[state.hero.id];
 state.camera={x:clamp(state.hero.x-400,0,W-800),y:clamp(state.hero.y-220,0,H-440)};
 announce('FENDA DOS SIGILOS · DESTRUA O NÚCLEO RUBRO',3.3);
 return state;
}
function announce(text,seconds=2.2){state.notice=text;state.noticeUntil=state.time+seconds}
function addEffect(x,y,color,r=35,life=.42,kind='wave'){
 state.effects.push({x,y,color,r,life,maxLife:life,kind});
 if(state.effects.length>160)state.effects.splice(0,state.effects.length-160);
}
function xpGain(hero,amount){
 if(!hero||hero.kind!=='hero'||hero.hp<=0)return;
 hero.xp+=amount;
 while(hero.level<12&&hero.xp>=levelXp(hero.level)){
  hero.xp-=levelXp(hero.level);hero.level++;
  hero.maxHp+=31;hero.hp=Math.min(hero.maxHp,hero.hp+28);
  hero.atk+=3;hero.energy=Math.min(maxEnergy(hero),hero.energy+17);
  if(hero.controlled)announce('NÍVEL '+hero.level+' · PODERES APRIMORADOS',2);
  addEffect(hero.x,hero.y,'#f9d987',85,.58);
 }
}
function grantNearbyXP(pos,team,amount){
 for(const h of living(team,'hero'))if(dist(h,pos)<450)xpGain(h,amount);
}
function onDeath(victim,source){
 victim.death=1;
 addEffect(victim.x,victim.y,victim.side===0?'#76e8dc':'#fe9ea8',52,.7,'burst');
 if(victim.kind==='hero'){
  victim.deaths++;victim.respawn=8+Math.round(victim.level*1.4);
  if(source&&(source.side===0||source.side===1)&&source.side!==victim.side){
   state.kills[source.side]++;
   if(source.kind==='hero'){source.kills++;source.gold+=210;xpGain(source,90);}
  }
  if(victim.controlled)announce('VOCÊ FOI ELIMINADO · RESSURGINDO...',3);
 }else if(victim.kind==='minion'){
  if(source&&source.side!==victim.side){
   const g=source.kind==='hero'?(victim.id==='siege'?80:34):0;
   if(g){source.gold+=g;source.cs=(source.cs||0)+1;if(source.controlled)state.score+=g}
   grantNearbyXP(victim,victim.side===0?1:0,victim.id==='siege'?28:15);
  }
 }else if(victim.kind==='creep'){
  if(source&&source.kind==='hero'){
   source.gold+=victim.boss?170:75;xpGain(source,victim.boss?95:38);
   if(victim.boss){
    for(const u of living(source.side,'hero')){u.guard=24;u.homeBuff=state.time+75;}
    announce('OBJETIVO CONQUISTADO · BÊNÇÃO SIGILAR!',4);
   }else if(victim.buff==='energy'){source.energy=maxEnergy(source);source.homeBuff=state.time+75;}
   else if(victim.buff==='damage')source.homeBuff=state.time+75;
  }
 }
}
function damage(victim,amount,source=null){
 if(!victim||victim.hp<=0||state.mode!=='playing')return 0;
 if(victim.invuln>0)return 0;
 // Para avançar rumo ao núcleo, conquiste uma rota e derrube seus obeliscos em ordem.
 if(victim.kind==='tower'&&victim.tier>1&&
    state.structures.some(t=>t.kind==='tower'&&t.side===victim.side&&t.lane===victim.lane&&t.tier<victim.tier&&t.hp>0)){
  addEffect(victim.x,victim.y,'#d8e1ba',victim.r+14,.20);return 0;
 }
 if(victim.kind==='core'&&!Array.from({length:3},(_,lane)=>lane).some(lane=>
    state.structures.filter(t=>t.kind==='tower'&&t.side===victim.side&&t.lane===lane)
      .every(t=>t.hp<=0))){
  addEffect(victim.x,victim.y,'#d8e1ba',victim.r+18,.23);return 0;
 }
 let raw=Math.max(1,amount);
 if(victim.shield>0){const absorbed=Math.min(victim.shield,raw);victim.shield-=absorbed;raw-=absorbed;}
 if(victim.guard>0){const ab=Math.min(victim.guard,raw);victim.guard-=ab;raw-=ab;}
 if(raw<=0){addEffect(victim.x,victim.y,'#a8d8fe',23,.22);return 0}
 const dmg=Math.max(1,Math.round(raw));
 if(state.camps.includes(victim)){damageCreep(victim,dmg,source);return dmg}
 victim.hp=Math.max(0,victim.hp-dmg);victim.lastDamage=state.time;
 if(victim.kind==='tower'||victim.kind==='core'){
  addEffect(victim.x,victim.y,victim.side===0?'#7cf9d9':'#ffd696',victim.r+10,.29);
  if(source&&source.controlled){
   announce('OBELISCO: -'+dmg+' PV · '+Math.ceil(victim.hp)+' RESTANTES',.85);
   state.effects.push({x:victim.x,y:victim.y-victim.r-15,r:20,
    value:dmg,color:'#ffe7a4',life:1.0,maxLife:1.0,kind:'damageNumber'});
  }
 }
 victim.lastAttacker=source||null;
 if(source&&source.kind==='hero'&&victim.kind==='hero'&&source.side!==victim.side){
  // Aggro dos obeliscos: atacar um campeão debaixo da torre muda o alvo para o agressor.
  for(const tower of state.structures){
   if(tower.hp>0&&tower.side===victim.side&&dist(source,tower)<tower.range+source.r){
    tower.aggroTarget=source;tower.aggroUntil=state.time+2.5;
   }
  }
 }
 if(victim.recall)victim.recall=0;
 if(victim.casting&&victim.kind==='hero'&&victim.stun>0)victim.casting=null;
 addEffect(victim.x,victim.y,'#f4b5b9',12,.15,'hit');
 if(victim.hp<=0){
  if(victim.kind==='tower'||victim.kind==='core'){
   addEffect(victim.x,victim.y,'#ffd894',105,.95,'burst');
   if(victim.kind==='tower'){
    announce('OBELISCO SIGILAR DESTRUÍDO',2.2);
    if(source&&source.side!==victim.side){
     for(const h of living(source.side,'hero')){h.gold+=125;xpGain(h,42);}
    }
   }else end(victim.side===1?0:1);
  }else onDeath(victim,source);
 }
 return dmg;
}
function grantShield(target,amount,seconds=3){
 if(!target||target.hp<=0)return 0;
 target.shield=Math.max(target.shield||0,Math.round(amount));
 target.shieldUntil=Math.max(target.shieldUntil||0,state.time+seconds);
 addEffect(target.x,target.y,'#9ec5fa',target.r+11,.34);
 return target.shield;
}
function heal(target,amount){
 if(!target||target.hp<=0)return 0;
 const v=Math.max(0,Math.round(Math.min(amount,target.maxHp-target.hp)));
 target.hp+=v;if(v)addEffect(target.x,target.y,'#97f6c0',24,.38);
 return v;
}
function end(winner){
 state.mode='ended';state.win=winner;
 announce(winner===0?'VITÓRIA! NÚCLEO RUBRO DESTRUÍDO':'DERROTA! NÚCLEO AZUL DESTRUÍDO',100);
 return winner;
}
function nearestEnemy(u,range=Infinity,includeStructures=false){
 const team=u.side;
 const targets=living(1-team).filter(e=>dist(u,e)<=range+e.r);
 if(includeStructures)targets.push(...state.structures.filter(t=>t.side!==team&&t.hp>0&&structureExposed(t)&&dist(u,t)<=range+t.r));
 targets.sort((a,b)=>{
  let v=dist(u,a)-dist(u,b);
  if(a.kind==='hero')v-=22;if(b.kind==='hero')v+=22;
  if(a.kind==='minion')v+=10;if(b.kind==='minion')v-=10;
  return v;
 });
 return targets[0]||null;
}
function enemyCreep(u,range=Infinity){
 return state.camps.filter(c=>c.hp>0&&(!c.unlock||state.time>=c.unlock)&&dist(u,c)<range+27)
   .sort((a,b)=>dist(u,a)-dist(u,b))[0]||null;
}
function laneCleared(side,lane){
 return state.structures.every(t=>t.kind!=='tower'||t.side!==side||t.lane!==lane||t.hp<=0);
}
function structureExposed(t){
 if(t.kind==='core')return [0,1,2].some(lane=>laneCleared(t.side,lane));
 if(t.kind!=='tower')return true;
 return state.structures.every(o=>o.kind!=='tower'||o.side!==t.side||o.lane!==t.lane||
  o.tier>=t.tier||o.hp<=0);
}
// Tropas priorizam objetivos de sua rota quando os minions inimigos não estão no alcance.
function laneTarget(u,range){
 const side=1-u.side,lane=u.lane;
 const nearby=(v)=>v&&v.hp>0&&dist(u,v)<=range+v.r;
 const minions=living(side,'minion')
  .filter(v=>v.lane===lane&&nearby(v)).sort((a,b)=>dist(u,a)-dist(u,b));
 if(minions.length)return minions[0];
 const structures=state.structures.filter(t=>t.side===side&&t.hp>0&&
   (t.kind==='core'&&laneCleared(side,lane)||t.kind==='tower'&&t.lane===lane&&structureExposed(t))&&nearby(t))
  .sort((a,b)=>(a.kind==='tower'?0:1)-(b.kind==='tower'?0:1)||dist(u,a)-dist(u,b));
 if(structures.length)return structures[0];
 const attackers=living(side,'hero').filter(nearby)
  .sort((a,b)=>dist(u,a)-dist(u,b));
 if(attackers.length)return attackers[0];
 return living(side,'minion').filter(nearby).sort((a,b)=>dist(u,a)-dist(u,b))[0]||null;
}
function findAA(u){
 if(!u||u.hp<=0)return null;
 const range=attackRange(u);
 // Seleção explícita de torre mantém o foco do AA durante o cerco.
 const chosen=u.controlled&&u.focusTarget&&u.focusUntil>state.time?u.focusTarget:null;
 if(chosen&&chosen.hp>0&&chosen.side!==u.side&&dist(chosen,u)<=range+chosen.r+2&&
     (chosen.kind!=='tower'&&chosen.kind!=='core'||structureExposed(chosen)))return chosen;
 const target=u.kind==='minion'?laneTarget(u,range):nearestEnemy(u,range,true);
 if(target)return target;
 if(u.controlled)return enemyCreep(u,range);
 return null;
}
function focusTower(u,requested=null){
 if(!u||u.kind!=='hero'||u.hp<=0)return {ok:false,reason:'CAMPEÃO INDISPONÍVEL'};
 const towers=state.structures.filter(t=>t.side!==u.side&&t.hp>0&&
  (t.kind==='tower'||t.kind==='core')&&dist(u,t)<=attackRange(u)+t.r+2)
  .sort((a,b)=>dist(a,u)-dist(b,u));
 if(requested&&!towers.includes(requested))return {ok:false,reason:'TORRE FORA DO ALCANCE DO AA'};
 const t=requested||towers[0];
 if(!t)return {ok:false,reason:'TORRE FORA DO ALCANCE DO AA'};
 if(!structureExposed(t))return {ok:false,reason:t.kind==='core'?
  'NÚCLEO PROTEGIDO: DESTRUA OS OBELISCOS DE UMA ROTA':
  'OBELISCO PROTEGIDO: DESTRUA A TORRE EXTERNA PRIMEIRO'};
 u.focusTarget=t;u.focusUntil=state.time+5;
 const attack=autoAttack(u);
 return {ok:true,attacked:attack,tower:t};
}
function missile(source,target,damageValue,kind='aa',speed=410){
 if(!source||!target)return;
 state.projectiles.push({x:source.x,y:source.y,source,target,side:source.side,
  damage:damageValue,speed,kind,r:kind==='skill'?9:5,life:7,color:source.side===0?'#8af4e2':'#ff91b0'});
}
function autoAttack(u){
 if(u.hp<=0||u.attackCd>0||u.casting||u.stun>0)return false;
 const target=findAA(u);if(!target)return false;
 if(u.recall>0){u.recall=0;if(u.controlled)announce('RETORNO CANCELADO: ATAQUE',1.2)}
 const attackFactor=u.kind!=='hero'?1:u.id==='vexor'?1.15:u.id==='lyria'?1.10:
  u.id==='orun'?1.06:u.id==='nyra'?.96:1.04;
 u.attackCd=u.kind==='hero'?(hData(u.id).attackTime*attackFactor+Math.max(0,5-u.level)*.018):u.id==='siege'?2.15:u.ranged?1.5:1.25;
 u.attackAnim=.23;
 let damageVal=attackDamage(u)+(u.homeBuff>state.time?4:0);
 // Minions limpam ondas de forma consistente, sem congestionamentos infinitos.
 if(u.kind==='minion'&&target.kind==='minion')damageVal=Math.round(damageVal*1.25);
 // Os AAs de campeões devem causar dano perceptível em torres;
 // sentinelas de cerco também possuem bônus contra estruturas.
 if(target.kind==='tower'||target.kind==='core')
  damageVal=Math.round(damageVal*(u.kind==='hero'?1.60:u.id==='siege'?1.45:1.0));
 if(u.controlled&&(target.kind==='tower'||target.kind==='core'))u.focusUntil=state.time+5;
 if(attackRange(u)<=75){
  damage(target,damageVal,u);addEffect(target.x,target.y,u.side===0?'#84ead9':'#f7a3b0',25,.24);
 }else missile(u,target,damageVal,'aa',u.kind==='hero'?530:380);
 return true;
}
function chooseEnemyForStructure(t){
 const aggro=t.aggroTarget;
 if(aggro&&aggro.hp>0&&state.time<(t.aggroUntil||0)&&
     dist(t,aggro)<t.range+aggro.r)return aggro;
 t.aggroTarget=null;
 const enemies=living(1-t.side);
 const inRange=enemies.filter(u=>dist(u,t)<t.range+u.r);
 const minions=inRange.filter(u=>u.kind==='minion');
 if(minions.length)minions.sort((a,b)=>dist(a,t)-dist(b,t));
 const champions=inRange.filter(u=>u.kind==='hero').sort((a,b)=>dist(a,t)-dist(b,t));
 return minions[0]||champions[0]||null;
}
function structureStep(dt){
 for(const t of state.structures){
  if(t.hp<=0)continue;
  t.attackCd=Math.max(0,t.attackCd-dt);
  if(t.attackCd>0)continue;
  const target=chooseEnemyForStructure(t);
  if(target){
   const damageVal=t.kind==='core'?56:65;
   missile(t,target,damageVal,t.kind==='core'?'core':'tower',470);
   t.attackCd=t.kind==='core'?1.08:1.2;
   addEffect(t.x,t.y,t.side===0?'#82e8ef':'#f3a4b6',t.r+12,.25);
  }
 }
}
// Sistema físico: obeliscos/Núcleos, árvores, pedras e monstros possuem hitboxes.
// Minions/campeões usam separação SUAVE, evitando empilhamento sem provocar creepblock rígido.
// Índice estático: consulta apenas objetos próximos ao personagem.
const SOLID_CELL=165;
let solidGrid=new Map();
function solidKey(x,y){return x+','+y}
function rebuildSolidIndex(){
 solidGrid=new Map();
 const all=[...state.structures,...state.obstacles,...state.camps];
 for(const body of all){
  const radius=body.kind==='core'?55:body.kind==='tower'?27:
    body.kind==='boss'?38:body.kind==='buff'?28:body.kind==='camp'?23:body.r||22;
  const minX=Math.floor((body.x-radius)/SOLID_CELL),maxX=Math.floor((body.x+radius)/SOLID_CELL);
  const minY=Math.floor((body.y-radius)/SOLID_CELL),maxY=Math.floor((body.y+radius)/SOLID_CELL);
  for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
   const k=solidKey(x,y);
   if(!solidGrid.has(k))solidGrid.set(k,[]);
   solidGrid.get(k).push(body);
  }
 }
}
function aliveSolid(o){
 return (o.hp===undefined||o.hp>0)&&(!o.unlock||state.time>=o.unlock);
}
function nearSolids(x,y,radius=95){
 const minX=Math.floor((x-radius)/SOLID_CELL),maxX=Math.floor((x+radius)/SOLID_CELL);
 const minY=Math.floor((y-radius)/SOLID_CELL),maxY=Math.floor((y+radius)/SOLID_CELL);
 const result=[],seen=new Set();
 for(let cx=minX;cx<=maxX;cx++)for(let cy=minY;cy<=maxY;cy++){
  for(const body of solidGrid.get(solidKey(cx,cy))||[]){
   if(!seen.has(body)&&aliveSolid(body)){
    seen.add(body);
    if(Math.abs(body.x-x)<radius+solidRadius(body)&&
       Math.abs(body.y-y)<radius+solidRadius(body))result.push(body);
   }
  }
 }
 return result;
}
function solidBodies(){
 return [...state.structures,...state.obstacles,...state.camps].filter(aliveSolid);
}
function solidRadius(o){
 if(o.kind==='core')return 55;
 if(o.kind==='tower')return 27;
 if(o.kind==='boss')return 38;
 if(o.kind==='buff')return 28;
 if(o.kind==='camp')return 23;
 return o.r||22;
}
function pushOutsideSolids(u,obstacles=nearSolids(u.x,u.y,(u.r||18)+83)){
 const R=u.r||18;
 for(let loop=0;loop<2;loop++){
  let changed=false;
  for(const obstacle of obstacles){
   const radius=R+solidRadius(obstacle)+1;
   const dx=u.x-obstacle.x,dy=u.y-obstacle.y;
   if(Math.abs(dx)>=radius||Math.abs(dy)>=radius)continue;
   const d2=dx*dx+dy*dy;
   if(d2>=radius*radius)continue;
   const distance=Math.sqrt(d2),dir=distance>.001?
    {x:dx/distance,y:dy/distance}:
    {x:Math.cos((u.uid||1)*2.4),y:Math.sin((u.uid||1)*2.4)};
   u.x=clamp(obstacle.x+dir.x*radius,30,W-30);
   u.y=clamp(obstacle.y+dir.y*radius,30,H-30);
   changed=true;
  }
  if(!changed)break;
 }
}
// Segmentado também para investidas: impede atravessar uma torre num frame longo.
function movePhysical(u,dx,dy,obstacles=nearSolids(u.x,u.y,(u.r||18)+Math.hypot(dx,dy)+80)){
 const distance=Math.hypot(dx,dy);
 if(distance<.001)return false;
 const x0=u.x,y0=u.y;
 const pieces=Math.max(1,Math.ceil(distance/9));
 for(let i=0;i<pieces;i++){
  u.x=clamp(u.x+dx/pieces,30,W-30);
  u.y=clamp(u.y+dy/pieces,30,H-30);
  pushOutsideSolids(u,obstacles);
 }
 return Math.hypot(u.x-x0,u.y-y0)>.2;
}
// IA contorna obstáculos grandes em vez de tentar atravessá-los eternamente.
function steerAround(u,dir,goal,solids){
 if(!goal||Math.hypot(goal.x-u.x,goal.y-u.y)<8)return dir;
 let best=null,score=Infinity;
 for(const o of solids){
  const relX=o.x-u.x,relY=o.y-u.y;
  const forward=relX*dir.x+relY*dir.y;
  const required=(u.r||18)+solidRadius(o)+11;
  if(forward<0||forward>required+55)continue;
  if(dist(goal,o)<required+3&&goal.kind==='tower')continue; // Ataque direto a torre, quando ela é o alvo. 
  const lateral=relX*dir.y-relY*dir.x;
  const a=Math.abs(lateral);
  if(a>=required)continue;
  const danger=forward+a*.15;
  if(danger<score){score=danger;best={o,lateral,required}}
 }
 if(!best)return dir;
 const side=Math.abs(best.lateral)>2?(best.lateral>0?1:-1):((u.uid||0)%2?1:-1);
 // Desviar para o lado OPOSTO ao obstáculo (a orientação antiga estava invertida).
 const tangent={x:-dir.y*side,y:dir.x*side};
 const push=1.15+clamp((best.required-Math.abs(best.lateral))/best.required,0,1)*.55;
 return norm(dir.x+tangent.x*push,dir.y+tangent.y*push);
}
// Grade espacial de 80 px: evita comparações quadráticas de todos os minions.
function separateUnits(){
 const units=state.units.filter(u=>u.hp>0);
 const size=78,grid=new Map(),key=(x,y)=>x+','+y;
 for(const u of units){
  const cx=Math.floor(u.x/size),cy=Math.floor(u.y/size);
  u._cellX=cx;u._cellY=cy;
  const k=key(cx,cy);if(!grid.has(k))grid.set(k,[]);
  grid.get(k).push(u);
 }
 for(const u of units){
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
   const others=grid.get(key(u._cellX+ox,u._cellY+oy));
   if(!others)continue;
   for(const v of others){
    if(v.uid<=u.uid)continue;
    const padding=u.side===v.side?2:4;
    const minDist=Math.max(9,u.r+v.r-padding);
    const dx=v.x-u.x,dy=v.y-u.y;
    if(Math.abs(dx)>=minDist||Math.abs(dy)>=minDist)continue;
    const d2=dx*dx+dy*dy;
    if(d2>=minDist*minDist)continue;
    const d=Math.sqrt(d2);
    const dir=d>.001?{x:dx/d,y:dy/d}:{x:Math.cos(v.uid*2.1),y:Math.sin(v.uid*2.1)};
    const strength=Math.min(12,(minDist-d)*.72);
    const uMass=u.kind==='hero'?2.8:1,vMass=v.kind==='hero'?2.8:1;
    const total=uMass+vMass;
    const amountU=strength*vMass/total,amountV=strength*uMass/total;
    u.x=clamp(u.x-dir.x*amountU,30,W-30);
    u.y=clamp(u.y-dir.y*amountU,30,H-30);
    v.x=clamp(v.x+dir.x*amountV,30,W-30);
    v.y=clamp(v.y+dir.y*amountV,30,H-30);
   }
  }
 }
 for(const u of units)pushOutsideSolids(u);
}
function moveToward(u,p,dt,speedFactor=1){
 const dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy);
 if(d<4)return true;
 const step=Math.min(d,moveSpeed(u)*dt*speedFactor);
 const solids=nearSolids(u.x,u.y,(u.r||18)+100);
 const dir=steerAround(u,{x:dx/d,y:dy/d},p,solids);
 movePhysical(u,dir.x*step,dir.y*step,solids);
 u.facing=Math.atan2(dir.y,dir.x);
 return dist(u,p)<Math.max(9,step+7);
}
function moveMinion(m,dt){
 if(m.stun>0)return;
 m.senseTimer=(m.senseTimer||0)-dt;
 if(m.senseTimer<=0||(m.aiEnemy&&(m.aiEnemy.hp<=0||dist(m,m.aiEnemy)>360))){
  m.aiEnemy=laneTarget(m,m.ranged?235:145);
  m.senseTimer=.14+(m.uid%6)*.017;
 }
 const enemy=m.aiEnemy;
 if(enemy){
  if(dist(m,enemy)>attackRange(m)+enemy.r)moveToward(m,enemy,dt);
  return;
 }
 const points=PATHS[m.lane],next=m.pathIndex+(m.side===0?1:-1);
 if(next>=0&&next<points.length){
  const previous=points[m.pathIndex],dest=points[next];
  const facing=norm(dest.x-previous.x,dest.y-previous.y);
  const offset=(m.slot-1.5)*14;
  const target={x:dest.x-facing.y*offset,y:dest.y+facing.x*offset};
  if(moveToward(m,target,dt))m.pathIndex=next;
 }else moveToward(m,HOME[1-m.side],dt);
}
function respawn(u){
 const home=HOME[u.side];
 const mid=pathPos(1,.11),dir=norm(mid.x-HOME[0].x,mid.y-HOME[0].y);
 const d=u.side===0?dir:{x:-dir.x,y:-dir.y};
 u.x=home.x+d.x*104+rando(-10,10);u.y=home.y+d.y*104+rando(-10,10);
 u.hp=u.maxHp;u.energy=maxEnergy(u);u.shield=0;u.shieldUntil=0;
 if(!u.controlled)botShop(u);u.guard=0;u.casting=null;
 u.attackCd=0;u.stun=0;u.slow=0;u.dash=null;u.recall=0;
 u.death=0;u.respawn=0;u.focus=null;u.aiTimer=.5;
 addEffect(u.x,u.y,u.side===0?'#82f0e1':'#f8aac3',85,.62);
}
function botShop(u){
 if(u.controlled||u.hp<=0||u.items.length>=6||dist(u,HOME[u.side])>200)return;
 const role=u.id;
 const priority=role==='orun'?['ward','stride','core','lens','cell','prism']:
  role==='seris'?['cell','core','ward','stride','prism','lens']:
  role==='lyria'?['lens','stride','prism','core','ward','cell']:
  role==='nyra'?['prism','core','cell','ward','lens','stride']:
  ['stride','lens','ward','prism','core','cell'];
 const item=priority.map(id=>ITEMS.find(i=>i.id===id)).find(i=>i&&!u.items.includes(i.id)&&u.gold>=i.price);
 if(!item)return;
 u.items.push(item.id);u.gold-=item.price;
 if(item.id==='ward'){u.maxHp+=85;u.hp+=85}
 if(item.id==='cell'){u.maxEnergy=maxEnergy(u);u.energy=Math.min(maxEnergy(u),u.energy+30)}
}
function botUseSkill(u,target){
 if(!u||u.stun>0||u.casting||u.dash||u.aiTimer>0)return false;
 const kit=hData(u.id),friendlies=living(u.side,'hero'),enemies=living(1-u.side,'hero');
 const ready=id=>id&&u.cooldowns[id]<=.01&&u.energy>=skillDef(id).cost&&
   (!skillDef(id).ultimate||u.level>=5);
 const r=dist(u,target),nearEnemies=enemies.filter(e=>dist(e,u)<240).length;
 const wounded=friendlies.filter(a=>dist(a,u)<295&&a.hp/a.maxHp<.74)
  .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 const clusters=enemies.filter(e=>dist(e,target)<132).length;
 let options=[];
 if(u.id==='seris'){
  if(ready('seris_ult')&&friendlies.filter(f=>dist(f,u)<190&&f.hp/f.maxHp<.62).length>=2)options.push('seris_ult');
  if(ready('seris_bloom')&&wounded)options.push('seris_bloom');
  if(ready('seris_aegis')&&(nearEnemies>0||wounded))options.push('seris_aegis');
  if(r<275)options.push('seris_tether');
 }else if(u.id==='orun'){
  if(ready('orun_ult')&&nearEnemies>=2)options.push('orun_ult');
  if(ready('orun_guard')&&u.hp/u.maxHp<.7)options.push('orun_guard');
  if(r<130||nearEnemies>=2)options.push('orun_quake');
  if(r>70&&r<200)options.push('orun_charge');
 }else if(u.id==='vexor'){
  if(ready('vexor_ult')&&target.hp/target.maxHp<.52&&r<225)options.push('vexor_ult');
  if(r<230&&target.kind==='hero'&&!target.marked)options.push('vexor_mark');
  if(r<115)options.push('vexor_whirl');
  if(r>72&&r<190)options.push('vexor_lunge');
 }else if(u.id==='lyria'){
  if(r<105)options.push('lyria_step');
  if(ready('lyria_ult')&&clusters>=2&&r<355)options.push('lyria_ult');
  if(r<330&&clusters>=2)options.push('lyria_rain');
  if(r<420)options.push('lyria_pierce');
 }else if(u.id==='nyra'){
  if(ready('nyra_ult')&&clusters>=2&&r<330)options.push('nyra_ult');
  if(u.hp/u.maxHp<.55)options.push('nyra_barrier');
  if(r<270&&clusters>=2)options.push('nyra_rift');
  if(r<390)options.push('nyra_bolt');
 }
 options=options.filter(ready);
 if(!options.length)return false;
 const id=options[0],beneficiary=id==='seris_bloom'?wounded:target;
 if(cast(u,id,null,beneficiary)){
  u.aiTimer=1.65+(u.uid%5)*.13;
  return true;
 }
 return false;
}
function botHero(u,dt){
 botShop(u);
 if(u.stun>0||u.casting||u.dash)return;
 const lane=u.lane,enemySide=1-u.side;
 const allies=living(u.side,'minion').filter(m=>m.lane===lane&&dist(m,u)<450);
 const friendlyWave=allies.sort((a,b)=>dist(a,HOME[enemySide])-dist(b,HOME[enemySide]))[0]||null;
 const behindTower=state.structures.filter(t=>t.side===u.side&&t.kind==='tower'&&
   t.hp>0&&t.lane===lane&&dist(t,u)<410);
 const threatened=behindTower.map(t=>({
  tower:t,attacker:t.lastAttacker,
  underAttack:state.time-(t.lastDamage||-100)<4.2
 })).find(x=>x.underAttack&&x.attacker&&x.attacker.hp>0&&x.attacker.side===enemySide);
 if(u.hp/u.maxHp<.26&&dist(u,HOME[u.side])>160)u.aiRetreat=true;
 if(u.aiRetreat){
  moveToward(u,HOME[u.side],dt);
  if(dist(u,HOME[u.side])<120){
   u.aiRetreat=false;heal(u,u.maxHp*.56);u.energy=maxEnergy(u);
   botShop(u);
  }
  return;
 }
 const enemyHeroes=living(enemySide,'hero')
  .filter(e=>dist(e,u)<340).sort((a,b)=>dist(u,a)-dist(u,b));
 const enemyWave=living(enemySide,'minion')
  .filter(e=>e.lane===lane&&dist(e,u)<350).sort((a,b)=>dist(u,a)-dist(u,b));
 const objective=state.structures.filter(t=>t.side===enemySide&&t.hp>0&&
  (t.kind==='tower'&&t.lane===lane||t.kind==='core'&&laneCleared(enemySide,lane))&&structureExposed(t))
  .sort((a,b)=>dist(u,a)-dist(u,b))[0];
 const hasWave=friendlyWave&&dist(friendlyWave,u)<260;
 const enemyNear=enemyHeroes[0];
 let target=null;
 // Foco defensivo quando uma torre da própria rota precisa de ajuda.
 if(threatened&&dist(u,threatened.attacker)<405)target=threatened.attacker;
 // Equipe entra em combate se um inimigo estiver perto o suficiente.
 else if(enemyNear&&dist(u,enemyNear)<attackRange(u)+85)target=enemyNear;
 // Farmar tropas e escoltar as sentinelas é mais importante do que perseguição longa.
 else if(enemyWave.length)target=enemyWave[0];
 else if(objective&&dist(u,objective)<390&&hasWave)target=objective;
 else if(enemyNear&&dist(u,enemyNear)<240)target=enemyNear;
 // Espera o avanço da onda ao invés de avançar sozinho sob um obelisco inimigo.
 const enemyTower=state.structures.find(t=>t.side===enemySide&&t.kind==='tower'&&
  t.hp>0&&dist(t,u)<t.range+95);
 if(enemyTower&&!hasWave&&dist(u,enemyTower)<enemyTower.range+u.r+12){
  const vec=norm(u.x-enemyTower.x,u.y-enemyTower.y);
  moveToward(u,{x:u.x+vec.x*125,y:u.y+vec.y*125},dt,.78);
  return;
 }
 if(target){
  const d=dist(u,target),ideal=attackRange(u);
  if(d>ideal*.78+target.r)moveToward(u,target,dt,.89);
  else if(u.isRanged&&target.kind==='hero'&&d<ideal*.45){
   const vec=norm(u.x-target.x,u.y-target.y);
   moveToward(u,{x:u.x+vec.x*105,y:u.y+vec.y*105},dt,.72);
  }
  if(target.kind==='hero'||target.kind==='minion'){
   if(!u.casting)botUseSkill(u,target);
  }
  return;
 }
 const path=PATHS[lane];
 let anchor=pathPos(lane,u.side===0?.40:.60);
 if(friendlyWave)anchor={x:friendlyWave.x,y:friendlyWave.y};
 else if(objective){
  // Sem tropas, reagrupa junto à última torre aliada ou à frente do próprio santuário.
  const lastTower=state.structures.filter(t=>t.side===u.side&&t.kind==='tower'&&
   t.hp>0&&t.lane===lane).sort((a,b)=>dist(a,objective)-dist(b,objective))[0];
  if(lastTower)anchor={x:lastTower.x,y:lastTower.y};
 }
 if(dist(u,anchor)>110)moveToward(u,anchor,dt,.74);
}
function jungleStep(dt){
 for(const c of state.camps){
  if(c.hp<=0){
   c.respawn=Math.max(0,c.respawn-dt);
   if(c.respawn<=0){c.hp=c.maxHp;addEffect(c.x,c.y,c.color,55,.55)}
   continue;
  }
  if(c.unlock&&state.time<c.unlock)continue;
  if(!c.attackCd)c.attackCd=1;
  c.attackCd-=dt;
  if(c.attackCd<=0){
   const heroesNear=living(null,'hero').filter(u=>dist(u,c)<100);
   if(heroesNear.length){
    const closest=heroesNear.sort((a,b)=>dist(a,c)-dist(b,c))[0];
    damage(closest,c.kind==='boss'?24:12,c);
   }
   c.attackCd=c.kind==='boss'?1.7:2.3;
  }
 }
}
function damageCreep(c,amount,source){
 if(!c||c.hp<=0||c.unlock&&state.time<c.unlock)return;
 c.hp=Math.max(0,c.hp-amount);
 addEffect(c.x,c.y,c.color,17,.21);
 if(c.hp<=0){
  c.respawn=c.kind==='boss'?125:78;
  c.boss=c.kind==='boss';
  c.kind='creep'; // Reward logic only needs kind / buff.
  onDeath(c,source);
  // Do not transform the camp permanently: keep its original classification.
  c.kind=c.boss?'boss':c.buff?'buff':'camp';
 }
}
function cast(u,id,aim=null,autoTarget=null){
 if(!u||u.hp<=0||state.mode!=='playing')return false;
 if(![...hData(u.id).skills,hData(u.id).ultimate].includes(id))return false;
 const def=skillDef(id);
 if(u.casting||u.dash||u.cooldowns[id]>0||u.energy<def.cost||u.stun>0)return false;
 if(def.ultimate&&u.level<5)return false;
 const target=autoTarget||((def.aim==='self')?u:nearestEnemy(u,def.range||350,false));
 const dx=aim?.x??(target?target.x-u.x:1),dy=aim?.y??(target?target.y-u.y:0);
 const dir=norm(id==='lyria_step'&&!aim&&target&&target.kind==='hero'&&dist(u,target)<100?-dx:dx,
  id==='lyria_step'&&!aim&&target&&target.kind==='hero'&&dist(u,target)<100?-dy:dy),range=def.range||140;
 const travel=clamp(aim?.distance??(target?dist(u,target):range),0,range);
 let center={x:u.x+dir.x*travel,y:u.y+dir.y*travel};
 if(id==='seris_bloom'&&!aim){
  const wounded=living(u.side,'hero').filter(h=>dist(h,u)<range).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(wounded)center={x:wounded.x,y:wounded.y};
 }
 const maxLv=id===hData(u.id).ultimate?Math.min(3,1+Math.floor((u.level-5)/3)):Math.min(5,1+Math.floor((u.level-1)/2));
 const haste=(u.items||[]).filter(i=>i==='core').length*.15;
 u.cooldowns[id]=def.cd*(1-haste)*(1-.045*(maxLv-1));
 u.energy-=def.cost;
 if(u.recall>0){u.recall=0;if(u.controlled)announce('RETORNO CANCELADO: HABILIDADE',1.2)}
 const c={id,dir,center,level:maxLv,time:Math.max(0,def.cast),total:Math.max(0,def.cast)};
 if(c.time<=0)releaseSkill(u,c);else u.casting=c;
 addEffect(u.x,u.y,hData(u.id).color,27,.24);
 return true;
}
function releaseSkill(u,c){
 if(!u||u.hp<=0)return;
 const id=c.id,def=skillDef(id),power=spellPower(u),enemy=1-u.side,lv=c.level;
 const slow=(target,seconds)=>{target.slow=Math.max(target.slow,seconds)};
 if(['lyria_step','vexor_lunge','orun_charge','vexor_ult'].includes(id)){
  const dashLength=def.range+lv*7,duration=id==='vexor_ult'?.25:.18;
  u.dash={vx:c.dir.x*dashLength/duration,vy:c.dir.y*dashLength/duration,t:duration,
   hit:new Set(),radius:def.radius||25,dmg:Math.round((id==='vexor_ult'?85:id==='orun_charge'?31:id==='vexor_lunge'?36:0)*power),
   stun:id==='orun_charge'?.36:id==='vexor_ult'?.26:0};
  u.invuln=id==='lyria_step'?.19:.10;
  addEffect(u.x,u.y,hData(u.id).color,57,.42);
  return;
 }
 if(['lyria_pierce','nyra_bolt','seris_tether'].includes(id)){
  const d=id==='lyria_pierce'?42:id==='nyra_bolt'?44:24;
  state.projectiles.push({x:u.x+c.dir.x*23,y:u.y+c.dir.y*23,source:u,side:u.side,
   vx:c.dir.x*555,vy:c.dir.y*555,range:def.range,travel:0,
   damage:Math.round((d+lv*8)*power),r:def.radius||15,life:2,
   kind:'skillline',color:hData(u.id).color,stun:0,slow:id==='seris_tether'?1.6:0});
  return;
 }
 if(def.aim==='area'){
  const isHealing=id==='seris_bloom';
  const aoeDamage=id==='lyria_ult'?85:id==='nyra_ult'?97:id==='lyria_rain'?43:
   id==='nyra_rift'?54:id==='vexor_mark'?40:0;
  const range=def.radius+(def.ultimate?15:0);
  state.projectiles.push({x:u.x,y:u.y,source:u,side:u.side,tx:c.center.x,ty:c.center.y,
   speed:780,damage:Math.round((aoeDamage+lv*9)*power),r:9,aoe:range,
   kind:isHealing?'healarea':'damagearea',heal:isHealing?55+lv*13:0,
   color:hData(u.id).color,stun:id==='nyra_ult'?.62:id==='nyra_rift'?.32:0,
   slow:id==='lyria_rain'||id==='lyria_ult'?1.5:id==='nyra_rift'?1.3:0,
   mark:id==='vexor_mark',life:2.5});
  addEffect(c.center.x,c.center.y,hData(u.id).color,range,1.05,'telegraph');
  return;
 }
 const r=def.radius||120;
 if(id==='seris_ult'||id==='seris_aegis'||id==='orun_ult'||id==='orun_guard'||id==='nyra_barrier'){
  for(const friend of living(u.side,'hero')){
   if(dist(friend,u)<r+friend.r||friend===u){
    if(id==='seris_ult')heal(friend,75+lv*20);
    if(id==='orun_ult')heal(friend,25+lv*8);
    if(id==='orun_guard')heal(friend,13+lv*7);
    grantShield(friend,id==='orun_ult'?95:id==='seris_ult'?90:id==='seris_aegis'?40:60,
      id==='orun_ult'||id==='seris_ult'?4.2:2.9);
   }
  }
  if(id==='orun_ult')aoe(u.x,u.y,r,Math.round(65*power),u,.55);
  addEffect(u.x,u.y,hData(u.id).color,r,.69);
  return;
 }
 if(id==='vexor_whirl'||id==='orun_quake'){
  aoe(u.x,u.y,r,Math.round((id==='orun_quake'?53:60)*power),u,id==='orun_quake'?.33:0);
  addEffect(u.x,u.y,hData(u.id).color,r,.54);
 }
}
function aoe(x,y,r,damageVal,source,stun=0,slow=0){
 let hits=0;
 for(const t of living(1-source.side)){
  if(Math.hypot(t.x-x,t.y-y)<r+t.r){
   hits++;damage(t,damageVal,source);
   t.stun=Math.max(t.stun,stun);t.slow=Math.max(t.slow,slow);
  }
 }
 for(const c of state.camps){
  if(c.hp>0&&(!c.unlock||state.time>=c.unlock)&&Math.hypot(c.x-x,c.y-y)<r+30)damageCreep(c,damageVal,source);
 }
 return hits;
}
function tickProjectiles(dt){
 const arr=state.projectiles;
 for(const p of arr){
  if(p.life<=0)continue;
  p.life-=dt;
  if(p.kind==='aa'||p.kind==='tower'||p.kind==='core'){
   if(p.target.hp<=0){p.life=0;continue}
   const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy)||1,step=p.speed*dt;
   if(d<=step+p.target.r+4){
    p.x=p.target.x;p.y=p.target.y;p.life=0;damage(p.target,p.damage,p.source);
   }else{p.x+=dx/d*step;p.y+=dy/d*step}
  }else if(p.kind==='skillline'){
   const px=p.x,py=p.y;
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.travel+=Math.hypot(p.x-px,p.y-py);
   const foe=living(1-p.side).find(u=>Math.hypot(u.x-p.x,u.y-p.y)<u.r+p.r);
   const creep=state.camps.find(c=>c.hp>0&&(!c.unlock||state.time>=c.unlock)&&dist(c,p)<p.r+26);
   if(foe){damage(foe,p.damage,p.source);foe.stun=Math.max(foe.stun,p.stun||0);foe.slow=Math.max(foe.slow,p.slow||0);p.life=0;}
   else if(creep){damageCreep(creep,p.damage,p.source);p.life=0}
   else if(p.travel>p.range)p.life=0;
  }else{
   const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy)||1,step=p.speed*dt;
   if(d<=step+7){
    p.x=p.tx;p.y=p.ty;p.life=0;
    addEffect(p.x,p.y,p.color,p.aoe,.46,'blast');
    if(p.kind==='healarea'){
     for(const friend of living(p.side,'hero'))if(dist(friend,p)<p.aoe+friend.r)heal(friend,p.heal);
    }else{
     aoe(p.x,p.y,p.aoe,p.damage,p.source,p.stun,p.slow);
     if(p.mark){
      for(const u of living(1-p.side,'hero'))if(dist(u,p)<p.aoe+u.r)u.marked=4;
     }
    }
   }else{p.x+=dx/d*step;p.y+=dy/d*step}
  }
 }
 state.projectiles=arr.filter(p=>p.life>0);
}
function tickUnit(u,dt){
 if(u.hp<=0){
  if(u.kind==='hero'){u.respawn-=dt;if(u.respawn<=0)respawn(u)}
  return;
 }
 u.stun=Math.max(0,u.stun-dt);u.slow=Math.max(0,u.slow-dt);
 u.invuln=Math.max(0,u.invuln-dt);
 if(u.shield>0&&state.time>=(u.shieldUntil||0))u.shield=0;
 u.guard=Math.max(0,u.guard-dt*.02);
 u.attackCd=Math.max(0,u.attackCd-dt);u.attackAnim=Math.max(0,(u.attackAnim||0)-dt);
 if(u.kind==='hero')for(const id in u.cooldowns)u.cooldowns[id]=Math.max(0,u.cooldowns[id]-dt);
 if(u.kind==='hero'){
  u.gold=Math.min(20000,u.gold+dt*1.15);
  u.energy=clamp(u.energy+dt*(u.homeBuff>state.time?19:12),0,maxEnergy(u));
  u.aiTimer-=dt;
  u.hp=Math.min(u.maxHp,u.hp+dt*(dist(u,HOME[u.side])<150?24:1.15));
  if(u.recall>0){
   if(u.controlled){u.recall-=dt;if(u.recall<=0){u.x=HOME[u.side].x;u.y=HOME[u.side].y;u.hp=u.maxHp;u.energy=maxEnergy(u);announce('RETORNO AO SANTUÁRIO',1.6)}}
  }
  if(u.casting){
   if(u.stun>0){u.casting=null;return}
   u.casting.time-=dt;
   if(u.casting.time<=0){const castData=u.casting;u.casting=null;releaseSkill(u,castData)}
  }
  if(u.dash){
   const d=u.dash,ox=u.x,oy=u.y,step=Math.min(dt,d.t);
   movePhysical(u,d.vx*step,d.vy*step);
   for(const target of living(1-u.side)){
    if(d.hit.has(target.uid))continue;
    const hit=Math.hypot(target.x-u.x,target.y-u.y)<target.r+u.r+d.radius*.5;
    if(hit){d.hit.add(target.uid);damage(target,d.dmg,u);target.stun=Math.max(target.stun,d.stun)}
   }
   d.t-=dt;if(d.t<=0)u.dash=null;
   addEffect(ox,oy,hData(u.id).color,21,.21);
   return;
  }
 }
 if(u.stun>0)return;
 if(u.kind==='minion')moveMinion(u,dt);
 else if(u.kind==='hero'&&!u.controlled)botHero(u,dt);
 if(!u.casting&&!(u.kind==='hero'&&u.controlled)&&u.attackCd<=0)autoAttack(u);
}
function makeWave(){
 state.wave++;
 for(let side=0;side<2;side++)for(let lane=0;lane<3;lane++){
  for(let i=0;i<4;i++)state.units.push(createMinion(side,lane,i<2?0:1,i));
  if(state.wave%3===0||state.time>550)state.units.push(createMinion(side,lane,2,2));
  // Tropas de cerco mais fortes após uma rota perder todos os obeliscos.
  if(state.time>480&&state.structures.filter(t=>t.kind==='tower'&&t.side===1-side&&t.lane===lane).every(t=>t.hp<=0))
   state.units.push(createMinion(side,lane,2,2));
 }
 if(state.wave===1)announce('AS SENTINELAS RÚNICAS PARTIRAM PARA AS ROTAS',3);
}
function step(dt,movement={x:0,y:0}){
 if(state.mode!=='playing'||state.showPause)return;
 dt=clamp(dt,0,.05);state.time+=dt;
 const hero=state.hero;
 if(hero&&hero.recall>0&&Math.hypot(movement.x,movement.y)>.07){
  hero.recall=0;announce('RETORNO CANCELADO: MOVIMENTO',1.2);
 }
 if(hero&&hero.hp>0&&!hero.dash&&hero.stun<=0&&!hero.recall){
  const direction=norm(movement.x,movement.y),len=Math.min(1,Math.hypot(movement.x,movement.y));
  if(len>.06){
   movePhysical(hero,direction.x*moveSpeed(hero)*dt*len*(hero.casting?.58:1),
    direction.y*moveSpeed(hero)*dt*len*(hero.casting?.58:1));
   hero.facing=Math.atan2(direction.y,direction.x);
  }
 }
 if(state.time>=state.nextWave){
  makeWave();state.nextWave=state.time+21;
 }
 for(const u of state.units){tickUnit(u,dt);if(state.mode!=='playing')break}
 if(state.mode!=='playing')return;
 separateUnits();
 structureStep(dt);jungleStep(dt);tickProjectiles(dt);
 for(const f of state.effects)f.life-=dt;state.effects=state.effects.filter(f=>f.life>0);
 // Remove dead minions after a brief visible impact; keep heroes for respawn.
 state.units=state.units.filter(u=>u.kind==='hero'||u.hp>0||u.death<.22);
 for(const u of state.units)if(u.hp<=0&&u.kind==='minion')u.death+=dt;
 if(state.units.length>240)state.units=state.units.filter(u=>u.kind==='hero'||u.hp>0);
}
function buyItem(id){
 const hero=state.hero,item=ITEMS.find(x=>x.id===id);
 if(!hero||!item||state.mode!=='playing')return{ok:false,reason:'Partida indisponível'};
 if(hero.hp<=0)return{ok:false,reason:'Aguarde ressurgir'};
 if(dist(hero,HOME[0])>240)return{ok:false,reason:'Compras apenas no santuário (base)'};
 if(hero.items.includes(id))return{ok:false,reason:'Você já possui esse equipamento'};
 if(hero.items.length>=6)return{ok:false,reason:'Inventário completo (6 itens)'};
 if(hero.gold<item.price)return{ok:false,reason:'Ouro insuficiente'};
 hero.gold-=item.price;hero.items.push(id);
 if(id==='ward'){hero.maxHp+=85;hero.hp+=85;}
 if(id==='cell'){hero.energy+=30;hero.maxEnergy=maxEnergy(hero);}
 addEffect(hero.x,hero.y,'#fbe1a1',58,.44);
 announce(item.name.toUpperCase()+' EQUIPADO',1.6);
 return{ok:true};
}
function recall(){
 const p=state.hero;
 if(state.mode!=='playing'||!p||p.hp<=0)return false;
 if(dist(p,HOME[0])<125){announce('VOCÊ JÁ ESTÁ NA BASE',1.3);return false}
 if(p.casting||p.stun>0||p.dash)return false;
 p.recall=3.2;announce('CANALIZANDO RETORNO · 3s',1.6);
 addEffect(p.x,p.y,'#c5ecfa',70,3.2,'recall');
 return true;
}
window.FendaEngine={state,W,H,TAU,HOME,PATHS,SIDE,ITEMS,hData,skillDef,
 start,step,cast,autoAttack,focusTower,buyItem,recall,damage,heal,announce,makeWave,
 living,attackRange,moveSpeed,findAA,nearestEnemy,enemyCreep,pathPos,dist,norm,clamp,addEffect,movePhysical,pushOutsideSolids,separateUnits,solidBodies};
})();