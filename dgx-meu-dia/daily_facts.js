/* DGX Meu Dia — conhecimento diário. Conteúdo editorial, não manchetes em tempo real.
   Seleção determinística por data do calendário de São Paulo, sem aleatoriedade:
   mesmo texto ao longo do dia; uma entrada nova a cada virada de data. */
(function(){
"use strict";
const FACTS=[
["Biologia","Corais são animais","Apesar de parecerem plantas ou rochas, corais são animais cnidários. Muitos vivem associados a microalgas que produzem parte de seus nutrientes."],
["Química","Por que o pH muda tanto?","A escala de pH é logarítmica: uma solução com pH 3 tem cerca de cem vezes mais íons hidrogênio livres do que outra com pH 5, nas mesmas condições."],
["Física","A luz do Sol leva tempo para chegar","A luz solar leva aproximadamente oito minutos e vinte segundos para chegar à Terra. Ao olhar o Sol, vemos a luz emitida há alguns minutos."],
["História","A pedra que ajudou a ler hieróglifos","Descoberta em 1799, a Pedra de Roseta trouxe um mesmo texto em diferentes escritas e foi decisiva para decifrar os hieróglifos egípcios."],
["Geografia","A Antártida também é um deserto","Desertos são definidos pela escassez de precipitação, não pelo calor. Por isso, grande parte da Antártida é considerada um deserto polar."],
["Ciências","Vacinas e memória imunológica","Muitas vacinas apresentam ao organismo um antígeno ou instruções para produzi-lo, ajudando o sistema imune a reconhecer um agente infeccioso no futuro."],
["Política","Um marco dos direitos humanos","Em 10 de dezembro de 1948, a Assembleia Geral da ONU proclamou a Declaração Universal dos Direitos Humanos, em Paris.","https://www.un.org/en/about-us/universal-declaration-of-human-rights"],
["Arte","A imagem de um protesto contra a guerra","Pablo Picasso pintou Guernica em 1937, em resposta ao bombardeio da cidade espanhola. A obra se tornou um símbolo artístico contra a violência da guerra."],

["Biologia","Mitocôndrias têm DNA próprio","Além de participar da produção de energia nas células eucarióticas, as mitocôndrias possuem DNA próprio, uma pista importante de sua origem evolutiva."],
["Química","Diamante e grafite são parentes","Diamante e grafite são formados por carbono. A diferença na organização dos átomos explica propriedades tão distintas, como dureza e condução elétrica."],
["Física","Som não viaja no vácuo","O som precisa de um meio material para se propagar. No espaço praticamente vazio, uma explosão distante não produziria o ruído ouvido em filmes."],
["História","A prensa transformou a circulação de ideias","Na Europa do século XV, a impressão com tipos móveis associada a Gutenberg ampliou a produção e a circulação de livros e outros textos."],
["Geografia","As placas tectônicas não param","As placas da litosfera se movem, em geral, alguns centímetros por ano. Seus limites estão associados a muitos terremotos e vulcões."],
["Ciências","Um eclipse solar não acontece em toda Lua nova","Um eclipse solar exige um alinhamento específico entre Sol, Lua e Terra. A órbita lunar é inclinada, então nem toda Lua nova produz um eclipse."],
["Política","Uma conquista histórica do sufrágio","Em 1893, a Nova Zelândia tornou-se o primeiro país autogovernado a reconhecer o voto das mulheres nas eleições parlamentares.","https://www.women.govt.nz/about-us/history-womens-suffrage-aotearoa-new-zealand"],
["Arte","O nome do impressionismo","O quadro Impressão, nascer do sol, de Claude Monet, exposto em 1874, ajudou a dar nome ao movimento impressionista."],

["Biologia","Fungos não são plantas","Os fungos não fazem fotossíntese. Eles obtêm matéria orgânica do ambiente e têm um papel fundamental na decomposição de restos de seres vivos."],
["Química","Dissolver não é necessariamente reagir","Quando açúcar se dissolve em água, suas moléculas se dispersam no líquido. Isso não significa que tenham sido transformadas em outra substância."],
["Física","Dobrar a velocidade quadruplica uma energia","Para um objeto de massa constante, a energia cinética é proporcional ao quadrado da velocidade. Dobrar a velocidade multiplica essa energia por quatro."],
["História","A Revolução Industrial começou na Grã-Bretanha","A industrialização moderna ganhou força na Grã-Bretanha durante a segunda metade do século XVIII, com profundas mudanças na produção e no trabalho."],
["Geografia","O Amazonas é gigante em vazão","O rio Amazonas tem a maior vazão de água do mundo. O volume que transporta reflete sua enorme bacia hidrográfica e as chuvas da região."],
["Ciências","Correlação não é prova de causa","Duas variáveis podem variar juntas por coincidência, influência de uma terceira variável ou uma relação causal. É preciso investigar antes de concluir."],
["Política","O que a separação dos poderes tenta fazer","A ideia de distribuir funções de governo entre instituições busca reduzir a concentração de poder. Montesquieu a discutiu em O espírito das leis, de 1748."],
["Arte","A Grande Onda é uma xilogravura","A Grande Onda de Kanagawa, de Hokusai, foi criada como gravura em madeira no Japão do século XIX, e não como uma pintura a óleo."],

["Biologia","Polvos têm três corações","Os polvos possuem dois corações que impulsionam sangue para as brânquias e outro que o bombeia para o restante do corpo."],
["Química","O sal de cozinha é um cristal iônico","No cloreto de sódio sólido, íons de sódio e de cloreto se organizam em uma rede cristalina, em vez de formarem moléculas isoladas de NaCl."],
["Física","Por que o céu parece azul?","A atmosfera espalha a luz solar de comprimentos de onda menores com maior eficiência. Esse fenômeno ajuda a explicar o céu azul e os tons vermelhos do pôr do sol."],
["História","A peste negra mudou sociedades","A epidemia de peste do século XIV causou enorme mortalidade na Europa, afetando relações sociais, economia e trabalho."],
["Geografia","A escala do mapa tem consequências práticas","Em um mapa de escala 1 para 100 mil, um centímetro equivale a um quilômetro no terreno, desconsiderando as deformações da projeção."],
["Ciências","PCR permite copiar trechos de DNA","A reação em cadeia da polimerase, ou PCR, amplifica regiões específicas de DNA e tornou-se essencial em pesquisa, diagnósticos e investigações."],
["Política","Atenas não incluía toda a população","Na democracia da Atenas antiga, a participação política era restrita a uma parcela dos habitantes. Mulheres, escravizados e muitos estrangeiros estavam excluídos."],
["Arte","Abaporu foi pintado em 1928","Tarsila do Amaral pintou Abaporu em 1928. A obra teve papel central no movimento antropofágico do modernismo brasileiro."],

["Biologia","Bactérias podem trocar genes","Além de se reproduzirem por divisão, bactérias podem transferir material genético entre si, por mecanismos como a conjugação."],
["Química","Ferrugem é transformação química","A corrosão do ferro envolve reações de oxidação na presença de água e oxigênio. Ela produz compostos diferentes do metal original."],
["Física","A Lua não emite luz própria","A Lua é visível porque reflete a luz do Sol. Suas fases correspondem à porção iluminada que conseguimos observar da Terra."],
["História","A era Meiji começou em 1868","A Restauração Meiji marcou uma grande reorganização política e social no Japão e abriu caminho para mudanças rápidas na economia e na educação."],
["Geografia","O Equador cruza três continentes","A linha do Equador atravessa áreas da América do Sul, da África e da Ásia, além dos oceanos que separam essas regiões."],
["Ciências","Meteoros e meteoritos não são a mesma coisa","O rastro luminoso na atmosfera é chamado de meteoro. Quando parte do material resiste e chega ao solo, recebe o nome de meteorito."],
["Política","A Carta da ONU entrou em vigor em 1945","A Organização das Nações Unidas foi criada após a Segunda Guerra Mundial. Sua Carta entrou em vigor em 24 de outubro de 1945."],
["Arte","Uma noite estrelada virou ícone","Vincent van Gogh pintou A Noite Estrelada em 1889. A obra mistura um céu intensamente movimentado com a paisagem de uma vila."],

["Biologia","Estômatos são pequenas portas das folhas","Estômatos regulam trocas gasosas e parte da perda de água das plantas. Sua abertura depende de fatores como luz e disponibilidade de água."],
["Química","Vinagre com bicarbonato libera um gás","A reação entre ácido acético e bicarbonato de sódio pode liberar dióxido de carbono, responsável por muitas bolhas observadas na mistura."],
["Física","Pêndulos ajudam a medir o tempo","Para pequenas oscilações, o período de um pêndulo simples depende principalmente de seu comprimento e da gravidade local, não da massa do peso."],
["História","Hatshepsut governou o Egito antigo","Hatshepsut foi uma mulher que exerceu o poder de faraó durante a XVIII dinastia egípcia, milhares de anos antes da era comum."],
["Geografia","Os fusos horários também são convenções","A rotação terrestre explica a diferença entre dia e noite, mas os limites dos fusos horários legais também dependem de decisões de cada país."],
["Ciências","O efeito estufa é natural e essencial","Gases de efeito estufa absorvem e emitem radiação infravermelha, mantendo a Terra mais aquecida do que seria sem esse efeito. Seu aumento intensifica o aquecimento."],
["Política","A Carta Magna foi assinada em 1215","Na Inglaterra medieval, a Magna Carta de 1215 estabeleceu limites a determinadas práticas do poder real. Seu significado político mudou ao longo dos séculos."],
["Arte","A arquitetura também é uma linguagem artística","Luz, espaço, materiais e proporções são elementos expressivos da arquitetura; uma construção pode comunicar ideias além de atender funções práticas."]
];
const $=id=>document.getElementById(id);
const dateSP=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let renderedDay="";
function current(){
 const date=dateSP();
 const time=Date.parse(date+"T00:00:00Z");
 const index=Math.floor(time/86400000)%FACTS.length;
 const record=FACTS[index];
 return {date,category:record[0],title:record[1],text:record[2],source:record[3]||""};
}
function update(){
 const fact=current();
 if(renderedDay===fact.date)return;
 renderedDay=fact.date;
 const cat=$("dailyFactCategory"),title=$("dailyFactTitle"),body=$("dailyFactText");
 if(!cat||!title||!body)return;
 cat.textContent=fact.category;
 title.textContent=fact.title;
 body.textContent=fact.text;
 const link=$("dailyFactSource");
 if(link){
  if(fact.source){
   link.href=fact.source;link.hidden=false;
  }else{
   link.removeAttribute("href");link.hidden=true;
  }
 }
 const d=new Date(fact.date+"T12:00:00Z");
 $("dailyFactDate").textContent=new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC",day:"numeric",month:"long"}).format(d);
}
window.DGXdailyFact=current;
window.DGXdailyFactRefresh=update;
update();
setInterval(update,60000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)update()});
window.addEventListener("focus",update);
})();