# No seu coração e voz — evidência local

Registro de 21/10/2026 no branch `codex/heart-conversation-voice`. As seções locais foram concluídas antes das chamadas pagas. O adendo abaixo registra separadamente os testes reais na prévia e a falha de voz observada; não confundir o êxito dos mocks com áudio real.

Este documento registra a etapa posterior ao [rascunho de voz](2026-10-21-assistant-voice-draft.md): há frontend e adapter OpenAI implementados, mas os resultados com áudio simulado não comprovam voz real, pronúncia ou reprodução em iPhone físico.

## Base e distinção dos testes

- As medições de performance e a matriz de navegação usaram o build local de produção em `http://127.0.0.1:3012`, `BUILD_ID=x_DKVaNlKA5apOrMFO0MU`, base `536d4a3`, Node 24 no Windows. Não são medições de Vercel/Node 22, rede móvel ou CPU de telefone.
- O log desse build confirmou 766 testes, compilação Next, TypeScript e `check-dist` concluídos. O comando `npm run budget` foi executado separadamente e passou.
- Após a auditoria, foi corrigido um defeito de continuidade da busca. A suíte focada passou com 19 testes. O log do rebuild final já registrou 768 testes e compilação/TypeScript concluídos; `check-dist` final, orçamento do novo build e implantação serão registrados pela integração principal quando terminarem.
- A busca e a comparação de fontes usam o corpus licenciado real. Serviços de cobrança, modelos e áudio foram simulados quando necessários para testar os fluxos. Navegações, DOM, foco, rolagem, downloads de recursos e respostas HTTP locais foram reais.

## Backend e recuperação de passagens

O teste real da busca cobre a lembrança sobre limites do conhecimento humano e coisas que Deus não revela, nas duas edições, com texto exato e contexto. Também cobre `3 João 1:15` na grade Open NBV, sequência “alguma outra?” → “quem disse?”, recuperação restrita aos evangelhos em ofensa/perigo, ausência de candidato sem chamada paga e rejeição de referências/propriedades inválidas.

Foi reproduzido um ciclo: pergunta inicial → “Alguma outra?” → “Alguma outra?” voltava ao primeiro grupo, apesar de as duas respostas anteriores ainda estarem no histórico recebido. A exclusão usava apenas a última resposta. A correção em `site/src/lib/coracao/retrieval.ts` considera ambas as respostas **somente no ramo de outra passagem**; atribuição/“quem disse?” continua ligada à última. Duas regressões, uma por edição, falharam antes e passaram depois; os textos das novas citações também são comparados ao corpus real.

Verificação após a correção:

```text
node node_modules/vitest/vitest.mjs run tests/coracao.test.ts
19 testes passaram

ESLint de retrieval.ts e coracao.test.ts: passou
git diff --check: passou
```

O histórico continua limitado a duas trocas. A busca é lexical com expansão editorial de temas, não uma busca semântica irrestrita. Texto e referência válidos não comprovam a interpretação; a resposta continua identificada como IA. “À luz de Jesus” é uma possibilidade de reflexão, nunca Jesus falando nem revelação divina.

## Tracing e peso do servidor

A auditoria de `.next/server/app/api/coracao/route.js.nft.json` encontrou 259 arquivos, todos existentes, somando **18.142.945 bytes (~17,3 MiB)**. Os módulos de dados compilados listados no tracing foram carregados e comparados integralmente aos JSONs de origem:

| Edição | Livros | Posições | Conteúdo compilado |
| --- | ---: | ---: | --- |
| BLIVRE | 66 | 31.102 | Idêntico à fonte |
| Open NBV | 66 | 31.105 | Idêntico à fonte |

Os chunks de livros somam 11.546.287 bytes BLIVRE e 4.521.751 Open NBV. O corpus não depende de um caminho externo ausente do pacote. A varredura dos chunks de navegador não encontrou endpoints dos provedores, domínio de assinatura do ticket, prompt do Coração ou parser de cobrança do servidor.

O `GET /api/coracao` real local respondeu `200`, `Cache-Control: no-store, max-age=0`, `nosniff`, `available:false` e `voice.available:false`. Isso não estabelece a configuração da prévia Vercel.

## Performance medida

### JavaScript inicial e recursos posteriores

| Rota | JS inicial gzip | KiB |
| --- | ---: | ---: |
| Coração | 161.299 bytes | 157,5 |
| Home | 166.413 bytes | 162,5 |
| Arcos | 168.440 bytes | 164,5 |
| Assistente | 162.446 bytes | 158,6 |

