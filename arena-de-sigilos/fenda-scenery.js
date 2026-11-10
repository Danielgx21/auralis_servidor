(function(){
'use strict';
// Cenario minimalista da primeira Teamfight, inteiramente Canvas.
// Nada de imagens, pisos decorativos, estradas ou blocos gigantes.
const TAU=Math.PI*2;
function hex(g,x,y,r,n=6,a=-Math.PI/2){
 g.beginPath();
 for(let i=0;i<n;i++){
  const ang=a+i*TAU/n,px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;
  if(i)g.lineTo(px,py);else g.moveTo(px,py);
 }
 g.closePath();
}
function ring(g,x,y,r,color,width=1.5){
 g.beginPath();g.arc(x,y,r,0,TAU);
 g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function fond(g,E){
 // Mesmo fundo quase uniforme da primeira arena: azul noturno + grid fino.
 g.fillStyle='#081c2d';g.fillRect(0,0,E.W,E.H);
 g.strokeStyle='#89b6d00f';g.lineWidth=1;
 g.beginPath();
 for(let x=0;x<=E.W;x+=110){g.moveTo(x,0);g.lineTo(x,E.H)}
 for(let y=0;y<=E.H;y+=110){g.moveTo(0,y);g.lineTo(E.W,y)}
 g.stroke();
 // Um unico sigilo central discreto, nao uma massa que esconde a arena.
 const x=E.W/2,y=E.H/2;
 ring(g,x,y,63,'#78bec628',2);
 ring(g,x,y,41,'#78bec624',1);
 hex(g,x,y,25,6,Math.PI/6);
 g.strokeStyle='#8bdbd33d';g.lineWidth=1.5;g.stroke();
 g.fillStyle='#84e6d8a0';g.beginPath();g.arc(x,y,3,0,TAU);g.fill();
}
function jungleZones(g,E){
 // Nao preencher quadrantes com polígonos gigantes. A jungle e definida
 // por paredes reais e seus acampamentos, nao por desenhos de solo.
}
function base(g,E,side){
 const home=E.HOME[side],core=E.CORE[side],col=E.SIDE[side];
 g.save();
 // Plataforma discreta da fonte. O perimetro fisico e desenhado a partir de S.walls.
 ring(g,home.x,home.y,96,col+'72',3);
 ring(g,home.x,home.y,76,'#a4ccce53',1.7);
 ring(g,home.x,home.y,50,col+'47',1.6);
 hex(g,home.x,home.y,34,6,Math.PI/6);
 g.fillStyle='#0e3042';g.fill();g.strokeStyle=col+'b8';g.lineWidth=2;g.stroke();
 hex(g,home.x,home.y,17,4,Math.PI/4);
 g.fillStyle=col;g.fill();
 // Nucleo e uma estrutura separada e legivel.
 hex(g,core.x,core.y,79,8,Math.PI/8);
 g.fillStyle='#0a2639';g.fill();g.strokeStyle='#7aa1a763';g.lineWidth=3;g.stroke();
 ring(g,core.x,core.y,58,col+'8c',2.5);
 ring(g,core.x,core.y,39,'#a7e5df38',1.5);
 // Sinais pequenos nos portoes: sem rua desenhada, sem falso corredor.
 for(let i=0;i<3;i++){
  const p=E.BASE_GATE[side][i];
  ring(g,p.x,p.y,36,col+'50',1.5);
  g.textAlign='center';g.font='700 12px system-ui';
  g.fillStyle=side===0?'#a9e3e1a8':'#f2b8c8a8';
  g.fillText(['TOP','MID','BOT'][i],p.x,p.y-43);
 }
 g.restore();
}
function jungleCamp(g,o){
 const boss=o.kind==='boss',r=boss?68:46;
 ring(g,o.x,o.y,r,o.color+'68',boss?2.6:2);
 hex(g,o.x,o.y,r*.69,6,Math.PI/6);
 g.strokeStyle=o.color+'50';g.lineWidth=1.4;g.stroke();
 g.fillStyle='#112b3d';g.fill();
 hex(g,o.x,o.y,boss?19:12,4,Math.PI/4);
 g.fillStyle=o.color+'b6';g.fill();
}
function wallChain(g,ws){
 if(!ws.length)return;
 // Colisao REAL e visual: uma barreira estreita e escura, com contorno fino.
 // Sem preenchimentos azuis gigantes nem capiteis em suas extremidades.
 const pts=[{x:ws[0].ax,y:ws[0].ay},...ws.map(w=>({x:w.bx,y:w.by}))];
 const half=ws[0].halfWidth;
 g.save();g.lineCap='round';g.lineJoin='round';
 g.beginPath();
 pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));
 g.strokeStyle='#4b829066';g.lineWidth=2*half+4;g.stroke();
 g.strokeStyle='#071522';g.lineWidth=2*half;g.stroke();
 g.strokeStyle='#123043';g.lineWidth=Math.max(1,2*half-9);g.stroke();
 g.restore();
}
function wall(g,w){wallChain(g,[w]);}
function rock(g,o){
 const r=o.r||22;
 hex(g,o.x,o.y,r+2,6,Math.PI/6);
 g.fillStyle='#102a3d';g.fill();g.strokeStyle='#71bfcb9c';g.lineWidth=2;g.stroke();
 hex(g,o.x,o.y,7,4,Math.PI/4);
 g.fillStyle=o.kind==='gate'?'#6ae4dd':'#74c5ce';g.fill();
}
function brush(g,b){
 // Um anel baixo e discreto de camuflagem, nao um bloco de cristais.
 ring(g,b.x,b.y,b.r*.77,'#56c3ac4a',1.6);
 for(let i=0;i<4;i++){
  const a=TAU*i/4;
  const x=b.x+Math.cos(a)*b.r*.52,y=b.y+Math.sin(a)*b.r*.52;
  hex(g,x,y,12,6,Math.PI/6);
  g.fillStyle='#17453f';g.fill();
  g.strokeStyle='#4eb6a466';g.lineWidth=1.1;g.stroke();
 }
}
function terrain(E,S){
 const c=document.createElement('canvas');c.width=E.W;c.height=E.H;
 const g=c.getContext('2d',{alpha:false});
 fond(g,E);jungleZones(g,E);
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
 return c;
}
window.FendaScenery={drawTerrain:terrain,drawBase:base,drawWall:wall,drawRock:rock};
})();