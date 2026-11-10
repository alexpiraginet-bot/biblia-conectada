# Caderno: grifos, anotações e passagens para decorar

O Caderno é o registro pessoal de quem lê: versículos grifados, anotações e passagens para decorar com revisão espaçada. Fica em `/caderno` e nasce na leitura, pela barra que aparece ao selecionar um trecho. É um registro do navegador, sem conta e sem servidor.

Atende ao pedido do Alex de 20/10 ("Precisamos que dados sejam salvos no navegador de cada pessoa, pesquisas, anotações, memórias e etc!") e ao item 4.2 de [`HANDOFF-CODEX.md`](HANDOFF-CODEX.md). O que desse item ainda não entrou está em "Fora desta entrega".

## O que faz

| Na leitura (barra de seleção) | O que acontece |
| --- | --- |
| **Grifar** | Marca os versículos inteiros tocados pela seleção, na última cor usada, e abre as quatro cores e "Tirar grifo". Num trecho já grifado, só abre as cores. |
| **Anotar** | Abre um diálogo com os versículos e um campo de texto. Uma anotação por passagem: anotar de novo a mesma passagem abre a que existe. Sair sem guardar nunca perde o que foi escrito: o texto vira rascunho (ver "Rascunhos"). |
| **Decorar** | Guarda a passagem para revisão. A mesma passagem entra uma vez só. |
| Copiar, Compartilhar, Salvar, Explorar | Como antes: agem sobre as palavras selecionadas. |

- Grifar, Anotar e Decorar valem para **versículos inteiros** (a barra diz quais: "Gênesis 1:3–4"). Copiar, Compartilhar e Salvar continuam valendo para as palavras selecionadas.
- O texto guardado é o da Bíblia Livre, como a página mostra. O HTML do texto bíblico nunca é alterado: o capítulo recebe só atributos (`data-grifo`, `data-nota`, `data-decorar`) nos versículos.
- Abaixo do texto, "Seu caderno neste capítulo" lista as anotações do capítulo e conta grifos e passagens para decorar. É o equivalente em palavras dos sinais que aparecem nos versículos.
- Em `/caderno` há quatro partes: **Anotações**, **Grifos** (com filtro por cor quando há mais de uma), **Decorar** (a revisão do dia e a lista) e **Salvos** (a mesma lista de `/salvos`, que continua existindo). A parte aberta vai no endereço (`/caderno#decorar`).
- O Caderno vale para a leitura na Bíblia Livre. A leitura na Open Nova Bíblia Viva não tem a barra de seleção e, por isso, não tem Caderno.

## Rascunhos da anotação

- O diálogo de anotação **nunca se recusa a fechar**. O navegador fecha um diálogo modal no segundo Escape (ou no gesto de voltar) mesmo que a página responda ao primeiro; a versão anterior perguntava "Sair sem guardar?" no primeiro Escape, e no segundo o diálogo fechava por baixo da página, que ficava travada sem rolagem e perdia o texto. Achado por revisão em 10/11 e reproduzido no build de produção.
- Por isso, toda saída que não seja "Guardar anotação" ou "Apagar" (Cancelar, o X, Escape, o gesto de voltar, a página ser trocada por baixo) guarda o texto não guardado como **rascunho daquela passagem**, e avisa: "Você saiu sem guardar. O rascunho fica nesta aba.", com "Continuar a anotação".
- Abrir de novo a anotação da mesma passagem traz o rascunho, diz "Rascunho recuperado" e oferece "Descartar rascunho", que volta ao texto guardado (ou ao campo vazio).
- O rascunho fica em `sessionStorage` (`bc:caderno:rascunhos:v1`): vale para a aba, sobrevive a recarregar e some quando a aba fecha. Guardar ou apagar a anotação remove o rascunho. Ficam os 12 mais recentes (`MAX_DRAFTS` em `lib/caderno/drafts.ts`). Sem `sessionStorage`, o rascunho vale enquanto a página estiver aberta.
- A única pergunta que restou no diálogo é a de apagar, que nasce de um toque no botão. Escape sobre ela fecha o diálogo sem apagar nada.
- **A página pode sumir com o diálogo aberto** (recarregar, o celular descartar a aba em segundo plano). O texto vira rascunho também quando a página é escondida ou descarregada (`pagehide` e `visibilitychange`), não só quando o diálogo é fechado. Achado por revisão em 10/11: recarregar com o diálogo aberto perdia o que tinha sido escrito.
- **Voltar do navegador com o diálogo aberto** numa página de versículo (`/genesis/1/20` → `/genesis/1`) mantém o diálogo; ao fechá-lo, a leitura volta ao ponto em que estava. O capítulo e as páginas de versículo dele contam como a mesma página.
- **Foco ao fechar:** vai para o versículo anotado. No modo Leitura, em que os links do versículo não são desenhados, vai para o próprio versículo ([LEITURA.md](LEITURA.md)).

