# Abertura, travessia e compartilhamento — 01/11/2026

Base a7320be (PR47), branch codex/daylight-home, PR48. A revisão substitui a abertura plana pela paisagem de amanhecer e esferas de cristal, implementa o túnel aprovado de 1 segundo e usa Sistema como tema inicial. Bordô/dourado permanecem discretos, com leitura prioritária. Artes de versículo/dia usam o vale; conexões usam o túnel. Alex pediu cards mais translúcidos: a área de leitura passou de 92% para 84%.

## Verificação local final

- npm run build: **1098 testes / 71 arquivos**, Next/TypeScript e check-dist passaram. Créditos, números, 3840 páginas prerenderizadas e ausência das citações protegidas verificadas.
- npm run lint, npm run typecheck e git diff --check passaram.
- npm run budget: todas as rotas abaixo de **168960 B gzip9**. Home **162694 B**; Arcos **167488 B** (1472 B de margem); capítulo BLIVRE 148878 B; versículo 157713 B; chegada 145085 B. Túnel/editor não entram no JS inicial de Arcos/leitura. Sem dependência nova.
- Os dois JPEG locais e fontes estão incluídos no trace de /og. Arquivos e hashes em [direção visual](../../design/ABERTURA-DIA-20261101.md).

## Navegação e imagens

- Build de produção local, porta 3033: **9/9** casos da abertura, Chrome/WebKit 375×812 e 1440×900, Dia/Noite e sem JS. Três destinos reais, texto/fonte/contagem derivados, ações de conexões/IA/share, foco no título e limpeza da camada. Túnel observado em aproximadamente 1000–1040 ms; timer de 1000 ms. Pausa, retorno, Pular, movimento reduzido, suspensão fora de vista e menu completo passaram.
- **12/12** casos adicionais: Sistema claro/escuro em Chrome/WebKit, mudança ao vivo do aparelho, override manual persistido, armazenamento bloqueado, chegada sem JS nos dois temas, imagens de versículo/conexão/dia nos três formatos e casos de texto longo/edição Open NBV.
- Downloads PNG validados: 1080×1920, 1080×1350 e 1200×630. Chamadas nativas simuladas, inclusive cancelamento, sem enviar a WhatsApp/Instagram. Nenhuma chamada de IA ou requisição de escrita nos fluxos testados.
- Citação, fonte, créditos e carimbo conferidos. Ester 8:9 (maior verso BLIVRE, 476 caracteres), referência longa, Open NBV e capa diária renderizados sem corte. Edição/data continuam no link. O domínio fica junto da marca sobre bordô.

## Revisão independente e correções

Agentes de performance e UI/UX fizeram revisão somente leitura. Achados corrigidos; **6/6** regressões passaram:

1. Chunk visual frio: antes, o clique aguardava o download. Agora usa o módulo pronto ou abre a passagem imediatamente. Retendo o chunk indefinidamente, a chegada ocorreu em 144 ms no teste local; liberar depois não abriu efeito atrasado.
2. Economia de dados/2G: bloqueiam prewarm de módulo/imagem. Zero downloads visuais especulativos nesses testes; pulsos e navegação continuam funcionando. Rede normal pré-aquece quando a abertura fica visível.
3. Espaçamento acessível: título permite quebra. Letras 0,12 em, palavras 0,16 em e linha 1,5 em 375 px não cortam “Novos caminhos.”.
4. Menu/título desktop: largura do título seguinte limitada; não há interseção com a cápsula em 1440×900.
5. Contraste nas artes: crédito escurecido e domínio no carimbo. Cálculo conservador com card 84% sobre preto: crédito 5,21:1, chamada 4,60:1; domínio sobre o pior fundo do carimbo 9,69:1.
6. Sem JavaScript: removido o fallback de streaming que escondia a chegada; links reais e textos permanecem visíveis.

A revisão independente também confirmou reflow normal em 320/375/768/1440, alvos da abertura ≥44 px e chegada pelo teclado. Contraste da abertura medido sobre pixels reais: mínimo 4,92:1 no texto secundário Dia, 5,06:1 no título em itálico e 5,00:1 no rótulo longo; CTA ≥6,87:1. Posição, pausas e deslocamento dos pulsos foram medidos.

A revisão automática da PR48 encontrou um caso adicional: alternativas de primeira leitura podiam ocupar o lugar do Evangelho nas capas diárias. A seleção agora prioriza uma leitura de cada tipo antes de completar as quatro posições e informa quantas outras leituras estão no site. Regressão renderizada em Story, Post e horizontal; os **21 testes de compartilhamento diário** passaram, sem modificar a lista original.

## Evidências e limites

Pasta local: C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/daylight-opening-20261101/

- build-release.log, budget-release.json;
- release-build/report.json e capturas 375/1440 Dia/Noite;
- release-theme-sharing/report.json, PNGs e telas do editor;
- release-regression/report.json, reflow e título/menu;
- contrast-v2.json, ui-review-readonly/ (achados anteriores à correção);
- scripts qa-v2.mjs, theme-share-qa.mjs, release-regression.mjs.

WebKit emulado não é teste em iPhone físico. Compartilhamento nativo real, renderização em Instagram/WhatsApp, Lighthouse e bateria física não foram certificados. Publicação exige Vercel READY no commit revisado e conferência pública; este registro local não substitui prova de produção. Nenhuma postagem social ou despesa de IA foi realizada. Motion em sessão própria, com áudio/roteiro originais preservados por instrução.
