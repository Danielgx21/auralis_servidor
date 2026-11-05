"""DGX LLM: interpretador conversacional didático, sem fingir que é uma LLM.

Este módulo é deliberadamente simples. Pode ser substituído por um Transformer
autotreinado ou por um endpoint OpenAI-compatible sem mudar o front-end.
"""
import re
import unicodedata

def norm(value):
    text = str(value or "").strip().lower()
    return "".join(c for c in unicodedata.normalize("NFD", text)
                   if unicodedata.category(c) != "Mn")

TOPICS = [
    ("transformer", ("transformer", "self-attention", "autoatencao", "arquitetura"), 
     "O Transformer é uma arquitetura de rede neural que usa mecanismos de atenção para relacionar diferentes posições do texto. Em modelos que geram texto, ele estima o próximo token com base nos anteriores. Quer que eu explique atenção ou treinamento?"),
    ("atencao", ("atencao", "attention", "foco nos tokens"), 
     "Atenção permite que o modelo atribua pesos diferentes a partes do contexto ao processar cada posição. Esses pesos são calculados a partir de representações aprendidas. Isso não é atenção consciente; é uma operação matemática."),
    ("gradiente", ("gradiente", "retropropagacao", "backpropagation", "descida do gradiente"), 
     "O treinamento calcula um erro entre a previsão e o alvo. Pela retropropagação, calcula-se como cada parâmetro contribuiu para esse erro; um otimizador ajusta os pesos para tentar reduzir erros futuros. Isso se repete muitas vezes."),
    ("token", ("token", "tokenizacao", "previsao de palavras"), 
     "Tokens são unidades de texto: podem ser palavras, partes de palavras ou caracteres. Uma LLM normalmente prevê o próximo token, não necessariamente a próxima palavra inteira. A qualidade das previsões depende das relações aprendidas nos parâmetros."),
    ("raciocinio", ("raciocinio", "pensamento", "inferir", "logica"), 
     "Modelos de linguagem podem executar inferências em vários problemas, mas isso não significa que todo texto convincente seja raciocínio confiável. Para testar, devemos apresentar problemas novos, medir acertos e comparar com exemplos de treinamento."),
    ("consciencia", ("consciencia", "consciente", "sentir"), 
     "Raciocínio funcional e experiência consciente são coisas diferentes. Podemos testar resolução de problemas objetivamente; já a existência de experiência subjetiva em IA permanece debatida."),
    ("treinamento", ("treinamento", "treinar", "aprende", "aprendizagem", "pesos", "parametros"), 
     "Ao treinar uma rede, apresentamos exemplos, medimos a diferença entre previsão e resposta esperada e atualizamos os pesos. Um dos indicadores é a perda (loss). Reduzir a perda é útil, mas também precisamos verificar se a rede generaliza para exemplos inéditos."),
    ("independencia", ("independente", "propria", "dependencia", "gpu", "hospedar"), 
     "O projeto tem duas metas diferentes: hospedar pesos abertos sem depender de uma API e, depois, treinar os nossos próprios pesos desde o início. A primeira é bem mais acessível; a segunda exige dados, testes e capacidade de processamento."),
    ("llm", ("llm", "modelo de linguagem", "linguagem natural", "como voce funciona", "como funciona a ia"), 
     "Uma LLM é uma rede neural treinada em muitos exemplos de linguagem. Ela aprende distribuições de probabilidade sobre tokens e pode desenvolver capacidades de conversa e inferência. Este modo didático da DGX, porém, ainda não é uma LLM: responde usando regras explícitas."),
]

def last_topic(history):
    if not isinstance(history, list):
        return None
    for item in reversed(history[-24:]):
        if not isinstance(item, dict) or item.get("role") != "user":
            continue
        question = norm(item.get("content", ""))
        for tag, keywords, answer in TOPICS:
            if any(w in question for w in keywords):
                return (tag, answer)
    return None

def learn_name(history):
    if not isinstance(history, list):
        return None
    for item in reversed(history[-24:]):
        if not isinstance(item, dict) or item.get("role") != "user":
            continue
        content = str(item.get("content", ""))
        match = re.search(r"\b(?:meu nome e|me chamo|pode me chamar de)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-]{1,35})",
                          norm(content), re.I)
        if match:
            return match.group(1).title()
    return None

