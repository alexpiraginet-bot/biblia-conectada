# Dia, contraste e modo leitura — 14/11/2026

Branch `codex/daylight-reading-focus`, base `f0dce71971e0597482f4ba7cb852fb91e2bf531c`. Especificação em `docs/READING-FOCUS.md`.

## Correções

- Dia como padrão, Sistema/Dia/Noite acessíveis e escolha manual preservada.
- Menu bordô/dourado com contraste conservador de 7,08:1 sobre branco; imagem/hover não esmaece os nomes da constelação, atlas ou eixo dos Arcos.
- Campos/setas/escolhas da liturgia usam bordas de controle; cores explícitas na superfície.
- Leitura focada em BLIVRE, Open NBV e liturgia, reutilizando o texto, com ajustes de papel/fonte e isolamento de interação nativo.
- Progresso automático considera o viewport de leitura e continua pausado quando outro diálogo cobre a leitura.

## Evidências locais

Pasta externa: `C:/Users/R2/.codex/visualizations/2026/10/20/01a15a31-4795-7dc2-b8a3-9529afb4fe17/daylight-focus-20261114`.

- Playwright: 17 rotas × 375/1440 × Dia/Noite, 68 respostas HTTP200; 15.176 elementos examinados. Não houve overflow horizontal nessa matriz.
- Scanner distingue fundos sólidos e complexos. Imagens, pseudo-elementos e gradientes foram revisados separadamente; o scanner DOM sozinho não certifica cada pixel.
- Chromium 375/1440 e WebKit375: texto preservado, ações inline ocultas, fonte/cor, Escape/foco, navegação entre capítulos e desbloqueio da rolagem. Scripts/relatórios e screenshots preservados na pasta externa.
- Agent Browser 0.39.1 em sessão isolada: Dia inicial mesmo no dispositivo escuro, Sistema reagindo ao aparelho, Dia/Noite persistindo, busca e menu.
- Revisor auxiliar local Gemma e revisores independentes de tema/contraste/leitura; as decisões foram conferidas em código e testes reais.

## Limites e entrega

- Sem teste em iPhone físico. WebKit no Windows não substitui Safari no aparelho.
- A consulta local da liturgia retornou indisponibilidade em 14/11; esse estado foi verificado. Leituras remotas precisam de conferência adicional no domínio.
- Auditoria cobre as rotas e estados registrados; não é certificação integral WCAG de todas as combinações.
- Build completo, orçamento e publicação: resultados finais serão registrados aqui ou no PR após a verificação; não presumir concluídos a partir desta nota inicial.
