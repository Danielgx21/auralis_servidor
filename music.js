'use strict';
// Manual das Criaturas 1.0.6 — trilhas instrumentais originais via Web Audio.
// Som somente após toque explícito. As notas privilegiam frequências audíveis em celulares.
const manualMusic = {
  timer: null,
  beat: 0,
  nextAt: 0,
  desired: Number(localStorage.getItem('manual_music_volume_v106') || 85) / 100,
  tracks: {
    gothic: {
      name: 'Gótico', step: .42,
      melody: [64,67,71,74,72,69,67,62,64,69,71,67,62,64,59,67],
      bass: [40,43,41,38], chords: [[52,55,59],[55,59,62],[53,57,60],[50,54,57]]
    },
    mist: {
      name: 'Névoa', step: .54,
      melody: [67,74,72,69,65,69,72,76,74,72,69,65,67,69,65,62],
      bass: [41,45,43,38], chords: [[53,57,60],[57,60,64],[55,59,62],[50,53,57]]
    },
    astral: {
      name: 'Astral', step: .35,
      melody: [69,76,73,81,78,76,73,69,71,78,76,83,81,78,76,73],
      bass: [45,49,47,42], chords: [[57,61,64],[61,64,68],[59,62,66],[54,57,61]]
    }
  }
};
const manualMusicName = () => (manualMusic.tracks[saved.soundtrack] || manualMusic.tracks.gothic).name;
function manualNote(ctx, output, key, at, duration, wave, level) {
  if (!Number.isFinite(at) || at < 0) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  const end = at + Math.max(.1,duration), freq = 440 * Math.pow(2,(key - 69)/12);
  osc.type = wave;
  osc.frequency.setValueAtTime(freq,at);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(level,at+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  osc.connect(gain);
  gain.connect(output);
  osc.start(at); osc.stop(end+.025);
}
function manualSchedule() {
  const ctx=sound.ctx;
  if(!sound.playing || !ctx || ctx.state!=='running')return;
  const track=manualMusic.tracks[saved.soundtrack]||manualMusic.tracks.gothic;
  if(manualMusic.nextAt < ctx.currentTime-.4)manualMusic.nextAt=ctx.currentTime+.045;
  let count=0;
  while(manualMusic.nextAt < ctx.currentTime + .22 && count++<5){
    const index=manualMusic.beat % 16, bar=Math.floor(manualMusic.beat/4)%4;
    const at=Math.max(ctx.currentTime+.003,manualMusic.nextAt);
    manualNote(ctx,sound.master,track.melody[index],at,track.step*.8,'triangle',.095);
    if(index%2===0)manualNote(ctx,sound.master,track.bass[bar]+12,at,track.step*1.4,'sine',.052);
    if(index%4===0) {
      for(const chordNote of track.chords[bar])manualNote(ctx,sound.master,chordNote,at,track.step*3.6,'sine',.018);
    }
    manualMusic.beat++;
    manualMusic.nextAt+=track.step;
  }
}
function manualSetVolume(percent){
  manualMusic.desired=Math.min(1,Math.max(.10,Number(percent)/100||.85));
  try{localStorage.setItem('manual_music_volume_v106',String(Math.round(manualMusic.desired*100)))}catch{}
  if(sound.master&&sound.ctx){
    sound.master.gain.setTargetAtTime(.55*manualMusic.desired,sound.ctx.currentTime,.03);
  }
}
ambientStop = function(){
  if(manualMusic.timer){clearInterval(manualMusic.timer);manualMusic.timer=null}
  const ctx=sound.ctx;
  sound.playing=false;sound.ctx=null;sound.master=null;
  if(ctx){
    try{ctx.close().catch(()=>{})}catch{}
  }
};
ambientToggle = function(){
  if(sound.playing){ambientStop();toast('Música desligada.');render();return}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){toast('Este navegador não oferece áudio Web Audio.');return}
  let ctx;
  try{
    ctx=new AC();
    const master=ctx.createGain();
    master.gain.value=.55*manualMusic.desired;
    master.connect(ctx.destination);
    sound.ctx=ctx;sound.master=master;
    // A chamada a resume ocorre diretamente no toque, exigência do Chrome Android.
    Promise.resolve(ctx.resume()).then(()=>{
      if(sound.ctx!==ctx)return;
      if(ctx.state!=='running')throw Error('Áudio suspenso pelo navegador');
      manualMusic.beat=0;
      manualMusic.nextAt=ctx.currentTime+.045;
      sound.playing=true;
      manualSchedule();
      manualMusic.timer=setInterval(manualSchedule,90);
      toast('♫ Música '+manualMusicName()+' ligada. Ajuste o volume se precisar.');
      render();
    }).catch(err=>{
      if(sound.ctx===ctx)ambientStop();
      toast('Toque em Ligar música novamente e confira o volume de mídia do aparelho.');
      render();
    });
  }catch(err){
    if(ctx){try{ctx.close()}catch{}}
    sound.ctx=null;sound.master=null;sound.playing=false;
    toast('Não foi possível iniciar o som. Confira o volume de mídia.');
    render();
  }
};
changeSoundtrack=function(){
  const order=['gothic','mist','astral'];
  saved.soundtrack=order[(order.indexOf(saved.soundtrack)+1)%order.length];
  saveWallet();
  if(sound.playing && sound.ctx){
    manualMusic.beat=0;
    manualMusic.nextAt=sound.ctx.currentTime+.1;
  }
  toast('Atmosfera musical: '+manualMusicName());
  render();
};
// Reiniciar uma missão não deve desligar uma trilha que o jogador ativou.
const manualOldSetupCase=setupCase;
setupCase=function(id,isNew){
  const previouslyPlaying=sound.playing;
  manualOldSetupCase(id,isNew);
  // Se código legado interromper a trilha, não tentar autoplay: ela só pode
  // ser reativada por um toque. Nesta versão, a chamada legada é evitada.
  if(previouslyPlaying && !sound.playing)toast('Toque em Ligar música para retomar a trilha.');
};
document.addEventListener('pointerdown',function(){
  // Se o Android suspendeu um contexto já autorizado, um novo toque tenta retomar.
  if(sound.playing && sound.ctx && sound.ctx.state==='suspended'){
    sound.ctx.resume().then(manualSchedule).catch(()=>{});
  }
},{passive:true});
document.addEventListener('visibilitychange',function(){
  if(!document.hidden && sound.playing && sound.ctx && sound.ctx.state==='running'){
    manualMusic.nextAt=sound.ctx.currentTime+.045;
    manualSchedule();
  }
});
app.addEventListener('input',function(ev){
  if(ev.target?.id==='manualMusicVolume')manualSetVolume(ev.target.value);
});
// Música permanece acessível na Sede e no ícone da parte superior.
// Nenhuma barra fixa é adicionada sobre o menu ou a navegação.
const manualOriginalOfficePage=officePage;
officePage=function(){
  const content=manualOriginalOfficePage();
  return content.replace(
    '<div class="audioControl">',
    '<div class="audioControl"><label class="musicVolumeLabel" for="manualMusicVolume">Volume da música <input id="manualMusicVolume" type="range" min="15" max="100" step="5" value="'+Math.round(manualMusic.desired*100)+'" aria-label="Volume da música"></label>'
  );
};
