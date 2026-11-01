# A Palavra vira cuidado

Campanha autorizada por Alex em 01/11/2026. Página pública: `/apoie`. Gestão: `/admin` → **Campanha de apoio**.

## Regras públicas

- Meta inicial: **R$ 5.000**. Valores sugeridos: R$ 5, 10, 20, 30 e 50; qualquer valor positivo é aceito.
- Três finalidades: crescimento/manutenção da Bíblia Conectada, produção de mini Jesus da Bentô 3D Labs e cestas básicas. Não há percentuais prometidos; despesas reais são classificadas e publicadas.
- Qualquer contribuição dá direito a um mini Jesus. Organização: um presente por apoiador nesta campanha; novas contribuições continuam apoiando a ação.
- Retirada gratuita ou frete pago pelo apoiador, combinado separadamente antes de enviar. Prazo, local e envio são acertados com a organização. Contato: alexbmh@icloud.com.
- A trajetória de 12 anos de cestas básicas foi informada por Alex. Totais da campanha não incluem ações anteriores.
- Perfis: @teixeira.alex1, @bento3dlabs e @bentogelateria.
- Doações não dão pontos na Jornada e não alteram suas regras de resgate.

## Pix e confirmação

O código estático foi fornecido por Alex para publicação. Beneficiário: **ALEX PIRAGINE TEIXEIRA**; conta informada: PicPay. O QR é gerado no servidor do próprio app. O valor escolhido é inserido no campo 54 e o CRC é recalculado; chave, nome e referência do original permanecem iguais.

Gerar, copiar ou escanear o QR **não confirma pagamento**. Sem contrato/API comercial do PicPay, a equipe confere o extrato manualmente. A ação “Já contribuí” apenas abre o contato para organizar o presente. Não há webhook nem transferência bancária executada pelo app.

## Operação no painel

1. Conferir a entrada no extrato PicPay, a data, o valor e o vínculo com a campanha.
2. Em **Contribuição recebida**, informar o valor e o identificador completo e único da transação (não usar o código Pix estático). Marcar a conferência e salvar.
3. Informar despesas reais por finalidade; guardar os documentos fora do histórico público. O identificador do documento também evita duplicações.
4. Registrar separadamente mini Jesus produzidos e entregas realizadas. Não confundir produção com entrega.
5. Usar **Notícia da campanha** para relatos públicos. Não inserir nomes, contatos, endereços, comprovantes ou identificação de beneficiários. Observações de recebimentos ficam privadas.
6. Para corrigir, **anular** com motivo e relançar o valor correto com o mesmo identificador. O registro novo mantém o vínculo com o anterior; apenas um fica ativo. Anular não devolve dinheiro no banco.
7. Em **Acompanhar presentes**, cadastrar uma ficha por apoiador, vinculada ao recebimento conferido: nome/apelido, e-mail ou telefone com DDD, retirada ou envio, etapa e combinação logística curta. O contato ajuda a evitar duplicatas; não comprova identidade. A equipe confere a pessoa antes de cadastrar.
8. Etapas: **A combinar → Em produção → Pronto → Enviado (somente frete) → Entregue**. Retirada pode ir de Pronto a Entregue. Cancelado preserva a ficha e permite retomá-la. Marcar etapas somente conforme fatos reais; combinar prazo, local e custo por contato direto. Não guardar CPF, endereço completo ou comprovantes nesta ficha.
9. Recebimento anulado bloqueia o andamento do presente. Vincular apenas o relançamento corrigido da mesma transação ou cancelar a ficha; a correção nunca dá direito a um segundo presente. O mesmo contato e a mesma transação não podem ganhar outra ficha, inclusive se a primeira estiver cancelada.
10. Fichas individuais **não alteram** as quantidades públicas. Registrar lotes produzidos/entregues na prestação de contas uma única vez, conferindo a lista privada para não duplicar. As duas telas têm finalidades distintas: logística e prestação de contas.
11. Exportar os JSONs da prestação de contas e dos presentes periodicamente e guardar cópias privadas. A exportação de presentes contém contatos. Sem rascunhos ou contatos em armazenamento do navegador.

## Integridade e limites

- Redis persistente, sem TTL financeiro, separado por ambiente. A mesma autenticação do painel protege consulta, exportação e escrita.
- Escritas verificam origem, sessão, revisão de credencial e concorrência no commit atômico. UUID de envio e digest estável do identificador evitam duplicação; rotação de segredo de login não reinicia a deduplicação.
- Histórico somente acrescenta registros. Não há edição/apagamento silencioso de recebimentos.
- Até 1.000 registros normais ou 1 MB UTF-8; anulações têm capacidade reservada (até 2.000 entradas / 2 MB no histórico, até 800 bytes por anulação, com motivo curto). Esses limites mantêm exportação e comando Redis dentro dos transportes disponíveis. Antes de abrir outra etapa, exportar e implementar novo identificador de campanha; não esvaziar a anterior.
- Público: totais, quantidades e relatos públicos. Sem referência bancária, operador ou nota privada. Consulta com cache compartilhado de até 30 segundos. Uma falha não vira arrecadação zero.
- O “saldo registrado” deriva dos lançamentos do projeto; não representa o saldo total da conta PicPay.
- Presentes: até 1.000 fichas / 8.000 alterações / 3 MB por etapa. Fichas atuais guardam o contato; a trilha de alterações guarda campos alterados, etapa, operador e data, sem cópias do nome/contato/observação. Exportar antes de abrir nova etapa; não apagar a anterior.
- Atualizações de presentes exigem revisão atual e UUID de envio. O commit confere novamente sessão, credencial, ficha e ledger financeiro; conflitos não sobrescrevem alterações de outra aba. Todo endpoint individual é privado e `no-store`, sem projeção pública dos apoiadores.

## Validação

`site/tests/support.test.ts` cobre CRC oficial independente, valores exatos em centavos, leitura do QR com outro decodificador, duplicidade, correções vinculadas, limite com reserva para anular, dados privados, autenticação, origem, sessão revogada e indisponibilidade do banco de dados.

Não inserir pagamentos fictícios em produção. A validação técnica do QR não comprova recebimento bancário nem cadastro/titularidade da conta.

`site/tests/support-gifts.test.ts` cobre ficha individual, normalização de contato, duplicidade inclusive pela transação corrigida, recebimento anulado, repetição de envio, revisão concorrente, origem, autenticação, sessão revogada no commit e exportação privada. A inspeção visual usa dados simulados apenas em servidor local isolado.
