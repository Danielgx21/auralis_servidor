'use strict';
// Manual das Criaturas: A Voz Sob o Lago, investigação interativa v1.1.
// Preserva todas as outras histórias, o progresso salvo e o servidor multiplayer.
(function(){
const C=CASES.lago;
Object.assign(C,{
 title:'A Voz Sob o Lago',subtitle:'Duas pessoas desapareceram perto de uma represa.',
 brief:'Duas pessoas sumiram na Vila de Salgueiro. Moradores dizem ter ouvido vozes conhecidas perto da água. Investigue a margem, a casa do barqueiro e a capela para descobrir o que aconteceu.',
 quote:'Iria, filha de uma das desaparecidas: “Minha mãe foi até o lago sozinha. Quero saber por quê.”',
 intro:'Investigue os lugares, examine objetos, reúna provas e escolha uma explicação.',
 creatureText:'Uma criatura ligada às lembranças das pessoas. A investigação revela como ela ficou presa ao lago.',
 reveal:'Você reúne os registros da represa, as gravações e as marcas da capela. Uma criatura está presa a um antigo ritual com o sino.',
 revealQuote:'“O sino me obriga a repetir essas vozes. Eu não consigo parar.”'
});
C.scenes.lago.intro='Há um caixote perto do cais, juncos espalhados e uma lanterna esquecida. Mova objetos para procurar vestígios.';
C.scenes.casa.intro='A casa está vazia. Há uma cortina sobre um espelho, um rádio antigo e uma gaveta com documentos.';
C.scenes.capela.intro='Parte do sino está coberta. Um baú trancado e uma pedra suja podem guardar informações.';
const details={
 fita:['Fita azul','Um pedaço de tecido azul ficou preso nos juncos. Há um nó feito à mão.',''],
 pegadas:['Pegadas no cais','Duas linhas de pegadas chegam à beira da água. Não há sulcos de arrasto perto delas.',''],
 lanterna:['Lanterna fechada','A tampa está bem apertada, mas há gotas de água dentro do vidro.',''],
 espelho:['Marca no espelho','No vidro aparecem dedos marcados de dentro para fora. O resto da superfície está seco.',''],
 radio:['Registro do rádio','O aparelho gravou uma voz e um som metálico na mesma faixa. Os dois ruídos aparecem em sequência.',''],
 registro:['Documento da represa','O registro mostra que a obra desviou a nascente. A instalação de um sino fez parte da inauguração.',''],
 sino:['Marcas no sino','Riscos formam um símbolo repetido na parte interna do bronze. O metal foi alterado depois de instalado.',''],
 manuscrito:['Anotações antigas','As anotações mencionam uma guardiã que reconhecia nomes. Pessoas da vila organizaram um ritual para prendê-la.',''],
 inscricao:['Inscrição apagada','Sob a sujeira da pedra há um aviso antigo: “Não façam o sino tocar outra vez”.','']
};
for(const [id,values] of Object.entries(details)){
 C.clues[id].name=values[0];C.clues[id].detail=values[1];C.clues[id].insight=values[2];
}
C.witness.intro='Iria está procurando a mãe desde ontem. Ela não viu o desaparecimento, mas pode responder a perguntas sobre a família e os horários.';
C.witness.questions={
 lembranca:{q:'Você lembra de um horário importante?',answer:'Quando acordei, o relógio da cozinha tinha parado às 00h17. O rádio da casa ainda estava ligado.',trust:1},
 barqueiro:{q:'Seu avô trabalhava na represa?',answer:'Sim. Ele ajudou a instalar equipamentos na capela. Depois disso, nunca quis falar sobre a obra.',trust:0},
 promessa:{q:'Você reconhece esta fita azul?',answer:'Minha mãe usava uma fita parecida no pulso. Ela saiu de casa sem dizer aonde ia.',trust:1}
};
C.theories={
 espectro:{name:'Uma pessoa morta assombra o lago',kind:'Hipótese A',desc:'Os relatos podem ser causados por alguém que morreu na região.'},
 vampiro:{name:'Uma criatura imita vozes para atrair vítimas',kind:'Hipótese B',desc:'Alguém pode estar usando vozes conhecidas como isca.'},
 velaria:{name:'Uma criatura foi presa por um ritual',kind:'Hipótese C',desc:'O funcionamento do sino pode estar ligado à presença sobrenatural.'}
};
RESEARCH_CASES.lago={
 pair:['radio','sino'],question:'Existe uma ligação comprovada entre o rádio e o sino?',
 choices:['Os dois foram instalados no mesmo dia, sem outras relações.','A gravação registra um som metálico que pode vir da capela.','O rádio causou o desaparecimento do sino.'],
 answer:1,conclusion:'A gravação permite relacionar o som à capela, mas não explica sozinha os desaparecimentos.',
 link:'estacao',memory:'Uma gravação de outro caso menciona um som parecido.'
};
const ROOMS={
 lago:[
 {id:'reeds',label:'Juncos',icon:'🌾',x:77,y:66,kind:'move',clue:'fita',tip:'Puxe os juncos para o lado.'},
 {id:'crate',label:'Caixote',icon:'📦',x:40,y:76,kind:'move',clue:'pegadas',tip:'Arraste o caixote para desobstruir o cais.'},
 {id:'lantern',label:'Lanterna',icon:'🔦',x:21,y:48,kind:'inspect',tool:'glass',clue:'lanterna',tip:'Use a lupa sobre o vidro da lanterna.'}
 ],
 casa:[
 {id:'curtain',label:'Cortina',icon:'🟫',x:24,y:34,kind:'move',tip:'Puxe a cortina para revelar o que está atrás.'},
 {id:'mirror',label:'Espelho',icon:'🪞',x:24,y:34,kind:'inspect',tool:'glass',clue:'espelho',requires:'curtain',tip:'Examine o espelho com a lupa.'},
 {id:'drawer',label:'Gaveta',icon:'🗄️',x:69,y:76,kind:'move',clue:'registro',tip:'Puxe a gaveta para alcançar os papéis.'},
 {id:'radio',label:'Rádio',icon:'📻',x:66,y:40,kind:'tune',clue:'radio',tip:'Use o controle abaixo da imagem para sintonizar o rádio.'}
 ],
 capela:[
 {id:'cloth',label:'Pano no sino',icon:'🧣',x:50,y:29,kind:'move',tip:'Puxe o pano para revelar o sino.'},
 {id:'bell',label:'Sino',icon:'🔔',x:50,y:28,kind:'inspect',tool:'glass',clue:'sino',requires:'cloth',tip:'Use a lupa para procurar marcas no metal.'},
 {id:'stone',label:'Pedra suja',icon:'🪨',x:76,y:70,kind:'inspect',tool:'brush',clue:'inscricao',tip:'Arraste o pincel até a pedra.'},
 {id:'chest',label:'Baú',icon:'🧰',x:22,y:74,kind:'inspect',tool:'key',clue:'manuscrito',tip:'Ache uma chave em outro lugar e arraste-a até a fechadura.'}
 ]
};
const QUESTIONS=[
 {title:'Por que a primeira pessoa foi até o cais?',needs:['pegadas','fita'],witness:'promessa',
  options:['Alguém a arrastou até a água.','Ela provavelmente caminhou até lá, mas ainda não sabemos o motivo.','Ela não chegou à margem.'],answer:1},
 {title:'O que os registros têm em comum?',needs:['radio','registro','sino'],
  options:['A represa e a capela nunca tiveram ligação.','O rádio liga sozinho quando chove.','A obra envolveu o sino e o som metálico aparece na gravação.'],answer:2},
 {title:'Qual hipótese sobre o ritual é sustentada pelas provas?',needs:['manuscrito','sino','inscricao'],
  options:['Pessoas da vila prenderam uma entidade usando o sino.','A pedra foi riscada por visitantes recentes e não tem relação com o caso.','O sino foi roubado durante a obra.'],answer:0}
];
let selectedTool=null,activeDrag=null;
function ready(){return s.caseId==='lago'}
function moves(){if(!s.lagoMoved||typeof s.lagoMoved!=='object')s.lagoMoved={};return s.lagoMoved}
function deductions(){if(!s.lagoDeductions||!Array.isArray(s.lagoDeductions))s.lagoDeductions=[];return s.lagoDeductions}
function currentObjects(){return ROOMS[s.activeScene]||[]}
function found(id){return s.evidence.includes(id)}
function eligibleRole(id){
 if(net.inGame&&net.mode==='coop'&&!canInspect(id)){
   toast('Essa evidência depende de outra especialidade. Avise o colega para examiná-la.');
   return false;
 }
 return true;
}
function findClue(id){
 if(!id||found(id)){toast('Esse indício já está registrado no dossiê.');return;}
 if(net.inGame&&net.paused){toast('A equipe está pausada até todos se reconectarem.');return;}
 if(!eligibleRole(id))return;
 s.evidence.push(id);
 s.modal=id;
 persist();
 playEffect('find');
 render();
}
function movedObject(id){
 if(net.inGame&&net.paused)return toast('A equipe precisa estar conectada para investigar.');
 const item=currentObjects().find(o=>o.id===id);
 if(!item||item.kind!=='move')return;
 moves()[id]=true;
 if(id==='crate')s.lagoKey=true;
 if(item.clue)findClue(item.clue);else{persist();render();toast('Você descobriu algo que estava encoberto. Examine o local.');}
}
function toolUse(tool,id){
 if(net.inGame&&net.paused)return toast('A equipe está aguardando reconexão.');
 const item=currentObjects().find(o=>o.id===id);
 if(!item)return toast('Arraste uma ferramenta para um objeto do cenário.');
 if(item.requires&&!moves()[item.requires])return toast('Primeiro retire o objeto que está cobrindo essa parte do cenário.');
 if(item.kind==='move')return toast(item.tip);
 if(item.kind==='tune')return toast('Use o controle de frequência do rádio abaixo da imagem.');
 if(tool==='lens'&&!own('lens'))return toast('A Lente Espectral pode ser comprada na Loja.');
 if(tool==='powder'&&!charges('powder'))return toast('Você não tem Pó de Rastros. A loja vende suprimentos.');
 if(tool==='recorder'&&!own('recorder'))return toast('Você ainda não tem o Gravador de Ecos.');
 if(tool==='key'&&!s.lagoKey)return toast('Você ainda não encontrou uma chave. Examine outros lugares.');
 if(tool==='powder'&&id!=='stone')return toast('O pó não funciona aqui. Use uma ferramenta adequada.');
 if(tool==='recorder'&&id!=='radio')return toast('O gravador deve ser usado próximo a uma fonte de som.');
 if(item.kind==='inspect'){
  const accepted=tool===item.tool||tool==='lens'&&item.tool==='glass'||tool==='powder'&&item.tool==='brush';
  if(!accepted)return toast(item.tip);
  if(tool==='powder'){saved.stock.powder--;s.powderUses=(s.powderUses||0)+1;}
  if(tool==='lens')s.gearFlags.lens=true;
  findClue(item.clue);return;
 }
}
function radioTune(value){
 if(net.inGame&&net.paused)return toast('Aguardem o grupo retornar.');
 const v=Number(value);
 s.lagoRadioFreq=v;
 if(v===17){
  findClue('radio');
 }else{persist(false);render();toast('Apenas estática. Procure uma pista sobre o horário certo.');}
}
function tools(){
 const v=[
  ['glass','🔍','Lupa'],['brush','🖌️','Pincel'],
  ...(s.lagoKey?[['key','🗝️','Chave encontrada']]:[]),
  ...(own('lens')?[['lens','◉','Lente espectral']]:[]),
  ...(charges('powder')?[['powder','✴','Pó ('+charges('powder')+')']]:[])
 ];
 return v.map(([id,ico,label])=>'<button class="lakeTool '+(selectedTool===id?'lakeToolSelected':'')+'" type="button" data-lake-tool="'+id+'" aria-label="'+esc(label)+'"><span>'+ico+'</span><small>'+esc(label)+'</small></button>').join('');
}
function objectMarkup(o){
 const revealed=o.requires&&moves()[o.requires];
 if(o.requires&&!revealed)return '';
 if(o.kind==='move'&&moves()[o.id])return '';
 const done=o.clue&&found(o.clue);
 return '<button type="button" class="lakeObject '+(done?'lakeObjectDone':'')+'" data-lake-object="'+o.id+'" style="left:'+o.x+'%;top:'+o.y+'%;" aria-label="'+esc(o.label)+'" title="'+esc(o.tip)+'"><span class="lakeObjectIcon">'+o.icon+'</span><small>'+esc(o.label)+'</small></button>';
}
const originalScene=scene;
scene=function(){
 if(!ready())return originalScene();
 const loc=C.scenes[s.activeScene],items=currentObjects();
 const moved=items.filter(o=>o.kind==='move'&&moves()[o.id]).map(o=>o.label);
 const discovered=loc.items.filter(found);
 return '<section class="lakeScenePage"><button class="backBtn" data-view="hub">← Voltar ao mapa</button>'+
 '<div class="eyebrow">INVESTIGAÇÃO PRÁTICA · '+esc(loc.name)+'</div>'+
 '<h2>'+esc(loc.name)+'</h2><p>'+esc(loc.intro)+'</p>'+
 '<div class="lakeSceneHelp">Arraste os objetos. Arraste uma ferramenta até o que deseja examinar. No celular, toque em uma ferramenta e depois no objeto se preferir.</div>'+
 '<div class="lakeBoard" data-lake-board="1" style="background-image:linear-gradient(#06151c26,#05151f55),url('+loc.image+')">'+items.map(objectMarkup).join('')+'</div>'+
 '<div class="lakeToolbar"><div class="lakeToolbarLabel">Bolsa de ferramentas</div><div class="lakeTools">'+tools()+'</div></div>'+
 (s.activeScene==='casa'?'<div class="lakeTuner"><label for="lakeFrequency">Sintonizar rádio — frequência no mostrador: <strong>'+String(s.lagoRadioFreq??'--').padStart(2,'0')+'</strong></label><input id="lakeFrequency" type="range" min="0" max="30" step="1" value="'+Number(s.lagoRadioFreq||0)+'" '+(found('radio')?'disabled':'')+'/><div class="lakeTunerLabels"><span>00</span><span>15</span><span>30</span></div><p>O rádio tem interferência. Encontre o horário importante nos depoimentos e ajuste o mostrador.</p></div>':'')+
 (moved.length?'<p class="lakeMoved">Objetos retirados: '+moved.map(esc).join(', ')+'.</p>':'')+
 '<p class="lakeProgress">Pistas deste local: <strong>'+discovered.length+'/'+loc.items.length+'</strong></p>'+
 '<div class="lakeSceneFoot"><button class="btn outline" data-view="dossier">Ver dossiê ('+s.evidence.length+'/9)</button><button class="btn" data-view="hub">Outros locais →</button></div></section>';
};
const originalWitness=witness;
witness=function(){
 if(!ready())return originalWitness();
 const q=C.witness.questions;
 return '<section class="section lakeWitness"><button class="backBtn" data-view="hub">← Voltar ao mapa</button><div class="eyebrow">DEPOIMENTO · IRIA VILAR</div><h2>Converse com Iria</h2><img src="'+C.witness.image+'" alt="Retrato de Iria" class="lakeWitnessPortrait"/><p>'+esc(C.witness.intro)+'</p>'+
 Object.entries(q).map(([id,item])=>{
  const blocked=id==='barqueiro'&&!found('registro')||id==='promessa'&&!found('fita');
  const hint=id==='barqueiro'?'Encontre primeiro um registro sobre a represa.':'Encontre primeiro algo que possa pertencer à mãe dela.';
  return '<button class="option" data-question="'+id+'" '+(blocked?'disabled':'')+'><span>'+esc(item.q)+(s.witness.includes(id)?' ✓':'')+'</span></button>'+
 (blocked?'<small class="lakeQuestionHint">'+hint+'</small>':'')+
 (s.reply===id?'<div class="lakeAnswer">'+esc(item.answer)+'</div>':'');
 }).join('')+
 '<div class="notice">Observe: Iria pode confirmar fatos, mas não sabe o que realmente aconteceu. Você precisará comparar o depoimento com os objetos encontrados.</div>'+
 '<button class="btn" data-view="hub">Continuar procurando pistas →</button></section>';
};

/* Camada de perguntas investigativas — contradições persistem na missão */
const investigatorTopics=[
 {id:'horario',needs:['radio'],title:'A gravação e o relógio',q:'Você disse que o relógio parou às 00h17. O rádio registrou um som metálico nesse horário. A senhora ouviu o sino?',answer:'Iria hesita. “Eu ouvi o som antes de olhar o relógio. Não tenho certeza de onde veio. Só me lembro de sentir muito frio.”',observation:'Iria ouviu um som antes de consultar o relógio. A sequência dos eventos é incerta.'},
 {id:'fita',needs:['fita'],title:'A fita junto aos juncos',q:'Encontrei uma fita azul amarrada perto do cais. Você sabe de quem é?',answer:'Iria toca o próprio pulso. “Era da minha mãe. Ela dizia que aquele nó a ajudava a recordar uma promessa.”',observation:'A fita pertence à mãe de Iria e estava amarrada. Isso não determina o motivo de sua ida ao cais.'},
 {id:'obra',needs:['registro'],title:'O que o barqueiro omitiu',q:'O registro da represa menciona um sino instalado durante a obra. Por que o barqueiro evitava esse assunto?',answer:'“Ele trabalhava lá, mas se recusava a se aproximar da capela. Minha mãe dizia que ele estava tentando reparar um erro.”',observation:'O avô evitava a capela e pode ter conhecido uma falha antiga do ritual.'},
 {id:'pacto',needs:['manuscrito','inscricao'],title:'O ritual interrompido',q:'O manuscrito fala de uma guardiã aprisionada. A pedra pede que o sino não seja tocado. Quem mandou ocultar o aviso?',answer:'Iria abaixa os olhos. “Minha mãe tentou fazer as pessoas ouvirem a história. Ninguém queria acreditar. Não sei quem apagou a inscrição.”',observation:'Não há testemunho confiável sobre quem apagou a inscrição. A ausência de resposta não confirma a culpa de Iria.'}
];
const witnessPrior=witness;
witness=function(){
 const original=witnessPrior();if(s.caseId!=='lago')return original;
 if(!s.lagoInterview)s.lagoInterview={};
 const available=investigatorTopics.filter(t=>t.needs.every(e=>s.evidence.includes(e)));
 const questions='<section class="lakeConfront"><div class="eyebrow">ENTREVISTA INVESTIGATIVA</div><h3>Confrontar o depoimento com as provas</h3><p>Formule perguntas com base no que encontrou. Nem todas as respostas são completas ou confiáveis.</p>'+investigatorTopics.map(t=>{
 const ready=t.needs.every(e=>s.evidence.includes(e));
 return '<article><strong>'+esc(t.title)+'</strong><p>'+esc(t.q)+'</p><button data-lake-interview="'+t.id+'" '+(!ready||s.lagoInterview[t.id]?'disabled':'')+'>'+(s.lagoInterview[t.id]?'✓ Pergunta registrada':ready?'Apresentar evidência':'Reúna '+t.needs.length+' evidência(s)')+'</button>'+(s.lagoInterview[t.id]?'<blockquote>'+esc(t.answer)+'</blockquote>':'')+'</article>';
 }).join('')+'</section>';
 return original.replace('<button class="btn" data-view="hub">Continuar procurando pistas →</button>',questions+'<button class="btn" data-view="hub">Continuar procurando pistas →</button>');
};
app.addEventListener('click',event=>{
 if(s.caseId!=='lago'||s.view!=='witness')return;
 const btn=event.target.closest('[data-lake-interview]');if(!btn)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(net.inGame&&net.paused)return toast('Entrevista pausada até a equipe reconectar.');
 const t=investigatorTopics.find(a=>a.id===btn.dataset.lakeInterview);
 if(!t||t.needs.some(id=>!s.evidence.includes(id)))return;
 s.lagoInterview=s.lagoInterview||{};
 if(s.lagoInterview[t.id])return;
 s.lagoInterview[t.id]=true;
 // A entrevista não deve criar nenhuma pista ou interpretação no diário.
 persist();
 render();
 toast('Iria respondeu. Você decide se vale anotar algo.');
},true);
const interviewCSS=document.createElement('style');
interviewCSS.textContent='.lakeConfront{margin:23px 0;padding:17px;background:#112731;border:1px solid #c1a47966;border-radius:13px}.lakeConfront h3{font:normal 23px Georgia,serif;margin:10px 0}.lakeConfront>p{font-size:12px;color:#c6d1cf;line-height:1.6}.lakeConfront article{padding:13px 0;border-top:1px solid #8d9e9340}.lakeConfront article>strong{color:#e7cb9b;font-size:13px}.lakeConfront article>p{font-size:12px;color:#dee0da;line-height:1.6}.lakeConfront button{padding:10px 15px;border:1px solid #c4a27380;color:#f5e4c5;background:#2b4650;border-radius:8px}.lakeConfront button:disabled{opacity:.5}.lakeConfront blockquote{margin:11px 0;background:#1e373e;border-left:3px solid #d1b67e;padding:11px;font-size:12px;line-height:1.6}';
document.head.appendChild(interviewCSS);

const originalHub=hub;
hub=function(){
 if(!ready())return originalHub();
 const html=originalHub();
 const message='<div class="lakeMissionStatus"><strong>Como investigar:</strong> mova os objetos nos cenários, use as ferramentas sobre os pontos de interesse e confirme hipóteses no quadro de dedução. <strong>'+s.evidence.length+'/9 pistas</strong> encontradas. <strong>'+deductions().length+'/3 deduções</strong> concluídas.</div>';
 return html.replace('<div class="cardList">',message+'<div class="cardList">')
   .replace('Analisar hipóteses →','Organizar minha conclusão →');
};
const originalDossier=dossier;
dossier=function(){
 if(!ready())return originalDossier();
 const html=originalDossier();
 return html.replace('<h2>Evidências</h2>','<h2>Evidências reunidas</h2>')
 .replace('<p>Compare as pistas e tente distinguir coincidências de consequências.</p>','<p>Este caderno registra fatos encontrados. Nenhuma explicação é automática: você decide o que as provas indicam.</p>');
};
const originalBoard=researchBoard;
researchBoard=function(){
 if(!ready())return originalBoard();
 const solved=deductions();
 return '<section class="section lakeDeduction"><button class="backBtn" data-view="hub">← Voltar aos locais</button><div class="eyebrow">QUADRO DE DEDUÇÃO · LAGO</div><h2>O que as provas demonstram?</h2><p>Não basta encontrar objetos: compare os fatos e escolha uma explicação. Respostas erradas não apagam suas pistas.</p><div class="lakeDeductionScore">'+solved.length+' de 3 deduções comprovadas</div>'+
 QUESTIONS.map((q,index)=>{
  const missing=q.needs.filter(id=>!found(id));
  const needsWitness=q.witness&&!s.witness.includes(q.witness);
  const locked=missing.length>0||needsWitness;
  return '<article class="lakeDeductionCard"><div class="eyebrow">DEDUÇÃO '+(index+1)+'</div><h3>'+esc(q.title)+'</h3>'+
  (solved.includes(index)?'<p class="lakeCorrect">✓ Conclusão apoiada nas evidências.</p>':
    locked?'<div class="lakeLocked">Ainda faltam provas: '+missing.length+' pista(s) e '+(needsWitness?'um depoimento':'nenhum depoimento')+'. Volte aos locais.</div>':
    q.options.map((opt,j)=>'<button class="lakeAnswerOption" data-lake-deduction="'+index+'" data-lake-choice="'+j+'">'+esc(opt)+'</button>').join(''))+
  '</article>';
 }).join('')+
 (solved.length===3?'<div class="secretRevelation">Você separou os fatos de suas interpretações. Agora pode escolher uma teoria.</div>':'<div class="notice">Revise o dossiê sempre que precisar. Não é necessário descobrir tudo de uma vez.</div>')+
 '<button class="btn" data-view="theory">Abrir teorias →</button><button class="btn outline" data-view="dossier">Conferir provas →</button></section>';
};
const originalTheories=theories;
theories=function(){
 if(!ready())return originalTheories();
 const check=deductions().length===3&&s.evidence.length>=requiredClues();
 return '<section class="section lakeTheory"><button class="backBtn" data-view="hub">← Voltar ao mapa</button><div class="eyebrow">RELATÓRIO FINAL</div><h2>Qual explicação é mais provável?</h2><p>As provas não garantem uma resposta única. Compare as três possibilidades e escolha a que melhor explica todos os fatos.</p>'+
 '<div class="lakeDeductionScore">Deduções: '+deductions().length+'/3 · Pistas: '+s.evidence.length+'/9</div>'+
 Object.entries(C.theories).map(([id,t])=>'<button class="theoryCard '+(s.selectedTheory===id?'selected':'')+'" data-theory="'+id+'"><div class="theoryBadge">'+esc(t.kind)+'</div><strong>'+esc(t.name)+(s.selectedTheory===id?' ✓':'')+'</strong><p>'+esc(t.desc)+'</p></button>').join('')+
 (net.inGame&&net.mode==='coop'?roleReport()+'<div class="notice">No cooperativo, todos precisam registrar seus pareceres e votar na hipótese.</div>'+groupVotes('theory'):'')+
 (!check?'<div class="notice">Antes de confirmar, conclua as três deduções no quadro e reúna pelo menos '+requiredClues()+' pistas.</div>':'')+
 '<button class="btn" data-action="confirm" '+(!check||!s.selectedTheory||!specialistCanDo()?'disabled':'')+'>Confirmar hipótese →</button>'+
 '<button class="btn outline" data-view="board">Abrir quadro de dedução</button></section>';
};
function answerDeduction(index,choice){
 const q=QUESTIONS[index];if(!q||deductions().includes(index))return;
 if(q.needs.some(id=>!found(id))||q.witness&&!s.witness.includes(q.witness))return toast('Reúna as provas e o depoimento antes de responder.');
 if(Number(choice)!==q.answer){
  s.boardMistakes=(s.boardMistakes||0)+1;persist(false);
  toast('Essa opção não explica todas as pistas. Compare os fatos novamente.');
  return;
 }
 deductions().push(index);
 if(deductions().length===QUESTIONS.length)s.boardSolved=true;
 persist();
 render();
 toast('Dedução registrada. Você pode avançar.');
}
function getItem(id){return currentObjects().find(o=>o.id===id)}
function tapObject(id){
 const item=getItem(id);if(!item)return;
 if(selectedTool){
  const tool=selectedTool;selectedTool=null;toolUse(tool,id);render();return;
 }
 if(item.kind==='move')toast(item.tip+' Segure e arraste o objeto.');
 else toast(item.tip);
}
function pointerDown(e){
 if(!ready()||s.view!=='scene')return;
 const obj=e.target.closest('[data-lake-object]'),tool=e.target.closest('[data-lake-tool]');
 if(!obj&&!tool)return;
 e.preventDefault();e.stopImmediatePropagation();
 const source=obj||tool, kind=obj?'object':'tool';
 activeDrag={pointer:e.pointerId,kind,id:source.dataset.lakeObject||source.dataset.lakeTool,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,source};
 if(kind==='tool')selectedTool=null;
}
function pointerMove(e){
 if(!activeDrag||activeDrag.pointer!==e.pointerId)return;
 e.preventDefault();
 activeDrag.x=e.clientX;activeDrag.y=e.clientY;
 const dx=e.clientX-activeDrag.startX,dy=e.clientY-activeDrag.startY;
 activeDrag.source.style.transform='translate(calc(-50% + '+dx+'px), calc(-50% + '+dy+'px)) scale(1.06)';
 activeDrag.source.style.zIndex='30';
}
function pointerUp(e){
 if(!activeDrag||activeDrag.pointer!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const d=activeDrag;activeDrag=null;
 const diff=Math.hypot(e.clientX-d.startX,e.clientY-d.startY);
 d.source.style.transform='';d.source.style.zIndex='';
 if(diff<20){
  if(d.kind==='object')tapObject(d.id);
  else{selectedTool=d.id;render();toast('Ferramenta selecionada: agora toque no objeto do cenário.');}
  return;
 }
 if(d.kind==='object'){
  const item=getItem(d.id);
  if(item?.kind==='move'&&diff>=45){
   movedObject(d.id);
  }else toast(item?.tip||'Arraste o objeto para mover.');
  return;
 }
 d.source.style.pointerEvents='none';
 const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-lake-object]');
 d.source.style.pointerEvents='';
 if(target)toolUse(d.id,target.dataset.lakeObject);
 else toast('Solte a ferramenta sobre um objeto do cenário.');
}
document.addEventListener('pointerdown',pointerDown,true);
window.addEventListener('pointermove',pointerMove,{passive:false});
window.addEventListener('pointerup',pointerUp,true);
window.addEventListener('pointercancel',()=>{if(activeDrag){activeDrag.source.style.transform='';activeDrag=null;}},true);
app.addEventListener('click',function(ev){
 if(!ready())return;
 const object=ev.target.closest('[data-lake-object]'),tool=ev.target.closest('[data-lake-tool]');
 if(object||tool){ev.preventDefault();ev.stopImmediatePropagation();return;}
 const a=ev.target.closest('[data-lake-deduction]');
 if(a){ev.preventDefault();ev.stopImmediatePropagation();answerDeduction(Number(a.dataset.lakeDeduction),Number(a.dataset.lakeChoice));return;}
 if(ev.target.closest('[data-action="confirm"]')&&deductions().length<QUESTIONS.length){
  ev.preventDefault();ev.stopImmediatePropagation();toast('Conclua as três deduções no quadro antes de confirmar uma teoria.');
 }
},true);
app.addEventListener('change',function(ev){
 if(!ready()||ev.target?.id!=='lakeFrequency')return;
 ev.preventDefault();ev.stopImmediatePropagation();
 radioTune(ev.target.value);
},true);
})();
