# Ícone e nome do iPhone — 21/10/2026

Alex relatou que o ícone continuava ausente na tela inicial do iPhone e pediu o nome padrão **Bíblia Conectada**.

## Diagnóstico

No domínio público anterior, home e versículo tinham a identidade no `<head>` inicial. `/arcos?ref=joao/3/16` enviava nome Apple, manifesto, ícone e Open Graph depois de `</head>` por streaming de metadados. Chromium hidratado promovia o link do ícone para o head, mas deixava nome Apple e manifesto no body. Os PNGs declarados respondiam 200 com hash correto; `/apple-touch-icon.png` e `/apple-touch-icon-precomposed.png` retornavam 404. Não foi encontrada evidência de cache antigo. A falha de descoberta é uma hipótese para o sintoma físico, não uma reprodução de instalação no iPhone.

## Correção

- `htmlLimitedBots: /.*/`, opção documentada no Next 16.4.2 local, faz os metadados serem resolvidos antes da resposta inicial para todos os user-agents. A identidade fica no head também nas rotas dinâmicas, sem tags duplicadas nem dependência de JavaScript.
- O gerador reproduz o mesmo PNG180 aprovado nos dois caminhos padrão Apple. A arte original, a rota anterior e seus hashes são preservados.
- Nome do manifesto, nome curto e título Apple: **Bíblia Conectada**, conforme o pedido. O sistema pode abreviar visualmente o rótulo por falta de espaço.
- Nenhuma nova dependência ou JS de cliente. O custo assumido é aguardar a resolução de metadados antes de iniciar a resposta de uma rota dinâmica; não há alegação de melhora de TTFB.

Referências: documentação instalada de `generate-metadata`/`htmlLimitedBots` e [guia da Apple sobre ícones e título](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## Verificação local

Código `c6e4325`: 634 testes, build, TypeScript, ESLint e check-dist passaram. O verificador conferiu 2.540 páginas, incluindo a terceira Ponte do calendário. Orçamento inicial inalterado: home 168.953 bytes; arcos 168.646 bytes, abaixo do teto de 168.960.

18 GETs em home/arcos/versículo, Safari iPhone e Chromium: nome completo, manifesto, ícone e OG no head, sem duplicatas. Ambos os fallbacks PNG180 responderam 200 e têm o hash da imagem aprovada. Quatro capturas da home, 375/1440 e Dia/Noite: sem erros JS, overflow ou POST de IA; duas inspecionadas também pelo agente principal.

Evidências externas: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/app-identity-sharing/icon-head-fix/` (`production-before.json`, `local-after.json`, `local-summary.json`, `local-browser-after.json` e PNGs). Build e imagens públicas entregues a Alex: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/icon-share-check/`.

O baseline tem 18 GETs públicos. Tempos locais não são comparados com produção como se fossem equivalentes; o comparativo público final usa o mesmo domínio e método, com as limitações de cache/rede e amostra pequena.

Instalação física e atualização de um atalho já existente não foram verificadas. Não houve remoção de atalhos nem limpeza de dados do aparelho.

Prévia Vercel `dpl_BQSZh7PLZAFpAFTrmchEBpcV5Adu` READY para `c6e4325`. Acesso autenticado confirmou `/arcos?ref=joao/3/16` HTTP200 com título Apple completo, ícone e manifesto no head; manifesto com os dois nomes completos; `/apple-touch-icon.png` HTTP200 image/png, 6.413 bytes. O commit seguinte somente registra evidência.
