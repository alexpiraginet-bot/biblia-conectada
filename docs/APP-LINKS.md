# QR Code, página web e aplicativos nativos

## Contrato do produto

O QR guarda o endereço HTTPS público do conteúdo em `https://www.bibliaconectada.company`. Ele não aponta diretamente para uma loja nem depende de um serviço externo de links. Sem aplicativo instalado, a pessoa chega à página e pode ler antes de decidir instalar. O convite de instalação pode ser fechado e não redireciona automaticamente para uma loja.

- `/liturgia` é um endereço permanente para **as leituras de hoje**; o conteúdo muda com a data.
- `/dia/2026-10-31` identifica **as leituras daquela data**. Um compartilhamento datado deve manter esse destino, sem virar a liturgia de hoje após uma instalação.
- `/joao/3/16` é uma referência da BLIVRE; `/ler/open-nbv/joao/3/16` mantém a edição Open NBV. Não trocar a edição ou supor numeração idêntica entre traduções.
- `/arcos#salmos/34/4` mantém o foco do grafo no fragmento. O aplicativo recebe e interpreta a URL completa, incluindo query permitida e fragmento. O servidor HTTP não recebe o fragmento, portanto um redirecionador no servidor não pode ser usado para reconstruí-lo.

O convite web utiliza as URLs de lojas validadas em `site/src/lib/native-apps.ts`. Cada plataforma tem sua própria ativação de lançamento. Sem URL válida e disponibilidade explicitamente ativada, o fluxo continua com instruções de instalação web. A existência deste código não significa que os apps estejam publicados.

## Uso no site

No menu completo, **QR Code desta página** leva ao gerador `/qr`, mantendo o endereço público da tela atual. O menu captura esse destino na abertura; no 3D inclui a seleção do fragmento. A área **Compartilhar este dia** da liturgia oferece um QR datado. No gerador também há a opção permanente **Sempre as leituras de hoje**.

O gerador disponibiliza PNG de 1024 px e SVG vetorial com margem livre de quatro módulos, correção M e tinta bordô escura sobre branco. Não há logo sobre os módulos nem dependência de um serviço externo de QR. A biblioteca MIT `qrcode` 1.5.4 roda somente no servidor; `jsqr` 1.4.0 é usado apenas nos testes para decodificação independente. A URL também fica visível e pode ser copiada.

**Mostrar QR em tela cheia** abre um diálogo nativo sobre a interface, para impedir que o menu ou o convite de instalação cubram o código. Fechar e Escape devolvem o foco ao botão. O código deve ser impresso com a margem intacta e testado na dimensão/material finais; a decodificação automatizada do PNG não comprova legibilidade de toda impressão ou câmera física.

`safeContentPath` aceita somente conteúdo HTTPS do domínio canônico ou do apex, remove parâmetros que não pertencem ao conteúdo e rejeita infraestrutura, redirecionamentos, credenciais e caminhos malformados. O limite é aplicado antes e depois da normalização; buscas livres, conversas e tokens de prévia não são inseridos no QR. Não é uma validação da existência de toda página: se alguém colar manualmente um endereço inexistente do domínio, o site continuará com sua 404 normal.

O convite discreto aparece após sete segundos em iOS/Android fora do modo instalado; pode ser dispensado por 30 dias. Ao tocar, captura a página atual e oferece passos ou loja configurada. A página `/instalar?next=...` é um documento HTML com ícone explícito, instruções Safari/Chrome e retorno ao conteúdo validado. O atalho web mantém `start_url=/`; não se promete que instalar o PWA retome automaticamente uma passagem.

Variáveis de lançamento, separadas por plataforma e sem valores fictícios em produção:

| Variável | Condição |
| --- | --- |
| `IOS_APP_STORE_URL` | URL HTTPS oficial `apps.apple.com` com ID numérico real. |
| `IOS_APP_AVAILABLE` | Literal `true` somente após a ficha estar pública e conferida. |
| `ANDROID_PLAY_STORE_URL` | URL HTTPS oficial `play.google.com/store/apps/details?id=...` com package real. |
| `ANDROID_APP_AVAILABLE` | Literal `true` somente após o lançamento Android conferido. |

