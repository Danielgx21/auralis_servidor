# FutBot Android
A versão Android é um app leve que exibe https://futbot-cloud.onrender.com/ em tela cheia, sem embutir cópia antiga do jogo. Novas versões web publicadas no Render aparecem na próxima abertura/recarregamento; os perfis e o ranking permanecem na nuvem. O servidor já usa Cache-Control: no-cache na interface.

Abra GitHub Actions > FutBot Android APK > Run workflow (branch futbot-android) e baixe o artefato FutBot-Android-APK com app-debug.apk.

O APK debug é de teste e sua assinatura pode mudar entre builds; alterações nativas exigem um novo APK (ou distribuição pela Play Store). Para publicação definitiva configure assinatura release em segredo, não inclua keystore em repositório público. O jogo requer internet e deve ser testado em aparelho real: toque, som, rotação, WebSocket, ranqueada e salas de amigos.

Configuração: applicationId com.dgx.futbot; minSdk 24; targetSdk 35; Java 17; Android Gradle Plugin 8.9.2.