## Cores dos grifos

Quatro cores, com nome: Ouro, Verde, Azul e Lilás (`MARK_COLORS` em `site/src/lib/caderno/model.ts`). São tokens do design system (`mark-ouro`, `mark-verde`, `mark-azul`, `mark-lilas` em `site/src/styles/tokens.json`), com a mesma regra da Escritura: `ink`, `ink-reading` e `ink-2` com no mínimo 7:1 sobre cada cor, nos dois temas. `site/tests/tokens.test.ts` confere; a tabela sai de `npx tsx scripts/contrast-table.ts`.

A cor nunca é a única pista: o grifo leva também um fio sob o texto, a barra e o Caderno dizem o nome da cor, e o filtro de cores usa o nome.

## Revisão espaçada (Decorar)

As regras estão em `LEITNER_DAYS` e `reviewMemo` (`model.ts`); a página escreve os números a partir dessas constantes.

- São 5 caixas. Uma passagem nova entra na caixa 1 e já pode ser revisada no mesmo dia.
- **Lembrei:** a passagem descansa os dias da caixa em que estava (1, 2, 4, 8 e 16) e sobe uma caixa. Na última caixa, continua voltando a cada 16 dias.
- **Ainda não:** volta à caixa 1 e continua na revisão do mesmo dia, depois das outras.
- A revisão mostra só a referência. "Ver as primeiras letras" mostra a primeira letra de cada palavra, com a pontuação; "Mostrar o texto" mostra a passagem, e a pessoa diz como foi. É autoavaliação: o site não confere o que foi dito.
- **O dia vira à meia-noite de Brasília** (`America/Sao_Paulo`), como na liturgia e na Jornada. Quem está em outro fuso vê a revisão virar nesse horário.
- Selecionar de novo a mesma passagem e escolher "Decorar" não cria outra entrada nem muda a agenda.

O Caderno não dá pontos na [Jornada](JORNADA.md) e não tem relação com o [progresso de leitura](READING-PROGRESS.md).

## Persistência e privacidade

- Tudo fica em `localStorage`, na chave versionada `bc:caderno:v1`. Nada é enviado a API, Analytics ou Ads. Não há login, perfil nem sincronização.
- O conteúdo inclui o que a pessoa escreveu. O armazenamento local é legível pelo JavaScript da mesma origem; não é um cofre criptografado.
- Limpar os dados do site, trocar de navegador, de perfil, de aparelho ou de domínio separa a pessoa do caderno. O backup é o caminho para levar ou guardar.
- **Só se confirma o que foi gravado.** Uma mudança é dita como feita depois de o navegador guardar e devolver o mesmo conteúdo. Armazenamento bloqueado e cota cheia viram a mensagem do problema, nunca um "guardado".
- **Dados ilegíveis nunca são sobrescritos.** Se a chave tiver um conteúdo que não é um caderno inteiro e válido, a leitura e o Caderno dizem isso e recusam novas gravações. Um único item inválido torna o conjunto ilegível de propósito: descartar o item em silêncio e gravar de novo apagaria o que a pessoa escreveu.
  - `/caderno` oferece **Baixar os dados ilegíveis** (o conteúdo como está) e **Recomeçar o caderno**, com confirmação. Recomeçar guarda antes o conteúdo ilegível em `bc:caderno:recovery:v1`; se essa cópia não puder ser gravada e relida, nada é apagado.
- Quando o caderno fica vazio, a chave é removida. A cor preferida do grifo volta então a Ouro.
- Abas da mesma origem se atualizam pelo evento `storage`. Cada gravação lê, altera e grava na mesma tarefa do navegador. Não há trava entre abas como a do progresso de leitura: duas gravações no mesmo instante em abas diferentes ficam com a última. As ações do Caderno são sempre gestos da pessoa, e por isso o caso é improvável; não é impossível.

### Limites (em `model.ts` e `store-core.ts`)

