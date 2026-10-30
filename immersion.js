'use strict';
(function(){
if(typeof render!=='function'||typeof CASES==='undefined'||typeof app==='undefined')return;
// Sistema de imersão: tempo de jogo = 2 minutos por segundo real. O prazo usa minutos reais.
const W={lago:[[1200,1440],[300,540]],lago2:[[0,240],[1140,1380]],baile:[[1200,1440],[0,240]],baile2:[[1260,1440],[0,180]],vampiro:[[540,720],[1080,1320]],vampiro2:[[1260,1440],[0,240]],lobo:[[300,600],[1140,1380]],lobo2:[[360,600],[1200,1440]],retrato:[[540,780],[1020,1260]],retrato2:[[600,840],[1080,1320]],estacao:[[360,600],[1080,1380]],estacao2:[[0,240],[660,900]],museu:[[540,1020],[1140,1260]],museu2:[[0,240],[780,1080]]};
const OR={lago:1320,lago2:1140,baile:1200,baile2:1260,vampiro:480,vampiro2:1200,lobo:1080,lobo2:1080,retrato:480,retrato2:1020,estacao:1020,estacao2:1320,museu:540,museu2:1260};
const D={Iniciante:20,Intermediário:23,Avançado:26};
const kinds={lake:'Água, vento e juncos',inside:'Madeira, rádio e passos',church:'Sinos e reverberação',woods:'Folhas, galhos e animais',crowd:'Vozes distantes',city:'Máquinas, vento e corredores'};
const EVENTS={
lake:[['A água recua de repente e revela marcas novas.','Seguir as marcas'],['Uma voz sussurra seu nome atrás do píer.','Examinar a margem'],['O reflexo de alguém aparece na água, mas ninguém está ali.','Observar o reflexo']],
inside:[['Três pancadas ecoam do interior da parede.','Investigar a parede'],['Um objeto cai no cômodo vizinho.','Procurar a origem'],['O rádio murmura uma frase e desliga sozinho.','Ouvir a gravação']],
church:[['O sino se move sem que ninguém o toque.','Examinar o sino'],['Um degrau estala atrás de você.','Examinar os degraus'],['Uma inscrição brilha por um instante.','Estudar a inscrição']],
woods:[['Os animais param de fazer barulho ao mesmo tempo.','Examinar rastros'],['Um vulto atravessa a trilha.','Seguir o vulto'],['Folhas se movem contra o vento.','Verificar a folhagem']],
crowd:[['Uma conversa termina assim que você se aproxima.','Tentar ouvir'],['Uma silhueta desaparece entre as pessoas.','Procurar a silhueta'],['Alguém murmura seu nome em meio às vozes.','Investigar']],
city:[['As luzes tremulam e uma porta bate ao longe.','Examinar a porta'],['Passos apressados ecoam no corredor vazio.','Seguir os passos'],['Um som metálico repete um padrão estranho.','Investigar o ruído']]
};
const X={cloud:null,cloudAt:0,view:'',sceneKey:'',sceneAt:0,lastRiskAt:0,audio:{on:false,ctx:null,mix:null,source:[],interval:null,kind:''},lastPing:0,failedId:0};
const fmt=n=>String(Math.max(0,n)).padStart(2,'0');
const restrict=(v,a,b)=>Math.max(a,Math.min(b,v));
const clockDuration=()=> (X.cloud&&net.inGame&&X.cloud.durationMs)?X.cloud.durationMs:(D[CASES[s.caseId]?.difficulty]||23)*60000;
function initSolo(){
 if(net.inGame||s.outcome||s.imFailure||document.hidden||!['brief','hub','scene','witness','board','dossier','theory','confrontation'].includes(s.view))return;
 if(!Number.isFinite(s.imElapsed))s.imElapsed=0;
 if(!s.imRunning){s.imRunning=Date.now();oldPersist(false)}
}
function elapsed(){
 if(net.inGame&&X.cloud)return Math.max(0,X.cloud.elapsedMs+(X.cloud.running?Date.now()-X.cloudAt:0));
 initSolo();return Math.max(0,(s.imElapsed||0)+(s.imRunning?Date.now()-s.imRunning:0));
}
function freeze(){if(net.inGame||!s?.imRunning)return;s.imElapsed=elapsed();s.imRunning=null;oldPersist(false)}
function resumed(){if(!net.inGame&&!s?.imFailure&&!s?.outcome)initSolo()}
function virtualMinute(){return ((OR[s.caseId]||1200)+Math.floor(elapsed()/1000)*2)%1440}
function timeText(){let m=virtualMinute();return fmt(Math.floor(m/60))+':'+fmt(m%60)}
function remain(){return Math.max(0,clockDuration()-elapsed())}
function remainText(){let sec=Math.ceil(remain()/1000);return fmt(Math.floor(sec/60))+':'+fmt(sec%60)}
function isNight(){let m=virtualMinute();return m<360||m>=1140}
function witnessHere(){return (W[s.caseId]||[[480,1080]]).some(w=>virtualMinute()>=w[0]&&virtualMinute()<w[1])}
function windowsLabel(){return (W[s.caseId]||[]).map(w=>w.map(m=>fmt(Math.floor(m/60))+':'+fmt(m%60)).join('–')).join(' / ')}
function ambience(){let a=Object.keys(CASES[s.caseId]?.scenes||{}).indexOf(s.activeScene);
 if(/lago/.test(s.caseId))return ['lake','inside','church'][a]||'lake';
 if(/lobo|vampiro/.test(s.caseId))return ['woods','inside','church'][a]||'woods';
 if(/baile/.test(s.caseId))return a===0?'crowd':'inside';
 if(/museu|retrato/.test(s.caseId))return a===2?'church':'inside';
 return a===0?'city':'inside';
}
function dangerous(){let a=Object.keys(CASES[s.caseId]?.scenes||{}).indexOf(s.activeScene);return isNight()&&(a===0||/lobo|vampiro|museu2|estacao2/.test(s.caseId))}
function paused(){return net.inGame&&net.paused}
function risk(){return restrict(Number(s.imTension)||0,0,100)}
function hud(){
 if(!['brief','hub','scene','witness','board','dossier','theory','confrontation'].includes(s.view))return;
 const main=app.querySelector('main');if(!main||app.querySelector('.immHud'))return;
 const el=document.createElement('div');el.className='immHud';
 el.innerHTML='<div><small>HORÁRIO</small><strong data-imm-time>'+timeText()+'</strong></div><div><small>RESTANTE</small><strong data-imm-remaining>'+remainText()+'</strong></div><span data-imm-phase>'+(isNight()?'NOITE':'DIA')+'</span>';
 main.prepend(el);
}
function sceneUi(){
 if(s.view!=='scene')return;
 const kind=ambience(),anchor=app.querySelector('.lakeSceneHelp,.landscapeHelp,.sceneIntro')||app.querySelector('main');
 if(!anchor||app.querySelector('.immScene'))return;
 const el=document.createElement('div');el.className='immScene';
 el.innerHTML='<div class="immSceneTop"><div><small>SOM DO AMBIENTE</small><strong>'+kinds[kind]+'</strong><p>Os ruídos e as manifestações dependem do local e do horário.</p></div><button data-imm-audio>'+(X.audio.on?'♫ Desligar':'♫ Ouvir local')+'</button></div><div class="immDanger"><span data-imm-warning>Vigilância do ambiente</span><div><i data-imm-bar style="width:'+risk()+'%"></i></div><b data-imm-risk>'+risk()+'%</b></div><p data-imm-advice>Evite permanecer muito tempo em ambientes hostis.</p>';
 anchor.after(el);
 const canvas=app.querySelector('.lakeBoard,.landscapeCanvas,.sceneFrame');
 if(canvas&&!canvas.querySelector('.immFX')){let fx=document.createElement('span');fx.className='immFX';fx.setAttribute('aria-hidden','true');canvas.append(fx)}
}
function witnessUi(){
 if(s.view!=='witness')return;
 const buttons=[...app.querySelectorAll('[data-question]')];if(!buttons.length)return;
 const n=document.createElement('div');n.className='immWitness';
 n.innerHTML='<strong data-imm-witness>'+ (witnessHere()?'● Testemunha presente':'○ Testemunha ausente')+'</strong><p>Ela costuma aparecer entre '+windowsLabel()+'. O tempo continua enquanto você investiga.</p>';
 buttons[0].before(n);
 buttons.forEach(b=>b.dataset.immBaseDisabled=b.disabled?'1':'0');
 updateWitness();
}
function updateWitness(){
 if(s.view!=='witness')return;const ok=witnessHere();
 app.querySelectorAll('[data-question]').forEach(b=>{b.disabled=!ok||b.dataset.immBaseDisabled==='1';b.classList.toggle('immUnavailable',!ok)});
 const label=app.querySelector('[data-imm-witness]');if(label)label.textContent=ok?'● Testemunha presente':'○ Testemunha ausente';
}
function entry(){
 const id=s.caseId+'/'+s.activeScene;
 if(s.view==='scene'&&(X.view!=='scene'||X.sceneKey!==id)){X.sceneKey=id;X.sceneAt=Date.now();X.lastRiskAt=Date.now()}
 if(s.view!=='scene'&&X.view==='scene')stopTone();
 X.view=s.view;
}
function surprise(){
 if(app.querySelector('.immIncident')||s.modal||s.outcome||s.imFailure)return;
 const arr=EVENTS[ambience()]||EVENTS.city,number=(s.imIncidents?.[X.sceneKey]||0),ev=arr[number%arr.length];
 const layer=document.createElement('div');layer.className='immIncident';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Acontecimento inesperado');
 layer.innerHTML='<div class="immIncidentCard"><small>ACONTECIMENTO INESPERADO</small><h2>'+ev[0]+'</h2><p>O que fazer? O relógio não para.</p><div><button data-imm-choice="investigate">'+ev[1]+'</button><button data-imm-choice="retreat">Recuar</button></div></div>';
 app.append(layer);s.imIncidents=s.imIncidents||{};s.imIncidents[X.sceneKey]=number+1;oldPersist(false);ping(125,1);
}
function tensionEngine(){
 if(s.view!=='scene'||s.outcome||s.imFailure||paused()||document.hidden)return;
 const spent=Date.now()-X.sceneAt;
 if(spent>(dangerous()?32000:65000)&&Date.now()-X.lastRiskAt>9000){
   X.lastRiskAt=Date.now();s.imTension=restrict(risk()+(dangerous()?9:3),0,100);oldPersist(false);
   if(s.imTension>=100){s.imTension=65;stopTone();toast('Você precisou abandonar o lugar: a ameaça estava próxima demais.');move('hub');return}
 }
 if(spent>26000&&Math.floor(spent/70000)>=(s.imIncidents?.[X.sceneKey]||0))surprise();
 const bar=app.querySelector('[data-imm-bar]');if(bar)bar.style.width=risk()+'%';
 const num=app.querySelector('[data-imm-risk]');if(num)num.textContent=risk()+'%';
 const warn=app.querySelector('[data-imm-warning]');if(warn)warn.textContent=dangerous()?'PERIGO · exposição crescente':'AMBIENTE RELATIVAMENTE SEGURO';
 const advice=app.querySelector('[data-imm-advice]');if(advice)advice.textContent=dangerous()?'Permanecer neste local à noite aumenta a tensão. Voltar ao mapa permite recuperar o fôlego.':'Os riscos aumentam quando escurece e quando acontecimentos estranhos começam.';
}
function resolveIncident(examine){
 app.querySelector('.immIncident')?.remove();
 s.imTension=restrict(risk()+(examine?(dangerous()?14:6):-12),0,100);
 if(examine){s.trust=Number(s.trust||0)+1;toast('Você registrou o fenômeno. +1 confiança; tensão aumentou.')}
 else toast('Você recuou e reduziu a tensão.');
 oldPersist(false);render();
}
function failure(){
 if(!s.imFailure||app.querySelector('.immFailure'))return;
 const layer=document.createElement('div');layer.className='immFailure';
 layer.innerHTML='<div><small>PRAZO ENCERRADO</small><h2>O mistério permaneceu sem resposta.</h2><p>O prazo da investigação terminou. Seus equipamentos e decisões anteriores continuam salvos, mas não há recompensa nesta tentativa.</p><button data-imm-restart>Tentar novamente</button><button data-imm-leave>Voltar ao Instituto</button></div>';
 app.append(layer);
}
function deadline(){
 if(s.outcome||s.imFailure||!['brief','hub','scene','witness','board','theory','dossier','confrontation'].includes(s.view)||remain()>0)return;
 if(net.inGame){if(net.online&&Date.now()-X.lastPing>4000){X.lastPing=Date.now();campaignPush({op:'heartbeat'})}return}
 s.imFailure=true;s.imElapsed=clockDuration();s.imRunning=null;oldPersist(false);stopTone();render();
}
function tick(){
 if(!s?.caseId||!CASES[s.caseId]||document.hidden)return;
 document.body.dataset.immLight=isNight()?'night':'day';
 app.querySelectorAll('[data-imm-time]').forEach(e=>e.textContent=timeText());
 app.querySelectorAll('[data-imm-remaining]').forEach(e=>e.textContent=remainText());
 app.querySelectorAll('[data-imm-phase]').forEach(e=>e.textContent=paused()?'EQUIPE EM ESPERA':remain()<180000?'ÚLTIMOS MINUTOS':isNight()?'NOITE':'DIA');
 if(s.view==='witness')updateWitness();
 if(s.view==='scene')tensionEngine();
 deadline();
 if(X.audio.on&&s.view==='scene'&&X.audio.kind!==ambience())switchTone();
}
const oldPersist=persist,oldRender=render;
render=function(){oldRender();entry();if(!s?.caseId||!CASES[s.caseId])return;if(!net.inGame)initSolo();hud();sceneUi();witnessUi();failure();tick()};
if(typeof applyCampaign==='function'){
 const base=applyCampaign;
 applyCampaign=function(room,initial){if(room?.worldClock){X.cloud={...room.worldClock};X.cloudAt=Date.now()}
 if(room?.lastFailure?.timestamp&&X.failedId!==room.lastFailure.timestamp){X.failedId=room.lastFailure.timestamp;toast('O prazo terminou. A equipe voltou ao Instituto sem a recompensa.')}
 return base(room,initial)};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();try{X.audio.ctx?.suspend()}catch{}}else{resumed();if(X.audio.on)try{X.audio.ctx?.resume()}catch{}render()}});
