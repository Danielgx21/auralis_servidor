'use strict';
// Manual das Criaturas · Lago Vivo 1.1.1. Extensão não destrutiva do caso 001.
(function(){
if(typeof render!=='function'||typeof s==='undefined'||typeof app==='undefined'||typeof net==='undefined')return;
const scenes={
 lago:['O nevoeiro sobe entre os juncos.','Uma luz fraca percorre o fundo da água.','O cais geme. Há passos, mas ninguém aparece.','O reflexo do sino se parte entre as ondas.'],
 casa:['O assoalho estala atrás da porta.','A agulha do rádio vibra sem emissão.','Uma sombra passa pelo espelho um instante atrasada.','Três pancadas ressoam dentro da parede.'],
 capela:['Poeira cai das vigas, sem vento.','Há marcas recentes de água no altar.','O bronze parece vibrar antes da badalada.','A inscrição reflete a luz como uma superfície molhada.']
};
const pad=n=>String(n).padStart(2,'0');
const minute=()=>typeof window.manualWorldMinute==='function'?window.manualWorldMinute():null;
const clock=n=>pad(Math.floor(n/60))+':'+pad(n%60);
const live=()=>s.caseId==='lago'&&!s.outcome&&!s.timeFailed&&['hub','scene','witness'].includes(s.view);
const npc=n=>n>=1200||(n>=300&&n<540);
const nextNpc=n=>npc(n)?0:n<300?300-n:1200-n;
function condition(n){
 if(n>=0&&n<50)return {name:'A hora do chamado',kind:'alarm',desc:'O sino e as vozes parecem pertencer ao mesmo instante.'};
 if(n>=1380||n<300)return {name:'Névoa fechada',kind:'mist',desc:'A água escureceu e a visibilidade diminuiu.'};
 if(n>=1140)return {name:'Crepúsculo e chuva fina',kind:'rain',desc:'A madeira está úmida; as luzes da vila se apagam aos poucos.'};
 if(n>=300&&n<540)return {name:'Primeira luz',kind:'dawn',desc:'O vento leva os últimos ecos da margem.'};
 return {name:'Luz cinzenta',kind:'day',desc:'O movimento da vila disfarça os sons da represa.'};
}
function sceneText(n){const a=scenes[s.activeScene]||scenes.lago;return a[Math.floor((n+(s.activeScene==='capela'?16:s.activeScene==='casa'?7:0))/11)%a.length]}
function shared(){return '<div class="lakeLifeTop"><span class="lakeLifeMark">◈ RELATÓRIO DE CAMPO · AO VIVO</span><strong data-lake-live-clock>--:--</strong></div><div class="lakeLifeForecast"><div><small>CONDIÇÕES</small><b data-lake-weather>Consultando o ambiente…</b></div><div><small>SINAIS DO AMBIENTE</small><b>Ouça e observe</b></div></div><p class="lakeLifeDescription" data-lake-description></p><div class="lakeLifeNpc"><span class="lakeLifeDot" aria-hidden="true"></span><div><b>Iria Vilar</b><small data-lake-npc>Verificando o paradeiro…</small></div></div>'}
function create(){
 if(!live()||app.querySelector('.lakeLife'))return;
 const main=app.querySelector('main');if(!main)return;
 const panel=document.createElement('section');panel.className='lakeLife';panel.setAttribute('aria-label','Ambiente vivo da investigação');
 if(s.view==='scene'){
  panel.innerHTML=shared()+'<div class="lakeLifeMoment" data-lake-event hidden><div class="lakeLifeMomentIcon">◌</div><div><strong>Um som percorre a água</strong><p>Uma voz parece atravessar a superfície. Instantes depois, algo vibra entre as árvores; é difícil dizer de onde veio primeiro.</p></div></div><div class="lakeLifeActions"><span data-lake-danger></span><small>O ambiente muda com o passar das horas.</small></div>';
  const hook=app.querySelector('.timeWorldScene,.landscapeHelp,.sceneIntro');(hook||main).insertAdjacentElement(hook?'afterend':'afterbegin',panel);
  const canvas=app.querySelector('.landscapeCanvas,.lakeBoard,.sceneFrame');if(canvas&&!canvas.querySelector('.lakeLifeFx')){const fx=document.createElement('div');fx.className='lakeLifeFx';fx.setAttribute('aria-hidden','true');fx.innerHTML='<span class="lakeLifeFog"></span><span class="lakeLifeGlint"></span>';canvas.append(fx);}
 }else{
  panel.classList.add('lakeLifeCompact');panel.innerHTML=shared()+(s.view==='hub'&&!net.inGame?'<button type="button" class="lakeLifeWait" data-lake-wait>⧖ Aguardar 30 minutos <small>(consome 15 segundos do prazo)</small></button>':'');
  const hook=app.querySelector('.timeWorldHud,.timeWorldWitness');(hook||main).insertAdjacentElement(hook?'afterend':'afterbegin',panel);
 }
}
function refresh(){
 if(!live())return;
 const n=minute();if(n===null)return;
 const weather=condition(n),present=npc(n);
 document.body.dataset.lakeWeather=weather.kind;
 app.querySelectorAll('[data-lake-live-clock]').forEach(e=>e.textContent=clock(n));
 app.querySelectorAll('[data-lake-weather]').forEach(e=>e.textContent=weather.name);
 app.querySelectorAll('[data-lake-description]').forEach(e=>e.textContent=s.view==='scene'?sceneText(n):weather.desc);
 // O ambiente não antecipa quando um fenômeno acontecerá.
 app.querySelectorAll('[data-lake-npc]').forEach(e=>e.textContent=present?'Presente para entrevista · até '+(n>=1200?'00h00':'09h00'):'Ausente · próximo retorno em '+nextNpc(n)+' min. do jogo');
 app.querySelectorAll('.lakeLifeNpc').forEach(e=>e.classList.toggle('isAway',!present));
 app.querySelectorAll('[data-lake-danger]').forEach(e=>e.textContent=n>=1140||n<300?'◈ Área hostil: permanência prolongada aumenta o risco.':'◈ Exposição moderada: examine o local com atenção.');
 app.querySelectorAll('[data-lake-event]').forEach(e=>e.hidden=!(s.activeScene==='lago'&&n>=17&&n<30&&!s.lagoMidnightSeen));
 app.querySelectorAll('.lakeLifeFx').forEach(e=>e.dataset.phase=weather.kind);
}
const previous=render;
render=function(){previous();create();refresh()};
app.addEventListener('click',ev=>{
 const wait=ev.target.closest('[data-lake-wait]');
 if(wait&&live()&&!net.inGame&&s.view==='hub'){
  ev.preventDefault();ev.stopImmediatePropagation();
  s.timeElapsed=Math.max(0,Number(s.timeElapsed)||0)+15000;
  persist(false);render();toast('Trinta minutos se passaram. O prazo da investigação também avançou.');return;
 }

},true);
setInterval(()=>{if(!document.hidden&&live())refresh()},1000);
render();
})();