'use strict';
(function install(){
 if(!CASES?.lago||!window.manualFirstCasePrepared)return;
 const C=CASES.lago;
 const first=()=>s.caseId==='lago';
 const has=(id)=>s.evidence.includes(id);
 const passageLocated=()=>has('v2_a_3')&&has('v2_b_3');
 const text=x=>esc(String(x??''));
 const previousHub=hub,previousScene=scene,previousTheories=theories,previousWitness=witness,previousBrief=brief;
 hub=function(){
  if(!first())return previousHub();
  const template=document.createElement('template');
  template.innerHTML=previousHub();
  const gate=template.content.querySelector('[data-scene="v2_e"]');
  if(gate&&!passageLocated()){
   gate.disabled=true;gate.classList.add('v2RoleLocked');
   const name=gate.querySelector('.cardTitle'),sub=gate.querySelector('.cardSubtitle'),status=gate.querySelector('.cardCount');
   if(name)name.textContent='Passagem não localizada';
   if(sub)sub.textContent='Existe uma entrada ausente do mapa atual.';
   if(status)status.textContent='Compare os registros da central e da galeria';
  }
  const label=template.content.querySelector('.v2CaseType');
  if(label)label.textContent=(net.inGame&&net.mode==='coop'?'EXPEDIÇÃO COOPERATIVA':'INVESTIGAÇÃO SOLO')+' · OITO LOCAIS · SEIS TESTEMUNHAS';
  return template.innerHTML;
 };
 scene=function(){
  if(first()&&s.activeScene==='v2_e'&&!passageLocated())
   return '<section class="section"><button class="backBtn" data-view="hub">← Voltar</button><h2>Passagem não localizada</h2><p>Um desenho da central e uma advertência na galeria precisam ser comparados para encontrar o acesso.</p></section>';
  return previousScene();
 };
 brief=function(){
  const html=previousBrief();
  if(!first())return html;
  // A apresentação não repete a ocorrência nem antecipa o desfecho.
  return html.replace(
   'Explore 8 locais e ouça 6 testemunhas. Compare provas, anote livremente e identifique a criatura. Em equipe, algumas áreas e entrevistas exigem especialidades diferentes.',
   'O mapa reúne os locais e depoimentos disponíveis. Registre no diário o que considerar importante.'
  );
 };
 witness=function(){
  if(!first())return previousWitness();
  const q=C.witness.questions;
  q.v2_w3_2.q=has('v2_c_2')?'Encontrei uma ordem de serviço assinada pelo senhor. O que significa?':'Como a empresa verificou o funcionamento das bombas?';
  q.v2_w3_2.answer=has('v2_c_2')?'É uma ordem de manutenção. Eu autorizei a abertura do relé para a vistoria, mas não ordenei que chamassem o plantão depois disso.':'A supervisão recebeu um alerta e pediu que verificassem os equipamentos. Os operadores devem ter os registros.';
  q.v2_w4_3.answer=has('v2_e_1')?'Lembro de nomes escritos na pedra. Vi os nomes dos meus colegas, mas não entendi o que aquilo significava. Depois ouvi um som metálico. Não sei que horas eram.':'Houve uma batida de metal e fiquei desorientado. Não sei que horas eram nem como saí.';
  q.v2_w5_3.answer=has('v2_c_3')?'A carta descreve o que vi: retiraram os bilhetes e ligaram o sino a um tubo durante a obra. Não sei por que fizeram isso.':'Fecharam a escada e instalaram tubulações. Vi gente trabalhando perto do sino.';
  return previousWitness();
 };
 theories=function(){
  if(!first())return previousTheories();
  const source=previousTheories();
  const ready=['v2_b_2','v2_a_2','sino'].every(has);
  const chronology='<section class="lagoChronology"><div class="eyebrow">LINHA DO TEMPO</div>'+
   '<h3>Reconstituir os acontecimentos</h3>'+
   (s.puzzleSolved?
    '<div class="notice"><b>✓ Horários conferidos.</b> A convocação ocorreu antes da abertura do relé. O áudio da extensão C-0 e o som metálico foram registrados mais tarde. Compare as possíveis causas no diário.</div>':
    ready?
    '<p>Você encontrou registros com horários e examinou o sino. Consulte os documentos para identificar quando cada evento foi registrado.</p>'+
    '<form data-lago-chronology>'+
    '<label>Registro de intervenção no relé <input name="relay" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<label>Registro da transmissão <input name="call" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<label>Som metálico captado pelo microfone <input name="bell" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<button type="submit">Conferir os horários</button></form>':
    '<p>Procure documentos com horários verificáveis. Quando houver fontes suficientes, será possível organizar uma cronologia.</p>')+
   '</section>';
  return source.replace('<form data-mission-identify',chronology+'<form data-mission-identify');
 };
 app.addEventListener('click',event=>{
  const node=event.target.closest('[data-scene="v2_e"]');
  if(!first()||!node||passageLocated())return;
  event.preventDefault();event.stopImmediatePropagation();
  toast('A passagem exige informações do mapa e da galeria de bombas.');
 },true);
 const normalizeTime=raw=>{
  const v=String(raw||'').replace(/\D/g,'');
  if(v.length<3||v.length>4)return '';
  const h=v.padStart(4,'0');
  return h.slice(0,2)+':'+h.slice(2);
 };
 document.addEventListener('submit',event=>{
  if(!first()||!event.target.matches('[data-lago-chronology]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(net.inGame&&net.paused)return toast('Aguarde a reconexão da equipe.');
  if(!['v2_b_2','v2_a_2','sino'].every(has))return toast('Ainda faltam os três registros da madrugada.');
  if(s.puzzleSolved)return;
  const f=new FormData(event.target);
  const result=[normalizeTime(f.get('relay')),normalizeTime(f.get('call')),normalizeTime(f.get('bell'))];
  if(result.join('|')!=='23:52|00:17|00:19')return toast('Os horários não coincidem com os registros. Releia o histórico da central e a bobina da bomba.');
  s.puzzleSolved=true;persist();render();
  toast('Horários conferidos. Compare as fontes e registre suas conclusões no diário.');
 },true);
 const css=document.createElement('style');
 css.textContent='.lagoBriefBox,.lagoChronology{border:1px solid #bba0788f;border-radius:12px;background:#152f38;color:#e5dccb;padding:18px;margin:19px 0}.lagoBriefBox p{font:13px/1.7 system-ui;color:#cdd5d0}.lagoChronology h3{font:normal 26px Georgia,serif;margin:9px 0 14px;color:#efd3a1}.lagoChronology p{font:13px/1.7 system-ui;color:#c9d1ce}.lagoChronology form{display:grid;gap:13px;margin:12px 0}.lagoChronology label{display:grid;gap:8px;font:700 12px/1.5 system-ui;color:#ead3ad}.lagoChronology input{box-sizing:border-box;width:100%;padding:13px 16px;font:17px monospace;color:#f4e7ce;background:#203f49;border:1px solid #a89d7e;border-radius:9px}.lagoChronology button{background:#d3b685;color:#122a32;border:0;border-radius:8px;font:700 13px system-ui;padding:13px}.lagoChronology button:disabled{opacity:.48}';
 document.head.append(css);
 render();
})();
