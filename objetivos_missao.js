'use strict';
/* Objetivos de missão: identificação livre, pistas e diário.
 * Mantém a votação e os desfechos existentes como mecanismos internos.
 */
(function(){
 if(typeof CASES==='undefined'||typeof render!=='function'||typeof app==='undefined')return;
 const GOALS={
  lago:{title:'Compreender a ligação entre a represa e a capela',description:'Investigue o registro da represa e as marcas do sino, sem presumir a origem do fenômeno.',clues:['registro','sino']},
  baile:{title:'Decifrar o ritual do baile',description:'Investigue os convites e conclua a sequência de cores do salão.',clues:['convite'],puzzle:true},
  vampiro:{title:'Determinar o compromisso que mantém a anomalia',description:'Confronte os contratos e os selos encontrados na mansão.',clues:['contrato','selo']},
  lobo:{title:'Reconstruir os acontecimentos da noite',description:'Compare as marcas encontradas na floresta com o que foi contido no moinho.',clues:['garras','corrente']},
  retrato:{title:'Verificar a origem das alterações nos retratos',description:'Reúna vestígios da galeria e do ateliê para explicar o comportamento das imagens.',clues:['olhos','assinatura']},
  estacao:{title:'Investigar a última partida',description:'Reconstrua o trajeto e os avisos que antecederam o desaparecimento.',clues:['passagem','alarme']},
  museu:{title:'Investigar a mudança de identidade dos visitantes',description:'Consulte o arquivo e uma das peças que parecem alterar os rostos.',clues:['mascara','registro']},
  lago2:{title:'Recuperar o rastro dos nomes desaparecidos',description:'Investigue os documentos e as marcas de autenticação da cidade.',clues:['livro','carimbo']},
  baile2:{title:'Reconstruir a ordem dos acontecimentos',description:'Compare os registros do convite com o roteiro apresentado no palco.',clues:['convite','roteiro']},
  vampiro2:{title:'Identificar como a herança foi manipulada',description:'Investigue a convocação do leilão e a assinatura do contrato.',clues:['edital','rubrica']},
  lobo2:{title:'Reconstituir o julgamento ritual',description:'Compare o juramento com as marcas do selo.',clues:['juramento','selo']},
  retrato2:{title:'Investigar os rostos e a sucessão da casa',description:'Encontre o vínculo entre as fotografias e o testamento.',clues:['foto','testamento']},
  estacao2:{title:'Identificar a origem da última transmissão',description:'Relacione a gravação às conclusões do relatório técnico.',clues:['gravacao','relatorio']},
  museu2:{title:'Desvendar o que mantém a galeria ativa',description:'Investigue os reflexos e consulte o manual encontrado no local.',clues:['espelhos','manual']},
  bolsonaros:{title:'Reconstruir o retorno da dinastia de Cinzavila',description:'Compare a ata da antiga revolta com o juramento que voltou a circular.',clues:['ata','juramento']}
 };
 const ALIASES={
  lago:['velaria','guardia das aguas'],
  baile:['anfitriao prismatico'],
  vampiro:['vampiro juramentado'],
  lobo:['guardiao licantropo'],
  retrato:['conservador de tinta'],
  estacao:['banshee dos trilhos'],
  museu:['curador dos rostos'],
  lago2:['escriturario afogado'],
  baile2:['costureira dos instantes'],
  vampiro2:['notario escarlate'],
  lobo2:['juiz de prata'],
  retrato2:['retratista vazio'],
  estacao2:['oraculo de ruido'],
  museu2:['arquivista do veu'],
  bolsonaros:['os bolsonaros','bolsonaros']
 };
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim().replace(/^(o|a|os|as|um|uma) /,'');
 const rule=()=>GOALS[s.caseId]||{title:'Reconstruir os acontecimentos da missão',description:'Investigue os indícios encontrados no local.',clues:[]};
 const count=()=>rule().clues.filter(id=>s.evidence.includes(id)).length;
 const hasGoal=()=>count()===rule().clues.length&&(!rule().puzzle||!!s.puzzleSolved);
 const canReport=()=>s.evidence.length>=requiredClues()&&hasGoal();
 const objectiveText=()=>{const r=rule();return (r.puzzle?(s.puzzleSolved?'Ritual resolvido · ':'Ritual pendente · '):'')+count()+'/'+r.clues.length+' vestígios do objetivo examinados';};
 const readySummary=()=>s.evidence.length+' pistas reunidas · '+objectiveText();
 const esc2=x=>esc(String(x??''));
 const originalHub=hub,originalDossier=dossier,originalConfrontation=confrontation,originalEnding=ending,originalCollection=collection;
 const originalRender=render;
 nav=function(){
  const buttons=[['hub','♧','Mapa'],['dossier','⌕','Pistas'],['journal','✎','Diário'],['theory','◎','Objetivo'],['office','♜','Sede'],['bestiary','▤','Bestiário']];
  return '<nav class="bottomNav" aria-label="Menu do jogo">'+buttons.map(([id,ico,label])=>
   '<button class="navButton '+(s.view===id||id==='hub'&&s.view==='scene'?'active':'')+'" '+(id==='journal'?'data-deep-journal-open="1"':'data-view="'+id+'"')+'><span class="navGlyph">'+ico+'</span><span>'+label+'</span></button>').join('')+'</nav>';
 };
 function goalCard(){
  const r=rule();return '<section class="missionGoalCard"><div class="eyebrow">OBJETIVO DA MISSÃO</div><h3>Identifique a criatura</h3><p>Descubra quem ou o que está por trás dos acontecimentos. O Instituto não oferece uma lista de respostas.</p>'+
   '<div class="missionGoalDivider"></div><strong>'+esc2(r.title)+'</strong><p>'+esc2(r.description)+'</p>'+
   '<small>'+esc2(readySummary())+'</small>'+
   '<button class="btn" type="button" data-view="theory">Consultar objetivo e apresentar identificação →</button></section>';
 }
 hub=function(){
  const template=document.createElement('template');template.innerHTML=originalHub();
  template.content.querySelectorAll('.lakeMissionStatus').forEach(x=>x.remove());
  template.content.querySelectorAll('.locationCard .cardCount').forEach(el=>{
   const found=parseInt(el.textContent,10)||0;
   el.textContent=found?'Pistas registradas no dossiê':'Local para explorar';
  });
  for(const el of [...template.content.querySelectorAll('[data-view="board"],[data-view="theory"]')]){
   const parent=el.closest('.partDivider');
   if(parent)parent.remove();else el.remove();
  }
  const list=template.content.querySelector('.cardList');
  if(list)list.insertAdjacentHTML('beforebegin',goalCard());
  else template.content.append(document.createRange().createContextualFragment(goalCard()));
  return template.innerHTML;
 };
 dossier=function(){
  const C=CASES[s.caseId],clues=C?.clues||{};
  return '<section class="section missionEvidence"><button class="backBtn" data-view="hub">← Voltar aos locais</button><div class="eyebrow">ARQUIVO '+esc2(C?.number||'')+' · EVIDÊNCIAS</div><h2>Pistas coletadas</h2>'+
   '<p>Este registro guarda apenas os indícios que você encontrou. Faça suas interpretações livremente no diário.</p>'+
   '<div class="notice">'+s.evidence.length+' de '+Object.keys(clues).length+' pistas coletadas.</div>'+
   Object.entries(C.scenes||{}).map(([place,loc])=>{
    const collected=(loc.items||[]).filter(id=>s.evidence.includes(id));
    return '<section class="missionEvidenceGroup"><div class="eyebrow">'+esc2(loc.name)+'</div>'+
     (collected.length?collected.map(id=>'<button class="evidenceItem" type="button" data-clue="'+esc2(id)+'"><div class="evidenceIndex">⌕</div><div class="evidenceText"><strong>'+esc2(clues[id]?.name||id)+'</strong><em>Rever prova →</em></div></button>').join(''):'<p class="muted">Nenhuma pista coletada neste local.</p>')+
     '</section>';
   }).join('')+
   '<button type="button" class="btn" data-deep-journal-open="1">✎ Abrir diário e anotar livremente</button>'+
   '<button type="button" class="btn outline" data-view="hub">Continuar investigação →</button></section>';
 };
 researchBoard=function(){return dossier();};
 function matchName(guess){
  const expected=clean(CASES[s.caseId]?.creature);
  const received=clean(guess);
  const variants=[expected,...(ALIASES[s.caseId]||[]).map(clean)];
  return received.length>=4&&variants.some(x=>received===x);
 }
 theories=function(){
  const r=rule(),need=Math.max(0,requiredClues()-s.evidence.length);
  const result=s.reportSubmitted?'Sua identificação foi encaminhada aos integrantes da expedição. A confirmação depende das respostas do grupo.':'';
  return '<section class="section missionIdentification"><button class="backBtn" data-view="hub">← Voltar aos locais</button>'+
   '<div class="eyebrow">RELATÓRIO DE CAMPO · ARQUIVO '+esc2(CASES[s.caseId].number)+'</div><h2>Objetivo da missão</h2>'+
   '<div class="missionGoalBlock"><strong>Identificar a criatura</strong><p>Consulte suas pistas, o Bestiário e as anotações. Informe o nome da entidade que acredita ter encontrado.</p></div>'+
   '<div class="missionGoalBlock"><strong>'+esc2(r.title)+'</strong><p>'+esc2(r.description)+'</p><small>'+esc2(objectiveText())+'</small></div>'+
   '<p>'+s.evidence.length+' de '+requiredClues()+' pistas mínimas para encaminhar a identificação.'+(need?' Investigue mais '+need+' antes de finalizar.':'')+'</p>'+
   '<form data-mission-identify class="missionIdentityForm"><label for="missionCreatureName">Qual criatura está envolvida?</label>'+
   '<input id="missionCreatureName" name="creature" required minlength="4" maxlength="90" autocomplete="off" spellcheck="false" placeholder="Escreva o nome da criatura" value="'+esc2(s.identificationDraft||'')+'"/>'+
   '<button type="submit" '+(!canReport()||s.reportSubmitted?'disabled':'')+'>'+ (s.reportSubmitted?'Identificação enviada à equipe':'Registrar identificação') +'</button></form>'+
   (result?'<div class="notice">'+esc2(result)+'</div>':'')+
   (!hasGoal()?'<p class="missionGoalPending">O objetivo adicional ainda não foi cumprido. Continue investigando o caso.</p>':'')+
   '<button class="btn outline" type="button" data-view="dossier">Revisar pistas coletadas</button>'+
   '<button class="btn ghost" type="button" data-deep-journal-open="1">✎ Consultar diário</button></section>';
 };
 confrontation=function(){
  const html=originalConfrontation();
  const template=document.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('.secretRevelation').forEach(x=>{if(/quadro de provas|prova cruzada|dedu[cç][aã]o/i.test(x.textContent||''))x.remove();});
  template.content.querySelectorAll('p').forEach(x=>{
   if(/Sua teoria estava correta/i.test(x.textContent||''))x.textContent='Sua identificação foi confirmada. As provas reunidas podem permitir soluções diferentes para este caso.';
   else if(/Você escolheu uma hipótese incorreta/i.test(x.textContent||''))x.textContent='A identificação não foi confirmada. Reavalie as evidências antes de concluir outra investigação.';
  });
  return template.innerHTML.replaceAll('Você desvendou o mistério.','Identificação confirmada').replaceAll('Sua teoria','Sua identificação');
 };
 ending=function(){
  const template=document.createElement('template');template.innerHTML=originalEnding();
  template.content.querySelectorAll('.secretRevelation').forEach(x=>{if(/quadro de provas|dedu[cç][aã]o|prova cruzada/i.test(x.textContent||''))x.remove();});
  return template.innerHTML;
 };
 collection=function(){
  const template=document.createElement('template');template.innerHTML=originalCollection();
  template.content.querySelectorAll('.levelHeading p').forEach(x=>{
   x.textContent='Investigações com pistas, diário livre, identificação e consequências próprias.';
  });
  return template.innerHTML;
 };
 // Todas as telas antigas de quadro são encaminhadas às pistas, inclusive
 // arquivos salvos anteriormente na mesma missão.
 render=function(){
  if(s.view==='board')s.view='dossier';
  originalRender();
  app.querySelectorAll('[data-view="board"],[data-board-check],[data-action="board-check"]').forEach(x=>x.remove());
  app.querySelectorAll('.lakeNotebook,.lakeDeduction,.researchBoard').forEach(x=>x.remove());
 };
 app.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-view="board"]');if(!el)return;
  ev.preventDefault();ev.stopImmediatePropagation();move('dossier');
 },true);
 document.addEventListener('input',ev=>{
  if(s.view==='theory'&&ev.target.id==='missionCreatureName')s.identificationDraft=ev.target.value;
 },true);
 document.addEventListener('submit',ev=>{
  if(!ev.target.matches('[data-mission-identify]'))return;
  ev.preventDefault();ev.stopImmediatePropagation();
  if(s.outcome||s.reportSubmitted)return;
  if(net.inGame&&net.paused)return toast('A equipe precisa se reconectar para continuar.');
  if(!canReport())return toast('Reúna as provas mínimas e conclua o objetivo do caso antes de identificar a criatura.');
  if(net.mode==='coop'&&net.inGame&&!specialistCanDo())return toast('A equipe ainda precisa registrar os pareceres de especialidade.');
  const value=String(new FormData(ev.target).get('creature')||'').trim().slice(0,90);
  if(!matchName(value)){
   s.identificationDraft=value;
   persist(false);
   return toast('Identificação não confirmada. Compare as pistas e consulte o Bestiário.');
  }
  s.identificationDraft=value;s.reportSubmitted=!!(net.inGame&&net.mode==='coop');
  s.selectedTheory=CASES[s.caseId].correct;
  persist(false);
  voteTheory(); // Mecanismo persistente de equipe; não apresenta hipóteses prontas.
  if(s.reportSubmitted&&s.view==='theory')render();
 },true);
 const css=document.createElement('style');
 css.textContent='.missionGoalCard,.missionGoalBlock{background:linear-gradient(145deg,#182e37,#10232c);border:1px solid #baa07888;border-radius:13px;padding:16px;margin:16px 0;color:#e9dbc4}.missionGoalCard h3{font:normal 26px Georgia,serif;color:#f1d7a9;margin:8px 0}.missionGoalCard p,.missionGoalBlock p{font:13px/1.7 system-ui;color:#d0d5d2}.missionGoalDivider{height:1px;background:#9b89647a;margin:14px 0}.missionGoalCard strong,.missionGoalBlock strong{color:#f3d6a4;display:block;font-size:14px}.missionGoalCard small,.missionGoalBlock small{display:block;color:#bdc8c4;font:12px system-ui;margin:12px 0}.missionGoalCard .btn{display:block;width:100%;margin:13px 0 0}.missionEvidenceGroup{border-top:1px solid #a5906b55;padding:17px 0}.missionEvidenceGroup .muted{color:#9baca8;font-size:12px}.missionIdentification{padding-bottom:55px}.missionIdentityForm{display:grid;gap:11px;margin:17px 0}.missionIdentityForm label{font:700 13px system-ui;color:#e9d4ad}.missionIdentityForm input{min-width:0;width:100%;box-sizing:border-box;padding:15px;border-radius:9px;border:1px solid #a8936f;background:#18333d;color:#f6e9d4;font:15px system-ui}.missionIdentityForm button{border-radius:9px;border:1px solid #d9bf91;background:#d4b987;color:#142b34;font:700 14px system-ui;padding:14px}.missionIdentityForm button:disabled{opacity:.45}.missionGoalPending{font:12px/1.6 system-ui;color:#d7c7a7}.missionIdentification>.btn,.missionEvidence>.btn{display:block;width:100%;margin:10px 0}';
 css.textContent += '.bottomNav.manualBottomHome{grid-template-columns:repeat(7,minmax(0,1fr))!important}.bottomNav.manualBottomHome .navButton{font-size:clamp(7px,2.25vw,9px);padding:3px 0;gap:2px;letter-spacing:-.01em;line-height:1.25;overflow-wrap:anywhere}.bottomNav.manualBottomHome .navGlyph{font-size:19px;line-height:21px}@media(max-width:355px){.bottomNav.manualBottomHome .navButton{font-size:7.5px}.bottomNav.manualBottomHome .navGlyph{font-size:17px}}';
 document.head.append(css);
 render();
})();