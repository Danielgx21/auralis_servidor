/* DGX LLM v0.6 — classificacao neural supervisionada de perguntas.
   Os pesos iniciam aleatoriamente e sao treinados no proprio navegador.
   As respostas sao recuperadas dos exemplos, NAO geradas por uma LLM.
   Este modulo nao envia dados a APIs ou servidores de inferencia. */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const VERSION=6, DATA_KEY="dgx_dialogue_examples_v06", WEIGHT_KEY="dgx_dialogue_weights_v06";
const E=16,H=24,MAX_EXAMPLES=220,MAX_CLASSES=30,MAX_WORDS=650;
const groups=[
 ["Olá! Sou a DGX LLM. Esta resposta foi escolhida por uma rede neural pequena treinada com exemplos, não por uma LLM generativa.",
  ["oi","olá","bom dia","boa tarde","boa noite","oi tudo bem","quero conversar com voce"]],
 ["Uma LLM é um modelo de linguagem treinado para prever tokens. Essa tarefa pode produzir habilidades de geração de texto e inferência.",
  ["o que é uma llm","explique o que é uma llm","o que significa modelo de linguagem","como funciona um modelo de linguagem","o que é um grande modelo de linguagem","llm serve para que"]],
 ["Tokens são pedaços de texto usados pelo modelo, como palavras, partes de palavras ou caracteres. A rede aprende probabilidades sobre essas unidades.",
  ["o que são tokens","explique os tokens","o que é um token","para que serve tokenização","como o texto vira tokens","tokens são palavras"]],
 ["Treinar significa comparar previsões com respostas esperadas e atualizar pesos da rede para reduzir os erros.",
  ["como a ia aprende","como se faz treinamento","explique o treinamento da rede","como os pesos mudam","como funciona o aprendizado","por que a rede ajusta parametros"]],
 ["O Transformer usa atenção para combinar informações de diferentes posições do texto. Atenção aqui é uma operação matemática.",
  ["o que é transformer","como funciona a atenção","explique o mecanismo de atenção","o que são matrizes q k v","para que serve self attention","como o transformer processa texto"]],
 ["Raciocínio funcional é a capacidade de realizar inferências e solucionar problemas novos. Uma resposta correta isolada não demonstra generalização.",
  ["ia consegue raciocinar","o modelo realmente pensa","como avaliar raciocinio","inteligencia artificial tem raciocinio","uma llm sabe fazer logica","como medir capacidade de inferencia"]],
 ["Para trabalhar offline podemos usar um modelo aberto em um computador. Isso evita APIs pagas, mas os pesos iniciais não são necessariamente nossos.",
  ["posso usar ia offline","como rodar um modelo local","a dgx funciona sem internet","quero uma ia sem pagar api","onde a ia funciona","posso executar no computador"]],
 ["GPU é um processador que acelera operações paralelas de redes neurais. Modelos pequenos também podem rodar na CPU, embora mais lentamente.",
  ["o que é gpu","precisa de placa de video","como usar gpu para ia","para que serve uma gpu no treinamento","cpu ou gpu para modelos","meu computador precisa de gpu"]],
 ["Para verificar se a IA generaliza, reserve problemas e textos que não apareceram no treinamento e meça erros nesse conjunto independente.",
  ["como testar generalizacao","o que é sobreajuste","como avaliar uma rede neural","por que usar dados de validação","como verificar se a ia memorizou","a rede só decorou o texto"]]
];
const EXAMPLES=groups.flatMap(([ans,qs])=>qs.map(q=>q+" => "+ans)).join("\n");
let model=null,train=[],test=[],steps=0,losses=[],busy=false,sig="";
function normalize(s){
 return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .match(/[a-z0-9]+/g)||[];
}
const STOP=new Set("o a as os de da do das dos que como me um uma e voce pode para por com em eu ser isso sobre meu minha qual quais no na tem esse esta seu sou quero quero".split(" "));
function signature(s){
 let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
 return (h>>>0)+":"+s.length;
}
function parseData(raw){
 const rows=[];
 const lines=String(raw).split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<8||lines.length>MAX_EXAMPLES)throw Error("Use de 8 a "+MAX_EXAMPLES+" linhas de perguntas e respostas.");
 for(let i=0;i<lines.length;i++){
   const sep=lines[i].indexOf("=>");
   if(sep<1)throw Error("Linha "+(i+1)+": use pergunta => resposta.");
   const q=lines[i].slice(0,sep).trim(),ans=lines[i].slice(sep+2).trim();
   if(q.length<2||q.length>220||ans.length<2||ans.length>600)
     throw Error("Linha "+(i+1)+": pergunta ou resposta fora do tamanho permitido.");
   rows.push({q,answer:ans,words:normalize(q)});
 }
 const answers=[...new Set(rows.map(r=>r.answer))];
 if(answers.length<2||answers.length>MAX_CLASSES)
   throw Error("Precisamos de 2 a "+MAX_CLASSES+" respostas distintas.");
 const vocab=[...new Set(rows.flatMap(r=>r.words))].sort();
 if(vocab.length>MAX_WORDS)throw Error("Use um vocabulário de até "+MAX_WORDS+" palavras diferentes.");
 const dict=new Map(vocab.map((v,i)=>[v,i]));
 rows.forEach(r=>{
  r.label=answers.indexOf(r.answer);
  r.ids=r.words.map(w=>dict.get(w)).filter(v=>v!==undefined);
 });
 const groups=answers.map((_,i)=>rows.filter(r=>r.label===i));
 const tr=[],te=[];
 for(const group of groups){
   if(group.length>=3){tr.push(...group.slice(0,-1));te.push(group[group.length-1]);}
   else tr.push(...group);
 }
 if(!tr.length)throw Error("Inclua pelo menos dois exemplos válidos.");
 return {vocab,answers,tr,te};
}
function gaussian(){
 const u=Math.max(1e-12,Math.random()),v=Math.random();
 return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function randomArray(n,std=.11){return Float64Array.from({length:n},()=>gaussian()*std);}
function initialize(raw){
 const data=parseData(raw), V=data.vocab.length,K=data.answers.length;
 model={vocab:data.vocab,answers:data.answers,V,K,
  emb:randomArray(V*E,.11),w1:randomArray(E*H,.12),b1:new Float64Array(H),
  w2:randomArray(H*K,.12),b2:new Float64Array(K)};
 train=data.tr;test=data.te;steps=0;losses=[];sig=signature(raw);
 update();return model;
}
function forward(ids){
 const n=model, x=new Float64Array(E);
 if(ids.length)for(const id of ids)for(let e=0;e<E;e++)x[e]+=n.emb[id*E+e]/ids.length;
 const h=new Float64Array(H);
 for(let j=0;j<H;j++){
  let a=n.b1[j];for(let e=0;e<E;e++)a+=x[e]*n.w1[e*H+j];
  h[j]=Math.tanh(a);
 }
 const p=new Float64Array(n.K);let max=-Infinity;
 for(let k=0;k<n.K;k++){
  let z=n.b2[k];for(let j=0;j<H;j++)z+=h[j]*n.w2[j*n.K+k];
  p[k]=z;max=Math.max(max,z);
 }
 let sum=0;for(let k=0;k<n.K;k++){p[k]=Math.exp(p[k]-max);sum+=p[k]}
 for(let k=0;k<n.K;k++)p[k]/=sum;
 return {x,h,p};
}
function updateSample(s,lr){
 const n=model, {x,h,p}=forward(s.ids),dz=Float64Array.from(p);
 const loss=-Math.log(Math.max(1e-12,p[s.label]));dz[s.label]-=1;
 const dh=new Float64Array(H), da=new Float64Array(H), dx=new Float64Array(E);
 for(let j=0;j<H;j++){
  for(let k=0;k<n.K;k++)dh[j]+=n.w2[j*n.K+k]*dz[k];
  da[j]=dh[j]*(1-h[j]*h[j]);
 }
 for(let e=0;e<E;e++)for(let j=0;j<H;j++)dx[e]+=da[j]*n.w1[e*H+j];
 // Gradients were computed before any weights are changed.
 for(let j=0;j<H;j++)for(let k=0;k<n.K;k++)n.w2[j*n.K+k]-=lr*h[j]*dz[k];
 for(let k=0;k<n.K;k++)n.b2[k]-=lr*dz[k];
 for(let e=0;e<E;e++)for(let j=0;j<H;j++)n.w1[e*H+j]-=lr*x[e]*da[j];
 for(let j=0;j<H;j++)n.b1[j]-=lr*da[j];
 if(s.ids.length)for(const id of s.ids)for(let e=0;e<E;e++)
  n.emb[id*E+e]-=lr*dx[e]/s.ids.length;
 return loss;
}
function stats(arr){
 if(!arr.length)return {loss:null,accuracy:null};
 let loss=0,correct=0;
 for(const s of arr){
  const p=forward(s.ids).p;
  loss-=Math.log(Math.max(1e-12,p[s.label]));
  if(p.indexOf(Math.max(...p))===s.label)correct++;
 }
 return {loss:loss/arr.length,accuracy:correct/arr.length};
}
function scoreQuestion(question){
 if(!model||steps===0)return {reply:"O classificador neural ainda não foi treinado. Abra a aba Ensinar conversa e clique em Treinar.",confidence:0,mode:"untrained"};
 const words=normalize(question);
 const mapping=new Map(model.vocab.map((w,i)=>[w,i]));
 const known=words.filter(w=>mapping.has(w)),ids=known.map(w=>mapping.get(w));
 const coverage=known.length/Math.max(1,words.length);
 const knownInfo=known.filter(w=>!STOP.has(w));
 const uniqueInfo=[...new Set(knownInfo)];
 if(!ids.length||!uniqueInfo.length||coverage<.35){
  return {reply:"Ainda não aprendi a responder essa pergunta. Na aba Ensinar conversa, acrescente exemplos com a resposta desejada e treine novamente.",confidence:0,coverage,mode:"unknown"};
 }
 const probs=Array.from(forward(ids).p).map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p);
 const best=probs[0],margin=best.p-(probs[1]?.p||0);
 if(best.p<.58||margin<.18){
  return {reply:"Não tenho confiança suficiente para responder com os exemplos atuais. Tente outra formulação ou ensine novas perguntas na aba Ensinar conversa.",confidence:best.p,coverage,mode:"uncertain"};
 }
 return {reply:model.answers[best.i],confidence:best.p,coverage,mode:"neural"};
}
function save(){
 if(!model)return;
 const obj={v:VERSION,sig,steps,losses:losses.slice(-80),vocab:model.vocab,answers:model.answers};
 for(const name of ["emb","w1","b1","w2","b2"])obj[name]=Array.from(model[name]);
 try{localStorage.setItem(WEIGHT_KEY,JSON.stringify(obj));$("dialogNote").textContent="Pesos salvos neste navegador."}
 catch{$("dialogNote").textContent="Não foi possível salvar os pesos neste navegador."}
}
function load(){
 try{
  const obj=JSON.parse(localStorage.getItem(WEIGHT_KEY)||"null");
  if(!obj||obj.v!==VERSION||obj.sig!==signature($("dialogExamples").value))return false;
  initialize($("dialogExamples").value);
  if(JSON.stringify(obj.vocab)!==JSON.stringify(model.vocab)||
     JSON.stringify(obj.answers)!==JSON.stringify(model.answers))return false;
  for(const name of ["emb","w1","b1","w2","b2"]){
   if(!Array.isArray(obj[name])||obj[name].length!==model[name].length||
      obj[name].some(x=>!Number.isFinite(x)))return false;
  }
  for(const name of ["emb","w1","b1","w2","b2"])model[name]=Float64Array.from(obj[name]);
  steps=Number.isSafeInteger(obj.steps)&&obj.steps>=0?obj.steps:0;
  losses=Array.isArray(obj.losses)?obj.losses.filter(x=>Number.isFinite(x.step)&&Number.isFinite(x.loss)).slice(-80):[];
  update();return true;
 }catch{return false}
}
function update(){
 if(!model)return;
 $("dialogAnswers").textContent=model.K;
 $("dialogWords").textContent=model.V;
 $("dialogSteps").textContent=steps.toLocaleString("pt-BR");
 const tr=stats(train),te=stats(test);
 $("dialogTrainLoss").textContent=tr.loss===null?"—":tr.loss.toFixed(3);
 $("dialogTrainAcc").textContent=tr.accuracy===null?"—":(100*tr.accuracy).toFixed(0)+"%";
 $("dialogTestAcc").textContent=te.accuracy===null?"Sem teste separado":(100*te.accuracy).toFixed(0)+"%";
 $("dialogTrainCount").textContent=train.length;
 $("dialogTestCount").textContent=test.length;
 $("dialogModelStatus").textContent=steps>0?"Treinado":"Pesos aleatórios";
 const report=$("dialogMistakes");
 if(report){
  if(steps===0||!test.length){
   report.textContent="Treine para verificar as perguntas reservadas.";
  }else{
   const fails=[];
   for(const row of test){
    const pred=forward(row.ids).p, top=pred.indexOf(Math.max(...pred));
    if(top!==row.label)fails.push("• "+row.q+"\n  Esperado: "+row.answer.slice(0,75)+
      (row.answer.length>75?"…":"")+"\n  Escolhido: "+model.answers[top].slice(0,75)+(model.answers[top].length>75?"…":""));
   }
   report.textContent=fails.length?fails.slice(0,4).join("\n\n")+
     (fails.length>4?"\n\n… e mais "+(fails.length-4)+" erro(s).":""):
     "Nenhum erro nas perguntas reservadas deste conjunto pequeno.";
  }
 }
}
async function trainModel(){
 if(busy)return;
 const raw=$("dialogExamples").value;
 if(!model||signature(raw)!==sig){
  try{initialize(raw)}catch(e){$("dialogNote").textContent=e.message;return}
 }
 busy=true;$("dialogTrain").disabled=true;$("dialogReset").disabled=true;
 const batch=80,iterations=2000,rate=.07;
 $("dialogNote").textContent="Atualizando pesos no seu navegador...";
 try{
  for(let i=0;i<iterations;i+=batch){
   for(let j=0;j<batch;j++)updateSample(train[Math.floor(Math.random()*train.length)],rate);
   steps+=batch;
   const m=stats(train);
   losses.push({step:steps,loss:m.loss});
   if(losses.length>80)losses.shift();
   $("dialogProgress").value=i+batch;
   $("dialogProgressLabel").textContent=(i+batch)+" / "+iterations+" passos";
   update();
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  save();testQuestion();
 }catch(e){$("dialogNote").textContent="Erro ao treinar: "+e.message}
 finally{busy=false;$("dialogTrain").disabled=false;$("dialogReset").disabled=false}
}
function testQuestion(){
 const q=$("dialogQuery").value;
 const result=scoreQuestion(q);
 const el=$("dialogAnswer");el.textContent=result.reply;
 $("dialogConfidence").textContent=result.mode==="neural"?"Confiança da classificação: "+(result.confidence*100).toFixed(1)+"% (não é probabilidade de estar correta).":"Status: "+result.mode+".";
}
function addExample(){
 const q=$("dialogNewQ").value.trim(),a=$("dialogNewA").value.trim();
 if(q.length<2||a.length<2||q.length>220||a.length>600){
  $("dialogNote").textContent="Preencha pergunta e resposta (até 220 e 600 caracteres).";return;
 }
 if(q.includes("\n")||a.includes("\n")||q.includes("=>")){
  $("dialogNote").textContent="Use uma pergunta sem quebra de linha e sem o separador =>.";return;
 }
 const raw=$("dialogExamples").value.trim();
 const candidate=raw+"\n"+q+" => "+a;
 try{parseData(candidate)}
 catch(e){$("dialogNote").textContent=e.message;return}
 $("dialogExamples").value=candidate;
 try{localStorage.setItem(DATA_KEY,candidate)}catch{}
 model=null;steps=0;losses=[];
 $("dialogNote").textContent="Exemplo adicionado. Clique em Treinar para atualizar os pesos. Os pesos antigos ainda estão salvos até você treinar.";
 $("dialogNewQ").value="";$("dialogNewA").value="";
 $("dialogModelStatus").textContent="Treinamento necessário";
}
function resetWeights(){
 if(busy)return;
 try{initialize($("dialogExamples").value);
  localStorage.removeItem(WEIGHT_KEY);
  $("dialogNote").textContent="Pesos aleatórios reinicializados. Os exemplos foram preservados."}
 catch(e){$("dialogNote").textContent=e.message}
}
function download(){
 if(!model)return;
 const obj={format:"DGX-supervised-neural-dialogue-v06",dataset:$("dialogExamples").value,steps,answers:model.answers,vocab:model.vocab,losses};
 for(const k of ["emb","w1","b1","w2","b2"])obj[k]=Array.from(model[k]);
 const blob=new Blob([JSON.stringify(obj)],{type:"application/json"});
 const href=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=href;link.download="dgx-conversa-neural-checkpoint.json";
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(href),1500);
}

