# DGX Meu Dia — v0.6 (2026-11-05)

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
- **Web Push em segundo plano:** Chrome/Android com permissão e assinatura no dispositivo; service worker `sw.js`, API `push_service.py`, dados no Neon. Alertas de contas, tarefas Pessoal/SME, lembretes, plantas, jogos do Corinthians; humor opcional e desligado por padrão. O agendador Neon Function `dgxpush` e trigger `*/15 * * * *` consulta o Render com segredo servidor-servidor. Duplicidades evitadas por chaves/eventos no banco; inscrições inválidas removidas. Não é push nativo Huawei: o Huawei Saúde pode espelhar notificações do Android.
- **Spotify:** parser de comandos por voz em `spotify.js` reconhece músicas, artista, playlist, álbum, podcast, pausa e próxima faixa. O app oferece conexão opcional OAuth PKCE do Spotify Web API; requer **Client ID** do aplicativo criado pela própria pessoa em <https://developer.spotify.com/dashboard>, URI de redirecionamento EXATA `https://dgx-meu-dia.onrender.com/` e assinatura Premium para reprodução via API. Sem autorização, abre busca do Spotify, sem prometer reprodução. O Web Speech API depende de suporte e de toque no microfone, não é escuta contínua.
- Menu inferior com botão explícito **🏠 Início**.
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
- Web Push com navegador fechado depende da entrega pelo navegador/Android e da tarefa Neon. Não há garantia absoluta de pontualidade nem de entrega à Band 10. O serviço Render gratuito pode suspender por inatividade; o trigger Neon o desperta. Não há sincronização offline ou login de múltiplas pessoas. Requer conexão com o banco para salvar.\n- Integração com Huawei Saúde ainda não implementada. Notificações que aparecerem no Android podem ser espelhadas no relógio em modelos compatíveis, se habilitadas no Huawei Saúde. Leitura de dados de saúde dependerá de autorização e acesso às APIs Huawei Health Kit.
- Não há escuta contínua. O reconhecimento de voz não é garantido em todos os navegadores. O Spotify exige autorização e Premium para API de reprodução, além de dispositivo ativo. **Não interagir com tela ao dirigir**.
- A API pública de futebol não é fonte contratual; horários podem mudar. Checar no clube/CBF antes do jogo.
- Calendário pessoal/SME não sincroniza com o calendário oficial da SME. É um organizador particular.
- O intervalo entre adubações serve apenas de referência escolhida pelo usuário, não de recomendação agronômica.
- O app é um site PWA, não um app Android nativo.


## v0.5 — Carro e podcasts
- Menu inferior ampliado (botões >=76px no mobile), botões gerais >=49px e **Modo Carro** com seis grandes áreas (comando de voz, resumo, Spotify, últimos podcasts, lembretes e lista de programas).
- Aviso de segurança: sem escuta contínua ou garantia de funcionamento com celular bloqueado; ativar funcionalidades parado.
- Podcasts por pesquisa no catálogo público Apple Podcasts/iTunes e consulta dos feeds RSS públicos. Ao cadastrar, o app salva a lista no Neon. Primeira verificação estabelece referência sem avisos antigos; novas publicações detectadas são incluídas em Web Push no agendador a cada 15 minutos (se houver assinatura push do celular).
- A seção Podcasts mostra episódios recentes. “Abrir no Spotify” abre o programa ou busca correspondente, não garante abrir o episódio exato.
- Importação opcional de podcasts salvos na biblioteca Spotify usando `GET /me/shows` com escopo `user-library-read`; pode ser necessário reconectar para conceder o escopo. A associação com o RSS sempre é confirmada pelo usuário.
- Alguns programas exclusivos do Spotify não têm RSS público, por isso não há promessa de monitoramento automático desses conteúdos.

## v0.6 — briefing do trajeto e primeiro podcast
- Resumo falado acionado manualmente no Início, aba Voz e Modo Carro, combinando temperatura/previsão, agenda de hoje e amanhã, contas próximas do vencimento (incluindo atrasadas), próximo jogo do Corinthians, últimos episódios dos podcasts e lembretes próximos. Humor é opcional, desligado por padrão.
- Configurações por tópico salvas no Neon sob `dgx_briefing_prefs_v1`, controles reproduzir/parar e botão grande para parar a fala no Modo Carro. Usa Web Speech / síntese do navegador, sem serviço contínuo nem garantia de tocar com tela bloqueada.
- Podcast **Dragões de Garagem** confirmado no catálogo Apple Podcasts (`id655285497`), incluído diretamente em `dgx_podcasts_v1` no perfil existente. Spotify: `https://open.spotify.com/show/2lfu1zVduPXau4LMF8gEu2`. Feed público: `https://dragoesdegaragem.com/feed/podcast/`.
- Primeiro ciclo de monitoramento de um podcast funciona como linha de base, sem alertar sobre toda a coleção antiga. Para avisar novas publicações, notificações Web Push e permissão Android continuam necessárias.

## Seleção de podcasts de política (05/11/2026)
- Adicionados diretamente ao perfil privado no Neon: **A Hora** (UOL; Apple Podcasts id 1753993865), **O Assunto** (g1/Globo Podcasts; id 1477406521), **Café da Manhã** (Folha/Spotify; id interno spotify:cafe-da-manha, URL oficial Spotify https://open.spotify.com/show/6WRTzGhq3uFxMrxHrHh1lo) e **Foro de Teresina** (piauí; id 1384660882).
- **Dragões de Garagem** preservado. Total de cinco programas.
- O Café da Manhã é exclusivo do Spotify; sem RSS público verificado, fica disponível na lista com link para Spotify, mas não recebe monitoramento automático de episódios no módulo RSS. Outros três podcasts continuam no fluxo normal de Apple Podcasts/RSS, conforme disponibilidade dos feeds.

## Correção 0.7 — Sincronização e episódios (05/11/2026)
- Corrigido o monitoramento de feeds RSS extensos (O Assunto e Foro de Teresina): leitura incremental dos 30 primeiros episódios completos; não faz download/parsing de todo o XML nem falha só porque o feed completo excede 1 MB.
- Lista de podcasts é sincronizada novamente com o Neon ao abrir o app, retomar a janela ou entrar na aba Podcasts, com botão manual **Sincronizar com o banco** e mensagem sobre erros de feed.
- Service worker e arquivos estáticos atualizados para 0.7.
