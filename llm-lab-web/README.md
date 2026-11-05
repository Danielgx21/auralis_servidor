# DGX LLM — versão 0.4

Aplicação didática para investigar como redes neurais aprendem e construir uma assistente independente. A branch lab-llm-web-v1 está isolada dos jogos.

Site: https://laboratorio-llm-web.onrender.com/

## O que funciona sem pagar por GPU
- **Conversa didática:** regras transparentes sobre IA, com contexto de mensagens anteriores. Não é uma LLM.
- **Ferramentas:** calculadora restrita, tarefas salvas no navegador.
- **Previsões:** modelo estatístico de caracteres como referência.
- **Treinar IA:** rede neural real, implementada em JavaScript puro, treinada no dispositivo do visitante.
  - Contexto de 3 caracteres, embeddings de dimensão 8, camada oculta tanh de 32 unidades e saída softmax.
  - Retropropagação e descida de gradiente nos pesos; curva de perda de treino e avaliação, amostragem de texto.
  - Peso inicial aleatório, atualização em blocos de 400 passos e persistência em localStorage.
  - Dados e pesos não são enviados a um serviço de inteligência artificial.
  - É uma mini-rede preditora de caracteres, **não** um Transformer e **não** uma LLM conversacional. Os caracteres de avaliação vêm do mesmo texto, com janelas sobrepostas: este teste mede aprendizagem local, não prova generalização.
- **Transformer (v0.4):** modelo próprio de 1 bloco com uma cabeça de atenção causal, embeddings de tokens/caracteres e posições, conexões residuais, rede feed-forward, softmax e retropropagação analítica. O treinamento ocorre no navegador.
  - Mostra as probabilidades do próximo caractere, os pesos de atenção entre as quatro posições de contexto e as curvas de perda.
  - Os últimos 20% dos dados ficam reservados para avaliação, mas padrões repetidos podem aparecer nos dois conjuntos.
  - Salva pesos no armazenamento local e oferece **exportação JSON de checkpoints**. Não é uma LLM de conversação, nem possui treinamento em massa.
- **Intercambialidade:** conexão opcional a endpoints de modelos compatíveis com /v1/chat/completions.

## Conversar localmente no Windows (16 GB de RAM, GPU integrada)
Isso não exige API paga nem servidor na nuvem para inferência. Quando o PC estiver desligado, a conversa local não funcionará.

1. Instale **Python 3** a partir de https://www.python.org/downloads/ e marque a opção para adicionar ao PATH.
2. Instale **Ollama** a partir de https://ollama.com/download . Deixe o aplicativo rodando.
3. Abra um terminal do Windows e execute: ollama pull qwen3:4b
   - O download do modelo tem cerca de 2,5 GB. O uso de memória será maior.
   - O modelo possui pesos de terceiros. A operação e as mensagens ficam locais, mas os pesos **não são** treinados por nós.
4. Baixe a branch lab-llm-web-v1 do GitHub e entre na pasta llm-lab-web.
5. Clique duas vezes em iniciar-local-windows.bat.
6. Abra http://127.0.0.1:8765 e informe o código de acesso exibido na janela: dgx-local.
7. Mantenha a janela do servidor aberta. O processamento por CPU pode ser lento.

O launcher vincula o servidor HTTP apenas a 127.0.0.1 por segurança; ele **não** compartilha a IA pela rede local ou internet.

## LLM na nuvem (opcional)
Para conectar um serviço de inferência, configure as variáveis do servidor:
- LLM_BASE_URL: endpoint base compatível com OpenAI, terminando em /v1.
- LLM_MODEL: nome exato do modelo.
- LLM_API_KEY: chave privada, se necessária.
- DGX_ACCESS_PIN: código privado longo para proteger acesso ao modelo.

Nunca coloque segredos no repositório. Quando houver chave de provedor, mensagens enviadas ao chat podem ser processadas pelo provedor. Esse PIN é provisório; não use em produção com vários usuários sem autenticação e limites de taxa/custo.

## Próximos passos
- Expandir o mini-Transformer atual com maior contexto, múltiplas cabeças e avaliação em textos inéditos.
- Criar avaliações com textos e problemas inéditos.
- Salvar checkpoints exportáveis e comparar versões.
- Evoluir gradualmente para um modelo capaz de seguir instruções.
- Adicionar autenticação antes de expor conversas remotamente.

Tudo está separado das branches dos jogos. A aba de treinamento funciona sem serviços de IA na nuvem.
