# Identidade do app e compartilhamento — 20/10/2026

Pedido: substituir o ícone automático com uma letra, fixar o nome na tela inicial, produzir capas coerentes para os links e orientar a instalação no iPhone.

## Implementação

- Marca vetorial própria com arco duplo, pontos e estrela; PNG Apple 180, Android 192/512, maskable 512 e favicon 32/48. Geração reproduzível por `npm run icons`.
- Nome completo Bíblia Conectada; nome curto/Apple Bíblia. Manifesto com identidade e escopo estáveis, abertura na home e atalhos de leitura, céu e mapa.
- Metadados específicos em 29 páginas/famílias, com URL HTTPS absoluta, Open Graph e Twitter. Canônico de versículo continua apontando ao capítulo conforme a política existente; `og:url` identifica o versículo.
- `/og` renderiza PNG 1200 × 630 de caminhos conhecidos, usando dados reais. BLIVRE identificada nas citações; trechos longos usam reticências. Fontes WOFF convertidas das OFL já presentes, sem requisições externas ou dependências novas de produção.
- Seleção do céu também fica em `?ref=...`, lida pelo servidor. Hashes antigos e `?v=` continuam aceitos; limpar a seleção remove as duas representações. Callbacks tardios não alteram outras rotas. Entradas inválidas têm capa genérica ou 404 conforme o tipo; texto arbitrário não vira capa.
- Aviso iOS/iPadOS adiado e dispensável por 30 dias, escondido em standalone ou durante diálogos. Tutorial local com Compartilhar → Adicionar à Tela de Início → Adicionar. Sem service worker, permissão de notificações ou alegação de funcionamento offline.

## Verificação

Rodada final de `6f7e046`: 634 testes em 42 arquivos, compilação Next 16.4.2, TypeScript e check-dist aprovados. O verificador conferiu 2.539 páginas pré-renderizadas, créditos, números e textos protegidos. Todos os arquivos de fontes OG constam no trace de implantação. ESLint aprovado nos arquivos implementados; os 43 testes focados da extração do engine também passaram. Logs finais: `build-release.log` e `budget-release.log` na pasta externa de evidências.

QA externo em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/app-identity-sharing/`: 145 respostas HTML (29 endereços × 5 user-agents), 29 PNGs com dimensões e hash estáveis entre requisições, ícones e manifesto, 12 telas (home/versículo/céu, 375/1440, Dia/Noite). Facebookexternalhit/WhatsApp/Twitter conferidos no head; Facebot é documentado separadamente como leitura do HTML completo.

O primeiro orçamento medido excedeu o teto de 165 KiB por 353 bytes na home e 558 bytes no céu. O menu de aparência passou a carregar na primeira abertura; a detecção do iPhone foi separada da política de dispensa. A interpolação da câmera e o hit-testing do céu foram movidos, sem alterar seus cálculos, para o módulo do engine já adiado. O teto continua em 165 KiB. Medição final de `6f7e046`: **home 168.953 bytes; `/arcos` 168.646 bytes**, ambos abaixo de 168.960 bytes; todas as famílias passaram. A home tem apenas 7 bytes de margem, portanto futuras alterações precisam continuar passando pelo orçamento. A medição cobre JS inicial declarado no HTML, não o peso total com dados, fontes e módulos adiados.

Guia de instalação: cinco cenários passaram, incluindo iPhone Dia/Noite, ausência no desktop e modo standalone. Aviso após aproximadamente 7,4 segundos; diálogo de 339 × 537 em viewport 375 × 812; foco inicial, ausência de foco em elementos do fundo, Escape/X com retorno ao botão, três passos legíveis e dispensa preservada após reload. Aparência em 375 e 1440: Dia/Noite/Sistema, quatro setas com ciclo, preferência do aparelho, Escape, clique fora e persistência passaram. Agent Browser também capturou a home em 1440, sem erros. Nenhum teste enviou POST pago de IA.

Prévia do código inicial `077f45f`: Vercel `dpl_94EMReh3bpN8Gxp659bGmn5KvEBX`, **READY**. Acesso autenticado pela integração Vercel confirmou HTTP 200 na home, seleção `Salmos 34:4`, manifesto, ícone Apple e endpoint PNG da capa. Prévia protegida redireciona visitantes anônimos ao login da Vercel; isso não foi confundido com a página do site.

Prévia final `6f7e046`: Vercel `dpl_5ak3YmDEHN2qxKFTMx9SkgwDKAxW`, **READY**, Node 22, sem erro de alias. Seleção `Salmos 34:4` retornou HTML 200 com título próprio; capa de João 3:16 retornou PNG 200. Smoke HTTP local final verificou cinco páginas com suas capas 1200 × 630, manifesto e quatro arquivos de ícones; hashes em `local-release.json`.

Após a extração do engine, smoke Playwright em 375 e 1440 passou: câmera, zoom, arraste, seleção, limpar query, navegação para fora e Voltar, reload da query e ausência de overflow. Sem erros de página nem POST de IA; `engine-smoke.json`. A seleção usa `replaceState` deliberadamente; o teste não confunde essa operação com uma nova entrada de histórico.

## Publicação

PR #22 integrado por squash em `9049d1e2a7894c4e00e31a4c3e9a1272b0792a2e`, conforme a autorização de Alex para integrar e publicar. Produção Vercel `dpl_vD3AMM92L5KbBijWNXmf8H2x9NQp`, **READY**, alias público `https://alexpiraginet-bot-biblia-conectada.vercel.app` confirmado, sem erro de alias. Em 21/10/2026 UTC (20/10 à noite em Brasília), o domínio público passou cinco páginas com títulos/Apple metadata/capas PNG 1200 × 630, manifesto e quatro ícones. Os hashes de cada ícone publicado coincidem com os arquivos aprovados no repositório; detalhes em `production-release.json` na pasta externa.

Playwright no domínio público, iPhone 375 × 812 emulado: aviso visível, três passos, diálogo 339 × 537, foco interno e nome/ícone corretos; zero erros JS, console, rede, overflow ou POST. Capturas `production/iphone-375-notice.png` e `production/iphone-375-guide.png` inspecionadas; relatório `production/iphone-guide-production.json`. A espera pública de 15,7 s inclui navegação e carregamento, além do atraso de 7 s configurado no componente.

## Evidência visual e limites

Ícone mestre, recorte maskable e PNGs OG de home, João 3:16, referência longa e conexão inspecionados pelo agente principal. O símbolo cabe na máscara e o texto não ultrapassa a imagem. Parecer auxiliar de Gemma via Ollama destacou cortes, caches e distinção entre nome instalado e título da página; as verificações reais, e não o parecer, sustentam o resultado.

Não foi feita instalação em iPhone físico nem enviado link a WhatsApp/Instagram. O site fornece os metadados e imagens; a apresentação final depende do aplicativo e de seus caches. Atalhos antigos podem precisar ser adicionados novamente.

Fontes oficiais: [Apple — app na tela inicial](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios), [Apple — título e ícone](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [WebKit — precedência do Apple Touch Icon](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Open Graph Protocol](https://ogp.me/). Documentação Meta respondeu 429 na pesquisa; nenhuma garantia de prévia em todos os contextos do Instagram foi inferida.
