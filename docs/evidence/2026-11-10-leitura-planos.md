# Rascunhos da anotação, modo Leitura e planos de leitura — 10/11/2026

Segunda rodada na branch `claude/melhorias-app-cristao-hio0um`, sobre o commit do Caderno (`f98a875`). Três entregas:

1. **Rascunhos da anotação** ([CADERNO.md](../CADERNO.md), "Rascunhos"): correção de um defeito do Caderno.
2. **Modo Estudo ou Leitura e tamanho do texto** ([LEITURA.md](../LEITURA.md)).
3. **Planos de leitura** ([PLANOS.md](../PLANOS.md)).

Tudo abaixo foi rodado nesta data, neste ambiente (contêiner Linux, Node 22.23.4, Chromium do Playwright). O que não foi conferido está no fim.

## Comandos e resultados

Em `site/`:

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | saída 0 |
| `npm run lint` | saída 0 |
| `npm run build` (dados → `vitest run` → `next build` → `check-dist`) | saída 0 |
| — `vitest run` | 83 arquivos, 1.371 testes passaram, 2 ignorados (os mesmos da base) |
| — `next build` | 3.905 páginas estáticas geradas |
| — `check-dist` | créditos e `lang` em 3.858 páginas pré-renderizadas e na 404; 5 planos de leitura com 546 porções conferidos contra a conta |
| `npm run budget` | saída 0, nenhuma rota acima do teto |

Na rodada anterior (`f98a875`): 81 arquivos, 1.306 testes, 3.897 páginas estáticas, 3.851 no `check-dist`.

Testes novos: `tests/reader-prefs.test.ts` (preferência, script do `<head>` contra as funções da página, fatores do CSS, marcadores no HTML), `tests/planos.test.ts` (corte das porções, números, progresso nas duas edições, gravação recusada, páginas) e os de rascunho em `tests/caderno.test.ts`. `tests/routes.test.ts`, `tests/share-card.test.ts` e `tests/app-associations.test.ts` ganharam os casos de `/planos`.

## JavaScript inicial (gzip nível 9, teto de 168.960 B)

| Rota | Rodada anterior (`f98a875`) | Final | Diferença |
| --- | --- | --- | --- |
| `/arcos` | 168.886 B | 168.905 B | +19 B |
| capa | 164.070 B | 164.090 B | +20 B |
| capítulo | 152.049 B | 153.248 B | +1.199 B |
| versículo | 160.916 B | 162.125 B | +1.209 B |
| `/caderno` | 158.846 B | 159.205 B | +359 B |
| `/jornada` | 162.132 B | 162.212 B | +80 B |
| `/planos` | não existia | 146.448 B | nova |
| `/planos/<plano>` | não existia | 155.244 B | nova |
| `/sobre` (só o comum às páginas) | 144.628 B | 144.627 B | −1 B |

A maior rota continua sendo `/arcos`, agora com **55 B de margem** (eram 74). O teto passa, mas qualquer acréscimo ao que `/arcos` carrega estoura: quem mexer ali precisa medir antes.

## 1. Rascunhos da anotação

**Defeito (achado por revisão, reproduzido no build de produção antes da correção):** com texto não guardado, o primeiro Escape perguntava "Sair sem guardar?"; o segundo Escape fechava o diálogo por conta do navegador (um `cancel` não cancelável seguido de `close`). A página ficava com `position: fixed` no `body` e `overflow: hidden` em `<html>`, sem rolagem, e o texto se perdia.

**Correção:** o diálogo nunca se recusa a fechar. Toda saída que não seja guardar ou apagar deixa o texto como rascunho da passagem, na aba (`sessionStorage`), com aviso e "Continuar a anotação".

No build final (`next start`):

