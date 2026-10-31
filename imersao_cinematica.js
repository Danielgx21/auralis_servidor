'use strict';
/* Camada complementar de imersão, ativada somente após clique em áudio. */
(function(){
const app=document.getElementById('app');if(!app)return;
let ctx=null,mix=null,layer=null,staticLayer=null,enabled=false,staticOff=null,lastBeat=0,lastEvent=0,lastFreq=-1;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function buffer(){
 const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),a=b.getChannelData(0);let x=0;
 for(let i=0;i<a.length;i++){x=(x+(Math.random()*2-1)*.032)/1.032;a[i]=x*1.6}return b;
}
function osc(f,type,gain,destination=mix){
 const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;o.type=type;g.gain.value=gain;o.connect(g);g.connect(destination);o.start();return {o,g};
}
function initialize(){
 if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
 ctx=new AC();mix=ctx.createGain();mix.gain.value=0;mix.connect(ctx.destination);
 const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),windGain=ctx.createGain();
 wind.buffer=buffer();wind.loop=true;filter.type='lowpass';filter.frequency.value=400;windGain.gain.value=.02;
 wind.connect(filter);filter.connect(windGain);windGain.connect(mix);wind.start();
 layer={wind,filter,windGain,low:osc(75,'sine',.02),dissonance:osc(105,'triangle',0),high:osc(151,'sine',0)};
 return true;
}
function toggle(on){
 if(on&&!initialize())return;enabled=on;
 if(ctx){ctx.resume();const t=ctx.currentTime;mix.gain.setTargetAtTime(on?.21:0,t,.12)}
}
function risk(){return clamp(Number(typeof s==='undefined'?0:s.timeStress||0)/100)}
function hit(freq=62,amp=.07){
 if(!enabled||!ctx)return;
 const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
 o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(34,t+.17);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
 o.connect(g);g.connect(mix);o.start(t);o.stop(t+.24);
}
function update(){
 if(!ctx||!layer)return;
 const activeScene=typeof s!=='undefined'&&s.view==='scene'&&!document.hidden&&!(typeof net!=='undefined'&&net.paused);
 const v=activeScene?risk():0,t=ctx.currentTime,id=typeof s==='undefined'?'lago':s.activeScene;
 const fundamental=id==='capela'?54:id==='casa'?69:76;
 layer.low.o.frequency.setTargetAtTime(fundamental*(1+v*.025),t,.7);
 layer.low.g.gain.setTargetAtTime(.018+.01*v,t,.5);
 layer.dissonance.o.frequency.setTargetAtTime(fundamental*1.412,t,.7);
 layer.dissonance.g.gain.setTargetAtTime(v*.047,t,.3);
 layer.high.o.frequency.setTargetAtTime(fundamental*2.038,t,.7);
 layer.high.g.gain.setTargetAtTime(v*.019,t,.3);
 layer.windGain.gain.setTargetAtTime(.015+.045*v,t,.5);
 layer.filter.frequency.setTargetAtTime(270+v*1700,t,.5);
 if(activeScene&&enabled&&v>.42&&Date.now()-lastBeat>Math.max(850,2000*(1-v))){lastBeat=Date.now();hit(50+v*17,.06+v*.075)}
 const art=app.querySelector('.landscapeCanvas,.lakeBoard');
 if(art){art.style.setProperty('--cinematic-danger',v.toFixed(3));art.classList.add('cinematicDangerArt')}
}
function tune(value){
 if(!enabled||!initialize())return;
 const n=Number(value),t=ctx.currentTime;
 if(!staticLayer){
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=buffer();src.loop=true;filter.type='bandpass';filter.Q.value=.7;gain.gain.value=0;
  src.connect(filter);filter.connect(gain);gain.connect(mix);src.start();staticLayer={src,filter,gain};
 }
 staticLayer.filter.frequency.setTargetAtTime(550+n*73,t,.025);
 staticLayer.gain.gain.setTargetAtTime(n===17?.025:.18,t,.025);
 if(staticOff)clearTimeout(staticOff);
 staticOff=setTimeout(()=>{if(ctx&&staticLayer)staticLayer.gain.gain.setTargetAtTime(0,ctx.currentTime,.12)},360);
 if(n===17&&lastFreq!==17){const a=osc(440,'triangle',.05);a.o.frequency.exponentialRampToValueAtTime(610,t+.18);a.g.gain.setTargetAtTime(0,t+.26,.06);a.o.stop(t+.6)}
 lastFreq=n;
}
function surprise(){
 if(!ctx||!enabled)return;
 const t=ctx.currentTime,source=ctx.createBufferSource(),f=ctx.createBiquadFilter(),gain=ctx.createGain();
 source.buffer=buffer();f.type='bandpass';f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(170,t+.55);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.24,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.7);
 source.connect(f);f.connect(gain);gain.connect(mix);source.start(t);source.stop(t+.72);hit(87,.13);
}
function illustration(){
 const id=typeof s!=='undefined'?s.activeScene:'lago';
 const lakeside=id==='lago',chapel=id==='capela';
 const background=lakeside?
 '<path d="M0 365Q200 230 370 321Q620 225 1000 345V600H0Z" fill="#162c3b"/><path d="M0 425Q400 380 1000 440V600H0Z" fill="#214454"/><path d="M0 482Q250 452 500 490T1000 488" stroke="#c1d7d6" stroke-width="8" fill="none" opacity=".4"/><path d="M0 550L150 320L240 550M790 555L870 300L960 555" stroke="#0d1c2b" stroke-width="27" fill="none"/>'
 :chapel?'<path d="M75 590V240Q80 80 500 58Q920 80 925 240V590" fill="#142430" stroke="#6a5444" stroke-width="62"/><path d="M500 40V440M320 315H680" stroke="#65513e" stroke-width="27"/><path d="M0 590H1000" stroke="#7d6650" stroke-width="27"/>':
 '<path d="M0 560L0 150H120V560M880 560V150H1000V560" stroke="#2c3540" stroke-width="75"/>';
 return '<div class="cinemaVisual"><svg viewBox="0 0 1000 600" role="img" aria-label="Visão de uma manifestação no local"><defs><radialGradient id="cinemaGlow"><stop stop-color="#618a9f" stop-opacity=".5"/><stop offset="1" stop-color="#061523" stop-opacity="0"/></radialGradient></defs><rect width="1000" height="600" fill="#081521"/><rect width="1000" height="600" fill="url(#cinemaGlow)"/>'+background+
 '<g class="cinemaBeing"><path d="M365 565Q385 403 443 349Q430 318 440 268Q462 204 505 210Q550 212 565 273Q580 324 551 350Q615 403 646 565Z" fill="#0a1620" stroke="#82959a" stroke-opacity=".22" stroke-width="9"/><path d="M475 293L489 288M522 288L537 293" stroke="#d7f0df" stroke-width="7"/><path d="M410 557Q450 380 463 370M558 374Q587 468 616 561" stroke="#9abfc6" stroke-opacity=".2" stroke-width="8" fill="none"/></g>'+
 '<g class="cinemaFog" stroke="#c2e7e5" stroke-width="10" opacity=".15" fill="none"><path d="M0 490Q240 420 490 502T1000 490"/><path d="M0 550Q350 486 680 540T1020 531"/></g></svg></div>';
}
function enhance(node){
 if(node.dataset.cinematic==='yes')return;node.dataset.cinematic='yes';
 const card=node.querySelector('article');if(!card)return;
 card.classList.add('cinemaEventCard');card.insertAdjacentHTML('afterbegin',illustration());
 node.classList.add('cinemaEventOverlay');
 if(Date.now()-lastEvent>800){lastEvent=Date.now();surprise()}
}
const observer=new MutationObserver(()=>{const ev=app.querySelector('.timeEvent');if(ev&&!ev.dataset.cinematic)enhance(ev)});
observer.observe(app,{childList:true,subtree:true});
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-time-audio]');
 if(b){toggle(/Ouvir local/.test(b.textContent));return}
 if(ev.target.closest('[data-landscape="radio"]'))tune(typeof s!=='undefined'?s.lagoRadioFreq||0:0);
},true);
document.addEventListener('input',ev=>{if(ev.target.matches('#landscapeFreq,#lakeFrequency'))tune(ev.target.value)},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)ctx?.suspend();else if(enabled)ctx?.resume()});
const style=document.createElement('style');
style.textContent='.cinematicDangerArt::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse at center,transparent 45%,rgba(42,5,16,calc(var(--cinematic-danger,0)*.55)) 100%);transition:background .8s}.cinemaEventOverlay{background:#010912ec!important;backdrop-filter:blur(8px)!important}.cinemaEventCard{width:min(650px,96vw)!important;max-height:94dvh;overflow-y:auto;border:1px solid #b49763!important}.cinemaVisual{width:100%;aspect-ratio:5/3;margin-bottom:16px;border:1px solid #9f8d6e;border-radius:9px;overflow:hidden;background:#071422}.cinemaVisual svg{display:block;width:100%;height:100%}.cinemaBeing{transform-origin:center;animation:cinemaArrive 1.8s ease-out both,cinemaHover 5s ease-in-out 1.8s infinite}.cinemaFog{animation:cinemaDrift 8s ease-in-out infinite alternate}@keyframes cinemaArrive{0%{opacity:0;filter:blur(22px);transform:scale(.88)}100%{opacity:.93;filter:blur(0);transform:scale(1)}}@keyframes cinemaHover{50%{transform:translateY(-11px)}}@keyframes cinemaDrift{to{transform:translateX(30px);opacity:.36}}@media(prefers-reduced-motion:reduce){.cinemaBeing,.cinemaFog{animation:none}}';
document.head.append(style);
setInterval(update,650);
window.manualCinematicSound={tune,risk,surprise,isEnabled:()=>enabled,start:()=>toggle(true),stop:()=>toggle(false)};
})();