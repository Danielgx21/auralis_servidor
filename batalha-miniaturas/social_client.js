/* Liga dos Reinos: emotes autenticados e comemorações visuais dos campeões. */
(()=>{
'use strict';
const FREE=['emote_guard_aplauso','emote_rogue_pisca','emote_necro_brava','emote_risada','emote_surpresa','emote_escudo'];
const ICONS={
 emote_guard_aplauso:'👏',emote_rogue_pisca:'😉',emote_necro_brava:'😠',emote_risada:'😂',emote_surpresa:'😮',emote_escudo:'🛡️',
 emote_dragao:'🐉',emote_gelo:'❄️',emote_coroa:'👑',emote_fogo:'🔥',emote_carinho:'💜',emote_respeito:'🤝'
};
const NAMES={
 emote_guard_aplauso:'Guardião aplaudindo',emote_rogue_pisca:'Assassina provocando',
 emote_necro_brava:'Necromante irritada',emote_risada:'Risada',emote_surpresa:'Surpresa',emote_escudo:'Defender!',
 emote_dragao:'Dragão',emote_gelo:'Gelo',emote_coroa:'Realeza',emote_fogo:'Chamas',emote_carinho:'Coração',emote_respeito:'Boa luta'
};
const HEROES={
 celebrate_rogue:{mini:'rogue',label:'Dança de Adagas',symbol:'⚔️'},
 celebrate_guard:{mini:'guard',label:'Escudo do Reino',symbol:'🛡️'},
 celebrate_necro:{mini:'necro',label:'Cortejo das Almas',symbol:'☠️'},
 celebrate_bow:{mini:'bow',label:'Flecha da Vitória',symbol:'🏹'},
 celebrate_mage:{mini:'mage',label:'Círculo Arcano',symbol:'🔮'},
 celebrate_seraph:{mini:'seraph',label:'Asas Radiantes',symbol:'✨'}
};
let loadout=FREE.slice(),ownedEmotes=new Set(FREE),celebrations={},ownedCelebrations=new Set(),muted=false,lastSend=0,pendingHero=null;
try{muted=localStorage.getItem('mini-emotes-muted')==='1'}catch{}
const style=document.createElement('style');
style.textContent=[
 '#mini-emote-widget{position:relative;z-index:25;display:inline-flex;align-items:center;gap:5px;max-width:100%}',
 '#mini-emote-widget[hidden]{display:none!important}',
 '#mini-emote-widget button{border:1px solid #aa91bc;background:linear-gradient(#334f70,#1c324f);color:#ffe8bc;border-radius:9px;padding:7px 10px;font:800 12px Georgia,serif;cursor:pointer}',
 '#mini-emote-widget button:disabled{opacity:.5;cursor:default}',
 '#mini-emote-panel{position:absolute;bottom:calc(100% + 9px);left:0;width:min(300px,calc(100vw - 40px));padding:11px;border:1px solid #c4a879;border-radius:14px;background:linear-gradient(145deg,#293b59,#17283f);box-shadow:0 10px 34px #000b;color:#e9e4dc}',
 '#mini-emote-panel[hidden]{display:none!important}',
 '#mini-emote-panel .mini-emote-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font:800 14px Georgia,serif;margin-bottom:8px}',
 '#mini-emote-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
 '#mini-emote-grid button{font:700 23px sans-serif;min-height:53px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0}',
 '#mini-emote-grid small{font:600 9px system-ui,sans-serif;color:#d2c6dd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}',
 '#mini-emote-mute{width:100%;margin-top:9px;font-size:12px!important;text-align:center}',
 '.mini-emote-bubble{position:absolute;left:50%;z-index:26;max-width:80%;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:6px 12px;background:#172c4cef;border:1px solid #d4b989;border-radius:18px;box-shadow:0 4px 16px #0007;color:#fce1b6;pointer-events:none;animation:mini-emote-pop 3s ease-out forwards}',
 '.mini-emote-bubble[data-mine="1"]{bottom:14px;border-color:#86d7b3}',
 '.mini-emote-bubble[data-mine="0"]{top:12px;border-color:#e9a6b0}',
 '.mini-emote-bubble strong{font-size:30px;line-height:1.1}',
 '.mini-emote-bubble span{font:700 12px Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
 '@keyframes mini-emote-pop{0%{opacity:0;transform:translate(-50%,12px) scale(.6)}12%{opacity:1;transform:translate(-50%,0) scale(1.08)}77%{opacity:1}100%{opacity:0;transform:translate(-50%,-12px)}}',
 '#newShop .mini-social-icon{display:grid;place-items:center;font-size:43px;width:100%;height:100%;background:radial-gradient(circle,#594c78,#1b2b46)}',
 '#newShop .mini-social-hero-card{width:100%;height:100%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#5b4671,#1a2b44)}',
 '#newShop .mini-social-hero-card svg{width:72px;height:72px}',
 '#newShop .mini-social-hero-card[data-animate="yes"] svg{animation:mini-hero-display 1.3s ease-in-out 2}',
 '#newShop .mini-social-hero-card[data-animate="yes"]:after{content:attr(data-symbol);position:absolute;margin:0 0 0 65px;filter:drop-shadow(0 0 8px #f8e0a8);font-size:23px;animation:mini-hero-display 1.3s ease-in-out 2}',
 '.mini-hero-celebration{margin:8px auto 11px;display:grid;place-items:center;position:relative;max-width:260px;min-height:134px;overflow:hidden;border:1px solid #ba9c6b88;border-radius:14px;background:radial-gradient(circle at 50% 40%,#425479,#1d2849 72%,#111e34)}',
 '.mini-hero-celebration .mini-hero-art{height:106px;width:110px;display:grid;place-items:center;position:relative;z-index:2;filter:drop-shadow(0 8px 8px #050e24)}',
 '.mini-hero-celebration .mini-hero-art svg{height:100px;width:100px}',
 '.mini-hero-celebration .mini-hero-symbol{position:absolute;font-size:34px;z-index:3;right:18%;top:25%;filter:drop-shadow(0 0 9px #ffe7a0)}',
 '.mini-hero-celebration .mini-hero-caption{position:absolute;bottom:4px;left:0;right:0;font:800 11px Georgia,serif;letter-spacing:1px;color:#fbe2b8;text-shadow:0 1px 4px #000}',
 '.mini-hero-celebration[data-mini="rogue"] .mini-hero-art{animation:mini-hero-rogue 2.4s ease-in-out 1}',
 '.mini-hero-celebration[data-mini="guard"] .mini-hero-art{animation:mini-hero-guard 2.4s ease-in-out 1}',
 '.mini-hero-celebration[data-mini="necro"] .mini-hero-art{animation:mini-hero-necro 2.4s ease-in-out 1}',
 '.mini-hero-celebration[data-mini="bow"] .mini-hero-art{animation:mini-hero-bow 2.4s ease-in-out 1}',
 '.mini-hero-celebration[data-mini="mage"] .mini-hero-art{animation:mini-hero-mage 2.4s ease-in-out 1}',
 '.mini-hero-celebration[data-mini="seraph"] .mini-hero-art{animation:mini-hero-seraph 2.4s ease-in-out 1}',
 '.mini-hero-celebration .mini-hero-symbol{animation:mini-hero-symbol 2.4s ease-in-out 1}',
 '@keyframes mini-hero-display{0%,100%{transform:translateY(0) rotate(0)}40%{transform:translateY(-8px) rotate(-9deg)}70%{transform:translateY(-4px) rotate(7deg)}}',
 '@keyframes mini-hero-rogue{0%,100%{transform:rotate(0) scale(1)}25%{transform:translateX(-24px) rotate(-22deg) scale(1.1)}55%{transform:translateX(23px) rotate(19deg) scale(1.13)}75%{transform:rotate(-9deg) scale(1.14)}}',
 '@keyframes mini-hero-guard{0%,100%{transform:translateY(0) scale(1)}24%{transform:translateY(13px) scale(.95)}51%{transform:translateY(-16px) rotate(-8deg) scale(1.1)}72%{transform:rotate(8deg) scale(1.14)}}',
 '@keyframes mini-hero-necro{0%,100%{transform:translateY(0) scale(1);filter:hue-rotate(0)}42%{transform:translateY(-19px) scale(1.12);filter:hue-rotate(45deg)}76%{transform:translateY(-11px) scale(1.15);filter:hue-rotate(95deg)}}',
 '@keyframes mini-hero-bow{0%,100%{transform:translateX(0) rotate(0)}32%{transform:translateX(-18px) rotate(-13deg)}57%{transform:translateX(15px) rotate(16deg) scale(1.16)}76%{transform:translateX(2px) scale(1.1)}}',
 '@keyframes mini-hero-mage{0%,100%{transform:translateY(0) rotate(0)}36%{transform:translateY(-10px) rotate(-9deg) scale(1.1)}64%{transform:translateY(-20px) rotate(10deg) scale(1.2)}}',
 '@keyframes mini-hero-seraph{0%,100%{transform:translateY(0) scale(1)}36%{transform:translateY(-18px) scale(1.12)}66%{transform:translateY(-24px) scale(1.22)}}',
 '@keyframes mini-hero-symbol{0%{opacity:0;transform:scale(.2) rotate(-25deg)}42%{opacity:1;transform:scale(1.35) rotate(5deg)}75%{transform:scale(1.1);opacity:1}100%{opacity:0;transform:scale(.8)}}',
 '#mini-victory-cinema{position:fixed;inset:0;z-index:10020;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:auto;background:radial-gradient(ellipse at 50% 45%,#263d6ef2,#0b1428f8 75%);color:#fff0ce;text-align:center;animation:mini-cinema-in .35s ease-out}',
'#mini-victory-cinema .mini-cinema-title{font:900 clamp(29px,8vw,46px)/1.1 Georgia,serif;color:#ffe6af;letter-spacing:.13em;text-shadow:0 3px 12px #070d22,0 0 35px #d7ab70bb}',
'#mini-victory-cinema .mini-cinema-sub{font:800 12px Georgia,serif;letter-spacing:.12em;color:#d2c7e8;text-transform:uppercase}',
'#mini-victory-cinema .mini-hero-celebration{width:min(340px,88vw);max-width:unset;height:min(330px,50vh);min-height:230px;margin:0;border:2px solid #e8c17e;box-shadow:0 12px 60px #080c21,inset 0 0 48px #9763b870;background:radial-gradient(circle at 50% 45%,#665d91,#283c5f 68%,#12213a)}',
'#mini-victory-cinema .mini-hero-celebration .mini-hero-art{width:min(220px,58vw);height:min(230px,37vh);min-height:155px}',
'#mini-victory-cinema .mini-hero-celebration .mini-hero-art svg{width:100%;height:100%}',
'#mini-victory-cinema .mini-hero-celebration .mini-hero-symbol{font-size:54px;right:9%;top:15%}',
'#mini-victory-cinema .mini-hero-celebration .mini-hero-caption{font-size:clamp(13px,3vw,18px);bottom:13px}',
'#mini-victory-cinema .mini-cinema-progress{width:min(315px,78vw);height:5px;overflow:hidden;border-radius:12px;background:#74879d55}',
'#mini-victory-cinema .mini-cinema-progress span{display:block;width:100%;height:100%;background:linear-gradient(90deg,#ab88cd,#fbd58d);transform-origin:left;animation:mini-cinema-progress 3.6s linear forwards}',
'#mini-victory-cinema .mini-cinema-skip{color:#e2e9f3;font:700 13px system-ui,sans-serif;background:#2a3f60;border:1px solid #9aacc5;border-radius:11px;padding:10px 16px;min-height:40px;cursor:pointer}',
'@keyframes mini-cinema-in{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}',
'@keyframes mini-cinema-progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}',
'@media(max-width:400px){#mini-emote-widget button{padding:6px 7px}#mini-emote-panel{left:-30px}}',
 '@media(prefers-reduced-motion:reduce){.mini-emote-bubble,.mini-hero-celebration .mini-hero-art,.mini-hero-celebration .mini-hero-symbol,#newShop .mini-social-hero-card[data-animate="yes"] svg{animation-duration:.01ms!important}}'
].join('\n');
document.head.append(style);
const widget=document.createElement('div');widget.id='mini-emote-widget';widget.hidden=true;
const toggle=document.createElement('button');toggle.id='mini-emote-trigger';toggle.type='button';toggle.textContent='💬 Emotes';toggle.setAttribute('aria-expanded','false');
const panel=document.createElement('div');panel.id='mini-emote-panel';panel.hidden=true;
const head=document.createElement('div');head.className='mini-emote-head';head.textContent='Seus 6 emotes';
const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Fechar painel de emotes');close.style.marginLeft='auto';
const grid=document.createElement('div');grid.id='mini-emote-grid';
const mute=document.createElement('button');mute.type='button';mute.id='mini-emote-mute';
head.append(close);panel.append(head,grid,mute);widget.append(toggle,panel);
function closePanel(){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}
function renderGrid(){
 grid.replaceChildren();
 for(const id of loadout.slice(0,6)){
  if(!ICONS[id]||!ownedEmotes.has(id))continue;
  const button=document.createElement('button');button.type='button';button.title=NAMES[id]||id;
  const ico=document.createElement('span');ico.textContent=ICONS[id];const text=document.createElement('small');text.textContent=NAMES[id]||id;
  button.append(ico,text);
  button.addEventListener('click',()=>{
   if(Date.now()-lastSend<2500)return;
   const ok=window.__miniSocialBridge?.send(id);
   if(!ok)return;
   lastSend=Date.now();closePanel();
  });
  grid.append(button);
 }
 if(!grid.children.length){const empty=document.createElement('small');empty.textContent='Equipe seus emotes na Loja.';grid.append(empty)}
 mute.textContent=muted?'🔇 Adversário silenciado · tocar para ouvir':'🔊 Silenciar emotes adversários';
}
toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)renderGrid()});
close.addEventListener('click',closePanel);
mute.addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('mini-emotes-muted',muted?'1':'0')}catch{}renderGrid()});
document.addEventListener('click',ev=>{if(!widget.contains(ev.target))closePanel()});
function ensureWidget(){
 const parent=document.querySelector('.board-footer')||document.querySelector('.battle-row');
 if(parent&&!widget.isConnected)parent.append(widget);
 const state=window.__miniSocialBridge?.state?.();
 widget.hidden=!state?.active;
 if(widget.hidden)closePanel();
}
document.addEventListener('mini-shop-state',event=>{
 const state=event.detail?.state;
 if(!state){loadout=FREE.slice();ownedEmotes=new Set(FREE);celebrations={};ownedCelebrations=new Set();return}
 ownedEmotes=new Set(Array.isArray(state.ownedEmotes)?state.ownedEmotes:FREE);
 loadout=(Array.isArray(state.emoteLoadout)?state.emoteLoadout:FREE).filter(id=>ICONS[id]&&ownedEmotes.has(id)).slice(0,6);
 ownedCelebrations=new Set(Array.isArray(state.ownedCelebrations)?state.ownedCelebrations:[]);
 celebrations={};
 for(const [mini,id] of Object.entries(state.equippedCelebrations||{})){
  if(HEROES[id]?.mini===mini&&ownedCelebrations.has(id))celebrations[mini]=id;
 }
 if(!panel.hidden)renderGrid();
});
function bubble(message){
 const id=message?.emote;
 if(!ICONS[id]||(!message.mine&&muted))return;
 const stage=document.querySelector('.board-stage');
 if(!stage)return;
 const node=document.createElement('div');node.className='mini-emote-bubble';node.dataset.mine=message.mine?'1':'0';
 const icon=document.createElement('strong');icon.textContent=ICONS[id];
 const label=document.createElement('span');label.textContent=(message.mine?'Você':String(message.name||'Adversário').slice(0,28))+': '+(NAMES[id]||'');
 node.append(icon,label);
 const previous=stage.querySelector('.mini-emote-bubble[data-mine="'+node.dataset.mine+'"]');
 if(previous)previous.remove();
 stage.append(node);setTimeout(()=>node.remove(),3050);
}
document.addEventListener('mini-social-emote',ev=>bubble(ev.detail));
function heroArt(item){
 const node=document.createElement('div');node.className='market-card-art mini-social-hero-card';
 node.style.position='relative';
 node.dataset.symbol=HEROES[item.id]?.symbol||'✨';
 if(typeof window.__miniShopArt==='function'&&HEROES[item.id]){
  node.innerHTML=window.__miniShopArt(HEROES[item.id].mini);
 }else node.textContent=node.dataset.symbol;
 return node;
}
function productArt(item){
 if(item.kind==='emote'){
  const node=document.createElement('div');node.className='market-card-art mini-social-icon';node.textContent=ICONS[item.id]||'💬';return node;
 }
 if(item.kind==='celebration')return heroArt(item);
 return null;
}
function productPreview(item,card){
 const preview=card?.querySelector('.mini-social-hero-card, .mini-social-icon');
 if(!preview)return;
 if(item.kind==='emote'){preview.animate([{transform:'scale(1)'},{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:680});return}
 preview.dataset.animate='no';
 void preview.offsetWidth;
 preview.dataset.animate='yes';
 setTimeout(()=>{if(preview.isConnected)preview.dataset.animate='no'},2800);
}
function renderHero(mini,id){
 const data=HEROES[id],modal=document.getElementById('modal'),title=document.getElementById('modalTitle');
 if(!data||data.mini!==mini||!modal||modal.classList.contains('hidden')||!title)return;
 const body=modal.querySelector('.modal-body');if(!body)return;
 body.querySelectorAll('.mini-hero-celebration').forEach(n=>n.remove());
 const wrap=document.createElement('div');wrap.className='mini-hero-celebration';wrap.dataset.mini=mini;
 const art=document.createElement('div');art.className='mini-hero-art';
 if(typeof window.__miniShopArt==='function')art.innerHTML=window.__miniShopArt(mini);else art.textContent=data.symbol;
 const symbol=document.createElement('span');symbol.className='mini-hero-symbol';symbol.textContent=data.symbol;
 const caption=document.createElement('span');caption.className='mini-hero-caption';caption.textContent=data.label;
 wrap.append(art,symbol,caption);
 title.insertAdjacentElement('afterend',wrap);
}
// O combate e as recompensas já estão definidos quando este evento chega.
 // A sequência abaixo adia apenas a abertura visual do painel de resultados.
let pendingVictory=null,activeVictory=null;
const VICTORY_CINEMA_MS=3600;
document.addEventListener('mini-hero-victory',event=>{
 const units=Array.isArray(event.detail?.units)?event.detail.units:[];
 // Só comemora se o jogador comprou, equipou e manteve vivo o campeão vencedor.
 const picked=units.filter(u=>u&&typeof u.type==='string'&&HEROES[celebrations[u.type]]?.mini===u.type)
  .sort((a,b)=>(b.damage||0)-(a.damage||0))[0];
 pendingVictory=picked?{mini:picked.type,id:celebrations[picked.type]}:{mini:units.find(u=>typeof u.type==='string'&&/^[a-z]+$/.test(u.type))?.type||null,id:null};
});
function createVictoryStage(champ){
 const overlay=document.createElement('section');overlay.id='mini-victory-cinema';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Comemoração de vitória');
 overlay.setAttribute('aria-modal','true');
 const heading=document.createElement('strong');heading.className='mini-cinema-title';heading.textContent='✦ VITÓRIA ✦';
 const subtitle=document.createElement('div');subtitle.className='mini-cinema-sub';
 subtitle.textContent=champ.id?'Comemoração do campeão':'Seu exército venceu';
 const wrap=document.createElement('div');wrap.className='mini-hero-celebration';wrap.dataset.mini=champ.id?champ.mini:'generic';
 const art=document.createElement('div');art.className='mini-hero-art';
 if(champ.mini&&typeof window.__miniShopArt==='function')art.innerHTML=window.__miniShopArt(champ.mini);
 else art.textContent='🏆';
 const mark=document.createElement('span');mark.className='mini-hero-symbol';
 mark.textContent=champ.id?HEROES[champ.id].symbol:'🏆';
 const caption=document.createElement('span');caption.className='mini-hero-caption';
 caption.textContent=champ.id?HEROES[champ.id].label:'Seu exército venceu!';
 wrap.append(art,mark,caption);
 const progress=document.createElement('div');progress.className='mini-cinema-progress';
 const bar=document.createElement('span');progress.append(bar);
 const skip=document.createElement('button');skip.type='button';skip.className='mini-cinema-skip';skip.textContent='Ver resultado agora';
 overlay.append(heading,subtitle,wrap,progress,skip);
 return {overlay,skip,bar};
}
function installVictoryResultTransition(){
 if(window.__miniVictoryTransitionReady||typeof window.openModal!=='function')return;
 // O cliente do relatório instala sua própria personalização durante os scripts defer.
 // Executamos depois para preservar cabeçalho, estatísticas, botão e recompensas.
 window.__miniVictoryTransitionReady=true;
 const original=window.openModal;
 window.openModal=function(...args){
  const context=this;
  if(activeVictory){
   // No ranqueado o resultado geral pode chegar enquanto o vídeo de vitória roda.
   // Mostramos apenas o último painel, sem interromper a comemoração.
   activeVictory.args=args;
   activeVictory.context=context;
   return;
  }
  const confirmed=pendingVictory;pendingVictory=null;
  // A pausa entre o último golpe e o resultado é sempre exibida nas vitórias.
  // Ter uma comemoração comprada substitui o visual genérico, não o intervalo.
  const heading=String(args[1]||'');
  const resultPhase=window.__miniSocialBridge?.state?.().phase==='result';
  const won=!!resultPhase&&/(vit[oó]ria|venceu|reino superado|1º lugar)/i.test(heading);
  const champ=confirmed||(won?{mini:null,id:null}:null);
  if(!champ||champ.id&&!HEROES[champ.id])return original.apply(context,args);
  const {overlay,skip,bar}=createVictoryStage(champ);
  document.body.append(overlay);
  const state={args,context,champ,overlay,done:false,timer:null};
  activeVictory=state;
  function finish(){
   if(state.done)return;
   state.done=true;
   clearTimeout(state.timer);
   overlay.remove();
   activeVictory=null;
   // Somente o painel é postergado; a partida já terminou normalmente.
   const ret=original.apply(state.context,state.args);
   if(champ.id)renderHero(champ.mini,champ.id);
   return ret;
  }
  skip.addEventListener('click',finish,{once:true});
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){bar.style.animationDuration='0.6s';state.timer=setTimeout(finish,600);}
  else state.timer=setTimeout(finish,VICTORY_CINEMA_MS);
 };
}
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',installVictoryResultTransition,{once:true});
}else installVictoryResultTransition();
window.__miniSocialProductArt=productArt;
window.__miniSocialProductPreview=productPreview;
ensureWidget();
setInterval(ensureWidget,700);
})();
