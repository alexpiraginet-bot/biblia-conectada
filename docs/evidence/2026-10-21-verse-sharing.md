# Compartilhar o versículo sem sair da leitura

Implementação isolada em `codex/verse-social-sharing`, baseada em `32656a4`. Fonte: `0d72f19`; correção de Escape: `8f237a8`. Nenhuma publicação ou envio de mensagem foi realizado por esta tarefa.

## Comportamento

- `VerseActions` reúne os links independentes de estudo e compartilhamento, com a referência exata. É usado no leitor, página do versículo, listas de conexões, painéis do céu, grafo, mapa e cronologia.
- O menu abre na leitura atual, preserva a posição e devolve o foco ao fechar. O carregamento inicial tem aviso visível. Links com modificadores continuam sendo links comuns; sem JavaScript, compartilhar abre a capa PNG.
- WhatsApp recebe um link público do versículo, com título e referência. A capa continua vindo dos metadados OG da página; a aparência/cache da prévia depende do aplicativo destinatário.
- A pessoa escolhe Stories ou capa horizontal, prepara a imagem e vê a prévia. Só um segundo clique chama o compartilhamento nativo, com `files` apenas. Há download PNG em todos os casos, inclusive sem suporte a compartilhar arquivos.
- Nenhuma promessa de publicação automática no Instagram: quando disponível, o aplicativo pode ser escolhido no menu do aparelho; alternativamente, a pessoa adiciona o arquivo baixado ao seu Story.

## Imagens e dados

`GET /og?path=/joao/3/16&format=story&v=1` gera PNG 1080 × 1920. O formato padrão ou `landscape` mantém 1200 × 630. O landscape foi comparado byte a byte com o handler da base, sem mudança.

O Story usa somente a referência e o texto real da Bíblia Livre (BLIVRE), com crédito visível. O maior versículo da fonte atual, Ester 8:9 (476 caracteres), cabe inteiro. O limite interno é de 500 caracteres; cortes futuros são sinalizados com reticências. A capa horizontal preserva o limite anterior de 205 caracteres. Formatos desconhecidos/duplicados retornam 400; referências inválidas não viram texto arbitrário ou fetch externo.

Antes de oferecer um arquivo, o cliente valida status, Content-Type, assinatura PNG, dimensões e limite de 10 MiB. Downloads têm nome derivado da referência validada. A requisição é cancelada ao fechar o menu e URLs de blob são revogadas.

## Verificação

- 645 testes passaram, incluindo sete novos testes de compartilhamento e quatro de formatos PNG; os testes anteriores de estudo e referências continuam passando.
- ESLint dos componentes novos e `git diff --check` passaram.
- Build final: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/verse-sharing-final-build.log`.
- Orçamento final: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/verse-sharing-final-budget.log`. Home: **168814 bytes gzip**, 139 bytes abaixo da base e 146 bytes abaixo do teto de 168960; arcos: **168510 bytes**.
- O menu e o diálogo são carregados sob clique. No contexto novo de 375 px, foram observados somente dois chunks adicionais: 1308 + 3229 = **4537 bytes gzip**, sem incluir CSS nem a imagem solicitada depois. Com a home, o JS acumulado após abrir esse menu é 173351 bytes; o limite de 165 KiB aplica-se ao carregamento inicial.
- PNGs inspecionados por dois agentes: `story-short-verse.png`, `story-joao-3-16.png`, `story-long-reference.png` e `story-longest-verse.png`, em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/`. Nenhuma colisão entre texto, referência e crédito; conteúdo preservado entre y=252 e 1660.
- Playwright/Chromium: quatro combinações de 375/1440 px e Dia/Noite, mais oito verificações focadas, **zero falhas finais, zero pageerrors, zero POSTs**. Foram verificados URL e foco preservados, Escape com diálogo aberto ou import pendente, cancelamento por navegação, falha de chunk com fallback, retry após 503, clipboard indisponível, arquivo nativo apenas no segundo gesto, cancelamento/recusa e download PNG real quando `canShare` não existe.
- O teste inicial descobriu que um listener global de Escape podia fechar também o painel do versículo. `8f237a8` deixa o diálogo pronto usar seu cancelamento nativo e consome Escape somente enquanto o aviso de carregamento está presente. A revalidação confirmou que estudo e compartilhamento mantêm o versículo aberto.
- A medição de scroll do primeiro harness era anterior ao auto-scroll do clique Playwright. A aferição foi corrigida para comparar a posição efetivamente guardada pelo diálogo, sem alterar código de produto; os dados brutos foram preservados e os quatro testes focados confirmaram restauração exata.

Relatório final e 12 capturas: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/verse-social-sharing/share-final-summary.json`, `share-browser-qa.json` e `share-focused-qa.json`. As capturas incluem `share-prepared-375-noite.png`, `share-1440-dia.png` e o estudo nos quatro cenários. A matriz foi executada no servidor local de produção `http://127.0.0.1:3008`, fonte `8f237a8` (equivalente à integração `1ff85d9`).

A crítica com `gemma4:12b-it-qat` local apontou espera de geração, foco e diferença entre aparelhos. Esses pontos orientaram os estados de preparação, a revisão independente e o fallback; a resposta do modelo não foi usada como prova de funcionamento.

O compartilhamento por arquivos depende de suporte e permissões do navegador. O segundo gesto explícito preserva a ativação exigida por [`navigator.share`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), e a oferta do botão é determinada por [`navigator.canShare`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare). O teste com mocks não representa uma publicação real nem certifica o menu de um iPhone físico.

## Publicação

PR #25 integrado em `f4ad6ef1c9d5364bf52bd34323346c2d13d6fb2a`. Vercel `dpl_3dAQxQ1fqYsnXLEhuWTtUUNSNTHF` READY, com o alias público confirmado em 21/10 às 12:22 UTC. A fonte publicada é idêntica à validada localmente.

Seis GETs independentes no domínio público passaram: página do versículo, céu, manifesto, ícone Apple e PNGs horizontal/Stories. Nome e ícone no head, manifesto completo e hash do Apple PNG preservados. O Story público tem os mesmos 179150 bytes e SHA256 `604b68b67ae8d4a0c8d5d36eecbb5f4ca3f3a1357ceec927af79b2266f40b391` do aprovado localmente. Relatório: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/sharing-production-http.json`.

Smoke público em 375 px: geração da imagem, fechamento, URL, foco e scroll preservados, sem overflow, erro JS ou envio externo. Cache HIT/public e identidade única no head. Evidências em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/verse-social-sharing/production/`: `production-share-smoke.json`, `public-share-375-noite.png` e `public-joao-3-16-story.png`.

O primeiro harness expirou esperando o diálogo e não registrou a URL final; esse registro foi preservado em `production-share-smoke-first-attempt.json`. A rodada final aguardou sinais concretos de hidratação. Uma reprodução adicional em navegador novo com a sequência original abriu o diálogo sem falhas de assets, erros ou mudança de URL (`cold-click-diagnostic.json`). A falha inicial não foi reproduzida nem atribuída conclusivamente a uma causa. Alex solicitou auditorias de performance, UI e UX após esta rodada; o comportamento da primeira interação será reavaliado nessa auditoria.

Alex enviou nova captura de instalação no Safari real ainda com a letra B: a entrega dos arquivos foi confirmada, mas o ícone no aparelho permanece uma investigação separada. Não alegar que a instalação física está resolvida.