def reply(message, history):
    raw = str(message or "").strip()
    n = norm(raw)
    engine = "DGX · conversa didática (sem LLM)"
    name = learn_name(history)
    def out(text):
        return {"reply": text, "engine": engine, "mode": "demo"}

    new_name = re.search(r"\b(?:meu nome e|me chamo|pode me chamar de)\s+([a-zà-ÿ][a-zà-ÿ\-]{1,35})",
                         n, re.I)
    if new_name:
        named = new_name.group(1).title()
        return out(f"Prazer, {named}! Consigo usar essa informação nesta conversa porque recebo as mensagens anteriores como contexto. Isso não significa que meus pesos mudaram ou que aprendi permanentemente.")
    if "qual meu nome" in n or "lembra do meu nome" in n or "como me chamo" in n:
        if name:
            return out(f"Você me disse que se chama {name}. Eu recuperei isso do histórico desta conversa, não de um treinamento dos meus parâmetros.")
        return out("Você ainda não me disse seu nome nesta conversa. Experimente escrever: 'Meu nome é Ana' e depois me pergunte novamente.")
    if re.match(r"^(oi|ola|opa|bom dia|boa tarde|boa noite|e ai|eae)[!?. ]*$", n):
        return out("Olá! Eu sou a DGX LLM em modo didático: ainda não gero respostas com uma rede neural. Posso conversar sobre IA, treinamento, atenção, tokens e raciocínio. Também há ferramentas para cálculos e tarefas. O modelo conversacional verdadeiro será conectado separadamente.")
    if "quem e voce" in n or "o que voce faz" in n or "o que voce consegue fazer" in n:
        return out("Sou a interface experimental da DGX LLM. Neste momento, respondo a assuntos predefinidos com regras, mantenho contexto enviado pelo navegador e tenho ferramentas de cálculo e tarefas. Uma LLM real ainda depende de configurar o motor de inferência.")
    if re.search(r"\b(obrigad[oa]|valeu|agradeco)\b", n):
        return out("Por nada! Qual parte do desenvolvimento da DGX LLM você gostaria de explorar?")
    if re.search(r"(explique melhor|nao entendi|como assim|mais detalhes|um exemplo|de um exemplo)", n):
        previous = last_topic(history)
        if previous:
            tag, answer = previous
            if tag == "token":
                return out("Exemplo: 'inteligência' pode ser representado como um ou mais tokens, dependendo do tokenizador. O Transformer recebe números que representam esses tokens, produz probabilidades e escolhe o próximo. Repetir isso gera uma sequência.")
            if tag == "treinamento":
                return out("Imagine que a rede dê 10% de probabilidade ao token certo. O erro será alto. Após muitos ajustes, ela pode atribuir maior probabilidade ao token correto em exemplos semelhantes. Precisamos testar em exemplos novos para ver se generalizou.")
            if tag == "raciocinio":
                return out("Um teste melhor é mudar números, nomes e estruturas de um problema lógico. Se o modelo acerta apenas exemplos repetidos, pode estar memorizando padrões. Se generaliza para casos novos, há evidência mais forte de uma capacidade de inferência.")
            return out(answer + "\n\nVocê pode perguntar por um exemplo específico.")
        return out("Claro. De qual assunto você quer um exemplo? Posso explicar tokens, atenção, treinamento ou raciocínio.")
    for tag, keywords, answer in TOPICS:
        if any(word in n for word in keywords):
            return out(answer)
    if "?" in raw:
        return out("Ainda não consigo responder perguntas abertas sobre qualquer tema, porque o modelo de linguagem não foi conectado. Este modo é baseado em regras. Posso explicar LLMs, Transformers, treinamento, atenção e raciocínio — ou podemos usar ferramentas como 'calcule (15+7)*3'.")
    return out("Entendi sua mensagem, mas meu modo atual só reconhece um conjunto limitado de temas. Isso é uma resposta programada, não uma inferência de LLM. Experimente conversar sobre como redes neurais aprendem ou testar um cálculo.")
