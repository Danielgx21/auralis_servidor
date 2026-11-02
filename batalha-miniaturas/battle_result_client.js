(function miniResultClient() {
  'use strict';
  const $=id=>document.getElementById(id),modal=$('modal');
  if(!modal || typeof window.openModal!=='function'||window.__miniResultUI)return;
  window.__miniResultUI=true;
  const css=document.createElement('style');
  css.textContent=`
#modal.mini-result{padding:10px;overflow-y:auto;overscroll-behavior:contain;z-index:9995;align-items:center}
#modal.mini-result .modal-body{width:min(520px,100%);max-height:calc(100dvh - 22px);overflow:auto;overscroll-behavior:contain;padding:0 16px 18px;border:2px solid #d8af73;border-radius:21px;background:linear-gradient(160deg,#293e5c,#162a43 55%,#112238);box-shadow:0 18px 65px #000b;text-align:center}
#modal.mini-result .mr-heading{margin:0 -16px 12px;padding:18px 15px 15px;border-bottom:1px solid #b8956777;background:radial-gradient(ellipse at 50% 20%,#866e714c,transparent 68%),linear-gradient(#304967,#1c314c)}
#modal.mini-result.mr-loss .mr-heading{background:radial-gradient(ellipse at 50% 16%,#a2545d4a,transparent 70%),linear-gradient(#3d374f,#25364e)}
#modal.mini-result .mr-eyebrow{display:block;color:#e9bb79;font-size:10px;letter-spacing:.19em;font-weight:900;text-transform:uppercase}
#modal.mini-result .modal-icon{font-size:45px;margin:7px 0 3px;filter:drop-shadow(0 3px 7px #0007)}
#modal.mini-result #modalTitle{font:800 clamp(25px,5.8vw,33px)/1.09 Georgia,serif;color:#ffdfab;margin:3px 0}
#modal.mini-result.mr-loss #modalTitle{color:#ffd0c9}
#modal.mini-result #modalText{font-size:13px;line-height:1.42;color:#d4e5ef;margin:9px 4px 12px}
#modal.mini-result .mr-summary{display:grid;gap:9px;margin:12px 0}
#modal.mini-result .mr-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
#modal.mini-result .mr-stat{background:#10263d;border:1px solid #597a90;border-radius:11px;padding:9px 4px;display:grid;gap:5px}
#modal.mini-result .mr-key{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#afc5d4;font-weight:800}
#modal.mini-result .mr-value{font:800 clamp(15px,4.5vw,20px) Georgia,serif;color:#ffdda5;font-variant-numeric:tabular-nums}
#modal.mini-result .mr-list{display:grid;gap:7px}
#modal.mini-result .mr-person{display:flex;gap:10px;align-items:center;text-align:left;border:1px solid #5b768b;border-radius:11px;background:#142a43;padding:9px 10px}
#modal.mini-result .mr-person.mr-me{border-color:#e5b36e;background:linear-gradient(95deg,#363746,#213951)}
#modal.mini-result .mr-place{min-width:37px;height:35px;display:grid;place-items:center;font:800 17px Georgia,serif;border-radius:9px;border:1px solid #bd9268;background:#334963;color:#ffe7b7}
#modal.mini-result .mr-person.mr-top .mr-place{background:#2c5545;border-color:#8acbaa}
#modal.mini-result .mr-person.mr-low .mr-place{background:#653942;border-color:#d38e8b}
#modal.mini-result .mr-detail{min-width:0;flex:1;display:grid;gap:5px}
#modal.mini-result .mr-name{font-size:13px;color:#f7e8cc;font-weight:800;overflow-wrap:anywhere}
#modal.mini-result .mr-track{height:5px;background:#0b1b2e;border-radius:50px;overflow:hidden}
#modal.mini-result .mr-track>i{display:block;height:100%;background:linear-gradient(90deg,#ba5e67,#e7a085)}
#modal.mini-result .mr-hp{font-size:12px;white-space:nowrap;color:#e4ecf6;font-variant-numeric:tabular-nums;font-weight:800}
#modal.mini-result #modalReward{margin:10px 0;padding:11px;border-radius:11px;border:1px solid #987950;background:#12283e;color:#f7daa5;font-size:13px;overflow-wrap:anywhere}
#modal.mini-result #modalReward[hidden]{display:none!important}
#modal.mini-result #modalAction{width:100%;min-height:53px;border:1px solid #f9dfac;background:linear-gradient(#f6dba2,#d6a566);border-radius:13px;box-shadow:0 3px 0 #81603f;color:#2b2531;font:800 clamp(16px,4vw,20px) Georgia,serif;white-space:normal;margin:8px 0}
#modal.mini-result #modalReportBtn{width:100%;border-radius:11px;padding:10px;background:#243d55;color:#e1ecf5;border:1px solid #7896af}
#modal.mini-result #modalSub{font-size:11px;line-height:1.4;color:#b8ccdc}
#modal.mini-result .modal-report{text-align:left}
@media(max-width:350px){#modal.mini-result .mr-stats{gap:4px}#modal.mini-result .mr-stat{padding:7px 2px}#modal.mini-result .modal-body{padding-left:10px;padding-right:10px}#modal.mini-result .mr-heading{margin-left:-10px;margin-right:-10px}}
@media(prefers-reduced-motion:no-preference){#modal.mini-result:not(.hidden) .modal-body{animation:mr-show .22s ease-out}@keyframes mr-show{from{transform:translateY(10px);opacity:.7}to{transform:none;opacity:1}}}
  `;
  css.textContent+="\n#modal.mini-result{padding:max(10px,env(safe-area-inset-top)) 10px max(12px,env(safe-area-inset-bottom));overscroll-behavior:contain}\n#modal.mini-result .modal-body{box-sizing:border-box;max-height:calc(100dvh - 22px);width:min(530px,100%);max-width:100%;padding-bottom:calc(17px + env(safe-area-inset-bottom))}\n#modal.mini-result .mr-person{min-width:0}\n#modal.mini-result .mr-name{line-height:1.4}\n#modal.mini-result #modalText{overflow-wrap:anywhere}\n#modal.mini-result #modalAction{touch-action:manipulation}\n#modal.mini-result .mr-requeue{width:100%;min-height:48px;margin:5px 0 10px;border:1px solid #87a9ca;border-radius:12px;background:#253f59;color:#fff;font-weight:850;font-size:14px;touch-action:manipulation}\n#modal.mini-result .mr-requeue[hidden]{display:none!important}\n";
  document.head.append(css);
  const body=modal.querySelector('.modal-body'),ico=$('modalIcon'),title=$('modalTitle'),paragraph=$('modalText'),reward=$('modalReward'),button=$('modalAction');
  const header=document.createElement('div');header.className='mr-heading';const eyebrow=document.createElement('span');eyebrow.className='mr-eyebrow';header.append(eyebrow,ico,title);body.insertBefore(header,body.firstChild);
  const summary=document.createElement('section');summary.className='mr-summary';summary.setAttribute('aria-label','Resumo do combate');body.insertBefore(summary,reward);
  function element(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e}
  function stats(values){const el=element('div','mr-stats');values.forEach(([key,val])=>{const card=element('div','mr-stat');card.append(element('span','mr-key',key),element('strong','mr-value',val));el.append(card)});summary.append(el)}
  function standings(players,ranking){const list=element('div','mr-list');for(const p of players){const row=element('div','mr-person');if(p.me)row.classList.add('mr-me');if(ranking&&p.place<=2)row.classList.add('mr-top');if(ranking&&p.place>=3)row.classList.add('mr-low');const position=element('span','mr-place',ranking?`${p.place}º`:(p.icon||'⚔'));const details=element('div','mr-detail');details.append(element('span','mr-name',(p.name||'Jogador')+(p.bot?' 🤖':'')));if(p.hp!=null){const track=element('div','mr-track'),fill=document.createElement('i');fill.style.width=Math.max(0,Math.min(100,Number(p.hp)/70*100))+'%';track.append(fill);details.append(track)}row.append(position,details,element('span','mr-hp',p.hp==null?(p.me?'VOCÊ':''):`♥ ${Math.max(0,p.hp)}/70`));list.append(row)}summary.append(list)}
  const another=document.createElement('button');
  another.type='button';another.className='mr-requeue';another.textContent='⚔️ BUSCAR OUTRA PARTIDA';another.hidden=true;
  body.insertBefore(another,$('modalSub'));
  const prior=window.openModal;
  window.openModal=function(icon,heading,description,rewardText,action,footer,callback){
    const ret=prior.apply(this,arguments);let online=false,quad=false,campaign=false;
    try{online=!!pvp.active;quad=online&&!!pvp.quad;campaign=!online&&game.phase==='result'}catch{}
    const result=campaign||(online&&(/rodada|duelo|lugar|vitória|derrota|venceu/i.test(String(heading))||quad));
    modal.classList.toggle('mini-result',result);modal.classList.remove('mr-loss');
    if(!result)return ret;
    summary.replaceChildren();another.hidden=true;
    let victory=/vitória|venceu|1º lugar|2º lugar/i.test(String(heading));
    try{if(online&&!quad)victory=pvp.seat===pvp.lastWinner}catch{}
    modal.classList.toggle('mr-loss',!victory);
    eyebrow.textContent=quad?(/^\dº lugar/i.test(heading)?'CLASSIFICAÇÃO FINAL':'CONFRONTO CONCLUÍDO'):online?(pvp.matchDone?'FIM DA PARTIDA':'RESULTADO DA RODADA'):'RESULTADO DE BATALHA';
    if(quad){
      const participants=Array.isArray(pvp.quadParticipants)?pvp.quadParticipants:[];
      const finished=pvp.quadPhase==='done'||(pvp.matchDone&&Array.isArray(pvp.quadPlacements)&&pvp.quadPlacements.length===4);
      const mine=participants.find(p=>p.seat===pvp.quadSeat);
      if(finished){
        const placements=Array.isArray(pvp.quadPlacements)?pvp.quadPlacements:[];
        const own=placements.find(p=>p.seat===pvp.quadSeat);
        const place=Number(own?.place||pvp.quadPlace||0);
        const delta=Number.isFinite(Number(pvp.quadDelta))?Number(pvp.quadDelta):({1:15,2:5,3:-5,4:-15}[place]??null);
        const points=delta==null?'—':(delta>0?'+':'')+delta;
        const rating=pvp.quadRating;
        eyebrow.textContent='CLASSIFICAÇÃO FINAL · 4 PARTICIPANTES';
        title.textContent=place?place+'º LUGAR':'PARTIDA ENCERRADA';
        ico.textContent=place===1?'🏆':place===2?'🥈':'🛡️';
        modal.classList.toggle('mr-loss',place>=3);
        paragraph.textContent='A partida terminou. Confira a classificação e seus pontos.';
        stats([['Sua posição',place?place+'º':'—'],['Ranking',points],['Elo atualizado',rating?(rating.division||'Bronze')+' · '+rating.points:'—']]);
        if(placements.length===4){
          const list=element('div','mr-list');
          for(const person of placements.slice().sort((a,b)=>a.place-b.place)){
            const row=element('div','mr-person'+(person.seat===pvp.quadSeat?' mr-me':'')+(person.place<=2?' mr-top':' mr-low'));
            const info=element('div','mr-detail');
            info.append(element('span','mr-name',person.name+(person.seat===pvp.quadSeat?' · VOCÊ':'')+(person.bot?' 🤖':'')));
            info.append(element('small','mr-key',person.bot?'BOT · sem pontos':person.seat===pvp.quadSeat?'Sua classificação':'Participante'));
            row.append(element('span','mr-place',person.place+'º'),info,
             element('span','mr-hp',person.bot?'BOT':person.seat===pvp.quadSeat?points+' pts':''));
            list.append(row);
          }
          summary.append(list);
        }
        reward.hidden=true;
        button.textContent='🏠 VOLTAR AO MENU';
        button.onclick=()=>{closeModal();pvpLeave();showHome()};
        another.hidden=false;
        another.onclick=()=>{closeModal();pvpLeave();showHome();setTimeout(()=>$('homePvp')?.click(),40)};
        $('modalSub').textContent='Ranking salvo na conta. Bots não recebem pontos.';
      }else{
        const data=pvp.quadRoundResult||{};
        const winner=participants.find(p=>p.seat===data.winnerSeat);
        const loser=participants.find(p=>p.seat===data.loserSeat);
        const won=data.winnerSeat===pvp.quadSeat;
        const eliminated=!!mine?.eliminated;
        eyebrow.textContent='RANQUEADO · RODADA '+(data.round||pvp.round);
        title.textContent=won?'VITÓRIA NA RODADA':'DERROTA NA RODADA';
        ico.textContent=won?'⚔️':'🛡️';
        modal.classList.toggle('mr-loss',!won);
        stats([['Rodada',data.round||pvp.round],['Dano',data.damage??pvp.lastDamage??'—'],['Sua vida',mine?.hp!=null?mine.hp+'/70':'—']]);
        if(participants.length)standings(participants.map(p=>({name:p.name,hp:p.hp,bot:p.isBot,me:p.seat===pvp.quadSeat,icon:p.eliminated?'💀':'⚔️'})),false);
        paragraph.textContent=winner&&loser?winner.name+' venceu '+loser.name+'.':'Confronto concluído.';
        reward.hidden=true;
        button.textContent=eliminated?'⏳ AGUARDAR CLASSIFICAÇÃO':'➡️ PRÓXIMA RODADA';
        if(eliminated)button.onclick=()=>closeModal();
        $('modalSub').textContent=eliminated?'Você foi eliminado. O resultado final aparecerá ao terminar a partida.':'Continue quando os participantes estiverem prontos.';
      }
    }else if(online){
      stats([['Rodada',pvp.round],['Dano',pvp.lastDamage||0],['Vitórias',(pvp.wins?.[0]||0)+' × '+(pvp.wins?.[1]||0)]]);
      standings((pvp.names||[]).slice(0,2).map((name,i)=>({name,hp:pvp.hp?.[i]??70,me:i===pvp.seat,icon:i===pvp.seat?'🛡':'⚔'})),false);
      paragraph.textContent=pvp.matchDone?'Partida encerrada. Confira o placar final.':victory?'Sua equipe venceu. Prepare-se para a próxima rodada.':'Sua equipe perdeu a rodada. Ajuste sua estratégia e continue.';
      reward.hidden=true;
    }else{
      const gold=String(rewardText||'').match(/\+(\d+)\s*🪙/);
      stats([['Rodada',game.round],['Resultado',victory?'Vitória':'Derrota'],['Ouro',gold?'+'+gold[1]:'—']]);
    }
    if(/próxima rodada/i.test(button.textContent))button.textContent='➡️ CONTINUAR · PRÓXIMA RODADA';
    return ret;
  };
})();