- O roteiro original do defeito (Escape, Escape, com 300 ms e com 1.500 ms de intervalo): o diálogo fecha no primeiro Escape, sai do documento, e `body` e `<html>` voltam ao estado anterior.
- Roteiro próprio em 375 e 1440 px: **36 de 36**. Confere Escape uma e duas vezes, o X, Cancelar, o aviso e "Continuar a anotação", "Rascunho recuperado" e "Descartar rascunho", o rascunho depois de recarregar, guardar e apagar removendo o rascunho, e o mesmo em `/caderno`.
- O roteiro completo do Caderno, com o passo do diálogo reescrito para o novo comportamento: **236 de 236** (58 em cada contexto de 375 px, 60 em cada um de 1440 px), sem erro de página.

## 2. Modo Leitura e tamanho do texto

Roteiro Playwright em 375 × 812 (toque) e 1440 × 900, Noite e Dia: **138 de 138**, sem erro de página nem de console.

Medidas de Gênesis 1 (31 versículos), iguais nos dois temas:

| Largura | Modo | Altura da lista de versículos | Texto bíblico na lista | Botões e links dentro da lista | Topo do 1º versículo |
| --- | --- | --- | --- | --- | --- |
| 375 px | Estudo | 7.598 px | 53,0% | 129 | 710 px |
| 375 px | Leitura | 4.484 px | 89,8% | 0 | 532 px |
| 1440 px | Estudo | 4.225 px | 61,1% | 129 | 734 px |
| 1440 px | Leitura | 3.082 px | 83,7% | 0 | 484 px |

Tamanho computado do texto bíblico em cada passo:

| Largura | −1 | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- |
| 375 px | 17,1 px | 19 px | 21,28 px | 23,75 px | 26,6 px |
| 1440 px | 18,9 px | 21 px | 23,52 px | 26,25 px | 29,4 px |

O que o roteiro confere, em cada contexto:

- **Estudo:** é o padrão, sem chave guardada e sem atributo em `<html>`; "Marcar capítulo lido" só antes do texto.
- **Leitura:** guarda `{"modo":"leitura","texto":0}`; os 31 versículos e os 31 números continuam; nada para tocar dentro da lista; o paginador de cima sai e o de baixo fica; "Marcar capítulo lido" só depois do texto, e ele marca os 31 versículos; selecionar um versículo ainda abre a barra de seleção.
- **Tamanho:** os cinco fatores (0,9, 1, 1,12, 1,25 e 1,4) pelo tamanho computado; os botões dos extremos desativam; sem rolagem lateral e sem versículo estourando no maior tamanho.
- **Carga fria:** os atributos já estão em `<html>` quando `DOMContentLoaded` dispara; deslocamento de layout acumulado igual a 0; o controle concorda depois da hidratação.
- **Open Nova Bíblia Viva:** o modo e o tamanho valem; as ações de cada versículo saem e os números (que ali são links) ficam.
- **Teclado:** a seta troca o modo e leva o foco junto. **Padrão:** voltar a Estudo no tamanho 2 de 5 remove a chave.
- **Página oculta pelo roteador:** voltar ao capítulo anterior mostra a página no modo atual.
- **Armazenamento recusado:** a escolha vale na página e o controle diz que não foi guardada.
- **Sem JavaScript:** o controle não aparece e a página tem um só "Marcar capítulo lido".
- Alvos de 44 px e contraste ≥ 4,5:1 no controle.

## 3. Planos de leitura

Roteiro Playwright nos mesmos quatro contextos: **244 de 244**, sem erro de página nem de console.

