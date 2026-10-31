# Bíblia Conectada para iPhone — arquitetura proposta

Auditoria somente leitura em 31/10/2026. Base de código: `C:/Users/R2/biblia conectada`; cópia de continuidade em `docs/ios/` no branch `codex/ios-native-app`, criado a partir de `ddc6909`. Este documento não altera o site, não cria credenciais e não afirma compilação, assinatura, TestFlight ou aprovação na App Store. Alex confirmou um Mac remoto para a próxima sessão; versão do Xcode, conexão MCP e identidade de distribuição ainda precisam ser verificadas lá. O aplicativo preexistente no TestFlight deve permanecer separado e inalterado.

## Decisão

**SwiftUI para leitura, navegação, pesquisa, favoritos, liturgia e compartilhamento; backend existente para dados e serviços; WebKit limitado à visualização 3D enquanto ela não tiver um renderer nativo.** O aplicativo deve ser útil em modo avião desde o primeiro uso.

Primeira fatia implementável: Bíblia BLIVRE completa embarcada, seletor de livro/capítulo, leitura nativa ajustável, busca local, favoritos, conexões de um versículo e compartilhamento nativo. “Hoje” consome a API pública da liturgia e preserva uma leitura já carregada offline, com data e procedência explícitas. Coração/voz e Jornada precisam de uma fronteira de sessão própria antes de serem chamados diretamente pelo app; as rotas atuais foram feitas para o navegador.

