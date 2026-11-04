"""Bridge para emotes PvP e comemorações. Todos os efeitos são apenas visuais."""
def apply_social_html(html: str) -> str:
    patches=[
        (
            "function pvpMessage(msg){",
            """function pvpMessage(msg){
 if(msg.type==='emote'){
  document.dispatchEvent(new CustomEvent('mini-social-emote',{detail:{
   emote:msg.emote,name:msg.name,
   mine:msg.sender===(pvp.quad?pvp.quadSeat:pvp.seat)
  }}));
  return;
 }"""
        ),
        (
            "function pvpSend(msg){",
            """window.__miniSocialBridge={
 state(){return{active:!!pvp.active,local:!!pvp.local,phase:game?.phase||'',seat:pvp.seat}},
 send(id){
  if(!pvp.active||typeof id!=='string')return false;
  if(pvp.local){
   document.dispatchEvent(new CustomEvent('mini-social-emote',{detail:{emote:id,name:'Você',mine:true}}));
   return true;
  }
  if(!pvp.socket||pvp.socket.readyState!==1)return false;
  pvpSend({type:'emote',emote:id});
  return true;
 }
};
function pvpSend(msg){"""
        ),
        (
            "if(win)document.dispatchEvent(new Event('mini-cosmetic-victory'));",
            """if(win){
  document.dispatchEvent(new Event('mini-cosmetic-victory'));
  document.dispatchEvent(new CustomEvent('mini-hero-victory',{detail:{
   units:(battle?.allies||[]).filter(u=>u.hp>0).map(u=>({type:u.type,damage:u.stats?.damage||0}))
  }}));
 }"""
        ),
        (
            "if(iWon)document.dispatchEvent(new Event('mini-cosmetic-victory'));",
            """if(iWon){
  document.dispatchEvent(new Event('mini-cosmetic-victory'));
  document.dispatchEvent(new CustomEvent('mini-hero-victory',{detail:{
   units:(battle?.allies||[]).filter(u=>u.hp>0).map(u=>({type:u.type,damage:u.stats?.damage||0}))
  }}));
 }"""
        )
    ]
    for old,new in patches:
        matches=html.count(old)
        if matches!=1:
            raise RuntimeError(f"Ponte social incompatível: {old[:70]} aparece {matches}x")
        html=html.replace(old,new,1)
    return html
