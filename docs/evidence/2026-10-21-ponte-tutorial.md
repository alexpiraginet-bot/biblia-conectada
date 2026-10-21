# Ponte: treino visual de abertura

Pedido de Alex: explicar a Ponte ao entrar; depois pediu um Motion/tutorial porque texto sozinho continuava difícil.

## Comportamento

- Na primeira visita a `/ponte` ou `/ponte/[n]`, um diálogo apresenta um treino interativo de quatro cenas: missão, primeira ligação, próxima ligação e chegada.
- O percurso de treino João 3:16 → Romanos 5:8 → 1 João 4:9 usa duas ligações reais da OpenBible.info. As referências e os trechos vêm dos dados BLIVRE do leitor; o teste confere os trechos e cada aresta.
- Arcos se desenham, a contagem de saltos muda com a ação e o alvo de toque pulsa. Animações são finitas, podem ser pausadas e respeitam `prefers-reduced-motion`.
- Voltar, pular e fechar permanecem disponíveis. “Como jogar” reabre o treino. O aviso é interno ao site, sem permissão ou assinatura de notificações do sistema.
- O treino não inicia, apaga ou altera a partida. Apenas `bc:ponte-guide:v1` registra a dispensa; storage indisponível tem memória temporária na sessão. O diálogo nativo preserva foco, URL e posição, com cleanup de layout para páginas guardadas pelo Next Activity.

## Verificação local

Fonte inicial `b1c82e8`: 706 testes em 50 arquivos, build, TypeScript, lint, check-dist e orçamento aprovados. O teste novo verifica a integridade do exemplo, sem transformar texto de IA em fonte.

- 18 verificações de fluxo: abertura automática, avanço pelo toque, chegada, volta, foco, Escape, preferência persistida, histórico, storage bloqueado e preservação byte a byte da partida em curso. Jogo real iniciou em Jonas 1:7 e contou o salto para Josué 7:13. Zero erros JS.
- Auditoria independente de UI/UX: oito combinações de rota, viewport 375 × 812 / 1440 × 1000 e tema Dia/Noite. Nenhum overflow ou erro JS/HTTP na rodada.
- JS inicial declarado, gzip nível 9: `/ponte` 159.695 bytes; `/ponte/1` 159.015 bytes; limite 168.960 bytes. Medida exclui dados, imagens, HTML, inline, módulos adiados e prefetch.
- Revisão de arquitetura e consulta auxiliar local ao Gemma; decisões verificadas no código e no navegador.
- QA ajustou foco e scroll entre cenas. O delta final zera também a rolagem interna ao reabrir e retira o contorno de foco dos títulos não interativos; botões mantêm o foco visível.

Evidências locais (fora do Git): `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/ponte-guide/`, incluindo `build.log`, `flows/results.json`, `ui-audit/` e `performance/`.

## Publicação e limites

PR #29 em validação. Prévia inicial `dpl_HSLHouo4ESxjM3UyCHxxeShThEzC`; fonte final e domínio público serão conferidos antes de declarar publicado.

Navegador automatizado em Windows, sem teste de iPhone físico. Não foi atribuída nota Lighthouse ou taxa de quadros. Sem chamada de IA paga, envio a redes, mudança de tradução ou alteração do desafio diário.
