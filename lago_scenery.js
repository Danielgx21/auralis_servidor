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
function act(id,tool,dragged){
 const o=(items[s.activeScene]||[]).find(x=>x[0]===id);if(!o)return;
 const [name,x,y,type,clue,requires]=o;
 if(requires&&!moved()[requires])return toast('Afaste primeiro o que está cobrindo esta parte.');
 if(type==='move'){if(!dragged)return toast('Arraste '+labels[id].toLowerCase()+' para o lado.');moved()[id]=true;if(id==='crate')s.lagoKey=true;persist();render();return;}
 if(type==='radio'){radio=true;render();return;}
 if(!tool)return toast('Escolha uma ferramenta na bolsa e use sobre o objeto.');
 if(type==='key'&&!s.lagoKey)return toast('Encontre a chave primeiro, atrás do caixote.');
 if(tool!==type&&!(tool==='lens'&&type==='glass')&&!(tool==='powder'&&type==='brush'))return toast('Essa ferramenta não funciona aqui.');
 if(tool==='powder'){if(!charges('powder'))return toast('Você não tem pó.');saved.stock.powder--;}
 find(clue);
}
function sceneSvg(o){const [id,x,y,type,clue,req]=o;if(req&&!moved()[req])return '';let done=moved()[id]&&type==='move',found=clue&&s.evidence.includes(clue);if(found&&type!=='move')return '';let offset=done?'translate(200 45)':'';return '<g data-landscape="'+id+'" role="button" tabindex="0" aria-label="'+labels[id]+'" transform="translate('+x*10+' '+Math.round(y*13.4)+')"><g transform="'+offset+'">'+shapes[id]+'</g><rect x="-105" y="-120" width="210" height="235" fill="transparent"/></g>';}
scene=function(){
 if(s.caseId!=='lago')return originalScene();
 const loc=CASES.lago.scenes[s.activeScene],o=items[s.activeScene]||[],tools=[['glass','⌕','Lupa'],['brush','╱','Pincel'],...(s.lagoKey?[['key','⚿','Chave']]:[]),...(own('lens')?[['lens','◉','Lente']]:[])];
 return '<section class="landscapePage"><button class="backBtn" data-view="hub">← Outros locais</button><h2>'+esc(loc.name)+'</h2><p>'+esc(loc.intro)+'</p><p class="landscapeHelp">Observe o cenário: arraste objetos ou selecione uma ferramenta e toque na parte que quer examinar.</p><div class="landscapeCanvas" style="background-image:url('+loc.image+')"><svg viewBox="0 0 1000 1340" xmlns="http://www.w3.org/2000/svg" class="landscapeSvg">'+o.map(sceneSvg).join('')+'</svg></div><div class="landscapeInventory"><strong>Ferramentas</strong><div>'+tools.map(t=>'<button type="button" class="landscapeTool '+(selected===t[0]?'chosen':'')+'" data-landscape-tool="'+t[0]+'" aria-label="'+t[2]+'"><span>'+t[1]+'</span><small>'+t[2]+'</small></button>').join('')+'</div></div>'+
 (s.activeScene==='casa'&&radio?'<div class="landscapeRadio"><h3>Rádio do barqueiro</h3><p>Qual horário Iria mencionou? Ajuste a frequência.</p><input type="range" id="landscapeFreq" min="0" max="30" value="'+(s.lagoRadioFreq||0)+'"><strong id="landscapeValue">'+(s.lagoRadioFreq||0)+'</strong><button data-landscape-close="1">Fechar</button></div>':'')+
 '<button class="btn" data-view="dossier">Rever provas · '+s.evidence.length+'/9</button></section>';
};
document.addEventListener('pointerdown',e=>{if(s.caseId!=='lago'||s.view!=='scene')return;const obj=e.target.closest('[data-landscape],[data-landscape-tool]');if(!obj)return;e.preventDefault();e.stopImmediatePropagation();drag={id:obj.dataset.landscape||obj.dataset.landscapeTool,tool:!!obj.dataset.landscapeTool,x:e.clientX,y:e.clientY,pid:e.pointerId};},true);
window.addEventListener('pointerup',e=>{if(!drag||drag.pid!==e.pointerId)return;const d=drag;drag=null;e.preventDefault();e.stopImmediatePropagation();const distance=Math.hypot(e.clientX-d.x,e.clientY-d.y);if(d.tool){if(distance<20){selected=d.id;render();return;}const rect=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-landscape]');if(rect)act(rect.dataset.landscape,d.id,false);else toast('Solte a ferramenta sobre um objeto.');return;}act(d.id,selected,distance>35);selected=null;},true);
document.addEventListener('input',e=>{if(e.target?.id!=='landscapeFreq')return;let v=Number(e.target.value);s.lagoRadioFreq=v;document.getElementById('landscapeValue').textContent=v;if(v===17){radio=false;find('radio');}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-landscape-close]');if(b){e.preventDefault();e.stopImmediatePropagation();radio=false;render();}},true);
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
