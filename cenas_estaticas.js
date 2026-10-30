'use strict';
/* Manual das Criaturas — exploração por observação, sem manipular a pintura.
 * A lista de detalhes substitui qualquer arrasto. Provas, ferramentas,
 * deduções e multiplayer continuam usando os sistemas do jogo.
 */
(function(){
 if(typeof scene!=='function'||typeof CASES==='undefined'||typeof render!=='function')return;
 const originalScene=scene;
 const IMAGES={
  lago:{src:'assets/lago_cinema.webp',w:1000,h:1340,exposure:1},
  casa:{src:'assets/casa_aprovada.webp',w:1122,h:1402,exposure:.27},
  capela:{src:'assets/capela_cinema.webp',w:1000,h:1340,exposure:.68}
 };
 CASES.lago.scenes.casa.image=IMAGES.casa.src;
 CASES.lago.scenes.lago.intro='Há um caixote perto do cais, juncos espalhados e uma lanterna esquecida. Observe os detalhes com atenção antes de registrar pistas.';
 CASES.lago.scenes.capela.intro='O tecido junto ao sino, uma pedra inscrita e um baú antigo guardam indícios. Estude a pintura e os detalhes dos objetos.';
 const DESCRIPTIONS={
  reeds:['Juncos na margem','As hastes estão amassadas em uma direção diferente daquela do vento. Examine os intervalos entre elas.','inspect',null,[774,718,226,600]],
  ribbon:['Fibras azuladas','Entre os juncos há um tecido enroscado. O padrão lembra uma peça de roupa.','inspect','fita',[813,810,187,200]],
  crate:['Caixote do cais','O caixote encosta numa região de madeira marcada. Há sinais discretos no solo à sua volta.','inspect',null,[0,665,352,310]],
  footprints:['Marcas junto ao cais','O barro conserva relevos. Compare a orientação das marcas com o caminho até a água.','glass','pegadas',[350,1030,265,225]],
  keypiece:['Peça metálica','Uma pequena peça metálica aparece entre as tábuas, perto do caixote.','inspect',null,[622,900,227,185]],
  lantern:['Lanterna esquecida','Há pequenas gotas atrás do vidro. A superfície externa, porém, parece seca.','glass','lanterna',[65,145,160,230]],
  curtain:['Tecido da janela','O padrão do tecido oculta parcialmente a região onde a luz se reflete. Observe as dobras e os reflexos.','inspect',null,[293,148,175,610]],
  mirror:['Reflexo do espelho','Há uma discrepância entre o que deveria aparecer no vidro e as marcas registradas.','glass','espelho',[130,192,300,492]],
  drawer:['Gaveta do barqueiro','Os papéis e a madeira deixam vestígios nas bordas da gaveta; alguns registros podem ser identificados daqui.','inspect',null,[565,748,346,240]],
  papers:['Documentos da gaveta','As datas e anotações do registro podem ser lidas ao ampliar cuidadosamente esta região.','inspect','registro',[580,745,335,230]],
  radio:['Rádio antigo','O mostrador percorre frequências de 00 a 30. O depoimento pode sugerir qual registrar.','tune','radio',[695,555,295,235]],
  cloth:['Tecido do sino','A posição do tecido permite examinar suas fibras e a parte visível do bronze sem tocá-los.','inspect',null,[206,38,220,525]],
  bell:['Bronze do sino','Há riscos no metal que não parecem resultar apenas do uso normal.','glass','sino',[74,92,270,340]],
  stone:['Pedra inscrita','Parte da superfície está coberta de sujeira. É possível estudar o contorno dos símbolos.','brush','inscricao',[270,740,345,375]],
  chest:['Baú da capela','Uma fechadura antiga impede a leitura dos documentos. Procure uma chave compatível entre os indícios.','key','manuscrito',[665,735,334,295]]
 };
 const SCENE_DETAILS={
  lago:['reeds','crate','lantern','ribbon','footprints','keypiece'],
  casa:['curtain','drawer','radio','mirror','papers'],
  capela:['cloth','stone','chest','bell']
 };
 const PREREQ={ribbon:'reeds',footprints:'crate',keypiece:'crate',mirror:'curtain',papers:'drawer',bell:'cloth'};
 const CHOICE_LABEL={inspect:'Observação',glass:'Lupa',brush:'Pincel',key:'Chave',tune:'Frequência'};
 let focus=null,selectedTool='inspect';
 const escaped=v=>esc(String(v??''));
 function observed(id){
  return !!(s.lagoExamined?.[id]||s.lagoMoved?.[id]||s.lagoSteps?.[id]);
 }
 function markObserved(id){
  if(!s.lagoExamined||typeof s.lagoExamined!=='object')s.lagoExamined={};
  s.lagoExamined[id]=true;
  persist(false);
 }
 function revealed(id){
  const need=PREREQ[id];
  if(!need)return true;
  return observed(need)||s.evidence.includes(DESCRIPTIONS[id][3])||(id==='keypiece'&&s.lagoKey);
 }
 function already(id){
  const clue=DESCRIPTIONS[id][3];
  return clue?s.evidence.includes(clue):id==='keypiece'?!!s.lagoKey:observed(id);
 }
 function sceneList(){
  const ids=SCENE_DETAILS[s.activeScene]||[];
  return '<section class="staticFindings" aria-label="Detalhes para investigar">'+
   '<div class="staticFindingsHead"><div><small>OBSERVAÇÃO E DEDUÇÃO</small><h3>Detalhes do local</h3></div><span>'+CASES.lago.scenes[s.activeScene].items.filter(id=>s.evidence.includes(id)).length+'/3 pistas</span></div>'+
   '<p>Amplie a pintura para procurar detalhes. Depois selecione uma região abaixo para analisar com as ferramentas. Nada será movido na imagem.</p>'+
   '<div class="staticFindingsGrid">'+ids.filter(revealed).map(id=>{
    const d=DESCRIPTIONS[id],done=already(id);
    return '<button type="button" data-static-examine="'+id+'" class="staticFinding '+(done?'isDocumented':'')+'">'+
     '<span class="staticFindingMark" aria-hidden="true">'+(done?'✓':'⌕')+'</span><span><strong>'+escaped(d[0])+'</strong><small>'+(done?'Analisado · consultar novamente':'Selecionar para análise')+'</small></span></button>';
   }).join('')+'</div></section>';
 }
 function closeup(id){
  const im=IMAGES[s.activeScene],box=DESCRIPTIONS[id][4],src=im.src;
  const padX=Math.min(55,box[2]*.13),padY=Math.min(75,box[3]*.12);
  const x=Math.max(0,box[0]-padX),y=Math.max(0,box[1]-padY);
  const w=Math.min(im.w-x,box[2]+padX*2),h=Math.min(im.h-y,box[3]+padY*2);
  return '<svg viewBox="'+[x,y,w,h].map(Math.round).join(' ')+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ampliação da pintura original"><image href="'+src+'" x="0" y="0" width="'+im.w+'" height="'+im.h+'" preserveAspectRatio="none"/></svg>';
 }
 function toolButtons(id){
  const need=DESCRIPTIONS[id][2];
  if(need==='tune')return '<label class="staticFrequency">Frequência do rádio <b data-static-frequency>'+String(s.lagoRadioFreq||0).padStart(2,'0')+'</b>'+
   '<input type="range" min="0" max="30" step="1" value="'+Number(s.lagoRadioFreq||0)+'" data-static-tuner />'+
   '<span>00 ··············· 15 ··············· 30</span></label>';
  const options=[['inspect','◉','Observar'],['glass','⌕','Lupa'],['brush','╱','Pincel'],...(s.lagoKey?[['key','⚿','Chave']]:[])];
  return '<div class="staticModalTools"><small>Escolha a ferramenta</small><div>'+
   options.map(([id,icon,label])=>'<button type="button" data-static-tool="'+id+'" aria-pressed="'+(selectedTool===id)+'" class="'+(selectedTool===id?'isSelected':'')+'">'+icon+' '+label+'</button>').join('')+
   '</div></div>';
 }
 function detailDialog(){
  if(!focus||!DESCRIPTIONS[focus])return '';
  const d=DESCRIPTIONS[focus],need=d[2],done=already(focus);
  const instruction=need==='tune'?'Compare o horário do depoimento com a frequência do aparelho.':
   need==='key'&&!s.lagoKey?'Ainda não foi encontrada uma chave compatível. Procure outros detalhes na margem.':
   need==='glass'?'A lupa pode revelar marcas difíceis de distinguir.':
   need==='brush'?'Use o pincel para examinar os sinais sob a camada de sujeira.':
   'Observe as irregularidades antes de registrar o resultado.';
  const label=need==='tune'?'Registrar leitura':done?'Rever observação':need==='key'?'Examinar fechadura':'Analisar detalhe';
  return '<div class="staticInspectBackdrop" data-static-close-outer><section class="staticInspectDialog" role="dialog" aria-modal="true" aria-label="Análise de detalhe">'+
   '<header><small>PRANCHA DE ANÁLISE · '+escaped(CASES.lago.scenes[s.activeScene].name)+'</small><button type="button" data-static-close aria-label="Fechar detalhe">×</button></header>'+
   '<h3>'+escaped(d[0])+'</h3><div class="staticCloseup">'+closeup(focus)+'</div>'+
   '<p>'+escaped(d[1])+'</p><p class="staticToolHint">'+escaped(instruction)+'</p>'+toolButtons(focus)+
   (need==='tune'?'': '<button type="button" class="staticApply" data-static-apply>'+label+'</button>')+
   '<button type="button" class="staticClose" data-static-close>Voltar ao cenário</button></section></div>';
 }
 function staticScene(){
  const id=s.activeScene,im=IMAGES[id],loc=CASES.lago.scenes[id];
  if(!im||!loc)return originalScene();
  const canvas='<div class="landscapeCanvas staticSceneCanvas staticScene-'+id+'" aria-label="Pintura de '+escaped(loc.name)+'">'+
   '<img src="'+im.src+'" alt="Cenário ilustrado de '+escaped(loc.name)+'" draggable="false" /></div>';
  return '<section class="landscapePage staticScenePage"><button class="backBtn" data-view="hub">← Voltar aos locais</button>'+
   '<div class="eyebrow">ARQUIVO 001 · INVESTIGAÇÃO VISUAL</div><h2>'+escaped(loc.name)+'</h2>'+
   '<p>'+escaped(loc.intro)+'</p><p class="landscapeHelp">A pintura permanece intacta. Utilize a ampliação para observar a imagem e a lista de detalhes para investigar.</p>'+
   canvas+sceneList()+
   '<div class="staticCaseFooter"><button type="button" class="btn outline" data-view="dossier">Ver dossiê ('+s.evidence.length+'/9)</button>'+
   '<button type="button" class="btn" data-view="board">Quadro de provas →</button></div>'+detailDialog()+'</section>';
 }
 scene=function(){
  if(s.caseId==='lago')return staticScene();
  const html=originalScene();
  // Nas demais missões, manter as pistas clicáveis mas FORA da pintura,
  // permitindo observar a arte sem ícones sobre ela.
  if(s.view!=='scene')return html;
  const tmpl=document.createElement('template');tmpl.innerHTML=html;
  const frame=tmpl.content.querySelector('.sceneFrame');
  if(!frame)return html;
  const targets=[...frame.querySelectorAll('.hotspot')];
  const section=document.createElement('section');section.className='staticFindings genericStaticFindings';
  section.innerHTML='<div class="staticFindingsHead"><h3>Detalhes para examinar</h3></div><div class="staticFindingsGrid"></div>';
  const list=section.querySelector('.staticFindingsGrid');
  for(const node of targets){
   const item=node.cloneNode(false),id=node.dataset.clue;
   item.removeAttribute('style');
   item.removeAttribute('title');
   item.className='staticFinding '+(node.classList.contains('found')?'isDocumented':'');
   if(id){
    const clue=CASES[s.caseId]?.clues?.[id];
    item.innerHTML='<span class="staticFindingMark" aria-hidden="true">'+(node.classList.contains('found')?'✓':'⌕')+'</span><span><strong>'+escaped(clue?.name||'Pista')+'</strong><small>'+(node.classList.contains('found')?'Registrada · revisar':'Examinar este indício')+'</small></span>';
   }else{
    item.setAttribute('aria-label','Pista de outro pesquisador');item.innerHTML='⌁ Pista reservada a outro especialista';
   }
   list.append(item);node.remove();
  }
  frame.after(section);
  const help=tmpl.content.querySelector('.sceneFoot>p');
  if(help)help.textContent='Observe a cena pela ampliação e selecione os detalhes na lista. As ferramentas e pistas continuam disponíveis.';
  return tmpl.innerHTML;
 };
 function recordClue(id){
  if(s.evidence.includes(id)){
   focus=null;s.modal=id;render();return;
  }
  if(net.inGame&&net.paused)return toast('Aguarde a reconexão da equipe.');
  if(net.inGame&&net.mode==='coop'&&!canInspect(id))return toast('Este indício depende de outro especialista da equipe.');
  s.evidence.push(id);s.modal=id;focus=null;
  persist();if(typeof playEffect==='function')playEffect('find');render();
 }
 function examine(){
  if(!focus)return;
  if(net.inGame&&net.paused)return toast('Aguarde a reconexão da equipe.');
  const id=focus,d=DESCRIPTIONS[id],needed=d[2],clue=d[3];
  if(needed!=='tune'&&needed!==selectedTool){
   return toast('Selecione '+(CHOICE_LABEL[needed]||needed)+' para analisar este detalhe.');
  }
  if(needed==='key'&&!s.lagoKey)return toast('A chave precisa ser identificada primeiro, na margem.');
  if(id==='keypiece'){s.lagoKey=true;focus=null;persist();render();toast('Peça metálica registrada como chave.');return;}
  if(clue){recordClue(clue);return;}
  markObserved(id);focus=null;render();
  toast('Observação registrada. Verifique se há novos detalhes disponíveis.');
 }
 function lightValue(){
  const t=typeof manualWorldMinute==='function'?manualWorldMinute():20*60;
  if(t<360||t>=1140)return 0;
  if(t<480)return (t-360)/120;
  if(t>1020)return (1140-t)/120;
  return 1;
 }
 function exposure(){
  if(s.caseId==='lago')return IMAGES[s.activeScene]?.exposure??.2;
  const k=String(s.activeScene||'').toLowerCase();
  if(/floresta|bosque|jardim|lago|margem|praca|praça|rua|porto|torre|ponte|aldeia|plataforma|circulo|círculo|poço|poco/.test(k))return 1;
  if(/cripta|tunel|túnel|cofre|mina|porao|porão|subterraneo/.test(k))return 0;
  if(/capela|vitrine|atrio|átrio|sala|hall|galeria/.test(k))return .25;
  return .15;
 }
 function syncLighting(){
  if(s.view!=='scene')return;
  const level=lightValue()*exposure();
  const factor=(1+level*.56).toFixed(3),color=(1+level*.22).toFixed(3),glow=(level*.58).toFixed(3);
  const els=app.querySelectorAll('.staticSceneCanvas,.sceneFrame,.locationsArtViewport');
  for(const el of els){
   el.style.setProperty('--scene-brightness',factor);
   el.style.setProperty('--scene-saturation',color);
   el.style.setProperty('--scene-glow',glow);
   el.dataset.illumination=level>.5?'day':level>.06?'twilight':'night';
  }
 }
 const oldRender=render;
 render=function(){oldRender();syncLighting();};
 setInterval(syncLighting,1400);
 document.addEventListener('click',ev=>{
  if(s.caseId!=='lago')return;
  const b=ev.target.closest('[data-static-examine],[data-static-apply],[data-static-tool],[data-static-close],[data-static-close-outer]');
  if(!b)return;
  const outside=b.hasAttribute('data-static-close-outer')&&ev.target===b;
  if(b.hasAttribute('data-static-close-outer')&&!outside)return;
  ev.preventDefault();ev.stopImmediatePropagation();
  if(b.hasAttribute('data-static-examine')){
   focus=b.dataset.staticExamine;selectedTool='inspect';
   const clue=DESCRIPTIONS[focus]?.[3];
   if(clue&&s.evidence.includes(clue)){s.modal=clue;focus=null;}
  }else if(b.hasAttribute('data-static-tool'))selectedTool=b.dataset.staticTool;
  else if(b.hasAttribute('data-static-apply')){examine();return;}
  else if(b.hasAttribute('data-static-close')||outside)focus=null;
  render();
 },true);
 document.addEventListener('input',ev=>{
  if(s.caseId!=='lago'||!ev.target.matches('[data-static-tuner]'))return;
  const n=Number(ev.target.value);s.lagoRadioFreq=n;
  const el=ev.target.closest('.staticInspectDialog')?.querySelector('[data-static-frequency]');
  if(el)el.textContent=String(n).padStart(2,'0');
  if(n===17)recordClue('radio');else persist(false);
 },true);
 document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&focus){ev.preventDefault();focus=null;render();}
 },true);
 const css=document.createElement('style');
 css.textContent='.staticSceneCanvas{max-height:none!important;height:auto!important;overflow:hidden;aspect-ratio:1000/1340;isolation:isolate;background:#091a25!important}.staticSceneCanvas.staticScene-casa{aspect-ratio:1122/1402}.staticSceneCanvas>img{display:block;width:100%;height:100%;object-fit:fill;filter:brightness(var(--scene-brightness,1)) saturate(var(--scene-saturation,1));transition:filter 1.4s ease}.staticSceneCanvas::after,.sceneFrame::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:2;opacity:var(--scene-glow,0);background:linear-gradient(148deg,#9ed4f065 4%,#fff1c365 50%,#b6dcff30 100%);mix-blend-mode:screen;transition:opacity 1.4s ease}.staticSceneCanvas .timeWorldLighting{z-index:3}body[data-time-light=day] .staticSceneCanvas .timeWorldLighting{background:transparent}.sceneFrame>img,.locationsArtViewport>img{filter:brightness(var(--scene-brightness,1)) saturate(var(--scene-saturation,1));transition:filter 1.4s ease}.sceneFrame{isolation:isolate}.staticFindings{margin:16px 0;border:1px solid #9d856255;border-radius:13px;padding:15px;background:linear-gradient(140deg,#162e38,#0d2029)}.staticFindingsHead{display:flex;justify-content:space-between;align-items:center;gap:10px}.staticFindingsHead small{font-size:9px;letter-spacing:.13em;color:#c9b187;font-weight:700}.staticFindingsHead h3{font:normal 23px Georgia,serif;color:#f0d8ab;margin:6px 0}.staticFindingsHead>span{font:700 12px system-ui;color:#d4bc8d}.staticFindings>p{font:12px/1.6 system-ui;color:#c0ceca;margin:6px 0 12px}.staticFindingsGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.staticFinding{display:flex;align-items:center;gap:9px;text-align:left;min-width:0;padding:13px 10px;min-height:73px;border-radius:9px;background:#233c45;border:1px solid #7d756477;color:#f2e2c7;cursor:pointer}.staticFinding.isDocumented{opacity:.76;border-color:#5e847c}.staticFindingMark{font:24px Georgia,serif;color:#d6bb83;flex:none}.staticFinding strong{display:block;font-size:13px;line-height:1.25}.staticFinding small{display:block;color:#aec5c4;font:10px/1.4 system-ui;margin-top:4px}.staticCaseFooter{display:grid;gap:8px;margin-top:15px}.staticInspectBackdrop{position:fixed;inset:0;z-index:16000;display:grid;place-items:center;padding:12px;background:#020d16ed;backdrop-filter:blur(7px)}.staticInspectDialog{max-width:520px;width:100%;max-height:94dvh;overflow:auto;padding:18px;background:linear-gradient(150deg,#213842,#0d1f29);color:#eadbc3;border:1px solid #b69b6b;border-radius:15px}.staticInspectDialog header{display:flex;align-items:center;justify-content:space-between;gap:10px}.staticInspectDialog header small{font:700 9px system-ui;letter-spacing:.12em;color:#c5ae86}.staticInspectDialog header button{background:transparent;border:0;font:30px system-ui}.staticInspectDialog h3{font:normal 26px Georgia,serif;color:#f5dcb1;margin:12px 0}.staticCloseup{height:240px;background:#071b25;border-radius:10px;overflow:hidden;border:1px solid #6e766d}.staticCloseup svg{display:block;width:100%;height:100%}.staticInspectDialog p{font:13px/1.6 system-ui}.staticToolHint{color:#b6c8cb}.staticModalTools>small{display:block;color:#ead09a;font-size:11px;margin:12px 0 8px}.staticModalTools>div{display:flex;gap:7px;flex-wrap:wrap}.staticModalTools button{border:1px solid #847c64;border-radius:8px;background:#18313c;color:#e7d9bd;padding:9px 13px;font:700 12px system-ui}.staticModalTools button.isSelected{background:#bda475;color:#132a31;border-color:#e9d3a4}.staticApply{width:100%;padding:13px;background:#d2b683;color:#1d3036;border:0;border-radius:8px;font:750 14px system-ui;margin:14px 0 8px}.staticClose{display:block;margin:auto;border:0;background:transparent;color:#c5d3d0;padding:10px}.staticFrequency{display:block;font:13px system-ui}.staticFrequency input{display:block;width:100%;accent-color:#d5b47c;margin:14px 0}.staticFrequency span{display:block;text-align:center;font-size:10px;color:#b7c6c2}.genericStaticFindings{margin:10px 14px}.genericStaticFindings .staticFindingsHead h3{font-size:20px}@media(max-width:420px){.staticFindingsGrid{grid-template-columns:1fr}.staticInspectDialog{padding:14px}.staticCloseup{height:205px}}';
 document.head.append(css);
 render();
})();