(function(){
'use strict';
const E=window.FendaEngine,C=window.SigilsCore;
if(!E||!C){console.error('Fenda: dependências indisponíveis');return;}
const S=E.state,$=id=>document.getElementById(id),stage=$('stage');
const cv=document.createElement('canvas');cv.id='fendaCanvas';
cv.setAttribute('aria-label','Fenda dos Sigilos: mapa MOBA de três rotas');
stage.insertBefore(cv,stage.firstChild.nextSibling);
const ctx=cv.getContext('2d',{alpha:false});
const hud=document.createElement('div');hud.id='fendaHUD';
hud.innerHTML='<div class="fenda-meta"><div id="fendaTopScore">✦ AZUL 0 × 0 RUBRO</div><div id="fendaGold">✦ 0 OURO</div><div id="fendaTime">00:00</div></div>'+
'<div class="fenda-personal"><div class="fenda-name" id="fendaName">CAMPEÃO · NV 1</div><div class="fenda-bar"><i id="fendaHP"></i></div><div class="fenda-bar mana"><i id="fendaMana"></i></div><div class="fenda-bar xp"><i id="fendaXP"></i></div></div>'+
'<div class="fenda-actions"><button id="fendaShopBtn">⚒ LOJA</button><button id="fendaRecallBtn">⌂ RETORNO</button><button id="fendaPauseBtn">Ⅱ</button></div>'+
'<button id="fendaTowerBtn" title="Priorizar obelisco no AA" aria-label="Atacar torre ou núcleo com o ataque básico">⬡<small>TORRE</small></button>'+
'<canvas id="fendaMinimap" width="220" height="152" aria-label="Minimapa tático"></canvas>'+
'<div id="fendaInfo">3 ROTAS · DESTRUA O NÚCLEO INIMIGO</div><div id="fendaObjectives">SERPE · TITÃ</div><div id="fendaNotice"></div>'+
'<button id="fendaWardBtn" aria-label="Colocar sentinela de visão" title="Coloca visão à frente do campeão · Tecla V">◉<small>VISÃO</small><em id="fendaWardCD"></em></button>';
stage.appendChild(hud);
const shop=document.createElement('div');shop.id='fendaShop';
shop.innerHTML='<div class="fenda-shop-head"><strong>⚒ ARSENAL DO SANTUÁRIO</strong><button id="fendaShopClose">✕</button></div>'+
'<p>Compre equipamentos com ouro perto da base azul.</p><div class="fenda-shop-gold" id="fendaShopGold"></div>'+
'<div id="fendaShopItems" class="fenda-shop-list"></div><p id="fendaShopHint"></p>';
stage.appendChild(shop);
const mm=$('fendaMinimap'),mc=mm.getContext('2d');
let vw=900,vh=460,dpr=1,terrain=null,last=performance.now(),hudCountdown=0,endedShown=false;
const fogCanvas=document.createElement('canvas'),fogContext=fogCanvas.getContext('2d');
let fogAt=-1,fogCamX=-99999,fogCamY=-99999;
const keys=new Set(),joy={ptr:null,x:0,y:0,sx:0,sy:0},pointers={aa:null,skill:null};
let aimPreview=null,desktopScheme='arrows',clickDestination=null;
let lastWarningAt=-100;
function warn(text){
 const now=performance.now()/1000;
 if(now-lastWarningAt>.75){lastWarningAt=now;E.announce(text,1.2)}
}
const clamp=E.clamp,dist=E.dist,TAU=E.TAU;
function resize(){
 const r=stage.getBoundingClientRect();vw=Math.max(320,r.width);vh=Math.max(220,r.height);
 dpr=Math.min(window.devicePixelRatio||1,1.65);
 cv.width=Math.round(vw*dpr);cv.height=Math.round(vh*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 fogCanvas.width=Math.ceil(vw*.64);fogCanvas.height=Math.ceil(vh*.64);fogAt=-1;
}
function circle(x,y,r,fill,stroke='',w=1){
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);
 if(fill){ctx.fillStyle=fill;ctx.fill()}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}
}

function baseSpace(g,side){
 const home=E.HOME[side];
 g.translate(home.x,home.y);
 g.scale(side===0?1:-1,side===0?-1:1);
}
function baseBoundary(g){
 const pts=[[-170,-88],[-135,-156],[70,-174],[245,-146],[395,-40],
  [414,116],[305,260],[145,317],[-35,302],[-169,174]];
 // Curva contínua de muralha/pátio, sem o contorno poligonal da versão anterior.
 const last=pts[pts.length-1],first=pts[0];
 g.beginPath();g.moveTo((last[0]+first[0])*.5,(last[1]+first[1])*.5);
 for(let i=0;i<pts.length;i++){
  const p=pts[i],n=pts[(i+1)%pts.length];
  g.quadraticCurveTo(p[0],p[1],(p[0]+n[0])*.5,(p[1]+n[1])*.5);
 }
 g.closePath();
}
function drawBasePaving(g){
 // Pátio da fonte, esplanada do Núcleo e corredores de saída são áreas distintas.
 for(let side=0;side<2;side++){
  g.save();baseSpace(g,side);
  baseBoundary(g);
  const stone=g.createLinearGradient(-110,-160,365,290);
  stone.addColorStop(0,'#354f53');stone.addColorStop(.40,'#6c8175');
  stone.addColorStop(.76,'#84958a');stone.addColorStop(1,'#425b56');
  g.fillStyle=stone;g.fill();
  g.save();baseBoundary(g);g.clip();
  // Mosaico radial de lajes: juntas em arcos e placas de cores próximas.
  // A base vira uma praça com profundidade, não um tabuleiro de quadrados claros.
  g.save();g.translate(65,81);
  for(let ring=0;ring<7;ring++){
   const inner=ring===0?24:36+(ring-1)*41;
   const outer=ring===0?36:36+ring*41;
   const sections=ring===0?8:Math.round(12+ring*5);
   for(let j=0;j<sections;j++){
    const wobble=(j*11+ring*7)%5;
    const a0=j*TAU/sections+ring*.12+.018;
    const a1=(j+1)*TAU/sections+ring*.12-.018;
    const r0=inner+2+wobble*.25,r1=outer-2-wobble*.35;
    g.beginPath();g.arc(0,0,r1,a0,a1);
    g.arc(0,0,r0,a1,a0,true);g.closePath();
    const k=(j*13+ring*17)%6;
    g.fillStyle=['#83948b','#798c84','#71867b','#8c9b8d','#667e76','#98a59a'][k];
    g.globalAlpha=.32+(k%3)*.05;g.fill();
    g.globalAlpha=.67;g.strokeStyle='#304d4b78';g.lineWidth=1.2;g.stroke();
   }
  }
  g.restore();
  // Pequenos musgos nas juntas: detalhe ambiental, não uma faixa contínua.
  for(let i=0;i<110;i++){
   const x=-170+((i*83)%590),y=-171+((i*59)%481);
   const k=(i*17)%7;
   if(k>3)continue;
   g.fillStyle=i%2?'#2e62504a':'#91ad7652';
   g.beginPath();g.ellipse(x,y,2+k*.6,1.4+k*.35,i*.8,0,TAU);g.fill();
  }
  // Esplanada de saída: três caminhos convergem, com bordas de alvenaria desgastada.
  g.strokeStyle='#d6d1ad54';g.lineWidth=9;
  g.beginPath();g.moveTo(-135,165);g.quadraticCurveTo(-65,303,135,309);g.stroke();
  g.strokeStyle='#253f427d';g.lineWidth=17;
  g.beginPath();g.moveTo(-154,48);g.quadraticCurveTo(-133,202,-45,268);g.stroke();
  // Detalhes rúnicos pequenos, sem repetir um enorme símbolo sob o personagem.
  for(let i=0;i<8;i++){
   const u=40+i*34,v=192+Math.sin(i*.9)*28;
   g.strokeStyle='#cfe5c14a';g.lineWidth=2;
   g.strokeRect(u-6,v-6,12,12);
  }
  g.restore();
  g.strokeStyle='#203b3f';g.lineWidth=13;baseBoundary(g);g.stroke();
  g.strokeStyle='#c1bfa271';g.lineWidth=3;baseBoundary(g);g.stroke();
  g.restore();
 }
}
function drawBaseDetails(g){
 for(let side=0;side<2;side++){
  const source=E.HOME[side],core=E.CORE[side];
  g.save();baseSpace(g,side);
  const ux=side===0?core.x-source.x:source.x-core.x;
  const vy=side===0?source.y-core.y:core.y-source.y;
  // Fonte compacta para surgimento e compra, afastada do Núcleo.
  g.fillStyle='#183d44';g.beginPath();g.arc(0,0,82,0,TAU);g.fill();
  g.strokeStyle='#c4c3a5';g.lineWidth=10;g.beginPath();g.arc(0,0,77,0,TAU);g.stroke();
  g.fillStyle='#457d7c';g.beginPath();g.arc(0,0,63,0,TAU);g.fill();
  g.strokeStyle='#c2e1ca8c';g.lineWidth=3;g.beginPath();g.arc(0,0,52,0,TAU);g.stroke();
  for(let i=0;i<8;i++){
   const a=i*TAU/8;
   g.strokeStyle='#c3d9ba78';g.lineWidth=3;
   g.beginPath();g.moveTo(Math.cos(a)*34,Math.sin(a)*34);
   g.lineTo(Math.cos(a)*55,Math.sin(a)*55);g.stroke();
  }
  g.fillStyle='#a4eff1a0';g.beginPath();g.arc(0,0,26,0,TAU);g.fill();
  g.strokeStyle='#d8fcdd';g.lineWidth=3;g.beginPath();g.arc(0,0,19,0,TAU);g.stroke();
  // A base do Núcleo tem seu próprio piso, sem recobrir a fonte.
  g.save();g.translate(ux,vy);
  g.fillStyle='#233b44';g.beginPath();g.arc(0,0,67,0,TAU);g.fill();
  g.strokeStyle=side===0?'#83ded2':'#d89fa6';g.lineWidth=6;
  g.beginPath();g.arc(0,0,61,0,TAU);g.stroke();
  g.strokeStyle='#d4c9a17c';g.lineWidth=2;
  for(let a=0;a<8;a++){
   const p=a*TAU/8;
   g.beginPath();g.moveTo(Math.cos(p)*39,Math.sin(p)*39);
   g.lineTo(Math.cos(p)*59,Math.sin(p)*59);g.stroke();
  }
  g.restore();
  // Barreira baixa na borda externa, interrompida antes das saídas das lanes.
  const segments=[
   [[-156,93],[-145,192]],[[-145,192],[-87,270]],[[-87,270],[-16,299]]
  ];
  for(const [a,b] of segments){
   g.strokeStyle='#17343b';g.lineCap='round';g.lineWidth=24;
   g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
   g.strokeStyle='#84988c';g.lineWidth=14;
   g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
   g.strokeStyle='#d3d1b56b';g.lineWidth=3;
   g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();
  }
  g.restore();
 }
}
function drawTerrain(){
 const c=document.createElement('canvas');c.width=E.W;c.height=E.H;
 const g=c.getContext('2d');let seed=9127;
 function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}
 const color=g.createLinearGradient(0,0,E.W,E.H);
 color.addColorStop(0,'#193932');color.addColorStop(.48,'#14382f');color.addColorStop(1,'#243344');
 g.fillStyle=color;g.fillRect(0,0,E.W,E.H);
 drawBasePaving(g);
 const nearRoute=(x,y,pad)=>{
  for(const pts of E.ROUTE_PATHS)for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],vx=b.x-a.x,vy=b.y-a.y;
   const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/(vx*vx+vy*vy),0,1);
   if(Math.hypot(a.x+vx*t-x,a.y+vy*t-y)<pad)return true;
  }
  for(const link of E.JUNGLE_LINKS){
   const a=E.pathPos(link.lane,link.t),dx=link.x-a.x,dy=link.y-a.y;
   const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
   if(Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<pad*.64)return true;
  }
  for(let side=0;side<2;side++){
   const base=E.HOME[side];
   const u=side===0?x-base.x:base.x-x;
   const v=side===0?base.y-y:y-base.y;
   if(u>-195&&u<440&&v>-190&&v<330)return true;
  }
  return false;
 };
 for(let i=0;i<2500;i++){
  const x=rand()*E.W,y=rand()*E.H;
  if(nearRoute(x,y,E.LANE_HALF_WIDTH+24))continue;
  g.fillStyle=rand()>.5?'#4c82603b':'#0e565c3b';
  const rx=3+rand()*14;g.beginPath();g.ellipse(x,y,rx,rx*(.5+rand()),rand()*6,0,TAU);g.fill();
 }
 // Rio do Véu, diagonal e distinto das três estradas pavimentadas.
 g.lineCap='round';g.lineJoin='round';
 g.beginPath();g.moveTo(580,260);g.bezierCurveTo(900,520,1450,1190,2200,1620);
 g.strokeStyle='#102d42';g.lineWidth=155;g.stroke();
 g.strokeStyle='#266475';g.lineWidth=112;g.stroke();
 g.strokeStyle='#327d8a';g.lineWidth=76;g.stroke();
 g.setLineDash([22,28]);g.strokeStyle='#78d5c65b';g.lineWidth=4;g.stroke();g.setLineDash([]);
 // Caminhos da selva se conectam às bordas das lanes, com passagem física livre.
 for(const link of E.JUNGLE_LINKS){
  const start=E.pathPos(link.lane,link.t);
  g.beginPath();g.moveTo(start.x,start.y);g.lineTo(link.x,link.y);
  for(const [w,color] of [[89,'#112e31'],[75,'#4b6659'],[55,'#829079'],[39,'#a0a18a']]){
   g.lineWidth=w;g.strokeStyle=color;g.stroke();
  }
  g.setLineDash([8,22]);g.strokeStyle='#e0d2a665';g.lineWidth=2;g.stroke();g.setLineDash([]);
 }
 // As pistas se estreitam ao entrar nas bases. A região da fonte permanece um pátio
 // com saídas separadas, em vez de três autoestradas sobrepostas.
 for(let lane=0;lane<3;lane++){
  const steps=110;
  for(let j=0;j<steps;j++){
   const t0=j/steps,t1=(j+1)/steps,t=(t0+t1)*.5;
   const p=E.pathPos(lane,t0),q=E.pathPos(lane,t1);
   const nearBase=Math.min(t,1-t);
   const transition=clamp((nearBase-.015)/.15,0,1);
   const smooth=transition*transition*(3-2*transition);
   const width=102+(E.LANE_HALF_WIDTH*2-102)*smooth;
   g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);
   g.lineCap='round';g.lineJoin='round';
   for(const [w,color] of [[width+16,'#234642'],[width+4,'#4c6860'],[width-14,'#70877a']]){
    g.strokeStyle=color;g.lineWidth=w;g.stroke();
   }
  }
  // Lajes espaçadas, sem repetição de um grid retangular ou faixas de trânsito.
  for(let t=.075;t<.94;t+=.025){
   const p=E.pathPos(lane,t);
   const prev=E.pathPos(lane,Math.max(0,t-.003));
   const next=E.pathPos(lane,Math.min(1,t+.003));
   const angle=Math.atan2(next.y-prev.y,next.x-prev.x);
   const transition=clamp((Math.min(t,1-t)-.015)/.15,0,1);
   const nCols=transition<.55?2:3;
   g.save();g.translate(p.x,p.y);g.rotate(angle);
   for(let col=0;col<nCols;col++){
    const k=(Math.floor(t*10000)*13+lane*29+col*47)%17;
    const x=(k%5-2)*5,y=(col-(nCols-1)/2)*55+(k%3-1)*5;
    const length=48+(k%4)*5,half=18+(k%3)*4;
    g.beginPath();
    g.moveTo(x-length*.5+5,y-half);
    g.lineTo(x+length*.5-7,y-half+2);
    g.lineTo(x+length*.5,y+half-4);
    g.lineTo(x-length*.5+2,y+half);
    g.closePath();
    g.fillStyle=k%4===0?'#a7b1a193':k%4===1?'#a2b09a72':
      k%4===2?'#617e7478':'#7a958487';
    g.fill();g.strokeStyle='#33584d76';g.lineWidth=1.4;g.stroke();
    if(k%7===0){
     g.strokeStyle='#4b7b5c73';g.beginPath();
     g.moveTo(x-13,y-3);g.lineTo(x-3,y+5);g.lineTo(x+7,y+3);g.stroke();
    }
   }
   g.restore();
  }
 }
 // Plataformas defensivas no ombro da lane, deixando o eixo central livre para a wave.
 for(const t of S.structures){
  if(t.kind!=='tower')continue;
  g.save();g.translate(t.x,t.y);
  g.fillStyle='#172f3b';g.beginPath();g.arc(0,0,45,0,TAU);g.fill();
  g.strokeStyle=t.side===0?'#7acac39c':'#d68e9e9c';g.lineWidth=5;
  g.beginPath();g.arc(0,0,39,0,TAU);g.stroke();
  g.strokeStyle='#dccfa378';g.lineWidth=2;
  g.beginPath();g.arc(0,0,34,0,TAU);g.stroke();
  for(let i=0;i<8;i++){
   const angle=TAU*i/8;
   g.fillStyle='#c5b88ba8';
   g.beginPath();g.arc(Math.cos(angle)*41,Math.sin(angle)*41,3.0,0,TAU);g.fill();
  }
  g.restore();
 }
 // Moitas do Véu: a vegetação aqui esconde campeões dos observadores externos.
 for(const brush of S.brushes){
  const x=brush.x,y=brush.y,r=brush.r;
  const grad=g.createRadialGradient(x,y,r*.11,x,y,r);
  grad.addColorStop(0,'#194a3dcc');grad.addColorStop(.62,'#174b3aa6');grad.addColorStop(1,'#113e2c00');
  g.fillStyle=grad;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  for(let n=0;n<34;n++){
   const a=n*2.39996,rad=r*(.2+((n*17)%67)/100);
   const bx=x+Math.cos(a)*rad,by=y+Math.sin(a)*rad;
   g.strokeStyle=n%3?'#6dad7775':'#bee0a075';g.lineWidth=2;
   g.beginPath();g.moveTo(bx-4,by+7);g.lineTo(bx,by-7-(n%4)*2);g.lineTo(bx+4,by+5);g.stroke();
  }
 }
 // Bosques densos, flores rúnicas e ruínas de pedra em vez de prédios genéricos.
 for(let i=0;i<960;i++){
  const x=40+rand()*(E.W-80),y=40+rand()*(E.H-80);
  if(nearRoute(x,y,E.LANE_HALF_WIDTH+55)||S.camps.some(k=>dist(k,{x,y})<78))continue;
  const r=9+rand()*19;
  g.fillStyle='#061b22a2';g.beginPath();g.ellipse(x+5,y+8,r*1.15,r*.65,0,0,TAU);g.fill();
  if(rand()>.22){
   g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=rand()>.5?'#185b58':'#245b4b';g.fill();
   g.beginPath();g.arc(x-r*.26,y-r*.26,r*.64,0,TAU);g.fillStyle='#6ca7857b';g.fill();
   g.strokeStyle='#b2c39b47';g.lineWidth=2;g.beginPath();g.arc(x,y,r*.77,.45,2.5);g.stroke();
  }else{
   g.fillStyle='#6e837d';g.beginPath();g.moveTo(x-r,y+r*.42);g.lineTo(x-r*.6,y-r*.65);
   g.lineTo(x+r*.6,y-r);g.lineTo(x+r,y+r*.3);g.closePath();g.fill();
   g.strokeStyle='#bacbb188';g.stroke();
  }
 }
 // Obstáculos com colisão: símbolos e pedras visíveis nas mesmas coordenadas da física.
 // A vegetação do fundo é apenas textura baixa, estes grandes objetos impedem passagem.
 for(const o of S.obstacles){
  const r=o.r,x=o.x,y=o.y;
  g.fillStyle='#020e17a3';g.beginPath();g.ellipse(x+7,y+12,r*1.14,r*.61,0,0,TAU);g.fill();
  if(o.kind==='tree'){
   g.fillStyle='#28483d';g.beginPath();g.arc(x,y,r+5,0,TAU);g.fill();
   g.fillStyle='#13504b';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
   g.fillStyle='#297964';g.beginPath();g.arc(x-r*.23,y-r*.22,r*.68,0,TAU);g.fill();
   g.strokeStyle='#a2e0b66b';g.lineWidth=3;
   g.beginPath();g.arc(x,y,r*.88,.3,2.7);g.stroke();
   g.strokeStyle='#e5dab485';g.lineWidth=2;g.beginPath();g.moveTo(x-r*.34,y+r*.28);g.lineTo(x+r*.25,y-r*.16);g.stroke();
  }else{
   g.fillStyle='#263d49';g.beginPath();
   for(let n=0;n<7;n++){const a=n*TAU/7;
    const px=x+Math.cos(a)*r*(n%2?.85:1.05),py=y+Math.sin(a)*r*(n%2?.86:1.05);
    if(n)g.lineTo(px,py);else g.moveTo(px,py);
   }g.closePath();g.fill();
   g.strokeStyle='#9ad4bb7d';g.lineWidth=3;g.stroke();
   g.strokeStyle='#f3e6c27d';g.lineWidth=2;
   g.beginPath();g.moveTo(x-r*.5,y-r*.11);g.lineTo(x-r*.08,y-r*.51);g.lineTo(x+r*.36,y-r*.3);g.stroke();
  }
 }
 drawBaseDetails(g);
 terrain=c;
}
function visible(x,y,r=70){return x+r>S.camera.x&&y+r>S.camera.y&&x-r<S.camera.x+vw&&y-r<S.camera.y+vh}
function bar(x,y,r,hp,max,side,width=46){
 const pct=clamp(hp/max,0,1);ctx.fillStyle='#00141ce5';ctx.fillRect(x-width/2,y-r-20,width,6);
 ctx.fillStyle=side===0?'#79ebc9':'#fb89a3';ctx.fillRect(x-width/2,y-r-20,width*pct,6);
 ctx.strokeStyle='#ddf8dd84';ctx.lineWidth=.8;ctx.strokeRect(x-width/2,y-r-20,width,6);
}
function drawStructure(o,t){
 if(!visible(o.x,o.y,118))return;
 const x=o.x,y=o.y,col=E.SIDE[o.side],alive=o.hp>0;
 if(o.kind==='tower'&&!alive)return;
 if(o.side!==S.hero?.side&&alive&&S.hero?.hp>0&&dist(S.hero,o)<o.range+135){
  // Alcance da torre visto perto dela, sem encobrir o terreno.
  ctx.save();
  ctx.globalAlpha=.24;
  circle(x,y,o.range,null,'#e9a0a6',1.6);
  ctx.restore();
 }
 ctx.save();ctx.translate(x,y);
 if(o.kind==='core'){
  circle(0,9,58,'#071923a0');
  ctx.save();ctx.rotate(t*.12);
  circle(0,0,47,'#1b3643',col,6);
  for(let i=0;i<8;i++){
   const a=i*TAU/8;
   ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(Math.cos(a)*22,Math.sin(a)*22);
   ctx.lineTo(Math.cos(a)*45,Math.sin(a)*45);ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();ctx.moveTo(0,-36);ctx.lineTo(25,0);ctx.lineTo(0,35);ctx.lineTo(-25,0);ctx.closePath();
  ctx.fillStyle=alive?col:'#435161';ctx.fill();ctx.strokeStyle='#fff1c4';ctx.lineWidth=3;ctx.stroke();
  circle(0,0,12,'#f7ffdb');
  bar(0,0,54,o.hp,o.maxHp,o.side,100);
 }else{
  circle(4,10,38,'#071622b3');
  circle(0,0,30,'#243b4b',col,3);
  ctx.save();ctx.rotate(Math.PI/4);ctx.fillStyle=o.side===0?'#1d586b':'#72384d';
  ctx.fillRect(-18,-18,36,36);ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.strokeRect(-18,-18,36,36);ctx.restore();
  ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(15,-12);ctx.lineTo(0,2);ctx.lineTo(-15,-12);ctx.closePath();
  ctx.fillStyle=col;ctx.fill();circle(0,-18,7,'#fff1d8');
  bar(0,0,38,o.hp,o.maxHp,o.side,70);
 }
 ctx.restore();
}
function drawMinion(u,t){
 if(!visible(u.x,u.y,32))return;
 const col=E.SIDE[u.side],x=u.x,r=u.r;
 const walking=u.walkUntil>S.time,hop=walking?Math.sin((u.walkPhase||0)*1.5)*1.7:0,y=u.y+hop;
 circle(x+3,y+6,r,'#031522a0');
 circle(x,y,r+1,'#173b48',col,2);
 if(u.id==='guard'){
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);
  ctx.fillStyle=col;ctx.fillRect(-r*.49,-r*.49,r*.98,r*.98);ctx.restore();
  circle(x+5,y,3,'#ffeac1');
 }else if(u.id==='caster'){
  ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y+r);ctx.lineTo(x-r,y+r);ctx.closePath();
  ctx.fillStyle=col;ctx.fill();circle(x,y,3,'#fff6e7');
 }else{
  for(let k=0;k<4;k++){
   const a=k*TAU/4+t*.3;circle(x+Math.cos(a)*r*.75,y+Math.sin(a)*r*.75,5,'#ebdeab');
  }
  circle(x,y,6,col);
 }
 if(u.attackAnim>0){
  const phase=1-u.attackAnim/(u.attackTotal||.29);
  ctx.save();ctx.globalAlpha=Math.sin(Math.PI*phase)*.82;
  circle(x+Math.cos(u.facing||0)*(r+7),y+Math.sin(u.facing||0)*(r+7),5,'#f5e8c1');
  ctx.restore();
 }
 bar(x,u.y,r,u.hp,u.maxHp,u.side,30);
}
function drawHero(u,t){
 if(!visible(u.x,u.y,65)||u.hp<=0)return;
 const x=u.x,y=u.y,r=u.r,h=C.heroes[u.id],col=h.color,side=E.SIDE[u.side];
 const walking=u.walkUntil>S.time;
 const stride=walking?Math.sin((u.walkPhase||0)*1.55)*2.2:Math.sin(t*1.7+u.uid)*.58;
 const attackPhase=u.attackAnim>0?1-u.attackAnim/(u.attackTotal||.39):0;
 const recoil=u.attackAnim>0?Math.sin(Math.PI*attackPhase)*3.3:0;
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#00151cab';ctx.beginPath();ctx.ellipse(4,9,r+6,r*.64,0,0,TAU);ctx.fill();
 circle(0,0,r+9,null,side,u.controlled?3.3:2);
 if(u.controlled)circle(0,0,r+13,null,'#e4fff183',1.4);
 if(u.shield>1)circle(0,0,r+15,'#8baeff29','#c4d7ffb3',2.5);
 ctx.translate(-Math.cos(u.facing||0)*recoil,stride-Math.sin(u.facing||0)*recoil);
 ctx.rotate(u.facing||0);circle(0,0,r,'#1b3043',col,2.6);
 if(u.id==='orun'){
  ctx.fillStyle='#5b709f';ctx.fillRect(-r*.7,-r*.8,r*1.16,r*1.6);
  ctx.beginPath();ctx.moveTo(r*.3,-r*.78);ctx.lineTo(r*1.18,-r*.3);ctx.lineTo(r*1.18,r*.3);ctx.lineTo(r*.3,r*.78);
  ctx.closePath();ctx.fillStyle='#b2c2ff';ctx.fill();circle(-r*.18,0,6,'#fff5ea');
 }else if(u.id==='vexor'){
  ctx.strokeStyle='#ffe4b2';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-4,-r*.45);
  ctx.lineTo(r*1.25,-r*.84);ctx.moveTo(-4,r*.45);ctx.lineTo(r*1.25,r*.84);ctx.stroke();
  circle(-r*.25,0,7,'#ffe2bd');
 }else if(u.id==='lyria'){
  ctx.beginPath();ctx.moveTo(-r*.9,-r*.7);ctx.lineTo(r*.6,0);ctx.lineTo(-r*.9,r*.7);ctx.closePath();
  ctx.fillStyle='#376175';ctx.fill();ctx.strokeStyle='#cbffe9';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(r*.2,0,r*.75,-1,1);ctx.stroke();circle(-r*.19,0,6,'#eeffdd');
 }else if(u.id==='nyra'){
  for(let i=0;i<5;i++){const a=i*TAU/5+t*.25;circle(Math.cos(a)*r*.83,Math.sin(a)*r*.83,4,'#f0b3ff')}
  ctx.beginPath();ctx.moveTo(-r*.75,-r*.7);ctx.lineTo(r*.68,0);ctx.lineTo(-r*.75,r*.7);ctx.closePath();
  ctx.fillStyle='#8e61b3';ctx.fill();circle(-r*.18,0,6,'#fff0fc');
 }else{
  for(let i=0;i<6;i++){const a=i*TAU/6;circle(Math.cos(a)*r*.6,Math.sin(a)*r*.6,5,'#ffcee2')}
  circle(-r*.12,0,7,'#fff3e9');
  ctx.beginPath();ctx.moveTo(r*.1,r*.4);ctx.lineTo(r*1.2,r*.4);ctx.strokeStyle='#ffc6e6';ctx.lineWidth=3;ctx.stroke();
 }
 if(u.attackAnim>0){
  // Preparação → impacto → recuperação; arco físico para melees e clarão na ponta da arma para rangeds.
  const phase=clamp(attackPhase,0,1);
  ctx.save();ctx.globalAlpha=(Math.sin(Math.PI*phase)*.85+.09);
  ctx.strokeStyle=u.isRanged?'#ffeab2':'#d4fff4';ctx.lineWidth=u.isRanged?3.8:6;
  ctx.beginPath();
  if(u.isRanged){
   ctx.moveTo(r*.15,-r*.25);ctx.lineTo(r+15+phase*6,-r*.25);
   ctx.stroke();circle(r+15+phase*6,-r*.25,4,'#fffbd9');
  }else{
   ctx.arc(r*.38,0,r+6,-1.45+phase*1.65,.52+phase*1.5);ctx.stroke();
  }
  ctx.restore();
 }
 if(u.skillFlash>0){
  ctx.save();ctx.globalAlpha=clamp(u.skillFlash/.42,0,1)*.73;
  ctx.strokeStyle=col;ctx.lineWidth=3;
  ctx.rotate(t*2.4);
  ctx.strokeRect(-r-13,-r-13,(r+13)*2,(r+13)*2);
  ctx.restore();
 }
 ctx.restore();
 bar(x,y,r+2,u.hp,u.maxHp,u.side,55);
 ctx.save();ctx.textAlign='center';ctx.font='900 10px system-ui';
 ctx.shadowColor='#00111a';ctx.shadowBlur=5;ctx.fillStyle=u.side===0?'#d4fff2':'#ffdde5';
 ctx.fillText((u.controlled?'✦ ':'')+h.name+' · '+u.level,x,y-r-26);ctx.restore();
 if(u.casting){
  const ratio=clamp(1-u.casting.time/(u.casting.total||1),0,1);
  ctx.save();ctx.globalAlpha=.76;
  ctx.strokeStyle=col;ctx.lineWidth=2.7;
  ctx.beginPath();ctx.arc(x,y,r+18,-Math.PI/2,-Math.PI/2+TAU*ratio);ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#071c2bcf';ctx.fillRect(x-24,y+r+12,48,5);
  ctx.fillStyle=col;ctx.fillRect(x-24,y+r+12,48*ratio,5);
 }
}
function drawCreep(o,t){
 if(o.hp<=0||o.unlock&&S.time<o.unlock||!visible(o.x,o.y,90))return;
 const r=o.kind==='boss'?46:o.kind==='buff'?30:24;
 circle(o.x+4,o.y+9,r+5,'#0417289c');
 circle(o.x,o.y,r,'#243944',o.color,3);
 if(o.kind==='boss'){
  const pulse=.5+.5*Math.sin(t*1.85);
  ctx.save();ctx.globalAlpha=.4+pulse*.35;
  circle(o.x,o.y,r+12+pulse*8,null,o.color,3);
  ctx.restore();
 }
 if(o.id==='serpe'){
  ctx.beginPath();ctx.moveTo(o.x,o.y-r*.9);ctx.lineTo(o.x+r*.8,o.y+r*.7);ctx.lineTo(o.x-r*.8,o.y+r*.7);ctx.closePath();
  ctx.fillStyle=o.color;ctx.fill();
 }else if(o.id==='titan'){
  ctx.save();ctx.translate(o.x,o.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#8f6fa9';ctx.fillRect(-r*.67,-r*.67,r*1.34,r*1.34);ctx.restore();
 }else{
  for(let i=0;i<6;i++){const a=i*TAU/6+t*.3;circle(o.x+Math.cos(a)*r*.7,o.y+Math.sin(a)*r*.7,6,o.color)}
 }
 circle(o.x,o.y,7,'#f9f7de');
 bar(o.x,o.y,r,o.hp,o.maxHp,0,o.kind==='boss'?95:66);
 ctx.textAlign='center';ctx.font='800 10px system-ui';ctx.fillStyle='#e9f9ed';
 ctx.fillText(o.name,o.x,o.y-r-26);
}
function drawFX(t){
 for(const p of S.projectiles){
  if(!visible(p.x,p.y,25)||p.side===1&&!E.isPointVisible(0,p))continue;
  const col=p.color||E.SIDE[p.side];ctx.save();ctx.shadowColor=col;ctx.shadowBlur=13;
  const radius=p.kind==='damagearea'||p.kind==='healarea'?11:p.r||5;
  const velocity=p.kind==='skillline'?E.norm(p.vx||1,p.vy||0):p.target?
    E.norm(p.target.x-p.x,p.target.y-p.y):p.tx!==undefined?E.norm(p.tx-p.x,p.ty-p.y):{x:1,y:0};
  ctx.strokeStyle=col;ctx.lineWidth=p.kind==='skillline'?Math.max(3,radius*.78):3;
  ctx.globalAlpha=.50;ctx.beginPath();
  ctx.moveTo(p.x-velocity.x*(radius+19),p.y-velocity.y*(radius+19));
  ctx.lineTo(p.x-velocity.x*radius*.3,p.y-velocity.y*radius*.3);ctx.stroke();
  ctx.globalAlpha=1;
  circle(p.x,p.y,radius,col);
  circle(p.x,p.y,Math.max(2,radius*.4),'#fff9e6');ctx.restore();
 }
 for(const f of S.effects){
  if(!visible(f.x,f.y,f.r+8)||!E.isPointVisible(0,f))continue;
  if(f.kind==='damageNumber'){
   const progress=1-f.life/f.maxLife;
   ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1);
   ctx.textAlign='center';ctx.font='900 20px system-ui';
   ctx.fillStyle=f.color||'#ffe2a4';ctx.shadowColor='#020e15';ctx.shadowBlur=6;
   ctx.fillText('-'+f.value,f.x,f.y-progress*33);
   ctx.restore();continue;
  }
  ctx.save();ctx.globalAlpha=clamp(f.life/f.maxLife,0,1)*.77;
  const r=f.kind==='hit'?f.r:f.r*(1-f.life/f.maxLife*.7);
  circle(f.x,f.y,r,f.kind==='blast'?f.color+'22':null,f.color,2.8);
  if(f.kind==='burst')for(let i=0;i<10;i++){
   const a=i*TAU/10;circle(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,4,f.color);
  }
  ctx.restore();
 }
}
function drawAim(){
 if(S.hero&&S.hero.focusTarget&&S.hero.focusUntil>S.time&&S.hero.focusTarget.hp>0){
  const structure=S.hero.focusTarget,radius=structure.r||(structure.kind==='boss'?38:28);
  ctx.save();circle(structure.x,structure.y,radius+15,null,'#f3e2a4a8',2.1);ctx.restore();
 }
 if(pointers.aa&&S.hero&&S.hero.hp>0){
  const r=E.attackRange(S.hero),target=E.findAA(S.hero);
  circle(S.hero.x,S.hero.y,r,null,'#a3e8d14a',1.5);
  if(target)circle(target.x,target.y,target.r+11,null,'#e7e2beaa',2.2);
 }
 if(aimPreview&&S.hero&&S.hero.hp>0){
  const def=E.skillDef(aimPreview.id),aim=aimData(aimPreview),u=S.hero;
  ctx.save();ctx.globalAlpha=.76;ctx.strokeStyle=def.ultimate?'#f8dea0':C.heroes[u.id].color;ctx.lineWidth=2;
  if(def.aim==='area'){
   circle(u.x,u.y,def.range,null,ctx.strokeStyle,1);
   circle(aim.center.x,aim.center.y,def.radius,ctx.strokeStyle+'22',ctx.strokeStyle,2.4);
   circle(aim.center.x,aim.center.y,7,'#f7ffee');
  }else if(def.aim==='direction'){
   ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(u.x,u.y);
   ctx.lineTo(u.x+aim.x*def.range,u.y+aim.y*def.range);ctx.stroke();
   ctx.setLineDash([]);
   circle(u.x+aim.x*def.range,u.y+aim.y*def.range,def.radius||16,null,ctx.strokeStyle,2);
  }
  ctx.restore();
 }
 if(S.marker){
  if(S.time>=S.marker.until)S.marker=null;
  else{
   ctx.save();ctx.translate(S.marker.x,S.marker.y);ctx.rotate(S.time*.8);
   ctx.strokeStyle='#ffe9a8';ctx.lineWidth=3;ctx.strokeRect(-13,-13,26,26);ctx.restore();
  }
 }
}
function drawFog(){
 if(S.mode!=='playing'&&S.mode!=='ended')return;
 const x=S.camera.x,y=S.camera.y,scaleX=fogCanvas.width/vw,scaleY=fogCanvas.height/vh;
 if(fogAt<0||S.time-fogAt>.17||Math.abs(x-fogCamX)>9||Math.abs(y-fogCamY)>9){
  fogAt=S.time;fogCamX=x;fogCamY=y;
  fogContext.setTransform(scaleX,0,0,scaleY,-x*scaleX,-y*scaleY);
  fogContext.clearRect(x-5,y-5,vw+10,vh+10);
  const cell=E.VISION_CELL;
  const x0=Math.max(0,Math.floor(x/cell)),x1=Math.min(E.VISION_COLS-1,Math.ceil((x+vw)/cell));
  const y0=Math.max(0,Math.floor(y/cell)),y1=Math.min(E.VISION_ROWS-1,Math.ceil((y+vh)/cell));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
   const px=(cx+.5)*cell,py=(cy+.5)*cell;
   if(E.isPointVisible(0,{x:px,y:py}))continue;
   const discovered=S.seen[0]?.[cy*E.VISION_COLS+cx];
   fogContext.fillStyle=discovered?'rgba(3,17,27,.66)':'rgba(2,11,24,.92)';
   fogContext.fillRect(cx*cell-1,cy*cell-1,cell+2,cell+2);
  }
 }
 ctx.drawImage(fogCanvas,x,y,vw,vh);
}
function drawWards(t){
 for(const ward of S.wards){
  if(ward.side!==0||!visible(ward.x,ward.y,38))continue;
  const x=ward.x,y=ward.y,pulse=.5+.5*Math.sin(t*2.8+ward.uid);
  ctx.save();ctx.globalAlpha=.8;
  circle(x,y,18+pulse*4,'#8ee8ca15','#a1f1d978',1.5);
  ctx.beginPath();ctx.moveTo(x,y-15);ctx.lineTo(x+10,y);ctx.lineTo(x,y+15);ctx.lineTo(x-10,y);ctx.closePath();
  ctx.fillStyle='#9ef2c7';ctx.fill();ctx.strokeStyle='#efffe0';ctx.lineWidth=1.5;ctx.stroke();
  circle(x,y,3,'#efffe1');
  ctx.restore();
 }
}
function view(dt){
 if(!terrain)drawTerrain();
 const h=S.hero;
 if(h){
  const wantX=clamp(h.x-vw*.5,0,Math.max(0,E.W-vw));
  const wantY=clamp(h.y-vh*.56,0,Math.max(0,E.H-vh));
  S.camera.x+=(wantX-S.camera.x)*Math.min(1,dt*5);
  S.camera.y+=(wantY-S.camera.y)*Math.min(1,dt*5);
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,vw,vh);
 ctx.save();ctx.translate(-S.camera.x,-S.camera.y);ctx.drawImage(terrain,0,0);
 drawFog();
 drawWards(S.time);
 for(const o of S.camps)if(E.isPointVisible(0,o))drawCreep(o,S.time);
 for(const o of S.structures)drawStructure(o,S.time);
 for(const u of S.units.filter(u=>u.hp>0&&(u.side===0||E.visibleTo(0,u))).sort((a,b)=>a.y-b.y))
  u.kind==='hero'?drawHero(u,S.time):drawMinion(u,S.time);
 drawFX(S.time);drawAim();ctx.restore();
 minimap();
}
function minimap(){
 mc.fillStyle='#09242e';mc.fillRect(0,0,mm.width,mm.height);
 mc.save();mc.translate(7,7);mc.scale(206/E.W,138/E.H);mc.lineCap='round';mc.lineJoin='round';
 for(const path of E.PATHS){mc.beginPath();path.forEach((p,i)=>i?mc.lineTo(p.x,p.y):mc.moveTo(p.x,p.y));
  mc.strokeStyle='#95aaa0';mc.lineWidth=48;mc.stroke();}
 // Sem visão não aparecem inimigos nem objetivo; mapa explorado fica escurecido.
 const step=E.VISION_CELL*3;
 for(let y=0;y<E.H;y+=step)for(let x=0;x<E.W;x+=step){
  const px=x+step*.5,py=y+step*.5;
  if(E.isPointVisible(0,{x:px,y:py}))continue;
  const ix=Math.min(E.VISION_COLS-1,Math.floor(px/E.VISION_CELL));
  const iy=Math.min(E.VISION_ROWS-1,Math.floor(py/E.VISION_CELL));
  const discovered=S.seen[0]?.[iy*E.VISION_COLS+ix];
  mc.fillStyle=discovered?'#061827a8':'#03101de6';
  mc.fillRect(x,y,step+2,step+2);
 }
 for(const camp of S.camps){
  if(camp.kind!=='boss'||camp.hp<=0||camp.unlock&&S.time<camp.unlock||
      !E.isPointVisible(0,camp))continue;
  mc.fillStyle=camp.color;mc.beginPath();mc.arc(camp.x,camp.y,43,0,TAU);mc.fill();
 }
 for(const ward of S.wards){
  if(ward.side!==0)continue;
  mc.fillStyle='#e1ffd9';mc.beginPath();mc.arc(ward.x,ward.y,28,0,TAU);mc.fill();
 }
 for(const o of S.structures){if(o.hp<=0)continue;mc.fillStyle=E.SIDE[o.side];
  mc.fillRect(o.x-20,o.y-20,o.kind==='core'?40:28,o.kind==='core'?40:28);}
 for(const u of S.units){if(u.hp<=0||u.side===1&&!E.visibleTo(0,u))continue;mc.fillStyle=u.side===0?'#5cece3':'#ff7e9e';
  mc.beginPath();mc.arc(u.x,u.y,u.kind==='hero'?23:10,0,TAU);mc.fill();}
 if(S.hero){mc.strokeStyle='#fff4c5';mc.lineWidth=18;mc.beginPath();mc.arc(S.hero.x,S.hero.y,44,0,TAU);mc.stroke();}
 if(S.marker){mc.fillStyle='#ffe1a3';mc.beginPath();mc.arc(S.marker.x,S.marker.y,34,0,TAU);mc.fill();}
 mc.strokeStyle='#ffffff';mc.lineWidth=13;mc.strokeRect(S.camera.x,S.camera.y,vw,vh);mc.restore();
}
function hudUpdate(){
 const h=S.hero;if(!h)return;
 const time=Math.floor(S.time);
 $('fendaTopScore').textContent='✦ '+S.kills[0]+' AZUL × '+S.kills[1]+' RUBRO · '+h.kills+'/'+h.deaths+'/'+h.cs+' CS';
 $('fendaGold').textContent='✦ '+Math.round(h.gold)+' OURO';
 $('fendaTime').textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(time%60).padStart(2,'0');
 $('fendaName').textContent=C.heroes[h.id].name+' · NV '+h.level+(h.hp<=0?' · RESSURGE '+Math.ceil(h.respawn)+'s':'');
 $('fendaHP').style.width=(h.hp/h.maxHp*100)+'%';
 $('fendaMana').style.width=(h.energy/(100+h.items.filter(i=>i==='cell').length*30)*100)+'%';
 $('fendaXP').style.width=(h.level<12?h.xp/(42+h.level*24)*100:100)+'%';
 const towerList=S.structures.filter(s=>s.kind==='tower'&&s.hp>0);
 const bossStatus=id=>{
  const c=S.camps.find(o=>o.id===id);
  if(!c)return '—';
  if(S.time<c.unlock)return Math.ceil(c.unlock-S.time)+'s';
  if(c.hp<=0)return Math.ceil(c.respawn)+'s';
  return 'DISPONÍVEL';
 };
 const blueBuff=S.teamBuffs[0],buffNames=[];
 if(blueBuff.serpe>S.time)buffNames.push('SERPE '+Math.ceil(blueBuff.serpe-S.time)+'s');
 if(blueBuff.titan>S.time)buffNames.push('TITÃ '+Math.ceil(blueBuff.titan-S.time)+'s');
 const tactic=S.teamAI?.[0];
 const tacticalLabel=tactic&&E.dist(h,tactic.center)<570?
   (tactic.mode==='engage'?' · TIME: AVANÇAR':tactic.mode==='retreat'?' · TIME: RECUAR':' · TIME: PROTEGER'):'';
 $('fendaObjectives').textContent='SERPE '+bossStatus('serpe')+' · TITÃ '+bossStatus('titan')+
   (buffNames.length?' · BÊNÇÃO '+buffNames.join(' / '):'')+tacticalLabel;
 const towers=towerList;
 $('fendaInfo').textContent='OBELISCOS · AZUL '+towers.filter(t=>t.side===0).length+
   ' / RUBRO '+towers.filter(t=>t.side===1).length+' · '+h.cs+' tropas';
 $('fendaNotice').style.display=S.time<S.noticeUntil?'block':'none';$('fendaNotice').textContent=S.notice;
 const kit=C.heroes[h.id].skills.concat([C.heroes[h.id].ultimate]);
 for(let i=0;i<kit.length;i++){
  const b=$(['dashBtn','pulseBtn','shieldBtn','ultBtn'][i]),id=kit[i],def=E.skillDef(id),
    lock=def.ultimate&&h.level<5,cd=h.cooldowns[id]||0;
  b.querySelector('b').textContent=def.icon;b.querySelector('small').textContent=lock?'NV 5':def.short;
  b.classList.toggle('oncd',cd>.03||lock||h.energy<def.cost||h.hp<=0);
  const el=b.querySelector('.cd-text');el.hidden=cd<=.03&&!lock;el.textContent=lock?'🔒':cd>.03?Math.ceil(cd):'';
 }
 $('fireBtn').querySelector('b').textContent='➤';
 $('fireBtn').querySelector('small').textContent=h.hp<=0?'RESSURGIR':'ATACAR';
 const aaBtn=$('fireBtn');
 aaBtn.classList.toggle('oncd',h.hp<=0||h.attackCd>.02);
 const aaCD=aaBtn.querySelector('.cd-text');
 if(aaCD){
  aaCD.hidden=h.attackCd<=.03||h.hp<=0;
  aaCD.textContent=h.attackCd>0?h.attackCd.toFixed(1):'';
 }
 const targetTowers=S.structures.filter(t=>t.side!==h.side&&t.hp>0&&
  (t.kind==='tower'||t.kind==='core')&&dist(h,t)<=E.attackRange(h)+t.r+2);
 const towerBtn=$('fendaTowerBtn');
 towerBtn.disabled=h.hp<=0||targetTowers.length===0;
 towerBtn.classList.toggle('available',targetTowers.length>0&&h.hp>0);
 towerBtn.classList.toggle('focused',!!h.focusTarget&&h.focusUntil>S.time&&h.focusTarget.hp>0);
 const wardBtn=$('fendaWardBtn');
 wardBtn.disabled=h.hp<=0||h.visionCd>0;
 wardBtn.classList.toggle('available',h.hp>0&&h.visionCd<=0);
 $('fendaWardCD').textContent=h.visionCd>0?Math.ceil(h.visionCd)+'s':'';

}
function shopRender(){
 const h=S.hero;if(!h)return;
 $('fendaShopGold').textContent='✦ '+Math.round(h.gold)+' OURO · '+h.items.length+'/6 ITENS';
 const inBase=dist(h,E.HOME[0])<=240;
 $('fendaShopItems').innerHTML=E.ITEMS.map(item=>'<button data-buy="'+item.id+'" '+
  (h.items.includes(item.id)||h.items.length>=6||h.gold<item.price||!inBase?'disabled':'')+
  '><strong>'+item.icon+' '+item.name+'</strong><small>'+item.stat+' · '+item.desc+'</small><em>'+
  (h.items.includes(item.id)?'EQUIPADO':item.price+' ✦')+'</em></button>').join('');
 $('fendaShopHint').textContent=inBase?'COMPRAS PERMITIDAS · '+h.items.length+'/6 ESPAÇOS':
 'RETORNE À BASE AZUL PARA COMPRAR (RETORNO · B).';
 for(const b of $('fendaShopItems').querySelectorAll('[data-buy]'))b.onclick=()=>{
  const result=E.buyItem(b.dataset.buy);if(!result.ok)E.announce(result.reason,1.4);
  shopRender();hudUpdate();
 };
}
function toggleShop(){
 if(S.mode!=='playing')return;
 S.shopOpen=!S.shopOpen;shop.classList.toggle('open',S.shopOpen);
 if(S.shopOpen)shopRender();
}
function chooseHero(){
 S.mode='menu';S.shopOpen=false;stage.classList.remove('fenda-on');cv.style.display='none';
 shop.classList.remove('open');$('overlay').classList.remove('hidden','arsenal-open','hero-open');
 $('overlay').classList.add('picker-open');$('missionShelf').hidden=true;
 const selected=C.getHeroChoice();
 $('modalContent').innerHTML='<div class="eyebrow">NOVO MOBA · VERSÃO 4.8</div><h2>FENDA DOS SIGILOS</h2>'+
 '<p>Rotas de curvas suaves, tropas em formação e torres nas laterais. IA de teamfight coordenada: iniciação, proteção, flanco e recuo.</p>'+
 '<div class="fenda-hero-list">'+Object.entries(C.heroes).map(([id,h])=>
  '<button class="fenda-hero '+(id===selected?'picked':'')+'" data-hero="'+id+'"><span style="color:'+h.color+'">'+h.symbol+'</span><strong>'+h.name+'</strong><small>'+h.role+'</small></button>').join('')+'</div>'+
 '<div class="teamfight-tip">5×5 com IA tática · composição de equipe · foco conjunto · recuo e iniciação · névoa de guerra · jungle e ganks · objetivos · loja e XP.</div>'+
 '<div class="actions" style="margin-top:10px"><button class="primary" id="playFenda">▶ JOGAR FENDA 5×5</button><button class="secondary" id="playClassic">MODO ARENA RÁPIDA</button></div>'+
 '<p style="font-size:10px;margin:9px 0 0">Celular: joystick e Q/W/E/R. PC: clique direito no chão para andar; clique direito no inimigo para perseguir e atacar automaticamente. Q/W/E/R habilidades; B retorno, P loja, V sentinela. TAB alterna para WASD + 1/2/3/4.</p>';
 for(const b of $('modalContent').querySelectorAll('[data-hero]'))b.onclick=()=>{C.setHeroChoice(b.dataset.hero);chooseHero()};
 $('playFenda').onclick=startGame;
 $('playClassic').onclick=()=>{S.mode='classic';stage.classList.remove('fenda-on');C.showClassic()};
}
function startGame(){
 C.suspendClassic?.();
 E.start(C.getHeroChoice());endedShown=false;clickDestination=null;keys.clear();joy.ptr=null;joy.x=joy.y=0;pointers.aa=null;pointers.skill=null;aimPreview=null;stage.classList.add('fenda-on');cv.style.display='block';
 shop.classList.remove('open');$('overlay').classList.add('hidden');$('missionShelf').hidden=true;
 resize();drawTerrain();last=performance.now();hudCountdown=0;hudUpdate();
 if(stage.requestFullscreen&&!document.fullscreenElement){
  try{Promise.resolve(stage.requestFullscreen()).catch(()=>{})}catch(_){}
 }
}
function endScreen(){
 if(endedShown)return;endedShown=true;S.shopOpen=false;shop.classList.remove('open');
 $('overlay').classList.remove('hidden','arsenal-open','hero-open','picker-open');$('missionShelf').hidden=true;
 $('modalContent').innerHTML='<div class="eyebrow">FENDA DOS SIGILOS</div><h2>'+(S.win===0?'VITÓRIA AZUL!':'DERROTA AZUL')+'</h2>'+
 '<p>'+(S.win===0?'O Núcleo Sigilar rubro foi destruído!':'Os inimigos destruíram seu Núcleo. Reorganize sua equipe e tente novamente.')+'</p>'+
 '<div class="result-objectives"><div><span>✦</span> Abates: '+S.kills[0]+' × '+S.kills[1]+'</div>'+
 '<div><span>★</span> Nível: '+S.hero.level+' · Minions: '+S.hero.cs+'</div>'+
 '<div><span>⬡</span> Itens: '+S.hero.items.length+'/6</div></div>'+
 '<div class="actions"><button class="primary" id="retryFenda">JOGAR NOVAMENTE</button>'+
 '<button class="secondary" id="backFenda">ESCOLHER CAMPEÃO</button></div>';
 $('retryFenda').onclick=startGame;$('backFenda').onclick=chooseHero;
}
function pause(){
 if(S.mode!=='playing')return;
 S.showPause=!S.showPause;
 if(S.showPause){
  S.shopOpen=false;shop.classList.remove('open');
  joy.x=joy.y=0;joy.ptr=null;keys.clear();pointers.aa=null;pointers.skill=null;aimPreview=null;
 }
 if(!S.showPause){$('overlay').classList.add('hidden');return}
 $('overlay').classList.remove('hidden','picker-open','hero-open','arsenal-open');$('missionShelf').hidden=true;
 $('modalContent').innerHTML='<div class="eyebrow">FENDA DOS SIGILOS</div><h2>PARTIDA PAUSADA</h2>'+
 '<p>Torres, tropas e campeões permanecem nesse estado.</p>'+
 '<div class="actions"><button class="primary" id="resumeFenda">CONTINUAR</button>'+
 '<button class="secondary" id="resetFenda">RECOMEÇAR</button>'+
 '<button class="secondary" id="menuFenda">MENU</button></div>';
 $('resumeFenda').onclick=pause;$('resetFenda').onclick=startGame;$('menuFenda').onclick=chooseHero;
}
function aimData(p){
 const h=S.hero,def=E.skillDef(p.id),enemy=E.nearestEnemy(h,def.range||320,true);
 let dx=enemy?enemy.x-h.x:1,dy=enemy?enemy.y-h.y:0;
 if(p.id==='seris_bloom'&&!p.dragged){
  const friend=E.living(h.side,'hero').filter(u=>dist(h,u)<def.range)
   .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  if(friend){dx=friend.x-h.x;dy=friend.y-h.y}
 }
 let length=Math.min(def.range||120,Math.hypot(dx,dy));
 if(p.dragged){
  dx=p.x-p.sx;dy=p.y-p.sy;
  length=clamp(Math.hypot(dx,dy)*3.2,0,def.range||120);
 }
 const unit=E.norm(dx,dy);
 return{x:unit.x,y:unit.y,distance:length,center:{x:h.x+unit.x*length,y:h.y+unit.y*length}};
}
function skillStart(e,index){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||pointers.skill||!S.hero||S.hero.hp<=0)return;
 const id=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate])[index],def=E.skillDef(id);
 if(def.ultimate&&S.hero.level<5){warn('ULTIMATE LIBERADA NO NÍVEL 5');return}
 if(S.hero.cooldowns[id]>.02){warn('HABILIDADE EM RECARGA');return}
 if(S.hero.energy<def.cost){warn('ENERGIA INSUFICIENTE');return}
 e.preventDefault();e.stopPropagation();
 if(def.aim==='self'){E.cast(S.hero,id);hudUpdate();return}
 pointers.skill={id,ptr:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,
  dragged:false,started:performance.now()};
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function skillMove(e){
 const p=pointers.skill;if(!p||p.ptr!==e.pointerId)return;
 p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>10)p.dragged=true;
 if(performance.now()-p.started>190)aimPreview=p;
}
function skillEnd(e){
 const p=pointers.skill;if(!p||p.ptr!==e.pointerId)return;
 if(e.type==='pointerup'){
  // Deslizar para o canto superior direito cancela sem consumir energia.
  const cancel=p.dragged&&e.clientX>vw*.77&&e.clientY<vh*.20;
  if(cancel)E.announce('HABILIDADE CANCELADA',1.2);
  else if(!E.cast(S.hero,p.id,aimData(p)))warn('NÃO FOI POSSÍVEL LANÇAR A HABILIDADE');
 }
 pointers.skill=null;aimPreview=null;
}
function selectTowerAt(clientX,clientY){
 const r=cv.getBoundingClientRect();
 const x=S.camera.x+clientX-r.left,y=S.camera.y+clientY-r.top;
 const candidate=S.structures.filter(t=>t.side!==S.hero.side&&t.hp>0&&
  (t.kind==='tower'||t.kind==='core')&&Math.hypot(t.x-x,t.y-y)<=t.r+24)
  .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 if(!candidate)return false;
 const result=E.focusTower(S.hero,candidate);
 if(!result.ok)warn(result.reason);
 else E.announce(result.attacked?'OBELISCO SELECIONADO · AA INICIADO':'OBELISCO SELECIONADO · AA EM RECARGA',.9);
 return true;
}
function aaStart(e){
 if(S.mode!=='playing'||S.shopOpen||S.showPause||!S.hero||S.hero.hp<=0)return;
 e.preventDefault();e.stopPropagation();
 pointers.aa=e.pointerId;
 if(!E.autoAttack(S.hero))warn(S.hero.attackCd>.01?'ATAQUE BÁSICO RECARREGANDO':'NENHUM ALVO NO ALCANCE');
 try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}
}
function aaEnd(e){if(pointers.aa===e.pointerId)pointers.aa=null}

