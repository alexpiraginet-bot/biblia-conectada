# Hero da capa, contexto do versículo e correções da revisão — 10/11/2026

Terceira rodada na branch `claude/melhorias-app-cristao-hio0um`, sobre `3103208`. Três frentes:

1. **Hero da capa:** o céu de arcos feito dos dados ([design §25](../../design/README.md)).
2. **Contexto do versículo:** os de antes e os de depois ([CONTEXTO.md](../CONTEXTO.md)).
3. **Correções da revisão independente** da segunda rodada: 12 achados, todos reproduzidos, em planos, modo de leitura e rascunhos ([PLANOS.md](../PLANOS.md), [LEITURA.md](../LEITURA.md), [CADERNO.md](../CADERNO.md)).

Tudo abaixo foi rodado nesta data, neste ambiente (contêiner Linux, Node 22.23.4, Chromium do Playwright), sobre o código final. O que não foi conferido está no fim.

**Atualização, mesmo dia:** este arquivo é o registro do estado em `1e1bc5f`, quando o tema público era Noite. Na rodada seguinte o tema claro (Dia) passou a ser o padrão do app ([evidência](2026-11-10-tema-claro.md)); onde se lê abaixo "o tema público é Noite", vale o que está lá.

## Comandos e resultados

Em `site/`:

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | saída 0 |
| `npm run lint` | saída 0 |
| `npm run build` (dados → `vitest run` → `next build` → `check-dist`) | saída 0 |
| — `vitest run` | 85 arquivos, 1.388 testes passaram, 2 ignorados (os mesmos da base) |
| — `next build` | 3.905 páginas estáticas geradas |
| — `check-dist` | créditos e `lang` em 3.858 páginas pré-renderizadas e na 404; 5 planos de leitura com 546 porções; 1.189 páginas de capítulo e 200 de versículo, agora com o versículo anterior e o seguinte de cada versículo; a legenda do hero com os números contados |
| `npm run budget` | saída 0, nenhuma rota acima do teto |

Na rodada anterior (`3103208`): 83 arquivos, 1.371 testes, 3.905 páginas estáticas, 3.858 no `check-dist`.

Testes novos: `tests/hero-arcs.test.ts` (regra dos arcos, geometria, cobertura dos 1.189 capítulos, números contados), `tests/verse-context.test.ts` (janela, limites do livro, blocos por capítulo, vizinhos, link e clique), casos novos em `tests/planos.test.ts` (corte que mira o que falta, script da página, um gesto por ação), `tests/reader-prefs.test.ts` (fatores na folha global) e `tests/verse-intent.test.ts` (clique de contexto antes da hidratação).

## JavaScript inicial e HTML (gzip nível 9, teto de JS de 168.960 B)

| Rota | Rodada anterior (`3103208`) | Final | Diferença |
| --- | --- | --- | --- |
| `/arcos` (JS) | 168.905 B | 168.905 B | igual |
| capa (JS) | 164.090 B | 164.090 B | igual |
| capítulo (JS) | 153.248 B | 153.442 B | +194 B |
| versículo (JS) | 162.125 B | 162.442 B | +317 B |
| `/planos/<plano>` (JS) | 155.244 B | 155.645 B | +401 B |
| `/caderno` (JS) | 159.205 B | 159.254 B | +49 B |
| capa (HTML) | 80,8 KB | 92,7 KB | o desenho do céu vai no HTML e de novo nos dados da página |
| maior página de versículo, Isaías 9:6 (HTML) | 106,9 KB | 115,7 KB | os dois vizinhos e "Contexto" em cada ligação |

A maior rota de JS continua sendo `/arcos`, com **55 B de margem**. O hero não acrescentou JavaScript: é SVG do servidor e CSS. O link "Contexto" ficou fora de `VerseActions` justamente porque esse componente está no JS inicial de `/arcos`.

**Custo assumido:** o HTML da capa cresceu cerca de 12 KB comprimidos. É o preço de o céu aparecer e nascer junto com a primeira pintura, sem esperar imagem nem script.

## 1. Hero da capa

Roteiro Playwright em 375 × 812 (toque) e 1440 × 900, Noite e Dia, no build de produção local: faz parte das 127 verificações do roteiro do hero e do contexto, sem erro de página nem de console.

- **Dados:** 959 arcos, um de cada capítulo ao capítulo com mais versículos ligados a ele, em 4 camadas e 20 caminhos SVG. A legenda diz esse número, os 66 livros, os 1.189 capítulos e os 301.539 pares de versículos diferentes; o roteiro e o `check-dist` comparam com a conta.
- **Um título só** na página, o aprovado ("Uma Palavra. Novos caminhos."); as esferas vêm depois, sob "Uma passagem leva a outra.".
- **O céu nasce:** a 0,65 s as camadas estão a meio caminho; depois, paradas. Com movimento reduzido, o céu aparece inteiro e sem animação.
- **A ação principal está na primeira tela**, com 52 px de altura e nada por cima (nem o menu flutuante): termina a 676 px de 812 no celular e a 773 px de 900 no computador.
- **Horizonte:** Gênesis, Mateus (na posição real do início do Novo Testamento) e Apocalipse.
- Sem rolagem lateral.

