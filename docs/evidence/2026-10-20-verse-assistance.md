# Ajuda por versículo e texto no céu 3D — 20/10/2026

## Comportamento

“Entender com IA” acompanha o texto no leitor e seus painéis, nos cards de conexões, na constelação, no céu 3D, na cronologia e no mapa. Cada ação transporta livro, capítulo e versículo canônicos; o card de uma conexão usa o destino, não a origem. O assistente valida a referência no servidor, recupera a BLIVRE e preserva os atalhos de episódios. Uma referência inválida recebe aviso, sem consulta automática.

Os estilos Bem simples, Contexto bíblico e No dia a dia são independentes dos modos entender, explorar e narrar. O estilo faz parte do pedido normalizado e de sua identificação. Omissão mantém contexto; valores inválidos são rejeitados. Modelo, teto, reserva financeira, limites e credenciais permanecem iguais. O áudio usa SpeechSynthesis após um clique, com parada, propriedade exclusiva do player e mensagem quando indisponível; não há cobrança de TTS nem autoplay.

Selecionar um capítulo no céu 3D carrega seu texto completo antes das conexões. O texto tem uma região própria de rolagem, ações por versículo, estado de carregamento e tentativa manual em caso de falha. Selecionar um versículo continua mostrando o texto exato. Painéis de capítulo/versículo carregam sob demanda.

O retorno do assistente para uma âncora da home também foi corrigido: os atalhos usam o histórico do roteador. Uma consulta interrompida ao navegar preserva seu UUID, oferece nova tentativa da mesma consulta e não reenvia automaticamente. Os rótulos de IA não entram na seleção nativa do texto bíblico.

## Evidência local

- Build completo final: 580 testes em 37 arquivos, Next 16.4.2 e check-dist passaram. Tipos, ESLint e diff-check passaram.
- JS inicial gzip: home 167.271 bytes (163,4 KiB), `/arcos` 167.112 bytes (163,2 KiB), `/assistente` 158.640 bytes (154,9 KiB). Teto de 168.960 bytes preservado; nenhuma dependência nova. Essa medida não inclui módulos adiados, dados, imagens, fontes ou HTML.
- Custo adiado do 3D: Panel 2.771 bytes, engine 11.451 bytes e controles 679 bytes; inicial mais abertura de um capítulo soma 182.013 bytes (177,7 KiB). Todos os nove módulos opcionais do 3D somam 36.498 bytes; inicial mais todos eles, 203.610 bytes (198,8 KiB). Medida gzip nível 9 por arquivo único, sem chunks antigos ou prefetch de outras rotas, em `verse-study-js-payload.json`. O adiamento reduz a primeira carga, sem eliminar o custo posterior.
- Playwright Chrome 375/1440 e WebKit/Windows 375: referência Jeremias 17:8, texto, três estilos enviados corretamente, seleção Salmos 119:176, rejeição de Salmos 119:177 sem POST, controles de voz, retry com mesmo UUID e histórico home/assistente. API e voz simuladas nesses casos para verificar integração sem consumir o provedor.
- Activity: consulta interrompida, saída, retorno e tentativa manual mantêm UUID; nenhuma consulta automática adicional. Chrome 375, API simulada.
- Entrada e painel 3D: onze casos aprovados no relatório consolidado `verse-study-verified-qa.json`. Gênesis 6 em 375/1440 nos dois temas, 22 versos comparados ao JSON BLIVRE, texto antes das conexões, falha HTTP 503 com retry e troca rápida para Gênesis 7 sem sobrescrita atrasada; links de origem e destino, leitor, home, cronologia e mapa. Alvos de pelo menos 44 px, nenhum controle aninhado, overflow ou erro de página. Zero POST de IA. O primeiro relatório parcial continha falhas de seletor do teste; o consolidado substitui esses casos após corrigir o seletor e repetir a verificação.
- Agent Browser/Chrome, axe 4.12.1 no conteúdo do assistente: zero violações automáticas; três textos sobre gradiente exigiram cálculo separado. Fundo mais escuro `#e9dfca` e tons `#6a5c48`, `#24383b`, `#6d6254`: contrastes 4,90:1, 9,32:1 e 4,50:1 respectivamente.

Capturas, scripts e relatórios ficam fora do Git em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/`: `verse-assistant-qa.cjs`, `verse-assistant-qa.json`, `verse-ui-*`, `verse-styles-*`, `qa-verse-study-entry.cjs`, `verse-study-*`. As imagens de QA com resposta simulada não comprovam uma resposta da Anthropic.

WebKit no Windows não equivale a um iPhone físico. Não foi aferida a voz audível no aparelho do Alex. A presença das citações comprova sua origem, não a infalibilidade da interpretação. Os controles de voz foram exercitados com mecanismo simulado; a captura publicada confirma o botão, sem afirmar audição em aparelho físico.

## Publicação

PR #17 integrado por squash em `aba58ec2dddefb2c6576f94148cea70450ec38c8`, a partir da prévia `37d2e11410fd9c33b6c2ec0b949992cd97ce217a`. Prévia Vercel `dpl_AkV7wYf5xec3wYGpSXDk6u6xM4g1` READY, CI verde e HTTP 200 em `/arcos` e `/assistente?ref=jeremias/17/8`, com verso e três estilos presentes no HTML recebido.

Produção `dpl_3yofAzFMp4ugjNFxkWe5sznrJ7JB`, commit `aba58ec2dddefb2c6576f94148cea70450ec38c8`, READY e alias `https://alexpiraginet-bot-biblia-conectada.vercel.app` confirmados. Gênesis 6 publicado foi conferido em 375/1440, Dia/Noite: 22 versos exatos, sem overflow ou erros JavaScript. Capturas com prefixo `published-verse` preservam as evidências locais anteriores.

O smoke público consolidado passou nos cinco casos (quatro combinações do 3D e o deeplink Jeremias 17:8), sem POST de IA. `published-verse-verified-qa.json` registra commit, deployment e SHA-256 das cinco capturas. A validação de provedor abaixo foi uma execução separada.

Às 22h28 UTC, três consultas reais foram enviadas pela UI publicada, sobre Jeremias 17:8, no modo entender. Os estilos simples, contexto e cotidiano retornaram HTTP 200, com 9, 11 e 11 citações respectivamente. Todas as citações foram comparadas ao texto BLIVRE canônico; os três resultados passaram, sem retry ou erro de página. O estilo simples usou frases mais curtas, contexto explicou a oposição entre os versículos 5–8 e cotidiano incluiu reflexão explicitamente identificada. Resultados sanitizados em `published-verse-live-qa.json`; screenshots `published-verse-live-{simples,contexto,cotidiano}-375.png` e `published-verse-styles-375.png`. Não houve leitura de chaves nem auditoria de saldo/custo dessas três consultas. O teto de US$20/mês e limites por visitante permaneceram iguais.
