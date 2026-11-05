# DGX Meu Dia — v0.3 (2026-11-05)

**Projeto pessoal exclusivo**, branch \`dgx-meu-dia-v1\` em \`Danielgx21/auralis_servidor\`, pasta \`dgx-meu-dia/\`. Não modificar o Manual das Criaturas, Batalha de Miniaturas ou Auralis.

## Já implementado
- Painel com tempo atualizado por Open-Meteo; localização padrão Santo André, com geolocalização opcional.
- Jogos do Corinthians via tentativa de fonte pública ESPN e fallback de referência, identificado claramente como não confirmado ao vivo.
- 14 desafios de lógica, ciências e matemática que alternam por data, com explicações e registro de respostas.
- Humor manhã/noite, com anotação livre e histórico.
- Lembretes, com alertas apenas quando a página está aberta.
- Assistente de voz experimental (SpeechRecognition API onde disponível) e resumo em voz. Busca do Spotify é aberta, **não dá play nem controla música**.
- Calendário mensal com tarefas Pessoal (azul) e SME (laranja), inclusive ambos tipos no mesmo dia, com cadastro, edição, conclusão e exclusão.
- Plantas: cadastro com localização, adubo utilizado, intervalo indicado pelo usuário e histórico de datas de adubação.
- **Pagamentos recorrentes:** despesas mensais com título, valor em centavos, vencimento entre 1 e 31 (ajuste ao último dia de meses curtos), categoria, observações, competência inicial, valores excepcionais por mês, baixa individual por competência com data efetiva de pagamento, edição, exclusão e histórico.
- Resumo no início com total previsto/pago/em aberto; alerta de vencimentos próximos com app aberto (requer permissão para notificações). Não processa pagamentos nem confirma compensação bancária.
- Dados pessoais armazenados em **banco Neon PostgreSQL** separado dos outros jogos, com acesso protegido por senha. Somente um perfil. Senha guardada via PBKDF2 e sessões via cookie HttpOnly; banco não é exposto ao navegador.
- PWA instalável com service worker de atualização: ao publicar versão nova, o app detecta atualização e solicita aplicar, sem APK. Dados do banco dependem de internet.

## Primeiro acesso
1. Abrir \`https://dgx-meu-dia.onrender.com\`.
2. Informar código de ativação previamente configurado em \`SETUP_CODE\` do Render (não registrar o código em arquivos públicos).
3. Criar senha própria (mín. 10 caracteres). Próximos acessos pedem somente a senha, e a sessão pode durar até 60 dias.
4. Recomenda-se adicionar à tela inicial pelo navegador.

## Deploy
Runtime Python com comando \`python dgx-meu-dia/app.py\`.
- \`DATABASE_URL\`: credencial Neon, configurada de maneira privada nas variáveis do serviço Render.
- \`SETUP_CODE\`: segredo de primeiro acesso, privado.
- Dependência \`psycopg[binary]\` em \`requirements.txt\`. Se não existir no ambiente, \`storage.py\` a instala durante o startup porque o comando inicial de build deste serviço ainda é \`echo\` (ajuste recomendado: \`pip install -r dgx-meu-dia/requirements.txt\` pelo painel Render).
- Banco e tabelas \`dgx_account\`, \`dgx_sessions\`, \`dgx_data\` são inicializados no startup e separados de outros projetos.
- As mudanças vão para \`dgx-meu-dia-v1\`, sem alterações nas branches dos demais jogos.

## Restrições honestas
- Não há ainda notificações push com navegador fechado, login de múltiplas pessoas nem sincronização offline. Requer conexão com banco para salvar.\n- Integração com Huawei Saúde ainda não implementada. Notificações que aparecerem no Android podem ser espelhadas no relógio em modelos compatíveis, se habilitadas no Huawei Saúde. Leitura de dados de saúde dependerá de autorização e acesso às APIs Huawei Health Kit.
- Não há escuta contínua nem integração OAuth/Spotify Player, e o reconhecimento de voz não é garantido em todos os navegadores. **Não interagir com tela ao dirigir**.
- A API pública de futebol não é fonte contratual; horários podem mudar. Checar no clube/CBF antes do jogo.
- Calendário pessoal/SME não sincroniza com o calendário oficial da SME. É um organizador particular.
- O intervalo entre adubações serve apenas de referência escolhida pelo usuário, não de recomendação agronômica.
- O app é um site PWA, não um app Android nativo.
