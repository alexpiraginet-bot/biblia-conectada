# Leitura: modo Estudo ou Leitura e tamanho do texto

A página de um capítulo tem dois jeitos de ser lida e cinco tamanhos de texto bíblico. A escolha é de quem lê, fica só no aparelho e vale para as duas edições (Bíblia Livre e Open Nova Bíblia Viva).

Nasceu de uma medida: num celular de 375 px, o texto bíblico ocupava cerca de metade da altura da lista de versículos de Gênesis 1; o resto eram as ações de cada versículo. Os números estão em [`evidence/2026-11-10-leitura-planos.md`](evidence/2026-11-10-leitura-planos.md).

## O que faz

O controle fica no cabeçalho do capítulo, numa linha: **Estudo | Leitura** e **A− A+**.

| Modo | O que a página mostra |
| --- | --- |
| **Estudo** (padrão) | Como sempre: cada versículo com a contagem de ligações e as suas ações (Conexões, estudo com IA, Compartilhar, Marcar lido e, onde há, o interlinear), o paginador acima e abaixo do texto, e "Marcar capítulo lido" antes do texto. |
| **Leitura** | O texto e os números dos versículos. As ações e a contagem de ligações de cada versículo e o paginador de cima ficam guardados. "Marcar capítulo lido" passa para depois do texto, que é onde um capítulo lido se marca. |

- Em Leitura continuam: o paginador abaixo do texto, o painel de ligações do capítulo, a barra de seleção (e com ela o [Caderno](CADERNO.md)), os grifos e os sinais de anotação.
- Na Open Nova Bíblia Viva o número do versículo é o próprio link para a página do versículo. Em Leitura os números ficam; as ações de cada versículo saem.
- O tamanho vale para o texto bíblico (`.bc-scripture`) em qualquer página; a interface não muda de tamanho.
- Nada do HTML do texto bíblico muda entre os modos: é uma regra de CSS sobre atributos de `<html>`.

## Tamanhos

`TEXT_STEPS` e `TEXT_SCALE` em `site/src/lib/reader-prefs.ts`. O passo 0 é o tamanho do design system (19 a 21 px, conforme a largura).

| Passo | −1 | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- |
| Fator | 0,9 | 1 | 1,12 | 1,25 | 1,4 |

O menor tamanho não desce de 17 px. O número do versículo acompanha a altura da linha. `site/tests/reader-prefs.test.ts` confere que os fatores do CSS são os de `TEXT_SCALE`.

O leitor de tela ouve "Tamanho N de 5" a cada mudança; o botão do extremo fica desativado.

## Persistência e carga

- Uma chave versionada em `localStorage`: `bc:leitor:v1`, com `{"modo":"leitura","texto":1}`. Quando tudo é o padrão, a chave é removida. Nada é enviado a servidor, Analytics ou Ads.
- **A escolha chega antes da primeira pintura.** Um script curto no `<head>` (`READER_PREFS_SCRIPT`, junto do tema) lê a chave e põe `data-leitor="leitura"` e `data-texto="<passo>"` em `<html>`. Por isso um link para um versículo nunca cai numa página que depois muda de altura. O teste roda o script contra as mesmas funções que a página usa (`parseReaderPrefs` + `readerAttributes`), com uma tabela de valores guardados, válidos e inválidos.
- Valor ausente, ilegível ou desconhecido vira o padrão, sem erro.
- Se o navegador recusa guardar (armazenamento bloqueado ou cheio), a escolha vale para a página aberta e o controle diz isso: "Este navegador não guardou a escolha: ela vale só nesta página."
- Outras abas da mesma origem acompanham pelo evento `storage`.
- Sem JavaScript o controle não aparece e a página é a do modo Estudo.

## Onde a página carrega os dois lugares

"Marcar capítulo lido" (`ChapterReadingControls`) é renderizado duas vezes, com `place="topo"` e `place="fim"`; o CSS mostra um dos dois conforme o modo. Os dois seguem o mesmo progresso guardado ([READING-PROGRESS.md](READING-PROGRESS.md)).

## Organização do código

| Arquivo em `site/src/` | Responsabilidade |
| --- | --- |
| `lib/reader-prefs.ts` | Modos, tamanhos, leitura e gravação da preferência, atributos de `<html>` e o script do `<head>`. Puro |
| `components/reader/ReaderPrefs.tsx`, `reader-prefs.module.css` | O controle |
| `components/reader/reader-prefs.css` | As regras globais: fatores de tamanho e o que o modo Leitura guarda |
| `styles/ds.css` (`.bc-scripture`) | O tamanho do texto multiplicado por `--leitor-escala` |
| `app/layout.tsx` | O script no `<head>`, depois do tema |
| `app/(site)/[livro]/[cap]/layout.tsx`, `components/reader/TranslationReader.tsx` | Os dois leitores: o controle e os dois lugares de "Marcar capítulo lido" |

Marcadores no HTML que o CSS usa: `ol[data-reader]` (a lista de versículos), `[data-verse-actions]` (as ações de um versículo), `.bc-pager[data-where="topo"]` e `[data-reading-place]`.

## Fora desta entrega

- Escolha de fonte, espaçamento entre linhas e largura da coluna.
- Tema por horário ou tema sépia (o tema público continua sendo Noite).
- Esconder os números dos versículos.
- Modo Leitura em outras páginas com texto bíblico (liturgia, lado a lado, temas): o tamanho já vale nelas; o modo é só dos dois leitores de capítulo.
