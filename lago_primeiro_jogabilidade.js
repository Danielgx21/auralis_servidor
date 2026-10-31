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
  q.v2_w3_2.q=has('v2_c_2')?'Sua assinatura aparece na ordem de 22h50. Por que ordenou a parada?':'Houve alguma intervenção no relé antes da emergência?';
  q.v2_w3_2.answer=has('v2_c_2')?'Autorizei o isolamento para uma vistoria. Não mandei convocar o plantão. Os técnicos deveriam ter sido avisados.':'Recebi notícia de uma falha. A ordem de serviço está com os supervisores.';
  q.v2_w4_3.answer=has('v2_e_1')?'A laje tinha nossos quatro nomes. Ouvi o sino às 00h19. Quando encontrei a saída, os outros três nomes ainda estavam na pedra.':'Ouvi o sino, depois uma voz dizendo que meu nome ainda estava ali. Não vi como cheguei à margem.';
  q.v2_w5_3.answer=has('v2_c_3')?'Meu pai guardou uma cópia da carta. Foi a companhia que mandou retirar os nomes e ligar o sino ao tubo.':'Cobriram a água e ligaram o sino ao encanamento. Meu pai não gostou disso.';
  return previousWitness();
 };
 theories=function(){
  if(!first())return previousTheories();
  const source=previousTheories();
  const ready=['v2_b_2','v2_a_2','sino'].every(has);
  const chronology='<section class="lagoChronology"><div class="eyebrow">RECONSTRUÇÃO DA MADRUGADA</div><h3>Quando ocorreram os três acontecimentos?</h3>'+
   '<p>Use a bobina do relé, o log de chamadas e o registro do sino. Preencha os horários que aparecem nas fontes, não estimativas.</p>'+
   (s.puzzleSolved?
    '<div class="notice"><b>✓ Cronologia confirmada.</b> O relé foi aberto antes do chamado da linha desativada. O sino tocou depois. Esses fatos não precisam ter a mesma causa.</div>':
    '<form data-lago-chronology>'+
    '<label>Desligamento manual do relé <input name="relay" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<label>Chamadas da linha C-0 <input name="call" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<label>Vibração do sino <input name="bell" inputmode="numeric" type="text" maxlength="5" placeholder="hh:mm" required /></label>'+
    '<button type="submit" '+(!ready?'disabled':'')+'>Conferir sequência</button></form>'+
    (!ready?'<p>Reúna os três registros antes de reconstruir a madrugada.</p>':''))+
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
  if(result.join('|')!=='23:52|00:17|00:19')return toast('Os horários não coincidem. Compare novamente os três documentos.');
  s.puzzleSolved=true;persist();render();
  toast('Cronologia confirmada. A sabotagem e o chamado ocorreram em momentos diferentes.');
 },true);
 const css=document.createElement('style');
 css.textContent='.lagoBriefBox,.lagoChronology{border:1px solid #bba0788f;border-radius:12px;background:#152f38;color:#e5dccb;padding:18px;margin:19px 0}.lagoBriefBox p{font:13px/1.7 system-ui;color:#cdd5d0}.lagoChronology h3{font:normal 26px Georgia,serif;margin:9px 0 14px;color:#efd3a1}.lagoChronology p{font:13px/1.7 system-ui;color:#c9d1ce}.lagoChronology form{display:grid;gap:13px;margin:12px 0}.lagoChronology label{display:grid;gap:8px;font:700 12px/1.5 system-ui;color:#ead3ad}.lagoChronology input{box-sizing:border-box;width:100%;padding:13px 16px;font:17px monospace;color:#f4e7ce;background:#203f49;border:1px solid #a89d7e;border-radius:9px}.lagoChronology button{background:#d3b685;color:#122a32;border:0;border-radius:8px;font:700 13px system-ui;padding:13px}.lagoChronology button:disabled{opacity:.48}';
 document.head.append(css);
 render();
})();