async function importCheckpoint(){
 const input=$("dialogImportFile"),file=input?.files?.[0];
 if(!file)return;
 try{
  if(file.size>400000)throw Error("Arquivo maior que 400 KB.");
  const obj=JSON.parse(await file.text());
  if(obj.format!=="DGX-supervised-neural-dialogue-v06"||
     typeof obj.dataset!=="string"||obj.dataset.length>90000)
    throw Error("Arquivo não é um checkpoint DGX v0.6 válido.");
  const probe=parseData(obj.dataset);
  if(JSON.stringify(probe.vocab)!==JSON.stringify(obj.vocab)||
     JSON.stringify(probe.answers)!==JSON.stringify(obj.answers))
    throw Error("Vocabulário ou respostas incompatíveis com os exemplos.");
  const lengths={emb:probe.vocab.length*E,w1:E*H,b1:H,w2:H*probe.answers.length,b2:probe.answers.length};
  for(const key of Object.keys(lengths)){
   if(!Array.isArray(obj[key])||obj[key].length!==lengths[key]||
       obj[key].some(x=>typeof x!=="number"||!Number.isFinite(x)))
     throw Error("Pesos inválidos: "+key);
  }
  if(!Number.isSafeInteger(obj.steps)||obj.steps<0||obj.steps>1e8)
    throw Error("Quantidade de passos inválida.");
  if((model&&steps>0)&&!confirm("Substituir a rede treinada neste navegador pelos pesos do arquivo?"))return;
  $("dialogExamples").value=obj.dataset;
  initialize(obj.dataset);
  for(const key of Object.keys(lengths))model[key]=Float64Array.from(obj[key]);
  steps=obj.steps;
  losses=Array.isArray(obj.losses)?obj.losses.filter(x=>x&&Number.isFinite(x.step)&&Number.isFinite(x.loss)).slice(-80):[];
  try{localStorage.setItem(DATA_KEY,obj.dataset)}catch{}
  save();update();testQuestion();
  $("dialogNote").textContent="Checkpoint importado e pesos restaurados!";
 }catch(e){$("dialogNote").textContent="Importação rejeitada: "+e.message}
 finally{input.value=""}
}

