/* v2.20 — Reorganização da aba Jogar sem alterar artes originais. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const home=$('homeMenu'),grid=home?.querySelector('.menu-grid'),pvp=$('homePvp'),ai=$('homeQuick');
if(!home||!grid||!pvp||!ai)return;
const css=document.createElement('style');
css.textContent=[
'#homeMenu[data-active-tab="play"] #homePvp,#homeMenu[data-active-tab="play"] #homeQuick{display:none!important}',
'#homeMenu .new-play{display:grid;gap:9px;width:100%;max-width:710px;margin:auto;color:#f6e0b6}',
'#homeMenu .new-play button{cursor:pointer;touch-action:manipulation;font-family:inherit}',
'#homeMenu .new-wallet{display:flex;justify-content:space-between;gap:8px;font:700 13px Georgia,serif;flex-wrap:wrap}',
'#homeMenu .new-wallet span{border:1px solid #bba079;border-radius:12px;padding:6px;background:#1a314a}',
'#homeMenu .new-profile{display:flex;align-items:center;text-align:left;gap:12px;padding:12px;width:100%;border:1px solid #d4ae76;border-radius:14px;background:linear-gradient(130deg,#294560,#172d46);color:#ffe0a5;min-height:70px}',
'#homeMenu .new-profile img{height:45px;width:45px;object-fit:cover;border-radius:50%}',
'#homeMenu .new-profile b{font:800 20px Georgia,serif}',
'#homeMenu .new-profile small{display:block;color:#cddce9;margin-top:4px}',
'#homeMenu .new-banner{width:min(100%,470px);margin:auto;min-height:50px;border:2px solid #c7a579;border-radius:10px;background:linear-gradient(110deg,#344f70,#243d5a,#344f70);color:#ffe2ac;font:800 16px Georgia,serif}',
'#homeMenu .new-castle{border:2px solid #d3af7b;border-radius:16px;background:radial-gradient(ellipse at top,#3f496c,#1b304a 72%);text-align:center;padding:12px}',
'#homeMenu .new-castle img{display:block;width:auto;max-width:100%;height:clamp(95px,24vw,160px);object-fit:contain;margin:0 auto}',
'#homeMenu .new-castle h2{margin:3px;color:#ffdfad;font:800 clamp(23px,5vw,32px) Georgia,serif}',
'#homeMenu .new-elo{display:inline-block;border:1px solid #be9e72;border-radius:18px;padding:5px 13px;color:#ffe2b2;background:#263d54;font-weight:800;font-size:13px}',
'#homeMenu .new-main{background:linear-gradient(#ffdfa0,#d5aa6c);border:2px solid #ffe5b0;color:#2c2833;min-height:53px;border-radius:12px;font:900 24px Georgia,serif}',
'#homeMenu .new-modes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
'#homeMenu .new-modes button{min-height:71px;border:1px solid #c6a476;border-radius:13px;background:linear-gradient(#2c4b68,#1d344f);color:#ffe2b6;font:800 clamp(12px,3.6vw,17px) Georgia,serif}',
'#homeMenu .new-modes img{height:40px;vertical-align:middle;max-width:45px;object-fit:contain}',
'#homeTabContent.shop-mode>:not(#newShop){display:none!important}',
'#newShop{display:grid;gap:13px;color:#eaf0f5;padding:10px}',
'#newShop h2{color:#ffe1a9;margin:0;font:800 25px Georgia,serif}',
'#newShop p{font-size:13px;line-height:1.5}',
'#newShop .shop-row{border:1px solid #bfa071;border-radius:12px;background:linear-gradient(#29425d,#182d44);padding:13px;display:flex;align-items:center;justify-content:space-between;gap:8px}',
'#newShop button{background:#dfb77b;color:#253449;border:1px solid #e9c994;border-radius:8px;padding:9px;font-weight:800;cursor:pointer}',
'#newShop button:disabled{opacity:.55}',
'@media(max-width:370px){#homeMenu .new-play{gap:6px}#homeMenu .new-castle{padding:8px}#homeMenu .new-castle img{height:94px}#homeMenu .new-modes button{min-height:61px}}'
].join('\n');document.head.append(css);
const miniPolishStyle=document.createElement('style');miniPolishStyle.textContent="\n/* v2.21 — apresentação aprovada, sem valores de demonstração */\n#homeMenu[data-active-tab=\"play\"] .menu-footer{display:none!important}\n#homeMenu .new-play{gap:10px;max-width:760px;isolation:isolate}\n#homeMenu .new-wallet{align-items:center;min-height:42px;color:#ffe0ad}\n#homeMenu .new-wallet strong{letter-spacing:.12em;font-size:clamp(12px,3.1vw,16px)}\n#homeMenu .new-wallet-balances{display:flex;align-items:center;gap:6px}\n#homeMenu .new-wallet-balances>span{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:4px 9px;background:linear-gradient(#182b4d,#10203c);border:1px solid #9979ac;border-radius:25px;box-shadow:inset 0 1px #ffffff42,0 3px 7px #03081480}\n#homeMenu .new-wallet-balances b{font-variant-numeric:tabular-nums}\n#homeMenu .mini-wallet-icon{width:27px;height:27px;flex:none;filter:drop-shadow(0 2px 2px #0005)}\n#homeMenu .new-profile{border:2px solid #f2bf67;background:linear-gradient(110deg,#1e3557,#40325e 65%,#1a2e50);box-shadow:inset 0 2px #ffffff33,0 6px 15px #0007;border-radius:20px;padding:9px 13px;min-height:85px}\n#homeMenu .new-avatar-holder{display:grid;place-items:center;flex:none;width:63px;height:63px;border:3px solid #f4ce80;border-radius:15px;overflow:hidden;box-shadow:0 0 0 2px #60367c;background:#3c2857}\n#homeMenu .new-avatar-holder img,#homeMenu .mini-knight-avatar{width:100%!important;height:100%!important;object-fit:cover;border-radius:10px}\n#homeMenu .new-profile-text{display:grid;gap:2px;min-width:0;flex:1}\n#homeMenu .new-profile b{font-size:clamp(22px,5.4vw,29px);line-height:1}\n#homeMenu .new-profile small{font-size:clamp(10px,2.7vw,13px);line-height:1.25}\n#homeMenu .new-profile-mark{display:grid;place-items:center;border:2px solid #f2c875;border-radius:13px;background:linear-gradient(#6a3586,#352458);color:#f6d994;font-size:29px;flex:none;width:51px;height:52px}\n#homeMenu .new-banner{padding:0;position:relative;display:grid;justify-items:center;gap:0;width:min(100%,710px);border:0;background:transparent;box-shadow:none;min-height:125px;overflow:visible}\n#homeMenu .new-banner-caption{position:relative;z-index:2;display:block;width:min(83%,490px);padding:9px 15px;border:2px solid #fac67a;border-radius:13px;background:linear-gradient(#523566,#25254d 70%);color:#ffe8b6;box-shadow:0 4px 9px #060c219e;font:800 clamp(14px,4.1vw,21px) Georgia,serif;text-shadow:0 2px 2px #160b22}\n#homeMenu .new-banner-cloth{display:grid;place-items:center;width:92%;height:93px;margin-top:-7px;padding-top:14px;clip-path:polygon(0 0,100% 0,98% 95%,50% 100%,2% 95%);background:linear-gradient(120deg,#3c2765,#7437a0 48%,#402264);border-bottom:6px solid #efb45f;filter:drop-shadow(0 7px 8px #0008);box-shadow:inset 0 -8px #eab96a}\n#homeMenu .mini-banner-crest{width:92px;height:69px;filter:drop-shadow(0 2px 1px #211042)}\n#homeMenu .new-banner-edit{position:absolute;z-index:3;right:4%;bottom:12px;border:2px solid #edbc78;border-radius:11px;background:#284363;color:#f8d9a3;font:900 24px sans-serif;width:39px;height:39px;display:grid;place-items:center}\n#homeMenu .new-castle{background:radial-gradient(ellipse at 48% 70%,#243d72 0%,#192c50 68%,#102342 100%);box-shadow:inset 0 2px #ffffff22,0 5px 14px #0006;overflow:hidden;padding:5px 8px 15px;border-color:#ecc17c}\n#homeMenu #newCastleArt{display:grid;place-items:center;height:clamp(190px,52vw,335px);overflow:hidden;margin-top:-3px}\n#homeMenu #newCastleArt svg{display:block;max-width:100%;width:min(100%,630px);height:100%;filter:drop-shadow(0 4px 11px #050d2299)}\n#homeMenu .new-castle h2{position:relative;margin-top:-13px;font:800 clamp(23px,5.5vw,35px) Georgia,serif;text-shadow:0 2px 4px #0009}\n#homeMenu .new-elo{position:relative;z-index:2;border:2px solid #e4b870;border-radius:21px;background:linear-gradient(#303d63,#192b4b);font:800 clamp(13px,3.4vw,17px) Georgia,serif;padding:6px 16px;box-shadow:0 3px 8px #0005}\n#homeMenu .new-main{min-height:62px;border:3px solid #fff0ae;border-radius:19px;background:linear-gradient(#fff1ae,#f9c860 38%,#d89337);box-shadow:inset 0 2px #fff5c9,0 5px 0 #855228,0 9px 15px #0007;font:900 clamp(23px,6vw,31px) Georgia,serif;text-shadow:0 1px #fff2c9}\n#homeMenu .new-modes{gap:10px}\n#homeMenu .new-modes button{min-height:76px;border:2px solid #e2b76f;border-radius:18px;background:linear-gradient(#2a4b73,#142e50);box-shadow:inset 0 2px #ffffff22,0 4px 11px #0005;text-shadow:0 2px #08182d}\n#homeMenu #newFriend{background:linear-gradient(#543470,#36245e)}\n#homeMenu .new-modes img{height:48px;max-width:50px}\n#homeMenu .new-play button:focus-visible{outline:3px solid #fff4ca;outline-offset:3px}\n#homeMenu #navProfile .mini-shop-stall{display:block;width:clamp(30px,7vw,42px);height:clamp(30px,7vw,42px)}\n#homeMenu #navProfile .mini-shop-nav-label{display:block;font-family:Georgia,serif}\n#homeMenu #navProfile.mini-has-shop-icon{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}\n#homeMenu.profile-from-play #navPlay{background:linear-gradient(#5b3774,#342453)!important;border:1.5px solid #f4c675!important;border-radius:13px!important;box-shadow:0 0 7px #faad55b0!important;color:#fff2c5!important}\n#homeMenu.profile-from-play #navProfile{background:transparent!important;border-color:transparent!important;box-shadow:none!important;color:#e9d6ac!important}\n@media(max-width:420px){\n #homeMenu .new-play{gap:7px}\n #homeMenu .new-wallet{min-height:37px}\n #homeMenu .new-wallet-balances>span{padding:2px 6px;min-height:30px}\n #homeMenu .mini-wallet-icon{width:22px;height:22px}\n #homeMenu .new-profile{min-height:73px;padding:6px 10px}\n #homeMenu .new-avatar-holder{width:53px;height:53px}\n #homeMenu .new-profile-mark{width:43px;height:43px;font-size:23px}\n #homeMenu .new-banner{min-height:110px}\n #homeMenu .new-banner-cloth{height:78px}\n #homeMenu .mini-banner-crest{width:76px;height:60px}\n #homeMenu #newCastleArt{height:clamp(190px,55vw,255px)}\n #homeMenu .new-main{min-height:53px}\n #homeMenu .new-modes button{min-height:66px}\n #homeMenu .new-modes img{height:40px}\n}\n";document.head.append(miniPolishStyle);
const miniCastleSvg='';
const miniShopIcon="<svg class=\"mini-shop-stall\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 62 62\" aria-hidden=\"true\">\n<defs><linearGradient id=\"miniShopRoof\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop stop-color=\"#c581fa\"/><stop offset=\"1\" stop-color=\"#702d9d\"/></linearGradient><linearGradient id=\"miniShopWood\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop stop-color=\"#a86b3d\"/><stop offset=\"1\" stop-color=\"#5a2f24\"/></linearGradient></defs>\n<path d=\"M10 27H52V55H10Z\" fill=\"url(#miniShopWood)\" stroke=\"#f4c875\" stroke-width=\"2.2\"/>\n<path d=\"M12 33H50V44H12Z\" fill=\"#241b38\" stroke=\"#c99351\" stroke-width=\"2\"/>\n<path d=\"M6 22L13 7H49L56 22Z\" fill=\"url(#miniShopRoof)\" stroke=\"#eac18a\" stroke-width=\"2.5\"/>\n<path d=\"M17 7L15 22H25L26 7ZM35 7L37 22H47L45 7Z\" fill=\"#f4c87a\"/>\n<path d=\"M6 22Q11 32 17 22Q23 32 29 22Q35 32 41 22Q48 32 56 22\" fill=\"none\" stroke=\"#f8ce8c\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n<path d=\"M16 44H46V55H16Z\" fill=\"#774230\" stroke=\"#efb36b\" stroke-width=\"2\"/>\n<path d=\"M23 42L25 34L32 36L30 42Z\" fill=\"#ffda66\" stroke=\"#f4ac4e\" stroke-width=\"1.5\"/>\n<path d=\"M34 42L37 34L45 37L43 42Z\" fill=\"#ffcb55\" stroke=\"#f4ac4e\" stroke-width=\"1.5\"/>\n</svg>";
const miniCoinIcon="<svg class=\"mini-wallet-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 36 36\" aria-hidden=\"true\"><circle cx=\"18\" cy=\"18\" r=\"16\" fill=\"#9c5426\" stroke=\"#ffeba3\" stroke-width=\"2\"/><circle cx=\"18\" cy=\"18\" r=\"12.5\" fill=\"#f6bf52\" stroke=\"#ffe49c\" stroke-width=\"2\"/><path d=\"M10 14l3 3 5-7 5 7 3-3-2 10H12Z\" fill=\"#b16b22\" stroke=\"#ffe8ab\" stroke-width=\"1.5\"/></svg>";
const miniGemIcon="<svg class=\"mini-wallet-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 36 36\" aria-label=\"Cristais\" role=\"img\"><path d=\"M18 2L32 15L23 33L13 33L4 15Z\" fill=\"#a04ff0\" stroke=\"#ebcbff\" stroke-width=\"2\"/><path d=\"M4 15L18 2L13 33Z\" fill=\"#7843d8\"/><path d=\"M18 2L32 15L23 33Z\" fill=\"#b969f6\"/><path d=\"M4 15L32 15L23 33L13 33Z\" fill=\"#5b37ae\" opacity=\".6\"/><path d=\"M18 2L13 15L23 15Z\" fill=\"#e8b9ff\" opacity=\".8\"/></svg>";
const miniKnightIcon="<svg class=\"mini-knight-avatar\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 66 66\" aria-hidden=\"true\"><defs><linearGradient id=\"miniHelm\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#fff1b1\"/><stop offset=\".45\" stop-color=\"#e8aa40\"/><stop offset=\"1\" stop-color=\"#815121\"/></linearGradient></defs><rect x=\"0\" y=\"0\" width=\"66\" height=\"66\" rx=\"12\" fill=\"#42285f\"/><path d=\"M5 66Q11 39 33 42Q55 39 61 66\" fill=\"#64359c\" stroke=\"#f5be68\" stroke-width=\"3\"/><path d=\"M16 22L23 7H43L50 22L46 50L33 58L20 50Z\" fill=\"url(#miniHelm)\" stroke=\"#6f421e\" stroke-width=\"3\"/><path d=\"M21 25L45 25L45 35L21 35Z\" fill=\"#281d39\"/><path d=\"M23 30L30 29M36 29L43 30\" stroke=\"#ff7450\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M33 7V19\" stroke=\"#a4641e\" stroke-width=\"7\"/></svg>";
const miniBannerCrest='';
const fitStyle=document.createElement('style');fitStyle.textContent="@media(max-width:820px){\n#homeMenu[data-active-tab=\"play\"] .mini-hide-large-header{display:none!important}\n#homeMenu[data-active-tab=\"play\"] .menu-grid{min-height:0!important;max-height:none!important;overflow:visible!important}\n#homeMenu[data-active-tab=\"play\"] #newPlay{display:grid!important;grid-template-rows: minmax(25px,auto) 53px 63px minmax(82px,1fr) 46px 52px;gap:4px;min-width:0;height:var(--mini-fit-height,410px)!important;max-height:var(--mini-fit-height,410px)!important;min-height:0!important;overflow:hidden!important;padding:0 5px!important;margin:0 auto!important;box-sizing:border-box}\n#homeMenu #newPlay>*{min-height:0;min-width:0;box-sizing:border-box}\n#homeMenu #newPlay .new-wallet{min-height:0;margin:0;padding:0;font-size:12px}\n#homeMenu #newPlay .new-wallet strong{font-size:clamp(11px,2.7vw,13px);letter-spacing:.06em}\n#homeMenu #newPlay .new-profile{min-height:0;height:100%;padding:4px 10px;border-radius:13px}\n#homeMenu #newPlay .new-profile b{font-size:clamp(16px,4vw,21px)}\n#homeMenu #newPlay .new-profile small{font-size:10px}\n#homeMenu #newPlay .new-avatar-holder{width:44px;height:44px;border-radius:10px}\n#homeMenu #newPlay .new-profile-mark{width:36px;height:37px;font-size:19px;border-radius:8px}\n#homeMenu #newPlay .new-banner{min-height:0!important;height:100%!important;width:100%!important;overflow:hidden!important;position:relative}\n#homeMenu #newPlay .new-banner-caption{position:absolute;z-index:2;top:0;left:15%;width:70%;height:27px;line-height:1.1;padding:4px 5px;border-radius:10px;font-size:clamp(11px,3vw,15px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#homeMenu #newPlay .new-banner-cloth{display:block;position:absolute;inset:14px 2.5% 0;width:95%!important;height:calc(100% - 14px)!important;margin:0!important;border:none!important;border-bottom:3px solid #f5c276!important;background-image:url(\"/assets/hub-art-generated.webp\")!important;background-size:100% auto!important;background-position:bottom center!important;background-repeat:no-repeat!important;clip-path:polygon(0 0,100% 0,98% 95%,50% 100%,2% 95%)!important;box-shadow:none!important}\n#homeMenu #newPlay .mini-banner-crest{display:none!important}\n#homeMenu #newPlay .new-banner-edit{width:26px;height:27px;right:6%;bottom:6px;font-size:16px;border-radius:7px}\n#homeMenu #newPlay .new-castle{display:flex;flex-direction:column;justify-content:center;min-height:0!important;height:100%;overflow:hidden;padding:2px 5px 5px!important;border-radius:13px!important}\n#homeMenu #newPlay #newCastleArt{min-height:0!important;height:auto!important;flex:1 1 auto;width:100%;margin:0!important;background-image:url(\"/assets/hub-art-generated.webp\")!important;background-size:100% auto!important;background-repeat:no-repeat!important;background-position:top center!important}\n#homeMenu #newPlay #newCastleArt>*{display:none!important}\n#homeMenu #newPlay .new-castle h2{flex:0 0 auto;line-height:1;margin:0 0 2px!important;font-size:clamp(14px,3.9vw,20px)!important}\n#homeMenu #newPlay .new-elo{flex:0 0 auto;align-self:center;font-size:clamp(10px,2.8vw,13px);line-height:1;padding:4px 8px;border-width:1px;white-space:nowrap}\n#homeMenu #newPlay .new-main{min-height:0;height:100%;border-radius:12px;font-size:clamp(19px,5.5vw,25px);box-shadow:0 2px 0 #82542c}\n#homeMenu #newPlay .new-modes{height:100%;gap:6px;min-height:0}\n#homeMenu #newPlay .new-modes button{height:100%;min-height:0!important;padding:3px 5px;border-radius:11px;font-size:clamp(10px,2.8vw,14px);line-height:1.2}\n#homeMenu #newPlay .new-modes img{height:29px!important;width:auto;max-width:29px!important}\n#homeMenu[data-active-tab=\"play\"] .menu-version{display:none!important}\n}\n@media(max-width:820px) and (max-height:670px){\n#homeMenu[data-active-tab=\"play\"] #newPlay{grid-template-rows:25px 44px 54px minmax(65px,1fr) 40px 45px;gap:3px}\n#homeMenu #newPlay .new-avatar-holder{width:36px;height:36px}\n#homeMenu #newPlay .new-profile-mark{width:32px;height:32px}\n}\n";document.head.append(fitStyle);
const wrap=document.createElement('section');wrap.className='new-play';wrap.id='newPlay';
wrap.innerHTML=
'<div class="new-wallet"><strong>LIGA DOS REINOS</strong><div class="new-wallet-balances"><span>'+miniCoinIcon+' <b id="newCoins">—</b></span><span>'+miniGemIcon+' <b id="newCrystals">—</b></span></div></div>'+
'<button class="new-profile" id="newProfile" type="button"><span id="newAvatar" class="new-avatar-holder">'+miniKnightIcon+'</span><span class="new-profile-text"><b id="newName">Meu perfil</b><small id="newSubtitle">Entre na sua conta</small></span><span class="new-profile-mark">⚔</span></button>'+
'<button class="new-banner" id="newBanner" type="button"><span class="new-banner-caption">❧ <span id="newBannerName">Estandarte do Castelo</span> ❧</span><span class="new-banner-cloth">'+miniBannerCrest+'</span><span class="new-banner-edit" aria-hidden="true">✎</span></button>'+
'<div class="new-castle"><div id="newCastleArt">'+miniCastleSvg+'</div><h2>Liga dos Reinos</h2><span class="new-elo" id="newRank">Consultando seu elo...</span></div>'+
'<button class="new-main" id="newRankPlay" type="button">▶ JOGAR</button>'+
'<div class="new-modes"><button id="newAI" type="button"><span id="newAIArt"></span> Jogar vs IA</button><button id="newFriend" type="button">⚔ Jogar com Amigo</button></div>';
grid.append(wrap);
function copyArt(from,to){let src=from.querySelector('.menu-portrait')?.src;if(src){const image=document.createElement('img');image.src=src;image.alt='';$(to).append(image)}}
copyArt(ai,'newAIArt');
const tabHost=$('homeTabContent'),nav=$('navProfile')||document.querySelector('[data-home-tab="profile"]');
const symbols={castelo:'♜',leao:'♌',espada:'⚔',dragao:'♧'};
let account=null,wallet=null,serial=0,profileIntent=false,profileFromPlay=false;
let lastAvatarKey='';
const avatarImageCache=new Map();
function closeShop(){tabHost?.classList.remove('shop-mode')}
function openProfile(){profileFromPlay=true;home.classList.add('profile-from-play');profileIntent=true;closeShop();nav?.click();profileIntent=false;closeShop();setTimeout(()=>{if(profileFromPlay)home.classList.add('profile-from-play')},0)}
function showShop(){
 if(!tabHost)return;
 let el=$('newShop');if(!el){el=document.createElement('section');el.id='newShop';tabHost.append(el)}
 tabHost.classList.add('shop-mode');renderShop();
}
function updateWallet(){
 $('newCoins').textContent=wallet?wallet.coins:'—';
 $('newCrystals').textContent=wallet?wallet.crystals:'—';
 const id=wallet?.banner||'castelo',info=wallet?.catalog?.find(item=>item.id===id);
 $('newBannerName').textContent=(symbols[id]||'♜')+' '+(info?.name||'Estandarte do Castelo');
}
function renderShop(){
 const el=$('newShop');if(!el)return;el.replaceChildren();
 const title=document.createElement('h2');title.textContent='Loja do Reino';el.append(title);
 const note=document.createElement('p');note.textContent='Itens apenas cosméticos. Moedas e cristais são permanentes; recompensas serão adicionadas futuramente.';el.append(note);
 if(!wallet){const p=document.createElement('p');p.textContent='Entre na conta para acessar a personalização.';el.append(p);return}
 const saldo=document.createElement('b');saldo.textContent='◉ '+wallet.coins+' moedas · ✦ '+wallet.crystals+' cristais';el.append(saldo);
 for(const item of wallet.catalog){
  const row=document.createElement('div');row.className='shop-row';
  const info=document.createElement('span');info.textContent=(symbols[item.id]||'♜')+' '+item.name+' · '+(item.currency==='free'?'Grátis':item.price+' '+(item.currency==='coins'?'moedas':'cristais'));
  const owned=wallet.ownedBanners.includes(item.id);
  const btn=document.createElement('button');btn.type='button';btn.textContent=wallet.banner===item.id?'Selecionado':owned?'Usar':'Adquirir';btn.disabled=wallet.banner===item.id;
  btn.addEventListener('click',async()=>{
   btn.disabled=true;
   try{
    const res=await fetch('/api/account/economy',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Game-Request':'1'},body:JSON.stringify({action:owned?'equip':'buy',banner:item.id})});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao atualizar estandarte');
    wallet=data;updateWallet();renderShop();
   }catch(e){alert(e.message);btn.disabled=false}
  });row.append(info,btn);el.append(row);
 }
}
async function refresh(){
 const seq=++serial;
 const calls=await Promise.allSettled([
  fetch('/api/account/me',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null),
  fetch('/api/account/economy',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null),
  fetch('/api/ranked/me',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null)
 ]);
 if(seq!==serial)return;
 account=calls[0].status==='fulfilled'?calls[0].value?.user:null;
 wallet=calls[1].status==='fulfilled'?calls[1].value:null;
 const rating=calls[2].status==='fulfilled'?calls[2].value?.rating:null;
 $('newName').textContent=account?.displayName||'Meu perfil';
 $('newSubtitle').textContent=account?'Toque para abrir seu perfil':'Entre para salvar suas conquistas';
 $('newRank').textContent=rating?(rating.division+' · '+rating.points+' pontos'):(account?'Elo indisponível':'Entre para consultar seu elo');
 renderChosenAvatar();
 updateWallet();if(tabHost?.classList.contains('shop-mode'))renderShop();
}
$('newRankPlay').addEventListener('click',()=>pvp.click());
$('newAI').addEventListener('click',()=>ai.click());
$('newFriend').addEventListener('click',()=>{openProfile();let tries=0;function go(){const node=$('miniFriendsPanel');if(node)node.scrollIntoView({block:'center',behavior:'smooth'});else if(tries++<8)setTimeout(go,150)}setTimeout(go,100)});
$('newProfile').addEventListener('click',openProfile);
$('newBanner').addEventListener('click',()=>{profileFromPlay=false;home.classList.remove('profile-from-play');nav?.click();setTimeout(showShop,0)});
if(nav){
 nav.innerHTML=miniShopIcon+'<span class="mini-shop-nav-label">Loja</span>';
 nav.classList.add('mini-has-shop-icon');nav.setAttribute('aria-label','Loja');
 nav.addEventListener('click',()=>{if(profileIntent){setTimeout(closeShop,0)}else{profileFromPlay=false;home.classList.remove('profile-from-play');setTimeout(showShop,0)}});
}
document.querySelectorAll('[data-home-tab]').forEach(node=>{if(node!==nav&&node.dataset.homeTab!=='profile')node.addEventListener('click',()=>{profileFromPlay=false;home.classList.remove('profile-from-play');closeShop()},true)});
$('navPlay')?.addEventListener('click',()=>{profileFromPlay=false;home.classList.remove('profile-from-play');refresh()});
document.addEventListener('mini-ranked',refresh);

