/* Loja de progressão — itens persistentes servidos pela API de conta. */
(()=>{
'use strict';
let activeCategory='miniatures',pending=false;
const labels={miniatures:'Miniaturas',campaigns:'Campanhas',tickets:'Torneios',skins:'Skins'};
const icons={miniatures:'⚔️',campaigns:'🗺️',tickets:'🎟️',skins:'✨'};
const style=document.createElement('style');
style.textContent=[
'#homeMenu #newShop{display:flex;flex-direction:column;gap:13px;padding:12px 10px 24px;color:#e8efff;font-family:inherit}',
'#newShop .realm-market-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
'#newShop .realm-market-header h2{margin:0;color:#ffe1ac;font:800 clamp(24px,5.3vw,31px) Georgia,serif}',
'#newShop .realm-market-balance{font-weight:800;color:#ffe0a4;background:#172b49;border:1px solid #b58d60;border-radius:20px;padding:6px 9px;font-size:13px}',
'#newShop .realm-market-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}',
'#newShop .realm-market-tabs button{padding:9px 1px;border:1px solid #817392;border-radius:9px;background:#1e3355;color:#e5d8f9;font:800 clamp(10px,2.65vw,14px) Georgia,serif;cursor:pointer}',
'#newShop .realm-market-tabs button.active{background:linear-gradient(#593c7b,#332a57);border-color:#e1b66e;color:#ffdeab}',
'#newShop .market-intro{margin:0;color:#b7cbe2;font-size:12px;line-height:1.4}',
'#newShop .market-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
'#newShop .market-card{display:flex;flex-direction:column;gap:7px;min-width:0;background:linear-gradient(155deg,#243e62,#132940);border:1px solid #967b83;border-radius:13px;padding:9px;box-shadow:inset 0 1px #fff2,0 3px 9px #030a1744}',
'#newShop .market-card.owned{border-color:#b58b59;background:linear-gradient(#203b59,#192e46)}',
'#newShop .market-card-art{width:100%;min-height:69px;height:clamp(70px,19vw,106px);border-radius:9px;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle,#513875,#13213c 74%);font-size:39px}',
'#newShop .market-card-art svg{width:100%;height:100%;max-height:106px;object-fit:contain}',
'#newShop .market-card-title{color:#ffe4b1;font:800 clamp(13px,3.3vw,17px)/1.13 Georgia,serif;overflow-wrap:anywhere}',
'#newShop .market-card-note{color:#c8d6e4;font-size:11px;line-height:1.35;min-height:31px}',
'#newShop .market-card-bottom{display:flex;justify-content:space-between;align-items:center;gap:5px;margin-top:auto;flex-wrap:wrap}',
'#newShop .market-price{font-size:12px;color:#f3d8a6;font-weight:800}',
'#newShop .market-card button{margin-left:auto;background:linear-gradient(#ffe2a1,#dca857);border:1px solid #f7d497;border-radius:9px;padding:8px 11px;color:#27344d;font:800 12px Georgia,serif;cursor:pointer;max-width:100%}',
'#newShop .market-card button:disabled{background:#4e5a6f;border-color:#69748a;color:#d2d4db;opacity:.78;cursor:default}',
'#newShop .market-card:not(.miniatures){grid-column:span 2;display:grid;grid-template-columns:72px 1fr;column-gap:12px;align-items:center}',
'#newShop .market-card:not(.miniatures) .market-card-art{grid-row:1 / span 3;width:72px;height:78px;min-height:78px;font-size:33px}',
'#newShop .market-card:not(.miniatures) .market-card-note{min-height:0}',
'#newShop .market-card:not(.miniatures) .market-card-bottom{grid-column:2}',
'#newShop .realm-market-helper{font-size:12px;color:#aebcd0;line-height:1.5}',
'@media(max-width:370px){#newShop .market-card{padding:6px}#newShop .market-card button{padding:6px 7px}}'
].join('\n');
document.head.append(style);
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=String(txt);return n};
function art(product){
 const node=el('div','market-card-art');
 if(product.mini&&typeof window.__miniShopArt==='function'&&(product.category==='miniatures'||product.category==='skins')){
   node.innerHTML=window.__miniShopArt(product.mini);
   if(product.category==='skins'){
     const svg=node.querySelector('svg');
     if(svg)svg.style.filter=product.id.includes('crimson')?'sepia(.35) saturate(2) hue-rotate(315deg)':product.id.includes('winter')?'hue-rotate(155deg) saturate(1.2)':product.id.includes('spectral')?'hue-rotate(55deg) saturate(1.7)':product.id.includes('eclipse')?'hue-rotate(250deg) saturate(1.5)':'saturate(1.35) brightness(1.1)';
   }
 }else node.textContent=icons[product.category]||'⚔️';
 return node;
}
function applyState(state){
 window.__miniShopState=state||null;
 window.__miniShopSkins=state?.equippedSkins||{};
 if(state&&typeof window.__miniProgressSync==='function')window.__miniProgressSync(state);
 document.dispatchEvent(new CustomEvent('mini-shop-state',{detail:{state}}));
}
function render(root,state,onUpdate){
 root.replaceChildren();
 const header=el('div','realm-market-header'),title=el('h2','','Loja dos Reinos');
 const balance=el('span','realm-market-balance',state?('🪙 '+state.coins+' · 💎 '+state.crystals):'Entre para comprar');
 header.append(title,balance);root.append(header);
 if(!state){root.append(el('p','market-intro','Entre na sua conta pelo painel do jogador para adquirir miniaturas, campanhas, ingressos e skins.'));return}
 const tabs=el('div','realm-market-tabs');
 for(const cat of Object.keys(labels)){
  const b=el('button',activeCategory===cat?'active':'',(icons[cat]||'')+' '+labels[cat]);b.type='button';
  b.addEventListener('click',()=>{activeCategory=cat;render(root,state,onUpdate)});tabs.append(b);
 }
 root.append(tabs);
 const count=(state.ownedMinis||[]).length;
 const intros={
  miniatures:count+'/27 miniaturas desbloqueadas. As primeiras 17 já são suas; novas compras ampliam as opções do elenco, sem alterar os atributos.',
  campaigns:'Campanhas especiais com regras e cenários diferentes. Escolha uma campanha adquirida para jogar.',
  tickets:'Ingressos guardados: '+(state.tickets||0)+'. Você poderá usá-los quando os eventos de torneio estiverem ativos.',
  skins:'Personalizações visuais; não alteram atributos ou habilidades.'
 };
 root.append(el('p','market-intro',intros[activeCategory]));
 const grid=el('div','market-grid');
 for(const product of (state.catalog||[]).filter(p=>p.category===activeCategory)){
  const card=el('article','market-card '+product.category+(product.owned?' owned':''));
  card.append(art(product),el('strong','market-card-title',product.name),el('div','market-card-note',product.description));
  const foot=el('div','market-card-bottom');
  const price=product.currency==='free'?'Grátis':(product.currency==='coins'?'🪙 ':'💎 ')+product.price;
  foot.append(el('span','market-price',price));
  const button=el('button','');
  let action='buy';
  if(product.category==='tickets')button.textContent='Comprar';
  else if(product.owned){
   if(product.category==='miniatures'){button.textContent='Desbloqueada';button.disabled=true}
   else if(product.selected){button.textContent=product.category==='campaigns'?'Jogar':'Remover';action=product.category==='campaigns'?'play':'unequip'}
   else{button.textContent='Selecionar';action='equip'}
  }else button.textContent='Adquirir';
  if(pending)button.disabled=true;
  button.type='button';
  button.addEventListener('click',async()=>{
   if(pending)return;
   if(action==='play'){
    const ok=window.__miniCampaignChoose?.(product.campaign);
    if(ok!==false)document.getElementById('navCampaign')?.click();
    return;
   }
   pending=true;button.disabled=true;button.textContent='...';
   try{
    const response=await fetch('/api/account/economy',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Game-Request':'1'},body:JSON.stringify({action,item:product.id})});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Compra não concluída.');
    applyState(data);onUpdate?.(data);render(root,data,onUpdate);
   }catch(error){window.alert(error.message||'Erro de conexão.');render(root,state,onUpdate)}
   finally{pending=false}
  });
  foot.append(button);card.append(foot);grid.append(card);
 }
 root.append(grid);
 if(activeCategory==='tickets')root.append(el('p','realm-market-helper','Ingressos ficam armazenados na conta. Não há torneio pago ativo no momento; nenhum ingresso será consumido até você participar.'));
}
window.__miniStorefront={render,applyState};
})();