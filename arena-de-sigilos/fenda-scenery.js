(function(){
'use strict';
// Identidade Arena Teamfight: geometria, anéis, hexágonos e luz suave.
// Nenhuma imagem, textura, sprite ou avenida artificial é desenhada.
const TAU=Math.PI*2;
const C={bg:'#081827',deep:'#071321',floor:'#10283b',line:'#6087a0',cyan:'#69e6e4',red:'#ed829e'};
const rnd=(seed)=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)};
function hex(g,x,y,r,n=6,a=-Math.PI/2){g.beginPath();for(let i=0;i<n;i++){let t=a+i*TAU/n;if(!i)g.moveTo(x+Math.cos(t)*r,y+Math.sin(t)*r);else g.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}g.closePath();}
function ring(g,x,y,r,c,w=1.4){g.beginPath();g.arc(x,y,r,0,TAU);g.lineWidth=w;g.strokeStyle=c;g.stroke();}
function halo(g,x,y,r,c){let v=g.createRadialGradient(x,y,0,x,y,r);v.addColorStop(0,c);v.addColorStop(1,'#00000000');g.fillStyle=v;g.fillRect(x-r,y-r,r*2,r*2);}
function fond(g,E){
 const b=g.createRadialGradient(E.W*.5,E.H*.50,120,E.W*.5,E.H*.5,2200);
 b.addColorStop(0,'#18374a');b.addColorStop(.53,'#0c273a');b.addColorStop(1,'#061523');
 g.fillStyle=b;g.fillRect(0,0,E.W,E.H);
 g.lineWidth=1;g.strokeStyle='#77b7d113';g.beginPath();
 for(let x=0;x<E.W;x+=90){g.moveTo(x,0);g.lineTo(x,E.H);}
 for(let y=0;y<E.H;y+=90){g.moveTo(0,y);g.lineTo(E.W,y);}g.stroke();
 const random=rnd(1007);
 g.fillStyle='#a5cde620';
 for(let i=0;i<180;i++){let x=random()*E.W,y=random()*E.H,r=random()*2+1;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
 // Emblema do protótipo como baixo-relevo: apenas o chão, sem colisão imaginária.
 const x=E.W/2,y=E.H/2;
 halo(g,x,y,535,'#2c96aa11');ring(g,x,y,360,'#79bfd526',2.2);ring(g,x,y,282,'#79bfd521',1.6);
 ring(g,x,y,180,'#65b9c01b',1.4);ring(g,x,y,84,'#65c9c02a',2.4);
 for(let i=0;i<12;i++){let a=i*TAU/12,p=350,q=383;g.beginPath();g.moveTo(x+Math.cos(a)*p,y+Math.sin(a)*p);g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);g.strokeStyle='#a1dbe438';g.lineWidth=2;g.stroke();}
 hex(g,x,y,57,6,Math.PI/6);g.strokeStyle='#69c9c037';g.lineWidth=2.1;g.stroke();
 hex(g,x,y,30,3,-Math.PI/2);g.strokeStyle='#7bd9d550';g.stroke();
 g.fillStyle='#9bf6dfaa';g.beginPath();g.arc(x,y,5,0,TAU);g.fill();
}
function base(g,E,side){
 const h=E.HOME[side],c=E.CORE[side],col=E.SIDE[side];
 g.save();
 // Santuário compacto. Não há faixa pavimentada cruzando todo o mapa.
 halo(g,(h.x+c.x)/2,(h.y+c.y)/2,390,side?'#da6b8f11':'#47d2dc12');
 const cx=(h.x+c.x)/2,cy=(h.y+c.y)/2;
 hex(g,cx,cy,322,8,Math.PI/8);g.fillStyle='#18334a55';g.fill();g.strokeStyle='#80bed22d';g.lineWidth=5;g.stroke();
 hex(g,cx,cy,307,8,Math.PI/8);g.strokeStyle='#a7d9e31a';g.lineWidth=1.2;g.stroke();
 // A fonte é um altar circular, em escala próxima à arena original.
 halo(g,h.x,h.y,174,side?'#ed829e22':'#69e6e422');
 hex(g,h.x,h.y,104,12,Math.PI/12);g.fillStyle='#0a2133';g.fill();g.strokeStyle='#477f8b';g.lineWidth=5;g.stroke();
 ring(g,h.x,h.y,87,'#a2c6c44f',2);ring(g,h.x,h.y,73,col+'9b',3.5);ring(g,h.x,h.y,52,'#bafce46e',1.8);
 hex(g,h.x,h.y,37,6,-Math.PI/2);g.fillStyle='#123f50';g.fill();g.strokeStyle=col;g.lineWidth=2.5;g.stroke();
 hex(g,h.x,h.y,19,4,Math.PI/4);g.fillStyle=col;g.fill();
 for(let i=0;i<8;i++){const a=i*TAU/8;hex(g,h.x+Math.cos(a)*93,h.y+Math.sin(a)*93,5,4,Math.PI/4);g.fillStyle='#8beee7ac';g.fill();}
 // Plataforma do núcleo ligada visualmente à fonte, sem muralhas falsas.
 hex(g,c.x,c.y,78,8,Math.PI/8);g.fillStyle='#10293b';g.fill();g.strokeStyle='#7099a5';g.lineWidth=5;g.stroke();
 hex(g,c.x,c.y,66,8,Math.PI/8);g.fillStyle='#183b4e';g.fill();g.strokeStyle=col+'a8';g.lineWidth=2;g.stroke();
 ring(g,c.x,c.y,48,'#9bdad751',1.5);
 // Três portais de saída: as colunas físicas são desenhadas por drawRock.
 // Não desenhar faixas ou pontes. A passagem é o espaço livre entre colunas.
 for(let i=0;i<3;i++){
  const p=E.BASE_GATE[side][i],next=E.pathPos(i,side?0.985:0.015);
  let angle=Math.atan2(next.y-p.y,next.x-p.x);
  g.save();g.translate(p.x,p.y);g.rotate(angle);
  hex(g,0,0,53,6,Math.PI/6);g.strokeStyle=col+'42';g.lineWidth=2;g.stroke();
  g.fillStyle=col+'24';g.beginPath();g.arc(0,0,9,0,TAU);g.fill();
  g.restore();
 }
 g.restore();
}
function jungleCamp(g,o){
 const r=o.kind==='boss'?104:75;
 halo(g,o.x,o.y,r*1.55,o.kind==='boss'?'#bb9cff15':'#53b9d211');
 hex(g,o.x,o.y,r,6,Math.PI/6);g.fillStyle='#071d2a7e';g.fill();g.strokeStyle='#6d9ba34f';g.lineWidth=3;g.stroke();
 hex(g,o.x,o.y,r-11,6,Math.PI/6);g.strokeStyle='#9ddbc924';g.lineWidth=1.4;g.stroke();
 ring(g,o.x,o.y,r*.54,o.color+'48',2.1);
 for(let i=0;i<6;i++){let a=i*TAU/6,x=o.x+Math.cos(a)*(r-18),y=o.y+Math.sin(a)*(r-18);hex(g,x,y,4,4,Math.PI/4);g.fillStyle=o.color+'8b';g.fill();}
}
function wall(g,w){
 const dx=w.bx-w.ax,dy=w.by-w.ay,L=Math.hypot(dx,dy),h=w.halfWidth;
 g.save();g.translate(w.x,w.y);g.rotate(Math.atan2(dy,dx));
 // Volumes sólidos CONTÍNUOS, idênticos à linha de colisão, com chanfros técnicos.
 const x=-L/2,y=L/2;g.beginPath();g.moveTo(x+15,-h);g.lineTo(y-15,-h);g.lineTo(y+3,-h+15);
 g.lineTo(y+3,h-15);g.lineTo(y-15,h);g.lineTo(x+15,h);g.lineTo(x-3,h-15);g.lineTo(x-3,-h+15);g.closePath();
 g.save();g.translate(4,11);g.fillStyle='#020e19a6';g.fill();g.restore();
 let grad=g.createLinearGradient(0,-h,0,h);grad.addColorStop(0,'#436d80');grad.addColorStop(.35,'#213d56');grad.addColorStop(1,'#0e283f');
 g.fillStyle=grad;g.fill();g.strokeStyle='#79b5c270';g.lineWidth=3.2;g.stroke();
 // Uma costura superior contínua, não fileira de pedrinhas decorativas.
 g.beginPath();g.moveTo(x+15,-h+8);g.lineTo(y-15,-h+8);
 g.strokeStyle='#a2e9df44';g.lineWidth=2;g.stroke();
 for(let t=-L/2+38;t<L/2-20;t+=94){g.beginPath();g.moveTo(t,-h+10);g.lineTo(t+17,-1);g.lineTo(t+9,h-7);g.strokeStyle='#77bfcb21';g.lineWidth=1.3;g.stroke();}
 for(let a of [x,y]){
  hex(g,a,0,h*.62,6,Math.PI/6);g.fillStyle='#09283a';g.fill();g.strokeStyle='#74b9c6aa';g.lineWidth=2.2;g.stroke();
  hex(g,a,0,h*.27,4,Math.PI/4);g.fillStyle='#85ded2b8';g.fill();
 }
 g.restore();
}
function rock(g,o){
 const r=o.r||24;
 g.save();g.translate(o.x,o.y);g.shadowColor='#0af0f01a';g.shadowBlur=10;
 hex(g,0,6,r+8,6,Math.PI/6);g.fillStyle='#031521';g.fill();g.shadowBlur=0;
 hex(g,0,0,r+3,6,Math.PI/6);g.fillStyle='#1b3b54';g.fill();g.strokeStyle='#5d96a6';g.lineWidth=3;g.stroke();
 hex(g,0,0,r*.76,6,Math.PI/6);g.fillStyle='#2c5267';g.fill();g.strokeStyle='#8bb9ba55';g.lineWidth=1.5;g.stroke();
 hex(g,0,0,r*.34,4,Math.PI/4);g.fillStyle=o.kind==='gate'?'#5ae5dc':'#4f9fb1';g.fill();
 g.restore();
}
function brush(g,b){
 // Camuflagem etérea, no mesmo estilo geométrico. Não confundir com parede.
 const r=b.r;
 halo(g,b.x,b.y,r*1.25,'#51bbae13');
 for(let i=0;i<7;i++){
  const a=i*TAU/7,x=b.x+Math.cos(a)*r*.65,y=b.y+Math.sin(a)*r*.65;
  hex(g,x,y,23,6,Math.PI/6);g.fillStyle=i%2?'#173e4c':'#164049';g.fill();g.strokeStyle='#69d9c64c';g.lineWidth=1.4;g.stroke();
  hex(g,x,y,9,4,Math.PI/4);g.strokeStyle='#a1ece529';g.stroke();
 }
 ring(g,b.x,b.y,r*.52,'#7cc3bb2a',1.5);
}
function terrain(E,S){
 const c=document.createElement('canvas');c.width=E.W;c.height=E.H;
 const g=c.getContext('2d',{alpha:false});fond(g,E);
 // Camada de chão antes dos sólidos: portões reais e pilares não ficam
 // escondidos sob a decoração da praça.
 for(let side=0;side<2;side++)base(g,E,side);
 for(const camp of S.camps)jungleCamp(g,camp);
 for(const b of S.brushes)brush(g,b);
 for(const w of S.walls)wall(g,w);
 for(const o of S.obstacles)rock(g,o);
 return c;
}
window.FendaScenery={drawTerrain:terrain,drawBase:base,drawWall:wall,drawRock:rock};
})();