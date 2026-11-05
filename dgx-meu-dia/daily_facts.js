/* DGX Meu Dia — conhecimento diário. Conteúdo editorial, não manchetes em tempo real.
   Seleção determinística por data do calendário de São Paulo, sem aleatoriedade:
   mesmo texto ao longo do dia; uma entrada nova a cada virada de data. */
(function(){
"use strict";
const FACTS=[
 [
  "Biologia",
  "Por que os corais são animais?",
  "Cada pequeno coral se alimenta e possui células animais. Muitos vivem em parceria com algas que lhes fornecem nutrientes. Por isso, mesmo parecendo pedras ou plantas, eles são animais."
 ],
 [
  "Química",
  "Por que duas unidades de pH fazem tanta diferença?",
  "Cada unidade de pH corresponde a uma diferença aproximada de dez vezes na acidez. Por isso, uma solução de pH 3 tem cerca de cem vezes mais íons de hidrogênio disponíveis que uma de pH 5, em condições comparáveis."
 ],
 [
  "Física",
  "Por que vemos o Sol com atraso?",
  "A luz precisa percorrer cerca de 150 milhões de quilômetros entre o Sol e a Terra. Essa viagem dura aproximadamente oito minutos e vinte segundos. Por isso, vemos o Sol como ele era alguns minutos atrás."
 ],
 [
  "História",
  "Como a Pedra de Roseta ajudou a decifrar hieróglifos?",
  "A pedra trazia o mesmo decreto em três formas de escrita, incluindo o grego, que estudiosos já conseguiam ler. A comparação dos textos ajudou a descobrir como interpretar os sinais egípcios."
 ],
 [
  "Geografia",
  "Por que a Antártida é considerada um deserto?",
  "Deserto é uma região onde chove ou neva muito pouco. Como grande parte da Antártida recebe pouquíssima precipitação ao longo do ano, ela é um deserto polar, mesmo coberta de gelo."
 ],
 [
  "Ciências",
  "Como as vacinas preparam nossas defesas?",
  "Muitas vacinas mostram ao sistema imunológico um componente de um microrganismo, ou instruções para produzi-lo. Isso ajuda a criar uma resposta de memória, para que o organismo reaja melhor no futuro."
 ],
 [
  "Política",
  "O que foi a Declaração Universal dos Direitos Humanos?",
  "Em 1948, a Assembleia Geral da ONU proclamou um documento que reúne direitos e liberdades fundamentais de todas as pessoas. Ele se tornou uma referência para acordos e leis de direitos humanos.",
  "https://www.un.org/en/about-us/universal-declaration-of-human-rights"
 ],
 [
  "Arte",
  "Por que Picasso pintou Guernica?",
  "Em 1937, o bombardeio da cidade espanhola de Guernica causou mortes e destruição. Picasso respondeu ao acontecimento com uma grande pintura que expressa o sofrimento provocado pela guerra."
 ],
 [
  "Biologia",
  "Por que as mitocôndrias têm DNA próprio?",
  "As mitocôndrias descendem de organismos que, há muito tempo, passaram a viver dentro de outras células. Elas mantiveram parte do seu material genético, um indício importante dessa história evolutiva."
 ],
 [
  "Química",
  "Como diamante e grafite podem ser tão diferentes?",
  "Ambos são feitos de carbono, mas seus átomos ficam ligados de maneiras diferentes. No diamante, a rede de ligações é muito rígida; no grafite, as camadas deslizam umas sobre as outras."
 ],
 [
  "Física",
  "Por que não ouviríamos uma explosão no espaço?",
  "O som é uma vibração que precisa viajar através de matéria, como ar, água ou metal. Como quase não há matéria no espaço entre os astros, esse som não se propagaria até nós."
 ],
 [
  "História",
  "Como a prensa ajudou a espalhar livros?",
  "A impressão com tipos móveis permitiu reutilizar letras para produzir muitas cópias de um texto. Isso tornou a produção de livros mais rápida do que copiar cada página à mão."
 ],
 [
  "Geografia",
  "Por que os continentes se movem?",
  "A parte mais externa da Terra é dividida em placas rochosas que se deslocam lentamente. Esse movimento altera a posição dos continentes e está ligado à formação de montanhas, terremotos e vulcões."
 ],
 [
  "Ciências",
  "Por que não há eclipse em toda Lua nova?",
  "Para ocorrer um eclipse solar, a Lua precisa passar exatamente entre o Sol e a Terra. Como sua órbita é inclinada, na maioria das luas novas ela passa acima ou abaixo dessa linha."
 ],
 [
  "Política",
  "O que mudou no voto feminino da Nova Zelândia em 1893?",
  "Em 1893, uma lei reconheceu o direito das mulheres de votar nas eleições parlamentares do país. Foi um marco importante, embora ainda houvesse outras desigualdades políticas.",
  "https://www.women.govt.nz/about-us/history-womens-suffrage-aotearoa-new-zealand"
 ],
 [
  "Arte",
  "Como surgiu o nome impressionismo?",
  "Em 1874, artistas exibiram pinturas que valorizavam luz e impressões visuais. O título de uma obra de Claude Monet, Impressão, nascer do sol, ajudou a dar nome ao movimento."
 ],
 [
  "Biologia",
  "Por que fungos não são plantas?",
  "Plantas geralmente produzem alimento por fotossíntese, mas os fungos obtêm nutrientes de matéria orgânica. Muitos decompõem restos de seres vivos e devolvem substâncias ao ambiente."
 ],
 [
  "Química",
  "Por que o açúcar desaparece na água?",
  "Quando o açúcar se dissolve, suas moléculas se espalham entre as moléculas de água. Ele continua presente, mesmo que não consigamos enxergá-lo."
 ],
 [
  "Física",
  "Por que dobrar a velocidade quadruplica a energia cinética?",
  "A energia de movimento depende do quadrado da velocidade. Assim, mantendo a massa igual, um objeto que se move duas vezes mais rápido possui quatro vezes mais energia cinética."
 ],
 [
  "História",
  "Como a Revolução Industrial mudou o trabalho?",
  "A partir do século XVIII, fábricas e máquinas passaram a concentrar etapas da produção, especialmente na Grã-Bretanha. Isso transformou profissões, cidades e formas de organizar o trabalho."
 ],
 [
  "Geografia",
  "Por que o Amazonas transporta tanta água?",
  "Ele recebe água de inúmeros rios que drenam uma região enorme da América do Sul. Com chuvas abundantes e muitos afluentes, o Amazonas apresenta a maior vazão entre os rios do planeta."
 ],
 [
  "Ciências",
  "Por que duas coisas podem aumentar juntas sem uma causar a outra?",
  "No calor, podem aumentar tanto o consumo de sorvete quanto os casos de afogamento. Isso não significa que sorvete cause afogamento: a temperatura influencia os dois fenômenos."
 ],
 [
  "Política",
  "Por que existem poderes separados no Estado?",
  "Dividir funções entre instituições permite que decisões sejam examinadas e limitadas por diferentes órgãos. A ideia procura evitar que todo o poder se concentre em uma única autoridade."
 ],
 [
  "Arte",
  "Como foi feita A Grande Onda de Kanagawa?",
  "Hokusai criou uma imagem que podia ser impressa em papel usando matrizes entalhadas em madeira. É uma gravura japonesa, não uma pintura a óleo."
 ],
 [
  "Biologia",
  "Por que os polvos precisam de três corações?",
  "Dois corações bombeiam sangue para as brânquias, onde ocorre a troca de gases. O terceiro envia sangue oxigenado para o restante do corpo."
 ],
 [
  "Química",
  "Como o sal forma cristais?",
  "No sal de cozinha sólido, íons de sódio e cloreto, com cargas opostas, se atraem e se organizam em uma rede que se repete. Essa organização forma seus cristais."
 ],
 [
  "Física",
  "Por que o céu parece azul durante o dia?",
  "A luz do Sol reúne várias cores. Ao passar pela atmosfera, a luz azul se espalha mais intensamente em muitas direções, chegando aos nossos olhos de várias partes do céu."
 ],
 [
  "História",
  "Como a peste negra afetou a Europa medieval?",
  "A peste matou milhões de pessoas no século XIV. Com menos trabalhadores disponíveis, muitas comunidades passaram por mudanças nas relações de trabalho e na economia."
 ],
 [
  "Geografia",
  "O que significa uma escala de 1 para 100 mil?",
  "Significa que cada medida no mapa representa cem mil vezes essa medida no terreno. Portanto, um centímetro no mapa equivale a um quilômetro na realidade."
 ],
 [
  "Ciências",
  "Como a técnica PCR copia DNA?",
  "A PCR aquece e resfria uma amostra em ciclos, usando enzimas para produzir novas cópias de um trecho específico de DNA. Isso permite estudar quantidades muito pequenas do material."
 ],
 [
  "Política",
  "Quem podia participar da democracia ateniense?",
  "Na Atenas antiga, a participação política formal era reservada a determinados homens cidadãos. Mulheres, pessoas escravizadas e muitos estrangeiros não tinham os mesmos direitos."
 ],
 [
  "Arte",
  "Por que Abaporu é importante na arte brasileira?",
  "Tarsila do Amaral pintou Abaporu em 1928. A obra ajudou a inspirar o movimento antropofágico, que propunha transformar influências culturais em criações brasileiras."
 ],
 [
  "Biologia",
  "Como bactérias conseguem compartilhar genes?",
  "Algumas bactérias transferem partes do próprio material genético para outras. Essa troca pode espalhar características entre indivíduos, inclusive resistência a antibióticos."
 ],
 [
  "Química",
  "Por que o ferro enferruja?",
  "O ferro reage com o oxigênio em condições que geralmente envolvem água ou umidade. As reações formam compostos diferentes do metal original: a ferrugem."
 ],
 [
  "Física",
  "Por que a Lua brilha no céu?",
  "A Lua não produz a luz que vemos. Ela reflete a luz do Sol, e suas fases aparecem porque observamos diferentes porções de sua metade iluminada."
 ],
 [
  "História",
  "O que mudou no Japão a partir de 1868?",
  "A Restauração Meiji reorganizou o governo japonês. Nas décadas seguintes, o país acelerou mudanças na indústria, educação e instituições."
 ],
 [
  "Geografia",
  "Por onde passa a linha do Equador?",
  "Ela marca a latitude zero e divide o planeta em hemisférios Norte e Sul. Atravessa partes da América do Sul, da África e da Ásia, além de oceanos."
 ],
 [
  "Ciências",
  "Qual é a diferença entre meteoro e meteorito?",
  "Meteoro é o brilho produzido quando um corpo vindo do espaço atravessa a atmosfera. Se algum fragmento chega à superfície da Terra, esse material é chamado meteorito."
 ],
 [
  "Política",
  "Por que 24 de outubro de 1945 é uma data importante para a ONU?",
  "Nessa data, a Carta das Nações Unidas entrou em vigor e a organização passou a existir formalmente. Seu objetivo inclui promover a cooperação entre países."
 ],
 [
  "Arte",
  "Por que o céu de A Noite Estrelada chama atenção?",
  "Van Gogh pintou a obra em 1889 usando curvas e pinceladas expressivas para representar o céu noturno. O resultado transmite movimento, em vez de copiar a cena de forma literal."
 ],
 [
  "Biologia",
  "Como as folhas fazem trocas de gases?",
  "Pequenas aberturas chamadas estômatos permitem a entrada e saída de gases nas folhas. Elas também ajudam a regular a perda de água pela planta."
 ],
 [
  "Química",
  "Por que vinagre e bicarbonato fazem bolhas?",
  "O ácido do vinagre reage com o bicarbonato e libera gás carbônico. As bolhas são esse gás saindo da mistura."
 ],
 [
  "Física",
  "Como um pêndulo consegue marcar o tempo?",
  "Quando suas oscilações são pequenas, um pêndulo leva aproximadamente o mesmo tempo para completar cada movimento de ida e volta. Os relógios usam essa regularidade para contar intervalos iguais e marcar os segundos."
 ],
 [
  "História",
  "Como Hatshepsut se tornou faraó?",
  "Hatshepsut assumiu o governo do Egito durante a XVIII dinastia e passou a usar os títulos e símbolos de faraó. Seu reinado mostra que mulheres também exerceram esse cargo no Egito antigo."
 ],
 [
  "Geografia",
  "Por que os países têm fusos horários diferentes?",
  "Como a Terra gira, o Sol atinge diferentes regiões em horários diferentes. Cada país adota horários oficiais para organizar a vida cotidiana, e suas fronteiras nem sempre seguem linhas retas."
 ],
 [
  "Ciências",
  "Por que o efeito estufa é necessário, mas pode causar problemas?",
  "Gases da atmosfera retêm parte do calor que a Terra emite, ajudando a manter temperaturas adequadas à vida. Quando sua concentração aumenta, mais calor fica retido, intensificando o aquecimento global."
 ],
 [
  "Política",
  "O que a Magna Carta buscava limitar?",
  "Acordada na Inglaterra em 1215, ela estabeleceu restrições a certas decisões do rei e tratou de direitos de grupos específicos da época. Ao longo do tempo, passou a influenciar debates sobre limites do poder."
 ],
 [
  "Arte",
  "Como uma construção pode ser uma obra de arte?",
  "Arquitetos combinam formas, luz, materiais e espaços para criar experiências e transmitir ideias. Por isso, um edifício pode ter valor artístico além de sua função prática."
 ],
 [
  "Biologia",
  "Como a água chega das raízes às folhas?",
  "As plantas vasculares possuem tubos chamados xilema. A evaporação de água nas folhas ajuda a puxar a água que sobe por esses tubos desde as raízes."
 ],
 [
  "Química",
  "Por que a água ferve a menos de 100 °C em lugares altos?",
  "A água ferve quando sua pressão de vapor alcança a pressão ao redor. Em grandes altitudes, a pressão atmosférica é menor; por isso, ela pode ferver a temperaturas mais baixas."
 ],
 [
  "Física",
  "Por que o GPS precisa considerar a relatividade?",
  "Relógios em satélites marcam o tempo de modo ligeiramente diferente dos relógios na Terra, devido à velocidade e à gravidade. Corrigir essa diferença evita erros crescentes na localização."
 ],
 [
  "História",
  "Por que a escrita foi tão útil na Mesopotâmia?",
  "Os registros escritos permitiram controlar estoques, trocas e pagamentos sem depender apenas da memória. Com o tempo, a escrita passou a ser usada também para leis, histórias e outros assuntos."
 ],
 [
  "Geografia",
  "Por que alguns rios terminam em delta e outros em estuário?",
  "Onde sedimentos se acumulam perto da foz, o rio pode formar vários canais e um delta. Onde marés e correntes redistribuem esses sedimentos, pode predominar uma entrada de água chamada estuário."
 ],
 [
  "Ciências",
  "Por que a descoberta da estrutura do DNA foi coletiva?",
  "O modelo de dupla hélice publicado em 1953 utilizou resultados de diferentes pesquisadores. Entre as contribuições importantes estavam imagens de difração de raios X produzidas por Rosalind Franklin e colaboradores."
 ],
 [
  "Política",
  "Qual é a diferença entre a Assembleia Geral e o Conselho de Segurança da ONU?",
  "A Assembleia Geral reúne representantes de todos os Estados-membros e debate diversos assuntos. O Conselho de Segurança tem atribuições específicas para lidar com ameaças à paz e à segurança internacionais."
 ],
 [
  "Arte",
  "Como os filmes contavam histórias antes do som sincronizado?",
  "Atores usavam gestos e expressões, enquanto a montagem e textos na tela ajudavam a explicar as cenas. As sessões também podiam ter música ao vivo."
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