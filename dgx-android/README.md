# DGX Meu Dia — Android

Este projeto empacota o site https://dgx-meu-dia.onrender.com/ em um APK Android leve, usando WebView. Requer conexao com a internet e usa o banco de dados e o login do servidor DGX existente.

## Como gerar o APK
Na branch `dgx-meu-dia-v1`, o workflow `Build DGX APK` compila com Android SDK 35, Gradle 8.11.1 e JDK 17, sem expor chaves privadas. O artefato `DGX-Android-APK` contem o arquivo `app-debug.apk`.

Para compilar no Android Studio, abra `dgx-android/`, sincronize o Gradle e escolha **Build > Build APK(s)**.

## Recursos
- Site em tela de aplicativo, sem barra de URL, com acesso por HTTPS.
- Login e preferencias sincronizados pelo servico online.
- Links externos sao enviados ao navegador ou aplicativos adequados.
- Botao de microfone da aba Voz abre o reconhecedor nativo do Android, quando instalado.
- Permissao de localizacao e solicitada somente quando a geolocalizacao for usada.

## Limitacoes
- O APK de debug usa uma assinatura de desenvolvimento gerada pelo ambiente de compilacao. Pode ser necessario desinstalar versoes debug anteriores antes de uma futura atualizacao assinada por outra chave.
- Notificacoes web push e algumas integracoes de terceiros (por exemplo, autorizacao de contas externas) podem se comportar diferente em WebView e precisam de testes no aparelho.
- A internet e necessaria para os dados do servidor, e a versao web continua acessivel pelo PC.
- Para distribuir o APK de producao com atualizacoes instalaveis, sera preciso configurar uma chave de assinatura de release estavel, guardada fora do repositorio.
