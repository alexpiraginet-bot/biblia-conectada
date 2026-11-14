# Dia, contraste e modo leitura — 14/11/2026

Branch `codex/daylight-reading-focus`, base `f0dce71971e0597482f4ba7cb852fb91e2bf531c`. Especificação em `docs/READING-FOCUS.md`.

## Correções

- Dia como padrão, Sistema/Dia/Noite acessíveis e escolha manual preservada.
- Menu bordô/dourado com contraste conservador de 7,08:1 sobre branco; imagem/hover não esmaece os nomes da constelação, atlas ou eixo dos Arcos.
- Campos/setas/escolhas da liturgia usam bordas de controle; cores explícitas na superfície.
- Leitura focada em BLIVRE, Open NBV e liturgia, reutilizando o texto, com ajustes de papel/fonte e isolamento de interação nativo.
- Progresso automático considera o viewport de leitura e continua pausado quando outro diálogo cobre a leitura.
- A referência real `3Jo 5-8` revelou uma falha de resolução na liturgia: livros de capítulo único agora aceitam essa notação abreviada, validada contra o cânon. Livros com vários capítulos, referências ambíguas e limites inválidos continuam recusados. Teste de integração confere os quatro versículos contra o texto local exato.

## Evidências locais

Pasta externa: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/daylight-focus-20261114`.

- Playwright: 17 rotas × 375/1440 × Dia/Noite, 68 respostas HTTP200; 15.176 elementos examinados. Não houve overflow horizontal nessa matriz.
- Scanner distingue fundos sólidos e complexos. Imagens, pseudo-elementos e gradientes foram revisados separadamente; o scanner DOM sozinho não certifica cada pixel.
- Chromium 375/1440 e WebKit375: texto preservado, ações inline ocultas, fonte/cor, Escape/foco, navegação entre capítulos e desbloqueio da rolagem. Scripts/relatórios e screenshots preservados na pasta externa.
- Agent Browser 0.39.1 em sessão isolada: Dia inicial mesmo no dispositivo escuro, Sistema reagindo ao aparelho, Dia/Noite persistindo, busca e menu.
- O build de produção local passou por mais 32 verificações (rotas e estados, 375/1440, Dia/Noite), com 12.240 elementos examinados: sem falhas nos pares sólidos avaliáveis e sem overflow. Capturas `prod-*` não têm a interface de desenvolvimento.
- Quatro cenários adicionais de armazenamento bloqueado, navegação e sincronização real entre abas passaram. Oito cenários sem JavaScript também passaram.
- A revisão estável ampliou o leitor para 21 cenários em Chromium/WebKit, incluindo atalhos de busca isolados do diálogo e preferências ao revisitar capítulos. 62 testes focados de liturgia/edições/compartilhamento passaram após o ajuste de referência.
- `npm run build`: 1.276 testes passaram (2 previamente ignorados), TypeScript e compilação concluídos; `check-dist` confirmou textos, números, créditos e ausência das citações protegidas na distribuição. `npm run lint` passou.
- `npm run budget`: todas as rotas dentro do limite de JavaScript. O maior pacote nesta execução foi `/arcos`, 168.878 bytes gzip, para limite de 168.960.
- Revisor auxiliar local Gemma e revisores independentes de tema/contraste/leitura; as decisões foram conferidas em código e testes reais.

## Limites e entrega

- Sem teste em iPhone físico. WebKit no Windows não substitui Safari no aparelho.
- A consulta local da liturgia retornou indisponibilidade em 14/11; esse estado foi verificado. A API pública respondeu com leituras reais. A revisão visual dessas leituras será registrada após a publicação.
- O preview hospedado redirecionou para Login da Vercel; não foi contornada a proteção. Isso não foi tratado como prova de UI publicada.
- Auditoria cobre as rotas e estados registrados; não é certificação integral WCAG de todas as combinações.
- Revisão posterior identificou um ajuste na âncora de retorno da leitura longa. O build/QA desse ajuste e a publicação serão registrados no PR; os números acima correspondem à primeira compilação desta entrega (`69973cb`).
