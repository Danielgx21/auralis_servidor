/* v2.15.2 — Menu Jogar aprovado: PvP em destaque e dois atalhos compactos. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const menu = $('homeMenu'), pvp = $('homePvp'), quick = $('homeQuick');
  const grid = menu?.querySelector('.menu-grid');
  if (!menu || !pvp || !quick || !grid || $('miniJogarRedesign')) return;

  const style = document.createElement('style');
  style.textContent = [
    '#homeMenu[data-active-tab="play"] #homePvp,#homeMenu[data-active-tab="play"] #homeQuick{display:none!important}',
    '#homeMenu .mini-jogar{width:100%;min-width:0;max-width:760px;margin:0 auto;display:grid;gap:12px;font-family:inherit;color:#eaf1f7}',
    '#homeMenu .mini-jogar *{box-sizing:border-box}',
    '#homeMenu .mini-jogar button{cursor:pointer;font-family:inherit;touch-action:manipulation;transition:filter .15s,transform .15s}',
    '#homeMenu .mini-jogar button:active{transform:translateY(2px)}',
    '#homeMenu .mini-jogar button:focus-visible{outline:3px solid #ffe5a8;outline-offset:3px}',
    '#homeMenu .mini-rank-card{overflow:hidden;position:relative;isolation:isolate;text-align:center;border:2px solid #f0c47e;border-radius:19px;background:radial-gradient(ellipse at 50% 9%,#554374dd 0%,transparent 54%),linear-gradient(154deg,#292d54 0%,#1d2f52 58%,#142842 100%);box-shadow:inset 0 1px 0 #fff4,0 7px 20px #0006;padding:16px 20px 19px}',
    '#homeMenu .mini-rank-card:before{content:"";pointer-events:none;position:absolute;inset:7px;border-radius:13px;border:1px solid #d8ad7045;z-index:-1}',
    '#homeMenu .mini-rank-card:after{content:"◆";position:absolute;left:50%;top:-10px;transform:translateX(-50%);color:#f5c77c;font-size:21px;text-shadow:0 1px 6px #513c26}',
    '#homeMenu .mini-rank-visual{margin:1px auto 4px;width:127px;height:115px;display:grid;place-items:center;filter:drop-shadow(0 9px 13px #0b10286e)}',
    '#homeMenu .mini-rank-visual img{width:100%;height:100%;object-fit:contain}',
    '#homeMenu .mini-rank-card h2{font:800 clamp(25px,5.8vw,38px)/1.06 Georgia,serif;color:#ffe1ab;margin:5px 0 8px;text-shadow:0 2px 1px #0005}',
    '#homeMenu .mini-rank-card p{font-size:clamp(12px,2.7vw,15px);line-height:1.43;color:#e2e9f5;max-width:480px;margin:0 auto 12px}',
    '#homeMenu .mini-rank-pill{display:inline-flex;align-items:center;justify-content:center;gap:9px;max-width:100%;border:1px solid #deb171;border-radius:22px;background:linear-gradient(110deg,#40314b,#2c2644);padding:7px 14px;color:#f9dfb5;font:700 clamp(12px,3vw,16px) Georgia,serif;box-shadow:inset 0 1px #ffffff22}',
    '#homeMenu .mini-rank-pill .mini-rank-symbol{font-size:21px;line-height:1}',
    '#homeMenu .mini-rank-pill span:last-child{font-variant-numeric:tabular-nums}',
    '#homeMenu .mini-rank-action{display:flex;align-items:center;justify-content:center;gap:12px;width:min(100%,470px);min-height:52px;margin:15px auto 0;border:1.5px solid #ffe2aa;border-radius:13px;background:linear-gradient(#f7d99b,#dba967);box-shadow:0 3px 0 #89673b,0 6px 18px #0004;color:#2c2531;font:800 clamp(17px,4.4vw,23px) Georgia,serif}',
    '#homeMenu .mini-rank-action .mini-play-triangle{font-size:20px}',
    '#homeMenu .mini-other-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:stretch}',
    '#homeMenu .mini-mode-card{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;min-height:199px;text-align:center;border:1.5px solid #d6ab70;border-radius:17px;padding:12px 10px 13px;background:linear-gradient(145deg,#223a56,#14283f);box-shadow:inset 0 1px #ffffff25,0 5px 13px #0004}',
    '#homeMenu .mini-mode-card h3{font:800 clamp(15px,3.8vw,21px)/1.14 Georgia,serif;color:#ffe3af;margin:0;overflow-wrap:break-word}',
    '#homeMenu .mini-mode-card p{flex:1;font-size:clamp(11px,2.7vw,13px);line-height:1.32;color:#cbddeb;margin:0}',
    '#homeMenu .mini-small-art{height:67px;max-width:100%;display:grid;place-items:center}',
    '#homeMenu .mini-small-art img{height:67px;width:85px;max-width:100%;object-fit:contain;filter:drop-shadow(0 3px 6px #0006)}',
    '#homeMenu .mini-friend-flags{display:flex;align-items:start;justify-content:center;gap:4px;width:82px;height:65px;padding-top:5px}',
    '#homeMenu .mini-flag{display:grid;place-items:center;width:35px;height:55px;clip-path:polygon(0 0,100% 0,100% 100%,50% 79%,0 100%);background:linear-gradient(155deg,#536fa8,#293d76);border-top:3px solid #f4cc87;filter:drop-shadow(0 1px 3px #0008);color:#ffe9b8;font-size:22px}',
    '#homeMenu .mini-flag:nth-child(2){background:linear-gradient(155deg,#a45972,#6e354e)}',
    '#homeMenu .mini-mode-action{display:flex;align-items:center;justify-content:center;gap:5px;min-height:41px;width:100%;margin-top:auto;padding:6px 6px;border:1.5px solid #cdab76;border-radius:11px;background:linear-gradient(155deg,#39526b,#213b53);color:#ffe6bc;font:800 clamp(12px,3vw,15px) Georgia,serif}',
    '#homeMenu .mini-mode-action--quick{border-color:#8ebfcb;color:#e9f6f8}',
    '#homeMenu .mini-jogar-disclaimer{font-size:11px;line-height:1.4;text-align:center;color:#b9ccda;margin:1px auto 0;max-width:480px}',
    '#homeMenu[data-active-tab="play"] .menu-version{font-size:12px}',
    '@media(min-width:700px){#homeMenu .mini-rank-card{padding:20px 26px 23px}#homeMenu .mini-other-modes{gap:14px}#homeMenu .mini-mode-card{min-height:215px}#homeMenu .mini-rank-visual{width:153px;height:135px}}',
    '@media(max-width:360px){#homeMenu .mini-rank-card{padding:13px 13px 17px}#homeMenu .mini-rank-visual{width:105px;height:92px}#homeMenu .mini-mode-card{padding:10px 7px;min-height:199px}#homeMenu .mini-small-art{height:55px}#homeMenu .mini-small-art img{height:55px;width:75px}#homeMenu .mini-friend-flags{height:55px}#homeMenu .mini-flag{height:46px;width:28px;font-size:17px}#homeMenu .mini-mode-action{font-size:11px;min-height:42px}}'
  ].join('\n');
  document.head.appendChild(style);

  const layout = document.createElement('div');
  layout.className = 'mini-jogar';
  layout.id = 'miniJogarRedesign';
  layout.innerHTML = [
    '<section class="mini-rank-card" aria-labelledby="miniPvpTitle">',
    '<div class="mini-rank-visual" id="miniRankArtwork" aria-hidden="true"></div>',
    '<h2 id="miniPvpTitle">PvP Ranqueado</h2>',
    '<p>Enfrente jogadores online com pontuação parecida.</p>',
    '<div class="mini-rank-pill" id="miniRankPill" role="status" aria-live="polite"><span class="mini-rank-symbol" aria-hidden="true">🛡️</span><span id="miniRankBadgeText">Consultando seu elo...</span></div>',
    '<button class="mini-rank-action" id="miniFindMatch" type="button"><span class="mini-play-triangle" aria-hidden="true">▶</span>Buscar partida</button>',
    '</section>',
    '<div class="mini-other-modes">',
    '<section class="mini-mode-card" aria-labelledby="miniFriendsTitle">',
    '<div class="mini-small-art"><div class="mini-friend-flags" aria-hidden="true"><span class="mini-flag">♟</span><span class="mini-flag">♟</span></div></div>',
    '<h3 id="miniFriendsTitle">Duelo entre amigos</h3>',
    '<p>Desafie seus amigos em partidas amistosas.</p>',
    '<button type="button" class="mini-mode-action" id="miniChallengeFriend">⚔ Desafiar</button>',
    '</section>',
    '<section class="mini-mode-card" aria-labelledby="miniQuickTitle">',
    '<div class="mini-small-art" id="miniQuickArtwork" aria-hidden="true"></div>',
    '<h3 id="miniQuickTitle">Jogo rápido</h3>',
    '<p>Treine contra uma IA que evolui sua equipe.</p>',
    '<button type="button" class="mini-mode-action mini-mode-action--quick" id="miniPlayAI">🤖 Jogar IA</button>',
    '</section>',
    '</div>',
    '<p class="mini-jogar-disclaimer">O ranking fica salvo online. Duelos amistosos não alteram sua pontuação.</p>'
  ].join('');
  grid.appendChild(layout);

  const pvpArt = pvp.querySelector('.menu-portrait');
  const quickArt = quick.querySelector('.menu-portrait');
  if(pvpArt) {
    const img = document.createElement('img'); img.src=pvpArt.src; img.alt='';
    $('miniRankArtwork').appendChild(img);
  }
  if(quickArt) {
    const img = document.createElement('img'); img.src=quickArt.src; img.alt='';
    $('miniQuickArtwork').appendChild(img);
  }

  const oldFooter=menu.querySelector('.menu-footer');
  if(oldFooter) oldFooter.style.display='none';
  const version=menu.querySelector('.menu-version');
  if(version) version.textContent='Escolha sua batalha';

  $('miniFindMatch').addEventListener('click',()=>pvp.click());
  $('miniPlayAI').addEventListener('click',()=>quick.click());
  $('miniChallengeFriend').addEventListener('click',()=>{
    $('navProfile')?.click();
    let count=0;
    const move=()=>{
      const panel=$('miniFriendsPanel');
      if(panel){panel.scrollIntoView({block:'center',behavior:'smooth'});return}
      if(count++<9)setTimeout(move,160);
    };
    setTimeout(move,100);
  });

  let lastSeq=0;
  async function refreshRank(){
    const n=++lastSeq, badge=$('miniRankBadgeText');
    try{
      const r=await fetch('/api/ranked/me',{credentials:'same-origin',cache:'no-store'});
      const data=await r.json();
      if(n!==lastSeq || !badge)return;
      if(!r.ok){badge.textContent='Entre na conta para ver seu elo';return}
      const rank=data.rating;
      if(!rank){badge.textContent='Elo indisponível';return}
      badge.textContent=(rank.division||'Bronze')+' · '+Number(rank.points ?? 100)+' pontos';
    }catch{
      if(n===lastSeq&&badge)badge.textContent='Elo indisponível';
    }
  }
  $('navPlay')?.addEventListener('click',()=>refreshRank());
  document.addEventListener('mini-ranked',e=>{
    if(['ranked_rating','joined','ranked_forfeit'].includes(e.detail?.type))refreshRank();
  });
  window.addEventListener('focus',refreshRank);
  refreshRank();
})();
