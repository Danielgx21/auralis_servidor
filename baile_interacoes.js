'use strict';
/* Arquivo 002 — exploração sem objetos duplicados e entrevistas progressivas. */
(function(){
 if(!window.manualCase002Ready||typeof render!=='function'||typeof scene!=='function')return;
 const ID='baile',C=CASES.baile;
 let focus=null,selected='inspect';
 const roles=['analyst','sensitive','archivist','diplomat','tracker'];
 const roleNames={analyst:'Analista',sensitive:'Sensitivo',archivist:'Arquivista',diplomat:'Diplomata',tracker:'Rastreador'};
 const labels={inspect:'Observação',glass:'Lupa',brush:'Pincel'};
 const method={
  taca:'glass',convite:'glass',pegada:'brush',relogio:'inspect',mascara:'glass',arco:'inspect',flor:'glass',pacto:'glass',prisma:'glass',
  v2_a_1:'glass',v2_a_2:'glass',v2_a_3:'glass',v2_b_1:'inspect',v2_b_2:'glass',v2_b_3:'inspect',
  v2_c_1:'inspect',v2_c_2:'glass',v2_c_3:'glass',v2_d_1:'glass',v2_d_2:'inspect',v2_d_3:'glass',
  v2_e_1:'glass',v2_e_2:'glass',v2_e_3:'glass'
 };
 const seen=id=>s.evidence.includes(id);
 const asked=id=>s.witness.includes(id);
 const owner=(role,kind)=>{
  const ix=roles.indexOf(role);
  if(ix<net.size)return ix;
  return kind==='v2_b'||kind==='v2_w2'?Math.min(1,net.size-1):0;
 };
 const accessible=sceneId=>{
  const place=C.v2Locations?.[sceneId];
  return !place||!net.inGame||net.mode!=='coop'||net.slot===owner(place.role,sceneId);
 };
 const html=x=>esc(String(x??''));
 function palette(){
  return '<div class="baileTools"><span>Selecione uma ferramenta e examine a pintura</span><div>'+
   [['inspect','◉','Observar'],['glass','⌕','Lupa'],['brush','╱','Pincel']].map(([k,symbol,title])=>
   '<button type="button" data-baile-tool="'+k+'" aria-pressed="'+(selected===k)+'" class="'+(selected===k?'selected':'')+'">'+symbol+' '+title+'</button>').join('')+
   '</div></div>';
 }
 function hotspots(sceneId){
  return C.scenes[sceneId].items.map(id=>{
   const clue=C.clues[id],w=clue.hitW||17,h=clue.hitH||15;
   const x=Math.min(100-w,Math.max(0,clue.x-w/2));
   const y=Math.min(100-h,Math.max(0,clue.y-h/2));
   return '<button type="button" data-v2-clue="'+html(id)+'" class="v2InvisibleHotspot baileHotspot" aria-label="Examinar detalhe do cenário" style="left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%"></button>';
  }).join('');
 }
 function closeup(id){
  const e=C.clues[id],place=C.scenes[s.activeScene];
  const w=330,h=430,x=Math.max(0,Math.min(900-w,e.x*9-w/2)),y=Math.max(0,Math.min(1260-h,e.y*12.6-h/2));
  return '<svg viewBox="'+[x,y,w,h].map(Math.round).join(' ')+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Detalhe ampliado de '+html(place.name)+'"><image href="'+place.image+'" x="0" y="0" width="900" height="1260"/></svg>';
 }
 function detailDialog(){
  if(!focus||!C.clues[focus])return '';
  const e=C.clues[focus],required=method[focus]||'inspect';
  return '<div class="baileDetailBackdrop" data-baile-outer><section class="baileDetail" role="dialog" aria-modal="true" aria-label="Examinar evidência">'+
   '<header><small>ARQUIVO 002 · OBSERVAÇÃO</small><button data-baile-close type="button" aria-label="Fechar">×</button></header>'+
   '<h3>'+html(e.name)+'</h3><div class="baileDetailZoom">'+closeup(focus)+'</div>'+
   '<p>'+html(e.detail)+'</p>'+
   (C.v2Documents?.[focus]?'<p class="bailePaperHint">Há um documento associado a este objeto. Após analisar, você poderá ler seu conteúdo integral.</p>':'')+
   '<p class="baileToolHelp">Ferramenta necessária: '+labels[required]+'.</p>'+palette()+
   '<button type="button" class="baileConfirm" data-baile-collect>'+ (seen(focus)?'Rever informação':'Registrar observação')+'</button>'+
   '<button type="button" class="baileCancel" data-baile-close>Voltar ao cenário</button></section></div>';
 }
 const priorScene=scene,priorWitness=witness,priorHub=hub,priorPuzzle=puzzle,priorRender=render;
 scene=function(){
  if(s.caseId!==ID)return priorScene();
  const sceneId=s.activeScene,loc=C.scenes[sceneId];
  if(!loc)return priorScene();
  if(!accessible(sceneId))return '<section class="section"><button class="backBtn" data-view="hub">← Voltar aos locais</button><h2>Área reservada</h2><p>Esta área exige um '+html(roleNames[C.v2Locations[sceneId]?.role]||'pesquisador')+'. Os resultados ficam disponíveis para toda a equipe.</p></section>';
  return '<section class="section baileScenePage"><div class="sceneIntro"><button class="backBtn" data-view="hub">← Voltar aos locais</button>'+
   '<div class="eyebrow">ARQUIVO 002 · INVESTIGAÇÃO</div><h2>'+html(loc.name)+'</h2><p>'+html(loc.intro)+'</p></div>'+
   palette()+'<div class="sceneFrame v2SceneFrame bailePainting"><img src="'+loc.image+'" draggable="false" alt="Pintura do local: '+html(loc.name)+'" />'+hotspots(sceneId)+'</div>'+
   '<p class="baileSceneInstruction">Observe a imagem e use “Ver arte do local” para ampliar. Algumas inscrições podem ser lidas diretamente. Os objetos não são arrastados.</p>'+
   '<div class="baileFoot"><button type="button" data-view="dossier">Consultar pistas coletadas</button><button type="button" data-view="hub">Outros locais</button></div>'+
   detailDialog()+'</section>';
 };
 const gate={
  nome:()=>true,
  anfitriao:()=>asked('nome')&&(seen('convite')||seen('v2_a_3')),
  fuga:()=>asked('anfitriao')&&(seen('arco')||seen('v2_d_2')),
  v2_w1_1:()=>true,
  v2_w1_2:()=>asked('v2_w1_1')&&seen('v2_a_3'),
  v2_w1_3:()=>asked('v2_w1_2')&&seen('v2_a_2'),
  v2_w2_1:()=>true,
  v2_w2_2:()=>asked('v2_w2_1')&&seen('v2_b_1'),
  v2_w2_3:()=>asked('v2_w2_2')&&seen('v2_b_3'),
  v2_w3_1:()=>true,
  v2_w3_2:()=>asked('v2_w3_1')&&seen('v2_c_2'),
  v2_w3_3:()=>asked('v2_w3_2')&&seen('arco'),
  v2_w4_1:()=>true,
  v2_w4_2:()=>asked('v2_w4_1')&&seen('v2_d_2'),
  v2_w4_3:()=>asked('v2_w4_2')&&seen('v2_d_3'),
  v2_w5_1:()=>true,
  v2_w5_2:()=>asked('v2_w5_1')&&seen('v2_a_3'),
  v2_w5_3:()=>asked('v2_w5_2')&&seen('v2_b_3')
 };
 const questionAllowed=id=>s.caseId!==ID||!gate[id]||asked(id)||!!gate[id]();
 window.manualBaileQuestionAllowed=questionAllowed;
 witness=function(){
  const raw=priorWitness();
  if(s.caseId!==ID)return raw;
  const tmp=document.createElement('template');tmp.innerHTML=raw;
  tmp.content.querySelectorAll('[data-question]').forEach(node=>{
   if(!questionAllowed(node.dataset.question))node.remove();
  });
  const note=tmp.content.querySelector('.v2WitnessPrompt')||tmp.content.querySelector('.eyebrow');
  if(note&&note.parentElement){
   const p=document.createElement('p');
   p.className='baileWitnessHelp';p.textContent='Novas perguntas surgem depois que você encontra documentos e ouve outras respostas. A testemunha não tem acesso às provas dos outros setores.';
   note.insertAdjacentElement('afterend',p);
  }
  return tmp.innerHTML;
 };
 hub=function(){
  let raw=priorHub();
  if(s.caseId!==ID)return raw;
  // A segunda missão não mantém as seções antigas de ritual automático,
  // sombra que concede pistas gratuitamente ou quadro de dedução.
  const oldMenu=document.createElement('template');oldMenu.innerHTML=raw;
  oldMenu.content.querySelectorAll('[data-view="puzzle"],[data-view="interlude"],[data-action="audio"]').forEach(node=>{
   const section=node.closest('.partDivider');
   if(section)section.remove();else node.remove();
  });
  raw=oldMenu.innerHTML;
  const needed=['v2_a_2','v2_b_2','v2_c_2'],ready=needed.every(seen);
  const next='<section class="baileSequenceCard"><div class="eyebrow">RECONSTITUIÇÃO DA ÚLTIMA APRESENTAÇÃO</div><h3>Controles de iluminação</h3>'+
   '<p>O baile tinha sete cores de luz. Três registros parciais foram preservados. Compare-os antes de reconstruir os comandos.</p>'+
   '<div class="baileSequenceCounter">'+needed.filter(seen).length+'/3 registros de setores distintos examinados</div>'+
   '<button type="button" data-view="puzzle">'+(s.puzzleSolved?'✓ Revisar sequência':'Conferir sequência de luzes')+'</button>'+
   (ready?'':'<small>A ordem depende da bilheteria, da cabine e da orquestra.</small>')+'</section>';
  return raw+next;
 };
 puzzle=function(){
  if(s.caseId!=='baile')return priorPuzzle();
  const required=['v2_a_2','v2_b_2','v2_c_2'];
  if(!required.every(seen)){
   return '<section class="section baileSequenceLocked"><button type="button" class="backBtn" data-view="hub">← Voltar aos locais</button><div class="eyebrow">ARQUIVO 002 · ANÁLISE</div><h2>Sequência incompleta</h2>'+
    '<p>Há três versões incompletas do encerramento. Consulte a programação da bilheteria, o registro da cabine e a partitura antes de ordenar os comandos.</p>'+
    '<p>'+required.filter(seen).length+'/3 documentos examinados.</p><button type="button" class="btn" data-view="hub">Retornar à investigação</button></section>';
  }
  return priorPuzzle().replace('O ritmo foi decifrado. O salão mostra uma porta de saída, e você ganhou 25 pontos de pesquisa.','Sequência conferida com os três registros. Agora compare o resultado com os relatos e os acessos do palácio.');
 };
 document.addEventListener('click',ev=>{
  if(s.caseId!==ID)return;
  const target=ev.target.closest('[data-v2-clue],[data-baile-tool],[data-baile-close],[data-baile-outer],[data-baile-collect],[data-question],[data-color],[data-surreal]');
  if(!target)return;
  if(target.dataset.question&&!questionAllowed(target.dataset.question)){
   ev.preventDefault();ev.stopImmediatePropagation();toast('Essa pergunta ainda não decorre das informações encontradas.');return;
  }
  if(target.hasAttribute('data-surreal')){
   ev.preventDefault();ev.stopImmediatePropagation();
   toast('Esta versão usa provas e depoimentos. Continue a investigação nos locais do palácio.');return;
  }
  if(target.dataset.color){
   ev.preventDefault();ev.stopImmediatePropagation();
   if(!['v2_a_2','v2_b_2','v2_c_2'].every(seen))return toast('Os três registros da iluminação ainda não foram comparados.');
   if(s.puzzleSolved)return;
   s.puzzleInput=[...(s.puzzleInput||[]),target.dataset.color];
   if(s.puzzleInput.length>=3){
    if(s.puzzleInput.join(',')===C.puzzle.join(',')){
     s.puzzleSolved=true;persist();toast('Sequência conferida. Os horários coincidem com os documentos.');
    }else{s.puzzleInput=[];toast('A ordem não corresponde aos horários registrados. Compare as três fontes.');}
   }
   render();return;
  }
  // A captura impede que a implementação antiga colete provas com um clique.
  if(target.hasAttribute('data-v2-clue')){
   ev.preventDefault();ev.stopImmediatePropagation();
   if(net.inGame&&net.paused)return toast('Aguarde a equipe reconectar.');
   if(!accessible(s.activeScene))return toast('Esta área exige a especialidade de outro pesquisador.');
   focus=target.dataset.v2Clue;render();return;
  }
  if(target.hasAttribute('data-baile-tool')){
   ev.preventDefault();ev.stopImmediatePropagation();selected=target.dataset.baileTool;render();return;
  }
  if(target.hasAttribute('data-baile-close')||(target.hasAttribute('data-baile-outer')&&target===ev.target)){
   ev.preventDefault();ev.stopImmediatePropagation();focus=null;render();return;
  }
  if(target.hasAttribute('data-baile-collect')){
   ev.preventDefault();ev.stopImmediatePropagation();
   if(!focus)return;
   if(net.inGame&&net.paused)return toast('Aguarde a equipe reconectar.');
   if(!accessible(s.activeScene))return toast('Outra especialidade deverá registrar a observação.');
   if(selected!==(method[focus]||'inspect'))return toast('Selecione '+labels[method[focus]||'inspect']+' para esta observação.');
   const id=focus;focus=null;
   if(!seen(id)){s.evidence.push(id);persist();if(typeof playEffect==='function')playEffect('find');}
   s.modal=id;render();return;
  }
 },true);
 const style=document.createElement('style');
 style.textContent=
 '.baileScenePage{padding-bottom:130px}.baileScenePage h2{font:normal clamp(30px,5vw,44px)/1.14 Georgia,serif;color:#f0dec2}.baileScenePage>p{color:#c2cec9;line-height:1.55}'+
 '.bailePainting{position:relative;overflow:hidden;aspect-ratio:900/1260!important;width:min(100%,690px);height:auto!important;margin:18px auto;border:1px solid #a88e62;border-radius:14px;background:#0b1a22}'+
 '.bailePainting>img{display:block;width:100%;height:100%;object-fit:fill;pointer-events:none}.bailePainting .baileHotspot{position:absolute;z-index:10;border:0;background:transparent;box-shadow:none;cursor:crosshair;touch-action:manipulation}'+
 '.bailePainting .baileHotspot:focus-visible{outline:2px solid #efd5a0;outline-offset:2px}'+
 '.baileTools{padding:12px;background:#192e37;border:1px solid #8e785b;border-radius:11px;margin:15px 0;color:#d9c7ab;font:12px system-ui}'+
 '.baileTools>div{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.baileTools button,.baileFoot button{background:#31444c;color:#eadbbd;border:1px solid #a88c60;border-radius:8px;padding:10px 13px;font-weight:700;cursor:pointer}'+
 '.baileTools button.selected{background:#93744c;color:#131c21;border-color:#edc992}.baileSceneInstruction{font-size:12px!important;max-width:650px;margin:auto}.baileFoot{display:flex;gap:8px;margin:17px 0;flex-wrap:wrap}'+
 '.baileDetailBackdrop{position:fixed;inset:0;z-index:17050;background:#020c16ef;backdrop-filter:blur(6px);display:grid;place-items:center;padding:9px}'+
 '.baileDetail{max-width:545px;width:100%;max-height:95dvh;overflow:auto;border:1px solid #b4a079;border-radius:13px;background:linear-gradient(145deg,#23363c,#0d202b);color:#e8d8bd;padding:16px;box-shadow:0 14px 60px #0009}'+
 '.baileDetail header{display:flex;align-items:center;justify-content:space-between}.baileDetail header small{letter-spacing:.16em;color:#d8b787}.baileDetail header button{background:none;border:0;color:#e7c998;font-size:30px}'+
 '.baileDetail h3{font:normal 28px Georgia,serif;margin:9px 0 15px}.baileDetailZoom{border-radius:10px;overflow:hidden;border:1px solid #baa06e;background:#06141d}'+
 '.baileDetailZoom svg{display:block;width:100%;max-height:41dvh;aspect-ratio:330/430}.baileDetail>p{font:14px/1.65 system-ui}.bailePaperHint{color:#d4b98b!important;font-size:12px!important}'+
 '.baileToolHelp{font-size:12px!important;color:#c7ba9c!important}.baileConfirm,.baileCancel{width:100%;padding:14px;border-radius:8px;margin-top:9px;font-weight:750}'+
 '.baileConfirm{background:#d4b783;border:1px solid #e7c58b;color:#16242a}.baileCancel{background:#1e343d;color:#e3d2b6;border:1px solid #796c59}'+
 '.baileSequenceCard{margin:25px 12px;padding:20px;background:linear-gradient(145deg,#203843,#121f2b);border:1px solid #b9a072;border-radius:13px;color:#ead6b1}'+
 '.baileSequenceCard h3{font:normal 24px Georgia,serif}.baileSequenceCard p{color:#c9d1ca;line-height:1.6}.baileSequenceCard small{display:block;margin-top:9px;color:#c4b39b}'+
 '.baileSequenceCounter{font-size:12px;margin:10px 0;color:#dabd89;font-weight:700}.baileSequenceCard button{width:100%;padding:14px;background:#c8aa79;color:#13232a;border-radius:8px;border:1px solid #e3c493;font-weight:800}'+
 '.baileWitnessHelp{font:12px/1.55 system-ui;color:#bac9c7;border-left:2px solid #d0ad72;padding-left:10px}';
 document.head.appendChild(style);
 const oldRender=render;
 render=function(){if(s.caseId!==ID||s.view!=='scene')focus=null;else if(focus&&!C.scenes[s.activeScene]?.items.includes(focus))focus=null;oldRender()};
 window.manualBaileAccess=accessible;
 window.manualBaileMethods=method;
 render();
})();