# DGX LLM — versão web 0.2

Aplicação experimental para estudar modelos de linguagem, em uma branch separada dos jogos. Site: https://laboratorio-llm-web.onrender.com

## Funcionalidades
- Identidade DGX LLM, chat com histórico local no navegador (até 36 mensagens).
- Conversa didática baseada em regras sobre IA com contexto; **não é uma rede neural**.
- Calculadora restrita e tarefas salvas neste navegador.
- Laboratório de probabilidades de caracteres.
- Adaptador para endpoint compatível com OpenAI (substituível por um modelo e servidor próprios).
- Proteção por código de acesso quando um modelo externo está configurado.

## Habilitar conversa real em uma LLM temporária
Na configuração Environment do serviço Render, insira as variáveis abaixo. Nunca cole credenciais no GitHub ou na conversa do chat.

| Variável | Exemplo |
|---|---|
| LLM_BASE_URL | https://api.groq.com/openai/v1 |
| LLM_MODEL | openai/gpt-oss-20b |
| LLM_API_KEY | chave privada do fornecedor |
| DGX_ACCESS_PIN | código privado longo e único para acessar o modelo |

Uma chamada de LLM só é ativada quando BASE, MODEL e ACCESS_PIN estão preenchidos. Para um endpoint local sem autenticação, a variável LLM_API_KEY é opcional. Em serviços públicos, habilite autenticação e limites de custo. PIN compartilhado é provisório; implementar autenticação por usuário para produção.

Após configurar, recarregue o site, preencha o código privado no campo mostrado e converse. O histórico fica no armazenamento local do navegador; é enviado ao back-end para gerar cada resposta. Quando um provedor externo estiver ligado, esse provedor também processará as mensagens.

## Roteiro da independência
1. Agora: site, ferramentas e conversa didática local.
2. Temporário: API hospedando pesos abertos, para diálogo geral.
3. Infraestrutura própria: executar pesos abertos em GPU controlada por nós, sem API proprietária.
4. Pesquisa: treinar e avaliar nossa própria rede desde pesos aleatórios e tentar substituí-la gradualmente.

Render Free não é uma plataforma para inferência de LLM grande: possui pouco processamento, arquivo temporário e suspende o processo por inatividade.

## Testes sugeridos
- Oi
- Meu nome é Ana
- Qual meu nome?
- Como uma LLM aprende?
- Explique melhor
- calcule (15+7)*3
- Crie tarefa estudar Transformers
- Liste minhas tarefas
- Recarregar a página, testar histórico e iniciar nova conversa.