function init(){
 const textarea=$("dialogExamples");if(!textarea)return;
 textarea.value=EXAMPLES;
 try{const stored=localStorage.getItem(DATA_KEY);if(stored&&stored.length<=90000)textarea.value=stored}catch{}
 $("dialogQuery").value="como a inteligência artificial aprende?";
 $("dialogTrain").onclick=trainModel;
 $("dialogReset").onclick=()=>{if(steps>0&&!confirm("Reiniciar os pesos desta rede?"))return;resetWeights()};
 $("dialogTest").onclick=testQuestion;
 $("dialogAdd").onclick=addExample;
 $("dialogDownload").onclick=download;
 $("dialogImportBtn").onclick=()=>$("dialogImportFile").click();
 $("dialogImportFile").onchange=importCheckpoint;
 textarea.onchange=()=>{
  try{localStorage.setItem(DATA_KEY,textarea.value)}catch{}
  if(signature(textarea.value)!==sig){
    model=null;steps=0;$("dialogModelStatus").textContent="Treinamento necessário";
    $("dialogNote").textContent="Dados alterados. Inicie treinamento para criar novos pesos.";
  }
 };
 if(load())$("dialogNote").textContent="Pesos previamente treinados restaurados.";
 else {
  try{initialize(textarea.value);$("dialogNote").textContent="Pesos aleatórios. Clique em Treinar."}
  catch(e){$("dialogNote").textContent=e.message}
 }
 testQuestion();
}
window.DGXNeuralChat={respond:scoreQuestion,isReady:()=>Boolean(model&&steps>0&&signature($("dialogExamples").value)===sig),
  train:trainModel,test:testQuestion,stats:()=>({steps,train:stats(train),test:stats(test)})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();