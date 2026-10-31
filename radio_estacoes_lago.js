'use strict';
/* Sintonia do rádio da Casa do Barqueiro.
 * Som original gerado por Web Audio, sem arquivos externos ou música protegida.
 * A navegação e a sincronização de pistas continuam com os mecanismos do jogo. */
(function(){
 const channels=[
  {n:4,name:'Um boletim distante atravessa o chiado.',kind:'speech',tone:210,band:1050,pulse:3.9,noise:.05},
  {n:9,name:'Um sinal musical curto aparece entre o chiado.',kind:'music',tone:330,band:1350,pulse:5.2,noise:.04},
  {n:13,name:'Uma sequência curta de bipes aparece e desaparece.',kind:'morse',tone:690,band:1700,pulse:8,noise:.045},
  {n:17,name:'Vozes entrecortadas parecem pronunciar nomes.',kind:'message',tone:145,band:930,pulse:4.6,noise:.05},
  {n:23,name:'Um aviso de serviço surge por instantes e se perde.',kind:'speech',tone:260,band:750,pulse:3.4,noise:.06},
  {n:28,name:'Sinal agudo e ruído de portadora.',kind:'beacon',tone:610,band:2000,pulse:2.1,noise:.05}
 ];
 const nearest=n=>channels.find(c=>c.n===n)||null;
 let audio=null,lastFreq=-1,lastSpeechKey='',lastSpeechAt=0;
 const valueOf=x=>Math.max(0,Math.min(30,Number(x)||0));
 const channelStatus=n=>{
  const st=nearest(valueOf(n));
  return st?st.name:'O seletor capta apenas chiado e interferências.';
 };
 window.manualRadioStatus=channelStatus;
 function engine(){
  if(audio)return audio;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  try{
   const ctx=new AC();
   const master=ctx.createGain();master.gain.value=.22;master.connect(ctx.destination);
   const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.9),ctx.sampleRate),samples=buf.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   const staticSource=ctx.createBufferSource();staticSource.buffer=buf;staticSource.loop=true;
   const band=ctx.createBiquadFilter();band.type='bandpass';band.frequency.value=1450;band.Q.value=.65;
   const staticGain=ctx.createGain();staticGain.gain.value=.10;
   staticSource.connect(band);band.connect(staticGain);staticGain.connect(master);
   const voice=ctx.createOscillator();voice.type='sawtooth';voice.frequency.value=180;
   const voiceFilter=ctx.createBiquadFilter();voiceFilter.type='lowpass';voiceFilter.frequency.value=1250;
   const voiceGain=ctx.createGain();voiceGain.gain.value=0;
   voice.connect(voiceFilter);voiceFilter.connect(voiceGain);voiceGain.connect(master);
   const carrier=ctx.createOscillator();carrier.type='sine';carrier.frequency.value=470;
   const carrierGain=ctx.createGain();carrierGain.gain.value=0;
   carrier.connect(carrierGain);carrierGain.connect(master);
   const wobble=ctx.createOscillator();wobble.type='sine';wobble.frequency.value=4;
   const mod=ctx.createGain();mod.gain.value=.018;
   wobble.connect(mod);mod.connect(voiceGain.gain);
   staticSource.start();voice.start();carrier.start();wobble.start();
   audio={ctx,master,staticSource,band,staticGain,voice,voiceFilter,voiceGain,carrier,carrierGain,wobble,mod};
   ctx.resume?.().catch?.(()=>{});
   return audio;
  }catch(e){return null}
 }
 function tune(n){
  if(s.caseId!=='lago'||s.activeScene!=='casa')return;
  n=valueOf(n);
  lastFreq=n;
  const a=engine();if(!a)return;
  const t=a.ctx.currentTime,ch=nearest(n);
  a.ctx.resume?.().catch?.(()=>{});
  // Entre estações predomina a interferência. Em estações sintonizadas,
  // filtros, osciladores e modulação mudam para criar sinais distintos.
  a.staticGain.gain.setTargetAtTime(ch?ch.noise:.14,t,.045);
  a.band.frequency.setTargetAtTime(ch?ch.band:600+n*71,t,.04);
  a.voice.frequency.setTargetAtTime(ch?ch.tone:120+n*23,t,.04);
  a.voiceFilter.frequency.setTargetAtTime(ch&&ch.kind==='message'?700:ch&&ch.kind==='speech'?1050:1600,t,.055);
  a.voiceGain.gain.setTargetAtTime(ch?(ch.kind==='speech'||ch.kind==='message'?.046:.010):.002,t,.055);
  a.carrier.frequency.setTargetAtTime(ch?(ch.kind==='music'?ch.tone*2:ch.kind==='morse'?ch.tone:ch.tone*1.5):100+n*35,t,.045);
  a.carrierGain.gain.setTargetAtTime(ch?(ch.kind==='music'?.027:ch.kind==='morse'||ch.kind==='beacon'?.048:.018):.002,t,.055);
  a.wobble.frequency.setTargetAtTime(ch?ch.pulse:2.3+n*.13,t,.035);
  a.mod.gain.setTargetAtTime(ch?(ch.kind==='speech'||ch.kind==='message'?.027:.006):.001,t,.055);
 }
 function metallicKnock(){
  if(!audio)return;
  try{
   const a=audio,ctx=a.ctx,t=ctx.currentTime;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='triangle';
   osc.frequency.setValueAtTime(790,t);
   osc.frequency.exponentialRampToValueAtTime(260,t+.42);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(.09,t+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.50);
   osc.connect(gain);gain.connect(a.master);
   osc.start(t);osc.stop(t+.52);
  }catch(e){}
 }
 function speakStation(n){
  const channel=nearest(n);
  if(!channel||s.caseId!=='lago'||s.activeScene!=='casa')return;
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  const now=Date.now();
  if(lastSpeechKey===channel.n&&now-lastSpeechAt<4200)return;
  lastSpeechKey=channel.n;lastSpeechAt=now;
  const scripts={
   4:'Boletim da madrugada. Temperatura em queda na região da serra.',
   9:'Estação musical... sinal interrompido.',
   13:'Sinal. Sinal. Transmissão de teste.',
   17:'Marina... Paulo... Elisa... Dário...',
   23:'Atenção, equipe de manutenção. Mensagem interrompida.',
   28:'Portadora ativa. Sem identificação de emissora.'
  };
  try{
   window.speechSynthesis.cancel();
   const u=new SpeechSynthesisUtterance(scripts[channel.n]);
   u.lang='pt-BR';u.rate=channel.n===17?.68:.84;u.pitch=channel.n===17?.69:.87;u.volume=.6;
   window.speechSynthesis.speak(u);
  }catch(e){}
 }
 function stop(){
  lastFreq=-1;
  if(window.speechSynthesis&&lastSpeechKey){try{window.speechSynthesis.cancel()}catch(e){}}
  lastSpeechKey='';
  if(!audio)return;
  const a=audio;audio=null;
  try{a.staticSource.stop();a.voice.stop();a.carrier.stop();a.wobble.stop();a.ctx.close()}catch(e){}
 }
 window.manualRadioTune=tune;
 window.manualRadioStop=stop;
 // O toque inicial, antes do deslize, ativa o áudio em navegadores móveis.
 document.addEventListener('pointerdown',event=>{
  if(s.caseId!=='lago'||s.activeScene!=='casa')return;
  const target=event.target;
  if(target.closest?.('[data-static-tuner],#landscapeFreq,#lakeFrequency'))tune(target.value||s.lagoRadioFreq||0);
  if(target.closest?.('[data-static-close],[data-static-close-outer],[data-static-apply]'))stop();
 },true);
 document.addEventListener('input',event=>{
  const t=event.target;
  if(t.matches?.('#landscapeFreq,#lakeFrequency'))tune(t.value);
 },true);
 // Ao soltar o seletor, as estações que contêm fala reproduzem um trecho
 // curto. Caso a voz sintetizada não exista no dispositivo, o chiado e os
 // sinais gerados continuam funcionando.
 document.addEventListener('change',event=>{
  const t=event.target;
  if(!t.matches?.('[data-static-tuner],#landscapeFreq,#lakeFrequency'))return;
  const n=valueOf(t.value);
  if(n!==lastFreq)tune(n);
  speakStation(n);
  if(n===17)metallicKnock();
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')stop()},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()},true);
 window.addEventListener('pagehide',stop);
 // Não deixamos o som de rádio ligado em outro local, nem após abrir o diário.
 const oldRender=render;
 render=function(){
  oldRender();
  if(s.caseId!=='lago'||s.view!=='scene'||s.activeScene!=='casa'||
     (!app.querySelector('[data-static-tuner]')&&!app.querySelector('#landscapeFreq')&&!app.querySelector('#lakeFrequency')))
   stop();
 };
})();