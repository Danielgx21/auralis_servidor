/* v2.15 — PvP ranqueado: fila automática, elo e perfil. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  let searching=false, startedAt=0, lastRating=null, timer=null;
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
    '#miniRankedQueue .ranked-clock{font-variant-numeric:tabular-nums;color:#a8cbec}'
  ].join('\n');
  document.head.appendChild(css);
  function ui(){
    const panel=$('pvpSetup')?.parentElement;
    if(!panel)return null;
    let el=$('miniRankedQueue');
    if(!el){
      el=document.createElement('section');el.id='miniRankedQueue';el.hidden=true;
      el.innerHTML='<h3>⚔️ PvP ranqueado</h3><p>Adversários escolhidos automaticamente por pontuação.</p>'+
        '<div><span class="ranked-badge" id="miniRankedDivision">Bronze</span> <strong class="ranked-number" id="miniRankedPoints">100</strong> pontos</div>'+
        '<div class="ranked-search-row"><span class="ranked-spinner" aria-hidden="true"></span><div><strong id="miniRankedStatus">Entrando na fila...</strong><br><small class="ranked-clock" id="miniRankedTimer">0 s</small></div></div>'+
        '<p>Buscamos alguém com pontuação próxima e ampliamos a faixa gradualmente. Vitória: +10; derrota: −10, até zero.</p>'+
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
    searching=false;clearInterval(timer);timer=null;
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
    searching=true;startedAt=Date.now();panel.hidden=false;
    $('pvpSetup').hidden=true;$('pvpBar').hidden=true;$('pvpCode').hidden=true;
    $('pvpCopyBtn').hidden=true;$('pvpLeaveBtn').hidden=true;
    if($('pvpOnlineNote'))$('pvpOnlineNote').hidden=true;
    status('Procurando jogador...');displayRating(lastRating);
    clearInterval(timer);timer=setInterval(()=>{$('miniRankedTimer').textContent=Math.round((Date.now()-startedAt)/1000)+' s'},1000);
    try{bridge.connect()}catch(e){status('Falha de conexão: '+e.message);searching=false;clearInterval(timer);}
  }
  document.addEventListener('mini-ranked',ev=>{
    const msg=ev.detail||{};
    if(msg.type==='ranked_wait'&&searching){status('Aguardando jogador com elo parecido...');displayRating(msg.rating)}
    if(msg.type==='joined'&&msg.ranked){searching=false;clearInterval(timer);if(ui())ui().hidden=true;getRating().catch(()=>{})}
    if(msg.type==='ranked_rating'){displayRating(msg.rating);status(msg.won?'Vitória! +10 pontos':'Derrota. −10 pontos');getRating().catch(()=>{})}
    if(msg.type==='ranked_forfeit'){getRating().catch(()=>{})}
    if(msg.type==='ranked_error'){searching=false;clearInterval(timer);status(msg.message||'Busca interrompida.');$('miniRankedCancel').textContent='Voltar ao menu';}
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
  if($('homePvp'))$('homePvp').onclick=()=>play();
  ui();getRating().catch(()=>{});
})();