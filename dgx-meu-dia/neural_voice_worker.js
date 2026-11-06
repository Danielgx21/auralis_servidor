/* DGX v0.15 — worker dedicado à síntese de voz neural local (opt-in).
 * Não envia texto do usuário a servidores TTS. O download dos pesos (~295 MB)
 * é iniciado pelo usuário; a síntese posterior é executada no dispositivo.
 * Motor: Google MediaPipe Text-to-Speech / Kokoro-82M, Apache 2.0.
 */
let engine=null;
let initPromise=null;
const MODEL="https://huggingface.co/litert-community/Kokoro-82M/resolve/main/kokoro_int8_gpu_fp16.litertlm";
const RUNTIME="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/+esm";
const WASM="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@latest/wasm";
const voices=new Set(["pf_dora","pm_alex","pm_santa"]);
const errorText=e=>String(e?.message||e||"Falha desconhecida").slice(0,350);

async function initialize(){
 if(engine)return {voices:[...voices]};
 if(initPromise)return initPromise;
 initPromise=(async()=>{
   self.postMessage({type:"progress",stage:"Baixando e preparando o motor de voz (aproximadamente 295 MB)... Use Wi-Fi."});
   const mod=await import(RUNTIME);
   if(!mod.TextToSpeech||!mod.FilesetResolver)throw new Error("A biblioteca de voz neural não carregou neste navegador.");
   const files=await mod.FilesetResolver.forAudioTasks(WASM);
   const common={
    baseOptions:{modelAssetPath:MODEL,delegate:"GPU"},
    defaultVoiceId:"pf_dora",
    cacheDirectory:":nocache"
   };
   try{
    engine=await mod.TextToSpeech.createFromOptions(files,common);
   }catch(gpuError){
    self.postMessage({type:"progress",stage:"Tentando o processamento pelo CPU, sem aceleração gráfica..."});
    engine=await mod.TextToSpeech.createFromOptions(files,{
      ...common,baseOptions:{modelAssetPath:MODEL,delegate:"CPU"}
    });
   }
   // Somente oferecer perfis pt-BR conhecidos no modelo; verifica ids reais.
   const available=await engine.listVoices();
   const actual=available.map(v=>v.voiceId).filter(v=>voices.has(v));
   if(!actual.length)throw new Error("O modelo não disponibilizou perfis de voz em português brasileiro.");
   return {voices:actual};
 })();
 try{return await initPromise}catch(e){initPromise=null;throw e}
}
self.onmessage=async event=>{
 const {type,id,text,voice}=event.data||{};
 if(type==="initialize"){
  try{
   const result=await initialize();
   self.postMessage({type:"ready",id,voices:result.voices});
  }catch(e){self.postMessage({type:"error",id,message:errorText(e)})}
  return;
 }
 if(type==="synthesize"){
  try{
   await initialize();
   if(!voices.has(voice))throw new Error("Locutor não autorizado.");
   const cleaned=String(text||"").slice(0,900);
   if(!cleaned.trim())throw new Error("Nenhum texto para falar.");
   const result=await engine.synthesize(cleaned,{voiceId:voice});
   const pcm=result.samples;
   if(!pcm||!pcm.length)throw new Error("O modelo não gerou áudio.");
   const samples=pcm instanceof Float32Array?pcm:Float32Array.from(pcm);
   self.postMessage({type:"audio",id,sampleRate:result.sampleRateHz||24000,samples:samples.buffer},[samples.buffer]);
  }catch(e){self.postMessage({type:"error",id,message:errorText(e)})}
  return;
 }
 if(type==="cancel"){
  try{engine?.cancel?.()}catch(e){}
 }
};