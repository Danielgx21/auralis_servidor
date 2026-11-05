/* DGX LLM — mini-rede neural autotreinável v0.3.
   Tudo acontece no navegador, sem API de IA, WebGPU ou serviços pagos.
   Modelo: embeddings de 3 caracteres -> camada tanh -> softmax.
   Objetivo didático: demonstrar backpropagation e inferência.
   NÃO é uma LLM Transformer e não possui raciocínio conversacional.
*/
(() => {
"use strict";
const $ = id => document.getElementById(id);
const KEY = "dgx_nn_character_v03";
const D = 8, C = 3, H = 32, MAX_VOCAB = 90;
const DEFAULT_TEXT = [
  "A ciencia observa o mundo e testa hipoteses com experimentos.",
  "A inteligencia artificial aprende com exemplos e ajusta parametros.",
  "Uma rede neural transforma numeros em probabilidades.",
  "O treinamento compara previsoes com respostas esperadas.",
  "Uma pergunta pode exigir memoria, logica e verificacao.",
  "A DGX LLM e um projeto para estudar redes neurais.",
  "O objetivo e aprender, experimentar e medir resultados.",
  "Os parametros mudam quando a rede recebe exemplos novos."
].join("\n").repeat(5);
let model = null, train = [], valid = [], trained = 0, busy = false;
let curves = [], rng = Math.random;

function randn(){
  const a = Math.max(1e-9, Math.random()), b = Math.random();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2*Math.PI*b);
}
function num(x) {return Number.isFinite(x) ? x.toFixed(3) : "—";}
function makeSamples(ids) {
  const tr = [], va = [];
  for(let i=C; i<ids.length; i++) {
    const sample={input:ids.slice(i-C,i), target:ids[i]};
    (i%11===0?va:tr).push(sample);
  }
  return [tr,va.length?va:tr.slice(0,20)];
}
function setModel(text) {
  text=String(text||"").slice(0,12000);
  if (text.length < 120) throw Error("Insira pelo menos 120 caracteres de texto para treinar.");
  const chars=[...new Set(Array.from(text))].sort();
  if (chars.length < 8) throw Error("Use um texto com pelo menos 8 caracteres diferentes.");
  if (chars.length > MAX_VOCAB) throw Error("O texto contém muitos caracteres diferentes ("+chars.length+"). O limite deste experimento é "+MAX_VOCAB+".");
  const idMap=new Map(chars.map((ch,i)=>[ch,i]));
  const ids=Array.from(text, c=>idMap.get(c));
  const [tr, va]=makeSamples(ids);
  const V=chars.length;
  model={
    chars, V,
    emb:Float32Array.from({length:V*D},()=>randn()*0.12),
    w1:Float32Array.from({length:C*D*H},()=>randn()*0.12),
    b1:new Float32Array(H),
    w2:Float32Array.from({length:H*V},()=>randn()*0.08),
    b2:new Float32Array(V)
  };
  [train,valid]=[tr,va];trained=0;curves=[];updateUI();
}
function forward(input) {
  const m=model, V=m.V, E=C*D;
  const x=new Float32Array(E);
  for(let c=0;c<C;c++)
    for(let k=0;k<D;k++)x[c*D+k]=m.emb[input[c]*D+k];
  const h=new Float32Array(H);
  for(let j=0;j<H;j++){
    let sum=m.b1[j];
    for(let p=0;p<E;p++)sum+=x[p]*m.w1[p*H+j];
    h[j]=Math.tanh(sum);
  }
  const probs=new Float64Array(V);
  let max=-Infinity;
  for(let k=0;k<V;k++){
    let z=m.b2[k];
    for(let j=0;j<H;j++)z+=h[j]*m.w2[j*V+k];
    probs[k]=z;if(z>max)max=z;
  }
  let sum=0;
  for(let k=0;k<V;k++){probs[k]=Math.exp(probs[k]-max);sum+=probs[k];}
  for(let k=0;k<V;k++)probs[k]/=sum;
  return {x,h,probs};
}
function step(example, lr){
  const m=model,V=m.V,E=C*D;
  const {x,h,probs}=forward(example.input);
  const loss=-Math.log(Math.max(1e-12,probs[example.target]));
  const dz=Float64Array.from(probs);dz[example.target]-=1;
  const dh=new Float64Array(H), da=new Float64Array(H), dx=new Float64Array(E);
  for(let j=0;j<H;j++){
    let v=0;for(let k=0;k<V;k++)v+=dz[k]*m.w2[j*V+k];
    dh[j]=v;da[j]=v*(1-h[j]*h[j]);
  }
  for(let p=0;p<E;p++){
    let v=0;for(let j=0;j<H;j++)v+=da[j]*m.w1[p*H+j];
    dx[p]=v;
  }
  // Calculate all gradients before changing any weights.
  for(let j=0;j<H;j++)for(let k=0;k<V;k++)
    m.w2[j*V+k]-=lr*dz[k]*h[j];
  for(let k=0;k<V;k++)m.b2[k]-=lr*dz[k];
  for(let p=0;p<E;p++)for(let j=0;j<H;j++)
    m.w1[p*H+j]-=lr*da[j]*x[p];
  for(let j=0;j<H;j++)m.b1[j]-=lr*da[j];
  for(let c=0;c<C;c++)for(let k=0;k<D;k++)
    m.emb[example.input[c]*D+k]-=lr*dx[c*D+k];
  return loss;
}
function evalLoss(samples){
  if(!samples.length)return 0;
  let sum=0;
  const stride=Math.max(1,Math.floor(samples.length/180));
  let count=0;
  for(let i=0;i<samples.length;i+=stride){
    const s=samples[i];
    sum-=Math.log(Math.max(1e-12,forward(s.input).probs[s.target]));
    count++;
  }
  return sum/count;
}
function getCurrentText() {return $("nnText").value.slice(0,12000);}
function getFingerprint(t) {
  // Non-cryptographic version marker; NOT a security hash.
  let x=2166136261;
  for(let i=0;i<t.length;i++){x=Math.imul(x^t.charCodeAt(i),16777619);}
  return String(x>>>0)+":"+t.length;
}
function saveModel(){
  if(!model)return;
  try{
    localStorage.setItem(KEY,JSON.stringify({
      version:3,signature:getFingerprint(getCurrentText()),
      chars:model.chars,trained,curves:curves.slice(-70),
      emb:Array.from(model.emb),w1:Array.from(model.w1),b1:Array.from(model.b1),
      w2:Array.from(model.w2),b2:Array.from(model.b2)
    }));
    $("nnSave").textContent="Pesos salvos neste navegador";
  }catch{ $("nnSave").textContent="Armazenamento indisponível"; }
}
function restoreModel(){
  try{
    const obj=JSON.parse(localStorage.getItem(KEY)||"null");
    if(!obj||obj.version!==3||obj.signature!==getFingerprint(getCurrentText()))return false;
    const chars=[...new Set(Array.from(getCurrentText()))].sort(), V=chars.length;
    if(obj.chars.join("")!==chars.join("")||obj.emb.length!==V*D||
       obj.w1.length!==C*D*H||obj.w2.length!==H*V||
       obj.b1.length!==H||obj.b2.length!==V)return false;
    const arrays=["emb","w1","b1","w2","b2"];
    if(arrays.some(k=>!Array.isArray(obj[k])||obj[k].some(n=>!Number.isFinite(n))))return false;
    model={chars,V};
    arrays.forEach(k=>model[k]=Float32Array.from(obj[k]));
    const ids=Array.from(getCurrentText(),c=>chars.indexOf(c));
    [train,valid]=makeSamples(ids);
    trained=Number.isSafeInteger(obj.trained)?obj.trained:0;
    curves=Array.isArray(obj.curves)?obj.curves.filter(v=>Number.isFinite(v.t)&&Number.isFinite(v.tr)&&Number.isFinite(v.val)).slice(-70):[];
    updateUI();return true;
  }catch{return false}
}
function reset(){
  if(busy)return;
  try{setModel(getCurrentText());$("nnSave").textContent="Pesos aleatórios criados";}catch(e){$("nnSave").textContent=e.message;}
}
function prediction(context){
  if(!model)return [];
  const map=new Map(model.chars.map((ch,i)=>[ch,i]));
  const fallback=map.get(" ")??0;
  const ids=Array.from(context).slice(-C).map(ch=>map.get(ch)??fallback);
  while(ids.length<C)ids.unshift(fallback);
  return Array.from(forward(ids).probs).map((p,i)=>({char:model.chars[i],p}))
    .sort((a,b)=>b.p-a.p);
}
function updatePredictions(){
  if(!model)return;
  const predictions=prediction($("nnPrompt").value).slice(0,7);
  $("nnPredictions").replaceChildren();
  for(const item of predictions){
    const line=document.createElement("div");line.className="barline";
    const tok=document.createElement("span");tok.className="token";
    tok.textContent=JSON.stringify(item.char);
    const track=document.createElement("div");track.className="track";
    const bar=document.createElement("div");bar.className="fill";
    bar.style.width=(item.p*100).toFixed(1)+"%";track.append(bar);
    const pct=document.createElement("span");pct.className="pct";
    pct.textContent=(item.p*100).toFixed(1)+"%";
    line.append(tok,track,pct);$("nnPredictions").append(line);
  }
}
function plot(){
  const canvas=$("nnChart"), ctx=canvas.getContext("2d");
  const width=canvas.width,height=canvas.height;
  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle="#39524b";ctx.lineWidth=1;
  for(let i=1;i<5;i++){
    const y=12+i*(height-32)/5;
    ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(width-8,y);ctx.stroke();
  }
  if(!curves.length){ctx.fillStyle="#8eaaa1";ctx.font="14px system-ui";ctx.fillText("Treine o modelo para ver a curva de perda",18,height/2);return;}
  const low=Math.max(0,Math.min(...curves.map(p=>Math.min(p.tr,p.val)))-0.2);
  const high=Math.max(low+0.5,...curves.map(p=>Math.max(p.tr,p.val)))+0.2;
  const xmax=Math.max(1,curves.at(-1).t);
  for(const [field,color] of [["tr","#73e6c1"],["val","#ffcd84"]]){
    ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.beginPath();
    curves.forEach((p,i)=>{
      const x=14+(width-30)*p.t/xmax;
      const y=height-18-(height-38)*(p[field]-low)/(high-low);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });ctx.stroke();
  }
}
function updateUI(){
  if(!model)return;
  const params=model.emb.length+model.w1.length+model.b1.length+model.w2.length+model.b2.length;
  $("nnParams").textContent=params.toLocaleString("pt-BR");
  $("nnVocab").textContent=model.V;
  $("nnSteps").textContent=trained.toLocaleString("pt-BR");
  $("nnLoss").textContent=num(evalLoss(train));
  $("nnValLoss").textContent=num(evalLoss(valid));
  updatePredictions();plot();
}
function generate(){
  if(!model)return;
  const map=new Map(model.chars.map((ch,i)=>[ch,i]));
  const fallback=map.get(" ")??0;
  let out=$("nnPrompt").value||"A ";
  const temp=Number($("nnTemp").value)||0.8;
  let ids=Array.from(out).slice(-C).map(ch=>map.get(ch)??fallback);
  while(ids.length<C)ids.unshift(fallback);
  for(let n=0;n<160;n++){
    const p=forward(ids).probs,weights=new Float64Array(p.length);
    let total=0;
    for(let i=0;i<p.length;i++){weights[i]=Math.pow(Math.max(p[i],1e-10),1/temp);total+=weights[i];}
    let chosen=weights.length-1,v=Math.random()*total;
    for(let k=0;k<weights.length;k++){v-=weights[k];if(v<=0){chosen=k;break;}}
    out+=model.chars[chosen];
    ids=[ids[1],ids[2],chosen];
  }
  $("nnGenerated").textContent=out;
}
async function runTraining(){
  if(busy)return;
  if(!model){reset();if(!model)return;}
  busy=true;$("nnTrain").disabled=true;$("nnReset").disabled=true;
  const loops=400, chunk=20, lr=0.055;
  $("nnSave").textContent="Treinando apenas neste dispositivo...";
  try{
    if(!curves.length)curves.push({t:trained,tr:evalLoss(train),val:evalLoss(valid)});
    for(let j=0;j<loops;j+=chunk){
      for(let n=0;n<chunk;n++)step(train[Math.floor(Math.random()*train.length)],lr);
      trained+=chunk;
      $("nnProgress").value=j+chunk;
      $("nnProgress").max=loops;
      $("nnProgressLabel").textContent=(j+chunk)+" / "+loops+" ajustes";
      if((j+chunk)%80===0||j+chunk===loops){
        curves.push({t:trained,tr:evalLoss(train),val:evalLoss(valid)});
        if(curves.length>70)curves.shift();
        updateUI();
      }
      // Allow UI to redraw and remain usable on mobile.
      await new Promise(r=>requestAnimationFrame(r));
    }
    saveModel();generate();
  }catch(e){$("nnSave").textContent="Erro no treino: "+e.message;}
  finally{busy=false;$("nnTrain").disabled=false;$("nnReset").disabled=false;}
}
function init(){
  const n=$("nnText");if(!n)return;
  n.value=DEFAULT_TEXT;
  // Save custom text only in this browser.
  const stored=localStorage.getItem("dgx_nn_text_v03");
  if(stored && stored.length<=12000)n.value=stored;
  $("nnPrompt").value="A cien";
  $("nnTrain").onclick=runTraining;
  $("nnReset").onclick=()=>{
    if(trained>0&&!confirm("Apagar os pesos treinados e recomeçar com pesos aleatórios?"))return;
    localStorage.removeItem(KEY);reset();
  };
  $("nnGenerate").onclick=generate;
  $("nnPrompt").oninput=updatePredictions;
  $("nnText").onchange=()=>{
    try{localStorage.setItem("dgx_nn_text_v03",getCurrentText())}catch{}
    model=null; $("nnSave").textContent="Texto alterado. Clique em Reiniciar para treinar com este texto.";
  };
  $("nnTemp").oninput=()=>{$("nnTempValue").textContent=Number($("nnTemp").value).toFixed(1)};
  if(restoreModel())$("nnSave").textContent="Pesos anteriores restaurados deste navegador";
  else reset();
  generate();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();