window.addEventListener('pagehide',freeze);
app.addEventListener('click',e=>{
 const b=e.target.closest('[data-imm-choice],[data-imm-audio],[data-imm-restart],[data-imm-leave]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(b.dataset.immChoice)resolveIncident(b.dataset.immChoice==='investigate');
 else if(b.dataset.immAudio!==undefined){toggleAudio();render()}
 else if(b.dataset.immRestart!==undefined){if(net.inGame)return;const id=s.caseId;saved.cases[id]=blank(id);setupCase(id,true)}
 else if(b.dataset.immLeave!==undefined)move('collection');
},true);
setInterval(()=>{if(net.inGame&&net.online&&typeof campaignReady==='function'&&campaignReady()&&Date.now()-X.lastPing>6500){X.lastPing=Date.now();campaignPush({op:'heartbeat'})}tick()},1000);
// Ambientes sonoros originais gerados via Web Audio, após clique explícito.
function stopTone(){const a=X.audio;if(a.interval){clearInterval(a.interval);a.interval=null}
 for(const n of a.source){try{n.stop?.()}catch{}try{n.disconnect?.()}catch{}}a.source=[];a.kind=''}
function ping(freq=175,duration=.55){const a=X.audio;if(!a.on||!a.ctx||!a.mix)return;
 try{const ctx=a.ctx,time=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.7),time+duration);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(.12,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(a.mix);o.start(time);o.stop(time+duration+.04)}catch{}}
