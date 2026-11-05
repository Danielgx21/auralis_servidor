# DGX Meu Dia (v0.1)

PWA pessoal para celular, separada de todos os demais projetos de `Danielgx21/auralis_servidor`.

## Recursos atuais
- Tempo agora, sensação e previsão para o dia via Open-Meteo, sem chave para uso não comercial. Localização padrão Santo André; geolocalização somente mediante permissão.
- Calendário de jogos do Corinthians com tentativa de consulta dinâmica a endpoint público não oficial da ESPN. Caso indisponível, duas partidas conferidas contra notícia do ge em 30/10/2026. Datas exigem conferência.
- Um desafio de lógica/ciências diário com explicação e histórico local.
- Registro de humor pela manhã e à noite, observações e histórico no próprio dispositivo.
- Lembretes pessoais com notificações quando a página está aberta e permitida. **Não há web push em segundo plano**.
- Reconhecimento de voz quando disponível no navegador, sintetizador de voz e abertura de buscas do Spotify. **Não controla nem inicia reprodução de músicas automaticamente**.
- Interface mobile e service worker básico para usar partes do aplicativo sem rede.

## Limitações e segurança
- Dados pessoais são guardados em `localStorage`, somente no navegador atual. Sem conta, sincronização ou banco na nuvem.
- Comandos de voz exigem botão do microfone, conexão e suporte do navegador; não é assistente sempre ativo, nem funciona com tela bloqueada.
- Não use a tela enquanto dirige.
- A API do Spotify para iniciar reprodução exige OAuth e Spotify Premium. Este aplicativo apenas abre a busca do Spotify.
- Notificações automáticas com navegador fechado, atualização garantida do Corinthians e sincronização entre aparelhos são próximas etapas, não recursos concluídos.

## Executar

```sh
python dgx-meu-dia/app.py
```

Abrir http://localhost:8766. Em Render: runtime Python; build `echo pronto`; start `python dgx-meu-dia/app.py`.
