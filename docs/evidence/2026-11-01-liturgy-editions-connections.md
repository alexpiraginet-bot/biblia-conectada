# Liturgia: traduções e conexões no mesmo contexto

Data: 01/11/2026. Branch `codex/liturgy-connections`, base `edc81545c73e740ad6871a863da2d880d57ed45d`.

## O que muda

Os versículos BLIVRE da liturgia passam a oferecer **Conexões**, além de estudo com IA e compartilhamento. O painel reaproveita o host adiado já existente, exibe parceiros reais de qualquer voto e distingue zero de falha de carregamento. Seguir outra conexão, abrir estudo ou compartilhar e fechar mantém a URL da liturgia, a posição da leitura e o foco no acionador. A ação compartilhada respeita telas que já têm sua própria entrada de conexões, evitando duplicação.

O seletor da própria liturgia oferece **Bíblia Livre** para versículos de estudo e **Open NBV** para capítulos completos de contexto. A referência litúrgica permanece intacta; os números de versos BLIVRE nunca são aplicados como equivalência à Open NBV. Salmos dependem do capítulo explicitamente pareado; Daniel, Ester, deuterocanônicos e notações não resolvidas mantêm acesso à fonte oficial. Os capítulos opcionais usam disclosures nativos, com o primeiro aberto e índice das leituras preservado.

CNBB e Ave-Maria são **links externos identificados**, sem iframe, importação de texto protegido ou promessa de uma edição nativa licenciada. Créditos NBV próprios ficam visíveis. Detalhes em [LITURGIA.md](../LITURGIA.md).

Data e edição seguem na navegação, formulário, API, retry, metadados, capas, QR e destino da instalação. Edição desconhecida, vazia ou repetida gera erro explícito antes da consulta ao calendário. Capas diárias NBV mostram referências e explicação de contexto sem citação de verso ou aspas de citação. O compartilhamento de um verso NBV específico continua com seu texto e licença. [Contrato de compartilhamento](../LITURGY-SHARING.md).

## Validação local

- `npm run build` executou prebuild de dados, suíte completa, Next e check-dist. Após a correção visual descrita abaixo, `npm --ignore-scripts run build` repetiu todos os testes, Next e check-dist, reutilizando somente os dados inalterados já gerados.
- **1.088 testes / 69 arquivos** passaram. Next.js 16.4.2 compilou e passou TypeScript. `npm run typecheck`, `npm run lint`, `git diff --check` e `npm run budget` passaram no código final.
- Check-dist: créditos/idioma em **3.837 páginas e 404**, números conferidos nas fontes, **34.212 arquivos entregues** sem trechos protegidos e **94 arquivos de navegador** sem proveniência de ilustrações. Os **1.189 capítulos / 31.105 posições NBV** mantêm texto, ações e créditos.
- JavaScript inicial gzip9: **Arcos 167.475 B**, abaixo do teto inalterado de **168.960 B** (margem **1.485 B**); **liturgia/dia 145.673 B**. Não inclui CSS, HTML, imagens, dados ou módulos carregados depois; não é Lighthouse ou FPS.
- **22/22 cenários finais**: oito Chrome/WebKit × 375/1440 px × Dia/Noite, oito cenários de falha/recuperação e seis grupos HTTP/API/imagens/QR. Zero erros JavaScript e zero chamadas de escrita/pagas nos fluxos de navegador.
- Troca BLIVRE → NBV → BLIVRE, próximo/anterior, formulário e hoje mantêm data/edição e um único conjunto de controles. A API NBV foi comparada aos arquivos reais dos capítulos; os textos não herdam os recortes BLIVRE.
- Estudo e compartilhamento inline mantêm o texto NBV. Conexões BLIVRE conferidas contra os dados do verso; fechar preserva URL, rolagem e foco. Falhas de imagem/conexões são explícitas e recuperáveis; nenhum download falso.
- QR PNG decodificado independentemente por jsQR contém data e edição. Capas NBV 1200×630 e 1080×1920 abertas e conferidas visualmente, com referências, aviso e URL legíveis, sem citação BLIVRE ou cortes.
- Revisão independente de implementação e QA não encontrou bloqueadores no código final. Capturas 375/1440, Dia/Noite, conferidas pelo agente principal.

## Defeito detectado e corrigido

A primeira matriz mostrou controles de data duplicados depois da troca SPA de edição. `DateNavigation` e `LiturgyShare` tinham a mesma key como irmãos. Prefixos distintos corrigiram a reconciliação, preservando o reset do formulário e das imagens preparadas. A matriz final exige um único conjunto **visível** após cada troca; Next pode manter páginas anteriores ocultas em memória. A falha original era visível e foi documentada, não mascarada pelo teste.

## Evidências e limites

Artefatos fora do Git: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/liturgy-editions-20261101`. Inclui `REPORT.md`, `TECHNICAL-REPORT.md`, logs finais de build/tipos/lint/budget, relatórios JSON, scripts de QA, capturas e manifesto SHA-256. Capturas `*-failure.png` são históricas, não a interface final aprovada.

Sem iPhone físico, envio real a WhatsApp/Instagram, câmera lendo QR, resposta paga de IA/voz ou revisão acadêmica do alinhamento. Nenhuma edição em fontes/estudos, backend SaaS, documentos privados ou nova conta de nuvem. O progresso de recompensa existente não foi alterado.

## Publicação e reversão

O PR deve registrar os SHAs, IDs Vercel, estado **READY**, alias canônico e smoke da prévia/produção. Build local, push ou estado BUILDING não comprovam publicação. Antes do merge, conferir que o head corresponde ao código revisado e que não houve nova alteração concorrente em `main`.

Se houver regressão causada pela release em escolha de edição, integridade de texto, conexões ou abertura das páginas, reverter o commit desta entrega e publicar a reversão preservando fontes e dados. Falha isolada do serviço externo de calendário deve continuar como indisponibilidade explícita; não substituí-la por texto ou calendário inventado.