Os botões são independentes. Configurar uma URL sozinha não anuncia lançamento. `/api/app-install` retorna apenas os dois endereços públicos liberados, sem cache. O Smart App Banner é entregue no HTML de `/instalar`, com `app-argument` para a página anterior, somente quando o iOS estiver liberado.

## Associação do domínio: desligada por padrão

Os endpoints preparados são:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

São respostas JSON HTTP 200, sem cookies ou redirecionamento, com `Cache-Control: no-store, max-age=0`. `connection()` do Next.js mantém a leitura de configuração em tempo de requisição. Não são enviados IDs fictícios: configuração ausente, desativada ou inválida resulta em AASA com `details: []` e Android com `[]`. O controle evita cache longo na nossa infraestrutura; Apple e Android mantêm caches próprios e não garantem revogação imediata.

| Variável de servidor | Uso |
| --- | --- |
| `IOS_UNIVERSAL_LINKS_ENABLED` | Somente o valor literal `true` ativa a associação iOS. |
| `IOS_APPLICATION_ID` | Valor real de `application-identifier` do app assinado: prefixo da aplicação, normalmente Team ID, seguido do Bundle ID. Não é o Apple ID numérico da App Store. |
| `ANDROID_APP_LINKS_ENABLED` | Somente o valor literal `true` ativa a associação Android. |
| `ANDROID_APPLICATION_ID` | Package/application ID real do aplicativo. |
| `ANDROID_SIGNING_SHA256` | Impressões SHA-256 dos certificados autorizados: 32 pares hexadecimais separados por dois-pontos; múltiplos certificados separados por vírgula. |

As flags de associação são independentes das flags de disponibilidade nas lojas (`IOS_APP_AVAILABLE` e `ANDROID_APP_AVAILABLE`). Assim é possível preparar e testar associação sem anunciar um lançamento. Validar a sintaxe não comprova titularidade: conferir cada identificador no app assinado e nas contas de desenvolvedor antes de configurar. Nenhum segredo, chave de API ou certificado privado entra nesses arquivos públicos.

## Escopo dos links nativos

`site/src/lib/app-associations.ts` mantém uma lista explícita das famílias de conteúdo. Os slugs dos livros vêm do catálogo canônico gerado, nas duas edições de leitura. Liturgia atual e datada, referências, Arcos, grafo Explorar, conexões, mapa, cronologia, interlinear e demais páginas públicas de estudo ficam disponíveis para associação.

Infraestrutura e estado particular ficam na web: `/api`, `/_next`, `/.well-known`, `/instalar`, `/og`, `/files`, `/data`, `/dados`, `/admin`, `/salvos`, `/jornada` e `/mesa`. Qualquer rota não reconhecida também fica na web. O último curinga **exclui**, não autoriza, os destinos restantes. Não substituir isso por um curinga geral de domínio.

As famílias que contêm `*` permitem a associação de conteúdo daquela área, mas não validam a existência de cada versículo ou data. O roteador nativo deve conferir segmentos, edição, intervalos e datas usando o contrato real do site antes de abrir a tela. Parâmetros arbitrários não podem virar comandos, redirecionamentos externos ou requisições autenticadas. A associação de URL não transfere cookies, favoritos ou saldo anônimo entre Safari e app e não substitui autenticação/autorização da API.

## Ativação iOS no Mac

1. Confirmar Bundle ID e prefixo de `application-identifier` no binário assinado. Conservar o aplicativo interno existente como produto separado.
2. Adicionar Associated Domains no target, com `applinks:www.bibliaconectada.company`. Adicionar o host sem `www` somente se esse host também servir o AASA diretamente, sem redirecionamento.
3. Implementar recepção de Universal Links e roteamento do conteúdo completo. Leitura e 3D precisam respeitar a paridade definida no handoff iOS.
4. Configurar os valores reais de associação no ambiente de teste e verificar o JSON público. Testar a associação em dispositivo com o app assinado, incluindo a preferência do usuário de abrir no Safari.
5. Para lançamento público, confirmar app disponível no país da audiência. Configurar a URL real `https://apps.apple.com/.../id...` e ativar a disponibilidade somente depois de conferir o link e o fluxo instalado/ausente.
6. Ativar a associação em produção depois da validação do binário e dos testes em dispositivo. A loja e a associação podem ser liberadas separadamente, preservando o fallback web.

