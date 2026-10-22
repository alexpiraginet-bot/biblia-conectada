# Domínio, resposta do Coração e diagnóstico de voz — 22/10/2026

## Mudanças e testes

- `www.bibliaconectada.company` já estava vinculado ao projeto de produção correto; o apex já tinha redirecionamento 308 para `www`. DNS público propagou durante a verificação. Faltava o certificado; foi emitido na Vercel para os dois nomes, com renovação automática. HTTPS 200 em `www` e 308 no apex, preservando caminho/query, conferidos com validação TLS. Certificado válido até 20/01/2027.
- `SITE_URL` passa ao domínio novo: canonical, OG, links de WhatsApp e instalação derivam desse único valor. Manifest, ícones e APIs usam caminhos relativos. O host antigo permanece acessível: dados locais do navegador não migram entre origens.
- Reproduzido em produção: `Alguém me xingou no WhatsApp`, modo `jesus`, Open NBV, retornava HTTP 502. A mensagem atribuía o problema às fontes, inclusive quando a saída do modelo podia estar truncada.
- Texto permanece na Anthropic, `claude-sonnet-5-5`. A consulta usa `between_tools`/`low`, sem ferramentas, com os mesmos 1.600 tokens, a mesma fórmula conservadora de reserva e os mesmos tetos de custo. A documentação oficial registra a possibilidade de `adaptive` + JSON estruturado + esforço baixo consumir o limite em raciocínio. O motivo exato do exemplar antigo não tinha log; não foi comprovado retrospectivamente.
- Validação de IDs, referências, texto e fontes permanece estrita. Falhas passam a registrar apenas enums e contagens; nunca pergunta, resposta, segredo, ticket ou mensagem bruta do provedor. Erros técnicos não culpam a pergunta.
- Falha HTTP recebida oferece **Tentar nova resposta**, com aviso e UUID novo apenas no clique/envio explícito. Falha de rede, timeout e cancelamento conservam UUID; não há tentativa automática.
- Build local completo passou: **796 testes em 57 arquivos**, TypeScript, lint, check-dist e orçamento de JS. Chromium real, build de produção local: 8 casos de retry em 375/1440, Dia/Noite, HTTP/rede; nesses casos somente as respostas da API são simuladas para forçar os erros, com zero chamadas pagas. Capturas inspecionadas, sem overflow nem sobreposição do formulário com a navegação.
- Revisões independentes cobriram API/custo, performance, UI e UX; consulta breve ao Ollama `gemma4:12b-it-qat` com GPU livre. Resposta local usada como lista auxiliar, nunca como prova; modelo descarregado ao terminar.

## Prova real e limite da voz

Prévia `dpl_GWGN1aVUMuQ5bWWaagVMC4MNQtis`, commit `de8862c`, READY:

- A mesma pergunta retornou **HTTP 200**, aproximadamente 8,5 s, sete citações conferidas byte a byte contra a Open NBV do repositório, reflexão e sugestão de resposta.
- A voz, em chamada separada, retornou HTTP 502. O diagnóstico seguro capturou `upstreamType: insufficient_quota`, categoria `billing_quota`, antes de qualquer áudio. Isso aponta crédito/cota da API, não comprova falha da chave nova. Não foi gerado WAV.
- OpenAI continua somente como narradora, com `gpt-realtime-2.1-mini`/Cedar e chave server-side. Texto é Anthropic. Tickets assinados e teto global US$20/mês, com subteto de voz US$5, preservados.
- Alex foi orientado a conferir créditos/limites da conta de API. Nenhum crédito foi comprado, limite aumentado ou chave substituída. Autoplay/silencioso em iPhone e qualidade da voz seguem sem validação real.

Evidência local fora do repositório: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/heart-geometry/`. Reproduções em `voz-chave-atualizada/2026-10-22T11-17-03-537Z-69491ce2/report.json` e `voz-chave-atualizada/2026-10-22T11-28-53-086Z-605a22a0/report.json`; QA de retry em `retry-browser/report.json`. URLs temporárias de acesso e tickets não são persistidos nesses relatórios.

Fontes técnicas: [Sonnet 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5), [Realtime WebSocket](https://developers.openai.com/api/docs/guides/voice-websockets), [cotas e créditos OpenAI](https://help.openai.com/en/articles/6614457-troubleshooting-api-usage-and-spend-limits).

## Publicação confirmada

PR #35 integrado em `1c9201d9130c31cdf26a564db4670c14383f68ce`. Produção `dpl_nZCBs7SDKhGNmSB3eYiF9qGJS6Bk` READY, aliases `www.bibliaconectada.company`, apex e host Vercel confirmados em 22/10, 11h46 UTC.

- Navegador Chromium real no domínio novo, 393 × 852: a mesma pergunta, modo À luz de Jesus, respondeu HTTP 200 em **8.055 ms**, com sete citações idênticas à Open NBV e sugestão de resposta para copiar. Uma única chamada textual, nenhum retry. Voz desligada pela interface apenas para esse teste; o diagnóstico de cota já havia sido registrado em chamada separada, sem nova tentativa de áudio.
- Capturas de espera, início da resposta e sugestão conferidas. Relatórios sem ticket em `domain-fix-live-production/`: `response-safe.json`, `report.json`, `waiting.png`, `answer.png`, `suggested-reply.png`.
- Seis casos públicos, 375 × 667, 393 × 852 e 1440 × 900, Dia/Noite, passaram sem overflow, sobreposição do formulário, erro JavaScript ou POST pago. Disponibilidade real e painel de privacidade conferidos. Evidências em `domain-fix-production/report.json` e respectivos PNGs.
- Dez verificações HTTP com validação TLS: canonical/OG na home, Coração e leitura; instalação; manifesto com nome Bíblia Conectada; PNG do ícone 180 × 180; capa Open NBV João 3:16 em 1200 × 630; apex 308 preservando caminho/query; host antigo acessível. `domain-fix-http/report.json` registra URLs e hashes públicos. O PNG do ícone mantém SHA256 `131fa78993af7147a42d42c2fead1a8350a956fd07cb75f8566cebfdd7986355`; isso não comprova instalação no iPhone físico.
- Revisão independente final: Coração 161.521 bytes, home 166.416 bytes, Arcos 168.443 bytes de JS inicial gzip; todas as 34 famílias abaixo do teto de 168.960 bytes. Nenhum padrão de chave nem diagnóstico de servidor nos 59 bundles JS de cliente inspecionados. LCP, GPU e áudio no iPhone continuam sem nova medição.
- Servidor local de QA da porta 3014 encerrado. Nenhuma publicação em redes, compra adicional, mudança de segredo ou aumento de limites.