Contraste do texto sobre a imagem pintada (o pior pixel atrás de cada texto, com o texto escondido para a captura):

| Contexto | Título | Título, 2ª linha | Frase | Nomes do horizonte |
| --- | --- | --- | --- | --- |
| 375 px, Noite | 10,74 | 8,12 | 10,36 | 8,89 |
| 375 px, Dia | 5,97 | 4,39 | 5,92 | 8,15 |
| 1440 px, Noite | 10,23 | 7,86 | 10,45 | 9,29 |
| 1440 px, Dia | 7,69 | 5,56 | 7,88 | 8,46 |

A segunda linha do título em Dia a 375 px fica abaixo de 4,5:1; é texto de 42 px e passa a regra de 3:1 para texto grande. O tema público é Noite.

## 2. Contexto do versículo

No mesmo roteiro, nos quatro contextos:

- **Painel de João 3:16:** o versículo 15 acima e o 17 abaixo do escolhido, no máximo duas linhas cada, alvo de 44 px. As ações do versículo e de cada versículo ligado ocupam no máximo duas linhas e cada uma mantém 44 px.
- **Diálogo:** abre com o título "João 3:16" e o sobretítulo "Antes e depois"; mostra os versículos 13 a 19 com o 16 maior e no meio do que é visível; contraste ≥ 4,5:1.
- **Mais antes:** seis a mais por toque ("Mostrando de João 3:7 a 3:19."); numa lista que já rola, o que estava sendo lido fica onde estava (diferença de até 2 px); a janela entra em João 2 sob o nome do capítulo; no começo do livro a lista diz "Começo de João." e toma o foco. **Mais depois** acrescenta seis.
- **Escape** fecha e devolve o foco ao link que abriu.
- **Versículo ligado:** "Contexto" numa linha da lista abre o contexto daquele versículo sem trocar de página; dentro do diálogo de conexões, "Contexto" troca o conteúdo do mesmo diálogo.
- **Limites:** Gênesis 1:1 não tem versículo anterior e o contexto diz "Começo de Gênesis."; João 3:36 mostra "4:1" como seguinte e o contexto segue para João 4.
- **Tamanho do texto:** com o maior tamanho escolhido, o texto do contexto fica 1,4 vez maior, sem rolagem lateral.
- **Sem JavaScript:** os dois vizinhos e "Contexto" são links para `/joao/3#v15`, `#v17` e `#v16`. Na Open Nova Bíblia Viva e na página do capítulo não há "Contexto".

## 3. Correções da revisão independente

Dois revisores independentes atacaram o código da segunda rodada (planos; modo de leitura e rascunhos), com a regra de só valer o que fosse reproduzido com execução. Doze achados, todos corrigidos e cobertos por verificação automática.

| # | Achado | Gravidade | Correção | Verificado por |
| --- | --- | --- | --- | --- |
| 1 | Duplo clique em "Marcar a porção como lida" marcava dois dias, trocava a edição ou abria um link | alta | o botão vale para o dia em que foi desenhado; o plano ignora toques por 700 ms depois de uma ação; "Desfazer" | roteiro dos planos (dois cliques a 150 ms) |
| 2 | Enter no botão de marcar derrubava o foco do teclado | média | `aria-disabled` no lugar de `disabled` | roteiro dos planos |
| 3 | "Parar de seguir" num plano concluído perdia o foco e deixava um pedido de foco pendente | média | o foco é pedido explicitamente e só quando a ação deu certo | roteiro dos planos (setas nos rádios) |
| 4 | Quem já segue o plano via "Seguir este plano" e depois um salto de 158 a 236 px | média | script da página antes da pintura e altura mínima reservada | roteiro dos planos (deslocamento < 0,02) |
| 5 | A capa prometia porções "do tamanho mais parecido"; o dia depois do Salmo 119 tinha 7 versículos | baixa | o corte passou a mirar a média do que falta; a frase diz "de tamanho parecido" | `tests/planos.test.ts` |
| 6 | "Dia 31 lido" continuava no cartão depois de o capítulo ser desmarcado na leitura | baixa | a frase só aparece enquanto o fato vale | roteiro dos planos |
| 7 | Recarregar com o diálogo de anotação aberto perdia o texto | média | rascunho também em `pagehide` e `visibilitychange` | roteiro de regressões |
| 8 | A escolha feita em outra aba mudava o controle e não a página | média | o controle aplica os atributos a cada mudança do valor guardado | roteiro de regressões (duas abas) |
| 9 | O tamanho do texto só valia depois de passar por um capítulo; a documentação dizia "em qualquer página" | média | fatores na folha global; documentação corrigida | roteiro de regressões (visita direta a um evento) |
| 10 | Armazenamento recusado: no capítulo seguinte o controle voltava ao padrão com a página em Leitura | baixa | a escolha não guardada vale para a aba inteira | roteiro de regressões |
| 11 | Em Leitura, o foco caía em `<body>` ao fechar a barra de seleção ou o diálogo | baixa | o foco vai para o próprio versículo | roteiro de regressões |
| 12 | Voltar do navegador com o diálogo aberto numa página de versículo perdia a posição da leitura | baixa | capítulo e páginas de versículo contam como a mesma página | roteiro de regressões (1440 px) |

