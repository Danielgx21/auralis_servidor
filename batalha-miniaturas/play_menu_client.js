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
const wrap=document.createElement('section');wrap.className='new-play';wrap.id='newPlay';
wrap.innerHTML=
'<div class="new-wallet"><strong>LIGA DOS REINOS</strong><div><span>◉ <b id="newCoins">—</b></span> <span>✦ <b id="newCrystals">—</b></span></div></div>'+
'<button class="new-profile" id="newProfile" type="button"><span id="newAvatar">♜</span><span><b id="newName">Meu perfil</b><small id="newSubtitle">Entre na sua conta</small></span> ❯</button>'+
'<button class="new-banner" id="newBanner" type="button">♜ <span id="newBannerName">Estandarte do Castelo</span> ✎</button>'+
'<div class="new-castle"><div id="newCastleArt"></div><h2>Liga dos Reinos</h2><span class="new-elo" id="newRank">Consultando seu elo...</span></div>'+
'<button class="new-main" id="newRankPlay" type="button">▶ JOGAR</button>'+
'<div class="new-modes"><button id="newAI" type="button"><span id="newAIArt"></span> Jogar vs IA</button><button id="newFriend" type="button">⚔ Jogar com Amigo</button></div>';
grid.append(wrap);
function copyArt(from,to){let src=from.querySelector('.menu-portrait')?.src;if(src){const image=document.createElement('img');image.src=src;image.alt='';$(to).append(image)}}
copyArt(pvp,'newCastleArt');copyArt(ai,'newAIArt');
const tabHost=$('homeTabContent'),nav=$('navProfile')||document.querySelector('[data-home-tab="profile"]');
const symbols={castelo:'♜',leao:'♌',espada:'⚔',dragao:'♧'};
let account=null,wallet=null,serial=0,profileIntent=false;
function closeShop(){tabHost?.classList.remove('shop-mode')}
function openProfile(){profileIntent=true;closeShop();nav?.click();profileIntent=false;closeShop()}
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
 const image=document.querySelector('#realmAccountPanel .realm-account-heading img');
 if(account&&image){$('newAvatar').replaceChildren(image.cloneNode(true))}else $('newAvatar').textContent='♜';
 updateWallet();if(tabHost?.classList.contains('shop-mode'))renderShop();
}
$('newRankPlay').addEventListener('click',()=>pvp.click());
$('newAI').addEventListener('click',()=>ai.click());
$('newFriend').addEventListener('click',()=>{openProfile();let tries=0;function go(){const node=$('miniFriendsPanel');if(node)node.scrollIntoView({block:'center',behavior:'smooth'});else if(tries++<8)setTimeout(go,150)}setTimeout(go,100)});
$('newProfile').addEventListener('click',openProfile);
$('newBanner').addEventListener('click',()=>{nav?.click();setTimeout(showShop,0)});
if(nav){
 const walker=document.createTreeWalker(nav,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){const node=walker.currentNode;if(node.textContent.trim()==='Perfil'){node.textContent=node.textContent.replace('Perfil','Loja');break}}
 nav.setAttribute('aria-label','Loja');
 nav.addEventListener('click',()=>{if(profileIntent){setTimeout(closeShop,0)}else setTimeout(showShop,0)});
}
document.querySelectorAll('[data-home-tab]').forEach(node=>{if(node!==nav&&node.dataset.homeTab!=='profile')node.addEventListener('click',closeShop,true)});
$('navPlay')?.addEventListener('click',refresh);
document.addEventListener('mini-ranked',refresh);
document.addEventListener('submit',event=>{if(event.target.closest('#realmAccountPanel'))setTimeout(refresh,600)},true);
window.addEventListener('focus',refresh);
refresh();
})();