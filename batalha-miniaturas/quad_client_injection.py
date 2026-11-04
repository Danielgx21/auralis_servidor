"""Ponte compatível com o combate 1x1 já existente para uma sala ranqueada de quatro participantes.

Não substitui o HTML histórico: injeta pequenas funções no script da página em memória.
"""
QUAD_HEAD = r"""
 if(msg.type==='quad_emote'){
  pvpMessage({type:'emote',emote:msg.emote,sender:msg.sender,name:msg.name});
  return;
 }
 if(msg.type==='quad_joined'){
  if(!Array.isArray(msg.participants)||msg.participants.length!==4||!msg.pair){pvpSetStatus('Falha ao formar quatro participantes.');return;}
  const original=msg.reconnected&&pvp.active;
  if(!original){
   pvpMessage({type:'joined',ranked:true,code:msg.code,seat:msg.pair?.role||0,
    round:msg.round||1,wins:[0,0],hp:msg.pair?.hp||[70,70],token:msg.token,
    names:msg.pair?.names||['Jogador','Adversário'],connected:[true,true],
    seriesWins:[0,0],history:[],prepDeadline:Date.now()+120000,
    blessingOffer:msg.blessingOffer||[],ownBuffs:msg.ownBuffs});
  }else{
   pvp.reconnectToken=msg.token||pvp.reconnectToken;
   pvp.round=msg.round||pvp.round;
   pvp.ready=false;pvp.waitingNext=false;
   clearTimeout(pvp.reconnectTimer);pvp.reconnectAttempts=0;
   game.phase='prep';
  }
  pvp.quad=true;pvp.ranked=true;pvp.quadSeat=msg.seat;pvp.quadCode=msg.code;
  pvp.quadParticipants=msg.participants||[];pvp.quadOpponentSeat=msg.pair?.opponentSeat??null;
  if(!original){pvp.quadPlacements=[];pvp.quadRoundResult=null;pvp.quadRating=null;pvp.quadDelta=null;pvp.quadPlace=null;}
  if(msg.pair){
   pvp.seat=msg.pair.role;pvp.names=msg.pair.names;pvp.hp=msg.pair.hp;
   pvp.connected=msg.pair.connected;
  }
  savePvpSession();pvpUpdateBanner();render();
  if(original)pvpSetStatus('Reconectado ao ranqueado de quatro jogadores.');
  return;
 }
 if(msg.type==='quad_state'){
  pvp.quadParticipants=msg.participants||pvp.quadParticipants||[];
  pvp.quadPhase=msg.phase;
  if(pvp.active){
   const pair=pvp.quadParticipants.find(p=>p.seat===pvp.quadSeat);
   if(pair?.eliminated && msg.phase!=='done'){
    game.phase='pvp_wait';pvp.ready=false;pvp.waitingNext=true;
    pvpSetStatus('Você foi eliminado. Aguardando o fim da partida para ver sua colocação.');
   }else pvpUpdateBanner();
  }
  return;
 }
 if(msg.type==='quad_resume_result'){
  game.phase='result';pvp.waitingNext=false;
  if(msg.pair){pvp.seat=msg.pair.role;pvp.names=msg.pair.names;pvp.hp=msg.pair.hp;pvp.quadOpponentSeat=msg.pair.opponentSeat;}
  openModal('⚔️','Rodada concluída','Você voltou durante o intervalo entre rodadas.',
   'Confira sua equipe e confirme quando os outros estiverem prontos.',
   '➡️ PRÓXIMA RODADA','O jogo continuará com seus personagens salvos.',
   ()=>{closeModal();pvpAdvance()});
  return;
 }
 if(msg.type==='quad_blessing_offer'){
  pvpMessage({type:'blessingOffer',round:msg.round,options:msg.options,
   taken:msg.taken,ownBuffs:msg.ownBuffs});return;
 }
 if(msg.type==='quad_blessing_confirmed'){
  pvpMessage({type:'blessingConfirmed',round:msg.round,
    id:msg.id,ownBuffs:msg.ownBuffs});return;
 }
 if(msg.type==='quad_ready_confirmed'){
  pvpSetStatus('Equipe pronta! Aguardando os outros participantes.');return;
 }
 if(msg.type==='quad_prep_timeout'){
  if(pvp.active){pvp.ready=false;game.phase='prep';pvp.prepDeadline=msg.deadline;
   pvpSetStatus('Tempo de preparação reiniciado. Confirme sua equipe.');render();}
  return;
 }
 if(msg.type==='quad_start'){
  pvp.quad=true;pvp.quadPhase='combat';
  pvp.seat=msg.pair.role;pvp.names=msg.pair.names;
  pvp.quadOpponentSeat=msg.pair.opponentSeat;pvp.hp=msg.pair.hp;pvp.connected=[true,true];
  pvpMessage({type:'start',round:msg.round,opponentUnits:msg.opponentUnits,
   opponentBuffs:msg.opponentBuffs,ownBuffs:msg.ownBuffs});
  return;
 }
 if(msg.type==='quad_frame'){
  pvpMessage({type:'frame',frame:msg.frame});return;
 }
 if(msg.type==='quad_result'){
  pvp.quadParticipants=msg.participants||pvp.quadParticipants;
  pvp.quadPhase='result';
  pvp.quadRoundResult={round:msg.round,damage:msg.damage,winnerSeat:msg.winnerSeat,loserSeat:msg.winnerSeat===pvp.quadSeat?msg.pair.opponentSeat:pvp.quadSeat};
  pvp.seat=msg.pair.role;pvp.names=msg.pair.names;pvp.hp=msg.pair.hp;pvp.quadOpponentSeat=msg.pair.opponentSeat;
  const all=pvp.quadParticipants||[];
  const a=all.find(p=>p.seat===(msg.pair.role===0?pvp.quadSeat:msg.pair.opponentSeat));
  const b=all.find(p=>p.seat===(msg.pair.role===0?msg.pair.opponentSeat:pvp.quadSeat));
  const wins=[a?.wins||0,b?.wins||0];
  pvpMessage({type:'result',hostWin:msg.hostWin,wins,hp:msg.pair.hp,
   damage:msg.damage,done:false,seriesWins:[0,0],history:[]});
  return;
 }
 if(msg.type==='quad_next_round'){
  pvp.quadParticipants=msg.participants||pvp.quadParticipants||[];
  pvp.quadPhase='prep';pvp.quadRoundResult=null;pvp.seat=msg.pair.role;pvp.quadOpponentSeat=msg.pair.opponentSeat;
  pvp.names=msg.pair.names;pvp.hp=msg.pair.hp;
  pvp.connected=msg.pair.connected;
  pvpMessage({type:'nextRound',round:msg.round,wins:pvp.wins,
   hp:msg.pair.hp,lastWinner:msg.lastWin?msg.pair.role:1-msg.pair.role,
   blessingOffer:msg.blessingOffer||[],ownBuffs:msg.ownBuffs});
  savePvpSession();return;
 }
 if(msg.type==='quad_rating'){
  pvp.quadRating=msg.rating||null;pvp.quadDelta=msg.delta;pvp.quadPlace=msg.place;
  document.dispatchEvent(new CustomEvent('mini-ranked',{
   detail:{type:'ranked_rating',rating:msg.rating,delta:msg.delta,
    place:msg.place,won:msg.place<=2}
  }));
  return;
 }
 if(msg.type==='quad_final'){
  pvp.quadPhase='done';pvp.matchDone=true;pvp.quadPlacements=msg.placements||[];
  const own=msg.placements?.find(p=>p.seat===pvp.quadSeat);
  const label=own?own.place+'º lugar':'Partida encerrada';
  const places=(msg.placements||[]).map(p=>p.place+'º '+p.name+(p.bot?' 🤖':'')).join(' · ');
  clearTimeout(clock);
  closeModal();
  game.phase='result';
  pvpUpdateBanner();
  openModal('🏆',label,'Resultado final do ranqueado de quatro participantes.',
   places,'🏠 VOLTAR AO MENU','O elo é salvo na sua conta.',
   ()=>{closeModal();pvpLeave();showHome()});
  return;
 }
"""