Um Smart App Banner usa o App Store ID numérico e `app-argument` com o endereço do conteúdo. A documentação da Apple descreve continuar pela página no Safari e tocar em **Abrir** depois da instalação. Não prometer que abrir o aplicativo diretamente pela App Store reproduzirá automaticamente o contexto anterior. Banner não aparece no simulador; o teste dessa etapa exige iPhone/iPad real. Digitar uma URL na barra de endereços pode permanecer no Safari por decisão da plataforma. [Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners).

O AASA precisa ser servido por HTTPS com certificado válido e sem redirecionamentos. Cada host associado precisa da sua configuração. A assinatura e o entitlement devem coincidir com a identidade publicada. [Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains).

## Android em paralelo no Windows

Android Studio, SDK, emulador e builds Android podem ser trabalhados neste Windows enquanto o Mac cuida de Xcode/iOS. A disponibilidade local das ferramentas e da virtualização precisa ser verificada antes de declarar o ambiente pronto. [Instalação oficial](https://developer.android.com/studio/install).

1. Definir o application ID do novo produto e implementar paridade de telas e o roteador de URLs.
2. Criar filtros HTTPS com `android:autoVerify="true"` para o host canônico. **Repetir a lista de rotas permitidas no Manifest**; não registrar apenas scheme+host e presumir que o servidor excluirá o restante em todos os sistemas.
3. Conferir o certificado usado pela distribuição. No Google Play App Signing, usar a impressão do certificado de assinatura do aplicativo entregue pela loja, não presumir que a upload key seja a mesma. Configurar vários fingerprints somente para certificados realmente autorizados.
4. Publicar e verificar `assetlinks.json` sem redirecionamento. A extensão de regras dinâmicas preparada aqui restringe caminhos no Android 15+. Android 14 e anteriores ignoram essa extensão: os filtros do Manifest e testes nesses sistemas continuam necessários. As regras do servidor não ampliam o escopo declarado no Manifest. [Associação e regras dinâmicas](https://developer.android.com/training/app-links/configure-assetlinks).
5. Testar uma instalação assinada e a versão distribuída pelo canal de teste da Play, sem liberar o botão público antecipadamente.
6. Quando a ficha estiver pública e funcional, configurar a URL de `play.google.com/store/apps/details?id=...` e ativar a disponibilidade Android. Ativar a associação após validar os links no dispositivo.

Para uma etapa futura de retomada após instalação pela Play, o app pode usar Install Referrer para recuperar um destino permitido. Isso exige implementação nativa, validação do destino e uso na primeira execução; não está resolvido apenas pela presença do link da loja. Não transportar conversa, dados pessoais, cookies ou tokens no referrer. [Google Play Install Referrer](https://developer.android.com/google/play/installreferrer).

## Matriz mínima antes de ativar

- QR de `/liturgia`, de `/dia/AAAA-MM-DD`, de um versículo BLIVRE, de um versículo Open NBV e de `/arcos#...`: mesmo destino, edição e referência.
- App ausente: conteúdo web acessível, convite dispensável, loja correta somente quando disponível.
- App instalado: tela correta pelo QR e pelo link recebido; validar Safari/Chrome e o navegador de WhatsApp/Instagram quando aplicável, sem assumir que todos os navegadores internos tenham o mesmo comportamento.
- iOS: Universal Links pelo app Notas/mensagem e câmera, preferência de continuar no Safari, banner em aparelho físico e retorno após instalação. [Diagnóstico oficial](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links).
- Android: versão anterior ao Android 15 e versão 15+, instalação do canal Play, certificado correto, rotas de infraestrutura e privadas sem captura pelo app.
- Associação desligada/ID inválido: JSON vazio, nenhum banner anunciando app indisponível, leitura web intacta.
- URLs desconhecidas, datas e referências inexistentes: fallback ou erro de conteúdo compreensível, sem perder a página nem executar comandos.

Os testes automatizados de `app-associations.test.ts` verificam flags independentes, sintaxe, rotação de fingerprints, lista de rotas, respostas JSON e cache. Eles não substituem a verificação de assinatura, titularidade, associação do sistema operacional, instalação e abertura em dispositivos físicos.
