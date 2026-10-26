# Retirada da seção de motion

## Pedido e escopo

Alex rejeitou a seção do PR #39: queria uma interpretação nativa da referência, e autorizou retirar a implementação que não atendesse a esse objetivo. O PR #40 remove `LivingStory`, seu player adiado, CSS, vinte testes exclusivos e quatro mídias públicas. `page.tsx`, `HomeMotion.tsx` e as reservas de rotas voltam exatamente ao conteúdo anterior ao PR #39. A busca segue diretamente para o guia e o atlas existente. As funções de Coração, leitura, grafos e navegação não mudam.

O ZIP e as fontes editáveis permanecem preservados. Antes da retirada dos arquivos públicos, cópias dos quatro derivados foram verificadas por SHA-256 em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/withdrawn-living-story/`. Scripts, manifestos e evidências anteriores ficam como histórico. `ATTRIBUTION.md` deixa de descrever uma mídia presente na home; a procedência arquivada permanece em `design/living-story/`.

Não foi criada outra seção decorativa. A direção para uma eventual implementação nativa é usar os fios como conexões de passagens reais no grafo existente, com resposta a seleção/toque/ponteiro e acesso à leitura. Isso é direção de continuidade, não funcionalidade entregue nesta rodada.

## Validação local

Fonte `21435d2be4b59f77e06561aacd941d46423acb29`. Build completo passou, com 806 testes em 58 arquivos, compilação Next, TypeScript e check-dist. O check-dist conferiu 3.803 páginas e a 404, números, créditos, leitura Open NBV e 33.844 arquivos entregues sem as citações protegidas. ESLint passou. Orçamento inicial gzip9: home 166.944 B e Arcos 168.491 B, ambos abaixo do teto de 168.960 B.

Oito cenários no build de produção local passaram: Chromium/WebKit, 375/1440, Dia/Noite. Ausência do bloco e de pedidos às mídias retiradas; continuidade busca → guia → atlas; nós e linhas reais renderizados; links de Coração, leitura e Arcos presentes; nenhum transbordamento horizontal, erro de JavaScript ou chamada POST às APIs. Capturas acima da dobra e das transições busca/guia/atlas registradas; quatro capturas dos dois tamanhos/temas conferidas visualmente.

Revisão independente confirmou o escopo isolado e ausência de resíduos no código do site. Nenhum arquivo de `estudos/` foi alterado nesta retirada; os trabalhos recentes do Claude foram incorporados da main.

Evidências locais na pasta `withdrawn-living-story/`: `build.log`, `lint.log`, `budget.log`, `qa.cjs`, `local/report.json` e capturas. Servidor local encerrado após a QA. Não houve validação em iPhone físico, chamadas pagas, mudança de credenciais ou publicação social.

## Publicação

Prévia `dpl_J1yqPfY2fNixufLjx1G8r8Ba1PHS` READY na fonte `21435d2`. PR [#40](https://github.com/alexpiraginet-bot/biblia-conectada/pull/40) integrado por squash `3c33d8a89c527adfe4d66a6ba6845b9ee3c93aa8`. Deployment de produção `dpl_CCDTKxVYyaxBEmjcg6MMt4nCcwoa` confirmado READY com esse SHA e aliases `www.bibliaconectada.company`, apex e host Vercel anterior.

- **Oito cenários públicos passaram**, Chromium/WebKit, 375/1440, Dia/Noite: seção ausente, nenhuma requisição às mídias retiradas, guia/atlas e links preservados, sem transbordamento ou erro de JavaScript. Relatório e 24 capturas em `withdrawn-living-story/production/`.
- Cinco rotas (`/`, `/coracao`, `/ler`, `/arcos`, `/sobre`) retornaram HTTP 200. O texto do crédito da mídia retirada também saiu de `/sobre`.
- `/living-story/story.mp4`, `poster.webp`, `portal.webp` e `network.webp` retornaram **404** no domínio principal.
- JS inicial público gzip9: **home 167.171 B**, **Arcos 168.726 B**, abaixo de 168.960 B. Relatório `production/http-budget.json`.

Não foi necessária nova credencial, acesso temporário à prévia, chamada paga ou alteração de configuração. Esta retirada atende ao pedido de Alex; uma interpretação nativa nova continua fora desta entrega.