QUAD_SEND = r"""
 if(pvp.quad){
  const types={ready:'quad_ready',frame:'quad_frame',finish:'quad_finish',
   next:'quad_next',emote:'quad_emote',blessing:'quad_blessing',leave:'quad_leave'};
  if(types[msg.type])msg={...msg,type:types[msg.type]};
 }
"""

QUAD_BANNER = r"""
 if(pvp.quad && pvp.quadParticipants){
  const list=pvp.quadParticipants;
  $('pvpMatchTitle').innerHTML='⚔️ <strong>Ranqueado · 4 jogadores</strong> · Rodada '+pvp.round;
  $('pvpHpBars').innerHTML=list.map(person=>'<div><div class="hp-pair"><span>'+
    esc(person.name)+(person.isBot?' 🤖':'')+(person.eliminated?' · Eliminado':'')+
    '</span><span>❤️ '+Math.max(0,person.hp)+' / 70</span></div>'+
    '<div class="pvp-health-track"><span style="width:'+
    Math.max(0,Math.min(100,person.hp/70*100))+'%"></span></div></div>').join('');
  $('pvpMatchStatus').textContent=pvp.matchDone?'Partida encerrada':
   game.phase==='combat'?'⚔️ Combate automático':
   game.phase==='pvp_wait'?'✅ Aguardando outros participantes':
   game.phase==='result'?'🏆 Resultado':'🛡️ Monte sua equipe';
  return;
 }
"""


