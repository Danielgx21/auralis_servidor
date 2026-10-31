'use strict';
/* Arquivo 001: artes pictóricas integradas às cenas e às testemunhas.
   A pintura é única; áreas transparentes identificam apenas objetos já visíveis.
   Mantém as chaves das pistas, salvamentos e regras de acesso anteriores. */
(function(){
  if(typeof CASES==='undefined'||!CASES.lago||!CASES.lago.scenes)return;
  const C=CASES.lago,root='assets/manual_arquivo001/';
  const scenes={
    v2_a:'centro_controle.webp',
    v2_b:'galeria_bombas.webp',
    v2_c:'arquivo_obras.webp',
    v2_d:'enfermaria.webp',
    v2_e:'nascente.webp'
  };
  for(const [id,name] of Object.entries(scenes)){
    if(!C.scenes[id])continue;
    C.scenes[id].fallbackImage=C.scenes[id].image;
    C.scenes[id].image=root+name;
    C.scenes[id].artRatio='880 / 1244';
    C.scenes[id].artMode='pintura-integrada';
  }
  const portraits={
    v2_w1:'otavio.webp',
    v2_w2:'celina.webp',
    v2_w3:'augusto.webp',
    v2_w4:'dario.webp',
    v2_w5:'moira.webp'
  };
  for(const [id,name] of Object.entries(portraits)){
    if(C.v2Witnesses?.[id]) C.v2Witnesses[id].image=root+name;
  }
  // [x,y,largura,altura] em percentuais relativos à pintura PORTRAIT real.
  // Os centros correspondem aos objetos pintados, nunca a adesivos de interface.
  const targets={
    v2_a_1:[25,70,28,17], // folhas da escala, sobre a mesa
    v2_a_2:[90,39,18,28], // instrumentos e painel da linha C-0
    v2_a_3:[57,37,21,16], // planta fixada na parede do fundo
    v2_b_1:[60,82,27,18], // pegadas sobre o chão úmido
    v2_b_2:[90,48,18,24], // painel do relé
    v2_b_3:[93,28,13,12], // aviso triangular na parede do quadro
    v2_c_1:[43,57,25,16], // papéis antigos sobre a mesa
    v2_c_2:[68,66,25,18], // ordem/registro aberto junto à luminária
    v2_c_3:[80,91,25,15], // correspondência no maço de documentos
    v2_d_1:[31,64,23,14], // prontuário sobre a escrivaninha
    v2_d_2:[54,79,27,17], // folha com desenho da passagem
    v2_d_3:[49,44,24,25], // uniforme úmido sobre o leito
    v2_e_1:[13,47,26,30], // laje à esquerda com nomes gastos
    v2_e_2:[76,43,27,23], // tubo de bronze
    v2_e_3:[87,70,19,20]  // corrente junto à parede
  };
  for(const [id,rect] of Object.entries(targets)){
    const e=C.clues[id];if(!e)continue;
    [e.x,e.y,e.hitW,e.hitH]=rect;
  }
  C.v2ArtReady=true;
  // Se uma imagem falhar durante a atualização de cache, restaura a arte anterior.
  document.addEventListener('error',function(event){
    const image=event.target;
    if(!image?.matches?.('.lagoHdScene>img'))return;
    const scene=Object.values(C.scenes).find(x=>x.image===image.getAttribute('src'));
    if(scene?.fallbackImage&&!image.dataset.backupLoaded){image.dataset.backupLoaded='1';image.src=scene.fallbackImage;}
  },true);
  const style=document.createElement('style');
  style.textContent='.v2SceneFrame.lagoHdScene{aspect-ratio:880/1244!important;width:calc(100% - 22px);height:auto!important;margin:0 11px;border-radius:13px;border:1px solid #8e876c}.v2SceneFrame.lagoHdScene>img{width:100%;height:100%;object-fit:contain!important;object-position:center;display:block}.v2SceneFrame.lagoHdScene .v2InvisibleHotspot{opacity:0;outline:none;background:transparent}.v2SceneFrame.lagoHdScene .v2InvisibleHotspot:focus-visible{opacity:1;outline:2px solid #ebd7ad}.v2WitnessPortrait{background-repeat:no-repeat;background-size:cover;background-position:center 23%}.expandedWitnessCard img{aspect-ratio:3/4;object-fit:cover!important;object-position:center 17%}.locationsArtZoomPlane>.v2InvisibleHotspot{opacity:0;background:transparent!important;z-index:6;position:absolute}@media(max-width:480px){.v2SceneFrame.lagoHdScene{width:100%;margin:0;border-radius:12px}.v2WitnessPortrait{height:330px}}';
  document.head.appendChild(style);
})();