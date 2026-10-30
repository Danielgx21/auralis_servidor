'use strict';
(function(){
const originalScene=scene;
const items={
 lago:[['reeds',77,72,'move','fita'],['crate',42,82,'move','pegadas'],['lantern',21,52,'glass','lanterna']],
 casa:[['curtain',24,38,'move',null],['mirror',24,38,'glass','espelho','curtain'],['drawer',69,77,'move','registro'],['radio',66,43,'radio','radio']],
 capela:[['cloth',51,32,'move',null],['bell',51,32,'glass','sino','cloth'],['stone',77,72,'brush','inscricao'],['chest',22,77,'key','manuscrito']]
};
const shapes={
 reeds:'<path d="M-45 90Q-65 -24 -40 -100M-18 90Q-6 -10 0 -95M14 90Q30 -31 50 -107M42 88Q79 -18 76 -78" stroke="#718b6c" stroke-width="10" fill="none"/><path d="M-40 -50Q-77 -110 -95 -115Q-71 -49 -40 -50M3 -54Q-11 -119 4 -134Q27 -84 3 -54" fill="#536f55"/>',
 crate:'<path d="M-88 -48H88V63H-88Z" fill="#594630" stroke="#26231f" stroke-width="8"/><path d="M-84 -45L82 58M82 -43L-82 57" stroke="#9a7b50" stroke-width="12"/>',
 lantern:'<path d="M-23 -50V-74H23V-50M-33 -48H33V62H-33Z" fill="#b4a078" fill-opacity=".6" stroke="#322d23" stroke-width="10"/><path d="M-18 -23H18V39H-18Z" fill="#efc785" fill-opacity=".45"/>',
 curtain:'<path d="M-84 -154Q0 -175 84 -154V155Q0 123 -84 155Z" fill="#455e61" stroke="#263b3f" stroke-width="12"/><path d="M-30 -141Q-51 0 -26 132M35 -145Q24 -12 44 134" stroke="#819793" stroke-width="12" opacity=".35" fill="none"/>',
 mirror:'<rect x="-84" y="-154" width="168" height="308" rx="21" fill="#79938b" fill-opacity=".7" stroke="#a98a62" stroke-width="16"/><path d="M-60 40L46 -95" stroke="#d8d9b9" stroke-opacity=".35" stroke-width="12"/>',
 drawer:'<rect x="-106" y="-57" width="212" height="114" fill="#624833" stroke="#2c251e" stroke-width="12"/><path d="M-85 -32H84V30H-85Z" fill="#826447"/><circle r="9" fill="#d0ae78"/>',
 radio:'<rect x="-106" y="-67" width="212" height="134" rx="16" fill="#6d503a" stroke="#2a2927" stroke-width="12"/><rect x="-88" y="-44" width="110" height="85" fill="#303b39"/><circle cx="66" cy="-2" r="26" fill="#b1a07e"/><path d="M-70 -20H6M-70 0H6M-70 20H6" stroke="#9d8b6d" stroke-width="5"/>',
 cloth:'<path d="M-85 -66Q-30 -113 5 -69Q56 -96 83 -49L74 105Q9 70 -23 109Q-57 72 -92 95Z" fill="#53696a" stroke="#253e42" stroke-width="10"/>',
 bell:'<path d="M-75 40Q-80 -58 -14 -83Q-25 -116 0 -116Q25 -116 14 -83Q80 -58 75 40L96 67H-96Z" fill="#9e7c51" stroke="#493a2b" stroke-width="13"/><circle cy="79" r="20" fill="#755534"/>',
 stone:'<path d="M-90 44L-76 -59L12 -78L91 -26L105 48L-3 71Z" fill="#495c5a" stroke="#283b3c" stroke-width="12"/>',
 chest:'<path d="M-105 -24L-79 -71H82L107 -24V70H-105Z" fill="#634932" stroke="#30231e" stroke-width="11"/><path d="M-105 -20H107M-72 -65V70M75 -65V70" stroke="#aa8854" stroke-width="10"/><rect x="-9" y="-5" width="18" height="30" fill="#c8a672"/>'
};
const labels={reeds:'Juncos',crate:'Caixote',lantern:'Lanterna',curtain:'Cortina',mirror:'Espelho',drawer:'Gaveta',radio:'Rádio',cloth:'Pano',bell:'Sino',stone:'Pedra',chest:'Baú'};
let selected=null,drag=null,radio=false;
function moved(){return s.lagoMoved||(s.lagoMoved={});}
function find(id){if(s.evidence.includes(id))return;if(net.inGame&&net.paused)return toast('Aguardando a equipe.');if(net.inGame&&net.mode==='coop'&&!canInspect(id))return toast('Outro especialista precisa examinar esta pista.');s.evidence.push(id);s.modal=id;persist();render();}

let focused=null,turn=0,activeTool=null,dragging=null;
const extras={
 ribbon:['lago',77,71,'fita','Fita azul','<path d="M-59-39Q-15-57 35-17Q71 5 42 54Q14 26-1 7Q-33 29-59 6Z" fill="#4a72a9" stroke="#aabbd6" stroke-width="7"/>'],
 footprints:['lago',42,80,'pegadas','Pegadas','<ellipse cx="-33" cy="-24" rx="17" ry="32" transform="rotate(-26 -33 -24)" fill="#4d4031"/><ellipse cx="35" cy="29" rx="16" ry="30" transform="rotate(20 35 29)" fill="#4d4031"/>'],
 keypiece:['lago',44,86,null,'Peça metálica','<circle cx="-32" cy="-18" r="22" fill="none" stroke="#c4a677" stroke-width="12"/><path d="M-8-17H64V3H45V20H26V3H-8" fill="#c4a677"/>'],
 papers:['casa',69,77,'registro','Papéis escondidos','<path d="M-75-81H49L74-54V82H-75Z" fill="#decba9" stroke="#897256" stroke-width="10"/><path d="M-45-35H37M-45-12H43M-45 13H36M-45 39H29" fill="none" stroke="#816d54" stroke-width="6"/>']
};
const detail={
 lantern:['A lanterna fechada','Existe água do lado interno. Gire o objeto para verificar a tampa.'],
 mirror:['O espelho','As marcas parecem estar do outro lado do vidro. A luz rasante ajuda a identificar sua origem.'],
 stone:['A pedra inscrita','A sujeira cobre símbolos que podem ter sido apagados intencionalmente.'],
 bell:['O sino','Há riscos regulares na parte interna do bronze. O instrumento pode ter servido a um ritual.'],
 chest:['O baú','Uma fechadura antiga impede o acesso. Uma chave foi perdida perto do cais.'],
 radio:['O aparelho de rádio','O mostrador vai de 0 a 30. Um depoimento pode indicar a frequência correta.'],
 reeds:['Os juncos','As plantas foram amassadas e escondem algo. Talvez seja necessário afastá-las mais de uma vez.'],
 crate:['O caixote','A madeira está pesada e bloqueia marcas no cais. Há algo brilhando atrás dele.'],
 curtain:['A cortina','O tecido está preso ao suporte. Por trás, o vidro tem marcas de umidade.'],
 drawer:['A gaveta','Ela está emperrada. Há um compartimento debaixo das folhas.'],
 cloth:['O pano sobre o sino','O tecido abafou a vibração do bronze por muito tempo.']
};
function notes(){return s.lagoFieldNotes||(s.lagoFieldNotes=[])}
function memo(t){/* Não transformar ações ou frases automaticamente em anotações. O jogador escreve no Diário. */}
function seen(){return s.lagoSteps||(s.lagoSteps={})}
function available(id){
 const m=moved(),x=extras[id];
 if(x){if(id==='ribbon')return !!m.reeds&&!s.evidence.includes('fita');if(id==='footprints')return !!m.crate&&!s.evidence.includes('pegadas');if(id==='keypiece')return !!m.crate&&!s.lagoKey;if(id==='papers')return !!m.drawer&&!s.evidence.includes('registro');return false}
 if(['reeds','crate','curtain','drawer','cloth'].includes(id))return !m[id];
 if(id==='mirror'&&!m.curtain||id==='bell'&&!m.cloth)return false;
 const item=(items[s.activeScene]||[]).find(o=>o[0]===id);
 return !!item&&!item[4]||!!item&&!s.evidence.includes(item[4]);
}
function data(id){
 if(extras[id]){const x=extras[id];return [id,x[1],x[2],'found',x[3]]}
 return (items[s.activeScene]||[]).find(o=>o[0]===id);
}
function getType(id){return data(id)?.[3]}
function objectShape(o){
 const id=o[0],x=o[1],y=o[2],found=!!extras[id],shape=found?extras[id][5]:shapes[id];
 const label=extras[id]?.[4]||labels[id]||id;
 return '<g data-landscape="'+id+'" role="button" tabindex="0" aria-label="'+label+'" transform="translate('+x*10+' '+Math.round(y*13.4)+')" class="landscapeNewObject"><g data-landscape-art>'+shape+'</g><rect x="-106" y="-133" width="212" height="263" fill="transparent"/><title>'+label+'</title></g>';
}
function act(id,chosen,dragged){
 if(net.inGame&&net.paused)return toast('Investigação pausada. Aguardando reconexão.');
 const o=data(id);if(!o)return;
 const type=o[3],clue=o[4],m=moved();
 if(type==='move'){
  if(!dragged){focused=id;render();return}
  m[id]=true;memo('O objeto foi erguido, examinado e recolocado: '+(labels[id]||id)+'.');
  persist(false);focused=null;render();return;
 }
 if(type==='found'){
  focused=null;
  if(id==='keypiece'){s.lagoKey=true;memo('Uma chave metálica estava atrás do caixote.');persist();render();return}
  if(id==='footprints')memo('Duas trilhas seguem até a água; nenhuma mostra sinais claros de arrasto.');
  if(id==='ribbon')memo('O nó na fita foi feito por alguém. Quem a utilizava?');
  if(id==='papers')memo('O documento associa a obra da represa à instalação do sino.');
  find(clue);return;
 }
 if(type==='radio'){
  focused='radio';render();return;
 }
 if(type==='key'&&!s.lagoKey){focused=id;render();return}
 if(type==='glass'&&id==='lantern'&&!s.lagoLanternTurned){focused=id;render();return}
 if(!chosen||chosen==='inspect'){focused=id;render();return}
 if(type==='key'&&chosen!=='key')return toast('Experimente a chave encontrada sob o caixote.');
 if(type==='glass'&&!['glass','lens'].includes(chosen))return toast('Use a lupa para observar essas marcas.');
 if(type==='brush'&&!['brush','powder'].includes(chosen))return toast('Use o pincel para remover a camada superficial.');
 focused=null;memo('Exame de '+(labels[id]||id)+': '+(detail[id]?.[1]||'uma nova pista foi identificada.'));
 find(clue);
}
function examination(){
 if(!focused)return '';
 const label=extras[focused]?.[4]||detail[focused]?.[0]||labels[focused]||'Objeto';
 const desc=detail[focused]?.[1]||'Observe as marcas e escolha uma ferramenta adequada.';
 const type=getType(focused);
 const crop=pictureDetail(focused);
 const drawing='<svg viewBox="-135 -165 270 330" style="transform:rotate('+turn+'deg)"><g>'+(extras[focused]?.[5]||shapes[focused]||'')+'</g></svg>';
 return '<div class="landscapeInspectBackdrop" data-landscape-modal><section class="landscapeInspect" role="dialog" aria-modal="true" aria-label="Exame detalhado">'+
 '<button data-landscape-close="1" class="landscapeInspectX" aria-label="Fechar exame">×</button>'+
 '<div class="eyebrow">EXAME MATERIAL · '+esc(s.activeScene)+'</div><h2>'+esc(label)+'</h2>'+
 '<div class="landscapeZoom '+(crop?'landscapePhotographicZoom':'')+'">'+(crop||drawing)+'</div>'+
 '<p>'+esc(desc)+'</p>'+
 (focused==='lantern'&&!s.lagoLanternTurned?'<label>Vire a lanterna para examinar a base<input data-landscape-turn type="range" min="0" max="360" value="'+turn+'"></label>':'')+
 (focused==='radio'?'<label>Sintonize o rádio: <b data-landscape-frequency>'+String(s.lagoRadioFreq||0).padStart(2,'0')+'</b><input id="landscapeFreq" type="range" min="0" max="30" value="'+(s.lagoRadioFreq||0)+'"></label><p>Procure nos depoimentos o horário que pode corresponder à frequência.</p>':'')+
 '<button data-landscape-apply="'+focused+'" class="landscapeInspectApply">'+(type==='move'?'Erguer e examinar':'Examinar com a ferramenta selecionada')+'</button></section></div>';
}
// Objetos únicos pertencem ao próprio cenário SVG, sem réplicas por cima.
const sceneTemplates={};
const sceneFiles={casa:'assets/casa.svg'};
const movesOnArt={curtain:[145,0],drawer:[0,88],cloth:[220,-30],crate:[135,0],reeds:[160,0]};

const cinemaPictures={
 lago:'assets/lago_cinema.webp',capela:'assets/capela_cinema.webp'
};
const cinemaHits={
 lago:{lantern:[67,155,133,213],crate:[0,655,352,310],reeds:[786,748,214,592],ribbon:[838,835,96,213],footprints:[372,1070,214,176],keypiece:[668,946,165,100]},
 capela:{cloth:[205,45,218,535],bell:[80,108,260,322],stone:[282,740,310,362],chest:[669,746,328,280]}
};
function pictureDetail(id){
 const file=cinemaPictures[s.activeScene],b=cinemaHits[s.activeScene]?.[id];
 if(!file||!b)return '';
 let [x,y,w,h]=b;
 const px=Math.max(30,w*.13),py=Math.max(38,h*.12);
 x=Math.max(0,x-px);y=Math.max(0,y-py);
 w=Math.min(1000-x,w+px*2);h=Math.min(1340-y,h+py*2);
 return '<svg viewBox="'+[x,y,w,h].map(Math.round).join(' ')+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Detalhe fotográfico do objeto">'+
  '<image href="'+file+'" width="1000" height="1340" preserveAspectRatio="none"/>'+
  '</svg>';
}
function pictureCanvas(){
 const id=s.activeScene,file=cinemaPictures[id],hits=cinemaHits[id];
 if(!file)return '';
 // A pintura é sempre preservada intacta. Ao erguer uma caixa ou afastar
 // um pano, o jogador inspeciona a pista e recoloca o objeto em seu lugar.
 // Nenhum retângulo opaco e nenhuma réplica do objeto são desenhados.
 let art='<image href="'+file+'" width="1000" height="1340" preserveAspectRatio="none"/>';
 const names=[...(items[id]||[]).map(item=>item[0]),...Object.keys(extras).filter(key=>extras[key][0]===id)];
 for(const name of [...new Set(names)]){
  if(!available(name))continue;
  const hit=hits[name];if(!hit)continue;
  const title=extras[name]?.[4]||labels[name]||name;
  art+='<g data-landscape="'+name+'" role="button" tabindex="0" aria-label="'+esc(title)+'" class="cinemaPaintingTarget cinemaPainting-'+name+'">'+
   '<rect x="'+hit[0]+'" y="'+hit[1]+'" width="'+hit[2]+'" height="'+hit[3]+'" fill="transparent" pointer-events="all"/><title>'+esc(title)+'</title></g>';
 }
 return '<div class="landscapeCanvas cinemaPainting" data-cinema-scene="'+id+'"><svg class="landscapeSvg cinemaPaintingSvg" viewBox="0 0 1000 1340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cenário ilustrado: '+esc(CASES.lago.scenes[id].name)+'">'+art+'</svg></div>';
}
function sceneCanvas(){
 if(cinemaPictures[s.activeScene])return pictureCanvas();
 const template=sceneTemplates[s.activeScene];
 if(template){
  const svg=template.cloneNode(true);
  svg.classList.add('landscapeSvg','landscapeNativeSvg');
  svg.setAttribute('aria-label',CASES.lago.scenes[s.activeScene].name);
  svg.querySelectorAll('[data-landscape]').forEach(node=>{
   const id=node.getAttribute('data-landscape');
   const isExtra=Object.prototype.hasOwnProperty.call(extras,id);
   const accessible=available(id);
   const wasMoved=!!moved()[id];
   if(isExtra&&!accessible){node.setAttribute('display','none');return;}
   if(wasMoved&&movesOnArt[id]){
    const [dx,dy]=movesOnArt[id];
    node.querySelector('[data-landscape-art]')?.setAttribute('transform','translate('+dx+' '+dy+')');
   }
   if(!accessible){
    node.style.pointerEvents='none';
    node.setAttribute('aria-disabled','true');
    node.setAttribute('tabindex','-1');
    node.removeAttribute('data-landscape');
   }
  });
  return '<div class="landscapeCanvas landscapeNativeCanvas">'+new XMLSerializer().serializeToString(svg)+'</div>';
 }
 // Durante carregamento ou falta de rede: fundo original + hotspots invisíveis.
 const base=CASES.lago.scenes[s.activeScene].image;
 const objects=(items[s.activeScene]||[]).filter(o=>available(o[0]));
 for(const [id,info] of Object.entries(extras))if(info[0]===s.activeScene&&available(id))objects.push(data(id));
 return '<div class="landscapeCanvas" style="background-image:url('+base+')"><svg viewBox="0 0 1000 1340" class="landscapeSvg" xmlns="http://www.w3.org/2000/svg">'+objects.map(o=>'<g data-landscape="'+o[0]+'" role="button" tabindex="0" aria-label="'+(extras[o[0]]?.[4]||labels[o[0]]||o[0])+'"><rect x="'+(o[1]*10-80)+'" y="'+(Math.round(o[2]*13.4)-100)+'" width="160" height="200" fill="transparent" pointer-events="all"/></g>').join('')+'</svg></div>';
}
scene=function(){
 if(s.caseId!=='lago')return originalScene();
 const loc=CASES.lago.scenes[s.activeScene];if(!loc)return originalScene();
 const tools=[['inspect','◉','Observar'],['glass','⌕','Lupa'],['brush','╱','Pincel'],...(s.lagoKey?[['key','⚿','Chave']]:[])];
 return '<section class="landscapePage"><button class="backBtn" data-view="hub">← Voltar aos locais</button><div class="eyebrow">INVESTIGAÇÃO PRÁTICA · '+esc(loc.name)+'</div><h2>'+esc(loc.name)+'</h2><p>'+esc(loc.intro)+'</p><p class="landscapeHelp">Toque nos elementos do próprio cenário. Arraste objetos para descobrir o que escondem, examine-os de perto e escolha a ferramenta adequada.</p>'+sceneCanvas()+'<div class="landscapeInventory"><strong>Bolsa de investigação</strong><div>'+tools.map(t=>'<button type="button" class="landscapeTool '+(selected===t[0]?'chosen':'')+'" data-landscape-tool="'+t[0]+'" aria-label="'+t[2]+'"><span>'+t[1]+'</span><small>'+t[2]+'</small></button>').join('')+'</div></div><div class="landscapeFieldNotes"><strong>Diário de investigação</strong><p>Decida quais detalhes registrar. Abra o Diário e escreva com suas palavras.</p></div><button class="btn" data-view="board">Interpretar as provas no quadro →</button>'+examination()+'</section>';
};
// Utiliza exatamente a mesma arte validada no mapa e no cenário, sem camadas duplicadas.
// Carregar somente o cenário SVG da Casa do Barqueiro. Não substituir
// os caminhos das pinturas WebP por SVGs antigos (causava miniaturas quebradas).
for(const [id,url] of Object.entries(sceneFiles)){
 fetch(url+'?v=20261030-fix',{cache:'no-store'})
  .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.text()})
  .then(source=>{
   const doc=new DOMParser().parseFromString(source,'image/svg+xml');
   if(doc.documentElement.tagName.toLowerCase()!=='svg'||doc.querySelector('parsererror'))throw Error('SVG inválido: '+url);
   sceneTemplates[id]=doc.documentElement;
   if(s.caseId==='lago'&&s.view==='scene'&&s.activeScene===id)render();
  }).catch(err=>console.warn('Arte SVG auxiliar indisponível:',url,err));
}

