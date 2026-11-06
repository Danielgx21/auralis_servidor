/* DGX v0.15 — três vozes neurais pt-BR independentes do Chrome.
 * Inicia somente por gesto explícito, nunca em segundo plano e nunca automaticamente
 * em rede móvel. Os pesos de ~295 MB são obtidos do modelo público Kokoro.
 * Texto é sintetizado localmente via MediaPipe (sem envio para TTS em nuvem).
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const KEY="dgx_briefing_prefs_v1";
const MODEL_BYTES="~295 MB";
const LABELS={
 pf_dora:"Dora — voz feminina",
 pm_alex:"Alex — voz masculina",
 pm_santa:"Santa — voz masculina"
};
const SAMPLE="Olá! Esta é uma voz diferente do DGX Meu Dia. Vou ler seu resumo diário com este locutor.";
const read=()=>window.DGXStore?.read(KEY,{})||{};
const write=values=>window.DGXStore?.write(KEY,{...read(),...values});
let worker=null,ready=false,readyPromise=null,available=[],serial=0,pending=new Map();
let context=null,activeSource=null,activePlaybackResolve=null,generation=0;
let loading=false,lastError="";
const isSelected=()=>read().voiceEngine==="neural";
const selectedVoice=()=>LABELS[read().neuralVoice]?read().neuralVoice:"pf_dora";
function status(message){const node=$("dgxNeuralStatus");if(node)node.textContent=message}
function supported(){
 return !!window.Worker && !!(window.AudioContext||window.webkitAudioContext) && !!window.isSecureContext;
}
function prepareAudio(){
 if(!context){
  const AudioContextType=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextType)throw Error("O navegador não consegue reproduzir áudio local.");
  context=new AudioContextType();
 }
 // Chamar resume() durante o toque do usuário para o Android liberar a saída.
 if(context.state==="suspended")context.resume().catch(()=>{});
}
function initWorker(){
 if(worker)return;
 worker=new Worker("/neural_voice_worker.js",{type:"module"});
 worker.onmessage=({data:m})=>{
  if(m.type==="progress"){status(m.stage);return}
  const done=pending.get(m.id);
  if(!done)return;
  pending.delete(m.id);clearTimeout(done.timer);
  if(m.type==="error")done.reject(Error(m.message||"Erro ao gerar voz."));
  else done.resolve(m);
 };
 worker.onerror=error=>{
  lastError="O motor de voz não iniciou neste navegador.";
  for(const [id,job] of pending){clearTimeout(job.timer);job.reject(Error(lastError))}
  pending.clear();
  worker?.terminate();worker=null;ready=false;readyPromise=null;
  status(lastError);
 };
}
function rpc(type,args={},timeout=240000){
 initWorker();
 const id=++serial;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{
   pending.delete(id);reject(Error("O motor não respondeu. Tente novamente usando Wi-Fi."));
  },timeout);
  pending.set(id,{resolve,reject,timer});
  worker.postMessage({type,id,...args});
 });
}
async function load(){
 if(ready)return;
 if(readyPromise)return readyPromise;
 if(!supported())throw Error("Para as vozes locais, abra o DGX em um Chrome atualizado com conexão HTTPS.");
 loading=true;lastError="";refresh();
 readyPromise=(async()=>{
  const result=await rpc("initialize",{},300000);
  available=(result.voices||[]).filter(v=>LABELS[v]);
  if(!available.length)throw Error("O modelo foi carregado, mas não disponibilizou vozes brasileiras.");
  ready=true;loading=false;lastError="";
  refresh();
 })();
 try{await readyPromise}
 catch(err){loading=false;readyPromise=null;lastError=err.message||String(err);status("Falha ao carregar as vozes: "+lastError);refresh();throw err}
}
function chunkText(text){
 const cleaned=String(text??"").replace(/\s+/g," ").trim().slice(0,1800);
 if(!cleaned)return [];
 const chunks=[];
 for(const part of cleaned.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g)||[cleaned]){
  let remaining=part.trim();
  while(remaining.length>230){
   let split=remaining.lastIndexOf(" ",230);
   if(split<80)split=230;
   chunks.push(remaining.slice(0,split).trim());remaining=remaining.slice(split).trim();
  }
  if(remaining)chunks.push(remaining);
 }
 return chunks;
}
async function audioPlay(samples,sampleRate,token){
 if(token!==generation)return;
 prepareAudio();
 if(context.state==="suspended")await context.resume();
 if(token!==generation)return;
 const pcm=new Float32Array(samples);
 if(!pcm.length)return;
 const buffer=context.createBuffer(1,pcm.length,Number(sampleRate)||24000);
 buffer.copyToChannel(pcm,0);
 const source=context.createBufferSource();
 source.buffer=buffer;source.connect(context.destination);
 activeSource=source;
 await new Promise((resolve,reject)=>{
  activePlaybackResolve=resolve;
  source.onended=()=>{
   if(activeSource===source)activeSource=null;
   activePlaybackResolve=null;resolve();
  };
  try{source.start(0)}catch(e){if(activeSource===source)activeSource=null;activePlaybackResolve=null;reject(e)}
 });
}
function cancel(){
 generation++;
 if(activeSource){try{activeSource.stop(0)}catch(e){}activeSource=null}
 if(activePlaybackResolve){activePlaybackResolve();activePlaybackResolve=null}
 // Um processamento que esteja em andamento pode terminar, mas seu áudio
 // será descartado se o usuário já interrompeu a narração.
}
async function speak(text){
 if(!isSelected())throw Error("As vozes neurais não estão ativadas.");
 const token=++generation;
 prepareAudio();
 await load();
 if(token!==generation)return;
 const pieces=chunkText(text);
 for(const part of pieces){
  if(token!==generation)return;
  const voice=selectedVoice();
  const result=await rpc("synthesize",{text:part,voice},90000);
  if(token!==generation)return;
  await audioPlay(result.samples,result.sampleRate,token);
 }
}
function refresh(){
 const select=$("dgxNeuralVoice"),activate=$("dgxNeuralActivate");
 if(!select)return;
 select.value=selectedVoice();
 if(activate){activate.disabled=loading;activate.textContent=loading?"Carregando o modelo...":ready?"Vozes preparadas":"Ativar vozes locais";}
 const test=$("dgxNeuralTest"),disable=$("dgxNeuralDisable");
 if(test)test.disabled=!ready;
 if(disable)disable.disabled=!isSelected();
 if(loading)return;
 if(lastError)status("Não foi possível iniciar: "+lastError+" A voz normal do Android continua disponível.");
 else if(isSelected())status("Motor neural "+(ready?"pronto":"selecionado, precisa carregar nesta sessão")+". Locutor: "+LABELS[selectedVoice()]+".");
 else status("Opcional: 3 vozes brasileiras com timbres próprios. Download de "+MODEL_BYTES+" ao ativar. Recomenda-se Wi-Fi.");
}
async function activate(){
 try{
  prepareAudio();
  await load();
  const voice=$("dgxNeuralVoice")?.value||"pf_dora";
  write({voiceEngine:"neural",neuralVoice:LABELS[voice]?voice:"pf_dora"});
  refresh();
  await speak(SAMPLE);
 }catch(err){
  lastError=err.message||String(err);refresh();
  window.DGXtoast?.("Voz neural indisponível: "+lastError+". Mantida a voz do Android.");
 }
}
$("dgxNeuralActivate")?.addEventListener("click",activate);
$("dgxNeuralDisable")?.addEventListener("click",()=>{
 cancel();write({voiceEngine:"system"});refresh();window.DGXtoast?.("Voz do Android selecionada.");
});
$("dgxNeuralTest")?.addEventListener("click",()=>{
 if(!isSelected())write({voiceEngine:"neural"});
 prepareAudio();refresh();
 speak(SAMPLE).catch(err=>status("Teste não concluído: "+err.message));
});
$("dgxNeuralVoice")?.addEventListener("change",()=>{
 const voice=$("dgxNeuralVoice").value;
 write({neuralVoice:voice});
 refresh();
 if(ready){
  prepareAudio();
  if(!isSelected())write({voiceEngine:"neural"});
  speak(SAMPLE).catch(err=>status("Não foi possível testar: "+err.message));
 }
});
window.DGXNeural={
 isSelected,selectedVoice,prepareAudio,speak,cancel,
 activate,refresh,isReady:()=>ready,
 options:()=>Object.entries(LABELS).map(([id,label])=>({id,label}))
};
refresh();
})();