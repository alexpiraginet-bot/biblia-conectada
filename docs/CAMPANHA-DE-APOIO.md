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
7. Exportar o JSON periodicamente e guardar uma cópia privada. A organização mantém por e-mail o acompanhamento individual dos presentes; o painel exibe produção e entregas agregadas.

## Integridade e limites

- Redis persistente, sem TTL financeiro, separado por ambiente. A mesma autenticação do painel protege consulta, exportação e escrita.
- Escritas verificam origem, sessão, revisão de credencial e concorrência no commit atômico. UUID de envio e digest estável do identificador evitam duplicação; rotação de segredo de login não reinicia a deduplicação.
- Histórico somente acrescenta registros. Não há edição/apagamento silencioso de recebimentos.
- Até 1.000 registros normais ou 1 MB UTF-8; anulações têm capacidade reservada (até 2.000 entradas / 2 MB no histórico, até 800 bytes por anulação, com motivo curto). Esses limites mantêm exportação e comando Redis dentro dos transportes disponíveis. Antes de abrir outra etapa, exportar e implementar novo identificador de campanha; não esvaziar a anterior.
- Público: totais, quantidades e relatos públicos. Sem referência bancária, operador ou nota privada. Consulta com cache compartilhado de até 30 segundos. Uma falha não vira arrecadação zero.
- O “saldo registrado” deriva dos lançamentos do projeto; não representa o saldo total da conta PicPay.

## Validação

`site/tests/support.test.ts` cobre CRC oficial independente, valores exatos em centavos, leitura do QR com outro decodificador, duplicidade, correções vinculadas, limite com reserva para anular, dados privados, autenticação, origem, sessão revogada e indisponibilidade do banco de dados.

Não inserir pagamentos fictícios em produção. A validação técnica do QR não comprova recebimento bancário nem cadastro/titularidade da conta.