- **Lista:** cinco planos, cada um com os números contados ("365 dias · 1.189 capítulos · cerca de 85 versículos por dia") e a primeira porção.
- **Sem JavaScript:** a lista de porções está no HTML com links comuns, e o cartão diz que o plano não acompanha a leitura.
- **Sem salto:** nenhum deslocamento de layout enquanto o cartão acorda (acumulado abaixo de 0,01).
- **Seguir:** guarda o plano com o dia de Brasília e a edição; o cartão passa a "Próxima porção · dia 1 de 30"; o foco vai para o título do cartão.
- **Marcar a porção:** o progresso de leitura passa a ter exatamente os capítulos da porção; o dia 1 diz "lido" na lista e a próxima é o dia 2.
- **O leitor concorda:** "Ler <capítulo>" abre o capítulo certo; "Marcar capítulo lido" lá, e a volta à página do plano mostra o capítulo contado.
- **Outra edição:** trocar para a Open Nova Bíblia Viva zera o progresso mostrado (as marcações são de cada edição), mantém o dia de início e muda os links; voltar traz o progresso de volta.
- **Parar de seguir:** remove a chave do plano e não toca nas marcações de leitura.
- **Gravação recusada:** o plano não aparece como seguido.
- **Plano até o fim:** as 31 porções de Provérbios, uma a uma, até "Plano concluído"; o foco vai para o título.
- **Um progresso só:** os capítulos lidos nos outros planos aparecem lidos em "A Bíblia em um ano".
- **365 porções em 375 px:** sem rolagem lateral, nenhuma linha estourando; `#dia-200` abre abaixo da barra do app.
- Alvos de 44 px no cartão e contraste ≥ 4,5:1 em todo texto visível do plano e da lista.

Números dos planos, como as páginas os mostram (contados por `planFigures`; conferidos pelo `check-dist` contra o HTML):

| Plano | Dias | Capítulos | Versículos | Mín. / mediana / máx. por dia |
| --- | --- | --- | --- | --- |
| A Bíblia em um ano | 365 | 1.189 | 31.102 | 28 / 85 / 176 |
| O Novo Testamento em 90 dias | 90 | 260 | 7.957 | 50 / 88 / 132 |
| Os Evangelhos em 30 dias | 30 | 89 | 3.779 | 83 / 125 / 172 |
| Os Salmos em 30 dias | 30 | 150 | 2.461 | 7 / 82 / 176 |
| Provérbios em um mês | 31 | 31 | 915 | 18 / 29 / 36 |

As 48 capturas das duas frentes no build de produção (32 dos planos e 16 da leitura, nos quatro contextos) foram conferidas em folhas de contato; ficam fora do repositório. As capturas do roteiro do Caderno não foram olhadas de novo nesta rodada: valem as verificações do roteiro.

## Defeitos achados e corrigidos nesta rodada

- **Diálogo de anotação preso** (item 1).
- **Controle de leitura empurrava o texto:** a primeira versão do controle levava o primeiro versículo de 635 para 804 px no celular. Virou uma linha só, sem parágrafo, e "Marcar capítulo lido" foi para o fim no modo Leitura.
- **Foco perdido no plano:** depois da última porção o botão usado some; o foco agora vai para o título do cartão. A primeira tentativa marcava a intenção tarde demais (depois de a página já ter mudado), e o roteiro pegou.
- **Salto de layout em `/planos`:** o bloco "Você segue 1 plano" acima da lista empurrava a lista ao aparecer. Virou a palavra "seguindo" ao lado do nome do plano.

## Não verificado

- **Safari/WebKit, Firefox e aparelho físico.** Só há Chromium neste ambiente. Em especial: o comportamento do Escape e do gesto de voltar sobre o `<dialog>` no Safari, e o tamanho do texto com o ajuste de fonte do sistema no iPhone e no Android.
- **Leitor de tela.** Nomes, foco e regiões de status conferidos pelo DOM, não por VoiceOver ou TalkBack.
- **Prévia e produção na Vercel desta rodada.** Nada aqui prova deploy; o registro de publicação é do PR.
- **Lighthouse.** Não foi rodado.
- **Os avisos do modo de desenvolvimento do Next** ("URL data during prerendering or a navigation") aparecem em `next dev` nas rotas dinâmicas, inclusive nas que já existiam (`/[livro]/[cap]`). No build de produção, os roteiros não registraram erro de página nem de console.
- **Virada de dia com a página do plano aberta:** a frase do calendário é calculada quando a página desenha; não há teste de relógio.

Nenhuma fonte nova, nenhuma chamada paga, nenhuma alteração em `estudos/` ou `fontes/`. Os dados de teste ficaram só no perfil temporário do navegador de teste.
