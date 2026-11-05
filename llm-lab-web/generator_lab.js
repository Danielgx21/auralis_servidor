/* DGX LLM 0.7 — gerador neural autoregressivo experimental.
   Pesos próprios, inicializados aleatoriamente e treinados apenas no navegador.
   Arquitetura: embeddings de palavras + resumo de pergunta + RNN tanh + softmax.
   Treino: teacher forcing, perda de entropia cruzada, backpropagation through time.
   Gera tokens sequencialmente. NÃO é uma LLM Transformer nem tem compreensão garantida.
*/
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const VERSION=7,DATA_KEY="dgx_gen_data_v07",WEIGHT_KEY="dgx_gen_weights_v07";
const EMB=12,H=28,MAX_LINES=100,MAX_VOCAB=280,MAX_ANSWER=35;
const BOS="<bos>",EOS="<eos>",UNK="<unk>";
const seed=[
 ["o que é uma llm","uma llm é uma rede neural que aprende padrões de textos e prevê tokens."],
 ["explique modelo de linguagem","um modelo de linguagem aprende relações entre palavras para produzir texto."],
 ["como uma ia gera textos","a rede prevê cada token e usa esse token para gerar o próximo."],
 ["como se forma uma resposta","a resposta é uma sequência produzida passo a passo pela rede."],
 ["uma llm prevê palavras","a rede prevê tokens, que podem ser palavras ou partes de palavras."],
 ["o que são tokens","tokens são unidades de texto que o modelo representa por números."],
 ["o que significa token","um token é uma unidade de texto usada durante a previsão."],
 ["como transformar palavras em números","o modelo associa números aos tokens de uma sequência."],
 ["para que serve tokenização","a tokenização divide um texto em unidades que a rede processa."],
 ["o que é uma palavra na rede","uma palavra pode ser dividida em tokens menores."],
 ["o que é treinamento","o treinamento ajusta pesos da rede para melhorar as previsões."],
 ["como a ia aprende","a rede compara previsões com exemplos e atualiza seus parâmetros."],
 ["como aprender com exemplos","o modelo calcula erros e muda os pesos durante o treinamento."],
 ["por que mudar os pesos","os pesos mudam para reduzir o erro das previsões."],
 ["como medir o aprendizado","podemos medir a perda em exemplos que a rede não usou no treino."],
 ["o que é uma rede neural","uma rede neural combina números e parâmetros para gerar resultados."],
 ["como funciona uma rede","as camadas transformam informações usando pesos aprendidos."],
 ["qual o papel dos neurônios","os neurônios artificiais calculam valores a partir de entradas."],
 ["por que usar camadas","as camadas permitem aprender relações matemáticas mais complexas."],
 ["o que é inteligência artificial","a inteligência artificial reúne técnicas para realizar tarefas com computadores."],
 ["o que é raciocínio artificial","o raciocínio funcional consiste em fazer inferências e resolver problemas."],
 ["uma ia realmente pensa","a rede executa cálculos e pode produzir inferências em algumas situações."],
 ["como testar raciocínio","é preciso apresentar problemas novos para verificar a generalização."],
 ["como saber se a ia decorou","compare resultados com dados e problemas diferentes do treinamento."],
 ["o que é generalização","generalizar é resolver exemplos novos além dos vistos no treinamento."],
 ["o que é transformer","o transformer usa atenção para relacionar posições de uma sequência."],
 ["como funciona atenção","a atenção calcula pesos para combinar informações do contexto."],
 ["o que é self attention","a autoatenção relaciona partes de uma sequência usando cálculos."],
 ["para que serve contexto","o contexto ajuda o modelo a escolher tokens mais adequados."],
 ["por que precisamos de memória","a memória permite aproveitar informações anteriores de uma conversa."],
 ["posso executar uma ia offline","sim, uma rede pequena pode funcionar sem internet no computador."],
 ["precisa de internet para treinar","não, este experimento treina a rede no seu navegador."],
 ["posso aprender sem api","sim, podemos treinar pesos próprios sem depender de serviços de ia."],
 ["onde acontece o processamento","o processamento da rede ocorre na memória e no processador."],
 ["preciso de gpu","modelos pequenos também podem funcionar na cpu, mas são mais lentos."],
 ["qual a diferença entre cpu e gpu","a gpu acelera operações paralelas e a cpu executa cálculos gerais."],
 ["o que é a dgx llm","a dgx llm é um laboratório experimental para estudar redes neurais."],
 ["qual o objetivo do projeto","o objetivo é aprender a construir inteligência artificial independente."],
 ["a dgx já conversa de verdade","a rede experimental ainda tem limitações para produzir respostas confiáveis."],
 ["qual o próximo passo","podemos testar novas perguntas e treinar a rede com mais exemplos."],
 ["o que você não sabe","ainda posso errar perguntas e produzir frases sem sentido."]
];
const DEFAULT=seed.map(([q,a])=>q+" => "+a).join("\n");
let model=null,train=[],holdout=[],updates=0,curves=[],corpusSig="",busy=false;
function tokenize(s){return (String(s).toLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+|[.,!?;:]/gu)||[]).slice(0,100);}
function detok(t){
 return t.join(" ").replace(/\s+([.,!?;:])/g,"$1").replace(/(^\p{L}|[.!?]\s+\p{L})/gu,x=>x.toUpperCase()).trim();
}
function fingerprint(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0)+":"+s.length;}
function gaussian(){let a=Math.max(1e-12,Math.random()),b=Math.random();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b)}
function rnd(n,s){return Float64Array.from({length:n},()=>gaussian()*s)}
function zero(n){return new Float64Array(n)}
const params=["emb","wx","wq","wh","bh","wo","bo"];
function parseCorpus(text){
 const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(lines.length<12||lines.length>MAX_LINES)throw Error("Use de 12 a "+MAX_LINES+" exemplos.");
 const rows=[];
 for(let i=0;i<lines.length;i++){
  const p=lines[i].indexOf("=>");
  if(p<3)throw Error("Linha "+(i+1)+": use pergunta => resposta.");
  const q=lines[i].slice(0,p).trim(),a=lines[i].slice(p+2).trim();
  if(q.length>200||a.length>260||q.length<4||a.length<4)throw Error("Linha "+(i+1)+": texto muito longo ou curto.");
  const qt=tokenize(q),at=tokenize(a);
  if(qt.length<2||at.length<2||at.length>MAX_ANSWER)throw Error("Linha "+(i+1)+": a resposta precisa ter 2 a "+MAX_ANSWER+" tokens.");
  rows.push({q,a,qt,at});
 }
 const vocab=[BOS,EOS,UNK,...new Set(rows.flatMap(x=>[...x.qt,...x.at]))].filter((x,i,a)=>a.indexOf(x)===i);
 if(vocab.length>MAX_VOCAB)throw Error("Vocabulário grande ("+vocab.length+"). Limite: "+MAX_VOCAB+" tokens. Reduza ou simplifique os exemplos.");
 const byWord=new Map(vocab.map((t,i)=>[t,i]));
 rows.forEach(row=>{row.qids=row.qt.map(t=>byWord.get(t));row.out=[...row.at.map(t=>byWord.get(t)),1]});
 // Last of every 5 is held out. Questions in holdout never train; answers may overlap.
 return {vocab,tr:rows.filter((_,i)=>i%5!==4),va:rows.filter((_,i)=>i%5===4)};
}
function initialize(text){
 const data=parseCorpus(text),V=data.vocab.length;
 model={vocab:data.vocab,V,
  emb:rnd(V*EMB,.09),wx:rnd(EMB*H,.13),wq:rnd(EMB*H,.10),
  wh:rnd(H*H,.11),bh:zero(H),wo:rnd(H*V,.07),bo:zero(V)};
 train=data.tr;holdout=data.va;updates=0;curves=[];corpusSig=fingerprint(text);
 refresh();return model;
}
function questionVector(ids){
 const q=zero(EMB);if(!ids.length)return q;
 for(const id of ids)for(let i=0;i<EMB;i++)q[i]+=model.emb[id*EMB+i]/ids.length;
 return q;
}
function forwardSample(row){
 const m=model,Q=questionVector(row.qids),states=[];
 let old=zero(H),prev=0,loss=0;
 for(const target of row.out){
  const h=zero(H),e=zero(EMB);
  for(let i=0;i<EMB;i++)e[i]=m.emb[prev*EMB+i];
  for(let j=0;j<H;j++){
   let a=m.bh[j];
   for(let i=0;i<EMB;i++)a+=e[i]*m.wx[i*H+j]+Q[i]*m.wq[i*H+j];
   for(let i=0;i<H;i++)a+=old[i]*m.wh[i*H+j];
   h[j]=Math.tanh(a);
  }
  const p=zero(m.V);let max=-Infinity;
  for(let k=0;k<m.V;k++){
   let z=m.bo[k];for(let j=0;j<H;j++)z+=h[j]*m.wo[j*m.V+k];
   p[k]=z;if(z>max)max=z;
  }
  let denom=0;for(let k=0;k<m.V;k++){p[k]=Math.exp(p[k]-max);denom+=p[k]}
  for(let k=0;k<m.V;k++)p[k]/=denom;
  loss-=Math.log(Math.max(1e-12,p[target]));
  states.push({h,old,e,prev,p,target});
  old=h;prev=target;
 }
 return {states,Q,loss:loss/row.out.length};
}
function updateOne(row,lr){
 const m=model,run=forwardSample(row),G={};for(const k of params)G[k]=zero(m[k].length);
 const dQ=zero(EMB);let dhNext=zero(H);
 const len=row.out.length;
 for(let t=run.states.length-1;t>=0;t--){
  const s=run.states[t],dz=Float64Array.from(s.p);dz[s.target]-=1;
  for(let k=0;k<m.V;k++)dz[k]/=len;
  const dh=Float64Array.from(dhNext),dA=zero(H),dOld=zero(H),dE=zero(EMB);
  for(let j=0;j<H;j++){
   for(let k=0;k<m.V;k++){
    G.wo[j*m.V+k]+=s.h[j]*dz[k];
    dh[j]+=m.wo[j*m.V+k]*dz[k];
   }
   dA[j]=dh[j]*(1-s.h[j]*s.h[j]);
   G.bh[j]+=dA[j];
  }
  for(let k=0;k<m.V;k++)G.bo[k]+=dz[k];
  for(let i=0;i<EMB;i++)for(let j=0;j<H;j++){
    G.wx[i*H+j]+=s.e[i]*dA[j];
    G.wq[i*H+j]+=run.Q[i]*dA[j];
    dE[i]+=m.wx[i*H+j]*dA[j];
    dQ[i]+=m.wq[i*H+j]*dA[j];
  }
  for(let i=0;i<H;i++)for(let j=0;j<H;j++){
    G.wh[i*H+j]+=s.old[i]*dA[j];
    dOld[i]+=m.wh[i*H+j]*dA[j];
  }
  for(let i=0;i<EMB;i++)G.emb[s.prev*EMB+i]+=dE[i];
  dhNext=dOld;
 }
 if(row.qids.length)for(const qid of row.qids)for(let i=0;i<EMB;i++)
   G.emb[qid*EMB+i]+=dQ[i]/row.qids.length;
 let norm=0;for(const key of params)for(const v of G[key])norm+=v*v;
 const clip=Math.min(1,2.0/Math.max(1e-10,Math.sqrt(norm)));
 for(const key of params)for(let i=0;i<m[key].length;i++)m[key][i]-=lr*clip*G[key][i];
 return run.loss;
}
function meanLoss(rows){
 if(!rows.length)return null;
 let value=0;
 for(const row of rows)value+=forwardSample(row).loss;
 return value/rows.length;
}
function knownQuestion(s){
 const qt=tokenize(s),by=new Map(model.vocab.map((w,i)=>[w,i]));
 const known=qt.filter(x=>by.has(x));
 return {qids:known.map(x=>by.get(x)),coverage:known.length/Math.max(1,qt.length),tokens:qt.length};
}
function nextDistribution(qvec,prev,hprev){
 const m=model,h=zero(H),e=zero(EMB);
 for(let i=0;i<EMB;i++)e[i]=m.emb[prev*EMB+i];
 for(let j=0;j<H;j++){
  let a=m.bh[j];
  for(let i=0;i<EMB;i++)a+=e[i]*m.wx[i*H+j]+qvec[i]*m.wq[i*H+j];
  for(let i=0;i<H;i++)a+=hprev[i]*m.wh[i*H+j];
  h[j]=Math.tanh(a);
 }
 const logits=zero(m.V);let max=-Infinity;
 for(let k=0;k<m.V;k++){
  let z=m.bo[k];for(let j=0;j<H;j++)z+=h[j]*m.wo[j*m.V+k];
  logits[k]=z;max=Math.max(max,z);
 }
 const p=zero(m.V);let sum=0;
 for(let k=0;k<m.V;k++){p[k]=Math.exp(logits[k]-max);sum+=p[k]}
 for(let k=0;k<m.V;k++)p[k]/=sum;
 return {p,h};
}
function sampleIndex(prob,temp,prior){
 const picks=[];
 for(let i=3;i<prob.length;i++){
   const penalty=prior.filter(x=>x===i).length;
   picks.push({i,v:Math.pow(Math.max(prob[i],1e-12),1/temp)*Math.pow(.6,penalty)});
 }
 // Allow EOS when answer has at least 4 words, but discourage very early stop.
 picks.push({i:1,v:prior.length>=4?Math.pow(Math.max(prob[1],1e-12),1/temp):0});
 picks.sort((a,b)=>b.v-a.v);const top=picks.slice(0,9);
 let sum=0;for(const x of top)sum+=x.v;
 let p=Math.random()*sum;
 for(const x of top){p-=x.v;if(p<=0)return x.i}
 return top[0]?.i??1;
}
function respond(question,temp=.7){
 if(!model||updates<1)return {reply:"Treine o gerador na aba Gerar respostas antes de usá-lo.",mode:"untrained"};
 const q=knownQuestion(question);
 if(q.tokens<2||q.coverage<.45||q.qids.length<2){
  return {reply:"Não conheço palavras suficientes dessa pergunta. Adicione exemplos ao gerador e treine novamente.",mode:"unknown",coverage:q.coverage};
 }
 const qvec=questionVector(q.qids);let h=zero(H),prev=0;
 const result=[],maxTokens=35;
 for(let t=0;t<maxTokens;t++){
  const state=nextDistribution(qvec,prev,h);
  const k=sampleIndex(state.p,temp,result);
  h=state.h;if(k===1)break;
  result.push(k);prev=k;
 }
 const tokens=result.map(i=>model.vocab[i]).filter(x=>x!==UNK);
 return {reply:detok(tokens)||"A rede não conseguiu construir uma resposta.",
   mode:"generated",coverage:q.coverage,length:tokens.length};
}
function persist(){
 if(!model)return;
 try{
  const saved={v:VERSION,sig:corpusSig,updates,curves:curves.slice(-80),vocab:model.vocab};
  for(const key of params)saved[key]=Array.from(model[key]);
  localStorage.setItem(WEIGHT_KEY,JSON.stringify(saved));
  $("genNote").textContent="Pesos próprios salvos no navegador.";
 }catch{$("genNote").textContent="Falha ao salvar pesos no dispositivo."}
}
function restore(){
 try{
  const saved=JSON.parse(localStorage.getItem(WEIGHT_KEY)||"null");
  if(!saved||saved.v!==VERSION||saved.sig!==fingerprint($("genExamples").value))return false;
  initialize($("genExamples").value);
  if(JSON.stringify(saved.vocab)!==JSON.stringify(model.vocab))return false;
  for(const key of params){
   if(!Array.isArray(saved[key])||saved[key].length!==model[key].length||saved[key].some(x=>!Number.isFinite(x)))return false;
  }
  for(const key of params)model[key]=Float64Array.from(saved[key]);
  updates=Number.isSafeInteger(saved.updates)&&saved.updates>=0?saved.updates:0;
  curves=Array.isArray(saved.curves)?saved.curves.filter(x=>x&&Number.isFinite(x.n)&&Number.isFinite(x.tr)&&Number.isFinite(x.val)).slice(-80):[];
  refresh();return true;
 }catch{return false}
}
function refresh(){
 if(!model)return;
 $("genTokens").textContent=model.V.toLocaleString("pt-BR");
 $("genParams").textContent=params.reduce((sum,key)=>sum+model[key].length,0).toLocaleString("pt-BR");
 $("genSteps").textContent=updates.toLocaleString("pt-BR");
 $("genTrainLoss").textContent=meanLoss(train)?.toFixed(3)??"—";
 $("genValLoss").textContent=meanLoss(holdout)?.toFixed(3)??"—";
 $("genModelLabel").textContent=updates>0?"Treinado":"Pesos aleatórios";
 chart();
}
function chart(){
 const canvas=$("genPlot"),ctx=canvas.getContext("2d");
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 ctx.strokeStyle="#39554b";ctx.lineWidth=1;
 for(let i=1;i<5;i++){let y=i*(h-25)/5+9;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(w-10,y);ctx.stroke()}
 if(curves.length<2){ctx.fillStyle="#91aaa6";ctx.font="14px system-ui";ctx.fillText("Clique em Treinar para ver a curva de perdas",20,h/2);return}
 const low=Math.max(0,Math.min(...curves.flatMap(x=>[x.tr,x.val]))-.1);
 const high=Math.max(low+.2,...curves.flatMap(x=>[x.tr,x.val]))+.1;
 const min=curves[0].n,max=Math.max(min+1,curves[curves.length-1].n);
 for(const [key,color] of [["tr","#6ee6bb"],["val","#ffc88b"]]){
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();
  curves.forEach((x,i)=>{
   const px=13+(w-26)*(x.n-min)/(max-min);
   const py=h-15-(h-30)*(x[key]-low)/(high-low);
   if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  });ctx.stroke();
 }
}
async function trainModel(){
 if(busy)return;
 if(!model||corpusSig!==fingerprint($("genExamples").value)){
  try{initialize($("genExamples").value)}catch(e){$("genNote").textContent=e.message;return}
 }
 busy=true;$("genTrain").disabled=true;$("genReset").disabled=true;
 const loops=400,chunk=20,lr=.09;
 $("genNote").textContent="Treinando uma rede neural local, token por token...";
 try{
  if(!curves.length)curves.push({n:updates,tr:meanLoss(train),val:meanLoss(holdout)});
  for(let i=0;i<loops;i+=chunk){
   for(let n=0;n<chunk;n++)updateOne(train[Math.floor(Math.random()*train.length)],lr);
   updates+=chunk;
   $("genProgress").value=i+chunk;
   $("genProgressText").textContent=(i+chunk)+" / "+loops+" atualizações";
   if((i+chunk)%80===0){
    curves.push({n:updates,tr:meanLoss(train),val:meanLoss(holdout)});
    if(curves.length>80)curves.shift();
    refresh();
   }
   await new Promise(res=>requestAnimationFrame(res));
  }
  persist();testPrompt();
 }catch(e){$("genNote").textContent="Erro no treinamento: "+e.message}
 finally{busy=false;$("genTrain").disabled=false;$("genReset").disabled=false}
}
function testPrompt(){
 const temp=Number($("genTemp").value)||.7;
 const result=respond($("genQuestion").value,temp);
 $("genResult").textContent=result.reply;
 $("genCoverage").textContent=result.mode==="generated"?
   "Cobertura de palavras da pergunta: "+Math.round(100*result.coverage)+"%. Resposta gerada token por token; pode estar incorreta, incompleta ou sem sentido.":
   "O modelo não gerou uma resposta: "+result.mode+".";
}
function exportModel(){
 if(!model)return;
 const payload={format:"DGX-generative-RNN-v07",text:$("genExamples").value,
   updates,vocab:model.vocab,curves};
 for(const key of params)payload[key]=Array.from(model[key]);
 const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
 const uri=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=uri;a.download="dgx-gerador-neural-v07.json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1200);
}
async function importModel(){
 const input=$("genImportFile"),file=input.files?.[0];
 if(!file)return;
 try{
  if(file.size>1300000)throw Error("Arquivo excede 1,3 MB.");
  const obj=JSON.parse(await file.text());
  if(obj.format!=="DGX-generative-RNN-v07"||typeof obj.text!=="string"||obj.text.length>30000)throw Error("Formato de checkpoint inválido.");
  const parsed=parseCorpus(obj.text);
  if(JSON.stringify(parsed.vocab)!==JSON.stringify(obj.vocab))throw Error("Vocabulário incompatível.");
  const lengths={emb:parsed.vocab.length*EMB,wx:EMB*H,wq:EMB*H,wh:H*H,bh:H,
     wo:H*parsed.vocab.length,bo:parsed.vocab.length};
  for(const key of params){
   if(!Array.isArray(obj[key])||obj[key].length!==lengths[key]||obj[key].some(x=>typeof x!=="number"||!Number.isFinite(x)))throw Error("Pesos inválidos: "+key);
  }
  if(!Number.isSafeInteger(obj.updates)||obj.updates<0||obj.updates>100000000)throw Error("Treinamento inválido.");
  if(updates>0&&!confirm("Substituir os pesos do gerador por aqueles do arquivo?"))return;
  $("genExamples").value=obj.text;initialize(obj.text);
  for(const key of params)model[key]=Float64Array.from(obj[key]);
  updates=obj.updates;
  curves=Array.isArray(obj.curves)?obj.curves.filter(x=>Number.isFinite(x.n)&&Number.isFinite(x.tr)&&Number.isFinite(x.val)).slice(-80):[];
  try{localStorage.setItem(DATA_KEY,obj.text)}catch{}
  persist();refresh();testPrompt();
  $("genNote").textContent="Checkpoint importado com os pesos originais.";
 }catch(e){$("genNote").textContent="Importação recusada: "+e.message}
 finally{input.value=""}
}
function resetModel(){
 if(busy)return;
 try{
  initialize($("genExamples").value);
  try{localStorage.removeItem(WEIGHT_KEY)}catch{}
  $("genNote").textContent="Pesos reiniciados aleatoriamente. Os exemplos foram preservados.";
 }catch(e){$("genNote").textContent=e.message}
}
function init(){
 const ta=$("genExamples");if(!ta)return;
 ta.value=DEFAULT;
 try{const x=localStorage.getItem(DATA_KEY);if(x&&x.length<30000)ta.value=x}catch{}
 $("genQuestion").value="como a ia aprende";
 $("genTrain").onclick=trainModel;
 $("genReset").onclick=()=>{if(updates>0&&!confirm("Reiniciar os pesos treinados do gerador?"))return;resetModel()};
 $("genGenerate").onclick=testPrompt;
 $("genExport").onclick=exportModel;
 $("genImport").onclick=()=>$("genImportFile").click();
 $("genImportFile").onchange=importModel;
 $("genTemp").oninput=()=>$("genTempValue").textContent=Number($("genTemp").value).toFixed(1);
 ta.onchange=()=>{
  try{localStorage.setItem(DATA_KEY,ta.value)}catch{}
  model=null;updates=0;curves=[];
  $("genNote").textContent="Exemplos alterados. Clique em Treinar para iniciar novos pesos.";
  $("genModelLabel").textContent="Treinamento necessário";
 };
 if(restore())$("genNote").textContent="Pesos treinados restaurados neste navegador.";
 else{try{initialize(ta.value);$("genNote").textContent="Pesos aleatórios, prontos para treinar."}catch(e){$("genNote").textContent=e.message}}
 testPrompt();
}
window.DGXGenerator={respond,isReady:()=>Boolean(model&&updates>0&&corpusSig===fingerprint($("genExamples").value)),
 train:trainModel,losses:()=>({train:meanLoss(train),validation:meanLoss(holdout),updates})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();