# Servidor multiplayer privado para Fragmentos de Auralis

Testes locais: `python -m unittest test_relay.py -v`

Publicação no Render:
1. Envie estes arquivos para a raiz de um novo repositório GitHub.
2. Render Dashboard > New > Blueprint > selecione o repositório.
3. O `render.yaml` configura serviço Web Docker com health check `/healthz`.
4. Teste `https://<dominio>.onrender.com/healthz`: deve mostrar `Auralis relay OK`.
5. Configure `wss://<dominio>.onrender.com` em `online_server.cfg` do jogo.

O Render aceita conexões WebSocket públicas; o plano grátis pode hibernar.
Este código não foi implantado em uma conta real nesta entrega.
