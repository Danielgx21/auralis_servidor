/* v2.15 — PvP ranqueado: fila automática, elo e perfil. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let searching=false, startedAt=0, lastRating=null, timer=null, retryTimer=null, reconnectAttempts=0;
  function layout(){const state=window.__miniRankedBridge?.state?.()||{};document.body.classList.toggle('mini-ranked-queueing',searching);document.body.classList.toggle('mini-ranked-active',!!state.active&&!!state.ranked);rankedScoreboard(state)}
  setInterval(layout,500);
  const css=document.createElement('style');
  css.textContent=[
    '#miniRankedQueue{display:grid;gap:14px;padding:18px;background:linear-gradient(135deg,#263c57,#152b42);border:1px solid #d4ae70;border-radius:16px;color:#edf4fb;margin:14px 0}',
    '#miniRankedQueue[hidden]{display:none!important}',
    '#miniRankedQueue h3{margin:0;color:#ffda9b;font-size:clamp(21px,5vw,27px)}',
    '#miniRankedQueue p{margin:0;color:#c7d9e8;line-height:1.5;font-size:14px}',
    '#miniRankedQueue .ranked-number{font-size:30px;font-weight:800;color:#f8d28d}',
    '#miniRankedQueue .ranked-badge{font-size:13px;border:1px solid #cda56b;padding:5px 10px;border-radius:50px;display:inline-block}',
    '#miniRankedQueue .ranked-spinner{width:34px;height:34px;border:4px solid #546d87;border-top-color:#ffdf9a;border-radius:50%;animation:mini-rank-spin .85s linear infinite}',
    '@keyframes mini-rank-spin{to{transform:rotate(360deg)}}',
    '#miniRankedQueue .ranked-search-row{display:flex;align-items:center;gap:15px}',
    '#miniRankedCancel{min-height:48px;border-radius:11px;background:#2b4560;border:1px solid #89a4bc;color:#fff;font-size:15px}',
    '#miniRankedQueue .ranked-clock{font-variant-numeric:tabular-nums;color:#a8cbec}',
    'body.mini-ranked-active #pvpBar{display:none!important}',
    '#miniQuadScoreboard[hidden]{display:none!important}',
    '#miniQuadScoreboard{margin:12px 0 16px;padding:13px;border:1.5px solid #d7ac70;border-radius:15px;background:linear-gradient(140deg,#283e59,#15283f);box-shadow:0 6px 18px #0005;color:#ecf4fa}',
    '#miniQuadScoreboard .mq-top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin:0 2px 11px}',
    '#miniQuadScoreboard .mq-top strong{font:800 17px Georgia,serif;color:#ffe1ab}',
    '#miniQuadScoreboard .mq-top span{font-size:11px;color:#cddfeb}',
    '#miniQuadScoreboard .mq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    '#miniQuadScoreboard .mq-player{min-width:0;border:1px solid #57748b;border-radius:11px;background:#122a43;padding:10px 10px 9px}',
    '#miniQuadScoreboard .mq-player.mq-me{border-color:#e9bc7d;background:linear-gradient(150deg,#3b3a4b,#193650)}',
    '#miniQuadScoreboard .mq-player.mq-versus{border-color:#d78385}',
    '#miniQuadScoreboard .mq-player.mq-out{opacity:.65}',
    '#miniQuadScoreboard .mq-identity{display:flex;justify-content:space-between;align-items:start;gap:6px;min-height:36px}',
    '#miniQuadScoreboard .mq-name{min-width:0;font-size:13px;font-weight:800;overflow-wrap:anywhere;line-height:1.2}',
    '#miniQuadScoreboard .mq-tag{display:block;font-size:9px;font-weight:800;letter-spacing:.03em;color:#e9c38e;margin-top:5px}',
    '#miniQuadScoreboard .mq-life{white-space:nowrap;font-size:12px;font-weight:900;color:#fff1d8;font-variant-numeric:tabular-nums}',
    '#miniQuadScoreboard .mq-track{height:9px;margin-top:8px;overflow:hidden;background:#061829;border-radius:50px;border:1px solid #526b81}',
    '#miniQuadScoreboard .mq-track>span{display:block;height:100%;background:linear-gradient(90deg,#bb6373,#edb38f);transition:width .2s}',
    '#miniQuadScoreboard .mq-me .mq-track>span{background:linear-gradient(90deg,#75a49f,#b4dfc4)}',
    '@media(min-width:760px){#miniQuadScoreboard .mq-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}',
    'body.mini-ranked-queueing #app>main,body.mini-ranked-queueing #app>.audio-bar,body.mini-ranked-queueing #app>.footnote{display:none!important}',
    'body.mini-ranked-queueing #lifeStat,body.mini-ranked-active #lifeStat{display:none!important}',
    'body.mini-ranked-queueing .header .stat.win,body.mini-ranked-active .header .stat.win{display:none!important}',
    'body.mini-ranked-queueing #pvpShell>.pvp-panel>img{display:none!important}',
    'body.mini-ranked-queueing #pvpSetup,body.mini-ranked-queueing #pvpBar,body.mini-ranked-queueing #fightBtn,body.mini-ranked-queueing #speedBtn{display:none!important}'
  ].join('\n');
  document.head.appendChild(css);
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let scoreSignature='';
  function rankedScoreboard(state){
    let board=$('miniQuadScoreboard');
    if(!board){
      const anchor=$('pvpBar');if(!anchor)return;
      board=document.createElement('section');board.id='miniQuadScoreboard';board.hidden=true;
      board.setAttribute('aria-label','Participantes e pontos de vida da ranqueada');
      board.setAttribute('aria-live','polite');
      anchor.insertAdjacentElement('afterend',board);
    }
    const active=!!state.active&&!!state.ranked&&!!state.quad;
    board.hidden=!active;
    if(!active){scoreSignature='';return}
    const players=Array.isArray(state.participants)?state.participants:[];
    const me=Number(state.seat),opponent=Number(state.opponentSeat);
    const signature=JSON.stringify([players,me,opponent,state.round,state.phase]);
    if(signature===scoreSignature)return;
    scoreSignature=signature;
    const phase=state.phase==='combat'?'⚔️ Em combate':state.phase==='pvp_wait'?'Aguardando jogadores':state.phase==='result'?'Rodada concluída':'Preparação';
    board.innerHTML='<div class="mq-top"><strong>🏆 Ranqueada · Rodada '+escapeHTML(state.round||1)+'</strong><span>'+phase+' · 4 participantes</span></div>'+
      '<div class="mq-grid">'+players.map(person=>{
        const seat=Number(person.seat),hp=Math.max(0,Math.min(70,Number(person.hp)||0));
        const mine=seat===me,versus=state.opponentSeat!=null&&seat===opponent;
        const tag=mine?'VOCÊ':person.eliminated?'ELIMINADO':versus?'ADVERSÁRIO DESTA RODADA':person.isBot?'BOT':'PARTICIPANTE';
        const classes='mq-player'+(mine?' mq-me':'')+(versus?' mq-versus':'')+(person.eliminated?' mq-out':'');
        return '<div class="'+classes+'"><div class="mq-identity"><div class="mq-name">'+escapeHTML(person.name||'Jogador')+
          (person.isBot?' 🤖':'')+'<small class="mq-tag">'+tag+'</small></div><span class="mq-life">❤️ '+hp+'/70</span></div>'+
          '<div class="mq-track"><span style="width:'+(hp/70*100)+'%"></span></div></div>';
      }).join('')+'</div>';
  }
  function ui(){
    const panel=$('pvpSetup')?.parentElement;
    if(!panel)return null;
    let el=$('miniRankedQueue');
    if(!el){
      el=document.createElement('section');el.id='miniRankedQueue';el.hidden=true;
      el.innerHTML='<h3>⚔️ Ranqueado · 4 jogadores</h3><p>Buscando adversários de elo parecido. Se a espera for longa, bots completam a partida.</p>'+
        '<div><span class="ranked-badge" id="miniRankedDivision">Bronze</span> <strong class="ranked-number" id="miniRankedPoints">100</strong> pontos</div>'+
        '<div class="ranked-search-row"><span class="ranked-spinner" aria-hidden="true"></span><div><strong id="miniRankedStatus">Entrando na fila...</strong><br><small class="ranked-clock" id="miniRankedTimer">0 s</small></div></div>'+
        '<p>Quatro participantes por partida. 1º: +15, 2º: +5, 3º: −5 e 4º: −15 pontos.</p>'+
        '<button id="miniRankedCancel" type="button">Cancelar busca e voltar</button>';
      panel.insertBefore(el,$('pvpSetup'));
      $('miniRankedCancel').addEventListener('click',()=>{stop();window.__miniRankedBridge?.back?.()});
    }
    return el;
  }
  function displayRating(r){
    if(!r)return;lastRating=r;
    if($('miniRankedDivision'))$('miniRankedDivision').textContent=r.division||'Bronze';
    if($('miniRankedPoints'))$('miniRankedPoints').textContent=String(r.points??100);
    const panel=$('realmAccountPanel');
    if(panel&&panel.querySelector('.mini-elo')){
      const rank=panel.querySelector('.mini-elo-name'),note=panel.querySelector('.mini-elo-help');
      const name=(r.division||'Bronze')+' · '+Number(r.points??100)+' pontos';
      if(rank&&rank.textContent!==name)rank.textContent=name;
      const detail=Number(r.wins||0)+' vitórias · '+Number(r.losses||0)+' derrotas';
      if(note&&note.textContent!==detail)note.textContent=detail;
      panel.querySelector('.mini-elo')?.setAttribute('aria-label','Elo ranqueado: '+name);
    }
  }
  async function getRating(){
    const r=await fetch('/api/ranked/me',{credentials:'same-origin',cache:'no-store'});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'Entre em sua conta para jogar o ranqueado.');
    displayRating(data.rating);return data.rating;
  }
  function status(s){if($('miniRankedStatus'))$('miniRankedStatus').textContent=s;}
  function stop(){
    searching=false;clearInterval(timer);timer=null;clearTimeout(retryTimer);retryTimer=null;reconnectAttempts=0;layout();
    if(ui())ui().hidden=true;
    const bridge=window.__miniRankedBridge;
    if(bridge?.state?.().active!==true)bridge?.cancel?.();
  }
  async function play(){
    if(searching)return;
    try{await getRating()}catch(e){
      alert(e.message+'\nAbra a aba Perfil para entrar na conta.');
      document.querySelector('[data-home-tab="profile"]')?.click();return;
    }
    const bridge=window.__miniRankedBridge;
    if(!bridge){alert('Ranqueado não carregado. Atualize a página.');return;}
    bridge.showRanked();
    const panel=ui();if(!panel)return;
    searching=true;startedAt=Date.now();reconnectAttempts=0;panel.hidden=false;layout();
    $('pvpSetup').hidden=true;$('pvpBar').hidden=true;$('pvpCode').hidden=true;
    $('pvpCopyBtn').hidden=true;$('pvpLeaveBtn').hidden=true;
    if($('pvpOnlineNote'))$('pvpOnlineNote').hidden=true;
    status('Procurando jogador...');displayRating(lastRating);
    clearInterval(timer);timer=setInterval(()=>{if($('miniRankedTimer'))$('miniRankedTimer').textContent=Math.round((Date.now()-startedAt)/1000)+' s'},1000);
    try{bridge.connect()}catch(e){status('Falha de conexão: '+e.message);searching=false;clearInterval(timer);}
  }
  document.addEventListener('mini-ranked',ev=>{
    const msg=ev.detail||{};
    if(msg.type==='ranked_wait'&&searching){const n=Number(msg.searchSeconds)||0;const extra=n>=90?' · completando com bots':n>=75?' · até 2 bots disponíveis':n>=60?' · até 1 bot disponível':' · bots em '+Math.max(0,90-n)+'s';status('Busca de 4 participantes: '+(msg.playersWaiting||1)+' na fila'+extra);displayRating(msg.rating)}
    if(msg.type==='joined'&&msg.ranked){searching=false;clearInterval(timer);clearTimeout(retryTimer);reconnectAttempts=0;if(ui())ui().hidden=true;layout();getRating().catch(()=>{})}
    if(msg.type==='ranked_rating'){displayRating(msg.rating);status((msg.place||'')+'º lugar · '+(msg.delta>0?'+':'')+msg.delta+' pontos');getRating().catch(()=>{})}
    if(msg.type==='ranked_forfeit'){getRating().catch(()=>{})}
    if(msg.type==='ranked_cancelled'){searching=false;clearInterval(timer);clearTimeout(retryTimer);if(ui())ui().hidden=true;layout();}
    if(msg.type==='ranked_error'){searching=false;clearInterval(timer);clearTimeout(retryTimer);layout();status(msg.message||'Busca interrompida.');$('miniRankedCancel').textContent='Voltar ao menu';}
    if(msg.type==='ranked_disconnected'&&searching){
      status('Conexão interrompida. Reconectando à fila automaticamente...');
      clearTimeout(retryTimer);const delay=Math.min(5000,1200+reconnectAttempts*500);reconnectAttempts++;
      retryTimer=setTimeout(()=>{if(!searching)return;try{window.__miniRankedBridge?.connect()}catch(e){document.dispatchEvent(new CustomEvent('mini-ranked',{detail:{type:'ranked_disconnected'}}))}},delay);
    }
  });
  document.addEventListener('click',ev=>{
    if(ev.target.closest?.('[data-home-tab="profile"]'))setTimeout(()=>getRating().catch(()=>{}),250);
  });
  const tab=$('homeTabContent');
  if(tab){
    let scheduled=false;
    new MutationObserver(()=>{
      if(!lastRating||scheduled||!$('realmAccountPanel')?.querySelector('.mini-elo'))return;
      scheduled=true;Promise.resolve().then(()=>{scheduled=false;displayRating(lastRating)});
    }).observe(tab,{childList:true,subtree:true});
  }
  if($('menuOpenBtn'))$('menuOpenBtn').addEventListener('click',()=>{if(searching)stop()},true);
  if($('homePvp'))$('homePvp').onclick=()=>play();
  ui();getRating().catch(()=>{});
})();