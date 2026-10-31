'use strict';
/* Arquivo 001: depoimentos contextuais.
   As perguntas existem por causa de informações descobertas, não por antecipação do roteiro. */
(function(){
 if(typeof CASES==='undefined'||!CASES.lago||typeof witness!=='function')return;
 const C=CASES.lago;
 const company='Companhia de Energia e Águas de Salgueiro (CEAS)';
 C.place='Vila de Salgueiro · Barragem da CEAS';
 C.v2Lead='A '+company+' opera a barragem que abastece Vila de Salgueiro. Na madrugada de 31 de outubro, quatro técnicos foram chamados para verificar um problema nas bombas. Dário Sanches voltou sozinho. Marina Vilar, Paulo Lemos e Elisa Soares continuam desaparecidos.';
 C.brief=C.v2Lead;
 C.intro='Três técnicos não voltaram de uma inspeção na barragem da CEAS. O Instituto foi chamado para investigar.';
 C.v2Report='Descubra o que aconteceu durante a inspeção e procure os três desaparecidos.';
 C.v2Goal={...C.v2Goal,title:'Investigar o desaparecimento na barragem',description:'Reúna relatos e documentos para reconstruir os acontecimentos. Compare as fontes antes de identificar a criatura.',puzzleLabel:'Cronologia'};
 C.quote='“No rádio de serviço ouvi uma voz chamando nossos nomes. Ninguém respondeu quando perguntei quem falava.” — Dário Sanches';
 C.danger='Risco ainda não avaliado';
 C.victims='Três desaparecidos; Dário retornou';
 C.type='OCORRÊNCIA EM INVESTIGAÇÃO';
 const set=(id,q,a)=>{if(C.witness.questions[id])Object.assign(C.witness.questions[id],{q,answer:a})};
 C.witness.role='Filha de Marina Vilar, técnica desaparecida';
 C.witness.intro='Iria mora na vila. Sua mãe, Marina Vilar, trabalha na barragem. Iria não acompanhou a inspeção.';
 set('lembranca','Quando você falou com sua mãe pela última vez?','Ela me mandou uma mensagem às 23h40: “Vou ver um problema na bomba”. Não disse quem a chamou.');
 set('barqueiro','Alguém da sua família já trabalhou nessa barragem?','Meu avô foi barqueiro e ajudou na construção. Guardava papéis antigos em casa. Nunca explicou por quê.');
 set('promessa','Você reconhece esta fita encontrada junto ao cais?','Minha mãe usava uma parecida no pulso. O nó lembra o dela, mas não posso garantir que seja a mesma fita.');

 const w=C.v2Witnesses;
 w.v2_w1.job='Operador do centro de controle';
 w.v2_w1.intro='Otávio monitora as bombas para a CEAS. Trabalhou no centro de controle naquela madrugada.';
 set('v2_w1_1','O que aconteceu no seu turno?','Recebemos um aviso sobre a bomba 4. Quando consultei o painel, o relé estava aberto.');
 set('v2_w1_2','O que significa o relé estar aberto?','A bomba foi desligada pelo circuito de comando. Eu não sei quem acionou o painel. A chave reserva fica com a direção.');
 set('v2_w1_3','Houve alguma comunicação fora do normal?','Mais tarde o sistema registrou chamadas numa linha telefônica antiga, identificada como C-0. Ela consta como desativada desde 1989.');

 w.v2_w2.job='Enfermeira do posto de saúde da barragem';
 w.v2_w2.intro='Celina trabalha no posto de saúde mantido pela CEAS. Ela atendeu Dário na madrugada do desaparecimento.';
 set('v2_w2_1','Em que condições Dário chegou ao posto?','O vigia o trouxe às 02h10. Ele estava molhado, tremia de frio e não tinha ferimentos graves.');
 set('v2_w2_2','Ele conseguiu contar o que havia acontecido?','Só dizia os nomes de Marina, Paulo e Elisa. Não explicou como tinha se separado deles.');
 set('v2_w2_3','Você observou mais alguma coisa naquela noite?','Enquanto preenchia o prontuário, ouvi uma batida metálica parecida com um sino. Pode ter vindo da rua. Não fui verificar.');

 w.v2_w3.job='Diretor da Companhia de Energia e Águas';
 w.v2_w3.intro='Augusto Ferraz dirige a operação local da CEAS e autorizou a inspeção daquela madrugada.';
 set('v2_w3_1','Por que os quatro técnicos foram convocados?','A supervisão recebeu um alerta de manutenção. Pedi que a equipe verificasse as bombas. Não sei como eles desapareceram.');
 set('v2_w3_2','Como a empresa verificou o problema nas bombas?','O procedimento foi registrado pelos operadores. Peça o relatório à supervisão.');
 set('v2_w3_3','Por que os mapas da companhia mostram acessos diferentes?','A planta mais recente omite áreas desativadas. A equipe de manutenção deve saber quais continuam acessíveis.');

 w.v2_w4.job='Técnico de manutenção e sobrevivente';
 w.v2_w4.intro='Dário era o quarto técnico convocado. Foi encontrado na margem sul e perdeu parte da memória daquela noite.';
 set('v2_w4_1','O que você lembra da inspeção?','Entramos pela galeria das bombas. Depois seguimos por um corredor estreito. Minhas lembranças ficam confusas a partir daí.');
 set('v2_w4_2','Você ouviu ou viu alguma coisa naquele corredor?','Ouvi alguém chamar nossos nomes. Achei que vinha do rádio, mas não vi ninguém falando.');
 set('v2_w4_3','Você lembra de como conseguiu sair?','Ouvi um som metálico muito forte. Depois não lembro de nada até chegar ao posto de saúde.');

 w.v2_w5.job='Ex-zeladora da Capela do Sino';
 w.v2_w5.intro='Moira cuidou da capela por muitos anos, inclusive na época da construção da barragem.';
 set('v2_w5_1','O que havia na capela quando a senhora trabalhava lá?','Havia um sino e uma pequena escada de serviço. Meu pai guardava as chaves do prédio.');
 set('v2_w5_2','Para onde levava a escada?','Até uma nascente que existia antes da barragem. As famílias iam lá deixar bilhetes.');
 set('v2_w5_3','O que mudou durante a obra da barragem?','A companhia fechou a passagem e instalou tubos de metal. Meu pai reclamou, mas não recebeu explicação.');

 // Provas continuam precisas; só são conhecidas depois de investigadas.
 C.scenes.v2_a.intro='O centro de controle supervisiona as bombas da barragem. Há escalas, monitores e registros da madrugada.';
 C.scenes.v2_b.intro='A galeria dá acesso à bomba 4. Há um painel de comando e marcas no piso molhado.';
 C.scenes.v2_c.intro='O arquivo da CEAS guarda plantas, autorizações e ordens de serviço de diferentes anos.';
 C.scenes.v2_d.intro='O posto de saúde recebeu um dos técnicos. Alguns materiais do atendimento continuam guardados.';
 C.scenes.v2_e.intro='A câmara subterrânea contém uma nascente, tubulações antigas e marcas nas pedras.';
 C.scenes.lago.intro='O cais da barragem está vazio. Há objetos esquecidos perto da madeira molhada.';
 C.scenes.casa.intro='A casa do antigo barqueiro está vazia. Móveis e objetos antigos permanecem no interior.';
 C.scenes.capela.intro='A pequena capela fica próxima ao reservatório. A construção é anterior à barragem.';

 // O aparelho só revela o conteúdo ao ser sintonizado. A frequência não
 // é indicada de antemão na ficha do objeto.
 C.clues.radio.detail='Em meio ao chiado, uma transmissão repete nomes de trabalhadores e termina com uma pancada metálica. O aparelho não informa a data nem a origem do sinal.';
 C.clues.radio.insight='Compare a transmissão com outras fontes antes de atribuir uma causa.';
 // Diálogos de confronto atualizados quando provas são encontradas.
 const priorWitness=witness;
 const seen=id=>s.evidence.includes(id);
 const asked=id=>s.witness.includes(id);
 const gate={
  lembranca:()=>true,
  barqueiro:()=>asked('lembranca'),
  promessa:()=>seen('fita'),
  v2_w1_1:()=>true,
  v2_w1_2:()=>asked('v2_w1_1')||seen('v2_b_2'),
  v2_w1_3:()=>asked('v2_w1_2')||seen('v2_a_2'),
  v2_w2_1:()=>true,
  v2_w2_2:()=>asked('v2_w2_1'),
  v2_w2_3:()=>asked('v2_w2_2'),
  v2_w3_1:()=>true,
  v2_w3_2:()=>asked('v2_w3_1')||seen('v2_b_2'),
  v2_w3_3:()=>seen('v2_a_3')||seen('v2_c_1'),
  v2_w4_1:()=>true,
  v2_w4_2:()=>asked('v2_w4_1')||seen('radio'),
  v2_w4_3:()=>asked('v2_w4_2'),
  v2_w5_1:()=>true,
  v2_w5_2:()=>asked('v2_w5_1'),
  v2_w5_3:()=>asked('v2_w5_2')||seen('registro')
 };
 window.manualQuestionAllowed=(id)=>s.caseId!=='lago'||!gate[id]||asked(id)||!!gate[id]();
 witness=function(){
  const html=priorWitness();
  if(s.caseId!=='lago')return html;
  const template=document.createElement('template');template.innerHTML=html;
  for(const b of template.content.querySelectorAll('[data-question]')){
   if(!window.manualQuestionAllowed(b.dataset.question))b.remove();
  }
  // O painel da primeira versão cita eventos e suposições que ainda não
  // foram apresentados. As perguntas contextualizadas assumem seu lugar.
  template.content.querySelectorAll('.lakeConfront').forEach(x=>x.remove());
  const extra=template.content.querySelector('.v2WitnessPage .eyebrow');
  if(extra){
   const key=s.activeWitness,info=w[key];
   if(info)extra.textContent='DEPOIMENTO · '+info.job;
  }
  const instruction=template.content.querySelector('.v2WitnessPrompt');
  if(instruction)instruction.textContent='Comece pelo que a testemunha presenciou. Novas perguntas surgem quando houver motivos para fazê-las.';
  return template.innerHTML;
 };
 app.addEventListener('click',event=>{
  if(s.caseId!=='lago'||s.view!=='witness')return;
  const button=event.target.closest('[data-question]');
  if(!button||window.manualQuestionAllowed(button.dataset.question))return;
  event.preventDefault();event.stopImmediatePropagation();
  toast('Ainda não há informações para formular essa pergunta.');
 },true);
 render();
})();