(function(){
'use strict';
const C=window.SigilsCore;
if(!C){console.error('Fenda: núcleo de campeões não carregado');return;}
const W=2750,H=1900,TAU=Math.PI*2;
// Um deslocamento base-a-base deve durar ~27–30 s, não 11–13 s como na v4.1.
const MOBA_WALK_SCALE=.55;
// Largura de rota proporcional ao personagem: ~6 diâmetros por corredor.
const LANE_HALF_WIDTH=108,LANE_MINION_SPREAD=26;
const JUNGLE_LINKS=[
 {lane:0,t:.55,x:870,y:610},{lane:1,t:.35,x:1070,y:1320},
 {lane:1,t:.67,x:1850,y:830},{lane:2,t:.43,x:1700,y:1310}
];
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
 effects:[],jungle:[],camps:[],obstacles:[],wards:[],brushes:[],sight:[[],[]],seen:[null,null],
 visionUpdate:-1,teamBuffs:[{serpe:0,titan:0},{serpe:0,titan:0}],
 hero:null,focused:null,kills:[0,0],wave:0,nextWave:4,
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
// Trajetos curvos compartilhados por física, tropas, torres e renderização.
// Cada esquina vira uma transição quadrática, evitando quinas de 90°.
function roundRoute(points){
 const out=[{...points[0]}],radius=78,parts=9;
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],p=points[i],b=points[i+1];
  const d1=dist(a,p),d2=dist(p,b);
  const inDir=norm(p.x-a.x,p.y-a.y),outDir=norm(b.x-p.x,b.y-p.y);
  const turn=Math.abs(inDir.x*outDir.y-inDir.y*outDir.x);
  if(turn<.025){out.push({...p});continue}
  const r=Math.min(radius,d1*.30,d2*.30);
  const left={x:p.x-inDir.x*r,y:p.y-inDir.y*r};
  const right={x:p.x+outDir.x*r,y:p.y+outDir.y*r};
  out.push(left);
  for(let j=1;j<=parts;j++){
   const t=j/parts,v=1-t;
   out.push({x:v*v*left.x+2*v*t*p.x+t*t*right.x,
     y:v*v*left.y+2*v*t*p.y+t*t*right.y});
  }
 }
 out.push({...points[points.length-1]});
 return out;
}
const ROUTE_PATHS=PATHS.map(roundRoute);
const ROUTE_LENGTHS=ROUTE_PATHS.map(pts=>{
 const lengths=[0];
 for(let i=1;i<pts.length;i++)lengths.push(lengths[i-1]+dist(pts[i-1],pts[i]));
 return lengths;
});
const ROUTE_TOTALS=ROUTE_LENGTHS.map(p=>p[p.length-1]);
function routePoint(lane,d){
 const pts=ROUTE_PATHS[lane],lens=ROUTE_LENGTHS[lane];
 const v=clamp(d,0,ROUTE_TOTALS[lane]);
 for(let i=1;i<pts.length;i++){
  if(v>lens[i])continue;
  const t=(v-lens[i-1])/Math.max(.0001,lens[i]-lens[i-1]);
  return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,
   y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t};
 }
 return {...pts[pts.length-1]};
}
function pathPos(lane,t){return routePoint(lane,clamp(t,0,1)*ROUTE_TOTALS[lane])}
function routeProjection(lane,pt){
 const pts=ROUTE_PATHS[lane],lens=ROUTE_LENGTHS[lane];
 let best=Infinity,progress=0;
 for(let i=1;i<pts.length;i++){
  const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y;
  const q=clamp(((pt.x-a.x)*dx+(pt.y-a.y)*dy)/Math.max(1,dx*dx+dy*dy),0,1);
  const x=a.x+q*dx,y=a.y+q*dy,d2=(pt.x-x)**2+(pt.y-y)**2;
  if(d2<best){best=d2;progress=lens[i-1]+q*(lens[i]-lens[i-1]);}
 }
 return {progress,distance:Math.sqrt(best)};
}


const VISION_CELL=65,VISION_COLS=Math.ceil(W/VISION_CELL),VISION_ROWS=Math.ceil(H/VISION_CELL);
function brushAt(pos){
 if(!pos)return null;
 return state.brushes.find(b=>Math.hypot(pos.x-b.x,pos.y-b.y)<b.r)||null;
}
function createSightSource(x,y,r,ward=false){
 return{x,y,r,ward};
}
function refreshVision(force=false){
 if(!force&&state.visionUpdate>=0&&state.time-state.visionUpdate<.20)return;
 state.visionUpdate=state.time;
 for(let team=0;team<2;team++){
  const sight=[];
  for(const u of state.units){
   if(u.hp<=0||u.side!==team)continue;
   sight.push(createSightSource(u.x,u.y,u.kind==='hero'?u.vision||350:u.id==='siege'?235:210));
  }
  for(const obj of state.structures)
   if(obj.hp>0&&obj.side===team)sight.push(createSightSource(obj.x,obj.y,obj.kind==='core'?300:250));
  for(const ward of state.wards)if(ward.side===team)sight.push(createSightSource(ward.x,ward.y,ward.r,true));
  state.sight[team]=sight;
  const memory=state.seen[team];
  if(!memory)continue;
  for(const src of sight){
   const x0=Math.max(0,Math.floor((src.x-src.r)/VISION_CELL)),x1=Math.min(VISION_COLS-1,Math.ceil((src.x+src.r)/VISION_CELL));
   const y0=Math.max(0,Math.floor((src.y-src.r)/VISION_CELL)),y1=Math.min(VISION_ROWS-1,Math.ceil((src.y+src.r)/VISION_CELL));
   for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){
    const x=(ix+.5)*VISION_CELL,y=(iy+.5)*VISION_CELL;
    if((x-src.x)**2+(y-src.y)**2<(src.r+VISION_CELL*.5)**2)memory[iy*VISION_COLS+ix]=1;
   }
  }
 }
}
function isPointVisible(team,pos){
 if(!pos)return false;
 const sources=state.sight[team]||[];
 for(const src of sources){
  const dx=pos.x-src.x,dy=pos.y-src.y;
  if(dx*dx+dy*dy<=src.r*src.r)return true;
 }
 return false;
}
function visibleTo(team,object){
 if(!object)return false;
 if(object.side===team)return true;
 if(object.kind==='core'||object.kind==='tower')return true; // Estruturas são conhecidas no mapa.
 if(object.revealUntil&&object.revealUntil[team]>state.time)return true;
 if(!isPointVisible(team,object))return false;
 const brush=brushAt(object);
 if(!brush)return true;
 for(const src of state.sight[team]||[]){
  const dx=src.x-object.x,dy=src.y-object.y;
  if(dx*dx+dy*dy>src.r*src.r)continue;
  const near=dx*dx+dy*dy<105*105;
  if(src.ward||near||Math.hypot(src.x-brush.x,src.y-brush.y)<brush.r)return true;
 }
 return false;
}
function placeWard(hero,x,y){
 if(state.mode!=='playing'||!hero||hero.hp<=0||hero.kind!=='hero')return{ok:false,reason:'CAMPEÃO INDISPONÍVEL'};
 if(hero.visionCd>0)return{ok:false,reason:'VISÃO EM RECARGA'};
 const pos={x:clamp(x,35,W-35),y:clamp(y,35,H-35)};
 if(dist(hero,pos)>465)return{ok:false,reason:'LOCAL MUITO DISTANTE'};
 state.wards=state.wards.filter(w=>w.until>state.time);
 const existing=state.wards.filter(w=>w.side===hero.side);
 if(existing.length>=3){
  const oldest=existing.sort((a,b)=>a.until-b.until)[0];
  state.wards=state.wards.filter(w=>w!==oldest);
 }
 hero.visionCd=48;
 const ward={uid:++state.seq,side:hero.side,x:pos.x,y:pos.y,r:380,until:state.time+85,kind:'ward'};
 state.wards.push(ward);refreshVision(true);
 addEffect(ward.x,ward.y,hero.side===0?'#8ef1d4':'#f5a6bb',48,.55,'blast');
 if(hero.controlled)announce('SENTINELA DE VISÃO INSTALADA · 85s',2);
 return{ok:true,ward};
}

