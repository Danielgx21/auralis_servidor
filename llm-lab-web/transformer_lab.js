/* DGX LLM v0.4 — um bloco Transformer didático, do zero.
   Uma cabeça de self-attention causal (somente a consulta final),
   embeddings de token + posição, conexão residual, feed-forward,
   softmax e retropropagação analítica completa.
   Treinamento e pesos ficam exclusivamente neste navegador.
   É um preditor de caracteres, NÃO uma LLM conversacional.
*/
(() => {
"use strict";
const $ = id => document.getElementById(id);
const STORE="dgx_transformer_v04", TEXT_STORE="dgx_transformer_text_v04";
const T=4,D=8,F=16,V_LIMIT=90,SQRT=Math.sqrt(D);
const DEFAULT=[
 "A ciencia testa ideias com observacoes e experimentos.",
 "Um modelo aprende ao comparar suas previsoes com exemplos.",
 "O Transformer usa atencao para relacionar partes do texto.",
 "Treinar muda os pesos numericos de uma rede neural.",
 "A DGX LLM investiga como surge a capacidade de prever.",
 "Hipoteses precisam ser testadas em dados diferentes.",
 "Uma boa resposta apresenta evidencias e limites."
].join("\n").repeat(6);
const names=["emb","pos","q","k","v","ff1","fb1","ff2","fb2","out","ob"];
let net=null,train=[],holdout=[],steps=0,curve=[],working=false;

function gaussian(){
 const a=Math.max(1e-9,Math.random()),b=Math.random();
 return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b);
}
function zeros(n){return new Float64Array(n)}
function base(){
 const text=$("tfText").value.slice(0,12000);
 if(text.length<200)throw Error("Use pelo menos 200 caracteres no texto.");
 const chars=[...new Set(Array.from(text))].sort(), V=chars.length;
 if(V<10||V>V_LIMIT)throw Error("Use de 10 a "+V_LIMIT+" caracteres diferentes. Encontrados: "+V);
 const vocab=new Map(chars.map((s,i)=>[s,i]));
 const ids=Array.from(text,c=>vocab.get(c));
 // Hold out the final 20% by contiguous region; no input context from training is reused.
 const pivot=Math.floor(ids.length*.8);
 train=[]; holdout=[];
 for(let i=T;i<pivot;i++)train.push({x:ids.slice(i-T,i),y:ids[i]});
 for(let i=pivot+T;i<ids.length;i++)holdout.push({x:ids.slice(i-T,i),y:ids[i]});
 if(train.length<100||holdout.length<20)throw Error("Amostra muito pequena para treino e validação.");
 const n={chars,V,emb:zeros(V*D),pos:zeros(T*D),
 q:zeros(D*D),k:zeros(D*D),v:zeros(D*D),
 ff1:zeros(D*F),fb1:zeros(F),ff2:zeros(F*D),fb2:zeros(D),
 out:zeros(D*V),ob:zeros(V)};
 for(const key of ["emb","pos","q","k","v","ff1","ff2","out"]){
   const factor=key==="pos"?.015: key==="emb"?.12: key==="out"?.08:.11;
   for(let i=0;i<n[key].length;i++)n[key][i]=gaussian()*factor;
 }
 net=n;steps=0;curve=[];metrics();return net;
}
function signature(text){let v=2166136261;for(let i=0;i<text.length;i++)v=Math.imul(v^text.charCodeAt(i),16777619);return (v>>>0)+":"+text.length;}
function loadSaved(){
 try {
  const saved=JSON.parse(localStorage.getItem(STORE)||"null");
  if(!saved||saved.v!==4||saved.sig!==signature($("tfText").value))return false;
  base();
  if(saved.chars.join("")!==net.chars.join(""))return false;
  for(const key of names){
   if(!Array.isArray(saved[key])||saved[key].length!==net[key].length||
      saved[key].some(x=>!Number.isFinite(x)))return false;
  }
  for(const key of names)net[key]=Float64Array.from(saved[key]);
  steps=Number.isSafeInteger(saved.steps)&&saved.steps>=0?saved.steps:0;
  curve=Array.isArray(saved.curve)?saved.curve.filter(p=>p&&Number.isFinite(p.n)&&Number.isFinite(p.a)&&Number.isFinite(p.b)).slice(-90):[];
  metrics();return true;
 }catch{return false}
}
function save(){
 if(!net)return;
 const obj={v:4,sig:signature($("tfText").value),chars:net.chars,steps,curve:curve.slice(-90)};
 for(const key of names)obj[key]=Array.from(net[key]);
 try{localStorage.setItem(STORE,JSON.stringify(obj));$("tfNote").textContent="Pesos salvos neste navegador.";}
 catch{$("tfNote").textContent="Não foi possível salvar neste navegador."}
}
function forward(ids){
 const n=net,V=n.V;
 const X=Array.from({length:T},()=>zeros(D));
 for(let t=0;t<T;t++)for(let i=0;i<D;i++)
   X[t][i]=n.emb[ids[t]*D+i]+n.pos[t*D+i];
 const Q=zeros(D),K=Array.from({length:T},()=>zeros(D)),Val=Array.from({length:T},()=>zeros(D));
 // Last query is causally allowed to attend to positions 0..T-1.
 for(let i=0;i<D;i++)for(let d=0;d<D;d++){
   Q[d]+=X[T-1][i]*n.q[i*D+d];
   for(let t=0;t<T;t++){
     K[t][d]+=X[t][i]*n.k[i*D+d];
     Val[t][d]+=X[t][i]*n.v[i*D+d];
   }
 }
 const scores=zeros(T);let largest=-Infinity;
 for(let t=0;t<T;t++){
   for(let d=0;d<D;d++)scores[t]+=Q[d]*K[t][d]/SQRT;
   largest=Math.max(largest,scores[t]);
 }
 const A=zeros(T);let sum=0;
 for(let t=0;t<T;t++){A[t]=Math.exp(scores[t]-largest);sum+=A[t]}
 for(let t=0;t<T;t++)A[t]/=sum;
 const Z=zeros(D);
 for(let d=0;d<D;d++){
   Z[d]=X[T-1][d]; // residual
   for(let t=0;t<T;t++)Z[d]+=A[t]*Val[t][d];
 }
 const U=zeros(F);
 for(let j=0;j<F;j++){
   let a=n.fb1[j];for(let d=0;d<D;d++)a+=Z[d]*n.ff1[d*F+j];
   U[j]=Math.tanh(a);
 }
 const H=Float64Array.from(Z);
 for(let d=0;d<D;d++){
   H[d]+=n.fb2[d];
   for(let j=0;j<F;j++)H[d]+=U[j]*n.ff2[j*D+d];
 }
 const logits=zeros(V);largest=-Infinity;
 for(let a=0;a<V;a++){
   let value=n.ob[a];
   for(let d=0;d<D;d++)value+=H[d]*n.out[d*V+a];
   logits[a]=value;largest=Math.max(largest,value);
 }
 const P=zeros(V);sum=0;
 for(let a=0;a<V;a++){P[a]=Math.exp(logits[a]-largest);sum+=P[a]}
 for(let a=0;a<V;a++)P[a]/=sum;
 return {X,Q,K,Val,A,Z,U,H,P};
}
function gradient(ex,lr){
 const n=net,V=n.V;
 const f=forward(ex.x), G={};
 for(const key of names)G[key]=zeros(n[key].length);
 const dz=Float64Array.from(f.P);dz[ex.y]-=1;
 let loss=-Math.log(Math.max(1e-12,f.P[ex.y]));
 const dH=zeros(D);
 for(let d=0;d<D;d++){
  for(let a=0;a<V;a++){
   G.out[d*V+a]+=f.H[d]*dz[a];
   dH[d]+=n.out[d*V+a]*dz[a];
  }
 }
 for(let a=0;a<V;a++)G.ob[a]+=dz[a];
 const dZ=Float64Array.from(dH),dU=zeros(F);
 for(let d=0;d<D;d++){
  G.fb2[d]+=dH[d];
  for(let j=0;j<F;j++){
   G.ff2[j*D+d]+=f.U[j]*dH[d];
   dU[j]+=n.ff2[j*D+d]*dH[d];
  }
 }
 for(let j=0;j<F;j++){
   const ds=dU[j]*(1-f.U[j]*f.U[j]);
   G.fb1[j]+=ds;
   for(let d=0;d<D;d++){
     G.ff1[d*F+j]+=f.Z[d]*ds;
     dZ[d]+=n.ff1[d*F+j]*ds;
   }
 }
 const dX=Array.from({length:T},()=>zeros(D));
 const dA=zeros(T),dVal=Array.from({length:T},()=>zeros(D));
 for(let d=0;d<D;d++)dX[T-1][d]+=dZ[d]; // residual
 for(let t=0;t<T;t++)for(let d=0;d<D;d++){
   dVal[t][d]+=f.A[t]*dZ[d];
   dA[t]+=dZ[d]*f.Val[t][d];
 }
 let weighted=0;for(let t=0;t<T;t++)weighted+=f.A[t]*dA[t];
 const dScore=zeros(T),dQ=zeros(D),dK=Array.from({length:T},()=>zeros(D));
 for(let t=0;t<T;t++){
   dScore[t]=f.A[t]*(dA[t]-weighted);
   for(let d=0;d<D;d++){
     dQ[d]+=dScore[t]*f.K[t][d]/SQRT;
     dK[t][d]+=dScore[t]*f.Q[d]/SQRT;
   }
 }
 for(let i=0;i<D;i++)for(let d=0;d<D;d++){
   G.q[i*D+d]+=f.X[T-1][i]*dQ[d];
   dX[T-1][i]+=n.q[i*D+d]*dQ[d];
   for(let t=0;t<T;t++){
     G.k[i*D+d]+=f.X[t][i]*dK[t][d];
     G.v[i*D+d]+=f.X[t][i]*dVal[t][d];
     dX[t][i]+=n.k[i*D+d]*dK[t][d]+n.v[i*D+d]*dVal[t][d];
   }
 }
 for(let t=0;t<T;t++)for(let d=0;d<D;d++){
   G.pos[t*D+d]+=dX[t][d];
   G.emb[ex.x[t]*D+d]+=dX[t][d];
 }
 // Clip global gradient norm to avoid unstable user-provided datasets.
 let norm=0;for(const key of names)for(const x of G[key])norm+=x*x;
 const clip=Math.min(1,1.5/Math.max(1e-12,Math.sqrt(norm)));
 for(const key of names)
   for(let i=0;i<n[key].length;i++)n[key][i]-=lr*clip*G[key][i];
 return loss;
}
function meanLoss(data){
 if(!data.length)return NaN;
 let sum=0,count=0,skip=Math.max(1,Math.floor(data.length/120));
 for(let i=0;i<data.length;i+=skip){
   sum-=Math.log(Math.max(1e-12,forward(data[i].x).P[data[i].y]));
   count++;
 }
 return sum/count;
}
function context(str){
 const map=new Map(net.chars.map((c,i)=>[c,i])),fallback=map.get(" ")??0;
 const letters=Array.from(str).slice(-T).map(c=>map.get(c)??fallback);
 while(letters.length<T)letters.unshift(fallback);
 return letters;
}
function bars(){
 if(!net)return;
 const ids=context($("tfPrompt").value), f=forward(ids);
 const pred=Array.from(f.P).map((p,i)=>({c:net.chars[i],p})).sort((a,b)=>b.p-a.p).slice(0,6);
 const el=$("tfPredict");el.replaceChildren();
 for(const v of pred){
   const row=document.createElement("div");row.className="barline";
   const lab=document.createElement("span");lab.className="token";lab.textContent=JSON.stringify(v.c);
   const track=document.createElement("div");track.className="track";
   const fill=document.createElement("div");fill.className="fill";fill.style.width=(v.p*100)+"%";
   track.append(fill);
   const p=document.createElement("span");p.className="pct";p.textContent=(v.p*100).toFixed(1)+"%";
   row.append(lab,track,p);el.append(row);
 }
 const attention=$("tfAttention");attention.replaceChildren();
 for(let t=0;t<T;t++){
   const row=document.createElement("div");row.className="barline";
   const lab=document.createElement("span");lab.className="token";lab.textContent=JSON.stringify(net.chars[ids[t]]);
   const track=document.createElement("div");track.className="track";
   const fill=document.createElement("div");fill.className="fill";
   fill.style.width=(f.A[t]*100)+"%";
   track.append(fill);
   const p=document.createElement("span");p.className="pct";p.textContent=(f.A[t]*100).toFixed(1)+"%";
   row.append(lab,track,p);attention.append(row);
 }
}
function makeText(){
 if(!net)return;
 let out=$("tfPrompt").value||"A ",ids=context(out), temp=parseFloat($("tfTemp").value)||.9;
 const maxlen=140;
 for(let j=0;j<maxlen;j++){
   const p=forward(ids).P, weights=Float64Array.from(p,v=>Math.pow(Math.max(v,1e-10),1/temp));
   let sum=0;for(const w of weights)sum+=w;
   let v=Math.random()*sum,next=weights.length-1;
   for(let k=0;k<weights.length;k++){v-=weights[k];if(v<=0){next=k;break}}
   out+=net.chars[next];
   ids=[ids[1],ids[2],ids[3],next];
 }
 $("tfGenerated").textContent=out;
}
function chart(){
 const el=$("tfCurve"),ctx=el.getContext("2d");
 const w=el.width,h=el.height;
 ctx.clearRect(0,0,w,h);ctx.lineWidth=1;ctx.strokeStyle="#38544c";
 for(let j=1;j<5;j++){let y=15+j*(h-35)/5;ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(w-10,y);ctx.stroke()}
 if(!curve.length){ctx.fillStyle="#91aaa6";ctx.font="14px system-ui";ctx.fillText("Treine o Transformer para acompanhar o erro",22,h/2);return}
 const lo=Math.max(0,Math.min(...curve.flatMap(v=>[v.a,v.b]))-.2),hi=Math.max(lo+.5,...curve.flatMap(v=>[v.a,v.b]))+.2;
 const last=Math.max(1,curve.at(-1).n);
 for(const [key,color] of [["a","#6ee6bb"],["b","#fbc88d"]]){
   ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.beginPath();
   for(let i=0;i<curve.length;i++){
     const p=curve[i],x=15+(w-30)*p.n/last,y=h-18-(h-38)*(p[key]-lo)/(hi-lo);
     i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
   }ctx.stroke();
 }
}
function metrics(){
 if(!net)return;
 $("tfParams").textContent=names.reduce((s,k)=>s+net[k].length,0).toLocaleString("pt-BR");
 $("tfVocab").textContent=net.V;
 $("tfSteps").textContent=steps.toLocaleString("pt-BR");
 $("tfTrainLoss").textContent=meanLoss(train).toFixed(3);
 $("tfValLoss").textContent=meanLoss(holdout).toFixed(3);
 bars();chart();
}
async function fit(){
 if(working)return;
 if(!net){try{base()}catch(e){$("tfNote").textContent=e.message;return}}
 working=true;$("tfTrain").disabled=true;$("tfReset").disabled=true;
 const loops=350,chunk=25,lr=.055;
 $("tfNote").textContent="Treinamento local em andamento...";
 try{
   if(!curve.length)curve.push({n:steps,a:meanLoss(train),b:meanLoss(holdout)});
   for(let i=0;i<loops;i+=chunk){
     for(let k=0;k<chunk;k++)gradient(train[Math.floor(Math.random()*train.length)],lr);
     steps+=chunk;
     $("tfProgress").value=i+chunk;$("tfProgress").max=loops;
     $("tfProgressLabel").textContent=(i+chunk)+" / "+loops+" ajustes";
     if((i+chunk)%70===0||i+chunk===loops){
       curve.push({n:steps,a:meanLoss(train),b:meanLoss(holdout)});
       if(curve.length>90)curve.shift();
       metrics();
     }
     await new Promise(resolve=>requestAnimationFrame(resolve));
   }
   save();makeText();
 }catch(e){$("tfNote").textContent="Falha no treino: "+e.message}
 finally{working=false;$("tfTrain").disabled=false;$("tfReset").disabled=false}
}
function reset(){
 if(working)return;
 try{base();$("tfNote").textContent="Pesos aleatórios inicializados. Pronto para treinar.";makeText()}
 catch(e){$("tfNote").textContent=e.message}
}
function download(){
 if(!net)return;
 const exportData={version:4,architecture:"DGX-mini-causal-attention-1head",text:$("tfText").value,
   steps,curve,chars:net.chars};
 for(const key of names)exportData[key]=Array.from(net[key]);
 const blob=new Blob([JSON.stringify(exportData)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="dgx-transformer-checkpoint.json";
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 if(!$("tfText"))return;
 $("tfText").value=DEFAULT;
 try{const value=localStorage.getItem(TEXT_STORE);if(value&&value.length<=12000)$("tfText").value=value}catch{}
 $("tfPrompt").value="A cien";
 $("tfTrain").onclick=fit;
 $("tfReset").onclick=()=>{
   if(steps&&!confirm("Descartar os pesos do Transformer treinado?"))return;
   try{localStorage.removeItem(STORE)}catch{}reset()
 };
 $("tfDownload").onclick=download;
 $("tfGenerate").onclick=makeText;
 $("tfPrompt").oninput=bars;
 $("tfTemp").oninput=()=>{$("tfTempLabel").textContent=Number($("tfTemp").value).toFixed(1)};
 $("tfText").onchange=()=>{
   try{localStorage.setItem(TEXT_STORE,$("tfText").value.slice(0,12000))}catch{}
   net=null;steps=0;curve=[];$("tfNote").textContent="Texto alterado. Reinicie os pesos para usar este conjunto.";
 };
 if(loadSaved())$("tfNote").textContent="Checkpoint anterior restaurado do navegador.";
 else reset();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
else init();
})();