Números dos planos depois da correção 5, como as páginas os mostram (contados por `planFigures`; conferidos pelo `check-dist` contra o HTML):

| Plano | Dias | Capítulos | Versículos | Mín. / mediana / máx. por dia |
| --- | --- | --- | --- | --- |
| A Bíblia em um ano | 365 | 1.189 | 31.102 | 46 / 84 / 176 |
| O Novo Testamento em 90 dias | 90 | 260 | 7.957 | 67 / 87 / 118 |
| Os Evangelhos em 30 dias | 30 | 89 | 3.779 | 96 / 129 / 147 |
| Os Salmos em 30 dias | 30 | 150 | 2.461 | 55 / 82 / 176 |
| Provérbios em um mês | 31 | 31 | 915 | 18 / 29 / 36 |

## Roteiros no navegador (build de produção local, `next start`)

| Roteiro | Verificações | Falhas |
| --- | --- | --- |
| Hero e contexto do versículo | 127 | 0 |
| Planos de leitura (com os achados 1 a 6) | 256 | 0 |
| Modo de leitura e tamanho do texto | 138 | 0 |
| Regressões da revisão na leitura e nos rascunhos (achados 7 a 12) | 19 | 0 |
| Diálogo de anotação (Escape, rascunhos) | 36 | 0 |
| Caderno completo | 236 | 0 |

Quatro contextos (375 × 812 com toque e 1440 × 900, Noite e Dia), menos as regressões (as duas larguras, tema Noite) e o diálogo (as duas larguras). Nenhum erro de página nem de console.

Capturas conferidas em folhas de contato: as 20 do hero e do contexto (cinco telas nos quatro contextos) e as 32 dos planos, mais a linha de ações de um versículo ligado a 375 px. As capturas dos roteiros da leitura e do Caderno não foram olhadas de novo: valem as verificações dos roteiros.

## Defeitos achados e corrigidos nesta rodada (além dos 12 da revisão)

- **"Contexto" custava uma linha por ligação no celular:** as ações de cada versículo ligado passaram de duas para três linhas (132 px em vez de 88). As ações agora fluem numa linha só que quebra; o roteiro confere o máximo de duas linhas.
- **O ajuste anterior tirava a caixa do link "Palavra por palavra"** (ele carrega o mesmo atributo do contêiner das ações): sem alvo de 44 px nem anel de foco. A regra ficou restrita ao contêiner; o roteiro confere os 44 px de cada ação.

## Não verificado

- **Safari/WebKit, Firefox e aparelho físico.** Só há Chromium neste ambiente. Em especial: a animação do hero em celulares modestos, o `<dialog>` do contexto no Safari e a âncora de rolagem ao mostrar versículos anteriores (o ajuste é feito pela página, mas só foi medido no Chromium).
- **Leitor de tela.** Nomes, foco e regiões de status conferidos pelo DOM, não por VoiceOver ou TalkBack.
- **Lighthouse e medidas de campo.** O peso do HTML da capa subiu; o efeito no LCP não foi medido.
- **Prévia e produção na Vercel desta rodada.** A prévia de `3103208` (rodada anterior) ficou pronta; a deste código não foi conferida aqui.
- **Revisão independente do código desta rodada.** O hero e o contexto foram verificados pelos roteiros e pelos testes, não por um segundo revisor.
- **O tema Dia** foi aplicado por sobreposição de QA; o tema público é Noite.
- **No `next dev`** o diálogo dos versículos (todos os tipos, inclusive os que já existiam) abre e fecha em seguida por causa do modo estrito do React; por isso o contexto foi verificado só no build de produção.

Nenhuma fonte nova, nenhuma imagem nova, nenhuma chamada paga, nenhuma alteração em `estudos/` ou `fontes/`. Os dados de teste ficaram só no perfil temporário do navegador de teste.
