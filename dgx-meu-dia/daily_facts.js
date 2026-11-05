/* DGX Meu Dia — conhecimento diário. Conteúdo editorial, não manchetes em tempo real.
   Seleção determinística por data do calendário de São Paulo, sem aleatoriedade:
   mesmo texto ao longo do dia; uma entrada nova a cada virada de data. */
(function(){
"use strict";
const FACTS=[
 [
  "Biologia",
  "Corais são animais, não plantas",
  "Cada coral é formado por pequenos animais. Muitos deles vivem em parceria com algas microscópicas."
 ],
 [
  "Química",
  "Por que uma diferença de pH importa tanto?",
  "A escala de pH não cresce de um em um como uma régua. Uma solução de pH 3 tem cerca de 100 vezes mais íons de hidrogênio do que outra de pH 5."
 ],
 [
  "Física",
  "A luz do Sol demora para chegar aqui",
  "A luz solar leva cerca de oito minutos para chegar à Terra. O Sol que vemos no céu é, na verdade, a imagem de alguns minutos atrás."
 ],
 [
  "História",
  "Uma pedra ajudou a traduzir o Egito antigo",
  "A Pedra de Roseta tinha o mesmo texto escrito de formas diferentes. Isso ajudou pesquisadores a entender os hieróglifos egípcios."
 ],
 [
  "Geografia",
  "O maior deserto do mundo é gelado",
  "A Antártida é considerada um deserto porque quase não recebe precipitação. Um deserto não precisa ser quente."
 ],
 [
  "Ciências",
  "Como as vacinas ajudam o corpo?",
  "As vacinas preparam nossas defesas para reconhecer determinados microrganismos. Assim, o organismo pode reagir melhor se encontrá-los depois."
 ],
 [
  "Política",
  "Um documento sobre direitos humanos",
  "Em 1948, a ONU proclamou a Declaração Universal dos Direitos Humanos. O texto reúne direitos que devem valer para todas as pessoas.",
  "https://www.un.org/en/about-us/universal-declaration-of-human-rights"
 ],
 [
  "Arte",
  "Uma pintura nasceu de um bombardeio",
  "Picasso pintou Guernica em 1937 após o bombardeio de uma cidade espanhola. A obra se tornou um símbolo da violência da guerra."
 ],
 [
  "Biologia",
  "Partes das nossas células têm DNA próprio",
  "As mitocôndrias ajudam as células a produzir energia e possuem um pouco de DNA próprio. Isso é uma pista de sua origem evolutiva."
 ],
 [
  "Química",
  "Diamante e grafite são feitos da mesma coisa",
  "Os dois são feitos de carbono. A diferença é como os átomos estão organizados: por isso um é muito duro e o outro se desgasta facilmente."
 ],
 [
  "Física",
  "No espaço não há som como nos filmes",
  "O som precisa de matéria para se espalhar, como ar ou água. No vácuo do espaço, não ouviríamos o barulho de uma explosão distante."
 ],
 [
  "História",
  "Uma máquina ajudou a espalhar livros",
  "No século XV, a impressão com tipos móveis ganhou força na Europa. Ela facilitou a produção de livros e a circulação de ideias."
 ],
 [
  "Geografia",
  "Os continentes ainda estão se movendo",
  "As enormes placas que formam a parte externa da Terra se movem alguns centímetros por ano. Esse movimento está ligado a terremotos e vulcões."
 ],
 [
  "Ciências",
  "Por que não há eclipse em toda Lua nova?",
  "A órbita da Lua é inclinada. Por isso, ela quase sempre passa um pouco acima ou abaixo da linha entre a Terra e o Sol."
 ],
 [
  "Política",
  "Quando as mulheres passaram a votar na Nova Zelândia?",
  "Em 1893, a Nova Zelândia reconheceu o voto das mulheres nas eleições parlamentares, um marco na história do sufrágio.",
  "https://www.women.govt.nz/about-us/history-womens-suffrage-aotearoa-new-zealand"
 ],
 [
  "Arte",
  "Uma pintura deu nome a um movimento",
  "O quadro Impressão, nascer do sol, de Claude Monet, ajudou a dar nome ao impressionismo, no século XIX."
 ],
 [
  "Biologia",
  "Fungos não são plantas",
  "Cogumelos e outros fungos não fazem fotossíntese. Muitos deles ajudam a decompor folhas, madeira e outros restos de seres vivos."
 ],
 [
  "Química",
  "Dissolver açúcar não cria outra substância",
  "Quando colocamos açúcar na água, suas moléculas se espalham pelo líquido. O açúcar continua sendo açúcar, mesmo sem aparecer."
 ],
 [
  "Física",
  "O dobro da velocidade não é só o dobro de energia",
  "Se a massa de um objeto não muda, dobrar sua velocidade faz sua energia de movimento ficar quatro vezes maior."
 ],
 [
  "História",
  "Uma transformação começou nas fábricas",
  "A Revolução Industrial ganhou força na Grã-Bretanha no século XVIII, mudando a maneira de produzir mercadorias e organizar o trabalho."
 ],
 [
  "Geografia",
  "O rio Amazonas transporta muita água",
  "O Amazonas é o rio com maior vazão do planeta. A água vem de uma bacia enorme, alimentada por chuvas e muitos afluentes."
 ],
 [
  "Ciências",
  "Duas coisas juntas nem sempre têm causa e efeito",
  "Sorvetes e afogamentos podem aumentar no verão. Isso não quer dizer que sorvete provoque afogamento: o calor influencia os dois."
 ],
 [
  "Política",
  "Por que dividir o poder do Estado?",
  "A separação entre poderes busca evitar que todas as decisões de governo fiquem concentradas numa única instituição."
 ],
 [
  "Arte",
  "Uma famosa onda nasceu de uma gravura",
  "A Grande Onda de Kanagawa, de Hokusai, foi feita usando matrizes de madeira para impressão, e não tinta a óleo sobre tela."
 ],
 [
  "Biologia",
  "Polvos têm três corações",
  "Dois corações ajudam a levar sangue às brânquias. O terceiro bombeia sangue para o restante do corpo."
 ],
 [
  "Química",
  "O sal de cozinha não é formado por moléculas isoladas",
  "No sal sólido, partículas com cargas elétricas opostas ficam organizadas em uma estrutura que se repete, formando cristais."
 ],
 [
  "Física",
  "Por que o céu é azul?",
  "A luz do Sol tem várias cores. Ao atravessar o ar, a luz azul se espalha mais do que muitas outras cores, fazendo o céu parecer azul."
 ],
 [
  "História",
  "Uma epidemia mudou a Europa medieval",
  "No século XIV, a peste negra matou milhões de pessoas e provocou grandes mudanças na economia e nas relações de trabalho."
 ],
 [
  "Geografia",
  "Um centímetro no mapa pode representar um quilômetro",
  "Em um mapa com escala de 1 para 100 mil, cada centímetro equivale a um quilômetro na realidade."
 ],
 [
  "Ciências",
  "Como cientistas conseguem copiar DNA?",
  "Uma técnica chamada PCR permite produzir muitas cópias de um trecho de DNA. Ela é usada em pesquisas e em diferentes exames."
 ],
 [
  "Política",
  "Na Atenas antiga, nem todos podiam votar",
  "A participação política era limitada a parte da população. Mulheres, pessoas escravizadas e muitos estrangeiros não tinham esse direito."
 ],
 [
  "Arte",
  "Abaporu é uma obra brasileira de 1928",
  "Tarsila do Amaral pintou Abaporu em 1928. A obra se tornou um marco do modernismo brasileiro."
 ],
 [
  "Biologia",
  "Bactérias podem compartilhar genes",
  "Além de se multiplicarem, algumas bactérias conseguem passar pedaços de material genético umas para as outras."
 ],
 [
  "Química",
  "A ferrugem é uma mudança química",
  "Quando o ferro reage com o oxigênio e a água, podem surgir novos compostos. É assim que se forma a ferrugem."
 ],
 [
  "Física",
  "A Lua não brilha com luz própria",
  "A luz que vemos na Lua vem do Sol. As fases mudam conforme a parte iluminada que conseguimos enxergar daqui."
 ],
 [
  "História",
  "O Japão passou por grandes mudanças em 1868",
  "A Restauração Meiji marcou uma reorganização do governo japonês e abriu caminho para transformações sociais e econômicas."
 ],
 [
  "Geografia",
  "A linha do Equador atravessa três continentes",
  "Ela passa por regiões da América do Sul, da África e da Ásia. Também cruza oceanos."
 ],
 [
  "Ciências",
  "Qual é a diferença entre meteoro e meteorito?",
  "O brilho que vemos quando uma rocha espacial atravessa a atmosfera é um meteoro. Se um pedaço chega ao chão, é um meteorito."
 ],
 [
  "Política",
  "A ONU foi criada em 1945",
  "A Carta das Nações Unidas entrou em vigor em 24 de outubro de 1945, pouco depois do fim da Segunda Guerra Mundial."
 ],
 [
  "Arte",
  "Van Gogh pintou um céu inesquecível",
  "A Noite Estrelada foi pintada em 1889. O céu cheio de curvas é uma das marcas mais conhecidas dessa obra."
 ],
 [
  "Biologia",
  "As folhas têm pequenas aberturas",
  "Os estômatos permitem trocas de gases e ajudam a controlar a perda de água pelas plantas. São como pequenas portas nas folhas."
 ],
 [
  "Química",
  "Por que vinagre e bicarbonato fazem espuma?",
  "Ao misturar os dois, ocorre uma reação que libera gás carbônico. Esse gás forma as bolhas que vemos."
 ],
 [
  "Física",
  "Por que o pêndulo pode marcar o tempo?",
  "Um pêndulo mais curto balança mais rápido que um mais comprido. Seu ritmo previsível ajudou a criar relógios que medem o tempo."
 ],
 [
  "História",
  "Uma mulher governou como faraó no Egito",
  "Hatshepsut governou o Egito antigo durante a XVIII dinastia. Ela foi uma das mulheres que ocuparam o cargo de faraó."
 ],
 [
  "Geografia",
  "Por que países têm horários diferentes?",
  "A Terra gira, então o Sol não aparece no mesmo horário em todos os lugares. Além disso, cada país define seus fusos horários oficiais."
 ],
 [
  "Ciências",
  "O efeito estufa é importante para a vida",
  "Gases da atmosfera ajudam a manter a Terra aquecida. O problema é que o aumento desses gases intensifica o aquecimento global."
 ],
 [
  "Política",
  "Uma carta tentou limitar o poder do rei",
  "A Magna Carta foi acordada na Inglaterra em 1215 e impôs limites a algumas ações do rei. Ela ganhou novos significados ao longo do tempo."
 ],
 [
  "Arte",
  "Uma construção também pode ser arte",
  "Na arquitetura, o uso de luz, espaço e materiais pode criar beleza e transmitir ideias, além de servir para morar ou trabalhar."
 ],
 [
  "Biologia",
  "Como a água sobe pelas plantas?",
  "As plantas têm vasos internos que transportam água das raízes para outras partes. Esse sistema é chamado xilema."
 ],
 [
  "Química",
  "A água pode ferver abaixo de cem graus",
  "Em lugares de grande altitude, a pressão do ar é menor. Por isso, a água pode ferver a menos de 100 graus Celsius."
 ],
 [
  "Física",
  "O GPS precisa da teoria da relatividade",
  "Os relógios dos satélites funcionam em condições diferentes das da Terra. Correções previstas pela relatividade ajudam a manter a localização precisa."
 ],
 [
  "História",
  "A escrita ajudou a organizar cidades antigas",
  "Na Mesopotâmia, um dos primeiros usos da escrita foi registrar quantidades, produtos e outras informações do comércio e da administração."
 ],
 [
  "Geografia",
  "Nem todo rio chega ao mar do mesmo jeito",
  "Alguns formam deltas, com vários canais e acúmulo de sedimentos. Outros chegam por estuários, onde a influência das marés pode ser grande."
 ],
 [
  "Ciências",
  "A descoberta do DNA envolveu várias pessoas",
  "O modelo de dupla hélice publicado em 1953 contou com dados de diferentes pesquisadores, incluindo imagens produzidas por Rosalind Franklin e colaboradores."
 ],
 [
  "Política",
  "A ONU não tem apenas uma assembleia",
  "A Assembleia Geral reúne todos os países membros. O Conselho de Segurança tem responsabilidades específicas sobre paz e segurança internacionais."
 ],
 [
  "Arte",
  "O cinema contou histórias antes de ter som gravado",
  "Durante décadas, filmes usaram imagens, gestos e textos na tela para contar histórias, antes de o som sincronizado se popularizar."
 ]
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