| Limite | Valor |
| --- | --- |
| `MAX_NOTE_CHARS`: tamanho de uma anotação | 4.000 caracteres |
| `MAX_TEXT_CHARS`: texto bíblico de um item | 8.000 caracteres |
| `MAX_CADERNO_ITEMS`: grifos, anotações ou passagens | 5.000 de cada |
| `MAX_CADERNO_BYTES`: caderno guardado e arquivo de backup | 2.000.000 bytes |
| `MAX_CADERNO_RECOVERY_BYTES`: cópias de dados ilegíveis | 3.000.000 bytes |

Os limites não garantem espaço: a cota efetiva é do navegador.

## Backup

- **Baixar meu caderno (JSON)** gera `caderno-biblia-conectada-AAAA-MM-DD.json`, no formato `biblia-conectada/caderno@1`, com grifos, anotações, passagens para decorar e os trechos salvos de `/salvos`, mais a linha de fonte do texto (Bíblia Livre, CC BY 4.0). Preparar o arquivo não confirma que ele foi salvo pelo navegador.
- **Importar um backup:**
  1. o tamanho é conferido antes da leitura;
  2. o arquivo inteiro é validado contra os livros, capítulos e versículos reais da Bíblia Livre; um item inválido recusa o arquivo todo;
  3. a página mostra o nome do arquivo, o que ele contém e a data, e espera **Importar e mesclar**;
  4. a mesclagem acrescenta o que falta. Quando os dois lados têm o mesmo versículo ou a mesma passagem, fica o alterado por último; no empate, fica o do aparelho.
- Mesclar nunca remove. Por isso um backup antigo pode trazer de volta um item apagado depois dele.
- **Apagar o caderno deste aparelho** pede confirmação e não toca nos trechos salvos, que têm o próprio "Apagar tudo".
- O progresso de leitura tem o próprio backup em `/jornada#leitura`.

## Carga

- As páginas de leitura levam só os três ícones e os nomes das chaves. O modelo, o armazenamento, o diálogo e a seção do capítulo ficam num módulo que o navegador busca no primeiro uso de Grifar, Anotar ou Decorar, ou quando o navegador já tem um caderno (`SelectionBar.tsx` → `import("@/components/caderno/reader")`). Quem nunca usou o Caderno não baixa nada dele.
- `site/tests/caderno-ui.test.ts` barra um import direto do modelo na barra de seleção.
- O teto de JS inicial (`npm run budget`) continua valendo; os números desta entrega estão na evidência.

## Organização do código

| Arquivo em `site/src/` | Responsabilidade |
| --- | --- |
| `lib/caderno/model.ts` | Dados, validação, grifos, anotações, agenda de revisão, backup e mesclagem. Puro, sem armazenamento |
| `lib/caderno/store-core.ts` | Persistência validada, estados de erro e recomeço com cópia. Testável, recebe o armazenamento |
| `lib/caderno/store.ts` | Ligação com o `localStorage` do navegador e as ações que as telas chamam |
| `lib/caderno/keys.ts` | Nomes das chaves, sem imports |
| `lib/caderno/drafts.ts` | Rascunhos da anotação por passagem, na aba |
| `components/caderno/reader.tsx` | O Caderno na leitura: sinais nos versículos, seção do capítulo e diálogo de anotação |
| `components/caderno/CadernoApp.tsx`, `Review.tsx` | A página `/caderno` e a revisão do dia |
| `components/caderno/icons.tsx` | Os três ícones do Caderno |
| `components/reader/SelectionBar.tsx`, `selection.module.css` | A barra de seleção e a pintura dos grifos e sinais |

Testes: `site/tests/caderno.test.ts` (modelo, agenda, backup e armazenamento, com falhas de cota, bloqueio e dados ilegíveis) e `site/tests/caderno-ui.test.ts` (cores, estilos, carga e menu em sincronia). O `check-dist` confere a casca estática de `/caderno`. O comportamento no navegador está em [`evidence/2026-11-10-caderno.md`](evidence/2026-11-10-caderno.md).

## Fora desta entrega

Do item 4.2 do handoff, ficaram para depois:

- histórico de buscas (hoje a busca guarda as 5 últimas);
- diário pessoal sem passagem;
- conversas com o companheiro de estudo guardadas no aparelho;
- "Continuar" na capa (o progresso de leitura já oferece "Continuar leitura" em `/jornada`);
- um único arquivo com todo `localStorage` do site (o progresso de leitura e a Jornada têm regras próprias).

Também não há: grifo de parte de um versículo, anotações na Open Nova Bíblia Viva, lembrete de revisão por notificação, e conferência do texto recitado.
