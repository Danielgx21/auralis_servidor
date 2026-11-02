(function battleMusicClient() {
  'use strict';
  if(window.__miniBattleMusic)return;
  window.__miniBattleMusic=true;
  const $=id=>document.getElementById(id);
  const BPM=128,beat=60/BPM,bar=beat*4;
  const chords=[
    [50,[62,65,69]],[46,[58,62,65]],[41,[57,60,65]],[48,[60,64,67]],
    [50,[62,65,69]],[43,[55,58,62]],[46,[58,62,65]],[45,[57,61,64]]
  ];
  const melody=[
    [[74,0,.75],[77,.75,.5],[81,1.25,.75],[79,2,.5],[77,2.5,.5],[74,3,.8]],
    [[77,0,.75],[74,.75,.5],[70,1.25,.75],[72,2,.5],[74,2.5,.5],[77,3,.8]],
    [[72,0,.5],[77,.5,.5],[79,1,.75],[77,1.75,.5],[72,2.25,.5],[69,2.75,1]],
    [[76,0,.75],[79,.75,.5],[81,1.25,.75],[79,2,.5],[76,2.5,.5],[72,3,.8]],
    [[74,0,.5],[77,.5,.5],[81,1,.5],[86,1.5,1],[84,2.5,.5],[81,3,.8]],
    [[79,0,.5],[77,.5,.5],[74,1,.5],[70,1.5,.75],[72,2.25,.5],[74,2.75,1]],
    [[77,0,.75],[81,.75,.5],[82,1.25,.75],[81,2,.5],[77,2.5,.5],[74,3,.75]],
    [[76,0,.5],[73,.5,.5],[69,1,1],[73,2,.5],[76,2.5,.5],[81,3,.8]]
  ];
  let enabled=true;
  try{enabled=localStorage.getItem('miniaturas-battle-theme')!=='off'}catch{}
  let ctx=null,bus=null,noise=null,playing=false,nextBar=0,barNo=0;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  const h=document.createElement('style');
  h.textContent=`
#miniBattleMusicBtn,#miniBattleMusicSettings{border:1px solid #d1aa71;border-radius:11px;background:linear-gradient(#2f4963,#1c334d);color:#ffe3ae;font-weight:800;font-size:12px;min-height:36px;padding:7px 11px;cursor:pointer;white-space:normal}
#miniBattleMusicBtn:focus-visible,#miniBattleMusicSettings:focus-visible{outline:3px solid #ffe2aa;outline-offset:2px}
#miniBattleMusicSettings{display:block;width:100%;margin:8px 0 12px;padding:11px;font-size:14px}
`;
  document.head.appendChild(h);
  const buttons=[];
  const toolbar=document.querySelector('.audio-bar')||$('audioStatus')?.parentElement;
  const makeButton=(id,container,before)=>{
    if(!container)return;
    const button=document.createElement('button');button.type='button';button.id=id;
    if(before)container.insertBefore(button,before);else container.append(button);
    button.addEventListener('click',e=>{e.preventDefault();enabled=!enabled;try{localStorage.setItem('miniaturas-battle-theme',enabled?'on':'off')}catch{};refreshButtons();if(!enabled)stop();else{unlock();sync()}});
    buttons.push(button);
  };
  makeButton('miniBattleMusicBtn',toolbar);
  makeButton('miniBattleMusicSettings',$('settingsModal')?.querySelector('.modal-body'),$('settingsCloseBtn'));
  function refreshButtons(){
    for(const b of buttons){b.textContent=enabled?'🎵 Música de combate: ligada':'🔇 Música de combate: desligada';b.setAttribute('aria-pressed',String(enabled))}
  }
  refreshButtons();
  const noteHz=m=>440*Math.pow(2,(m-69)/12);
  function volume(){
    const e=$('volumeSlider');
    const n=Number(e?.value||35);
    return Math.max(.035,Math.min(.80,Number.isFinite(n)?n/100*1.35:.47));
  }
  function createCtx(){
    if(!AudioCtx)return false;
    if(ctx)return true;
    ctx=new AudioCtx();
    const sr=ctx.sampleRate;
    noise=ctx.createBuffer(1,Math.max(1000,Math.floor(sr*.45)),sr);
    const d=noise.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
    return true;
  }
  function unlock(){
    if(!createCtx())return;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function instrument(note,time,duration,kind,velocity=1){
    if(!ctx||!bus)return;
    if(time<ctx.currentTime-.03)return;
    const osc=ctx.createOscillator();
    const amp=ctx.createGain();
    const filter=ctx.createBiquadFilter();
    filter.type='lowpass';
    const freq=noteHz(note);
    osc.frequency.setValueAtTime(freq,Math.max(ctx.currentTime,time));
    if(kind==='brass'){osc.type='sawtooth';filter.frequency.value=2000}
    else if(kind==='strings'){osc.type='triangle';filter.frequency.value=1400}
    else if(kind==='cello'){osc.type='triangle';filter.frequency.value=800}
    else if(kind==='harp'){osc.type='sine';filter.frequency.value=3500}
    else {osc.type='sine';filter.frequency.value=1000}
    const levels={brass:.069,strings:.028,cello:.039,harp:.039,choir:.022};
    const loud=(levels[kind]||.027)*velocity;
    const attack=kind==='strings'||kind==='choir'?.075:kind==='brass'?.035:.009;
    const release=kind==='strings'?.17:kind==='choir'?.24:kind==='brass'?.13:.09;
    const start=Math.max(ctx.currentTime+.006,time);
    amp.gain.setValueAtTime(0,start);
    amp.gain.linearRampToValueAtTime(loud,start+attack);
    amp.gain.setValueAtTime(loud*.77,start+Math.max(attack,duration*.65));
    amp.gain.linearRampToValueAtTime(.0001,start+duration+release);
    osc.connect(filter);filter.connect(amp);amp.connect(bus);
    osc.start(start);osc.stop(start+duration+release+.035);
    osc.onended=()=>{try{osc.disconnect();filter.disconnect();amp.disconnect()}catch{}};
  }
  function noiseHit(t,mode,level=1){
    if(!ctx||!bus)return;
    const start=Math.max(ctx.currentTime+.006,t);
    const src=ctx.createBufferSource();src.buffer=noise;
    const filt=ctx.createBiquadFilter();
    const amp=ctx.createGain();
    const hat=mode==='hat',crash=mode==='crash';
    filt.type=hat||crash?'highpass':'bandpass';
    filt.frequency.value=hat?6400:crash?3700:1100;
    filt.Q.value=hat?.8:1;
    const d=hat?.07:crash?.72:.16;
    amp.gain.setValueAtTime((hat?.020:crash?.030:.047)*level,start);
    amp.gain.exponentialRampToValueAtTime(.0001,start+d);
    src.connect(filt);filt.connect(amp);amp.connect(bus);
    src.start(start);src.stop(start+d+.01);
    src.onended=()=>{try{src.disconnect();filt.disconnect();amp.disconnect()}catch{}};
  }
  function kick(t,vel=1){
    if(!ctx||!bus)return;
    const start=Math.max(ctx.currentTime+.006,t);
    const osc=ctx.createOscillator(),amp=ctx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(110,start);osc.frequency.exponentialRampToValueAtTime(47,start+.17);
    amp.gain.setValueAtTime(.105*vel,start);
    amp.gain.exponentialRampToValueAtTime(.0001,start+.19);
    osc.connect(amp);amp.connect(bus);osc.start(start);osc.stop(start+.2);
    osc.onended=()=>{try{osc.disconnect();amp.disconnect()}catch{}};
  }
  function scoreBar(i,t){
    const [root,chord]=chords[i%8],big=i>=8;
    for(const pitch of chord){instrument(pitch-12,t,bar*.95,'strings',big?1.12:1);
      if(i%4===0)instrument(pitch,t,bar*.87,'choir',.74);}
    const pattern=[chord[0],chord[1],chord[2],chord[1],chord[0],chord[2],chord[1],chord[2]];
    for(let k=0;k<8;k++)instrument(pattern[k]+12,t+k*beat/2,beat*.36,'strings',big?1.16:1);
    for(let k=0;k<4;k++){instrument(root-12,t+k*beat,beat*.72,'cello',big?1.19:1);
      if(k%2===0)instrument(root,t+k*beat,beat*.80,'brass',big?.49:.40);}
    for(let k=0;k<4;k++)instrument(chord[k===3?1:k]+12,t+(k+.12)*beat,beat*.44,'harp',big?.76:.64);
    for(const [pitch,when,dur]of melody[i%8]){
      instrument(pitch,t+when*beat,dur*beat*.94,'brass',big?1.2:1);
      if(big&&(when===0||when===2.5))instrument(pitch-12,t+when*beat,dur*beat*.9,'brass',.51);
    }
    for(let k=0;k<4;k++){kick(t+k*beat,k%2===0?1:.77);if(k%2===1)noiseHit(t+k*beat,'snare',big?1.06:.89)}
    for(let k=0;k<8;k++)noiseHit(t+k*beat/2,'hat',k%2===0?.73:1);
    if(i%4===0)noiseHit(t,'crash',i===8?1.15:.85);
    if(i%4===3)for(let k=0;k<4;k++)noiseHit(t+3*beat+k*beat/4,'snare',.66+k*.09);
  }
  function start(){
    if(playing||!enabled||!createCtx())return;
    unlock();
    bus=ctx.createGain();bus.gain.setValueAtTime(.0001,ctx.currentTime);
    bus.gain.linearRampToValueAtTime(volume(),ctx.currentTime+.17);
    bus.connect(ctx.destination);
    playing=true;
    nextBar=ctx.currentTime+.085;
    barNo=0;
    schedule();
  }
  function schedule(){
    if(!playing||!ctx)return;
    while(nextBar < ctx.currentTime+1.4){
      scoreBar(barNo%16,nextBar);
      nextBar+=bar;
      barNo++;
    }
  }
  function stop(){
    if(!playing)return;
    playing=false;
    const oldBus=bus;
    bus=null;
    if(oldBus&&ctx){
      const now=ctx.currentTime;
      oldBus.gain.cancelScheduledValues(now);
      oldBus.gain.setTargetAtTime(.00001,now,.055);
      setTimeout(()=>{try{oldBus.disconnect()}catch{}},3500);
    }
  }
  function sync(){
    let inCombat=false;
    try{inCombat=game?.phase==='combat'&&!document.hidden}catch{}
    if(enabled&&inCombat){if(!playing)start();else if(bus&&ctx){bus.gain.setTargetAtTime(volume(),ctx.currentTime,.07)};schedule()}
    else if(playing)stop();
  }
  document.addEventListener('pointerdown',unlock,{once:true,capture:true});
  document.addEventListener('click',unlock,{once:true,capture:true});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',stop);
  for(const id of ['volumeSlider','settingsVolume'])$(id)?.addEventListener('input',sync);
  const note=$('settingsModal')?.querySelector('.sound-temporary-note');
  if(note)note.textContent='🎵 Nova trilha de combate aprovada. Os efeitos sonoros antigos continuam desligados.';
  setInterval(sync,350);
  window.__miniBattleMusicControls={start,stop,sync,enabled:()=>enabled};
})();