function buildMap(){
 state.structures=[];state.camps=[];state.obstacles=[];
 state.brushes=[
  {id:'veil-n',x:865,y:445,r:118},{id:'reed-n',x:1190,y:815,r:86},
  {id:'veil-s',x:735,y:1090,r:105},{id:'reed-s',x:1510,y:1400,r:105},
  {id:'thicket-n',x:1920,y:670,r:112},{id:'thicket-s',x:1900,y:1190,r:115}
 ];
 for(let side=0;side<2;side++){
  const base=HOME[side];
  state.structures.push({kind:'core',side,x:base.x,y:base.y,maxHp:1850,hp:1850,r:56,atk:53,range:375,attackCd:0,id:'core'+side});
  for(let lane=0;lane<3;lane++){
   // tier 1: externa, mais próxima do meio; tier 2: intermediária; tier 3: interna.
   // A ordem física precisa acompanhar a ordem de vulnerabilidade das torres.
   // A torre externa rubra da rota inferior deve ficar depois da curva, fora do corredor.
   const fractions=side===0?[.37,.23,.095]:(lane===2?[.67,.77,.905]:[.63,.77,.905]);
   for(let i=0;i<fractions.length;i++){
    // Defesa no ombro da rota: a onda passa pelo eixo livre da lane.
    const t=fractions[i],p=pathPos(lane,t);
    const before=pathPos(lane,Math.max(0,t-.004)),after=pathPos(lane,Math.min(1,t+.004));
    const tangent=norm(after.x-before.x,after.y-before.y);
    const normal={x:-tangent.y,y:tangent.x};
    const recess=side===0?-30:30,lateral=(side===0?1:-1)*138;
    const towerX=p.x+tangent.x*recess+normal.x*lateral;
    const towerY=p.y+tangent.y*recess+normal.y*lateral;
    state.structures.push({kind:'tower',side,lane,tier:i+1,
      x:clamp(towerX,55,W-55),y:clamp(towerY,55,H-55),
      r:27,hp:880,maxHp:880,atk:58,range:360,attackCd:0,
      id:'tower'+side+'-'+lane+'-'+i});
   }
  }
 }
 state.camps=[
  {id:'veilA',x:870,y:610,kind:'buff',name:'Véu Azul',color:'#75caff',hp:630,maxHp:630,respawn:0,buff:'energy'},
  {id:'emberA',x:1700,y:1310,kind:'buff',name:'Brasa Rubra',color:'#ff9c74',hp:630,maxHp:630,respawn:0,buff:'damage'},
  {id:'wolvesA',x:1070,y:1320,kind:'camp',name:'Lobos Astrais',color:'#a7c2ef',hp:360,maxHp:360,respawn:0},
  {id:'golemA',x:1850,y:830,kind:'camp',name:'Golem Sigilar',color:'#e5c58f',hp:450,maxHp:450,respawn:0},
  {id:'serpe',x:1570,y:1120,kind:'boss',name:'Serpe Astral',color:'#9bf6e9',hp:1030,maxHp:1030,respawn:0,unlock:55},
  {id:'titan',x:1170,y:650,kind:'boss',name:'Titã do Abismo',color:'#dfb1fa',hp:1500,maxHp:1500,respawn:0,unlock:110}
 ];
 // Pedras e árvores antigas são obstáculos reais, não apenas desenhos decorativos.
 // A floresta mantém corredores navegáveis entre as três rotas e os campos.
 let seed=14653;
 const rand=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646};
 const onRoad=(x,y,margin)=>{
  for(const pts of ROUTE_PATHS)for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],vx=b.x-a.x,vy=b.y-a.y;
   const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/(vx*vx+vy*vy),0,1);
   if(Math.hypot(a.x+vx*t-x,a.y+vy*t-y)<margin)return true;
  }
  return false;
 };
 for(let attempt=0;attempt<900&&state.obstacles.length<48;attempt++){
  const x=140+rand()*(W-280),y=135+rand()*(H-270);
  const r=22+rand()*21;
  // Passagens reais entre selva e rotas: sem rochas bloqueando o corredor.
  const onJunglePath=JUNGLE_LINKS.some(link=>{
    const a=pathPos(link.lane,link.t),b=link;
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<r+40;
  });
  if(onRoad(x,y,r+LANE_HALF_WIDTH+15)||onJunglePath||
     HOME.some(h=>Math.hypot(h.x-x,h.y-y)<210)||
     state.structures.some(t=>Math.hypot(t.x-x,t.y-y)<r+t.r+53)||
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
 y:start.y+d.y*spawnOffset+rando(-11,11),r:id==='orun'?21:17.5,speed:h.move*MOBA_WALK_SCALE,atk:h.damage*.82,
 baseHp:h.hp*1.3,maxHp:Math.round(h.hp*1.3),hp:Math.round(h.hp*1.3),
 energy:100,maxEnergy:100,level:1,xp:0,gold:controlled?550:350,items:[],
 lane:roles[id],waypoint:side===0?0:ROUTE_PATHS[roles[id]].length-1,attackCd:0,casting:null,
 cooldowns:Object.fromEntries([...h.skills,h.ultimate].map(k=>[k,0])),
 stun:0,slow:0,shield:0,guard:0,invuln:0,marked:0,attackAnim:0,
 vision:350,death:0,respawn:0,recall:0,lastDamage:0,focus:null,
 aiTimer:rando(.6,1.8),visionCd:0,jungleGoal:null,gankUntil:0,kills:0,deaths:0,cs:0,dash:null,commandTarget:null,
 healthRegen:1.3,homeBuff:0,botLane:roles[id],cs:0,focusTarget:null,focusUntil:0,isRanged:!['vexor','orun'].includes(id)};
}
function createMinion(side,lane,type=0,slot=0){
 const t=side===0?.035:.965,p=pathPos(lane,t),ranged=type>=1,siege=type===2;
 const a=pathPos(lane,t-.006),b=pathPos(lane,t+.006),axis=norm(b.x-a.x,b.y-a.y);
 const forward=side===0?1:-1,offset=(slot-1.5)*LANE_MINION_SPREAD;
 const depth=type===0?23:type===1?-12:-44;
 const spawnX=p.x+axis.x*forward*depth-axis.y*offset;
 const spawnY=p.y+axis.y*forward*depth+axis.x*offset;
 const wavePower=1+Math.min(1.45,state.time/680);
 let hp=Math.round((siege?340:ranged?117:165)*wavePower);
 return{uid:++state.seq,kind:'minion',id:siege?'siege':ranged?'caster':'guard',side,lane,
 x:spawnX+rando(-2.5,2.5),y:spawnY+rando(-2.5,2.5),r:siege?17.5:ranged?11:13,
 hp,maxHp:hp,atk:Math.round((siege?34:ranged?20:19)*wavePower),
 speed:siege?59:ranged?74:83,attackCd:rando(.1,.5),ranged,site:type,slot,
 routeProgress:t*ROUTE_TOTALS[lane],routeReturning:false,
 pathIndex:side===0?0:ROUTE_PATHS[lane].length-1,focus:null,
 stun:0,slow:0,shield:state.teamBuffs[side].titan>state.time?42:0,
 shieldUntil:state.teamBuffs[side].titan>state.time?state.time+18:0,
 invuln:0,attackAnim:0,death:0,lastDamage:0};
}
function start(hero='lyria'){
 state.mode='playing';state.time=0;state.units=[];state.projectiles=[];state.effects=[];
 state.selectedHero=C.heroes[hero]?hero:'lyria';state.hero=null;state.structures=[];
 state.kills=[0,0];state.win=null;state.marker=null;state.nextWave=5;state.wave=0;
 state.shopOpen=false;state.showPause=false;state.buffUntil=0;state.score=0;state.seq=0;
 state.wards=[];state.sight=[[],[]];state.seen=[new Uint8Array(VISION_COLS*VISION_ROWS),new Uint8Array(VISION_COLS*VISION_ROWS)];
 state.visionUpdate=-1;state.teamBuffs=[{serpe:0,titan:0},{serpe:0,titan:0}];
 window.FendaTeamAI?.reset();
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
 for(const side of [0,1]){
  const bots=state.units.filter(u=>u.kind==='hero'&&u.side===side&&!u.controlled);
  const jungler=bots.find(u=>u.id==='vexor')||bots.find(u=>u.id==='orun');
  if(jungler){jungler.jungler=true;jungler.jungleGoal=null}
 }
 refreshVision(true);
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
  victim.commandTarget=null;
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
  if(source&&source.side!==undefined&&(source.side===0||source.side===1)){
   const owner=source.side;
   if(source.kind==='hero'){
    source.gold+=victim.boss?230:105;
    xpGain(source,victim.boss?130:65);
    heal(source,victim.boss?90:36);
    if(victim.buff==='energy')source.energy=maxEnergy(source);
    if(victim.buff)source.homeBuff=state.time+72;
   }
   if(victim.boss){
    const buff=victim.id==='titan'?'titan':'serpe';
    state.teamBuffs[owner][buff]=state.time+95;
    for(const teammate of living(owner,'hero')){
     teammate.gold+=95;xpGain(teammate,55);
     heal(teammate,46);teammate.guard=Math.max(teammate.guard,38);
    }
    announce((owner===0?'AZUL':'RUBRO')+' CONQUISTOU '+victim.name.toUpperCase()+' · BÊNÇÃO DE EQUIPE!',4);
    addEffect(victim.x,victim.y,victim.color,145,.9,'burst');
   }
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
 const targets=living(1-team).filter(e=>dist(u,e)<=range+e.r&&visibleTo(team,e));
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
  .filter(v=>v.lane===lane&&nearby(v)&&visibleTo(u.side,v)).sort((a,b)=>dist(u,a)-dist(u,b));
 if(minions.length)return minions[0];
 const structures=state.structures.filter(t=>t.side===side&&t.hp>0&&
   (t.kind==='core'&&laneCleared(side,lane)||t.kind==='tower'&&t.lane===lane&&structureExposed(t))&&nearby(t))
  .sort((a,b)=>(a.kind==='tower'?0:1)-(b.kind==='tower'?0:1)||dist(u,a)-dist(u,b));
 if(structures.length)return structures[0];
 const attackers=living(side,'hero').filter(v=>nearby(v)&&visibleTo(u.side,v))
  .sort((a,b)=>dist(u,a)-dist(u,b));
 if(attackers.length)return attackers[0];
 return living(side,'minion').filter(v=>nearby(v)&&visibleTo(u.side,v)).sort((a,b)=>dist(u,a)-dist(u,b))[0]||null;
}

function isAttackCommandValid(hero,target){
 if(!hero||hero.kind!=='hero'||hero.hp<=0||!target||target.hp<=0||target.side===hero.side)return false;
 if(target.kind==='tower'||target.kind==='core')return structureExposed(target);
 if(target.kind==='hero'||target.kind==='minion')return visibleTo(hero.side,target);
 if(state.camps.includes(target))return (!target.unlock||state.time>=target.unlock)&&isPointVisible(hero.side,target);
 return false;
}
function commandAttack(hero,target){
 if(!hero||!hero.controlled||hero.hp<=0||state.mode!=='playing')return{ok:false,reason:'CAMPEÃO INDISPONÍVEL'};
 if(target?.side===hero.side)return{ok:false,reason:'ALVO ALIADO'};
 if((target?.kind==='tower'||target?.kind==='core')&&target.hp>0&&!structureExposed(target))
  return{ok:false,reason:'ESTRUTURA PROTEGIDA: DESTRUA OS OBELISCOS ANTERIORES'};
 if(!isAttackCommandValid(hero,target))return{ok:false,reason:'ALVO INDISPONÍVEL OU OCULTO'};
 hero.commandTarget=target;
 hero.focusTarget=target;hero.focusUntil=Infinity;
 hero.recall=0;
 return{ok:true,target};
}
function clearAttackCommand(hero){
 if(!hero)return;
 hero.commandTarget=null;
 hero.focusTarget=null;hero.focusUntil=0;
}
function findAA(u){
 if(!u||u.hp<=0)return null;
 const range=attackRange(u);
 if(u.controlled&&u.commandTarget){
  const t=u.commandTarget;
  if(!isAttackCommandValid(u,t)){clearAttackCommand(u);}
  else return dist(u,t)<=range+solidRadius(t)+2?t:null;
 }
 if(u.kind==='hero'&&!u.controlled&&u.jungleGoal&&u.jungleGoal.hp>0&&
     (!u.jungleGoal.unlock||state.time>=u.jungleGoal.unlock)&&
     dist(u,u.jungleGoal)<=range+solidRadius(u.jungleGoal)+2)return u.jungleGoal;
 // Seleção explícita de torre mantém o foco do AA durante o cerco.
 const chosen=u.focusTarget&&u.focusUntil>state.time?u.focusTarget:null;
 if(chosen&&chosen.hp>0&&chosen.side!==u.side&&dist(chosen,u)<=range+chosen.r+2&&
     (u.controlled||u.teamFightUntil>state.time&&chosen.kind==='hero')&&
     (chosen.kind==='tower'||chosen.kind==='core'||visibleTo(u.side,chosen))&&
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
 u.attackAnim=u.kind==='hero'?.39:.29;
 u.attackTotal=u.attackAnim;
 u.attackWindup=u.kind==='hero'?(u.isRanged?.15:.13):.11;
 let damageVal=attackDamage(u)+(u.homeBuff>state.time?4:0);
 // Minions limpam ondas de forma consistente, sem congestionamentos infinitos.
 if(u.kind==='minion'&&target.kind==='minion')damageVal=Math.round(damageVal*1.25);
 if(target.kind==='boss'||target.kind==='buff'||target.kind==='camp'){
  damageVal=Math.round(damageVal*(u.kind==='hero'?(target.kind==='boss'?2.10:1.52):1.0));
 }
 if(u.kind==='minion'&&state.teamBuffs[u.side].titan>state.time&&
    (target.kind==='tower'||target.kind==='core'))damageVal=Math.round(damageVal*1.28);
 if(u.kind==='hero'&&state.teamBuffs[u.side].serpe>state.time)
  damageVal=Math.round(damageVal*1.12);
 // Os AAs de campeões devem causar dano perceptível em torres;
 // sentinelas de cerco também possuem bônus contra estruturas.
 if(target.kind==='tower'||target.kind==='core')
  damageVal=Math.round(damageVal*(u.kind==='hero'?1.60:u.id==='siege'?1.45:1.0));
 if(u.controlled&&(target.kind==='tower'||target.kind==='core')&&!u.commandTarget)u.focusUntil=state.time+5;
 u.facing=Math.atan2(target.y-u.y,target.x-u.x);
 u.attackPending={target,damage:damageVal,time:u.attackWindup};
 return true;
}
function finishAttack(u,shot){
 if(!shot||!shot.target||shot.target.hp<=0||u.hp<=0||u.stun>0)return false;
 const t=shot.target;
 u.attackHit=.20;
 if(attackRange(u)<=75){
  damage(t,shot.damage,u);
  addEffect(t.x,t.y,u.side===0?'#84ead9':'#f7a3b0',27,.28,'hit');
 }else missile(u,t,shot.damage,'aa',u.kind==='hero'?530:380);
 return true;
}
function chooseEnemyForStructure(t){
 const aggro=t.aggroTarget;
 if(aggro&&aggro.hp>0&&state.time<(t.aggroUntil||0)&&
     dist(t,aggro)<t.range+aggro.r)return aggro;
 t.aggroTarget=null;
 const enemies=living(1-t.side);
 const inRange=enemies.filter(u=>dist(u,t)<t.range+u.r&&visibleTo(t.side,u));
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
 const moved=Math.hypot(u.x-x0,u.y-y0);
 if(moved>.25){
  u.walkPhase=((u.walkPhase||0)+moved*.14)%TAU;
  u.walkUntil=state.time+.14;
 }
 return moved>.2;
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
    const friendlyMinions=u.side===v.side&&u.kind==='minion'&&v.kind==='minion';
    // Companheiros de onda se afastam suavemente, mas conseguem atravessar filas.
    const padding=friendlyMinions?2:(u.side===v.side?3:4);
    const minDist=Math.max(9,u.r+v.r-padding);
    const dx=v.x-u.x,dy=v.y-u.y;
    if(Math.abs(dx)>=minDist||Math.abs(dy)>=minDist)continue;
    const d2=dx*dx+dy*dy;
    if(d2>=minDist*minDist)continue;
    const d=Math.sqrt(d2);
    const dir=d>.001?{x:dx/d,y:dy/d}:{x:Math.cos(v.uid*2.1),y:Math.sin(v.uid*2.1)};
    const strength=Math.min(14,(minDist-d)*(friendlyMinions?.72:.78));
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
 const projection=routeProjection(m.lane,m);
 const enemy=m.aiEnemy;
 // As tropas não perseguem um alvo indefinidamente para dentro da selva.
 if(enemy&&!(enemy.kind==='tower'||enemy.kind==='core')&&projection.distance>165&&
    dist(m,enemy)>attackRange(m)+enemy.r){
   m.aiEnemy=null;
 }
 if(m.aiEnemy){
  m.routeReturning=true;
  if(dist(m,m.aiEnemy)>attackRange(m)+m.aiEnemy.r){
   moveToward(m,m.aiEnemy,dt,.94);
  }
  return;
 }
 const direction=m.side===0?1:-1,routeMax=ROUTE_TOTALS[m.lane];
 if(m.routeProgress==null)m.routeProgress=projection.progress;
 // Ao sair de uma luta, volta à curva mais próxima sem voltar aos vértices antigos.
 if(m.routeReturning){
  m.routeProgress=projection.progress;m.routeReturning=false;
 }else{
  m.routeProgress=direction===1?
    Math.max(m.routeProgress,projection.progress):
    Math.min(m.routeProgress,projection.progress);
 }
 const lookAhead=clamp(m.speed*.91,60,90);
 const ahead=clamp(m.routeProgress+direction*lookAhead,0,routeMax);
 const center=routePoint(m.lane,ahead);
 const before=routePoint(m.lane,clamp(ahead-11,0,routeMax));
 const after=routePoint(m.lane,clamp(ahead+11,0,routeMax));
 const axis=norm(after.x-before.x,after.y-before.y);
 const offset=(m.slot-1.5)*LANE_MINION_SPREAD;
 const target={x:center.x-axis.y*offset,y:center.y+axis.x*offset};
 if(Math.abs(ahead-m.routeProgress)<1&&dist(m,target)<38){
  moveToward(m,HOME[1-m.side],dt,.92);
 }else{
  moveToward(m,target,dt,.94);
 }
}
function respawn(u){
 u.jungleGoal=null;u.gankUntil=0;u.navPath=null;
 const home=HOME[u.side];
 const mid=pathPos(1,.11),dir=norm(mid.x-HOME[0].x,mid.y-HOME[0].y);
 const d=u.side===0?dir:{x:-dir.x,y:-dir.y};
 u.x=home.x+d.x*104+rando(-10,10);u.y=home.y+d.y*104+rando(-10,10);
 u.hp=u.maxHp;u.energy=maxEnergy(u);u.shield=0;u.shieldUntil=0;
 if(!u.controlled)botShop(u);u.guard=0;u.casting=null;
 u.attackCd=0;u.stun=0;u.slow=0;u.dash=null;u.recall=0;u.attackPending=null;u.attackAnim=0;u.skillFlash=0;
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
 const kit=hData(u.id),friendlies=living(u.side,'hero'),enemies=living(1-u.side,'hero').filter(e=>visibleTo(u.side,e));
 const ready=id=>id&&u.cooldowns[id]<=.01&&u.energy>=skillDef(id).cost&&
   (!skillDef(id).ultimate||u.level>=5);
 const r=dist(u,target),nearEnemies=enemies.filter(e=>dist(e,u)<240).length;
 const wounded=friendlies.filter(a=>dist(a,u)<295&&a.hp/a.maxHp<.74)
  .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
 const clusters=enemies.filter(e=>dist(e,target)<132).length;
 let options=[];
 if(u.id==='seris'){
  if(ready('seris_ult')&&(friendlies.filter(f=>dist(f,u)<190&&f.hp/f.maxHp<.75).length>=2||
      friendlies.some(f=>dist(f,u)<190&&f.hp/f.maxHp<.30)&&nearEnemies>=2))options.push('seris_ult');
  if(ready('seris_bloom')&&wounded)options.push('seris_bloom');
  if(ready('seris_aegis')&&(nearEnemies>0||wounded))options.push('seris_aegis');
  if(r<275)options.push('seris_tether');
 }else if(u.id==='orun'){
  if(ready('orun_ult')&&(nearEnemies>=2&&friendlies.some(f=>f!==u&&dist(f,u)<190)||
      nearEnemies>=1&&friendlies.some(f=>['lyria','nyra','seris'].includes(f.id)&&dist(f,u)<170&&f.hp/f.maxHp<.42)))options.push('orun_ult');
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
 if(cast(u,id,window.FendaTeamAI?.aim(u,id,beneficiary)||null,beneficiary)){
  u.aiTimer=1.65+(u.uid%5)*.13;
  return true;
 }
 return false;
}
// Junglers alternam campos, ganks e objetivos, em vez de ficarem parados nas rotas.
function openBoss(){
 const titan=state.camps.find(c=>c.id==='titan');
 const serpe=state.camps.find(c=>c.id==='serpe');
 if(titan&&titan.hp>0&&state.time>=Math.max(titan.unlock||0,160))return titan;
 if(serpe&&serpe.hp>0&&state.time>=Math.max(serpe.unlock||0,108))return serpe;
 return null;
}
// Busca de caminhos A* em grade ampla para junglers e assistentes.
// O desvio local resolve encontros curtos; a grade resolve obstáculos longos sem travar.
const NAV_CELL=76,NAV_COLS=Math.ceil(W/NAV_CELL),NAV_ROWS=Math.ceil(H/NAV_CELL);
function findJunglePath(u,goal){
 const total=NAV_COLS*NAV_ROWS;
 const from=(x,y)=>clamp(Math.floor(y/NAV_CELL),0,NAV_ROWS-1)*NAV_COLS+
   clamp(Math.floor(x/NAV_CELL),0,NAV_COLS-1);
 const point=idx=>({x:clamp((idx%NAV_COLS+.5)*NAV_CELL,30,W-30),
   y:clamp((Math.floor(idx/NAV_COLS)+.5)*NAV_CELL,30,H-30)});
 const cells=new Uint8Array(total),fromNode=new Int32Array(total).fill(-1),score=new Float32Array(total).fill(Infinity);
 const blocked=i=>{
  if(cells[i])return cells[i]===2;
  const pos=point(i),hit=nearSolids(pos.x,pos.y,100).some(o=>
   dist(pos,o)<solidRadius(o)+u.r+7);
  cells[i]=hit?2:1;return hit;
 };
 const start=from(u.x,u.y),rawGoal=from(goal.x,goal.y);
 let destination=rawGoal;
 if(blocked(destination)){
  const gp=point(rawGoal);
  let closest=Infinity,option=-1;
  const iy=Math.floor(rawGoal/NAV_COLS),ix=rawGoal%NAV_COLS;
  for(let r=1;r<=4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
   const x=ix+dx,y=iy+dy;
   if(x<0||x>=NAV_COLS||y<0||y>=NAV_ROWS)continue;
   const idx=y*NAV_COLS+x;
   if(blocked(idx))continue;
   const d=dist(point(idx),gp);
   if(d<closest){closest=d;option=idx}
  }
  if(option<0)return[];
  destination=option;
 }
 const open=[start],closed=new Uint8Array(total);
 score[start]=0;fromNode[start]=start;
 const heuristic=i=>dist(point(i),point(destination))/NAV_CELL;
 const shifts=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
 let iterations=0;
 while(open.length&&iterations++<total*3){
  let best=0,bestValue=Infinity;
  for(let i=0;i<open.length;i++){
   const node=open[i],value=score[node]+heuristic(node);
   if(value<bestValue){bestValue=value;best=i}
  }
  const current=open.splice(best,1)[0];
  if(current===destination)break;
  if(closed[current])continue;
  closed[current]=1;
  const x=current%NAV_COLS,y=Math.floor(current/NAV_COLS);
  for(const [dx,dy] of shifts){
   const nx=x+dx,ny=y+dy;
   if(nx<0||ny<0||nx>=NAV_COLS||ny>=NAV_ROWS)continue;
   const next=ny*NAV_COLS+nx;
   if(closed[next]||blocked(next))continue;
   if(dx&&dy&&(blocked(y*NAV_COLS+nx)||blocked(ny*NAV_COLS+x)))continue;
   const cost=score[current]+(dx&&dy?1.4142:1);
   if(cost<score[next]){
    score[next]=cost;fromNode[next]=current;open.push(next);
   }
  }
 }
 if(fromNode[destination]<0)return[];
 const result=[];
 let current=destination,limit=total;
 while(current!==start&&limit-->0){result.push(point(current));current=fromNode[current];if(current<0)break;}
 result.reverse();
 if(result.length>1&&dist(u,result[0])<40)result.shift();
 return result;
}
function moveViaJungle(u,goal,dt){
 const stale=!u.navPath||
  (u.navPath.length>0&&u.navIndex>=u.navPath.length&&dist(u,goal)>105)||
  state.time>(u.navUntil||0)||!u.navDestination||dist(u.navDestination,goal)>65;
 if(stale){
  u.navDestination={x:goal.x,y:goal.y};
  u.navPath=findJunglePath(u,goal);
  u.navIndex=0;u.navUntil=state.time+5;
 }
 let point=u.navPath[u.navIndex];
 while(point&&dist(u,point)<24){u.navIndex++;point=u.navPath[u.navIndex]}
 if(!point)point=goal;
 moveToward(u,point,dt,.91);
}
function approachCreep(u,c,dt){
 if(!c||c.hp<=0)return false;
 const d=dist(u,c),range=attackRange(u)+solidRadius(c)-4;
 if(d>range){
  const base=HOME[u.side],n=norm(c.x-base.x,c.y-base.y);
  const approach=Math.max(12,range-13);
  const goal={x:c.x-n.x*approach,y:c.y-n.y*approach};
  moveViaJungle(u,goal,dt);
 }else{
  u.facing=Math.atan2(c.y-u.y,c.x-u.x);
  if(u.attackCd<=0&&!u.casting)autoAttack(u);
 }
 return true;
}
function botJungler(u,dt){
 if(!u.jungler)return false;
 if(u.jungleGoal&&(u.jungleGoal.hp<=0||
    (u.jungleGoal.unlock&&state.time<u.jungleGoal.unlock))){
  u.jungleGoal=null;u.gankUntil=state.time+15;
 }
 const nearbyThreat=living(1-u.side,'hero')
  .some(e=>visibleTo(u.side,e)&&dist(e,u)<225);
 if(nearbyThreat){u.jungleGoal=null;u.gankUntil=Math.max(u.gankUntil||0,state.time+7);return false}
 const boss=openBoss();
 const healthy=living(u.side,'hero').filter(h=>h.hp/h.maxHp>.53);
 const supports=healthy.filter(h=>!h.jungler&&dist(h,boss||u)<880);
 const contest=boss&&healthy.length>=3&&u.level>=3;
 if(contest&&(!u.jungleGoal||u.jungleGoal.kind!=='boss'))u.jungleGoal=boss;
 if(!u.jungleGoal){
  if((u.gankUntil||0)>state.time)return false;
  const preferred=u.side===0?['wolvesA','veilA','emberA','golemA']:['golemA','emberA','veilA','wolvesA'];
  const available=state.camps.filter(c=>c.hp>0&&c.kind!=='boss'&&
     (!c.unlock||state.time>=c.unlock));
  available.sort((a,b)=>preferred.indexOf(a.id)-preferred.indexOf(b.id)+
    (dist(a,u)-dist(b,u))*.0016);
  u.jungleGoal=available[0]||null;
 }
 const camp=u.jungleGoal;
 if(!camp)return false;
 if(u.visionCd<=0&&state.time>26&&
    (camp.kind==='boss'||state.brushes.some(b=>dist(b,u)<240))){
  const pos={x:u.x+(camp.x-u.x)*.55,y:u.y+(camp.y-u.y)*.55};
  if(dist(u,pos)<440)placeWard(u,pos.x,pos.y);
 }
 if(u.hp/u.maxHp<.33){u.aiRetreat=true;u.jungleGoal=null;return false}
 if(camp.kind==='boss'&&dist(u,camp)>1150)return false;
 approachCreep(u,camp,dt);
 if(dist(u,camp)<125){
  if(u.id==='vexor'&&u.cooldowns.vexor_whirl<=0&&u.energy>=skillDef('vexor_whirl').cost){
   cast(u,'vexor_whirl',null,camp);
  }else if(u.id==='orun'&&u.cooldowns.orun_quake<=0&&u.energy>=skillDef('orun_quake').cost){
   cast(u,'orun_quake',null,camp);
  }
 }
 return true;
}
// Quando o jungler começa um grande objetivo, um guardião ou suporte vem protegê-lo.
function botSupportBoss(u,dt){
 if(u.controlled||u.jungler||!['orun','seris','nyra'].includes(u.id))return false;
 const boss=state.camps.find(c=>c.kind==='boss'&&c.hp>0&&c.hp<c.maxHp*.92&&
   c.aggroTarget&&c.aggroTarget.side===u.side&&dist(c,u)<1150);
 if(!boss||u.hp/u.maxHp<.52||u.level<2||
  living(1-u.side,'hero').some(e=>visibleTo(u.side,e)&&dist(e,u)<190)){
  if(u.jungleGoal&&u.jungleGoal.kind==='boss')u.jungleGoal=null;
  return false;
 }
 u.jungleGoal=boss;approachCreep(u,boss,dt);
 if(u.id==='orun'&&dist(u,boss)<138&&u.cooldowns.orun_quake<=0)
  cast(u,'orun_quake',null,boss);
 if(u.id==='nyra'&&dist(u,boss)<325&&u.cooldowns.nyra_bolt<=0)
  cast(u,'nyra_bolt',null,boss);
 if(u.id==='seris'&&u.cooldowns.seris_aegis<=0&&u.energy>=skillDef('seris_aegis').cost){
  const teammates=living(u.side,'hero').filter(h=>dist(h,u)<200&&h.hp/h.maxHp<.68);
  if(teammates.length)cast(u,'seris_aegis',null,teammates[0]);
 }
 if(u.visionCd<=0&&state.time>70)placeWard(u,boss.x,boss.y);
 return true;
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
  u.jungleGoal=null;
  moveToward(u,HOME[u.side],dt);
  if(dist(u,HOME[u.side])<120){
   u.aiRetreat=false;heal(u,u.maxHp*.56);u.energy=maxEnergy(u);
   botShop(u);
  }
  return;
 }
 if(window.FendaTeamAI?.handleBot(u,dt))return;
 if(botJungler(u,dt))return;
 if(botSupportBoss(u,dt))return;
 const enemyHeroes=living(enemySide,'hero')
  .filter(e=>visibleTo(u.side,e)&&dist(e,u)<340).sort((a,b)=>dist(u,a)-dist(u,b));
 const enemyWave=living(enemySide,'minion')
  .filter(e=>visibleTo(u.side,e)&&e.lane===lane&&dist(e,u)<350).sort((a,b)=>dist(u,a)-dist(u,b));
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
   if(c.respawn<=0){c.hp=c.maxHp;c.aggroTarget=null;c.attackCd=1;addEffect(c.x,c.y,c.color,55,.55)}
   continue;
  }
  if(c.unlock&&state.time<c.unlock)continue;
  c.attackCd=Math.max(0,(c.attackCd===undefined?1:c.attackCd)-dt);
  let target=c.aggroTarget;
  if(!target||target.hp<=0||dist(target,c)>240||state.time>(c.aggroUntil||0)){
   target=living(null,'hero').filter(u=>dist(u,c)<95)
    .sort((a,b)=>dist(a,c)-dist(b,c))[0]||null;
   c.aggroTarget=target;
  }
  if(target&&dist(target,c)<155+(c.kind==='boss'?45:0)){
   c.aggroUntil=state.time+4;
   if(c.attackCd<=0){
    const damageValue=c.kind==='boss'?(c.id==='titan'?27:19):c.kind==='buff'?15:11;
    damage(target,damageValue,c);
    addEffect(target.x,target.y,c.color,20,.25,'hit');
    c.attackCd=c.kind==='boss'?1.95:2.25;
   }
  }else if(c.hp<c.maxHp){
   c.hp=Math.min(c.maxHp,c.hp+dt*2.4); // Reinicia lentamente caso o caçador abandone o campo.
  }
 }
}
function damageCreep(c,amount,source){
 if(!c||c.hp<=0||c.unlock&&state.time<c.unlock)return;
 if(source&&source.kind==='hero'){
  c.aggroTarget=source;c.aggroUntil=state.time+5;
  c.lastHitSide=source.side;
 }
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
 u.skillFlash=.42;
 const slow=(target,seconds)=>{target.slow=Math.max(target.slow,seconds)};
 if(['lyria_step','vexor_lunge','orun_charge','vexor_ult'].includes(id)){
  const dashLength=def.range+lv*7,duration=id==='vexor_ult'?.25:.18;
  u.skillFlash=.35;
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
// Colisão contínua: não depende de o projétil terminar exatamente sobre o alvo.
function segmentHit(ax,ay,bx,by,cx,cy,r){
 const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
 const t=den>0?clamp(((cx-ax)*dx+(cy-ay)*dy)/den,0,1):0;
 const px=ax+dx*t,py=ay+dy*t;
 return (px-cx)*(px-cx)+(py-cy)*(py-cy)<=r*r?t:null;
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
   const ax=p.x,ay=p.y,bx=p.x+p.vx*dt,by=p.y+p.vy*dt;
   const length=Math.hypot(bx-ax,by-ay),remaining=Math.max(0,p.range-p.travel);
   const fraction=length>0?Math.min(1,remaining/length):1;
   const endX=ax+(bx-ax)*fraction,endY=ay+(by-ay)*fraction;
   let first=null,firstT=Infinity;
   for(const u of living(1-p.side)){
    const hit=segmentHit(ax,ay,endX,endY,u.x,u.y,u.r+p.r);
    if(hit!==null&&hit<firstT){firstT=hit;first={kind:'unit',target:u}}
   }
   for(const c of state.camps){
    if(c.hp<=0||c.unlock&&state.time<c.unlock)continue;
    const hit=segmentHit(ax,ay,endX,endY,c.x,c.y+(c.hover||0),28+p.r);
    if(hit!==null&&hit<firstT){firstT=hit;first={kind:'creep',target:c}}
   }
   // Rochas e árvores interceptam feitiços, mas não roubam a mira de AA travado.
   for(const o of nearSolids(ax,ay,length+35)){
    if(o.kind!=='rock'&&o.kind!=='tree')continue;
    const hit=segmentHit(ax,ay,endX,endY,o.x,o.y,o.r+p.r*.60);
    if(hit!==null&&hit<firstT){firstT=hit;first={kind:'terrain',target:o}}
   }
   p.x=first?ax+(endX-ax)*firstT:endX;
   p.y=first?ay+(endY-ay)*firstT:endY;
   p.travel+=Math.hypot(p.x-ax,p.y-ay);
   if(first){
    if(first.kind==='unit'){
     damage(first.target,p.damage,p.source);
     first.target.stun=Math.max(first.target.stun,p.stun||0);
     first.target.slow=Math.max(first.target.slow,p.slow||0);
    }else if(first.kind==='creep')damageCreep(first.target,p.damage,p.source);
    addEffect(p.x,p.y,p.color,p.r+14,.23,'hit');p.life=0;
   }else if(p.travel>=p.range-.01)p.life=0;
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
 u.marked=Math.max(0,(u.marked||0)-dt);
 u.invuln=Math.max(0,u.invuln-dt);
 if(u.shield>0&&state.time>=(u.shieldUntil||0))u.shield=0;
 u.guard=Math.max(0,u.guard-dt*.02);
 u.attackCd=Math.max(0,u.attackCd-dt);
 u.attackAnim=Math.max(0,(u.attackAnim||0)-dt);
 u.attackHit=Math.max(0,(u.attackHit||0)-dt);
 u.skillFlash=Math.max(0,(u.skillFlash||0)-dt);
 if(u.attackPending){
  if(u.stun>0){u.attackPending=null}
  else{
   u.attackPending.time-=dt;
   if(u.attackPending.time<=0){
    const shot=u.attackPending;u.attackPending=null;
    finishAttack(u,shot);
   }
  }
 }
 if(u.kind==='hero')for(const id in u.cooldowns)u.cooldowns[id]=Math.max(0,u.cooldowns[id]-dt);
 if(u.kind==='hero'){
  u.visionCd=Math.max(0,(u.visionCd||0)-dt);
  u.gold=Math.min(20000,u.gold+dt*1.15);
  u.energy=clamp(u.energy+dt*((u.homeBuff>state.time?19:12)+
    (state.teamBuffs[u.side].serpe>state.time?4:0)),0,maxEnergy(u));
  u.aiTimer-=dt;
  u.hp=Math.min(u.maxHp,u.hp+dt*(dist(u,HOME[u.side])<150?24:1.15+
   (state.teamBuffs[u.side].serpe>state.time?1.65:0)));
  if(u.recall>0){
   if(u.controlled){u.recall-=dt;if(u.recall<=0){const home=HOME[u.side];
     const mid=pathPos(1,.11),out=norm(mid.x-HOME[0].x,mid.y-HOME[0].y);
     const dir=u.side===0?out:{x:-out.x,y:-out.y};
     u.x=home.x+dir.x*104;u.y=home.y+dir.y*104;
     u.hp=u.maxHp;u.energy=maxEnergy(u);announce('RETORNO AO SANTUÁRIO',1.6)}}
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
    if(hit){d.hit.add(target.uid);if(d.dmg>0)damage(target,d.dmg,u);target.stun=Math.max(target.stun,d.stun)}
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
 state.wards=state.wards.filter(w=>w.until>state.time);
 const hero=state.hero;
 if(hero&&hero.recall>0&&Math.hypot(movement.x,movement.y)>.07){
  hero.recall=0;announce('RETORNO CANCELADO: MOVIMENTO',1.2);
 }
 if(hero&&hero.hp>0&&!hero.dash&&hero.stun<=0&&!hero.recall){
  const direction=norm(movement.x,movement.y),len=Math.min(1,Math.hypot(movement.x,movement.y));
  if(len>.06){
   const target=hero.commandTarget;
   if(target&&isAttackCommandValid(hero,target)&&dist(hero,target)>attackRange(hero)+solidRadius(target)-7){
    moveToward(hero,target,dt,hero.casting?.58:1);
   }else{
    movePhysical(hero,direction.x*moveSpeed(hero)*dt*len*(hero.casting?.58:1),
     direction.y*moveSpeed(hero)*dt*len*(hero.casting?.58:1));
    hero.facing=Math.atan2(direction.y,direction.x);
   }
  }
 }
 if(state.time>=state.nextWave){
  makeWave();state.nextWave=state.time+21;
 }
 // A decisão coletiva é atualizada pela IA antes do movimento dos bots.
 window.FendaTeamAI?.scan();
 for(const u of state.units){tickUnit(u,dt);if(state.mode!=='playing')break}
 if(state.mode!=='playing')return;
 separateUnits();
 refreshVision();
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
 start,step,cast,autoAttack,focusTower,commandAttack,clearAttackCommand,isAttackCommandValid,buyItem,recall,damage,heal,announce,makeWave,LANE_HALF_WIDTH,ROUTE_PATHS,ROUTE_TOTALS,routePoint,routeProjection,JUNGLE_LINKS,
 living,attackRange,moveSpeed,findAA,nearestEnemy,enemyCreep,pathPos,dist,norm,clamp,addEffect,movePhysical,moveToward,botUseSkill,pushOutsideSolids,separateUnits,solidBodies,brushAt,refreshVision,isPointVisible,visibleTo,placeWard,VISION_CELL,VISION_COLS,VISION_ROWS};
})();