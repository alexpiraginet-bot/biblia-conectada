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

## Publicação e correção do cache

PR #23 integrado em `8d6cee738961f787b43670892da2833d35251da2`; produção `dpl_BYfTQDo3hWxWs7cK9zMD4qXzneL7` READY com alias público. As 18 respostas e os PNGs passaram, mas a conferência de performance identificou regressão: o bloqueio global de metadados gera `experimentalBypassFor` para todos os user-agents, contornando o cache de página da Vercel. Foram 18 BYPASS/18 depois, contra 16 HIT/18 antes. Navegação Chrome real e curl confirmaram; evidências em `production-comparison-blocking.json` e `blocking-build-manifest-proof.json`. Tempos de três amostras por grupo variam com rede/cache e não são benchmark definitivo.

PR #24 restaura o comportamento padrão do Next para streaming e crawlers. Somente a identidade invariável de instalação é explícita no head estático do layout: nome, configuração Apple, ícone e manifesto. Exceção consciente à recomendação geral do Next de usar a Metadata API: neste caso a API aguarda a seleção dinâmica e atrasava também a identidade estável. Título da página, Open Graph, favicon e demais metadados continuam na API. Os campos Apple foram retirados da API e suas convenções para evitar duplicatas; os mesmos URLs e bytes são preservados por arquivo público e route handler do manifesto. O segmento do manifesto é reservado no parser, conforme o teste existente exige. Nenhum JavaScript de instalação ou dependência nova foi incluído.

A confirmação final desta correção exige identidade no head para browsers, OG no head para crawlers e retorno do cache público, além do build e orçamento. Instalação no aparelho físico permanece sem comprovação.

Código `ea48e11`: build, 634 testes, tipos, ESLint e check-dist passaram novamente. Orçamento inalterado (home 168.953 bytes; arcos 168.646). `local-static-identity-after.json`: 27/27 GETs aprovados em home/arcos/versículo, Safari/Chromium e crawlers WhatsApp/Facebook/Twitter. Identidade no head sem duplicatas, OG no head dos crawlers, manifesto íntegro e imagens com os mesmos hashes. `static-identity-build-cache.json` registra a volta da lista padrão de crawlers no bypass, excluindo browsers comuns. A falha inicial do teste de segmentos reservados foi corrigida adicionando a rota explícita do manifesto; o teste não foi relaxado.

## Resultado final publicado

PR #24 integrado em `ca065a974135e6f367a85d4f701e1bb8fe394005`; Vercel `dpl_nz1rXFCK2V9m6vMwa9EV13wAdG4D` READY no domínio público. Prévia `dpl_EBMbzL48Jd9x9dGS4LXgvurCJqZd` do mesmo código também passou. Quatro capturas locais 375/1440 Dia/Noite e navegação home → arcos → Voltar: nenhuma duplicata de identidade, erro ou overflow; o seletor inicial do harness foi corrigido para ignorar a rota oculta mantida pelo Next Activity.

`production-static-identity-after.json`: 27/27 GETs e quatro recursos aprovados. Browsers: 14 HIT, 2 PRERENDER e 2 MISS, zero BYPASS e zero private/no-store. Os nove requests de crawlers continuam no BYPASS esperado, com OG resolvido no head. Agente principal confirmou independentemente dois GETs Safari em `/arcos?ref=joao/3/16`: HTTP200, HIT e identidade completa no head. `production-static-identity-comparison.json` preserva os três estados; amostras de tempo são descritivas, sem promessa de desempenho por milissegundo.

Nome final: **Bíblia Conectada**. PNG Apple180 publicado: SHA256 `131fa78993af7147a42d42c2fead1a8350a956fd07cb75f8566cebfdd7986355`, inclusive os fallbacks. Ícone512 e capas reais de João3:16/Salmos23:1 foram apresentados ao Alex. Os arquivos estão em `icon-share-check/`; não são capturas de um envio dentro do WhatsApp. Recomendar conferir um novo atalho pelo Safari antes de remover o antigo; nenhum dado local foi apagado e nenhuma instalação física foi alegada.

## Novo relato no Safari e mitigação de descoberta

Às 09:24 BRT Alex enviou outra captura do diálogo nativo com a letra B e confirmou que abriu pelo Safari. Portanto, o sintoma no aparelho persiste e os testes de servidor não demonstram resolução física.

Uma investigação independente sobre o release `f4ad6ef1` confirmou 13 GETs HTTP200, ícone Apple único no head, PNG180 opaco (todos os pixels com alfa255), imagens do manifesto válidas, ausência de redirecionamento/bloqueio e cache público preservado. O WebKit no Windows decodificou o PNG, mas não reproduz o fluxo nativo de instalação. Relatório e fontes Apple/WebKit: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/iphone-icon-investigation/findings.md`.

A mitigação em `codex/iphone-icon-refresh` aponta o link Apple estático para `/icons/apple-touch-icon-180-v2.png`, com os mesmos bytes e SHA256 do PNG aprovado. O gerador reproduz esse novo caminho; os três caminhos anteriores permanecem disponíveis. Não há alteração de manifesto/ID, cache de página, JavaScript, arte ou dados do usuário. A mudança busca uma nova descoberta pelo Safari; cache antigo continua hipótese, não causa comprovada.

Depois de publicar e conferir o novo caminho, usar `/?instalar=2` no Safari para abrir um documento novo e conferir o diálogo antes de afirmar que o ícone está resolvido. Não é necessário apagar dados nem remover o atalho existente para esse teste. Validação do novo código e confirmação no aparelho pendentes.