O teto é 168.960 bytes (165 KiB); **Arcos tem apenas 520 bytes livres** nessa base. O orçamento mede scripts declarados no HTML, não todos os recursos carregados depois. Com chunks e prefetch de links visíveis após 1,2 segundo, Coração solicitou **192.469 bytes gzip no viewport 375 e 213.936 no 1440**. A diferença varia com carregamento progressivo e links visíveis; não deve ser atribuída inteiramente à voz nem omitida ao comunicar o peso total observado.

Oito navegações em contextos novos do Chromium Windows headless, viewports 375 e 1440, home/arcos/coração/João 3:16, sem limitação artificial de rede/CPU e com movimento reduzido: HTTP 200, zero erro JS, zero POST e nenhum overflow horizontal. No Coração, LCP local de 144 ms nos dois viewports; CLS de 0,01476/0,00278; nenhuma longtask no mobile e maior de 65 ms no desktop. Home mobile teve uma longtask de 316 ms e LCP de 524 ms. São amostras locais únicas, **não uma nota Lighthouse nem desempenho comprovado em iPhone**.

### Busca no runtime compilado

A função POST compilada foi executada em processo Node isolado, com configuração fictícia só nesse processo e `fetch` totalmente substituído por um Redis que responde limite de orçamento. A busca termina e retorna 429 antes do provedor. Nenhuma conexão externa; coleta de memória após GC.

| Índice | Primeira carga | Mediana quente | p95 quente | Heap retido adicional |
| --- | ---: | ---: | ---: | ---: |
| Open NBV integral | 304 ms | 0,64 ms | 2,13 ms | 44,9 MiB |
| Evangelhos NBV, corpus já carregado | 22 ms | 0,29 ms | 1,15 ms | 2,8 MiB |
| BLIVRE integral | 355 ms | 0,57 ms | 1,23 ms | 111 MiB |
| Evangelhos BLIVRE, corpus já carregado | 21 ms | 0,28 ms | 0,88 ms | 2,6 MiB |

Quatro índices carregados: cerca de 175 MiB de heap e 346 MiB de RSS. A BLIVRE importa o JSON legado com relações além do texto. A busca ocorre antes do rate limit/reserva paga; consultas sem candidato não chegam ao ledger. Não foi confirmado bloqueio de capacidade, mas esses custos devem ser acompanhados no ambiente publicado. Não são cold starts Vercel. O benchmark anterior em Vitest inclui transformação de módulos e foi preservado apenas como evidência auxiliar, sem substituir estes números compilados.

## UI/UX: o que foi validado

O relatório `browser-qa.json` contém quatro casos (375/1440, Dia/Noite) no build local. A citação usada veio do texto real licenciado, porém **a explicação da IA e o WAV silencioso foram simulados**. Passaram: abertura sem POST pago, estado de espera, exibição/expansão da citação exata, fluxo de áudio automático simulado, desligar voz, continuação com histórico, retry com o mesmo UUID e nova conversa. Sem erro JS ou overflow; também foi testado viewport 375 × 450, sem afirmar equivalência a teclado real do iPhone.

O relatório independente `nav-ux-production-build/report.json` contém oito casos reais de `/arcos?ref=joao%2F3%2F16` e `/ler/open-nbv/joao/3`, 375/1440, Dia/Noite. Confirmou: URL/seleção preservadas ao compartilhar, fundo não focável com diálogo aberto, foco e rolagem devolvidos, ausência de erro JS/overflow e alvos de navegação de aproximadamente 66,6 × 54 px. O botão Compartilhar medido tem 88 × 44 px. No desktop, a navegação inferior mobile fica oculta.

`more-destinations.json` confirma abertura real da busca pelo menu Mais sem perder a URL, devolução do foco, navegação para Ponte, indicador de destino e fechamento do menu após navegar. Esses cenários não emitiram POST. As capturas finais estão em `nav-ux-production-build/`; capturas de erro do diretório anterior `nav-ux/` não representam o resultado final.

## Voz: garantia técnica e limites

A revisão do servidor não confirmou furo de orçamento, replay ou cancelamento. O ticket assinado vincula prosa já validada, visitante, perfil, UUID e validade de 900 segundos. A reserva Redis é anterior ao socket e debita atomicamente **o total existente de US$20/mês e seu subteto de voz de US$5/mês**, não um orçamento de US$25. Falhas/cancelamentos conservam a reserva; não há reconexão ou cobrança automática de retry.

