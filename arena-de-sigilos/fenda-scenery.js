(function(){
'use strict';
// Fenda 8.4 — linguagem geométrica da primeira Teamfight, 100% Canvas.
// O piso da lane agora tem área legível, mas NÃO substitui as paredes físicas.
// Torres, caminhos e colisões são sempre posicionados pelo FendaEngine.
const TAU=Math.PI*2;
function hex(g,x,y,r,n=6,a=-Math.PI/2){
 g.beginPath();
 for(let i=0;i<n;i++){
  const t=a+i*TAU/n,p=x+Math.cos(t)*r,q=y+Math.sin(t)*r;
  if(i)g.lineTo(p,q);else g.moveTo(p,q);
 }
 g.closePath();
}
function ring(g,x,y,r,color,w=1.5){
 g.beginPath();g.arc(x,y,r,0,TAU);g.strokeStyle=color;g.lineWidth=w;g.stroke();
}
function polygon(g,pts){
 g.beginPath();
 pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
 g.closePath();
}
function path(g,pts){
 g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
}
function fond(g,E){
 // Escuro fora do perímetro; piso contínuo apenas dentro da arena física.
 g.fillStyle='#05111b';g.fillRect(0,0,E.W,E.H);
 g.save();
 path(g,E.ARENA_BOUNDARY);
 g.fillStyle='#091f2b';g.fill();
 g.clip();
 g.strokeStyle='#82bacc14';g.lineWidth=1;
 g.beginPath();
 for(let x=0;x<=E.W;x+=115){g.moveTo(x,0);g.lineTo(x,E.H)}
 for(let y=0;y<=E.H;y+=115){g.moveTo(0,y);g.lineTo(E.W,y)}
 g.stroke();
 g.restore();
}
function arenaRim(g,E){
 // O contorno é desenhado exatamente onde a física impede atravessar.
 g.save();g.lineJoin='round';
 path(g,E.ARENA_BOUNDARY);
 g.strokeStyle='#020b13';g.lineWidth=22;g.stroke();
 g.strokeStyle='#487e8199';g.lineWidth=8;g.stroke();
 g.strokeStyle='#b5d3aa48';g.lineWidth=2;g.stroke();
 g.restore();
}
function jungleZones(g,E){
 // GROUND jungle diferente da lane; não são paredes fantasmas.
 // As sombras existem somente em torno de acampamentos e obstáculos reais.
}
function laneFloor(g,E,lane){
 const pts=E.ROUTE_PATHS[lane],half=E.LANE_HALF_WIDTH;
 g.save();g.lineCap='butt';g.lineJoin='round';
 // Faixa ampla, fosca, como uma plataforma de combate entre as jungles.
 // Não há pista pintada com bordas fluorescentes ou listras de estrada.
 for(const [width,color] of [
  [half*2+78,'#071523'],
  [half*2+62,'#173c4a'],
  [half*2+37,'#315363'],
  [half*2+15,'#2b4a5b']
 ]){
  path(g,pts);g.lineWidth=width;g.strokeStyle=color;g.stroke();
 }
 // Grandes placas irregulares. Lembram o piso da arena original, não asfalto.
 const total=E.ROUTE_TOTALS[lane];
 for(let d=65,k=0;d<total-55;d+=98,k++){
  const t=d/total,p=E.pathPos(lane,t),
    a=E.pathPos(lane,Math.max(0,t-.002)),
    b=E.pathPos(lane,Math.min(1,t+.002)),
    vx=b.x-a.x,vy=b.y-a.y,m=Math.hypot(vx,vy)||1,
    nx=-vy/m,ny=vx/m,dx=vx/m,dy=vy/m;
  const side=(k%2?1:-1);
  // Lajotas sem linha central contínua. Deixa o campo limpo, mas legível.
  const tile=[];
  for(const [parallel,normal] of [[-28,side*15],[34,side*23],
    [27,side*(half-22)],[-34,side*(half-30)]]){
   tile.push({x:p.x+dx*parallel+nx*normal,
    y:p.y+dy*parallel+ny*normal});
  }
  polygon(g,tile);g.fillStyle=k%3===0?'#adc3b80e':'#9dcecf0b';g.fill();
  g.strokeStyle='#b4d3c12c';g.lineWidth=1.2;g.stroke();
  // Inscrição mínima nas extremidades: sem sinais aleatórios pelo mapa.
  if(k%7===0){
   const cx=p.x+nx*side*(half-46),cy=p.y+ny*side*(half-46);
   hex(g,cx,cy,9,4,Math.PI/4);
   g.strokeStyle='#b1e5e25a';g.lineWidth=1.2;g.stroke();
  }
 }
 g.restore();
}
function base(g,E,side){
 const home=E.HOME[side],core=E.CORE[side],col=E.SIDE[side];
 g.save();
 // Núcleo e fonte legíveis no piso, sem desenhar praças gigantes.
 ring(g,home.x,home.y,99,col+'7f',3);
 ring(g,home.x,home.y,81,'#a3d7d04b',2);
 ring(g,home.x,home.y,56,col+'40',2);
 hex(g,home.x,home.y,39,6,Math.PI/6);
 g.fillStyle='#153948';g.fill();g.strokeStyle=col+'c9';g.lineWidth=2;g.stroke();
 hex(g,home.x,home.y,20,4,Math.PI/4);
 g.fillStyle=col;g.fill();
 hex(g,core.x,core.y,78,8,Math.PI/8);
 g.fillStyle='#123244';g.fill();g.strokeStyle='#98b9b259';g.lineWidth=3;g.stroke();
 ring(g,core.x,core.y,58,col+'a0',3);
 ring(g,core.x,core.y,37,'#b5e2d34d',1.4);
 // Os três portões estão dentro do perímetro FÍSICO.
 for(let i=0;i<3;i++){
  const p=E.BASE_GATE[side][i];
  ring(g,p.x,p.y,24,col+'50',1.5);
  g.textAlign='center';g.font='700 12px system-ui';
  g.fillStyle=side===0?'#b4eae2bb':'#f6b9c8bb';
  g.fillText(['TOP','MID','BOT'][i],p.x,p.y-36);
 }
 g.restore();
}
function jungleCamp(g,o){
 const boss=o.kind==='boss',r=boss?75:51;
 // A clareira marca o lugar do acampamento sem inventar hitbox.
 hex(g,o.x,o.y,r+12,6,Math.PI/6);
 g.fillStyle='#102d36';g.fill();
 g.strokeStyle='#53818a88';g.lineWidth=2.5;g.stroke();
 ring(g,o.x,o.y,r,o.color+'9e',2.1);
 hex(g,o.x,o.y,r*.56,6,Math.PI/6);
 g.fillStyle='#133443';g.fill();g.strokeStyle=o.color+'75';g.lineWidth=1.5;g.stroke();
 hex(g,o.x,o.y,boss?21:14,4,Math.PI/4);
 g.fillStyle=o.color+'df';g.fill();
}
function wallChain(g,ws){
 if(!ws.length)return;
 const half=ws[0].halfWidth;
 const points=[{x:ws[0].ax,y:ws[0].ay},...ws.map(w=>({x:w.bx,y:w.by}))];
 // Contorno faceteado: geométrico e sólido, sem barras arredondadas.
 const upper=[],lower=[];
 for(let i=0;i<points.length;i++){
  const prev=points[Math.max(0,i-1)],next=points[Math.min(i+1,points.length-1)];
  const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len;
  upper.push({x:points[i].x+nx*half,y:points[i].y+ny*half});
  lower.push({x:points[i].x-nx*half,y:points[i].y-ny*half});
 }
 const shape=[...upper,...lower.slice().reverse()];
 g.save();g.lineJoin='bevel';
 polygon(g,shape);
 g.fillStyle=ws[0].wallClass==='base'?'#122e40':'#163743';
 g.fill();g.strokeStyle='#081725';g.lineWidth=8;g.stroke();
 polygon(g,shape);g.strokeStyle='#5a879080';g.lineWidth=2.4;g.stroke();
 path(g,upper);g.strokeStyle='#99c3b163';g.lineWidth=2.2;g.stroke();
 // Facetas por dentro do volume, não símbolos independentes no piso.
 if(half>29){
  g.beginPath();
  for(let i=0;i<points.length;i++){
   const p=points[i],q=upper[i];
   if(i===0)g.moveTo(p.x*.65+q.x*.35,p.y*.65+q.y*.35);
   else g.lineTo(p.x*.65+q.x*.35,p.y*.65+q.y*.35);
  }
  g.strokeStyle='#a3c5b824';g.lineWidth=1.6;g.stroke();
 }
 g.restore();
}
function wall(g,w){wallChain(g,[w]);}
function rock(g,o){
 const r=o.r||22;
 hex(g,o.x,o.y,r+3,6,Math.PI/6);
 g.fillStyle='#102d3b';g.fill();g.strokeStyle='#6fb2bb90';g.lineWidth=2;g.stroke();
 hex(g,o.x,o.y,7,4,Math.PI/4);
 g.fillStyle=o.kind==='gate'?'#68e1da':'#79c1c6';g.fill();
}
function brush(g,b){
 // Moitas de jogo geométricas, verdes/teal, agrupadas no espaço da jungle.
 for(let i=0;i<5;i++){
  const t=i*TAU/5+Math.PI/6;
  const x=b.x+Math.cos(t)*b.r*.47,y=b.y+Math.sin(t)*b.r*.47;
  hex(g,x,y,23,6,Math.PI/6);
  g.fillStyle=i%2?'#214f4b':'#28584e';g.fill();
  g.strokeStyle='#79b29a76';g.lineWidth=1.5;g.stroke();
 }
 hex(g,b.x,b.y,24,6,Math.PI/6);g.fillStyle='#356451';g.fill();
 ring(g,b.x,b.y,b.r*.86,'#72c7a34b',1.6);
}
function terrain(E,S){
 const c=document.createElement('canvas');c.width=E.W;c.height=E.H;
 const g=c.getContext('2d',{alpha:false});
 fond(g,E);jungleZones(g,E);
 // Chão da rota é a primeira camada; nunca se sobrepõe a torres ou muralhas.
 for(let lane=0;lane<3;lane++)laneFloor(g,E,lane);
 for(const side of [0,1])base(g,E,side);
 for(const camp of S.camps)jungleCamp(g,camp);
 for(const b of S.brushes)brush(g,b);
 const chains=new Map();
 for(const w of S.walls){
  const key=w.chain||w.id;
  if(!chains.has(key))chains.set(key,[]);
  chains.get(key).push(w);
 }
 for(const group of chains.values())wallChain(g,group);
 for(const o of S.obstacles)rock(g,o);
 arenaRim(g,E);
 return c;
}
window.FendaScenery={drawTerrain:terrain,drawBase:base,drawWall:wall,drawRock:rock};
})();