def apply_quad_html(html):
    # Strings exatas, testadas com o HTML v2.13 preservado na branch.
    patches=[
      ("function pvpMessage(msg){","function pvpMessage(msg){"+QUAD_HEAD),
      ("function pvpSend(msg){","function pvpSend(msg){"+QUAD_SEND),
      ("function pvpUpdateBanner(){","function pvpUpdateBanner(){"+QUAD_BANNER),
      ("pvpWireSocket(new WebSocket(pvpServerUrl()),{type:'ranked_queue'});",
       "pvp.quad=true;pvpWireSocket(new WebSocket(pvpServerUrl()),{type:'quad_queue'});"),
      ("return (u.protocol==='https:'?'wss:':u.protocol==='http:'?'ws:':u.protocol)+'//'+u.host+'/ws';",
       "return (u.protocol==='https:'?'wss:':u.protocol==='http:'?'ws:':u.protocol)+'//'+u.host+(pvp.quad?'/ws-quad':'/ws');"),
      ("pvpWireSocket(socket,{type:'resume',code:pvp.room,token:pvp.reconnectToken,name:pvp.names[pvp.seat]},true);",
       "pvpWireSocket(socket,pvp.quad?{type:'quad_resume',code:pvp.room,token:pvp.reconnectToken}:{type:'resume',code:pvp.room,token:pvp.reconnectToken,name:pvp.names[pvp.seat]},true);"),
      ("pvp.socket.send(JSON.stringify({type:'leave'}));",
       "pvp.socket.send(JSON.stringify({type:pvp.quad?'quad_leave':'leave'}));"),
      ("game=pvp.soloGame||game;pvp.active=false;pvp.ranked=false;",
       "game=pvp.soloGame||game;pvp.active=false;pvp.quad=false;pvp.ranked=false;"),
      ("type:'ranked_cancel'", "type:pvp.quad?'quad_cancel':'ranked_cancel'"),
      ("}else if(!pvp.leaving)pvpSetStatus('Sem conexão ao servidor.');",
       "}else if(!pvp.leaving){pvpSetStatus('Sem conexão ao servidor.');if(pvp.quad&&!pvp.active)document.dispatchEvent(new CustomEvent('mini-ranked',{detail:{type:'ranked_disconnected'}}));}"),
      ("}pvp.ranked=false;modeShell(false);showGame();", "}pvp.ranked=false;pvp.quad=false;modeShell(false);showGame();"),
      ("if(!data||!data.token||!/^[A-Z0-9]{6}$/.test(data.room)",
       "if(!data||!data.token||!/^[A-Z0-9]{6,8}$/.test(data.room)"),
      ("const state={time:Date.now(),room:pvp.room,token:pvp.reconnectToken,seat:pvp.seat,round:pvp.round,",
       "const state={time:Date.now(),room:pvp.room,token:pvp.reconnectToken,quad:!!pvp.quad,quadSeat:pvp.quadSeat,quadParticipants:pvp.quadParticipants,seat:pvp.seat,round:pvp.round,"),
      ("pvp.room=data.room;pvp.reconnectToken=data.token;pvp.seat=data.seat===1?1:0;",
       "pvp.room=data.room;pvp.reconnectToken=data.token;pvp.quad=!!data.quad;pvp.quadSeat=data.quadSeat;pvp.quadParticipants=data.quadParticipants||[];pvp.seat=data.seat===1?1:0;"),
      # No ranqueado, não revelar a formação do adversário anterior durante a preparação.
      ("(pvp.active&&game.phase==='prep'&&game.lastSeenOpponents?.length?game.lastSeenOpponents:game.preview)",
       "(pvp.quad?[]:pvp.active&&game.phase==='prep'&&game.lastSeenOpponents?.length?game.lastSeenOpponents:game.preview)"),
      ("const known=pvp.active&&game.phase==='prep'&&(game.lastSeenOpponents||[]).length>0;",
       "const known=!pvp.quad&&pvp.active&&game.phase==='prep'&&(game.lastSeenOpponents||[]).length>0;"),
    ]
    for old,new in patches:
        if old not in html:
            raise RuntimeError("A interface original mudou e não é possível integrar os quatro jogadores: "+old[:90])
        html=html.replace(old,new,1)
    return html