function switchTone(){const a=X.audio;if(!a.on||!a.ctx)return;stopTone();a.kind=ambience();
 const ctx=a.ctx,buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),values=buffer.getChannelData(0);let smooth=0;
 for(let i=0;i<values.length;i++){smooth=(smooth+(Math.random()*2-1)*.025)/1.025;values[i]=smooth*2.8}
 const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
 noise.buffer=buffer;noise.loop=true;filter.type=a.kind==='inside'?'lowpass':'bandpass';
 filter.frequency.value={lake:310,inside:140,church:530,woods:1000,crowd:690,city:790}[a.kind]||500;
 filter.Q.value=.3;gain.gain.value=a.kind==='inside'?.21:.4;
 noise.connect(filter);filter.connect(gain);gain.connect(a.mix);noise.start();a.source.push(noise,filter,gain);
 const drone=ctx.createOscillator(),dg=ctx.createGain();drone.type='sine';
 drone.frequency.value={lake:68,inside:57,church:92,woods:105,crowd:80,city:74}[a.kind]||70;dg.gain.value=.037;
 drone.connect(dg);dg.connect(a.mix);drone.start();a.source.push(drone,dg);
 a.interval=setInterval(()=>{if(document.hidden||s.view!=='scene'||!a.on)return;ping(({lake:195,inside:74,church:238,woods:360,crowd:145,city:120}[a.kind]||120)*(Math.random()*.3+.88),.3+Math.random()*.7)},3900);
}
function toggleAudio(){
 const a=X.audio;if(a.on){stopTone();a.on=false;try{a.ctx?.close()}catch{}a.ctx=null;a.mix=null;return}
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC){toast('Áudio ambiente indisponível neste navegador.');return}
 try{if(typeof ambientStop==='function'&&sound?.playing)ambientStop();
 a.ctx=new AC();a.mix=a.ctx.createGain();a.mix.gain.value=.23;a.mix.connect(a.ctx.destination);a.on=true;
 a.ctx.resume().catch(()=>{});switchTone();toast('Paisagem sonora ligada. O som muda conforme o lugar.')}
 catch{a.on=false;toast('Toque novamente para autorizar o áudio no celular.')}
}
render();
})();