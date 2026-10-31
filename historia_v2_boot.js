'use strict';
(function install(){
 const palette=[
  ['#0a1724','#254455','#bfa278'],['#21172c','#67465a','#e5af83'],
  ['#151a26','#35435a','#b6a180'],['#131d20','#365148','#b3b18a'],
  ['#17212c','#4c4059','#c6b7a8'],['#101a25','#29515c','#b0cbd5']
 ];
 function inkSVG(title,theme,seed){
  const p=palette[seed%palette.length];
  const arches=theme==='vault'||theme==='crypt'||theme==='theater';
  const outdoor=theme==='forest';
  const shelving=theme==='archive'||theme==='office'||theme==='laboratory';
  const structural=arches?
   '<path d="M90 480V190Q600-90 1110 190V480" fill="none" stroke="#51616a" stroke-width="65" opacity=".45"/><path d="M140 430Q600-60 1060 430" fill="none" stroke="#27343d" stroke-width="18" opacity=".7"/>':
   outdoor?
   '<path d="M0 410Q190 220 380 420T750 350T1200 395V650H0Z" fill="#172b31"/><path d="M135 540L160 130L190 540M955 540L940 65L1020 540" stroke="#2f3a33" stroke-width="46"/><path d="M45 350L160 100L270 350M800 390L945 80L1100 390" stroke="#203735" stroke-width="40" fill="none"/>':
   '<g stroke="#49606b" stroke-width="14" opacity=".52"><path d="M110 480V130L600 105L1090 130V480"/><path d="M160 155V470M1040 155V470M600 110V470"/></g>'+
   (shelving?'<g fill="#263944" stroke="#657070" stroke-width="6"><rect x="90" y="210" width="245" height="260"/><rect x="860" y="210" width="255" height="260"/><path d="M90 295H335M90 383H335M860 295H1115M860 383H1115"/></g>':'');
  const vertical=theme==='machine'?'<g stroke="#a08362" stroke-width="22" opacity=".58"><path d="M185 90V510H480V350M950 85V505H710V210"/><circle cx="705" cy="335" r="42" fill="none" stroke-width="16"/></g>':'';
  const lamp='<circle cx="598" cy="175" r="118" fill="url(#lamp)"/><path d="M597 85V208" stroke="#9d987e" stroke-width="6"/><path d="M562 218Q598 180 634 218" stroke="#d9bb82" stroke-width="12" fill="none"/>';
  const items=`<g transform="translate(290 556) rotate(-8)"><rect x="-92" y="-92" width="170" height="126" rx="7" fill="#a29a87" stroke="#382f2b" stroke-width="12"/><path d="M-56-60H46M-56-35H32M-56-10H52" stroke="#4d4e4b" stroke-width="5" opacity=".65"/><path d="M-86 -94L73-94" stroke="#dec6a0" stroke-width="6"/></g>
   <g transform="translate(672 338)"><ellipse rx="100" ry="85" fill="#152934" stroke="#987b59" stroke-width="10"/><circle r="62" fill="#354a4e" stroke="#aeaa8e" stroke-width="9"/><path d="M0 0L26-39" stroke="#b0d8d3" stroke-width="8"/><circle r="10" fill="#e3c89d"/><path d="M-42 49H42" stroke="#b19a7b" stroke-width="6"/></g>
   <g transform="translate(958 560)"><rect x="-101" y="-103" width="203" height="158" rx="8" fill="#4c4038" stroke="#a18468" stroke-width="12"/><path d="M-99-39H102M-45-103V57M47-103V57" stroke="#816750" stroke-width="15"/><circle cx="0" cy="-37" r="12" fill="#c7b38f"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760">
 <defs><linearGradient id="bg" x2=".2" y2="1"><stop stop-color="${p[0]}"/><stop offset=".58" stop-color="${p[1]}"/><stop offset="1" stop-color="#0b1a23"/></linearGradient>
 <radialGradient id="lamp"><stop stop-color="${p[2]}" stop-opacity=".39"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient>
 <radialGradient id="vig"><stop offset=".48" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient>
 <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="${seed+4}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer></filter>
 </defs><rect width="1200" height="760" fill="url(#bg)"/>
 <path d="M0 495L600 403L1200 495V760H0Z" fill="#111f29" opacity=".8"/>
 ${structural}${vertical}<circle cx="598" cy="175" r="118" fill="url(#lamp)"/>${lamp}
 <path d="M0 500H1200M0 650H1200M600 422L270 760M600 422L950 760" fill="none" stroke="#647071" stroke-width="4" opacity=".21"/>
 <path d="M80 700L510 460H720L1110 700" fill="none" stroke="#d0af79" stroke-width="6" opacity=".13"/>
 ${items}<rect width="1200" height="760" fill="url(#vig)"/>
 <rect width="1200" height="760" filter="url(#noise)" opacity=".24"/>
 <path d="M32 24H1168V736H32Z" fill="none" stroke="${p[2]}" stroke-opacity=".30" stroke-width="4"/>
 </svg>`;
 }
 function portraitSVG(seed){
  const p=palette[seed%palette.length],hair=seed%3,coat=seed%2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 370" width="300" height="370">
  <defs><radialGradient id="b"><stop stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></radialGradient></defs>
  <rect width="300" height="370" fill="url(#b)"/><path d="M0 370Q30 255 122 261H178Q269 255 300 370" fill="${coat?'#253f49':'#37333e'}" stroke="#988571" stroke-width="5"/>
  <path d="M92 257L150 320L208 257" fill="none" stroke="#bdac95" stroke-width="5"/>
  <ellipse cx="150" cy="165" rx="71" ry="96" fill="#b69a80" stroke="#765b51" stroke-width="5"/>
  <path d="${hair===0?'M80 150Q55 35 151 45Q250 40 220 158L205 108Q150 80 96 117Z':hair===1?'M78 131Q76 27 170 50Q225 50 220 129L190 89L115 94Z':'M76 135Q63 50 141 39Q224 30 230 134L202 103L95 94Z'}" fill="${hair===1?'#544638':'#24262c'}"/>
  <path d="M120 156H137M169 156H185" stroke="#362e2b" stroke-width="6"/><path d="M150 178L143 205H156" stroke="#7d6155" stroke-width="4" fill="none"/><path d="M126 231Q150 244 176 230" stroke="#76544d" stroke-width="4" fill="none"/>
  <path d="M20 23H280V347H20Z" fill="none" stroke="${p[2]}" opacity=".47" stroke-width="4"/></svg>`;
 }
 window.manualApplyStories=function(){
  const stories=window.MANUAL_STORIES||{},CASE=window.CASES||CASES;
  for(const [id,info] of Object.entries(stories)){
   const c=CASE[id];if(!c)continue;
   const primaryKeys=Object.keys(c.witness.questions).filter(key=>!/^v2_w/.test(key)).slice(0,3);
   c.v2Mode=info.mode;c.v2Lead=info.lead;c.v2Report=info.report;c.v2Truth=info.truth;
   if(!Number.isFinite(c.v2MinClues))c.v2MinClues=Math.min(9,(c.minClues||5)+2);
   c.minClues=c.v2MinClues;
   c.v2Goal={title:info.goal[0],description:info.goal[1],clues:[info.goal[2],'v2_a_2']};
   c.brief=info.lead+' '+info.report;c.intro=info.lead;c.quote='“'+info.quote+'”';
   c.revealTitle='Relatório final · '+c.short;
   c.reveal=info.truth;c.revealQuote='“'+info.quote+'”';c.conclusion=info.truth;
   const endingTexts={
    libertar:'Os envolvidos são retirados do risco imediato. '+info.truth+' O Instituto registra os nomes e mantém a investigação das responsabilidades humanas.',
    negociar:'Foi estabelecido um acordo provisório. '+info.truth+' O fenômeno permanece sob observação; não se presume que todas as versões estejam corretas.',
    expor:'O Instituto publica os documentos confrontados. '+info.truth+' A divulgação protege testemunhas, mas provoca resistência de quem manipulou os registros.',
    selar:'A área é isolada para impedir novos incidentes. '+info.truth+' O isolamento não resolve a parte humana do caso; as provas ficam preservadas.'
   };
   for(const [endingId,outcome] of Object.entries(c.outcomes||{}))if(endingTexts[endingId])outcome.text=endingTexts[endingId];
   const baseNames=Object.keys(c.scenes).filter(key=>key!=='v2_a'&&key!=='v2_b').slice(0,3);
   baseNames.forEach((key,n)=>{if(c.scenes[key])c.scenes[key].intro=info.base[n]||c.scenes[key].intro;});
   c.witness.intro=info.primary[0];
   primaryKeys.forEach((key,n)=>{const pair=info.primary[1][n];if(pair)c.witness.questions[key]={...c.witness.questions[key],q:pair[0],answer:pair[1]};});
   const extras={};
   info.places.forEach((place,k)=>{
    const [name,subtitle,intro,role,theme,clueRows]=place;
    const sceneId=k===0?'v2_a':'v2_b',items=[];
    const coords=[[24,72],[56,45],[80,72]];
    clueRows.forEach((row,j)=>{
     const clueId=sceneId+'_'+(j+1),xy=coords[j];items.push(clueId);
     c.clues[clueId]={name:row[0],detail:row[1],insight:'Compare com outras fontes antes de concluir.',x:xy[0],y:xy[1]};
    });
    extras[sceneId]={role,theme};
    c.scenes[sceneId]={name,subtitle,intro,items,image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(inkSVG(name,theme,(id.length*7+k*11+Object.keys(stories).indexOf(id))%997))};
   });
   c.v2Locations=extras;
   c.v2Witnesses={};
   info.people.forEach((person,i)=>{
    const [name,job,intro,role,hours,questions]=person;
    const key='v2_w'+(i+1),ids=[];
    questions.forEach((pair,j)=>{
     const qId=key+'_'+(j+1);ids.push(qId);
     c.witness.questions[qId]={q:pair[0],answer:pair[1],trust:j===2?1:0};
    });
    c.v2Witnesses[key]={name,job,intro,role,hours,ids,image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(portraitSVG(id.length*9+i*5+Object.keys(stories).indexOf(id)))};
   });
   c.v2PrimaryQuestionIds=primaryKeys;c.v2Version=2;
  }
 };
 window.manualApplyStories();
})();