O adapter OpenAI limita uma resposta a 4.096 tokens, 45 segundos de operação, 80 segundos de PCM e 512 KiB por mensagem WS. O cancelamento tenta `response.cancel` e encerra o socket. Só entrega áudio após término completo e transcrição normalizada igual ao texto assinado; a cópia do retorno respeita `byteOffset`/`byteLength`. As regressões desse limite binário foram verificadas com Buffer/Uint8Array recortados e providers simulados.

A tarifa consultada para `gpt-realtime-2.1-mini` é US$0,60/M de entrada textual, US$2,40/M de saída textual e US$20/M de saída de áudio. A reserva usa todos os 4.096 tokens ao maior preço mais entrada majorada: em geral **~US$0,084 por áudio**, abaixo de US$0,090 para o limite de 1.200 caracteres. Sem liquidação/refundo de voz, US$5 comportam aproximadamente **59 reservas usuais**, inclusive tentativas que falhem. É uma alocação conservadora do app, não a fatura do provedor.

Fontes primárias: [preços OpenAI](https://developers.openai.com/api/docs/pricing), [modelo](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini), [eventos Realtime](https://developers.openai.com/api/reference/resources/realtime/client-events). Modelo, formato aceito e disponibilidade na conta ainda precisam do teste real desta integração.

Não houve escuta humana, comprovação de sotaque PT-BR, teste do modo silencioso, volume, Bluetooth, reprodução em segundo plano ou autoplay em iPhone físico nesta matriz. Transcrição coincidente e WAV simulado não comprovam esses aspectos. A resposta em texto deve continuar disponível se a voz falhar.

## Arquivos de evidência

Diretório externo: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/coracao-voice/`.

- `build.log`, `build-final.log`: logs separados das duas etapas; não confundir compilação concluída com toda a implantação concluída.
- `performance/audit.md`, `browser-performance.json`, `trace.json`, `compiled-retrieval-performance.json`: medições e comparação do corpus.
- `performance/retrieval-performance.json`: benchmark auxiliar Vitest e reprodução anterior do ciclo; método explicitado no arquivo.
- `browser-qa.json`: estados da conversa com respostas/áudio simulados.
- `nav-ux-production-build/report.json`, `more-destinations.json` e PNGs: navegação/foco/seleção reais, sem consulta paga.

## Adendo: build final e provedores reais

O rebuild com a correção da continuidade passou: **768 testes**, Next/TypeScript e `check-dist`, incluindo 3.799 páginas, 31.105 posições da Open NBV e ausência das citações protegidas. `npm run budget` final passou. A mudança posterior de diagnóstico da voz ainda requer o próximo build.

Prévia `dpl_ALcCFTacZ7vf7Hkk4kNitt1dzr6X`, commit `98f2481`, ficou **READY**. A chave nova `OPENAI_API_KEY` foi configurada pelo usuário; seu valor não foi recuperado nem registrado. Voz habilitada apenas em Preview para validação. Dois testes reais por UI foram executados:

- Encontrar uma passagem: HTTP 200 em 8.110 ms. Localizou Deuteronômio 29:29, Romanos 11:33–34, Eclesiastes 3:11 e Isaías 55:8–9. As seis citações foram comparadas integralmente à fonte Open NBV. A solicitação automática de áudio aconteceu, mas retornou HTTP 502 em aproximadamente 665 ms; nenhum WAV foi entregue. O teste interrompeu novas chamadas de voz. A causa não estava identificada nesse primeiro retorno genérico.
- À luz de Jesus: HTTP 200 em 8.657 ms, com voz explicitamente desligada para isolar o texto. Nove citações reais dos evangelhos foram comparadas ao corpus, incluindo Mateus 5:44–45, Lucas 6:27–28, João 18:22–23 e Mateus 18:15–17. Entregou uma sugestão de resposta firme e respeitosa, separada do texto bíblico. Zero pedidos de áudio nessa segunda execução.

Relatórios externos `live-preview-qa.json` e `live-text-jesus.json` não contêm ticket, chave ou cookie. A primeira execução **falhou na etapa de voz**, embora o texto tenha passado. O adapter ganhou diagnóstico de erro com enums e contagens permitidas, sem texto, chave, ticket, mensagem/stack externo ou eventos completos. Publicação, voz real, escuta e teste no iPhone continuam pendentes até o próximo adendo.