function renderChosenAvatar(){
 const holder=$('newAvatar');if(!holder)return;
 if(!account){holder.innerHTML=miniKnightIcon;return;}
 const key=String(account.id||'')+':'+String(account.avatar||'');
 const selected=[...document.querySelectorAll('[data-account-avatar]')].find(node=>node.getAttribute('data-account-avatar')===account.avatar);
 const img=selected?.querySelector('img')||document.querySelector('#realmAccountPanel .realm-account-heading img');
 let src=img?.getAttribute('src');
 if(src&&/^(data:image\/|https?:|\/)/.test(src)){avatarImageCache.set(key,src);try{sessionStorage.setItem('miniaturas-avatar-art:'+key,src)}catch{}}
 if(!src)src=avatarImageCache.get(key);
 if(!src){try{src=sessionStorage.getItem('miniaturas-avatar-art:'+key)}catch{}}
 if(!src){
  // Procura o retrato original da mesma miniatura nas cartas já renderizadas.
  const candidate=[...document.querySelectorAll('[data-type],[data-unit-type],[data-mini-type]')].find(el=>
    (el.dataset.type||el.dataset.unitType||el.dataset.miniType)===account.avatar
  );
  src=candidate?.querySelector('img')?.getAttribute('src');
 }
 if(src){
  const current=holder.querySelector('img');
  if(current?.getAttribute('src')!==src){
   const portrait=document.createElement('img');portrait.src=src;portrait.alt='Avatar selecionado no perfil';holder.replaceChildren(portrait);
  }
  lastAvatarKey=key;
 }else if(lastAvatarKey!==key){holder.innerHTML=miniKnightIcon;lastAvatarKey=key}
}
function compactBrand(){
 const rect=grid.getBoundingClientRect();let cursor=grid;
 while(cursor&&cursor!==home){
  let sibling=cursor.previousElementSibling;
  while(sibling){
   const next=sibling.previousElementSibling;
   if(sibling!==nav&&sibling!==tabHost&&!sibling.contains(nav)&&!sibling.contains(tabHost)&&!sibling.contains(wrap)){
    const area=sibling.getBoundingClientRect();
    if(area.height>=55&&area.top<rect.top+10&&!sibling.matches('[data-home-tab],nav')){
     sibling.classList.add('mini-hide-large-header');
    }
   }
   sibling=next;
  }
  cursor=cursor.parentElement;
 }
}
function sizePlayToViewport(){
 if(home.dataset.activeTab!=='play')return;
 compactBrand();
 const navRail=nav?.parentElement;
 const navTop=navRail?.getBoundingClientRect().top||window.innerHeight-70;
 const top=wrap.getBoundingClientRect().top;
 const base=navTop>top?navTop:window.innerHeight-70;
 const room=Math.max(315,Math.floor(base-top-5));
 wrap.style.setProperty('--mini-fit-height',room+'px');
}
function schedulePlayFit(){
 requestAnimationFrame(()=>{sizePlayToViewport();requestAnimationFrame(sizePlayToViewport)});
}
if(window.ResizeObserver){
 const ro=new ResizeObserver(()=>schedulePlayFit());
 const rail=nav?.parentElement;if(rail)ro.observe(rail);
}
window.addEventListener('resize',schedulePlayFit,{passive:true});
window.visualViewport?.addEventListener('resize',schedulePlayFit,{passive:true});
document.addEventListener('click',event=>{if(event.target.closest?.('[data-home-tab="play"]'))schedulePlayFit()},true);
const avatarObserver=new MutationObserver(()=>{
 if(!account)return;
 const heading=$('realmAccountPanel')?.querySelector('.realm-account-heading img');
 if(heading&&heading.getAttribute('src')!==$('newAvatar')?.querySelector('img')?.getAttribute('src'))renderChosenAvatar();
});
if(tabHost)avatarObserver.observe(tabHost,{childList:true,subtree:true});

document.addEventListener('submit',event=>{if(event.target.closest('#realmAccountPanel'))setTimeout(refresh,600)},true);
window.addEventListener('focus',refresh);
refresh();schedulePlayFit();setTimeout(schedulePlayFit,150);
})();