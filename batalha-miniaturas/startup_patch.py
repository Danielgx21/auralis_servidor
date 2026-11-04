"""Tela inicial estável enquanto a interface moderna é montada.

O HTML legado continua como base da simulação, mas não aparece antes de
play_menu_client.js terminar de construir a interface aprovada.
"""
BOOT_HEAD = r'''
<style id="mini-boot-style">
html:not(.mini-modern-ready) body > :not(#mini-boot-screen):not(script){visibility:hidden!important}
#mini-boot-screen{
 position:fixed;inset:0;z-index:2147483647;display:flex;
 flex-direction:column;align-items:center;justify-content:center;
 gap:13px;padding:24px;box-sizing:border-box;
 color:#f8e0ae;text-align:center;
 background:radial-gradient(circle at 50% 30%,#39365b 0%,#1b3150 33%,#081829 80%);
 font-family:Georgia,"Times New Roman",serif;
}
#mini-boot-screen .mini-boot-emblem{
 width:94px;height:101px;display:grid;place-items:center;
 font:700 51px Georgia,serif;color:#ffe3a3;
 background:linear-gradient(135deg,#4d3870,#263659);
 border:3px solid #e4b66e;clip-path:polygon(50% 0,96% 15%,91% 71%,50% 100%,9% 71%,4% 15%);
 filter:drop-shadow(0 7px 14px #0007);text-shadow:0 2px 9px #120d2e;
}
#mini-boot-screen h1{font:800 clamp(24px,5vw,37px)/1.08 Georgia,serif;letter-spacing:.04em;margin:9px 0 0}
#mini-boot-screen .mini-boot-kicker{font:800 12px Georgia,serif;letter-spacing:.26em;color:#e7bf7b;margin:0}
#mini-boot-screen .mini-boot-line{width:min(240px,72vw);height:3px;margin:10px 0 0;background:#6b7694;border-radius:3px;overflow:hidden}
#mini-boot-screen .mini-boot-line:before{content:"";display:block;width:38%;height:100%;background:linear-gradient(90deg,#bc7dcc,#fce5a2);animation:mini-boot-progress 1.5s ease-in-out infinite alternate}
#mini-boot-screen .mini-boot-status{font:500 13px/1.4 system-ui,sans-serif;color:#cad9e5;margin:0}
#mini-boot-retry{margin:9px 0 0;padding:11px 17px;border-radius:12px;border:1px solid #efd39e;background:#2c4666;color:#ffefce;font:800 13px system-ui,sans-serif;cursor:pointer}
#mini-boot-retry[hidden]{display:none!important}
html.mini-modern-ready #mini-boot-screen{display:none!important}
@keyframes mini-boot-progress{from{transform:translateX(-110%)}to{transform:translateX(290%)}}
@media(prefers-reduced-motion:reduce){#mini-boot-screen .mini-boot-line:before{animation:none;width:75%}}
</style>
<script>
(function(){
 let revealed=false;
 window.__miniBootReady=function(){
  if(revealed)return;
  revealed=true;
  const finish=function(){
   requestAnimationFrame(function(){
    document.documentElement.classList.add('mini-modern-ready');
    document.getElementById('mini-boot-screen')?.remove();
   });
  };
  if(document.readyState==='loading'||document.readyState==='interactive')
   document.addEventListener('DOMContentLoaded',finish,{once:true});
  else finish();
 };
 setTimeout(function(){
  if(revealed)return;
  var retry=document.getElementById('mini-boot-retry');
  var status=document.getElementById('mini-boot-status');
  if(retry)retry.hidden=false;
  if(status)status.textContent='Não foi possível concluir a abertura do jogo.';
 },12000);
})();
</script>
'''
BOOT_BODY = r'''<div id="mini-boot-screen" role="status" aria-live="polite" aria-label="Carregando Batalha de Miniaturas">
 <div class="mini-boot-emblem" aria-hidden="true">⚔</div>
 <h1>Batalha de Miniaturas</h1>
 <p class="mini-boot-kicker">LIGA DOS REINOS</p>
 <div class="mini-boot-line" aria-hidden="true"></div>
 <p class="mini-boot-status" id="mini-boot-status">Preparando os reinos...</p>
 <button id="mini-boot-retry" type="button" hidden onclick="location.reload()">Recarregar jogo</button>
</div>
<noscript><style>
 #mini-boot-screen{display:none!important}
 html:not(.mini-modern-ready) body > :not(#mini-boot-screen):not(script){visibility:visible!important}
</style></noscript>'''

def apply_startup_html(html: str) -> str:
    for marker in ('</head>','<body>','</body>'):
        if html.count(marker) != 1:
            raise RuntimeError('Falha na preparação da tela inicial: marcador '+marker)
    html=html.replace('</head>', BOOT_HEAD+'</head>',1)
    html=html.replace('<body>', '<body>\n'+BOOT_BODY,1)
    html=html.replace('<title>Batalha de Miniaturas — Prévia 2.13.0</title>',
                      '<title>Batalha de Miniaturas — Liga dos Reinos</title>',1)
    return html