function pickAttackTarget(clientX,clientY){
 if(!S.hero)return null;
 const rect=cv.getBoundingClientRect();
 const wx=S.camera.x+clientX-rect.left,wy=S.camera.y+clientY-rect.top;
 const candidates=[
  ...S.units.filter(u=>u.hp>0&&u.side!==S.hero.side&&
   (u.kind==='hero'||u.kind==='minion')&&E.visibleTo(S.hero.side,u)),
  ...S.structures.filter(t=>t.hp>0&&t.side!==S.hero.side),
  ...S.camps.filter(t=>t.hp>0&&(!t.unlock||S.time>=t.unlock)&&E.isPointVisible(S.hero.side,t))
 ];
 const hits=candidates.map(t=>{
  const radius=t.r||(t.kind==='boss'?38:t.kind==='buff'?28:23);
  const distance=Math.hypot(t.x-wx,t.y-wy);
  const hitRadius=Math.max(radius+12,t.kind==='hero'?30:radius+9);
  return{target:t,distance,hitRadius};
 }).filter(o=>o.distance<=o.hitRadius)
   .sort((a,b)=>(a.distance/a.hitRadius)-(b.distance/b.hitRadius));
 return hits[0]?.target||null;
}
function issueRightClick(clientX,clientY){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||!S.hero||S.hero.hp<=0)return;
 const target=pickAttackTarget(clientX,clientY);
 if(target){
  const result=E.commandAttack(S.hero,target);
  clickDestination=null;
  if(result.ok)E.autoAttack(S.hero);
  else warn(result.reason);
 }else{
  E.clearAttackCommand(S.hero);
  const rect=cv.getBoundingClientRect();
  clickDestination={x:clamp(S.camera.x+clientX-rect.left,15,E.W-15),
   y:clamp(S.camera.y+clientY-rect.top,15,E.H-15)};
 }
}
function worldDown(e){
 if(S.mode!=='playing'||S.showPause||S.shopOpen)return;
 if(e.pointerType==='mouse'){
  const rect=cv.getBoundingClientRect();
  if(e.button===2)issueRightClick(e.clientX,e.clientY);
  // AA no PC é exclusivamente por ordem de ataque (clique direito).
  e.preventDefault();return;
 }
 const rect=cv.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
 if(x<vw*.47&&joy.ptr===null){
  joy.ptr=e.pointerId;joy.sx=x;joy.sy=y;joy.x=joy.y=0;
  $('joy').style.left=clamp(x,45,vw*.46)+'px';$('joy').style.top=clamp(y,50,vh-50)+'px';
  $('joy').classList.add('active');
  e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(_){}
 }else if(x>=vw*.47&&!selectTowerAt(e.clientX,e.clientY))E.autoAttack(S.hero);
}
function worldMove(e){
 if(joy.ptr!==e.pointerId)return;
 const rect=cv.getBoundingClientRect();
 const dx=e.clientX-rect.left-joy.sx,dy=e.clientY-rect.top-joy.sy,n=Math.hypot(dx,dy);
 const a=Math.min(1,n/42);
 joy.x=n?dx/n*a:0;joy.y=n?dy/n*a:0;
 $('joyKnob').style.transform='translate(calc(-50% + '+(joy.x*27)+'px),calc(-50% + '+(joy.y*27)+'px))';
}
function worldEnd(e){
 if(joy.ptr!==e.pointerId)return;joy.ptr=null;joy.x=joy.y=0;
 $('joy').classList.remove('active');$('joyKnob').style.transform='translate(-50%,-50%)';
}
function deployWard(){
 if(S.mode!=='playing'||S.showPause||S.shopOpen||!S.hero)return;
 const hero=S.hero,angle=hero.facing||-.68;
 const x=hero.x+Math.cos(angle)*230,y=hero.y+Math.sin(angle)*230;
 const result=E.placeWard(hero,x,y);
 if(!result.ok)warn(result.reason);
 hudUpdate();
}
function keyDown(e){
 if(S.mode!=='playing')return;
 const k=e.key.toLowerCase();
 if(k==='p'&&S.shopOpen||k==='escape'&&S.shopOpen){e.preventDefault();toggleShop();return}
 if(k==='escape'&&S.showPause){e.preventDefault();pause();return}
 if(S.showPause||S.shopOpen)return;
 if(k==='tab'){
  e.preventDefault();desktopScheme=desktopScheme==='wasd'?'arrows':'wasd';
  keys.clear();clickDestination=null;E.clearAttackCommand(S.hero);
  E.announce(desktopScheme==='wasd'?'PC: WASD + HABILIDADES 1/2/3/4':'PC: SETAS + HABILIDADES Q/W/E/R',2.5);
  return;
 }
 keys.add(k);
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(e.repeat)return;
 if(k===' '){if(!E.autoAttack(S.hero))warn('NENHUM ALVO DISPONÍVEL PARA AA');return}
 const slots=desktopScheme==='wasd'?
  {'1':0,'2':1,'3':2,'4':3,q:0,e:2,r:3}:
  {'1':0,'2':1,'3':2,'4':3,q:0,w:1,e:2,r:3};
 const i=slots[k];
 if(i!==undefined){
  const kit=C.heroes[S.hero.id].skills.concat([C.heroes[S.hero.id].ultimate]);
  if(!E.cast(S.hero,kit[i]))warn('HABILIDADE INDISPONÍVEL OU EM RECARGA');return;
 }
 if(k==='v')deployWard();
 else if(k==='b'){if(!E.recall())warn('RETORNO INDISPONÍVEL');}
 else if(k==='p')toggleShop();
 else if(k==='escape')pause();
}
function movement(){
 let x=joy.x,y=joy.y;
 if(keys.has('arrowup')||desktopScheme==='wasd'&&keys.has('w'))y--;
 if(keys.has('arrowdown')||desktopScheme==='wasd'&&keys.has('s'))y++;
 if(keys.has('arrowleft')||desktopScheme==='wasd'&&keys.has('a'))x--;
 if(keys.has('arrowright')||desktopScheme==='wasd'&&keys.has('d'))x++;
 let len=Math.hypot(x,y);
 if(len>.08){
  clickDestination=null;
  E.clearAttackCommand(S.hero);
  return len>1?{x:x/len,y:y/len}:{x,y};
 }
 if(S.hero?.commandTarget){
  const target=S.hero.commandTarget;
  if(!E.isAttackCommandValid(S.hero,target))E.clearAttackCommand(S.hero);
  else{
   const dx=target.x-S.hero.x,dy=target.y-S.hero.y,d=Math.hypot(dx,dy);
   const r=target.r||(target.kind==='boss'?38:target.kind==='buff'?28:23);
   if(d>E.attackRange(S.hero)+r-5)return{x:dx/d,y:dy/d};
   return{x:0,y:0};
  }
 }
 if(clickDestination&&S.hero&&S.hero.hp>0){
  const dx=clickDestination.x-S.hero.x,dy=clickDestination.y-S.hero.y,d=Math.hypot(dx,dy);
  if(d<17){clickDestination=null;return{x:0,y:0}}
  return{x:dx/d,y:dy/d};
 }
 return{x:0,y:0};
}
function loop(now){
 const dt=clamp((now-last)/1000,0,.05);last=now;
 if(S.mode==='playing'){
  if(pointers.skill&&performance.now()-pointers.skill.started>190)aimPreview=pointers.skill;
  if(!S.showPause){
   E.step(dt,movement());
   if(S.hero?.commandTarget){
    const t=S.hero.commandTarget;
    if(!E.isAttackCommandValid(S.hero,t))E.clearAttackCommand(S.hero);
    else{
     const r=t.r||(t.kind==='boss'?38:t.kind==='buff'?28:23);
     if(E.dist(S.hero,t)<=E.attackRange(S.hero)+r+2)E.autoAttack(S.hero);
    }
   }
   view(dt);hudCountdown-=dt;
   if(hudCountdown<=0){hudCountdown=.16;hudUpdate();if(S.shopOpen)shopRender();}
  }
 }else if(S.mode==='ended'){view(0);endScreen();}
 requestAnimationFrame(loop);
}
for(const [i,id] of ['dashBtn','pulseBtn','shieldBtn','ultBtn'].entries()){
 const btn=$(id);
 btn.addEventListener('pointerdown',e=>skillStart(e,i));
 btn.addEventListener('pointermove',skillMove);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,skillEnd);
}
$('fireBtn').addEventListener('pointerdown',aaStart);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('fireBtn').addEventListener(type,aaEnd);
cv.addEventListener('pointerdown',worldDown);
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointermove',worldMove);
for(const type of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(type,worldEnd);
window.addEventListener('keydown',keyDown);
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();joy.ptr=null;joy.x=joy.y=0});
$('fendaShopBtn').onclick=toggleShop;$('fendaShopClose').onclick=toggleShop;
$('fendaWardBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();deployWard()});
$('fendaRecallBtn').onclick=()=>E.recall();$('fendaPauseBtn').onclick=pause;
$('fendaTowerBtn').addEventListener('pointerdown',e=>{
 e.preventDefault();e.stopPropagation();
 if(S.mode!=='playing'||S.shopOpen||S.showPause||!S.hero||S.hero.hp<=0)return;
 const r=E.focusTower(S.hero);
 if(!r.ok)warn(r.reason);
 else if(!r.attacked)warn('TORRE SELECIONADA · AGUARDE O PRÓXIMO AA');
 hudUpdate();
});
mm.addEventListener('pointerdown',e=>{
 if(S.mode!=='playing')return;
 const r=mm.getBoundingClientRect();
 S.marker={x:clamp((e.clientX-r.left)/r.width*E.W,0,E.W),y:clamp((e.clientY-r.top)/r.height*E.H,0,E.H),
  until:S.time+15};
 E.announce('MARCADOR DEFINIDO NO MAPA',1.2);e.preventDefault();
});
window.addEventListener('resize',resize);
if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
window.FendaView={chooseHero,startGame,pause,view,resize,toggleShop,hudUpdate,pickAttackTarget,issueRightClick,movement};
resize();chooseHero();requestAnimationFrame(loop);
})();