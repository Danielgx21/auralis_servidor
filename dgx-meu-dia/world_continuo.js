/* DGX · AETHERA · v0.18
 * Mapa geográfico vetorial selecionável e simulação histórica persistida no Neon.
 * 1 ano virtual = 8 segundos reais no modo normal, apenas com a aba aberta.
 */
(function(){
"use strict";
const E=window.DGXWorldEngine;
if(!E){console.error("Mundo Contínuo: motor não encontrado");return}
const KEY="dgx_world_v1", $=id=>document.getElementById(id);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=n=>fmt(n*100,1)+"%";
const colors=E.COLOR;
const NATION_COUNT=30;
let world=E.create(),selected=6,playing=false,speed=1,elapsed=0,lastFrame=Date.now(),mapMode="relations",colorFilter="all",sortMode="influence",filterHistory="all",active=false,saving=0;
const centers=new Map(),regions=[];
const nodesLeft=[
 [[96,151],[191,133],[301,154],[393,177]],
 [[71,249],[171,231],[293,250],[419,240]],
 [[72,349],[187,355],[293,342],[417,358]],
 [[97,448],[187,454],[278,450],[380,468]]
];
const nodesCenter=[
 [[475,195],[589,174],[704,184],[796,220]],
 [[455,295],[572,286],[693,305],[824,290]],
 [[454,395],[554,408],[698,392],[811,398]],
 [[502,574],[598,595],[710,559],[798,532]]
];
const nodesEast=[
 [[887,169],[1009,137],[1131,182]],
 [[852,275],[1003,265],[1148,288]],
 [[880,380],[991,390],[1151,389]],
 [[915,555],[1017,553],[1122,521]]
];
const p=(x,y)=>({x,y});
const edgeKey=(a,b)=>[[a.x,a.y].join(","),[b.x,b.y].join(",")].sort().join("|");
function mid(a,b){
 const h=edgeKey(a,b).split("").reduce((acc,ch)=>(acc*31+ch.charCodeAt(0))|0,667);
 // O mesmo ponto intermediário é usado nas duas nações vizinhas,
 // impedindo fendas entre os limites internacionais.
 const dx=b.x-a.x,dy=b.y-a.y,scale=(h%13-6)/120;
 return p((a.x+b.x)/2-dy*scale,(a.y+b.y)/2+dx*scale);
}
function smoothPolygon(corners){
 const pts=[];
 for(let i=0;i<corners.length;i++){
  const a=corners[i],b=corners[(i+1)%corners.length];
  pts.push(a,mid(a,b));
 }
 return pts;
}
function addRegion(id,corners){
 const poly=smoothPolygon(corners.map(v=>Array.isArray(v)?p(v[0],v[1]):v));
 const pts=poly.map(q=>q.x.toFixed(1)+","+q.y.toFixed(1)).join(" ");
 const centroid=poly.reduce((acc,v)=>({x:acc.x+v.x,y:acc.y+v.y}),{x:0,y:0});
 const center={x:centroid.x/poly.length,y:centroid.y/poly.length};
 regions.push({id,pts,center});
 centers.set(id,center);
}
function addGrid(nodes,ids){
 for(let row=0;row<nodes.length-1;row++){
  for(let col=0;col<nodes[row].length-1;col++){
   const n0=nodes[row][col],n1=nodes[row][col+1],n2=nodes[row+1][col+1],n3=nodes[row+1][col];
   addRegion(ids[row][col],[n0,n1,n2,n3]);
  }
 }
}
addGrid(nodesLeft,[[1,2,3],[4,5,6],[7,8,9]]);
addRegion(10,[...nodesLeft[3],[346,551],[287,572],[191,576],[127,557]]);
addGrid(nodesCenter,[[13,14,15],[16,17,18],[19,20,21]]);
addGrid(nodesEast,[[23,22],[26,24],[27,25]]);
addRegion(11,[[445,114],[475,76],[506,92],[522,53],[563,79],[590,47],[636,81],[610,127],[566,139],[526,115]]);
addRegion(12,[[669,121],[673,75],[709,55],[742,81],[779,73],[790,122],[748,144],[701,127]]);
addRegion(28,[[82,627],[121,596],[177,619],[218,596],[265,639],[226,676],[174,655],[132,682],[92,661]]);
addRegion(29,[[402,669],[457,637],[535,646],[592,622],[714,623],[722,746],[585,759],[434,741]]);
addRegion(30,[[714,623],[816,607],[905,630],[995,655],[1021,728],[896,755],[785,760],[722,746]]);
if(regions.length!==NATION_COUNT||new Set(regions.map(r=>r.id)).size!==30)throw Error("Mapa com número incorreto de regiões");
const regionBy=id=>regions.find(r=>r.id===id);
const nation=id=>world.nations[id-1];
function summary(){return E.aggregate(world)}
function save(){
 saving++;
 $("wcSaveStatus").textContent="Salvando no banco...";
 world.lastSaved=new Date().toISOString();
 const copy=JSON.parse(JSON.stringify(world));
 const op=window.DGXStore?.write(KEY,copy);
 if(op&&typeof op.then==="function"){
  op.then(()=>{if(saving===1)$("wcSaveStatus").textContent="✓ Mundo salvo na sua conta"}).catch(()=>$("wcSaveStatus").textContent="Erro de gravação — confira sua conexão").finally(()=>{saving=Math.max(0,saving-1)});
 }else{saving=Math.max(0,saving-1);$("wcSaveStatus").textContent="Entre na conta para salvar o mundo";}
}
function name(id){return nation(id)?.name||"País "+id}
function groupPowers(){
 const m={};for(const n of world.nations){m[n.color]??={pop:0,gdp:0,count:0,influence:0};m[n.color].pop+=n.pop;m[n.color].gdp+=n.gdp;m[n.color].count++;m[n.color].influence+=E.score(n);}
 return m;
}
function svgdrawing(){
 const N=world.nations;
 const selectedNation=nation(selected);
 const bg='<defs>'+
  '<linearGradient id="wcSeaGradient" x1="0" x2="0.5" y1="0" y2="1"><stop offset="0%" stop-color="#3a7186"/><stop offset="100%" stop-color="#133749"/></linearGradient>'+
  '<pattern id="wcSeaRipples" width="35" height="28" patternUnits="userSpaceOnUse"><path d="M5 17q6-6 12 0m6-8q4-3 8 0" fill="none" stroke="#bce0df" stroke-opacity=".14" stroke-width="1.3"/></pattern>'+
  '</defs><rect width="1200" height="780" fill="url(#wcSeaGradient)"/><rect width="1200" height="780" fill="url(#wcSeaRipples)"/>';
 const shadows=regions.map(r=>'<polygon points="'+r.pts+'" fill="#092537" opacity=".46" transform="translate(4,6)"/>').join("");
 const regionsSvg=regions.map(r=>{
  const n=N[r.id-1],c=colors[n.color],active=r.id===selected?" active":"";
  const title=esc(n.name+" · "+c.name+" · "+fmt(n.pop,1)+" milhões");
  return '<polygon class="wc-country'+active+'" data-wc-country="'+r.id+'" points="'+r.pts+'" fill="'+c.hex+'" tabindex="0" role="button" aria-label="'+title+'"><title>'+title+'</title></polygon>';
 }).join("");
 const terrain=[
  '<path d="M116 191l17-20 19 20 14-14 20 30h-87z" fill="#3d605b" stroke="#d9e3c8" stroke-width="2" opacity=".55"/>',
  '<path d="M478 245l27-47 25 37 18-23 32 49h-103z" fill="#3c5b64" stroke="#f6e8b9" stroke-width="2.2" opacity=".48"/>',
  '<path d="M610 517l24-34 20 21 28-38 33 55h-105z" fill="#53606d" stroke="#f7e7c6" stroke-width="2" opacity=".64"/>',
  '<path d="M1070 202l23-40 31 48 12-13 23 40h-89z" fill="#3d5863" stroke="#d9e6d7" stroke-width="2" opacity=".55"/>',
  '<path d="M560 713l18-29 21 26 14-17 22 31h-75zM879 708l20-32 19 24 25-33 29 54h-93z" fill="#56616a" stroke="#e8e5cd" stroke-width="2" opacity=".5"/>',
  '<path d="M132 311q21 17 48 5t46 20M555 315q22 30 11 60t30 35M948 302q21 19 10 50t18 42" stroke="#b8e5e1" stroke-width="5" opacity=".5" fill="none"/>'
 ].join("");
 const labels=regions.map(r=>'<text class="wc-country-no" x="'+r.center.x.toFixed(1)+'" y="'+r.center.y.toFixed(1)+'">'+r.id+'</text>').join("");
 const places=['<text class="wc-ocean-label" x="285" y="99">MAR DO OCIDENTE</text>',
 '<text class="wc-ocean-label" x="810" y="80">OCEANO DO NORTE</text>',
 '<text class="wc-ocean-label" x="591" y="612">MAR CRESCENTE</text>',
 '<text class="wc-ocean-label" x="1070" y="602">MAR DE SAFIRA</text>',
 '<text class="wc-ocean-label" x="325" y="631">MAR DAS ILHAS</text>',
 '<text class="wc-ocean-label" x="1039" y="60">N ↑</text>'].join("");
 const routes=E.topRelations(world,selected).filter(x=>mapMode==="all"||mapMode==="relations"||
   (mapMode==="trade"&&x.relation.trade>2.5)||(mapMode==="conflict"&&x.relation.score<0)||
   (mapMode==="alliance"&&x.relation.alliance)).sort((a,b)=>{
     const measure=x=>mapMode==="trade"?x.relation.trade:Math.abs(x.relation.score);
     return measure(b)-measure(a)
   }).slice(0,10).map(({id,relation})=>{
   const c1=centers.get(selected),c2=centers.get(id);
   if(!c1||!c2)return "";
   const kind=relation.alliance?"ally":relation.score< -10?"rival":"trade";
   return '<path class="wc-map-route '+kind+'" d="M'+c1.x.toFixed(1)+' '+c1.y.toFixed(1)+' Q'+((c1.x+c2.x)/2).toFixed(1)+' '+((c1.y+c2.y)/2-36).toFixed(1)+' '+c2.x.toFixed(1)+' '+c2.y.toFixed(1)+'"/>';
 }).join("");
 $("wcMapSvg").innerHTML=bg+shadows+'<g class="wc-regions">'+regionsSvg+'</g><g opacity=".66" pointer-events="none">'+terrain+'</g><g>'+routes+'</g><g>'+labels+'</g>'+places;
 $("wcMapHint").textContent="País selecionado: "+selectedNation.name+" · "+colors[selectedNation.color].name+" · "+fmt(selectedNation.pop,1)+" milhões de habitantes";
}
function stats(){
 const m=summary();
 const count=groupPowers();
 $("wcCurrentYear").textContent="Ano "+fmt(world.year);
 $("wcStatPop").textContent=fmt(m.pop,0)+" mi";
 $("wcStatGdp").textContent=fmt(m.gdp,0)+" B";
 $("wcStatSocial").textContent=fmt(m.avgSocial,3);
 $("wcStatWars").textContent=fmt(m.wars);
 $("wcStatAlliances").textContent=fmt(m.alliances);
 $("wcStatTrade").textContent="Comércio: "+fmt(m.trade,0)+" B/ano";
 $("wcGreenPopulation").textContent="Nações verdes: "+fmt(count.verde?.pop||0,0)+" milhões de habitantes";
 $("wcYearBadge").textContent="Ano "+fmt(world.year);
 $("wcPlay").textContent=playing?"⏸ Pausar Aethera":"▶ Continuar Aethera";
 $("wcPlay").setAttribute("aria-pressed",String(playing));
 $("wcPlay").disabled=world.year>=500;
 $("wcOneYear").disabled=world.year>=500;
 $("wcTenYears").disabled=world.year>=491;
}
function nationIntelligence(n){
 const ai=n.ai||{},label=window.DGXWorldAI?.labels||{};
 $("wcAIStrategy").textContent=label[ai.strategy]||"Em análise";
 $("wcAIGoals").innerHTML=(ai.goals||[]).slice(0,3).map(g=>
   '<div class="wc-ai-goal"><div><span>'+esc(g.label)+'</span><strong>'+fmt(g.value)+'/100</strong></div>'+
   '<div class="wc-ai-track"><i style="width:'+Math.max(0,Math.min(100,Number(g.value)||0))+'%"></i></div></div>'
 ).join("")||'<p class="wc-muted">Nenhuma prioridade calculada.</p>';
 const d=ai.lastDecision;
 $("wcAIDecision").innerHTML=d?'<small>ÚLTIMA DECISÃO · ANO '+fmt(d.year)+'</small><strong>'+esc(d.label)+'</strong>'+
   '<p>'+esc(d.reason)+'</p><span class="wc-muted">Custo estimado: '+fmt(d.cost,1)+' B</span>':
   '<p>Estratégia inicial definida. Avance um ano para acompanhar as primeiras decisões.</p>';
 const outcome=ai.lastOutcome;
 const notes=(ai.memory||[]).slice(0,3);
 $("wcAIMemory").innerHTML='<strong>Memória de decisões</strong>'+
  (outcome?'<p class="wc-muted">Última avaliação: '+esc(outcome.result)+'. '+esc(outcome.detail)+'</p>':'<p class="wc-muted">Ainda sem medidas avaliadas.</p>')+
  (notes.length?'<ul>'+notes.map(m=>'<li>Ano '+fmt(m.year)+': '+esc(window.DGXWorldAI?.actions?.[m.action]?.label||m.action)+' — '+(m.success?"resultado positivo":"resultado insuficiente")+'</li>').join("")+'</ul>':'');
}
function observatory(){
 const counts={},labels=window.DGXWorldAI?.labels||{};
 for(const n of world.nations){
  const s=n.ai?.strategy||"sem estratégia";
  counts[s]=(counts[s]||0)+1;
 }
 $("wcAIStrategies").innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([s,num])=>
  '<span class="wc-ai-pill">'+esc(labels[s]||s)+': '+fmt(num)+'</span>').join("");
 const decisions=world.nations.filter(n=>n.ai?.lastDecision).sort((a,b)=>
  b.ai.lastDecision.year-a.ai.lastDecision.year||a.id-b.id);
 $("wcAIHighlights").innerHTML=decisions.length?decisions.slice(0,6).map(n=>
  '<article><span class="wc-ai-dot" style="background:'+colors[n.color].hex+'"></span><div><strong>'+esc(n.name)+'</strong><small>Ano '+fmt(n.ai.lastDecision.year)+' · '+esc(labels[n.ai.strategy])+'</small>'+
  '<p>'+esc(n.ai.lastDecision.label)+'. '+esc(n.ai.lastDecision.reason)+'</p></div></article>').join(""):
  '<p class="wc-muted">Avance um ano para observar as primeiras decisões das nações.</p>';
}
function detail(){
 const n=nation(selected);
 const {COLOR}=E;
 $("wcNationName").textContent=n.name;
 $("wcNationNumber").textContent="#"+String(n.id).padStart(2,"0");
 $("wcNationColor").textContent=COLOR[n.color].name;
 $("wcNationColor").style.color=COLOR[n.color].hex;
 $("wcNationSwatch").style.background=COLOR[n.color].hex;
 $("wcNationDescription").textContent=COLOR[n.color].trait;
 if(document.activeElement!==$("wcRenameInput"))$("wcRenameInput").value=n.name.startsWith("País ")? "":n.name;
 $("wcNationStats").innerHTML=[
  ["População",fmt(n.pop,1)+" mi"],["Economia",fmt(n.gdp,1)+" B"],["Índice social",fmt(n.social,3)],
  ["Influência",fmt(E.score(n))],["Tecnologia",fmt(n.tech,2)],["Estabilidade",pct(n.stability)],
  ["Alimentos",pct(n.food)],["Ambiente",pct(n.environment)],["Reservas",fmt(n.stock,1)],["Tesouro",fmt(n.treasury,0)+" B"]
 ].map(([label,value])=>'<div><small>'+label+'</small><strong>'+value+'</strong></div>').join("");
 nationIntelligence(n);
 $("wcResources").innerHTML=n.resources.map(v=>'<span>'+esc(v)+'</span>').join("");
 const mix=Object.entries(n.mix).sort((a,b)=>b[1]-a[1]).filter(v=>v[1]>.005);
 $("wcNationMix").innerHTML=mix.map(([col,p])=>'<span title="'+COLOR[col].name+': '+pct(p)+'" style="width:'+pct(p)+';background:'+COLOR[col].hex+'"></span>').join("");
 $("wcNationMixLegend").innerHTML=mix.slice(0,5).map(([col,part])=>'<span><i class="wc-swatch" style="background:'+COLOR[col].hex+'"></i>'+COLOR[col].name+' '+fmt(part*100,1)+'%</span>').join("");
 $("wcPurplePeople").textContent=fmt(n.purpleElites)+" indivíduos roxos estimados · não existe país roxo";
 const ties=E.topRelations(world,selected).slice(0,9);
 $("wcRelations").innerHTML=ties.map(t=>{
  const score=t.relation.score,rating=score>=40?"good":score<=-25?"bad":"neutral";
  const word=t.relation.alliance?"Aliados":score< -30?"Tensão":score>20?"Próximos":"Neutros";
  return '<div class="wc-rel"><button type="button" data-wc-select="'+t.id+'">'+esc(name(t.id))+'</button>'+
   '<small>'+esc(t.route)+'</small><span class="wc-ribbon '+rating+'">'+word+' · '+fmt(score)+'</span></div>';
 }).join("")||'<p class="wc-muted">Sem relações registradas.</p>';
 const war=world.wars.filter(w=>w.a===n.id||w.b===n.id);
 $("wcNationWar").textContent=war.length?"⚔️ Em conflito com "+war.map(w=>name(w.a===n.id?w.b:w.a)).join(", "):"Sem guerra ativa";
}
function timeline(){
 const filtered=world.history.filter(e=>filterHistory==="all"||e.type===filterHistory||
 (filterHistory==="war"&&e.type==="peace"));
 $("wcHistoryCount").textContent=filtered.length+" acontecimentos";
 $("wcHistory").innerHTML=filtered.slice(0,45).map(e=>'<article class="wc-event '+esc(e.type)+'"><div class="wc-event-meta">ANO '+fmt(e.year)+' · '+esc(e.type.toUpperCase())+'</div><p>'+esc(e.text)+'</p></article>').join("")||'<p class="wc-muted">Ainda não há acontecimentos dessa categoria.</p>';
}
function chart(){
 const history=world.metrics||[];
 const first=history[0],last=history[history.length-1],canvas=$("wcChart");
 if(!first||!last||history.length<2){canvas.innerHTML='<p class="wc-muted">Avance alguns anos para visualizar a evolução da população e da economia.</p>';return}
 const values=history.map(m=>({year:m.year,pop:m.pop/first.pop*100,econ:m.gdp/first.gdp*100}));
 const high=Math.max(110,...values.map(v=>Math.max(v.pop,v.econ))),low=Math.min(80,...values.map(v=>Math.min(v.pop,v.econ)));
 const path=key=>values.map((v,i)=>(i===0?"M":"L")+(34+i*542/(values.length-1)).toFixed(2)+","+(140-(v[key]-low)/(high-low)*117).toFixed(2)).join(" ");
 canvas.innerHTML='<svg viewBox="0 0 600 160" class="wc-chart" role="img" aria-label="Evolução percentual da população e economia"><path d="M34 140H578M34 20V140" stroke="#416377" stroke-width="1.5"/>'+
 '<path d="'+path("pop")+'" stroke="#73caa2" stroke-width="3" fill="none"/><path d="'+path("econ")+'" stroke="#f5cc73" stroke-width="3" fill="none"/>'+
 '<text x="34" y="153" font-size="12" fill="#9bc1ce">Ano '+first.year+'</text><text x="576" y="153" font-size="12" text-anchor="end" fill="#9bc1ce">Ano '+last.year+'</text></svg>'+
 '<p class="wc-muted"><i class="wc-swatch" style="background:#73caa2"></i>População · <i class="wc-swatch" style="background:#f5cc73"></i>Economia · base 100 no primeiro ano do gráfico</p>';
}
function table(){
 let arr=world.nations.filter(n=>colorFilter==="all"||n.color===colorFilter).slice();
 arr.sort((a,b)=>{
  if(sortMode==="pop")return b.pop-a.pop;
  if(sortMode==="gdp")return b.gdp-a.gdp;
  if(sortMode==="social")return b.social-a.social;
  if(sortMode==="tech")return b.tech-a.tech;
  return E.score(b)-E.score(a);
 });
 $("wcTableRows").innerHTML=arr.map(n=>'<tr data-wc-select="'+n.id+'" tabindex="0" class="'+(selected===n.id?"wc-active-row":"")+'">'+
 '<td>'+n.id+'</td><td>'+esc(n.name)+'</td><td class="wc-color-cell"><i class="wc-swatch" style="background:'+colors[n.color].hex+'"></i>'+colors[n.color].name+'</td>'+
 '<td>'+fmt(n.pop,1)+'</td><td>'+fmt(n.gdp,1)+'</td><td>'+fmt(n.social,3)+'</td><td>'+fmt(n.tech,2)+'</td><td>'+fmt(E.score(n),0)+'</td></tr>').join("");
 $("wcTableCount").textContent=arr.length+" países";
}
function legend(){
 const by=groupPowers();
 $("wcColors").innerHTML=Object.entries(colors).map(([col,info])=>{
  const stats=by[col]||{count:0,pop:0};
  return '<article class="wc-color-info"><h3><i class="wc-swatch" style="background:'+info.hex+'"></i>'+
  info.name+' <span style="font-size:10px;color:#98b8c4;font-weight:500">'+(col==="roxo"?"sem país":stats.count+" país(es)")+'</span></h3>'+
  '<p>'+esc(info.trait)+'</p><small class="wc-muted">'+(col==="roxo"?"Identidade rara, dispersa pela população":fmt(stats.pop,0)+" milhões nas nações dessa cor"+(["vermelho","azul","amarelo"].includes(col)?" · influência do bloco: "+fmt(stats.influence,0):""))+'</small></article>';
 }).join("");
}
function render(){
 if(!document.getElementById("wcPage"))return;
 stats();svgdrawing();detail();observatory();timeline();table();chart();legend();
}
function choose(id,scroll=false){
 id=Number(id);
 if(!Number.isInteger(id)||id<1||id>30)return;
 selected=id;
 svgdrawing();detail();table();
 if(scroll&&window.innerWidth<=970)$("wcNationPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function persist(){
 save();
}
function advance(years=1){
 if(world.year>=500){pause();return}
 try{
  E.step(world,Math.min(years,500-world.year));
  render();persist();
  if(world.year>=500)pause();
 }catch(err){pause();$("wcSaveStatus").textContent="Simulação interrompida: "+err.message;console.error(err)}
}
function pause(){
 playing=false;elapsed=0;
 stats();
}
function play(){
 if(playing){pause();return}
 if(world.year>=500){$("wcSaveStatus").textContent="O calendário alcançou o ano 500.";return}
 playing=true;elapsed=0;lastFrame=Date.now();
 stats();
}
function updateClock(){
 if(!playing||!active||document.hidden)return;
 if(!$("page-world").classList.contains("active")){active=false;pause();return}
 const now=Date.now(),delta=Math.min(1700,now-lastFrame);
 lastFrame=now;
 elapsed+=delta;
 const interval=8000/speed;
 if(elapsed>=interval){
  elapsed%=interval;
  advance(1);
 }
 const v=Math.round(100*elapsed/interval);
 $("wcProgress").style.width=v+"%";
}
function init(){
 active=!!$("page-world")?.classList.contains("active");
 const saved=window.DGXStore?.read(KEY,null);
 if(E.validate(saved))world=JSON.parse(JSON.stringify(saved));
 else world=E.create();
 E.prepare(world);
 selected=Math.min(30,Math.max(1,selected));
 render();
 $("wcSaveStatus").textContent=E.validate(saved)?(world.balanceVersion===2?"Mundo recuperado da sua conta":"Mundo antigo preservado. Use Novo jogo para iniciar com os três blocos equilibrados."):"Cenário equilibrado pronto — salve ao avançar o tempo ou nomear um país";
}
function open(){
 active=true;
 if(!window.DGXStore)return;
 const snapshot=window.DGXStore.read(KEY,null);
 if(E.validate(snapshot)&&world.year!==snapshot.year&&!playing)world=JSON.parse(JSON.stringify(snapshot));
 E.prepare(world);
 render();
 if(world.balanceVersion!==2)$("wcSaveStatus").textContent="Mundo antigo preservado. Use Novo jogo para iniciar com os três blocos equilibrados.";
 if(!playing)lastFrame=Date.now();
}
function bind(){
 $("wcPlay").addEventListener("click",play);
 $("wcOneYear").addEventListener("click",()=>{pause();advance(1)});
 $("wcTenYears").addEventListener("click",()=>{pause();advance(10)});
 $("wcNewGame").addEventListener("click",()=>{
  if(!window.confirm("Reiniciar o jogo? O mundo salvo, os nomes dos países e a evolução histórica serão substituídos por um novo cenário com as três potências equilibradas."))return;
  pause();world=E.create();selected=6;render();persist();
 });
 $("wcSpeed").addEventListener("change",()=>{speed=Number($("wcSpeed").value)||1;elapsed=0;lastFrame=Date.now()});
 $("wcMapMode").addEventListener("change",()=>{mapMode=$("wcMapMode").value;svgdrawing()});
 $("wcMapSvg").addEventListener("click",event=>{
  const el=event.target.closest?.("[data-wc-country]");
  if(el)choose(el.getAttribute("data-wc-country"),true);
 });
 $("wcMapSvg").addEventListener("keydown",event=>{
  if(event.key==="Enter"||event.key===" "){
   const el=event.target.closest?.("[data-wc-country]");
   if(el){event.preventDefault();choose(el.getAttribute("data-wc-country"),true)}
  }
 });
 $("wcTableRows").addEventListener("click",event=>{
  const row=event.target.closest("[data-wc-select]");if(row)choose(row.dataset.wcSelect,true);
 });
 $("wcTableRows").addEventListener("keydown",event=>{
  if(event.key==="Enter"){const row=event.target.closest("[data-wc-select]");if(row)choose(row.dataset.wcSelect,true)}
 });
 $("wcRelations").addEventListener("click",event=>{
  const b=event.target.closest("[data-wc-select]");if(b)choose(b.dataset.wcSelect);
 });
 $("wcRenameForm").addEventListener("submit",event=>{
  event.preventDefault();
  const nameInput=$("wcRenameInput").value.replace(/\s+/g," ").trim();
  if(nameInput.length<2||nameInput.length>42){$("wcSaveStatus").textContent="Nome precisa ter de 2 a 42 caracteres.";return}
  nation(selected).name=nameInput;
  render();persist();
 });
 $("wcFilterColor").addEventListener("change",()=>{colorFilter=$("wcFilterColor").value;table()});
 $("wcSort").addEventListener("change",()=>{sortMode=$("wcSort").value;table()});
 $("wcHistoryFilter").addEventListener("change",()=>{filterHistory=$("wcHistoryFilter").value;timeline()});
 $("wcGoSelected").addEventListener("click",()=>choose(selected,true));
 document.addEventListener("visibilitychange",()=>{if(document.hidden){if(playing)pause()}else lastFrame=Date.now()});
 window.addEventListener("blur",()=>{if(playing)pause()});
 window.addEventListener("hashchange",()=>{if(location.hash!=="#world")pause()});
 // Não avançar em segundo plano ao visitar as outras abas do DGX.
 document.addEventListener("click",event=>{
  const other=event.target.closest?.("[data-page], [data-goto]");
  if(other&&(other.dataset.page||other.dataset.goto)!=="world"){active=false;pause()}
 });
 setInterval(updateClock,1000);
}
window.DGXworldInit=init;
window.DGXworldOpen=open;
window.DGXworldSelect=choose;
bind();
init();
})();