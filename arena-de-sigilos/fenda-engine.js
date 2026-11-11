(function(){
'use strict';
const C=window.SigilsCore;
if(!C){console.error('Fenda: núcleo de campeões não carregado');return;}
const W=3300,H=2500,TAU=Math.PI*2;
// Um deslocamento base-a-base deve durar ~27–30 s, não 11–13 s como na v4.1.
const MOBA_WALK_SCALE=.55;
// Escala compartilhada da pista, torres e câmera. Corredor largo o bastante
// para movimentação lateral e legível em landscape; paredes ficam fora dele.
const LANE_HALF_WIDTH=145,LANE_MINION_SPREAD=33;
// Alcances defensivos compartilhados com câmera, rota e IA.
const TURRET_RANGE=330,CORE_RANGE=345,TOWERS_PER_LANE=2;
// Fenda 6.3: desenho 100% procedural de três lanes realmente independentes.
// Cada trajeto começa fora do santuário e termina na outra base. Simetria rotacional.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x,y)=>{const n=Math.hypot(x,y)||1;return{x:x/n,y:y/n}};
const SIDE=['#69e6e4','#ed829e'];
const HOME=[{x:250,y:2245},{x:3050,y:255}];
const CORE=[{x:485,y:2035},{x:2815,y:465}];
// Portão TOP: borda NORTE da base; MID: borda LESTE; BOT: borda SUL.
// Uma rota só começa ao sair da praça. Nenhuma pista cruza a praça da fonte.
const TOP_PATH=[
 {x:345,y:1740},{x:344,y:1430},{x:352,y:1050},
 {x:380,y:690},{x:540,y:415},{x:860,y:280},
 {x:1290,y:230},{x:1810,y:230},{x:2260,y:240},
 {x:2570,y:180}
];
// Corredor central diagonal com simetria exata em relação ao meio do campo.
const MID_PATH=[
 {x:730,y:1950},{x:990,y:1750},{x:1300,y:1530},
 {x:1650,y:1250},{x:2000,y:970},{x:2310,y:750},{x:2570,y:550}
];
const rotateHalf=p=>({x:W-p.x,y:H-p.y});
const PATHS=[TOP_PATH,MID_PATH,TOP_PATH.slice().reverse().map(rotateHalf)];
const BASE_GATE=[
 PATHS.map(pts=>({...pts[0]})),
 PATHS.map(pts=>({...pts[pts.length-1]}))
];
// Apenas atalhos de navegação para a IA, nunca desenhados como rotas.
const JUNGLE_LINKS=[
 {lane:0,t:.35,x:805,y:910},{lane:1,t:.35,x:1300,y:1160},
 {lane:1,t:.65,x:2000,y:1340},{lane:2,t:.65,x:2495,y:1590}
];
// Construção determinística, legível e ESPELHADA em 180 graus.
// Nove maciços por lado: uma borda externa, quatro divisórias da rota
// lateral e quatro barreiras da mid; os vãos são passagens de gank.
// Cada vértice serve igualmente para física, minimapa e Canvas.
// Geometria mínima no estilo da arena original.
// As rotas são definidas por poucos anteparos FÍSICOS de espessura discreta.
// Sem muralha na borda: os limites do próprio mundo já bloqueiam a passagem.
// Espelhamento de 180 graus produz os setores equivalentes do outro time.
const JUNGLE_RIDGES=[
 {id:'top-1',half:31,pts:[[635,1550],[635,1320]]},
 {id:'top-2',half:31,pts:[[635,1000],[635,750],[740,560],[960,525]]},
 {id:'top-3',half:34,pts:[[1250,520],[1700,520]]},
 {id:'top-4',half:33,pts:[[2000,520],[2180,515]]},
 {id:'mid-1',half:30,pts:[[805,1585],[1020,1420]]},
 {id:'mid-2',half:30,pts:[[1210,1270],[1450,1085]]},
 {id:'mid-3',half:30,pts:[[1095,1970],[1335,1790]]},
 {id:'mid-4',half:30,pts:[[1560,1615],[1680,1525]]}
];
const roles={orun:0,nyra:1,lyria:2,seris:2,vexor:1,brax:0,zhira:1};
// Componentes e receitas. Custo final é SEMPRE o preço total do produto;
// comprar pré-itens abate ouro e libera espaços ao combiná-los.
const ITEMS=[
 {id:'lens',name:'Lente Astral',tier:1,price:300,icon:'◈',stats:{ad:12},stat:'+12 AD',desc:'Componente de dano físico'},
 {id:'ward',name:'Placa Rúnica',tier:1,price:325,icon:'⬡',stats:{hp:95},stat:'+95 PV',desc:'Componente defensivo'},
 {id:'stride',name:'Passo Veloz',tier:1,price:290,icon:'➤',stats:{move:.08},stat:'+8% MOV',desc:'Componente de mobilidade'},
 {id:'cell',name:'Célula Astral',tier:1,price:300,icon:'ϟ',stats:{mana:90},stat:'+90 mana',desc:'Componente de energia'},
 {id:'prism',name:'Prisma Menor',tier:1,price:340,icon:'◇',stats:{ap:.13},stat:'+13% poder',desc:'Componente mágico'},
 {id:'core',name:'Engrenagem',tier:1,price:340,icon:'✦',stats:{haste:.08},stat:'+8% aceleração',desc:'Componente de recarga'},
 {id:'astralbow',name:'Arco do Eclipse',tier:2,price:1440,icon:'➹',
  recipe:['lens','lens','stride'],stats:{ad:37,move:.06},passive:'execution',
  stat:'+37 AD · +6% MOV',desc:'Ataques mais fortes contra inimigos feridos'},
 {id:'stormblade',name:'Lâmina da Tempestade',tier:2,price:1450,icon:'⚔',
  recipe:['lens','prism','core'],stats:{ad:24,ap:.18,haste:.10},passive:'surge',
  stat:'+24 AD · +18% poder · +10% acel.',desc:'Após usar habilidade, próximo AA causa dano extra'},
 {id:'bulwark',name:'Bastião Ancestral',tier:2,price:1480,icon:'⬢',
  recipe:['ward','ward','core'],stats:{hp:310,haste:.11},passive:'fortify',
  stat:'+310 PV · +11% acel.',desc:'Proteção periódica ao ficar com pouca vida'},
 {id:'titanplate',name:'Égide do Titã',tier:2,price:1460,icon:'▣',
  recipe:['ward','cell','core'],stats:{hp:230,mana:160,haste:.12,regen:1.8},
  stat:'+230 PV · +160 mana · +12% acel.',desc:'Resistência e regeneração'},
 {id:'swiftboots',name:'Botas do Horizonte',tier:2,price:1360,icon:'➠',
  recipe:['stride','stride','lens'],stats:{move:.16,ad:20},passive:'pursuit',
  stat:'+16% MOV · +20 AD',desc:'Ataques ganham vigor ao perseguir'},
 {id:'archmage',name:'Cetro do Arcanista',tier:2,price:1510,icon:'✺',
  recipe:['prism','prism','cell'],stats:{ap:.41,mana:225},passive:'arcane',
  stat:'+41% poder · +225 mana',desc:'Habilidades ficam mais poderosas'},
 {id:'hourglass',name:'Ampulheta Protetora',tier:2,price:1500,icon:'◈',
  recipe:['prism','core','ward'],stats:{ap:.29,hp:165,haste:.16},passive:'fortify',
  stat:'+29% poder · +165 PV · +16% acel.',desc:'Poder, defesa e proteção emergencial'},
 {id:'deepsea',name:'Orbe do Oceano',tier:2,price:1430,icon:'◉',
  recipe:['cell','cell','prism'],stats:{mana:370,ap:.25,regen:2.4},passive:'renewal',
  stat:'+370 mana · +25% poder',desc:'Mana, regeneração e sustentação'},
 {id:'warheart',name:'Coração do Confronto',tier:2,price:1490,icon:'⚒',
 recipe:['lens','ward','core'],stats:{ad:23,hp:260,haste:.09},passive:'sustain',
 stat:'+23 AD · +260 PV · +9% acel.',desc:'Recupera vida em ataques corpo a corpo contra campeões'},
 {id:'huntress',name:'Lâmina da Caçadora',tier:2,price:1420,icon:'❖',
 recipe:['lens','stride','core'],stats:{ad:22,move:.10,haste:.08},passive:'hunter',
 stat:'+22 AD · +10% MOV · +8% acel.',desc:'Amplifica dano contra monstros da selva'}
];
const ITEM_BY_ID=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
const itemStats=(unit,key)=>(unit?.items||[]).reduce((total,id)=>
 total+(ITEM_BY_ID[id]?.stats?.[key]||0),0);
const recipeStatus=(unit,id)=>{
 const item=ITEM_BY_ID[id];if(!item)return null;
 const recipe=item.recipe||[],owned=(unit?.items||[]).slice(),
  used=[],missing=[];
 for(const part of recipe){
  const at=owned.indexOf(part);
  if(at>=0){owned.splice(at,1);used.push(part);}
  else missing.push(part);
 }
 const paid=used.reduce((sum,part)=>sum+ITEM_BY_ID[part].price,0);
 return{item,used,missing,remaining:Math.max(0,item.price-paid),
   ready:missing.length===0,
   spacesAfter:(unit?.items?.length||0)-used.length+1};
};
function applyItemPurchase(unit,id,ai=false){
 const item=ITEM_BY_ID[id];
 if(!item)return{ok:false,reason:'ITEM DESCONHECIDO'};
 if(unit.hp<=0)return{ok:false,reason:'AGUARDE RESSURGIR'};
 if(dist(unit,HOME[unit.side])>(ai?245:240))return{ok:false,reason:'COMPRAS APENAS NO SANTUÁRIO'};
 if(item.tier===2&&(unit.items||[]).includes(id))return{ok:false,reason:'EQUIPAMENTO JÁ COMPLETO'};
 const recipe=recipeStatus(unit,id);
 if(recipe.missing.length)return{ok:false,reason:'ADQUIRA OS COMPONENTES ANTES DE COMBINAR'};
 if(recipe.spacesAfter>6)return{ok:false,reason:'INVENTÁRIO LOTADO (6 ESPAÇOS)'};
 if(unit.gold<recipe.remaining)return{ok:false,reason:'OURO INSUFICIENTE'};
 const oldHP=itemStats(unit,'hp'),oldMana=maxMana(unit);
 for(const part of recipe.used)unit.items.splice(unit.items.indexOf(part),1);
 unit.items.push(id);unit.gold-=recipe.remaining;
 const hpDiff=itemStats(unit,'hp')-oldHP;
 unit.maxHp=Math.max(1,unit.maxHp+hpDiff);
 unit.hp=clamp(unit.hp+Math.max(0,hpDiff),1,unit.maxHp);
 const manaDiff=maxMana(unit)-oldMana;
 unit.mana=clamp(unit.mana+Math.max(0,manaDiff),0,maxMana(unit));
 return{ok:true,item,cost:recipe.remaining,consumed:recipe.used};
}
// Ranks escolhidos pelo jogador, bots evoluem automaticamente.
// Habilidades básicas: rank 1 inicial, até 5. Ultimate: níveis 5/9/13.
const BASIC_RANK_MAX=5,ULT_RANK_MAX=3,MAX_HERO_LEVEL=15;
const skillRank=(unit,id)=>unit?.skillLevels?.[id]||0;
const skillRankCap=(unit,id)=>{
 if(!unit||!C.heroes[unit.id])return 0;
 const ultimate=id===C.heroes[unit.id].ultimate;
 return ultimate?Math.min(ULT_RANK_MAX,Math.max(0,1+Math.floor((unit.level-5)/4))):
 Math.min(BASIC_RANK_MAX,Math.max(1,Math.floor(unit.level/2)+1));
};
function upgradeSkill(unit,id){
 if(!unit||unit.kind!=='hero'||unit.hp<=0||!unit.skillLevels||!Object.hasOwn(unit.skillLevels,id))
  return{ok:false,reason:'HABILIDADE INVÁLIDA'};
 if(unit.skillPoints<1)return{ok:false,reason:'SEM PONTOS DE HABILIDADE'};
 const rank=skillRank(unit,id),cap=skillRankCap(unit,id);
 if(rank>=cap)return{ok:false,reason:cap===0?'ULTIMATE DISPONÍVEL NO NÍVEL 5':'RANK MÁXIMO PARA ESTE NÍVEL'};
 unit.skillLevels[id]=rank+1;unit.skillPoints--;
 if(unit.controlled)announce(C.skills[id].short.toUpperCase()+' · RANK '+(rank+1),1.6);
 return{ok:true,rank:rank+1};
}
function botUpgradeSkills(unit){
 if(!unit||unit.kind!=='hero'||unit.controlled)return;
 const h=C.heroes[unit.id],priority={
  lyria:[h.skills[0],h.skills[2],h.skills[1]],
  nyra:[h.skills[0],h.skills[1],h.skills[2]],
  vexor:[h.skills[0],h.skills[1],h.skills[2]],
  orun:[h.skills[2],h.skills[0],h.skills[1]],
  seris:[h.skills[1],h.skills[2],h.skills[0]],
 brax:[h.skills[0],h.skills[2],h.skills[1]],
 zhira:[h.skills[0],h.skills[1],h.skills[2]]
 }[unit.id]||h.skills;
 while(unit.skillPoints>0){
  const ult=skillRank(unit,h.ultimate)<skillRankCap(unit,h.ultimate)?h.ultimate:null;
 const unlearned=priority.find(id=>skillRank(unit,id)===0&&skillRankCap(unit,id)>0);
 const available=priority.filter(id=>skillRank(unit,id)<skillRankCap(unit,id));
 const next=ult||unlearned||available[0];if(!next)break;
 const res=upgradeSkill(unit,next);if(!res.ok)break;
 }
}
const state={mode:'menu',time:0,w:W,h:H,camera:{x:0,y:0},units:[],structures:[],projectiles:[],
 effects:[],jungle:[],camps:[],obstacles:[],walls:[],wards:[],brushes:[],sight:[[],[]],seen:[null,null],
 visionUpdate:-1,teamBuffs:[{serpe:0,titan:0},{serpe:0,titan:0}],
 hero:null,focused:null,kills:[0,0],wave:0,nextWave:4,
 flash:0,score:0,marker:null,shopOpen:false,showPause:false,notice:'',noticeUntil:0,
 nextObjectives:50,buffUntil:0,win:null,selectedHero:'lyria',seq:0,sounds:true};
const rando=(a,b)=>a+Math.random()*(b-a),hData=id=>C.heroes[id];
// Alcances calibrados no espaço da Fenda (o modo Arena original não é alterado).
const MOBA_SKILL_RANGES={
 // Pokes devem exigir risco de se aproximar da torre (alcance 330).
 lyria_pierce:[315,17],lyria_step:[125,0],lyria_rain:[230,74],lyria_ult:[283,105],
 vexor_lunge:[125,26],vexor_whirl:[0,80],vexor_mark:[190,54],vexor_ult:[175,42],
 orun_charge:[120,38],orun_quake:[0,105],orun_ult:[0,140],
 nyra_bolt:[302,17],nyra_rift:[222,62],nyra_ult:[274,107],
 seris_tether:[274,18],seris_bloom:[240,90],seris_aegis:[0,138],seris_ult:[0,168],
 brax_cleave:[0,83],brax_grapple:[116,31],brax_fortify:[0,107],brax_ult:[0,140],
 zhira_strike:[246,20],zhira_pounce:[126,29],zhira_trap:[228,63],zhira_ult:[0,92]
};
const MOBA_SKILL_CACHE={};
const skillDef=id=>{
 if(MOBA_SKILL_CACHE[id])return MOBA_SKILL_CACHE[id];
 const original=C.skills[id];if(!original)return null;
 const val=MOBA_SKILL_RANGES[id];
 return MOBA_SKILL_CACHE[id]={...original,
  ...(val?val[0]?{range:val[0]}:{}:{}),
  ...(val&&val[1]?{radius:val[1]}:{}),
  cost:Math.round(original.cost*1.55)};
};
const living=(side,kind)=>state.units.filter(u=>u.hp>0&&(side==null||u.side===side)&&(!kind||u.kind===kind));
const maxMana=u=>320+Math.max(0,(u.level||1)-1)*16+itemStats(u,'mana');
const WARD_RANGE=280;
const HERO_AA_RANGE={orun:67,vexor:72,lyria:195,nyra:180,seris:176,brax:72,zhira:70};
const HERO_AA_DAMAGE_FACTOR={orun:.78,vexor:.92,lyria:.95,nyra:.75,seris:.79,brax:.86,zhira:.83};
const HERO_AA_SPEED_FACTOR={orun:1.08,vexor:.98,lyria:.86,nyra:1.04,seris:1.09,brax:1.04,zhira:.99};
const attackRange=u=>u.kind==='minion'?(u.id==='siege'?207:u.ranged?140:38):
 u.kind==='creep'?48:(HERO_AA_RANGE[u.id]||170);
const moveSpeed=u=>u.speed*(1+Math.min(.24,itemStats(u,'move'))+(u.huntUntil>state.time?.13:0))*(u.slow>0?.62:1);
const attackDamage=u=>u.atk+itemStats(u,'ad');
const spellPower=(u,id)=>1+itemStats(u,'ap')+
 (id&&['lyria','vexor','orun','brax','zhira'].includes(u.id)?itemStats(u,'ad')*.005:0);
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
   if(obj.hp>0&&obj.side===team)
    // A visão defensiva precisa cobrir TODA a área de ataque,
    // inclusive a borda oposta da lane e o raio do campeão.
    sight.push(createSightSource(obj.x,obj.y,obj.range+95));
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
 if(dist(hero,pos)>WARD_RANGE+1)return{ok:false,reason:'FORA DO ALCANCE DA SENTINELA'};
 state.wards=state.wards.filter(w=>w.until>state.time);
 const existing=state.wards.filter(w=>w.side===hero.side);
 if(existing.length>=3){
  const oldest=existing.sort((a,b)=>a.until-b.until)[0];
  state.wards=state.wards.filter(w=>w!==oldest);
 }
 hero.visionCd=48;
 const ward={uid:++state.seq,side:hero.side,x:pos.x,y:pos.y,r:295,until:state.time+85,kind:'ward'};
 state.wards.push(ward);refreshVision(true);
 addEffect(ward.x,ward.y,hero.side===0?'#8ef1d4':'#f5a6bb',48,.55,'blast');
 if(hero.controlled)announce('SENTINELA DE VISÃO INSTALADA · 85s',2);
 return{ok:true,ward};
}

function buildMap(){
 state.structures=[];state.camps=[];state.obstacles=[];state.walls=[];
 // Selva sem estradas extras: áreas de visão compartilhadas em pares simétricos.
 const bushes=[{x:690,y:1300},{x:960,y:1060},{x:1480,y:880},{x:1920,y:650}];
 state.brushes=[];
 for(let i=0;i<bushes.length;i++){
  const p=bushes[i],mirror=rotateHalf(p),r=69+(i%2)*8;
  state.brushes.push({id:'veil-a-'+i,...p,r});
  state.brushes.push({id:'veil-b-'+i,...mirror,r});
 }
 // Duas torres por equipe e rota (T1 externa e T2 interna). Sem T3.
 // Posições simétricas nas três rotas e espaçadas para mostrar só
 // uma frente defensiva por vez no enquadramento próximo do combate.
 for(let side=0;side<2;side++){
  const home=CORE[side];
  state.structures.push({kind:'core',side,x:home.x,y:home.y,maxHp:1850,hp:1850,
   r:46,atk:53,range:CORE_RANGE,attackCd:0,id:'core'+side});
  for(let lane=0;lane<3;lane++)for(let tier=0;tier<TOWERS_PER_LANE;tier++){
   // T1 externa distante do centro; T2 e T3 recuam progressivamente à base.
   // Espaço central neutro suficiente para combate antes do alcance das torres.
   // T1 próxima do centro do mapa; T2 defende o acesso à base.
   // T1 de equipes adversárias ficam fora do raio uma da outra,
   // abrindo uma faixa realmente neutra para o encontro das ondas.
   // As duas torres de cada equipe permanecem bem separadas.
   const positions=lane===1?[.29,.07]:[.315,.085];
   const t=(side===0?positions:positions.map(t=>1-t))[tier];
   const p=pathPos(lane,t),a=pathPos(lane,Math.max(0,t-.004)),b=pathPos(lane,Math.min(1,t+.004));
   const direction=norm(b.x-a.x,b.y-a.y);
   // Mid usa o lado oposto ao Bot: evita torres de rotas distintas juntas.
   const sign=lane===0?1:lane===2?-1:side===0?-1:1;
   const offset=165;
   const x=p.x-direction.y*offset*sign,y=p.y+direction.x*offset*sign;
   state.structures.push({kind:'tower',side,lane,tier:tier+1,x,y,
    r:27,hp:880,maxHp:880,atk:58,range:TURRET_RANGE,attackCd:0,
    id:'tower'+side+'-'+lane+'-'+tier});
  }
 }
 // Acampamentos apenas nas áreas não pavimentadas, longe das três rotas.
 const camps=[
  {id:'veilA',x:880,y:830,kind:'buff',name:'Véu Azul',color:'#75caff',hp:630,buff:'energy'},
  {id:'emberA',x:2420,y:1670,kind:'buff',name:'Brasa Rubra',color:'#ff9c74',hp:630,buff:'damage'},
  {id:'wolvesA',x:1230,y:1000,kind:'camp',name:'Lobos Astrais',color:'#a7c2ef',hp:360},
  {id:'golemA',x:2070,y:1500,kind:'camp',name:'Golem Sigilar',color:'#e5c58f',hp:450},
  {id:'serpe',x:1560,y:730,kind:'boss',name:'Serpe Astral',color:'#9bf6e9',hp:1030,unlock:55},
  {id:'titan',x:1740,y:1770,kind:'boss',name:'Titã do Abismo',color:'#dfb1fa',hp:1500,unlock:110}
 ];
 state.camps=camps.map(o=>({...o,maxHp:o.hp,respawn:0}));
 // Divisórias reais, sem ornamentos falsos e sem blocos desenhados no solo.
 // Subdivisões de ~78px são SOMENTE hitboxes; a arte agrupa cada cadeia.
 function segmentDistance(obj,a,b){
  const vx=b.x-a.x,vy=b.y-a.y;
  const t=clamp(((obj.x-a.x)*vx+(obj.y-a.y)*vy)/Math.max(1,vx*vx+vy*vy),0,1);
  return Math.hypot(obj.x-a.x-t*vx,obj.y-a.y-t*vy);
 }
 for(const ridge of JUNGLE_RIDGES)for(let side=0;side<2;side++){
  const pts=ridge.pts.map(([x,y])=>side===0?{x,y}:rotateHalf({x,y}));
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],parts=Math.ceil(dist(a,b)/78);
   for(let u=0;u<parts;u++){
    const p={x:a.x+(b.x-a.x)*u/parts,y:a.y+(b.y-a.y)*u/parts};
    const q={x:a.x+(b.x-a.x)*(u+1)/parts,y:a.y+(b.y-a.y)*(u+1)/parts};
    state.walls.push({kind:'wall',side,wallClass:'jungle',
     ax:p.x,ay:p.y,bx:q.x,by:q.y,x:(p.x+q.x)/2,y:(p.y+q.y)/2,
     halfWidth:ridge.half,r:dist(p,q)/2+ridge.half,solid:true,
     chain:ridge.id+'-'+side,id:'ridge-'+ridge.id+'-'+i+'-'+u+'-'+side});
   }
  }
 }
 // Não espalhar pedras hexagonais isoladas: elas confundem colisão e mapa.
 // As formas da jungle são massas contínuas definidas por JUNGLE_RIDGES.
 // Pórticos sólidos da base: dois hexágonos físicos por saída. O corredor
 // entre eles tem 168 unidades: comporta campeões e formações de tropas.
 // A renderização lê estes MESMOS obstáculos em vez de pintar portões falsos.
 for(let side=0;side<2;side++)for(let lane=0;lane<3;lane++){
  const gate=BASE_GATE[side][lane],t=side===0?.018:.982;
  const ahead=pathPos(lane,t),dx=ahead.x-gate.x,dy=ahead.y-gate.y;
  const perpendicular=norm(-dy,dx);
  for(const sign of [-1,1]){
   const x=gate.x+perpendicular.x*84*sign;
   const y=gate.y+perpendicular.y*84*sign;
   state.obstacles.push({kind:'gate',side,lane,x,y,r:22,solid:true});
  }
 }
 // Perímetro REAL do santuário. O desenho externo não é mais apenas
 // decorativo: há paredes sólidas com três aberturas onde o jogador e as
 // tropas realmente cruzam a fronteira da base.
 const baseCenter={x:(HOME[0].x+CORE[0].x)/2,y:(HOME[0].y+CORE[0].y)/2};
 const baseVertices=Array.from({length:8},(_,i)=>{
  const a=Math.PI/8+i*TAU/8;
  return{x:baseCenter.x+322*Math.cos(a),y:baseCenter.y+322*Math.sin(a)};
 });
 function intersection(a,b,c,d){
  const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y;
  const cross=rx*sy-ry*sx;if(Math.abs(cross)<.0001)return null;
  const ax=c.x-a.x,ay=c.y-a.y,t=(ax*sy-ay*sx)/cross;
  const u=(ax*ry-ay*rx)/cross;
  if(t<0||t>1||u<0||u>1)return null;
  return{x:a.x+rx*t,y:a.y+ry*t};
 }
 const openings=BASE_GATE[0].map(gate=>{
  for(let k=0;k<baseVertices.length;k++){
   const point=intersection(HOME[0],gate,baseVertices[k],baseVertices[(k+1)%8]);
   if(point)return point;
  }
  return gate;
 });
 for(let edge=0;edge<baseVertices.length;edge++){
  const a=baseVertices[edge],b=baseVertices[(edge+1)%8];
  const parts=9;let chain=0,previousWasWall=false;
  for(let i=0;i<parts;i++){
   const p={x:a.x+(b.x-a.x)*i/parts,y:a.y+(b.y-a.y)*i/parts},
    q={x:a.x+(b.x-a.x)*(i+1)/parts,y:a.y+(b.y-a.y)*(i+1)/parts};
   const midpoint={x:(p.x+q.x)/2,y:(p.y+q.y)/2};
   // Deixar livre pelo menos 170 unidades em cada portão. Os vãos
   // também abrem as quinas adjacentes quando necessário.
   if(openings.some(o=>segmentDistance(o,p,q)<96)){
    previousWasWall=false;continue;
   }
   if(!previousWasWall)chain++;
   previousWasWall=true;
   for(let side=0;side<2;side++){
    const v=side===0?p:rotateHalf(p),z=side===0?q:rotateHalf(q);
    state.walls.push({kind:'wall',wallClass:'base',side,
     ax:v.x,ay:v.y,bx:z.x,by:z.y,
     x:(v.x+z.x)/2,y:(v.y+z.y)/2,halfWidth:26,
     r:dist(v,z)/2+26,solid:true,
     chain:'base-'+edge+'-'+chain+'-'+side,
     id:'basewall-'+edge+'-'+chain+'-'+i+'-'+side});
   }
  }
 }
 rebuildSolidIndex();
}
function makeHero(id,side,controlled=false){
 const h=hData(id),start=HOME[side],offset=side===0?1:-1;
 // O Núcleo é sólido; os campeões surgem na fonte, fora de sua hitbox.
 const mid=pathPos(1,.11),dir=norm(mid.x-HOME[0].x,mid.y-HOME[0].y);
 const d=side===0?dir:{x:-dir.x,y:-dir.y};
 const spawnOffset=55+(state.seq%3)*13;
 return {uid:++state.seq,kind:'hero',id,side,controlled,
 x:start.x+d.x*spawnOffset+rando(-11,11),
 y:start.y+d.y*spawnOffset+rando(-11,11),r:id==='orun'?21:id==='brax'?20:17.5,speed:h.move*MOBA_WALK_SCALE,
 atk:h.damage*HERO_AA_DAMAGE_FACTOR[id],
 baseHp:h.hp*1.3,maxHp:Math.round(h.hp*1.3),hp:Math.round(h.hp*1.3),
 mana:320,maxMana:320,level:1,xp:0,gold:controlled?550:350,items:[],
 skillLevels:Object.fromEntries([...h.skills,h.ultimate].map((id,index)=>[id,index===0?1:0])),
 skillPoints:0,passiveCd:0,surgeUntil:0,huntUntil:0,manaFreeUntil:0,
 summoners:['flash','ignite'],summonerCooldowns:{},
 lane:roles[id],waypoint:side===0?0:ROUTE_PATHS[roles[id]].length-1,attackCd:0,casting:null,
 cooldowns:Object.fromEntries([...h.skills,h.ultimate].map(k=>[k,0])),
 stun:0,slow:0,shield:0,guard:0,invuln:0,marked:0,attackAnim:0,
 vision:350,death:0,respawn:0,recall:0,lastDamage:0,focus:null,
 aiTimer:rando(.6,1.8),visionCd:0,jungleGoal:null,gankUntil:0,kills:0,deaths:0,assists:0,
 recentDamagers:[],dash:null,commandTarget:null,
 healthRegen:1.3,homeBuff:0,botLane:roles[id],cs:0,focusTarget:null,focusUntil:0,isRanged:!['vexor','orun','brax','zhira'].includes(id)};
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
function start(hero='lyria',summoners=null){
 state.mode='playing';state.time=0;state.units=[];state.projectiles=[];state.effects=[];
 state.selectedHero=C.heroes[hero]?hero:'lyria';state.hero=null;state.structures=[];
 state.kills=[0,0];state.win=null;state.marker=null;state.nextWave=5;state.wave=0;
 state.shopOpen=false;state.showPause=false;state.buffUntil=0;state.score=0;state.seq=0;
 state.wards=[];state.sight=[[],[]];state.seen=[new Uint8Array(VISION_COLS*VISION_ROWS),new Uint8Array(VISION_COLS*VISION_ROWS)];
 state.visionUpdate=-1;state.teamBuffs=[{serpe:0,titan:0},{serpe:0,titan:0}];
 window.FendaTeamAI?.reset();
 buildMap();
 // Cada time mantém TOP, SELVA, MEIO, ATIRADOR e SUPORTE.
 const blue=['orun','zhira','nyra','lyria','seris'];
 if(state.selectedHero==='brax')blue[0]='brax';
 else if(state.selectedHero==='vexor')blue[1]='vexor';
 else if(!blue.includes(state.selectedHero))blue[0]=state.selectedHero;
 const playerIndex=blue.indexOf(state.selectedHero);
 blue.splice(playerIndex,1);blue.unshift(state.selectedHero);
 // Alternância de arquétipos no rubro: Brax e Vexor também são bots oponentes.
 const red=['brax','vexor','nyra','lyria','seris'];
 for(let i=0;i<blue.length;i++){
  const u=makeHero(blue[i],0,i===0);state.units.push(u);if(i===0)state.hero=u;
 }
 for(const id of red)state.units.push(makeHero(id,1));
 state.hero.lane=roles[state.hero.id];
 state.hero.summoners=Array.isArray(summoners)&&summoners.length===2&&
  summoners.every(id=>SUMMONERS[id])&&summoners[0]!==summoners[1]?
  summoners.slice():state.hero.id==='zhira'?['smite','flash']:['flash','ignite'];
 for(const side of [0,1]){
  const units=state.units.filter(u=>u.kind==='hero'&&u.side===side);
  const bots=units.filter(u=>!u.controlled);
  const playerJungle=units.some(u=>u.controlled&&(u.id==='zhira'||u.summoners.includes('smite')));
  const jungler=playerJungle?null:bots.find(u=>u.id==='zhira')||bots.find(u=>u.id==='vexor')||bots[0];
  if(jungler){jungler.jungler=true;jungler.jungleGoal=null}
  for(const u of bots)u.summoners=u.jungler?['smite','flash']:u.id==='seris'?['heal','shield']:['flash','ignite'];
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
 while(hero.level<MAX_HERO_LEVEL&&hero.xp>=levelXp(hero.level)){
  hero.xp-=levelXp(hero.level);hero.level++;hero.skillPoints++;
  hero.maxHp+=31;hero.hp=Math.min(hero.maxHp,hero.hp+28);
  hero.atk+=3;hero.mana=Math.min(maxMana(hero),hero.mana+17);
  botUpgradeSkills(hero);
  if(hero.controlled)announce('NÍVEL '+hero.level+' · ESCOLHA UMA HABILIDADE (+)',2.3);
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
  // Participação real na eliminação: dano recente de campeões em até 10s.
  const recent=(victim.recentDamagers||[]).filter(e=>
   state.time-e.time<=10&&e.hero?.kind==='hero'&&e.hero.side!==victim.side);
  let killer=source?.kind==='hero'&&source.side!==victim.side?source:null;
  if(!killer&&recent.length){
   const latest=recent.reduce((a,b)=>a.time>b.time?a:b);
   killer=latest.hero;
  }
  const winningSide=killer?.side??(source?.side!==victim.side?source?.side:null);
  if(winningSide===0||winningSide===1)state.kills[winningSide]++;
  if(killer){killer.kills++;killer.gold+=210;xpGain(killer,90);}
  for(const assist of new Set(recent.map(e=>e.hero))){
   if(assist===killer)continue; // O aliado eliminado durante a luta ainda recebe assistencia.
   assist.assists=(assist.assists||0)+1;
   assist.gold+=65;xpGain(assist,42);
  }
  victim.recentDamagers=[];
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
    if(victim.buff==='energy')source.mana=maxMana(source);
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
 if(victim.kind==='hero'&&source?.kind==='hero'&&source.side!==victim.side){
  // Registra todos os campeões que contribuíram, não apenas o último golpe.
  victim.recentDamagers=(victim.recentDamagers||[]).filter(e=>
   state.time-e.time<=10&&e.hero!==source);
  victim.recentDamagers.push({hero:source,time:state.time});
 }
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
 const v=Math.max(0,Math.round(Math.min(amount*(target.burnUntil>state.time?.55:1),target.maxHp-target.hp)));
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
 if(u.kind==='hero'&&!u.controlled&&u.farmTarget&&u.farmTarget.hp>0&&
     u.farmTarget.kind==='minion'&&
     dist(u,u.farmTarget)<=range+u.farmTarget.r+2)return u.farmTarget;
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
 const attackFactor=u.kind==='hero'?HERO_AA_SPEED_FACTOR[u.id]||1:1;
 u.attackCd=u.kind==='hero'?
  Math.max(.55,hData(u.id).attackTime*attackFactor*
   (1-Math.min(.20,Math.max(0,u.level-1)*.014))):
  u.id==='siege'?2.15:u.ranged?1.5:1.25;
 u.attackAnim=u.kind==='hero'?.39:.29;
 u.attackTotal=u.attackAnim;
 u.attackWindup=u.kind==='hero'?(u.isRanged?.15:.13):.11;
 let damageVal=attackDamage(u)+(u.homeBuff>state.time?4:0);
 // Passivos dos itens completos: bônus situacionais, não somente estatísticas.
 if(u.kind==='hero'){
  if(u.items.includes('astralbow')&&target.kind!=='tower'&&target.kind!=='core'&&
    target.hp/Math.max(1,target.maxHp)<.45)damageVal*=1.21;
  if(u.items.includes('swiftboots')&&u.walkUntil>state.time)damageVal*=1.075;
  // Passivas de classe adicionam identidade sem bônus contra estruturas.
  if(target.kind!=='tower'&&target.kind!=='core'){
   u.passiveAttacks=(u.passiveAttacks||0)+1;
   if(u.id==='lyria'&&u.passiveAttacks%3===0)damageVal+=12;
   if(u.id==='nyra'&&u.passiveAttacks%3===0)damageVal+=14;
   if(u.id==='vexor'&&u.empoweredUntil>state.time){
    damageVal+=13;u.empoweredUntil=0;
   }
  }
  if(u.items.includes('stormblade')&&u.surgeUntil>state.time){
   damageVal+=19+u.level*2;u.surgeUntil=0;
   addEffect(target.x,target.y,'#eeb5fb',target.r+12,.34,'hit');
  }
 }
 if(u.kind==='hero'){
  if(u.huntUntil>state.time)damageVal+=Math.round(6+u.level*.8);
  if(u.id==='zhira'&&['camp','buff','boss'].includes(target.kind))damageVal*=1.23;
  if(u.items.includes('huntress')&&['camp','buff','boss'].includes(target.kind))damageVal*=1.17;
 }
 damageVal=Math.round(damageVal);
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
  if(u.kind==='hero'&&u.id==='orun'&&u.passiveAttacks%3===0&&
   t.kind!=='tower'&&t.kind!=='core')heal(u,15);
  if(u.kind==='hero'&&t.kind==='hero'&&u.id==='brax')heal(u,Math.round(3+u.level*.55));
  if(u.kind==='hero'&&t.kind==='hero'&&u.items.includes('warheart'))heal(u,Math.round(4+u.level*.35));
  if(u.kind==='hero'&&u.id==='zhira'&&['camp','buff','boss'].includes(t.kind))heal(u,5);
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
function wallClosest(point,o){
 const dx=o.bx-o.ax,dy=o.by-o.ay;
 const t=clamp(((point.x-o.ax)*dx+(point.y-o.ay)*dy)/Math.max(1,dx*dx+dy*dy),0,1);
 return{x:o.ax+t*dx,y:o.ay+t*dy};
}
function pointToWall(point,o){
 const q=wallClosest(point,o);return Math.hypot(point.x-q.x,point.y-q.y);
}
function distanceToSolid(point,o){
 return o.kind==='wall'?pointToWall(point,o)-o.halfWidth:dist(point,o)-solidRadius(o);
}
const SOLID_CELL=165;
let solidGrid=new Map();
function solidKey(x,y){return x+','+y}
function rebuildSolidIndex(){
 solidGrid=new Map();
 const all=[...state.structures,...state.obstacles,...state.camps,...state.walls];
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
 return [...state.structures,...state.obstacles,...state.camps,...state.walls].filter(aliveSolid);
}
function solidRadius(o){
 if(o.kind==='wall')return o.r;
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
   if(obstacle.kind==='wall'){
    const closest=wallClosest(u,obstacle),required=R+obstacle.halfWidth+1;
    const dx=u.x-closest.x,dy=u.y-closest.y,dd=Math.hypot(dx,dy);
    if(dd<required){
     const side=dd>.0001?{x:dx/dd,y:dy/dd}:norm(-(obstacle.by-obstacle.ay),obstacle.bx-obstacle.ax);
     u.x=clamp(closest.x+side.x*required,30,W-30);
     u.y=clamp(closest.y+side.y*required,30,H-30);
     changed=true;
    }
    continue;
   }
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
  if(o.kind==='wall')continue; // navegação longa contorna os segmentos por A*.
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
function moveToward(u,p,dt,speedFactor=1,waypointMode=false){
 const dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy);
 if(d<4){u.autoNav=null;return true}
 const step=Math.min(d,moveSpeed(u)*dt*speedFactor);
 const solids=nearSolids(u.x,u.y,(u.r||18)+155);
 let target=p;
 // A* já existia para os junglers; agora o movimento dos demais bots
 // também o usa quando uma parede interrompe o caminho.
 // Joystick manual continua com física direta e sem piloto automático.
 if(!waypointMode&&d>90){
  const probe={x:u.x+dx/d*Math.min(130,d),y:u.y+dy/d*Math.min(130,d)};
  const wallAhead=solids.some(o=>o.kind==='wall'&&
   distanceToSolid(probe,o)<(u.r||18)+16);
  if(u.autoNav&&dist(u.autoNav.goal,p)>150)u.autoNav=null;
  if(!u.autoNav&&wallAhead&&state.time>=(u.navRetryAfter||0)){
   const path=findJunglePath(u,p);
   if(path.length){
    u.autoNav={path,index:0,goal:{x:p.x,y:p.y},until:state.time+4};
   }else u.navRetryAfter=state.time+1.4;
  }
  if(u.autoNav){
   if(state.time>u.autoNav.until)u.autoNav=null;
   else{
    const nav=u.autoNav;
    while(nav.index<nav.path.length-1&&dist(u,nav.path[nav.index])<34)
     nav.index++;
    target=nav.path[Math.min(nav.index,nav.path.length-1)];
    if(dist(u,p)<90&&!wallAhead){u.autoNav=null;target=p;}
   }
  }
 }
 const tx=target.x-u.x,ty=target.y-u.y,td=Math.hypot(tx,ty)||1;
 const dir=steerAround(u,{x:tx/td,y:ty/td},target,solids);
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
 u.jungleGoal=null;u.gankUntil=0;u.navPath=null;u.autoNav=null;
 const home=HOME[u.side];
 // Spawn na praça livre, evitando a hitbox do Núcleo e do obelisco interior.
 const direction=u.side===0?1:-1;
 u.x=home.x+direction*38+rando(-7,7);
 u.y=home.y-direction*33+rando(-7,7);
 pushOutsideSolids(u);
 u.cameraSnapAt=state.time;
 u.commandTarget=null;u.focusTarget=null;u.focusUntil=0;
 u.hp=u.maxHp;u.mana=maxMana(u);u.shield=0;u.shieldUntil=0;
 if(!u.controlled)botShop(u);u.guard=0;u.casting=null;
 u.attackCd=0;u.stun=0;u.slow=0;u.dash=null;u.recall=0;u.attackPending=null;u.attackAnim=0;u.skillFlash=0;
 u.death=0;u.respawn=0;u.focus=null;u.aiTimer=.5;u.recentDamagers=[];
 addEffect(u.x,u.y,u.side===0?'#82f0e1':'#f8aac3',85,.62);
}
function botShop(u){
 if(u.controlled||u.hp<=0||dist(u,HOME[u.side])>245)return;
 const priorities={
  orun:['bulwark','titanplate','hourglass','swiftboots'],
  seris:['deepsea','titanplate','hourglass','archmage'],
  lyria:['astralbow','swiftboots','stormblade','bulwark'],
  nyra:['archmage','deepsea','hourglass','swiftboots'],
  vexor:['stormblade','swiftboots','astralbow','bulwark'],
 brax:['warheart','bulwark','stormblade','titanplate'],
 zhira:['huntress','stormblade','astralbow','bulwark']
 }[u.id]||['bulwark'];
 for(const id of priorities){
  if(u.items.includes(id))continue;
  const status=recipeStatus(u,id);if(!status)continue;
  const toBuy=status.missing.length?status.missing[0]:id;
  if(!applyItemPurchase(u,toBuy,true).ok)continue;
  // Outra componente é comprada na próxima visita / pulso.
  break;
 }
}
function botUseSkill(u,target){
 if(!u||u.stun>0||u.casting||u.dash||u.aiTimer>0)return false;
 const kit=hData(u.id),friendlies=living(u.side,'hero'),enemies=living(1-u.side,'hero').filter(e=>visibleTo(u.side,e));
 const ready=id=>id&&u.cooldowns[id]<=.01&&u.mana>=skillDef(id).cost&&
   skillRank(u,id)>0;
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
 }else if(u.id==='brax'){
  if(ready('brax_ult')&&nearEnemies>=2)options.push('brax_ult');
  if(u.hp/u.maxHp<.64)options.push('brax_fortify');
  if(r<120)options.push('brax_cleave');
  if(r>80&&r<190)options.push('brax_grapple');
 }else if(u.id==='zhira'){
  if(ready('zhira_ult')&&r<215)options.push('zhira_ult');
  if(r<230&&clusters>=2)options.push('zhira_trap');
  if(r>70&&r<190)options.push('zhira_pounce');
  if(r<270)options.push('zhira_strike');
 }
 options=options.filter(id=>{
  if(!ready(id))return false;
  const def=skillDef(id);
  return def.aim==='self'||r<=(def.range||0)+target.r+9;
 });
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
   distanceToSolid(pos,o)<u.r+7);
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
 moveToward(u,point,dt,.91,true);
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
 if(dist(u,camp)<212&&u.summoners?.includes('smite')&&camp.hp<=smiteDamage(u)&&
   !u.summonerCooldowns.smite)castSummoner(u,'smite',camp);
 if(dist(u,camp)<125){
  if(u.id==='vexor'&&u.cooldowns.vexor_whirl<=0&&u.mana>=skillDef('vexor_whirl').cost){
   cast(u,'vexor_whirl',null,camp);
  }else if(u.id==='orun'&&u.cooldowns.orun_quake<=0&&u.mana>=skillDef('orun_quake').cost){
   cast(u,'orun_quake',null,camp);
  }else if(u.id==='zhira'){
   if(!cast(u,'zhira_strike',null,camp)&&dist(u,camp)<110)cast(u,'zhira_pounce',null,camp);
  }else if(u.id==='brax')cast(u,'brax_cleave',null,camp);
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
 if(u.id==='seris'&&u.cooldowns.seris_aegis<=0&&u.mana>=skillDef('seris_aegis').cost){
  const teammates=living(u.side,'hero').filter(h=>dist(h,u)<200&&h.hp/h.maxHp<.68);
  if(teammates.length)cast(u,'seris_aegis',null,teammates[0]);
 }
 if(u.visionCd<=0&&state.time>70)placeWard(u,boss.x,boss.y);
 return true;
}
function botUseSummoners(u){
 if(!u||u.controlled||state.time<(u.summonerScanAt||0))return;
 u.summonerScanAt=state.time+.52+(u.uid%4)*.065;
 const enemy=living(1-u.side,'hero').filter(h=>visibleTo(u.side,h)&&dist(u,h)<250)
  .sort((a,b)=>dist(u,a)-dist(u,b))[0];
 if(u.summoners.includes('heal')&&
  (u.hp/u.maxHp<.44||living(u.side,'hero').some(h=>h!==u&&
   dist(h,u)<190&&h.hp/h.maxHp<.34)))castSummoner(u,'heal');
 if(u.summoners.includes('shield')&&enemy&&u.hp/u.maxHp<.62)
  castSummoner(u,'shield');
 if(u.summoners.includes('ignite')&&enemy&&dist(u,enemy)<210&&
  enemy.hp/enemy.maxHp<.65)castSummoner(u,'ignite',enemy);
 if(u.summoners.includes('flash')&&enemy&&u.hp/u.maxHp<.27){
  const away=norm(u.x-enemy.x,u.y-enemy.y);
  castSummoner(u,'flash',null,away);
 }
}
function botHero(u,dt){
 botShop(u);
 if(u.stun>0||u.casting||u.dash)return;
 botUseSummoners(u);
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
   u.aiRetreat=false;heal(u,u.maxHp*.56);u.mana=maxMana(u);
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
  .filter(e=>visibleTo(u.side,e)&&e.lane===lane&&dist(e,u)<410)
  .sort((a,b)=>a.hp-b.hp||dist(u,a)-dist(u,b));
 // Último golpe e ataque básico priorizados sem perseguir inimigos até a jungle.
 const farmKill=enemyWave.find(e=>e.hp<=attackDamage(u)*1.38&&
  dist(u,e)<attackRange(u)+e.r+32);
 u.farmTarget=farmKill||enemyWave.find(e=>dist(u,e)<attackRange(u)+e.r+13)||null;
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
 else if(enemyWave.length)target=farmKill||enemyWave[0];
 else if(objective&&dist(u,objective)<390&&hasWave)target=objective;
 else if(enemyNear&&dist(u,enemyNear)<240)target=enemyNear;
 // Espera o avanço da onda ao invés de avançar sozinho sob um obelisco inimigo.
 const enemyTower=state.structures.find(t=>t.side===enemySide&&t.kind==='tower'&&
  t.hp>0&&dist(t,u)<t.range+115);
 const minionUnderTower=enemyTower&&allies.some(m=>m.hp>0&&dist(m,enemyTower)<enemyTower.range);
 if(enemyTower&&!minionUnderTower&&dist(u,enemyTower)<enemyTower.range+u.r+55){
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
   // Quem já está no alcance não abandona o último golpe para dar voltas.
   if(u.attackCd<=.01&&u.farmTarget===target)autoAttack(u);
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
 if(dist(u,anchor)>90)moveToward(u,anchor,dt,.88);
 // Posiciona sentinelas perto de entradas de jungle se houver pressão.
 if(u.visionCd<=0&&state.time>35&&state.time%28<dt&&
    state.brushes.some(b=>dist(b,u)<165)&&
    enemyHeroes.length===0){
  const p=state.brushes.filter(b=>dist(u,b)<165)
   .sort((a,b)=>dist(a,u)-dist(b,u))[0];
  if(p)placeWard(u,p.x,p.y);
 }
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
 if(u.casting||u.dash||u.cooldowns[id]>0||(u.mana<def.cost&&u.manaFreeUntil<=state.time)||u.stun>0)return false;
 if(def.ultimate&&u.level<5||skillRank(u,id)===0)return false;
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
 const maxLv=skillRank(u,id);
 if(maxLv<=0)return false;
 const haste=Math.min(.42,itemStats(u,'haste'));
 u.cooldowns[id]=Math.max(.8,def.cd*(1-haste)*(1-.065*(maxLv-1)));
 if(u.manaFreeUntil<=state.time)u.mana-=def.cost;
 if(u.recall>0){u.recall=0;if(u.controlled)announce('RETORNO CANCELADO: HABILIDADE',1.2)}
 if(u.items.includes('stormblade'))u.surgeUntil=state.time+5;
 if(u.id==='vexor')u.empoweredUntil=state.time+4;
 if(u.id==='seris'){
  const low=living(u.side,'hero').filter(h=>dist(h,u)<175)
   .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(low)heal(low,Math.round(5+maxLv*3));
 }
 const c={id,dir,center,level:maxLv,time:Math.max(0,def.cast),total:Math.max(0,def.cast)};
 if(c.time<=0)releaseSkill(u,c);else u.casting=c;
 addEffect(u.x,u.y,hData(u.id).color,27,.24);
 return true;
}
const SUMMONERS={
 smite:{name:'Selo da Caça',icon:'❖',cd:32,desc:'Grande dano a monstros. Dano reduzido e lentidão contra campeões.'},
 flash:{name:'Salto Sigilar',icon:'↗',cd:83,desc:'Teleporte curto na direção em que o herói está olhando.'},
 ignite:{name:'Marca Ígnea',icon:'♨',cd:71,desc:'Queima por 4 segundos e reduz cura recebida.'},
 heal:{name:'Sopro Vital',icon:'✚',cd:90,desc:'Recupera vida sua e de um aliado próximo.'},
 shield:{name:'Barreira Etérea',icon:'⬡',cd:78,desc:'Escudo temporário para resistir ao dano.'},
 freecast:{name:'Transe Arcano',icon:'∞',cd:99,desc:'Durante 5 segundos suas habilidades não gastam mana, mas mantêm as recargas.'}
};
const smiteDamage=u=>Math.round(330+Math.max(0,u.level-1)*29);
function castSummoner(u,id,target=null,aim=null){
 if(!u||u.kind!=='hero'||u.hp<=0||state.mode!=='playing'||u.stun>0||
  !u.summoners?.includes(id)||!SUMMONERS[id]||(u.summonerCooldowns[id]||0)>0)return false;
 let chosen=null;
 if(id==='smite'){
  const camps=state.camps.filter(c=>c.hp>0&&(!c.unlock||state.time>=c.unlock)&&dist(u,c)<212);
  const foe=living(1-u.side,'hero').filter(h=>dist(u,h)<165&&visibleTo(u.side,h))
   .sort((a,b)=>dist(u,a)-dist(u,b))[0];
  chosen=target&&target.hp>0&&dist(u,target)<212&&
   (state.camps.includes(target)||target.kind==='hero'&&target.side!==u.side)?target:
   camps.sort((a,b)=>a.hp-b.hp)[0]||foe;
  if(!chosen)return false;
 }else if(id==='ignite'){
  chosen=target&&target.kind==='hero'&&target.side!==u.side&&dist(u,target)<215?target:
   living(1-u.side,'hero').filter(h=>visibleTo(u.side,h)&&dist(u,h)<215)
    .sort((a,b)=>dist(u,a)-dist(u,b))[0];
  if(!chosen)return false;
 }
 u.summonerCooldowns[id]=SUMMONERS[id].cd;
 if(u.recall>0)u.recall=0;
 if(id==='smite'){
  if(state.camps.includes(chosen)){
   damageCreep(chosen,Math.min(chosen.hp,smiteDamage(u)),u);
   heal(u,Math.round(20+u.level*1.6));
  }else{damage(chosen,Math.round(42+u.level*2.3),u);chosen.slow=Math.max(chosen.slow,1.3)}
  addEffect(chosen.x,chosen.y,'#9ef1a1',52,.44,'burst');
 }else if(id==='ignite'){
  chosen.burnUntil=state.time+4;chosen.burnSource=u;chosen.burnPulse=0;
  addEffect(chosen.x,chosen.y,'#ff9c69',44,.5,'burst');
 }else if(id==='flash'){
  const angle=u.facing||0,dir=aim?norm(aim.x,aim.y):{x:Math.cos(angle),y:Math.sin(angle)};
  movePhysical(u,dir.x*125,dir.y*125);
  u.invuln=Math.max(u.invuln,.12);u.cameraSnapAt=state.time;
  addEffect(u.x,u.y,'#a3edff',55,.37,'wave');
 }else if(id==='heal'){
  heal(u,Math.round(u.maxHp*.18+u.level*3));
  const ally=living(u.side,'hero').filter(h=>h!==u&&dist(u,h)<230)
   .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(ally)heal(ally,Math.round(ally.maxHp*.12+u.level*2));
 }else if(id==='shield')grantShield(u,Math.round(92+u.level*12),3.5);
 else if(id==='freecast'){
  u.manaFreeUntil=state.time+5;
  addEffect(u.x,u.y,'#c6a5ff',63,.55,'wave');
 }
 if(u.controlled)announce(SUMMONERS[id].name.toUpperCase(),1.1);
 return true;
}
function releaseSkill(u,c){
 if(!u||u.hp<=0)return;
 const id=c.id,def=skillDef(id),power=spellPower(u,id),enemy=1-u.side,lv=c.level;
 u.skillFlash=.42;
 const slow=(target,seconds)=>{target.slow=Math.max(target.slow,seconds)};
 if(['lyria_step','vexor_lunge','orun_charge','vexor_ult','brax_grapple','zhira_pounce'].includes(id)){
  const dashLength=def.range+lv*7,duration=id==='vexor_ult'?.25:.18;
  u.skillFlash=.35;
  u.dash={vx:c.dir.x*dashLength/duration,vy:c.dir.y*dashLength/duration,t:duration,
   hit:new Set(),radius:def.radius||25,dmg:Math.round((id==='vexor_ult'?85:id==='orun_charge'?31:id==='vexor_lunge'?36:id==='brax_grapple'?37:id==='zhira_pounce'?34:0)*power),
   stun:id==='orun_charge'?.36:id==='brax_grapple'?.29:id==='vexor_ult'?.26:0};
  u.invuln=id==='lyria_step'?.19:.10;
  addEffect(u.x,u.y,hData(u.id).color,57,.42);
  return;
 }
 if(['lyria_pierce','nyra_bolt','seris_tether','zhira_strike'].includes(id)){
  const d=id==='lyria_pierce'?42:id==='nyra_bolt'?44:id==='zhira_strike'?39:24;
  state.projectiles.push({x:u.x+c.dir.x*23,y:u.y+c.dir.y*23,source:u,side:u.side,
   vx:c.dir.x*555,vy:c.dir.y*555,range:def.range,travel:0,
   damage:Math.round((d+lv*8)*power),r:def.radius||15,life:2,
   kind:'skillline',color:hData(u.id).color,stun:0,slow:id==='seris_tether'?1.6:0});
  return;
 }
 if(def.aim==='area'){
  const isHealing=id==='seris_bloom';
  const aoeDamage=id==='lyria_ult'?85:id==='nyra_ult'?97:id==='lyria_rain'?43:
   id==='nyra_rift'?54:id==='vexor_mark'?40:id==='zhira_trap'?35:0;
  const range=def.radius+(def.ultimate?15:0);
  state.projectiles.push({x:u.x,y:u.y,source:u,side:u.side,tx:c.center.x,ty:c.center.y,
   speed:780,damage:Math.round((aoeDamage+lv*9)*power),r:9,aoe:range,
   kind:isHealing?'healarea':'damagearea',heal:isHealing?55+lv*13:0,
   color:hData(u.id).color,stun:id==='nyra_ult'?.62:id==='nyra_rift'?.32:id==='zhira_trap'?.25:0,
   slow:id==='lyria_rain'||id==='lyria_ult'?1.5:id==='nyra_rift'||id==='zhira_trap'?1.4:0,
   mark:id==='vexor_mark',life:2.5});
  addEffect(c.center.x,c.center.y,hData(u.id).color,range,1.05,'telegraph');
  return;
 }
 const r=def.radius||120;
 if(id==='zhira_ult'){
  u.huntUntil=state.time+6;grantShield(u,Math.round(28+lv*11),5);
  addEffect(u.x,u.y,'#91ed84',115,.6,'wave');return;
 }
 if(id==='brax_ult'){
  aoe(u.x,u.y,r,Math.round((66+lv*18)*power),u,.53,1.1);
  grantShield(u,Math.round(38+lv*16),3);
  addEffect(u.x,u.y,'#f6ca85',r,.64,'burst');return;
 }
 if(id==='seris_ult'||id==='seris_aegis'||id==='orun_ult'||id==='orun_guard'||id==='nyra_barrier'||id==='brax_fortify'){
  for(const friend of living(u.side,'hero')){
   if(dist(friend,u)<r+friend.r||friend===u){
    if(id==='seris_ult')heal(friend,75+lv*20);
    if(id==='orun_ult')heal(friend,25+lv*8);
    if(id==='orun_guard')heal(friend,13+lv*7);
    if(id==='brax_fortify'&&friend===u)heal(friend,22+lv*7);
    grantShield(friend,id==='orun_ult'?95:id==='seris_ult'?90:id==='seris_aegis'?40:id==='brax_fortify'?68+lv*11:60,
      id==='orun_ult'||id==='seris_ult'?4.2:2.9);
   }
  }
  if(id==='orun_ult')aoe(u.x,u.y,r,Math.round((50+lv*15)*power),u,.55);
  addEffect(u.x,u.y,hData(u.id).color,r,.69);
  return;
 }
 if(id==='vexor_whirl'||id==='orun_quake'||id==='brax_cleave'){
  const hits=aoe(u.x,u.y,r,Math.round(((id==='orun_quake'?43:id==='brax_cleave'?38:48)+lv*9)*power),u,id==='orun_quake'?.33:0);
  if(id==='brax_cleave'&&hits)heal(u,Math.min(37,6+lv*4+hits*3));
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
    if(p.kind==='aa'&&p.source?.kind==='hero'&&p.source.id==='seris'&&
     p.target.kind==='hero')p.target.slow=Math.max(p.target.slow,.55);
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
   // Feitiços não atravessam paredes físicas; AAs travados continuam certeiros.
   for(const o of nearSolids(ax,ay,length+45)){
    if(o.kind==='wall'){
     // Colisão segmentada contra cápsula de parede, sem inventar um círculo enorme
     // na posição central de um obstáculo comprido.
     const segments=Math.max(1,Math.ceil(length/7));
     for(let i=0;i<=segments;i++){
      const t=i/segments;
      if(t>=firstT)break;
      const pos={x:ax+(endX-ax)*t,y:ay+(endY-ay)*t};
      if(pointToWall(pos,o)<=o.halfWidth+p.r*.6){
       firstT=t;first={kind:'terrain',target:o};break;
      }
     }
     continue;
    }
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
    }else if(first.kind==='creep')damageCreep(first.target,Math.round(p.damage*(p.source?.id==='zhira'?1.40:1)),p.source);
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
 if(u.kind==='hero'&&u.burnUntil>state.time&&u.burnSource){
  u.burnPulse=(u.burnPulse||0)+dt;
  if(u.burnPulse>=.5){
   u.burnPulse-=.5;damage(u,Math.round(8+u.burnSource.level*1.7),u.burnSource);
   if(u.hp<=0)return;
  }
 }
 u.marked=Math.max(0,(u.marked||0)-dt);
 u.invuln=Math.max(0,u.invuln-dt);
 if(u.shield>0&&state.time>=(u.shieldUntil||0))u.shield=0;
 u.guard=Math.max(0,u.guard-dt*.02);
 if(u.kind==='hero'){
  u.passiveCd=Math.max(0,(u.passiveCd||0)-dt);
  if(u.hp>0&&u.hp/u.maxHp<.37&&u.passiveCd<=0&&
      (u.items||[]).some(id=>ITEM_BY_ID[id]?.passive==='fortify')){
   grantShield(u,Math.round(65+u.level*7+itemStats(u,'hp')*.16),4);
   u.passiveCd=48;
   addEffect(u.x,u.y,'#b6d9ff',56,.50,'wave');
  }
 }
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
 if(u.kind==='hero'){
  const latest=maxMana(u);u.maxMana=latest;
  for(const id in u.cooldowns)u.cooldowns[id]=Math.max(0,u.cooldowns[id]-dt);
  for(const id in u.summonerCooldowns)u.summonerCooldowns[id]=Math.max(0,u.summonerCooldowns[id]-dt);
 }
 if(u.kind==='hero'){
  u.visionCd=Math.max(0,(u.visionCd||0)-dt);
  u.gold=Math.min(20000,u.gold+dt*1.8);
  u.mana=clamp(u.mana+dt*((dist(u,HOME[u.side])<160?27:4.2+itemStats(u,'regen'))+
    (state.teamBuffs[u.side].serpe>state.time?2.4:0)),0,maxMana(u));
  u.aiTimer-=dt;
  u.hp=Math.min(u.maxHp,u.hp+dt*(dist(u,HOME[u.side])<150?24:1.15+itemStats(u,'regen')*.35+
   (state.teamBuffs[u.side].serpe>state.time?1.65:0)));
  if(u.recall>0){
   if(u.controlled){u.recall-=dt;if(u.recall<=0){
     u.recall=0; // Um tempo negativo ainda é truthy em JS e bloqueava os controles.
     const home=HOME[u.side];
     const direction=u.side===0?1:-1;
     u.x=home.x+direction*38;u.y=home.y-direction*33;
     pushOutsideSolids(u);
     u.commandTarget=null;u.focusTarget=null;u.focusUntil=0;
     u.cameraSnapAt=state.time;
     u.hp=u.maxHp;u.mana=maxMana(u);announce('RETORNO AO SANTUÁRIO',1.6)}}
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
 const hero=state.hero;
 if(!hero||state.mode!=='playing')return{ok:false,reason:'PARTIDA INDISPONÍVEL'};
 const result=applyItemPurchase(hero,id);
 if(!result.ok)return result;
 addEffect(hero.x,hero.y,'#fbe1a1',58,.44);
 announce(result.item.name.toUpperCase()+(result.consumed.length?' · COMBINADO!':' ADQUIRIDO'),1.8);
 return result;
}
function sellItem(index){
 const hero=state.hero,at=Math.floor(index);
 if(!hero||state.mode!=='playing'||!Number.isInteger(index))
  return{ok:false,reason:'ITEM INVÁLIDO'};
 if(dist(hero,HOME[0])>240||hero.hp<=0)return{ok:false,reason:'VENDA SOMENTE NO SANTUÁRIO'};
 if(at<0||at>=hero.items.length)return{ok:false,reason:'ESPAÇO VAZIO'};
 const item=ITEM_BY_ID[hero.items[at]];
 if(!item)return{ok:false,reason:'ITEM INVÁLIDO'};
 const oldHp=itemStats(hero,'hp'),oldMana=maxMana(hero);
 hero.items.splice(at,1);
 hero.maxHp=Math.max(1,hero.maxHp+(itemStats(hero,'hp')-oldHp));
 hero.hp=Math.min(hero.maxHp,hero.hp);
 hero.mana=Math.min(maxMana(hero),hero.mana);
 const refund=Math.floor(item.price*.66);
 hero.gold+=refund;
 announce(item.name.toUpperCase()+' VENDIDO · +'+refund+' OURO',1.4);
 return{ok:true,refund,item,oldMana};
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
window.FendaEngine={state,W,H,TAU,HOME,CORE,BASE_GATE,PATHS,SIDE,ITEMS,SUMMONERS,smiteDamage,castSummoner,hData,skillDef,
 start,step,cast,autoAttack,focusTower,commandAttack,clearAttackCommand,isAttackCommandValid,buyItem,sellItem,recipeStatus,upgradeSkill,skillRank,skillRankCap,botUpgradeSkills,itemStats,recall,damage,heal,announce,makeWave,LANE_HALF_WIDTH,TURRET_RANGE,CORE_RANGE,TOWERS_PER_LANE,WARD_RANGE,maxMana,MOBA_SKILL_RANGES,ROUTE_PATHS,ROUTE_TOTALS,routePoint,routeProjection,JUNGLE_LINKS,pointToWall,distanceToSolid,
 living,attackRange,moveSpeed,findAA,nearestEnemy,enemyCreep,pathPos,dist,norm,clamp,addEffect,movePhysical,moveToward,botUseSkill,pushOutsideSolids,separateUnits,solidBodies,brushAt,refreshVision,isPointVisible,visibleTo,placeWard,VISION_CELL,VISION_COLS,VISION_ROWS};
})();