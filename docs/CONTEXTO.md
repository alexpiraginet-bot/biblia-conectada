# Contexto do versículo: os de antes e os de depois

Um versículo escolhido quase sempre chega sozinho: na página dele, numa lista de ligações, num diálogo de conexões. O contexto mostra esse versículo entre os que vêm antes e os que vêm depois, sem sair de onde a pessoa está.

Pedido do Alex em 10/11: "deixe fácil acessar contexto do versículo com visão dos de antes e dos depois do que foi escolhido".

## O que faz

| Onde | O que aparece |
| --- | --- |
| Painel do versículo (`/<livro>/<cap>/<vers>`) | O versículo anterior e o seguinte, acima e abaixo do escolhido, com até duas linhas de cada. Tocar num deles abre o contexto. |
| Painel do versículo, ações | **Contexto**, a primeira das ações do versículo. |
| Cada ligação do painel, da lista sem fim e do diálogo de conexões | **Contexto**, antes das outras ações daquele versículo: abre o contexto do versículo ligado, sem trocar de página. |

No celular o painel cobre o capítulo; é por isso que o versículo anterior e o seguinte aparecem dentro dele. No computador o capítulo fica ao lado, e os dois vizinhos repetem o que já se vê.

### O diálogo "Antes e depois"

- Abre no diálogo compartilhado dos versículos (o mesmo de Conexões, estudo e compartilhamento), com o nome do versículo no título.
- Mostra o versículo escolhido no meio, maior e sobre o destaque, com **três versículos de cada lado** (`CONTEXT_FIRST`).
- **Mostrar versículos anteriores** e **Mostrar versículos seguintes** acrescentam seis de cada vez (`CONTEXT_MORE`). Quando a lista já rola, o que estava sendo lido fica onde estava.
- **O contexto atravessa capítulos e para no livro.** Os primeiros versículos de um capítulo continuam o capítulo anterior, então a janela segue para ele, com o nome do capítulo como título. Ela não passa para outro livro: no começo e no fim, a lista diz "Começo de João." ou "Fim de João.", e o foco vai para a lista (o botão usado deixa de existir).
- O leitor de tela ouve o que passou a ser mostrado ("Mostrando de João 3:7 a 3:19.").
- **Abrir João 3 no leitor** leva ao versículo dentro do capítulo.
- O texto segue o [tamanho escolhido para o texto bíblico](LEITURA.md).
- Um contexto com falha não é mostrado pela metade: se um capítulo não carrega ou vem com tamanho diferente do cânon, o diálogo diz o problema, oferece tentar de novo e o link para o leitor.

## Regras

- **Só a Bíblia Livre.** O contexto lê os mesmos arquivos de texto por capítulo que os outros painéis (`public/data/text/<livro>/<cap>.json`). Na Open Nova Bíblia Viva não há "Contexto": os versículos das duas edições não são alinhados por número.
- **Sem JavaScript**, "Contexto" e os dois vizinhos são links comuns para o versículo dentro do capítulo (`/joao/3#v16`), que é onde o contexto está.
- **Na página do capítulo não há "Contexto"** entre os versículos: o capítulo já é o contexto.
- Os dois vizinhos do painel vêm no HTML da página, calculados no servidor. O primeiro versículo de um capítulo mostra o último do capítulo anterior, com capítulo e versículo ("2:25"). O primeiro versículo de um livro não tem anterior; o último não tem seguinte.
- O texto de um vizinho pode aparecer cortado em duas linhas porque o toque abre o contexto inteiro (design §10: texto bíblico nunca é cortado sem forma de abrir).
- Nada é guardado: o contexto não deixa rastro no aparelho.

## Carga

- O link "Contexto" é um componente próprio (`VerseContextLink`), fora de `VerseActions`. Motivo: `VerseActions` entra no JS inicial de `/arcos`, que está a poucas dezenas de bytes do teto; o link só existe nas páginas que o mostram.
- O conteúdo do diálogo (`VerseContext`) é baixado no primeiro uso. O texto vem de um arquivo por capítulo, lido uma vez por diálogo.
- O script do `<head>` que guarda cliques feitos antes de a página acordar passou a reconhecer `data-context-ref`.

## Organização do código

| Arquivo em `site/` | Responsabilidade |
| --- | --- |
| `src/lib/verse-context.ts` | A janela de versículos: tamanho inicial, crescimento, limites do livro, blocos por capítulo e os dois vizinhos. Puro |
| `src/components/reader/VerseContext.tsx`, `verse-context.module.css` | O conteúdo do diálogo |
| `src/components/reader/VerseContextLink.tsx` | O link "Contexto" |
| `src/components/reader/LinksPanel.tsx` | Os dois vizinhos no painel e "Contexto" em cada ligação |
| `src/components/assistant/verse-intent-events.ts`, `verse-intent-script.ts`, `VerseDialog.tsx`, `StudyController.tsx` | O tipo "contexto" no diálogo compartilhado |
| `scripts/checks/reading.ts` | Pós-build: em cada página de versículo, os dois vizinhos com número e texto, e "Contexto" em todos os versículos do painel |
| `tests/verse-context.test.ts`, `tests/verse-intent.test.ts` | A janela, os limites, o link e o clique antes da hidratação |

**Para quem desenvolve:** no `next dev` o diálogo compartilhado dos versículos abre e fecha em seguida, em todos os tipos (o modo estrito do React roda o efeito duas vezes e o `close()` da limpeza chega depois da reabertura). Não é do contexto e não acontece no build de produção; teste estes diálogos com `npm run build` e `next start`.

## Fora desta entrega

- "Contexto" nos resultados da busca, em `/tema`, `/palavra`, no Caderno e na liturgia.
- Contexto na Open Nova Bíblia Viva.
- Guardar quanto contexto a pessoa prefere ver.
