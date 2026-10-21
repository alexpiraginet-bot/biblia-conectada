# Ponte: treino visual de abertura

Pedido de Alex: explicar a Ponte ao entrar; depois pediu um Motion/tutorial porque texto sozinho continuava difícil.

## Comportamento

- Na primeira visita a `/ponte` ou `/ponte/[n]`, um diálogo apresenta um treino interativo de quatro cenas: missão, primeira ligação, próxima ligação e chegada.
- O percurso de treino João 3:16 → Romanos 5:8 → 1 João 4:9 usa duas ligações reais da OpenBible.info. As referências e os trechos vêm dos dados BLIVRE do leitor; o teste confere os trechos e cada aresta.
- Arcos se desenham, a contagem de saltos muda com a ação e o alvo de toque pulsa. Animações são finitas, podem ser pausadas e respeitam `prefers-reduced-motion`.
- Voltar, pular e fechar permanecem disponíveis. “Como jogar” reabre o treino. O aviso é interno ao site, sem permissão ou assinatura de notificações do sistema.
- O treino não inicia, apaga ou altera a partida. Apenas `bc:ponte-guide:v1` registra a dispensa; storage indisponível tem memória temporária na sessão. O diálogo nativo preserva foco, URL e posição, com cleanup de layout para páginas guardadas pelo Next Activity.

## Verificação local

Fonte final `0b376ab033eb83d9f0468bb0a4aa23485d86782d`: 706 testes em 50 arquivos, build, TypeScript, lint, check-dist e orçamento aprovados. O teste novo verifica a integridade do exemplo, sem transformar texto de IA em fonte.

- 18 verificações de fluxo: abertura automática, avanço pelo toque, chegada, volta, foco, Escape, preferência persistida, histórico, storage bloqueado e preservação byte a byte da partida em curso. Jogo real iniciou em Jonas 1:7 e contou o salto para Josué 7:13. Zero erros JS.
- Auditoria independente de UI/UX: 234 verificações nas oito combinações de rota, viewport 375 × 812 / 1440 × 1000 e tema Dia/Noite, mais um caso de jogo/movimento reduzido. Nenhum overflow ou erro JS/HTTP na rodada. Mais 12 verificações do delta final em 375 × 640 Dia/Noite: reabertura zera o scroll interno; botões mantêm foco visível e ações ficam fixas quando o corpo precisa rolar.
- JS inicial declarado, gzip nível 9: `/ponte` 159.701 bytes; `/ponte/1` 159.021 bytes; limite 168.960 bytes. Medida exclui dados, imagens, HTML, inline, módulos adiados e prefetch.
- Contraste mínimo de texto: Dia 5,468:1; Noite 7,985:1. Alvos de toque de pelo menos 44 px. Movimento reduzido elimina animações nas quatro cenas; pausa durante execução conferida. Nenhuma chamada de IA/vídeo no tutorial. Uma conexão recusada durante o reinício planejado do servidor foi registrada à parte, sem tratá-la como erro do produto.
- Revisão de arquitetura e consulta auxiliar local ao Gemma; decisões verificadas no código e no navegador.
- QA ajustou foco e scroll entre cenas. O delta final zera também a rolagem interna ao reabrir e retira o contorno de foco dos títulos não interativos; botões mantêm o foco visível.

Evidências locais (fora do Git): `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/ponte-guide/`, incluindo `build.log`, `flows/results.json`, `ui-audit/` e `performance/`.

## Publicação e limites

PR #29 integrado por squash em `69cd8fbc2404ff41c529a93e68bf99e9f285e2ac`. A árvore `site/` desse commit é idêntica à prévia aprovada `0b376ab`.

Prévia final `dpl_CBAG5KeyfA35ksAEgkAqhbboZ5Wv` READY. `/ponte` e `/ponte/1` retornaram 200 com tutorial; `/api/assistente` retornou 200 e disponibilidade verdadeira, sem chamada paga. A tentativa de promover a prévia diretamente foi rejeitada pela API da Vercel com 422; nenhuma causa adicional foi presumida.

Publicação normal `dpl_HMW9FSqiqw3Z2YsRaw19E7ZH6U1L` **READY**, commit `69cd8fb`, alias principal `https://alexpiraginet-bot-biblia-conectada.vercel.app` confirmado. Quatro contextos públicos (375/1440, Dia/Noite), oito capturas de hoje/arquivo e os 18 testes de fluxo passaram. Treino completo, histórico, storage bloqueado, partida real e ajuda reaberta preservam o funcionamento; sem erros JS ou overflow. Disponibilidade da IA continua verdadeira por GET; não houve pergunta paga. Capturas estáticas mostram o estado final das animações (a primeira rodada capturou o início do fade; não foi falha de renderização). A gravação `ponte-tutorial.webm` conserva o movimento real.

Navegador automatizado em Windows, sem teste de iPhone físico. Não foi atribuída nota Lighthouse ou taxa de quadros. Sem chamada de IA paga, envio a redes, mudança de tradução ou alteração do desafio diário.
