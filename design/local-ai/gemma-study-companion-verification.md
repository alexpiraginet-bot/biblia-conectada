# Companheiro de estudo — verificação da crítica local

Data: 2026-10-20. Modelo: `gemma4:12b-it-qat`, uma consulta local, sem modelos concorrentes. Resposta bruta: `gemma-study-companion-review.json`.

O modelo recebeu o componente React e um resumo das invariantes do servidor, não uma execução da aplicação. Sua resposta não constitui evidência de falha.

## Pontos conferidos manualmente

1. **ID reaproveitado com passagem diferente:** não confirmado. A comparação do retry exige modo, pergunta normalizada, livro, capítulo e versículo idênticos; uma alteração de modo/passagem também limpa o estado de retry.
2. **Cliques de retry gerando várias cobranças:** não confirmado. `pending.current` é definido sincronamente antes do primeiro `await`; retries preservam o objeto e UUID. A reserva atômica no servidor recusa IDs existentes antes do provider.
3. **Foco de cenas em frames fora de ordem:** não confirmado como defeito. Os callbacks focam a mesma referência de heading com `preventScroll`, sem scroll automático por cena. Não foi possível exercitar uma resposta de IA ao vivo porque a função permanece desativada.
4. **Voz ainda não carregada:** não confirmado como bug. A voz explícita é opcional e `utterance.lang="pt-BR"` é enviado mesmo quando a lista está vazia. O navegador expôs o controle, mas o teste não confirmou áudio audível; essa limitação permanece.

## Ajuste derivado do contrato real

O backend não armazena respostas. Um UUID já recebido gera `in_progress`, inclusive após término ou perda de conexão. A interface agora diferencia a verificação idempotente de uma ação explícita **Nova consulta**, informando que esta usa novamente o limite. Não há repetição automática.

## Revisão independente do servidor

Confirmado e corrigido pelo agente responsável: `String(mode)` aceitava `["narrar"]` no parser. A validação agora exige string; reteste independente com `tsx` retornou HTTP 400 / `invalid` antes do provider.

Leitura de `service.ts`, `input.ts`, `provider.ts`, `response.ts` e `ledger.ts` não confirmou outro defeito: reserva atômica anterior à chamada, tentativa única, retenção conservadora em falha, ajuste idempotente, região global explícita e citações/rotas/imagens construídas de dados locais. Isso não prova correção teológica de prosa gerada nem faturamento real do provedor.
