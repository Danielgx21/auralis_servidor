(function(){
'use strict';
// Fenda 6.3 — paisagem puramente Canvas. Proibido carregar PNG, SVG, WebP,
// atlas ou desenhos inteiros: cenário é geometria de mundo + cores e luz.
const TAU=Math.PI*2;
function line(g,pts){
 g.beginPath();for(let i=0;i<pts.length;i++){
  const p=pts[i];if(!i)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
 }
}
function polygon(g,pts){
 g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
}
function regular(g,x,y,r,n=6,turn=-Math.PI/2){
 g.beginPath();for(let i=0;i<n;i++){
  const a=turn+TAU*i/n;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  i?g.lineTo(px,py):g.moveTo(px,py);
 }
 g.closePath();
}
function ring(g,x,y,r,color,w=2){
 g.beginPath();g.arc(x,y,r,0,TAU);g.lineWidth=w;g.strokeStyle=color;g.stroke();
}
function randomFactory(seed){
 let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
function glow(g,x,y,r,rgba){
 const grd=g.createRadialGradient(x,y,4,x,y,r);
 grd.addColorStop(0,rgba);grd.addColorStop(1,'#00000000');
 g.fillStyle=grd;g.fillRect(x-r,y-r,2*r,2*r);
}
function drawFoundation(g,E){
 const bg=g.createRadialGradient(E.W*.5,E.H*.53,30,E.W*.5,E.H*.53,2400);
 bg.addColorStop(0,'#21434b');bg.addColorStop(.47,'#133842');bg.addColorStop(1,'#071c2c');
 g.fillStyle=bg;g.fillRect(0,0,E.W,E.H);
 // Jardim / solo mineral: variações amplas, nenhuma textura de imagem.
 for(const [x,y,r,c] of [
  [750,925,640,'#2e77604a'],[1250,560,620,'#326d6241'],
  [1000,1580,480,'#1c615b3d'],[1600,920,570,'#29657440'],
  [2200,1650,600,'#285c6240'],[2500,850,580,'#255b614b']
 ]){
  glow(g,x,y,r,c);glow(g,E.W-x,E.H-y,r,c);
 }
 const rand=randomFactory(6266);
 for(let i=0;i<1900;i++){
  const x=rand()*E.W,y=rand()*E.H,r=rand()*2.5+.5;
  g.fillStyle=i%5===0?'#92b9a31a':'#061c281c';
  g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
 }
 // Pavimento muito antigo sob a vegetação, quase imperceptível.
 g.save();g.strokeStyle='#d0e6d40b';g.lineWidth=1;
 for(let x=90;x<E.W;x+=145){g.beginPath();g.moveTo(x,0);g.lineTo(x,E.H);g.stroke();}
 for(let y=90;y<E.H;y+=145){g.beginPath();g.moveTo(0,y);g.lineTo(E.W,y);g.stroke();}
 g.restore();
}
function drawRiver(g,E){
 // Rio atravessável perpendicular à rota central, com margens sinuosas.
 const pts=[{x:1110,y:-90},{x:1130,y:300},{x:1260,y:630},
  {x:1450,y:990},{x:1640,y:1250},{x:1850,y:1580},
  {x:2050,y:1890},{x:2170,y:2220},{x:2200,y:2600}];
 g.save();g.lineCap='round';g.lineJoin='round';
 for(const [w,col] of [[215,'#081f2e'],[196,'#47686a'],[177,'#1f535f'],
  [148,'#236371'],[83,'#3d819055']]){
  line(g,pts);g.lineWidth=w;g.strokeStyle=col;g.stroke();
 }
 const rand=randomFactory(2208);
 for(let i=0;i<30;i++){
  const t=(i+.5)/30*(pts.length-1);
  const k=Math.min(pts.length-2,Math.floor(t)),f=t-k;
  const x=pts[k].x+(pts[k+1].x-pts[k].x)*f;
  const y=pts[k].y+(pts[k+1].y-pts[k].y)*f;
  g.strokeStyle=i%3===0?'#adede645':'#0a2a3733';
  g.lineWidth=1.5+rand()*1.5;
  g.beginPath();g.moveTo(x-18-rand()*35,y+7);g.quadraticCurveTo(x+12,y+rand()*21,x+21+rand()*35,y-11);g.stroke();
 }
 g.restore();
}
function drawCampGround(g,o){
 const r=o.kind==='boss'?119:86;
 g.save();g.translate(o.x,o.y);g.rotate(-.16);
 g.fillStyle='#071e27a9';g.beginPath();g.ellipse(4,12,r*1.25,r*.74,0,0,TAU);g.fill();
 g.fillStyle='#28484c';g.beginPath();g.ellipse(0,0,r*1.15,r*.72,0,0,TAU);g.fill();
 g.strokeStyle='#73978d6c';g.lineWidth=5;g.stroke();
 g.fillStyle='#193945';g.beginPath();g.ellipse(0,-2,r*.89,r*.52,0,0,TAU);g.fill();
 g.strokeStyle='#416d73';g.lineWidth=2;g.stroke();
 for(let i=0;i<8;i++){
  const a=i*TAU/8,x=Math.cos(a)*r*.98,y=Math.sin(a)*r*.55;
  regular(g,x,y,8,5,a);
  g.fillStyle=i%2?'#41666a':'#6e8d83';g.fill();
 }
 g.restore();
 glow(g,o.x,o.y,r*.6,o.kind==='boss'?'#76e4ec24':'#58b2a920');
}
function drawRoute(g,E,lane){
 const path=E.ROUTE_PATHS[lane];
 g.save();g.lineCap='round';g.lineJoin='round';
 // Corredores de pedra montados sobre a paisagem, não quatro avenidas largas.
 for(const [w,c] of [[205,'#061d2d'],[191,'#54767a'],
  [177,'#233f4c'],[166,'#41626a']]){
  line(g,path);g.strokeStyle=c;g.lineWidth=w;g.stroke();
 }
 // Blocos individualizados e imperfeitos, evitando faixas industriais.
 const rand=randomFactory(117+lane*37);
 const total=E.ROUTE_TOTALS[lane];
 for(let d=36;d<total-25;d+=65+rand()*13){
  const t=d/total,p=E.pathPos(lane,t);
  const prev=E.pathPos(lane,Math.max(0,t-.0015)),next=E.pathPos(lane,Math.min(1,t+.0015));
  const a=Math.atan2(next.y-prev.y,next.x-prev.x);
  g.save();g.translate(p.x,p.y);g.rotate(a);
  for(const sign of [-1,1]){
   const length=41+rand()*18,width=50+rand()*12;
   const y=sign*(33+rand()*3);
   const top=-(length/2),bottom=length/2;
   polygon(g,[[top,y-width/2+4],[top+8,y-width/2],
    [bottom,y-width/2+3],[bottom-4,y+width/2],
    [top+3,y+width/2-3]]);
   g.fillStyle=rand()<.48?'#78928c23':'#0b29363c';g.fill();
   g.strokeStyle='#bed4c01f';g.lineWidth=1.4;g.stroke();
  }
  g.restore();
 }
 // Pequenas inscrições sem virar uma linha pintada em toda a lane.
 for(let t=.10;t<.98;t+=.16){
  const p=E.pathPos(lane,t),q=E.pathPos(lane,Math.min(.999,t+.002));
  const a=Math.atan2(q.y-p.y,q.x-p.x);
  g.save();g.translate(p.x,p.y);g.rotate(a);
  g.strokeStyle='#b1e6da46';g.lineWidth=1.8;
  polygon(g,[[-12,0],[0,-8],[12,0],[0,8]]);g.stroke();
  g.restore();
 }
 g.restore();
}
function drawGateBridges(g,E){
 // Os últimos metros saem da borda do santuário para portões fisicamente
 // SEPARADOS: superior, lateral e inferior. Sem ruas que se sobreponham.
 const bridges=[
  [{x:345,y:1864},{x:345,y:1740}],
  [{x:662,y:1982},{x:730,y:1950}],
  [{x:656,y:2320},{x:730,y:2320}]
 ];
 for(const side of [0,1]){
  for(const pair of bridges){
   const pts=pair.map(p=>side===0?p:{x:E.W-p.x,y:E.H-p.y});
   g.save();g.lineCap='round';g.lineJoin='round';
   for(const [width,col] of [[194,'#061d2b'],[179,'#557c80'],
    [167,'#243d4b'],[157,'#42626a']]){
    line(g,pts);g.lineWidth=width;g.strokeStyle=col;g.stroke();
   }
   g.restore();
  }
 }
}
function drawLeaf(g,x,y,r,rotation,color){
 g.save();g.translate(x,y);g.rotate(rotation);
 polygon(g,[[0,-r],[-r*.66,r*.08],[-r*.11,r*.69],[r*.61,r*.04]]);
 g.fillStyle=color;g.fill();g.strokeStyle='#0a2530a1';g.lineWidth=1.4;g.stroke();
 g.strokeStyle='#89c9aa49';g.beginPath();g.moveTo(0,-r*.74);g.lineTo(0,r*.42);g.stroke();
 g.restore();
}
function drawShrub(g,x,y,r,seed,alpha=1){
 g.save();g.globalAlpha*=alpha;
 g.fillStyle='#001f29a0';g.beginPath();g.ellipse(x+4,y+8,r*1.25,r*.49,0,0,TAU);g.fill();
 const colors=['#28564e','#39745b','#47856a','#244b50','#4c7968'];
 for(let i=0;i<5;i++){
  const a=i*TAU/5+seed*.31;
  const px=x+Math.cos(a)*r*.40,py=y+Math.sin(a)*r*.31;
  drawLeaf(g,px,py,r*.62,a,colors[(i+seed)%colors.length]);
 }
 regular(g,x,y,r*.24,5,seed*.3);
 g.fillStyle='#6da990';g.fill();
 if(seed%7===0){g.fillStyle='#a2d6cc';g.beginPath();g.arc(x-r*.16,y-r*.15,2.2,0,TAU);g.fill();}
 g.restore();
}
function drawVegetation(g,E,S){
 // Bosques são AGRUPAMENTOS, não ruído uniforme nem falsas paredes.
 const spots=[[650,1040],[770,760],[990,600],[1180,1150],[1290,820],[1610,700],
  [850,1500],[1450,1100],[1930,650],[2220,900],[1900,1640]];
 const rand=randomFactory(10421);
 for(let k=0;k<spots.length;k++){
  const [cx,cy]=spots[k];
  for(let i=0;i<12;i++){
   const a=rand()*TAU,radius=30+rand()*155;
   const p={x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius*.74};
   for(const o of [p,{x:E.W-p.x,y:E.H-p.y}]){
    if(o.x<48||o.x>E.W-48||o.y<48||o.y>E.H-48)continue;
    if([0,1,2].some(l=>E.routeProjection(l,o).distance<E.LANE_HALF_WIDTH+42))continue;
    if(S.structures.some(s=>E.dist(s,o)<s.r+79))continue;
    if(S.camps.some(s=>E.dist(s,o)<123))continue;
    if(E.HOME.some(h=>E.dist(h,o)<320))continue;
    if(S.walls.some(w=>E.pointToWall(o,w)<w.halfWidth+45))continue;
    drawShrub(g,o.x,o.y,19+rand()*13,k+i,.68+rand()*.24);
   }
  }
 }
 // Camuflagem legível como moita densa e ampla.
 for(const b of S.brushes){
  glow(g,b.x,b.y,b.r*1.3,'#2ab19a24');
  for(let j=0;j<8;j++){
   const a=j*TAU/8,bx=b.x+Math.cos(a)*b.r*.57,by=b.y+Math.sin(a)*b.r*.40;
   drawShrub(g,bx,by,24,j,1);
  }
  drawShrub(g,b.x,b.y,36,3,1);
 }
}
function drawWall(g,w){
 // Massiço contínuo, não fileira de pedras/símbolos. A largura corresponde
 // exatamente à colisão do segmento no motor (w.halfWidth).
 const dx=w.bx-w.ax,dy=w.by-w.ay,len=Math.hypot(dx,dy);
 const x=(w.ax+w.bx)/2,y=(w.ay+w.by)/2,hw=w.halfWidth;
 g.save();g.translate(x,y);g.rotate(Math.atan2(dy,dx));
 const rand=randomFactory((w.ax*5+w.ay*9+w.bx*3)>>>0);
 const n=Math.max(3,Math.ceil(len/58));
 const top=[],bottom=[];
 for(let i=0;i<=n;i++){
  const p=-len/2+(i/n)*len;
  top.push([p,-hw+(i===0||i===n?0:(rand()-.5)*9)]);
  bottom.push([p,hw+(i===0||i===n?0:(rand()-.5)*9)]);
 }
 const contour=[...top,...bottom.slice().reverse()];
 g.save();g.translate(6,13);polygon(g,contour);
 g.strokeStyle='#02131cbb';g.lineWidth=15;g.stroke();
 g.fillStyle='#061e2bc9';g.fill();g.restore();
 polygon(g,contour);
 const fill=g.createLinearGradient(0,-hw,0,hw+12);
 fill.addColorStop(0,'#8da49a');fill.addColorStop(.24,'#65837c');
 fill.addColorStop(.57,'#395c61');fill.addColorStop(1,'#203d49');
 g.fillStyle=fill;g.fill();
 g.strokeStyle='#102b3a';g.lineWidth=5;g.stroke();
 g.strokeStyle='#b5c2a370';g.lineWidth=2;
 g.beginPath();g.moveTo(-len/2+3,-hw+2);
 for(const p of top.slice(1))g.lineTo(p[0],p[1]+2);g.stroke();
 // Facetas contíguas. Nenhuma rocha repetida como ícone.
 for(let i=0;i<n;i++){
  const x0=-len/2+(i/n)*len,x1=-len/2+((i+1)/n)*len;
  polygon(g,[[x0,-hw+2],[x1,-hw+2],[(x0+x1)/2,hw*.23]]);
  g.fillStyle=i%2?'#b0bbae20':'#0a2d373d';g.fill();
  polygon(g,[[x0,hw],[x1,hw],[(x0+x1)/2,hw*.23]]);
  g.fillStyle=i%3?'#061f2b45':'#9ab1a416';g.fill();
  g.strokeStyle='#b1bd9a25';g.lineWidth=1;
  g.beginPath();g.moveTo((x0+x1)/2,hw*.23);g.lineTo(x1,hw);g.stroke();
 }
 g.restore();
}
function drawRock(g,o){
 const r=o.r;
 g.save();g.translate(o.x,o.y);
 g.fillStyle='#081b278c';g.beginPath();g.ellipse(5,8,r*1.35,r*.7,0,0,TAU);g.fill();
 const pts=[];
 for(let i=0;i<8;i++){
  const a=TAU*i/8,radius=r*(i%3===0?1.08:.90);
  pts.push([Math.cos(a)*radius,Math.sin(a)*radius]);
 }
 polygon(g,pts);g.fillStyle='#31545c';g.fill();
 g.strokeStyle='#152d3a';g.lineWidth=4;g.stroke();
 polygon(g,[[0,-r*.93],[r*.74,-r*.6],[r*.35,r*.22],[-r*.34,r*.26],[-r*.73,-r*.4]]);
 g.fillStyle='#78938a';g.fill();
 polygon(g,[[r*.35,r*.22],[r*.94,r*.2],[r*.35,r*.82],[-r*.34,r*.26]]);
 g.fillStyle='#213d4c';g.fill();
 g.restore();
}
function drawBase(g,E,side){
 // Praça poligonal inteira dentro do canto, com TRÊS portões separados.
 // Desenhar primeiro as pistas, depois a praça: não há tiras sobre a fonte.
 g.save();
 if(side===1){g.translate(E.W,E.H);g.rotate(Math.PI);}
 const home={x:250,y:2245},core={x:485,y:2035};
 const border=[[84,2130],[121,1970],[240,1850],[420,1818],
  [616,1910],[706,2020],[708,2225],[628,2388],
  [440,2440],[270,2435],[107,2345]];
 polygon(g,border);
 g.fillStyle='#152c3c';g.fill();g.lineWidth=20;g.strokeStyle='#061722';g.stroke();
 g.save();g.clip();
 const baseFill=g.createLinearGradient(120,1840,700,2420);
 baseFill.addColorStop(0,'#42626a');baseFill.addColorStop(.5,'#2a4d58');baseFill.addColorStop(1,'#163444');
 g.fillStyle=baseFill;g.fillRect(75,1810,690,655);
 // Piso lapidado em grandes placas, sem tabuleiro xadrez.
 const rand=randomFactory(421);
 for(let y=1865;y<2470;y+=92){
  for(let x=90;x<765;x+=95){
   const shift=(Math.floor(y/92)%2)*46;
   const pts=[[x+shift,y],[x+shift+89,y+rand()*7],
    [x+shift+87,y+87],[x+shift+rand()*8,y+89]];
   polygon(g,pts);g.strokeStyle='#9bb9ac22';g.lineWidth=2;g.stroke();
   if(rand()<.20){g.fillStyle='#b6d5be08';g.fill();}
  }
 }
 g.restore();
 // Borda de bronze fina, não muralha que bloquearia o jogador.
 polygon(g,border);g.lineWidth=6;g.strokeStyle='#7eaaa4';g.stroke();
 polygon(g,border);g.lineWidth=2;g.strokeStyle='#e0c98f91';g.stroke();
 // Portões decorativos abertos: apenas marcas no solo, sem colisão inventada.
 for(const [x,y,angle] of [[345,1832,0],[685,1995,Math.PI/2],[677,2310,Math.PI/2]]){
  g.save();g.translate(x,y);g.rotate(angle);
  g.fillStyle='#173948';g.fillRect(-51,-9,102,18);
  g.strokeStyle='#d7c08d';g.lineWidth=2;g.strokeRect(-51,-9,102,18);
  g.fillStyle='#60d6cf';g.fillRect(-32,-2,64,4);
  g.restore();
 }
 // Rotunda da fonte com anéis de pedra, água e runas.
 g.save();g.translate(home.x,home.y);
 glow(g,0,0,175,'#5ddacb24');
 regular(g,0,0,112,12,Math.PI/12);g.fillStyle='#0a2a3b';g.fill();
 g.lineWidth=9;g.strokeStyle='#8fa8a1';g.stroke();
 regular(g,0,0,98,12,Math.PI/12);g.fillStyle='#254a5b';g.fill();
 g.lineWidth=3;g.strokeStyle='#d4c38f';g.stroke();
 ring(g,0,0,77,'#8bd1c888',3);ring(g,0,0,60,'#83efe0',5);
 const pool=g.createRadialGradient(0,-15,2,0,0,63);
 pool.addColorStop(0,'#67cdd0');pool.addColorStop(.35,'#26758e');pool.addColorStop(1,'#0b374f');
 g.fillStyle=pool;g.beginPath();g.arc(0,0,58,0,TAU);g.fill();
 regular(g,0,0,34,8,Math.PI/8);g.strokeStyle='#bafbef';g.lineWidth=3;g.stroke();
 for(let i=0;i<8;i++){
  const a=i*TAU/8,x=Math.cos(a)*86,y=Math.sin(a)*86;
  regular(g,x,y,7,4,a);g.fillStyle='#b1ddd3';g.fill();
 }
 g.restore();
 // Pátio do núcleo com pedestal octogonal; cristal é entidade dinâmica.
 g.save();g.translate(core.x,core.y);
 regular(g,0,0,88,8,Math.PI/8);g.fillStyle='#112e3d';g.fill();
 g.lineWidth=8;g.strokeStyle='#668f93';g.stroke();
 regular(g,0,0,75,8,Math.PI/8);g.fillStyle='#224858';g.fill();
 g.lineWidth=2;g.strokeStyle='#d8bc89';g.stroke();
 ring(g,0,0,53,'#73dcca75',3);
 for(let i=0;i<8;i++){
  const a=i*TAU/8;
  regular(g,Math.cos(a)*64,Math.sin(a)*64,6,4,a);
  g.fillStyle='#89f2e1';g.fill();
 }
 g.restore();
 g.restore();
}
function drawTerrain(E,S){
 const c=document.createElement('canvas');c.width=E.W;c.height=E.H;
 const g=c.getContext('2d',{alpha:false});
 drawFoundation(g,E);
 drawRiver(g,E);
 for(const camp of S.camps)drawCampGround(g,camp);
 for(let i=0;i<3;i++)drawRoute(g,E,i);
 drawGateBridges(g,E);
 drawVegetation(g,E,S);
 for(const w of S.walls)drawWall(g,w);
 for(const o of S.obstacles)drawRock(g,o);
 for(const side of [0,1])drawBase(g,E,side);
 return c;
}
window.FendaScenery={drawTerrain,drawBase,drawWall,drawRock,drawRoute};
})();