document.addEventListener('pointerdown',e=>{
 if(s.caseId!=='lago'||s.view!=='scene'||focused)return;
 const obj=e.target.closest('[data-landscape],[data-landscape-tool]');if(!obj)return;
 dragging={id:obj.dataset.landscape||obj.dataset.landscapeTool,tool:!!obj.dataset.landscapeTool,x:e.clientX,y:e.clientY,pid:e.pointerId,el:obj};
 if(!dragging.tool)e.preventDefault();
},true);
window.addEventListener('pointermove',e=>{
 if(!dragging||dragging.pid!==e.pointerId)return;
 const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;
 if(Math.hypot(dx,dy)<10)return;
 dragging.el.style.opacity='.75';dragging.el.style.transform='translate('+dx+'px,'+dy+'px)';
},true);
window.addEventListener('pointerup',e=>{
 if(!dragging||dragging.pid!==e.pointerId)return;
 const d=dragging;dragging=null;
 const distance=Math.hypot(e.clientX-d.x,e.clientY-d.y);
 const hit=d.tool&&distance>30?document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-landscape]'):null;
 d.el.style.transform='';d.el.style.opacity='';
 if(d.tool){if(distance<30){selected=d.id;render()}else if(hit){selected=d.id;act(hit.dataset.landscape,d.id,false)}else toast('Arraste a ferramenta sobre o objeto.');return}
 e.preventDefault();e.stopImmediatePropagation();
 act(d.id,selected,distance>43);
},true);
document.addEventListener('click',e=>{
 if(s.caseId!=='lago')return;
 const close=e.target.closest('[data-landscape-close]');
 if(close){e.preventDefault();e.stopImmediatePropagation();focused=null;render();return}
 const apply=e.target.closest('[data-landscape-apply]');
 if(apply){e.preventDefault();e.stopImmediatePropagation();const id=apply.dataset.landscapeApply;focused=null;act(id,selected,getType(id)==='move');return}
},true);
document.addEventListener('input',e=>{
 if(s.caseId!=='lago')return;
 if(e.target.matches('[data-landscape-turn]')){
  turn=Number(e.target.value);e.target.closest('.landscapeInspect')?.querySelector('.landscapeZoom svg')?.style.setProperty('transform','rotate('+turn+'deg)');
  if(turn>=135&&!s.lagoLanternTurned){s.lagoLanternTurned=true;memo('Ao girar a lanterna, uma marca de pressão aparece sob a tampa.');toast('Uma marca surgiu na base da lanterna.')}
 }
 if(e.target.id==='landscapeFreq'){
  const v=Number(e.target.value);s.lagoRadioFreq=v;
  const b=document.querySelector('[data-landscape-frequency]');if(b)b.textContent=String(v).padStart(2,'0');
  if(v===17){focused=null;memo('O rádio sintoniza uma voz e um som metálico na mesma faixa.');find('radio')}
 }
},true);
document.addEventListener('keydown',e=>{
 if(s.caseId!=='lago'||s.view!=='scene'||!['Enter',' '].includes(e.key))return;
 const item=e.target.closest('[data-landscape]');if(!item)return;
 e.preventDefault();act(item.dataset.landscape,selected,false);
},true);
const landscapeV2Styles=document.createElement('style');
landscapeV2Styles.textContent='.landscapeNewObject{cursor:grab;touch-action:none}.landscapeNewObject:active{cursor:grabbing}.landscapeNewObject>g{filter:drop-shadow(0 5px 7px #000a);transition:filter .17s}.landscapeNewObject:is(:hover,:focus-visible)>g{filter:drop-shadow(0 0 13px #e8ca9b) drop-shadow(0 5px 7px #000a)}.landscapeNewObject:focus-visible{outline:3px solid #f0d3a6}.landscapeFieldNotes{border:1px solid #b49f7c77;border-radius:11px;background:#142a32;padding:15px;margin:12px 0}.landscapeFieldNotes strong{color:#f0d6ad}.landscapeFieldNotes p{font:12px/1.6 system-ui;margin:9px 0;color:#ced9d2}.landscapeInspectBackdrop{position:fixed;inset:0;display:grid;place-items:center;background:#031019e8;backdrop-filter:blur(8px);z-index:10003;padding:12px}.landscapeInspect{position:relative;width:min(460px,100%);max-height:92vh;overflow:auto;border:1px solid #c9ad7c;border-radius:15px;background:linear-gradient(135deg,#21363f,#0f212b);padding:24px;box-shadow:0 14px 50px #0009}.landscapeInspect h2{color:#f5dab5}.landscapeInspectX{position:absolute;right:12px;top:10px;background:transparent;border:0;color:#fff;font-size:28px}.landscapeZoom{display:grid;place-items:center;min-height:175px;background:radial-gradient(circle,#526164,#0c1e27);border-radius:12px;margin:12px 0}.landscapeZoom svg{height:175px;max-width:100%;transition:transform .12s}.landscapeInspect p{color:#dce0d8;line-height:1.6;font-size:13px}.landscapeInspect label{display:block;color:#e2cda9;font-size:12px}.landscapeInspect input{display:block;width:100%;accent-color:#d4b37b;margin:15px 0}.landscapeInspectApply{width:100%;padding:12px;border-radius:9px;background:#c9ad78;color:#12252a;font-weight:750;border:0;margin:9px 0}';
landscapeV2Styles.textContent += '.landscapeNativeCanvas{background-image:none!important}.sceneNativeObject{cursor:pointer;touch-action:none}.sceneNativeObject [data-landscape-art]{transition:filter .16s ease}.sceneNativeObject:is(:hover,:focus-visible) [data-landscape-art]{filter:drop-shadow(0 0 13px #edc98b66)}';
landscapeV2Styles.textContent += '.cinemaPainting{background:#050e16!important;aspect-ratio:1000/1340;max-height:76dvh}.cinemaPaintingSvg{display:block;width:100%;height:100%}.cinemaPaintingTarget{cursor:grab;touch-action:none}.cinemaPaintingTarget:hover rect,.cinemaPaintingTarget:focus-visible rect{stroke:#d0b587;stroke-width:3;stroke-opacity:.28}.cinemaPaintingTarget:focus-visible{outline:none}';
landscapeV2Styles.textContent += '.landscapePhotographicZoom{height:265px;min-height:0;overflow:hidden;background:#07151c;border:1px solid #607077}.landscapePhotographicZoom svg{display:block;width:100%;height:100%;max-width:none;transform:none!important}.landscapePhotographicZoom svg image{image-rendering:auto}';
document.head.append(landscapeV2Styles);
const oldRender=render;
render=function(){oldRender();if(!['title','collection','ending'].includes(s.view))return;const previous=saved.cases?.lago||{};if(!(previous.evidence?.length||previous.outcome||saved.histories?.lago))return;
 const b=document.createElement('button');b.type='button';b.className='landscapeReplay';b.dataset.landscapeReplay='1';b.textContent='↻ Recomeçar caso 001 com a nova jogabilidade';const parent=s.view==='title'?app.querySelector('.coverInner'):s.view==='collection'?app.querySelector('.caseSelector'):app.querySelector('main');parent?.append(b);
};
document.addEventListener('click',e=>{if(!e.target.closest('[data-landscape-replay]'))return;e.preventDefault();e.stopImmediatePropagation();
 if(net.online||net.inGame)return toast('Saia da sala multiplayer antes de recomeçar uma partida individual.');
 if(!confirm('Recomeçar o caso do Lago? As pistas desta tentativa serão apagadas. Seu histórico, créditos e outros casos serão preservados.'))return;
 saved.cases.lago=blank('lago');saved.current='lago';s=blank('lago');persist(false);move('brief');},true);
render();
})();