Essa escolha responde à utilidade nativa pretendida. A regra 4.2 da Apple pede valor além de um site reempacotado; não proíbe uma tecnologia específica nem garante aprovação por usar SwiftUI. A avaliação continua sendo da Apple. [App Review Guidelines, 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

| Caminho | O que reaproveita | Custo real neste projeto | Decisão |
|---|---|---|---|
| SwiftUI + backend | Corpus, grafo, calendários, validação das respostas, imagens sociais e identidade | Interface nova; sessão mobile e adaptação de dados; testes iOS reais | Preferido: leitura e gestos nativos, offline controlado, integração de áudio e partilha |
| Capacitor + frontend React empacotado | Parte do conhecimento React e funções puras | Extrair uma aplicação cliente, empacotar assets e dados, separar todas as funções servidor, adaptar cookies/CORS e plugins | Alternativa se Android simultâneo se tornar prioridade; não é só apontar para Next |
| WebView de todo o site | Páginas prontas | Mantém dependência de rede, cookies e layout do navegador; pouco valor nativo | Não usar como produto principal |

O site usa Next 16.4.2, React 19.3.1, Server Components, `cacheComponents`, `connection()`, Route Handlers, cookies e fontes de dados em runtime. Não há `output: 'export'`. Empacotar a pasta `.next` não cria um frontend Capacitor offline. A configuração `server.url` do Capacitor é descrita pelo próprio projeto como destinada a live reload, não produção; não é a solução de distribuição aqui. [Configuração oficial do Capacitor](https://capacitorjs.com/docs/config).

## Componentes nativos

Proposta de deployment target: iOS 17 ou superior, a confirmar no Xcode disponível. A versão mínima do sistema atendido é distinta da versão do SDK usado no build. O requisito consultado para submissões desde 28/04/2026 é SDK iOS 26 ou posterior; reconferir ao arquivar. [Apple: requisitos mínimos de SDK](https://developer.apple.com/news/?id=ueeok6yw).

```text
BibleConnectedApp
├── AppRouter: NavigationStack, URLs de versículos/dias, restauração
├── Reader: livros → capítulos → versículo; seleção e ações em sheet
├── Search: índice local; resultado abre contexto, não só trecho
├── Connections: lista de relações + Canvas nativo limitado aos vizinhos
│   └── Arcs3D: WKWebView restrita, carregada sob demanda e pausada ao sair
├── Today: LiturgyClient + cache por data + referências abertas no Reader
├── Heart: consentimento + cliente de estudo + citações navegáveis
├── Library: favoritos, última leitura, tamanho do texto, downloads
├── Journey: estado confirmado no servidor; sem pontos locais inventados
└── Share: URL curta + texto identificado + PNG/arte local + share sheet

BibleRepository actor ── JSON de texto + índice SQLite/FTS
PreferencesStore ────── UserDefaults/SwiftData; sem segredos
LiturgyCache actor ──── arquivos por data com fetchedAt e source
APIClient actor ─────── URLSession, timeout, cancelamento, limites de body
SessionVault ────────── Keychain; somente credencial anônima do aplicativo
```

A aparência usa bordô e dourado como acentos, texto de leitura confortável e materiais nativos onde disponíveis. Dynamic Type, VoiceOver, alto contraste e redução de movimento são requisitos de implementação. Não desenhar um menu que esconda leitura ou dependa de hover. “Ler”, “Conexões”, “Hoje” e “Biblioteca” podem ser a base; Coração entra como acesso claro e contextual, sem afastar a pessoa do versículo.

## Dados já disponíveis e primeira base offline

O manifesto local real tem campos **em português**: `formato`, `versao`, `base`, `contagens`, `arquivos`. Não usar um decoder esperando `files` ou `counts`. Cada arquivo contém `caminho`, `bytes`, `sha256`, `formato`, `licenca` e, quando aplicável, `registros`.

Snapshot conferido: `biblia-conectada/dados-manifest@1`, versão `1.0.0`; 66 livros, 1.189 capítulos, 31.102 versículos, 301.539 pares de versículos e 142.082 arestas entre capítulos. Votos de referência cruzada não representam quantidade de conexões nem autoridade teológica.

| Recurso público existente | Contrato e uso nativo |
|---|---|
| `/dados/v1/manifest.json` | Catálogo de arquivos, tamanho e SHA-256; versão e contagens. Base canônica declarada no código: `https://www.bibliaconectada.company` |
| `/dados/v1/livros.json` | Array de 66 livros: `nome`, `slug`, `osis`, `versiculos_por_capitulo`, `indice_primeiro_versiculo`, `indice_primeiro_capitulo`, `arquivo_texto`, abreviações |
| `/dados/v1/texto/<slug>.json` | Objeto com `livro`, `osis`, `slug`, `traducao`, `licenca`, `credito`, `alteracoes`, `grade`, `capitulos: [[String]]`. `capitulos[c−1][v−1]` é o texto c:v |
| `/dados/v1/ligacoes.csv` | Par único ordenado por `indice_a < indice_b`; votos somados, direção e votos individuais. Ler CSV com parser correto, não `split(',')` |
| `/dados/v1/versiculos.csv` | Índice global, referência, livro/capítulo/versículo e quantidade de vizinhos |
| `/dados/v1/capitulos.csv` | Nós/contagens e coordenadas do layout; não são geografia |
| `/dados/v1/capitulos-arestas.csv` | Arestas agregadas de capítulos e número de pares |
| `/dados/v1/biblia-conectada-dados-v1.zip` | Pacote completo de dados abertos, 7.961.478 bytes no snapshot local auditado |
| `/data/text/<slug>/<chapter>.json` | Atalho existente: array de strings do capítulo, sem créditos próprios no body. Para offline, preferir o pacote documentado que preserva créditos |
| `/data/verse-links/<slug>/<chapter>.json` | Atalho existente: array por versículo; cada item é uma sequência plana `[globalVerse, votes, globalVerse, votes, …]`. Não contém a direção completa do CSV; não assumir que é schema versionado |

Os 66 JSON de texto somam **4.018.286 bytes**. É viável incluí-los integralmente como recursos do app, mantendo os créditos, em vez de exigir download para a primeira leitura. O catálogo ocupa 22.609 bytes. O CSV completo de ligações tem 22.467.753 bytes; transformá-lo em SQLite/indexação de adjacência durante a preparação do build evita carregá-lo inteiro na memória do telefone.

IDs: guardar `edition + slug + chapter + verse` para referências do usuário; usar `globalVerse` somente no domínio do grafo BLIVRE/KJV. A coleção Open Nova Bíblia Viva tem outra identificação/numeração e avisos próprios; não converter seu ID em nó do grafo por suposição.

**Paridade pública obrigatória:** Alex escolheu Open NBV como alternativa à BLIVRE no site. O primeiro incremento técnico BLIVRE offline não substitui essa decisão. Antes de apresentar a versão pública como equivalente ao produto existente, oferecer catálogo/seleção Open NBV com leitura integral licenciada, seus 31.105 lugares de texto e numeração própria, e preservar edição em favoritos, links, IA, voz e partilha. Pode ser recurso embarcado ou download explícito verificado; comunicar o que está disponível offline e nunca trocar a edição em silêncio. Conferir `docs/open-nbv-alignment.md`, `site/src/lib/translations.ts` e os importadores existentes. Se ainda faltar essa integração, a versão deve ser identificada como beta de escopo parcial, sem alegar paridade.

Pipeline proposto de importação:

1. Copiar o snapshot de `site/public/dados/v1/` ou baixar os mesmos arquivos do host canônico por HTTPS. Nesta auditoria não foi executado novo download do corpus.
2. Fixar o hash do manifesto no artefato de release; validar cada SHA-256 e limite de bytes antes da importação. Um hash entregue pelo mesmo servidor não é assinatura independente: usar um pin conhecido do build ou assinatura para futuras atualizações.
3. Rejeitar caminhos absolutos, `..`, arquivos extras e expansão desproporcional de ZIP. Preferir os JSON individuais para a primeira base; zip é opção explícita de atualização.
4. Construir `books`, `verses`, `links` e índice FTS em arquivo temporário. Preservar texto original; normalização sem acentos pertence ao índice de busca, não ao versículo exibido.
5. Validar contagens, limites de capítulos, pares e exemplos. Fazer troca atômica só quando toda a versão estiver íntegra. Cancelamento ou falha conserva a versão anterior.
6. O bundle permanece como fallback. Atualizações têm tamanho informado e comando “Baixar atualização”; nenhuma substituição silenciosa de tradução.

### Licenças e fonte

Fonte BLIVRE já inventariada no repositório: `fontes/blivre/porbr2018_vpl.zip`, via eBible.org. A cópia exibida é sem alterações. Preservar o `credito` de cada livro, `LICENSE.txt`, `LICENSE-DATA.md` e `ATTRIBUTION.md` em “Sobre → Fontes e licenças” offline. O aviso registrado pelo projeto é:

> Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ - fevereiro de 2018. Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.

Texto BLIVRE conserva sua licença; dados derivados conservam CC BY-SA 4.0 e os créditos de OpenBible.info/Theographic conforme o arquivo auditado. Código do site é MIT; não confundir licença de código, dados, fontes tipográficas e mídia. O interlinear é uma coleção editorial inicial com assistência de IA, sem revisão acadêmica independente; não anunciá-lo como tradução exata/completa. Atribuição e mudanças acompanham qualquer recorte nativo.

`DADOS.md` ainda contém uma nota histórica dizendo que o site não tinha endereço público. Isso está desatualizado; URLs acima vêm de `site-identity.ts` atual. Não alterar esse documento nesta subtarefa.

## APIs atuais: contrato observado, não endpoint mobile já pronto

As respostas JSON abaixo são completas, não streams de tokens. Mostrar progresso/indicador de espera e permitir cancelar. Status da API não prova credencial ativa em produção; o app deve respeitar `available` e erro real.

### Estudo contextual

`GET /api/assistente` → `{ available, message, voice?: { available, name? } }`.

`POST /api/assistente`, JSON até 8.192 bytes:

```json
{
  "requestId": "UUID-v4",
  "mode": "entender",
  "style": "contexto",
  "translation": "blivre",
  "question": "Como entender esta passagem?",
  "passage": { "book": "joao", "chapter": 1, "verse": 1 },
  "history": []
}
```

`mode`: `entender|explorar|narrar`; `style`: `simples|contexto|cotidiano`; pergunta de 3–800 caracteres. Histórico de no máximo dois pares `{question,answer}`, respostas até 2.000 caracteres. Omissão de tradução aqui mantém BLIVRE. Sucesso: `ok`, `mode`, `title`, `blocks[{text,citationIds}]`, `citations[{id,reference,text,href,source?}]`, `suggestions`, `notice`, `source?`, `scenes?`, `audio?`. Renderizar como elementos tipados; validar links e citações, sem executar HTML retornado.

### Coração

`GET /api/coracao` tem disponibilidade semelhante. `POST /api/coracao` aceita até 16.384 bytes: `{requestId,question,mode?,translation?,history?}`. `mode` é `encontrar|jesus`; **o default de tradução aqui é `open-nbv`, diferente do estudo contextual**. O app deve mandar explicitamente a edição escolhida.

Sucesso inclui `kind: answer|clarify|redirect`, blocos/citações/sugestões, `notice`, `source`, `audio?` e `suggestedReply?`. A resposta sugerida é algo que a pessoa pode adaptar; não uma declaração de Jesus nem um novo texto bíblico. O backend já usa busca e validação de fontes: reutilizar esse trabalho.

As duas rotas de texto chamam Anthropic no servidor. O nome do modelo é configuração do backend; não fixá-lo no app ou em promessa de marketing. O código mantém orçamento compartilhado e limites por visitante; não abrir um segundo canal que ignore esse ledger.

### Voz

O texto validado pode trazer `{ticket,text,expiresAt,partial}`. `POST /api/assistente/voz` recebe **somente `{ticket,text}`**, até 32.768 bytes. O ticket dura 900 segundos, limita o texto a 1.200 caracteres e vincula texto, pedido, visitante e perfil de voz. Não é uma API de leitura arbitrária de qualquer texto.

Resposta de sucesso é binária: `audio/wav` no adaptador OpenAI atual, ou `audio/mpeg` no adaptador ElevenLabs. O cliente deve confiar no Content-Type validado, não supor MP3. Erros voltam em JSON; não tentar reproduzi-los como áudio. A troca de Wi-Fi para celular entre texto e áudio pode invalidar o ticket atual, porque visitante é um HMAC do IP.

O app não recebe `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, tokens Redis ou segredo de assinatura. Não existe chave “pessoal do agente” a usar. Nenhum segredo de provedor pertence ao bundle, plist, UserDefaults, Keychain do usuário final ou WebView.

No nativo, áudio com `AVAudioSession` categoria `.playback` pode continuar com o interruptor silencioso ativado; iniciar somente após a pessoa habilitar a voz e enviar sua pergunta. Respeitar volume, interrupções, rota e pausa. Não prometer som quando volume está zerado. Ativar a sessão ao começar a reprodução, não no lançamento do app. [Apple: playback](https://developer.apple.com/documentation/AVFAudio/AVAudioSession/Category-swift.struct/playback), [Apple: AVAudioSession](https://developer.apple.com/documentation/avfaudio/avaudiosession).

### Liturgia

`GET /api/liturgia?date=AAAA-MM-DD`: `200` no sucesso, `400` para data inválida, `503` indisponível. Só uma query `date`; intervalo válido atual 2020-01-01…2100-12-31. Omitir a data usa hoje no calendário de Brasília.

Sucesso: `{ok:true,date,today,celebration,color,colorLabel,readings,source,edition,fetchedAt}`. Cada leitura contém `id`, `kind:first|psalm|second|gospel|extra`, `label`, `reference`, `passages[{reference,path,verses[{number,text,path}]}]`, `notice?`, `unavailableReason?`. Algumas referências podem não ter texto no corpus; mostrar o motivo, sem fabricar versículo.

Falha: `{ok:false,date,today,code,message,source}`. A fonte fornece calendário/referências; o texto de estudo é BLIVRE, não a redação do Lecionário da Missa. Manter a indicação e o link oficial.

Cache nativo explícito, não dependente de `URLCache` — a resposta HTTP atual é `no-store`. Salvar apenas um sucesso sanitizado por `date`, com `fetchedAt`, fonte e edição. Política proposta: conservar últimos 30 dias; ao abrir, mostrar imediatamente o dia escolhido já salvo e tentar revalidar quando houver rede. Se estiver offline, exibir “Leitura salva de 31/10/2026”; nunca rebatizar a leitura antiga como hoje. Esse armazenamento é decisão funcional do app e deve ser documentado, independente do cache HTTP.

### Jornada

Estado atualizado em 31/10/2026: a falha inicial `start` 503 foi corrigida no PR #44, já integrado na `main` em `d3a5c5266bd95be434a90457a66083bfaa4f085e`. Produção `dpl_7rG4ix6anUF1km75ZXxkvUkKbtBy` READY e alias confirmados. O ciclo público pela interface de início, consulta, pausa com pulso inativo e exclusão passou, inclusive consulta com cookie antigo após apagar; saldo e dias ativos permaneceram zerados. O endpoint de diagnóstico retornou 404. Essa prova cobre o ciclo web testado, não a concessão de pontos por atividade ou uma sessão mobile ainda não implementada. A sessão Mac deve integrar a `main` atual preservando seu trabalho, sem aguardar ou duplicar a correção de `codex/journey-cloud-fix`. A base histórica desta auditoria permanece `ddc6909`.

`GET /api/jornada` → `{ok,available,started,snapshot?,pulse?,code?,message?,retryAfterSeconds?}`. `POST` aceita exatamente `{op:'start'}`, `{op:'reset'}` ou `{op:'pulse',token,area,active}`. Não aceita tempo, XP, data ou saldo enviados pelo cliente.

Identidade atual: cookie `__Host-bc-journey` em produção e `__Host-bc-journey-preview` em preview; HttpOnly, Secure, SameSite=Lax, Path=/, retenção de 365 dias. O nonce de pulso fica só em memória; intervalo de 15 segundos; servidor limita crédito e evita duplicação. Snapshot contém pontos, dias ativos, tarefas, meta, `syncedAt` e `rewardStatus:'planned'`.

No nativo, adaptar elegibilidade ao `scenePhase`, visibilidade real do texto, interação recente, navegação e overlays. Não registrar estudo durante bloqueio/troca de app; não processar pontos offline por conta própria. Sem sessão mobile, manter a Jornada web isolada ou indisponibilidade explícita — nunca transformar contador local em saldo oficial.

### Partilha

URL de versículo BLIVRE: `https://www.bibliaconectada.company/joao/1/1`; da Open NBV: `/ler/open-nbv/joao/1/1`. Gerar a URL pela edição, seguindo `translationPath`, sem descartar o prefixo. URL de dia: `/dia/2026-10-31`, preservando a data. Imagem: `GET /og?path=<URL-encoded-path>&format=story|landscape&v=1`; PNG 1080×1920 ou 1200×630, respectivamente. Validar status, MIME, tamanho e assinatura PNG antes de abrir o share sheet.

`ShareLink`/`UIActivityViewController` recebe texto, URL e/ou arquivo PNG. Não exige permissão para ler a galeria. Não prometer publicação automática em Stories: os destinos disponíveis dependem dos aplicativos instalados e de seus contratos. Oferecer imagem + copiar link como fallback. Offline, renderizar uma capa nativa do versículo local com edição/créditos; para liturgia, somente se o dia real já estiver salvo.

## Fronteira de segurança: o que precisa mudar antes de IA nativa

**Achado concreto:** todos os POSTs de texto, voz e Jornada comparam `Origin` com `new URL(request.url).origin` e rejeitam `Sec-Fetch-Site: cross-site`. Um `URLSession` comum não manda esses headers de navegador; portanto tende a receber 403. O código só habilita o ledger de IA na Vercel e deriva visitante do `x-forwarded-for` validado. Não é autenticação de instalação.

Não remover o teste de origem, não liberar `*` com credenciais e não tratar `X-App-Client: ios` ou uma chave fixa no bundle como autenticação. O CORS aberto de `/dados/v1/*` serve apenas aos dados públicos; não autoriza POSTs de IA.

Proposta separada de API mobile, **ainda não implementada**:

- `/api/mobile/v1/session`: emite sessão anônima revogável da instalação; desafio e verificação no servidor, com App Attest quando disponível e comportamento explícito no desenvolvimento. Limites de criação por IP, sem chave secreta compartilhada no app.
- Tokens de acesso curtos em memória; credencial de renovação no Keychain. Sessão e identidade entram como dependências no serviço comum, sem forjar um request de navegador para pular o guard.
- Rotas `/api/mobile/v1/study`, `/heart`, `/voice`, `/journey` reutilizam parsers, busca, validação, reserva atômica e orçamento global. Ledger limita também instalação e IP; não criar créditos paralelos.
- Ticket de voz mobile vinculado à sessão estável, não somente ao IP, preservando validade, hash do texto, perfil e teto de custos. Testar troca de rede.
- Origem do navegador continua com a guarda atual. Revogação e exclusão invalidam tokens, limpam dados locais associados e interrompem pulsos.

App Attest permite verificar a instalação por desafios e atestações; requer verificação no servidor e separação entre desenvolvimento/produção. Nem todo aparelho oferece suporte, então definir a resposta a indisponibilidade sem bloquear a leitura offline. Isso é autenticação técnica da instância, não prova de identidade civil ou de leitura humana. [Apple: validar apps que conectam ao servidor](https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server), [Apple: integridade do app](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity).

Usar Keychain com acessibilidade `WhenUnlockedThisDeviceOnly` para a credencial dessa instalação: disponível desbloqueado e sem migração para outro dispositivo. Isso não cria recuperação de conta. Não anunciar que a Jornada do Safari aparecerá automaticamente no app; cookie do Safari, cookie do WKWebView e sessão URLSession são contextos diferentes. Uma migração exige fluxo próprio consentido. [Apple: acessibilidade do item Keychain](https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlockedthisdeviceonly).

Enquanto a API mobile não existir, o leitor, busca, relações locais, liturgia GET e partilha podem funcionar. Se for necessário preservar IA já disponível temporariamente, usar uma tela WKWebView restrita do próprio serviço após consentimento, sem expor bridge privilegiada; identificá-la como recurso conectado. Isso não substitui a implementação nativa planejada.

## Consentimento e privacidade

Antes do primeiro envio em Coração ou estudo, mostrar: **“Sua pergunta e o contexto desta conversa serão enviados à Anthropic para preparar a resposta. Se você ativar a voz, o texto da resposta será enviado à OpenAI [ou ao provedor realmente ativo] para gerar áudio.”** Oferecer continuar e cancelar, e opção de revogar nas configurações. Os provedores exibidos devem corresponder à configuração efetiva, não uma lista genérica.

A regra 5.1.2(i) atualmente exige explicar o compartilhamento com terceiros, incluindo IA, e obter permissão explícita antes de enviar dados pessoais. Isso é consentimento dentro do produto, não um substituto por uma frase escondida nos termos. [App Review Guidelines, 5.1.2](https://developer.apple.com/app-store/review/guidelines/#data-use-and-sharing).

Histórico de conversa fica em RAM por padrão, com no máximo os dois turnos exigidos pela API; salvar conversa deve ser ação separada. Favoritos, busca e leitura offline não precisam ir aos provedores. Não registrar perguntas, tickets, cookies ou corpo da resposta em analytics/crash logs. O app não precisa pedir localização para mostrar lugares bíblicos, nem contatos para compartilhar, nem microfone para apenas reproduzir voz.

Preencher App Privacy com a prática real do cliente, backend e terceiros; não escolher “nenhum dado coletado” por o app ser anônimo. Manter política pública e acesso dentro do app. [Apple: gerenciamento de privacidade do app](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).

Incluir `PrivacyInfo.xcprivacy` e declarar razões apenas para APIs efetivamente usadas, incluindo a categoria de UserDefaults se usada para preferências. Inventariar dependências antes de declarar “sem coleta”. Não copiar um código de razão aleatório para silenciar validação. [Apple: required reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api), [Apple: manifesto de privacidade](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).

## WebKit, links e associação com o domínio

Arcos 3D pode ser uma superfície restrita: allowlist de `https://www.bibliaconectada.company/arcos`, navegação fora dela encaminhada ao router nativo ou Safari, sem `evaluateJavaScript` com texto não escapado e sem bridge que leia Keychain. Pausar/remover WebView ao sair para não manter render pesado oculto. O modo 2D nativo continua disponível offline; a primeira versão do 3D remoto não é anunciada como offline.

No futuro, um bridge de mensagens pode enviar apenas um payload validado `{type:'openVerse',edition,slug,chapter,verse}` de frames e host confiáveis. Rejeitar protocolos, URLs e métodos arbitrários. Cada lado faz sua validação; mesmo conteúdo do próprio domínio não recebe acesso geral ao armazenamento nativo.

Associar `bibliaconectada.company` e `www.bibliaconectada.company` ao Bundle ID definitivo, via entitlement `applinks` e arquivo AASA em cada host. A busca de arquivos deste repo não encontrou uma implementação AASA atual. Team ID/Bundle ID ainda não são conhecidos: não inventá-los. Para o app instalado, versículo/dia abrem a tela correspondente; sem app, o link continua no site. [Apple: Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains), [Apple: diagnóstico de Universal Links](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links).

## Fatia de implementação e critérios verificáveis

**Agora, sem depender de credenciais:** criar projeto SwiftUI isolado, modelos `Codable` dos arquivos em português, corpus completo embarcado, repository/indexação, Reader com Dynamic Type, busca local, favoritos persistidos, lista de conexões e share sheet. Adicionar Hoje com DTO e cache por data. Código pode ser preparado no Windows, mas isso não equivale a compilação iOS.

**Com Mac/Xcode:** compilar, executar no simulador e no iPhone; validar modo avião, abertura de capítulo, busca com acentos, retomada, tamanho de fonte grande, VoiceOver, rotação, safe areas, fechamento de sheets e exportação PNG. Testar o 3D isolado em hardware, inclusive consumo e interrupção.

**Antes da beta pública:** declarar escopo e edições disponíveis; para paridade, incluir Open NBV e seleção persistida. Sessão mobile e consentimento; respostas/voz com erro, cancelamento e limite; testes de troca de rede e remoção da Jornada; Universal Links; ícone real em Assets; política/suporte públicos; dados de privacidade; screenshots do binário real e notas de revisão. O build deve oferecer funções reais e acessíveis aos revisores. Não marcar uma aba vazia como funcional.

Matriz mínima de testes:

- 66 livros, 31.102 textos e limites dos capítulos conferem; Gênesis1:1 e João1:1 preservados exatamente; índice de busca não altera texto.
- Open NBV preserva sua grade, texto e créditos; 3 João1:15 abre na edição certa, sem converter silenciosamente para BLIVRE. Favoritos, IA e partilha mantêm o identificador da edição.
- Ligação João1:1/Gênesis1:1 existe, votos separados da contagem; atualização quebrada não corrompe a versão instalada.
- Nenhuma chamada de IA antes do consentimento; revogação impede novo envio; chave de provedor ausente dos recursos e logs.
- Liturgia offline mostra data salva; 503 não vira uma celebração inventada; link e PNG mantêm a mesma data.
- URL recebida abre a passagem correta; entrada malformada/fora do catálogo falha de modo legível.
- Acompanhamento pausa quando a cena sai de ativa; nenhuma soma local de pontos ou promessa de presente disponível.
- Voz habilitada respeita interrupções/volume e mantém controles visíveis; desabilitar voz não bloqueia texto.

Arquitetura e código-fonte não são autorização/garantia de aprovação Apple. Assinatura, identificação do titular, submissão, revisão e publicação permanecem etapas distintas, coordenadas pelo agente principal.

## Evidências locais consultadas

`site/package.json`, `site/next.config.ts`, `site/src/lib/site-identity.ts`; `DADOS.md`, `LICENSE-DATA.md`, `ATTRIBUTION.md`; `site/public/dados/v1/manifest.json`, `livros.json`, `texto/joao.json`, tamanhos dos 66 livros e ZIP; `site/public/data/verse-links/joao/1.json`; `site/src/app/api/{assistente,assistente/voz,coracao,liturgia,jornada}/route.ts`; contratos, parsers, serviços, ledger e identidade em `site/src/lib/{assistant,coracao,liturgy,rewards}`; `/og` e `share-card.ts`. Nenhuma chave de ambiente foi lida ou copiada.
