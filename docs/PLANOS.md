# Planos de leitura

Um plano divide um conjunto de livros em porções diárias. Fica em `/planos` (a lista) e `/planos/<plano>` (as porções e o acompanhamento). Não tem conta nem servidor: o plano acompanha o [progresso pessoal de leitura](READING-PROGRESS.md), que já fica no navegador.

## Os planos

Definidos em `PLANS` (`site/src/lib/planos/model.ts`). Cada plano diz só quais livros, em que ordem e em quantos dias; todo o resto é contado.

| Plano | Endereço | Livros | Dias |
| --- | --- | --- | --- |
| A Bíblia em um ano | `/planos/biblia-em-um-ano` | os 66, na ordem do cânon | 365 |
| O Novo Testamento em 90 dias | `/planos/novo-testamento-em-90-dias` | Mateus a Apocalipse | 90 |
| Os Evangelhos em 30 dias | `/planos/evangelhos-em-30-dias` | Mateus, Marcos, Lucas, João | 30 |
| Os Salmos em 30 dias | `/planos/salmos-em-30-dias` | Salmos | 30 |
| Provérbios em um mês | `/planos/proverbios-em-um-mes` | Provérbios | 31 |

Capítulos, versículos, mínimo, mediana e máximo de versículos por dia aparecem nas páginas e não estão escritos aqui de propósito: saem de `planFigures` a cada build (regra 3 do `CLAUDE.md`), e o `check-dist` confere a página contra a conta.

## Como as porções são cortadas

`splitIntoPortions(capítulos, dias)`:

1. Os capítulos do plano ficam em fila, na ordem, cada um com o número de versículos da grade do cânon (a da Bíblia Livre, a mesma de todas as contagens do site).
2. A porção do dia *d* termina no capítulo em que o total acumulado de versículos fica mais perto de *d/dias* do total.
3. Toda porção tem pelo menos um capítulo, e nunca sobram menos capítulos do que dias.
4. Capítulo nenhum é partido. Por isso os dias não têm o mesmo tamanho: o Salmo 119 sozinho passa da média de qualquer plano.

A conta é determinística: o mesmo cânon dá as mesmas porções. `site/tests/planos.test.ts` confere que toda porção é consecutiva, que os capítulos de cada plano aparecem todos, uma vez só e na ordem, e que os totais batem com a grade.

A divisão é a mesma para as duas edições. O que muda por edição é quando um capítulo conta como lido (cada edição tem a própria contagem de versículos por capítulo).

## Progresso: o plano não guarda o que foi lido

- Um capítulo está lido no plano quando o progresso de leitura diz que **todos os versículos** dele estão marcados na edição escolhida (`chapterReadingSummary(...).complete`). Faltar um versículo é não ter lido.
- Um dia está lido quando todos os capítulos da porção estão lidos. A "próxima porção" é a primeira com algo por ler; ler fora de ordem conta.
- Consequência: marcar um capítulo em qualquer página de leitura avança todos os planos que têm esse capítulo, e desmarcar volta atrás. Provérbios lido pelo plano de um mês já aparece lido em "A Bíblia em um ano".
- **Marcar a porção como lida** marca um capítulo por vez pelo mesmo caminho do botão "Marcar capítulo lido" (`markChapterRead`), e só diz "Dia N lido" depois de o navegador confirmar todos. Se uma gravação falhar, a página diz quantos capítulos entraram e qual foi o problema.
- O plano não dá pontos na [Jornada](JORNADA.md).

## Seguir um plano

- **Seguir este plano** guarda neste aparelho que a pessoa está no plano, o dia em que começou e a edição: `localStorage`, chave `bc:planos:v1`, `{"v":1,"planos":{"<id>":{"inicio":"AAAA-MM-DD","edicao":"blivre"}}}`. Sem plano seguido, a chave é removida.
- Só se confirma o que foi gravado: a página diz "seguindo" depois de reler a chave. Armazenamento bloqueado ou cheio vira "O navegador não guardou o plano", e a lista de porções continua utilizável.
- **O dia de início é o dia de Brasília** (`America/Sao_Paulo`), como na liturgia, na Jornada e no Caderno.
- **O calendário é informação, não cobrança.** A página diz em que dia do plano o calendário está e se a pessoa está em dia; atraso vira "O plano não tem prazo: continue de onde parou". Nada é perdido nem reiniciado por atraso.
- Trocar a edição mantém o dia de início e passa a ler as marcações da outra edição.
- **Parar de seguir** remove só o registro do plano. As marcações de leitura continuam, com o backup de `/jornada#leitura`.
- Entradas desconhecidas ou malformadas na chave são ignoradas na leitura; nada é escrito à mão ali.
- Vários planos podem ser seguidos ao mesmo tempo. Em `/planos`, o plano seguido leva a palavra "seguindo" ao lado do nome.

## Página e carga

- As páginas são estáticas (`generateStaticParams` sobre `PLANS`). A lista de porções vem no HTML, com links comuns: funciona sem JavaScript, abrindo na Bíblia Livre.
- O cartão do topo é renderizado no servidor já no tamanho do estado "Seguir este plano", com os controles desativados até a página acordar: nada abaixo dele se move.
- No aparelho, a lista passa a abrir cada dia no primeiro capítulo ainda não lido, na edição escolhida, e marca os dias lidos com a palavra "lido".
- Depois de seguir, parar ou ler a última porção, o foco vai para o título do cartão (o botão usado deixa de existir).
- `/planos/<id>#dia-N` abre a lista no dia N.
- Links de entrada: menu ("Planos de leitura", em Minha jornada), `/trilha` e `/jornada#leitura`.

## Organização do código

| Arquivo em `site/` | Responsabilidade |
| --- | --- |
| `src/lib/planos/model.ts` | Planos, corte das porções, rótulos, números, progresso derivado e o estado "seguindo". Puro |
| `src/components/planos/store.ts` | Ligação com o `localStorage` do navegador |
| `src/components/planos/PlanTracker.tsx` | O cartão e a lista de porções de um plano |
| `src/components/planos/FollowedPlans.tsx` | A marca "seguindo" na lista de planos |
| `src/app/(site)/planos/page.tsx`, `[plano]/page.tsx` | As páginas |
| `scripts/checks/reading.ts` | Pós-build: cada plano pré-renderizado, com todas as porções e os números contados |
| `tests/planos.test.ts` | Modelo, progresso nas duas edições, gravação recusada e páginas |

## Fora desta entrega

- Planos cronológicos ou com mais de uma leitura por dia (Antigo e Novo Testamento em paralelo).
- Lembrete por notificação.
- "Próximo do plano" dentro da página do capítulo, depois de marcar o capítulo lido.
- Plano com data de início escolhida ou com porções remarcadas depois de um atraso.
- Backup próprio: o que importa (o que foi lido) já está no backup do progresso de leitura; o registro "seguindo" é refeito com um toque.
