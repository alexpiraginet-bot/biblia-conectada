# site/

O site da Bíblia Conectada: Next.js 16 (App Router) na Vercel, com Root Directory `site`.

## Comandos

```bash
npm ci              # instala as dependências travadas no package-lock.json (Node 22)
npm run dev         # servidor local em http://localhost:3000 (rode `npm run data` antes, uma vez)
npm run data        # gera src/data/generated/ e public/data/ a partir de ../fontes e ../estudos/*/data
npm test            # gera os dados e roda os testes (vitest)
npm run build       # dados + testes + next build + check-dist (créditos, números da home, trava de tradução protegida)
npm run budget      # JS e HTML (gzip) por rota (a que gera cada página), depois do build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

## Dados

`scripts/build-data.ts` lê só arquivos de fora de `site/` (`../fontes/` e `../estudos/*/data/`) e falha se algum número
divergir do que os vídeos publicaram (`stats.json`, `natal-stats.json`, `xref.npz`). As saídas não vão para o git:

| Saída | Conteúdo |
|---|---|
| `src/data/generated/books.json` | 66 livros: nome, slug, abreviações, versículos por capítulo |
| `src/data/generated/books/<slug>.json` | Texto BLIVRE sem alteração + ligações de cada versículo `[parceiro, votos, direção]` |
| `src/data/generated/summary.json` | Contagens e versículos mais ligados |
| `src/data/generated/studies/natal.json` | Números do estudo "Antes do Natal" |
| `src/data/generated/credits.json` | `ATTRIBUTION.md` na íntegra (página `/sobre`) e a linha de crédito da BLIVRE (rodapé) |
| `public/data/arcs.bin` + `arcs.json` | Pares de versículos para os arcos (uint16, uint16, int16), ordenados por votos |
| `public/data/sky.json` + `sky-head.bin` | Escultura (/arcos) e céu 2D (/arcos/plano): capítulos, livros e os 20.000 arcos mais votados (mesmo formato de `arcs.bin`) |
| `public/data/chapter-graph.json` + `chapter-edges.bin` | Grafo de capítulos com posições (ForceAtlas2, semente fixa) |
| `public/data/sky.json` + `sky-head.bin` | Céu da home: livros, capítulos e os 20.000 pares mais votados para a primeira pintura |
| `public/data/text/<slug>/<cap>.json` | Texto BLIVRE de cada capítulo, para a lista sem fim das ligações e os painéis da escultura |
| `public/data/LICENSE.txt` | Licença dos arquivos públicos (texto BLIVRE em CC BY 4.0 Brasil; o resto em CC BY-SA 4.0) |
| `public/dados/v1/` | Pacote de dados abertos para quem quer criar a partir dos nossos dados (`scripts/data/open-data.ts`): `ligacoes.csv`, `versiculos.csv`, `livros.json`, `capitulos.csv`, `capitulos-arestas.csv`, `texto/`, `estudos/natal.json`, `datapackage.json` (Frictionless v2), `LEIA-ME.md`, `LICENSE.txt`, `SHA256SUMS`, `manifest.json` e um zip com tudo. Documentação: [`../DADOS.md`](../DADOS.md) |
| `src/data/generated/dados-manifest.json` | Cópia do `manifest.json` do pacote, lida pela página `/dados` |
| `src/data/generated/chapter-links.json`, `chapter-pairs.json`, `verse-pages.json` | Capítulos mais ligados a cada capítulo (empates mantidos), ligações por capítulo, versículos gerados no build |
| `src/data/generated/linha-do-tempo/events.json` | Os 450 eventos do Theographic (`scripts/data/timeline.ts`): versículos na grade, referência em português, ano (cronologia de F. N. Jones), lugares com nome lido da BLIVRE, capítulos, ligações, temas. CC BY-SA 4.0 |
| `src/data/generated/linha-do-tempo/place-names.json` | Nome em português de cada lugar do Theographic, lido do texto da BLIVRE (`scripts/data/place-names.ts`); os sem nome claro ficam em `unnamed` |
| `src/data/generated/temas.json` | Temas da OpenBible.info Topics com rótulo da BLIVRE, passagens e ligações entre elas (`scripts/data/themes.ts`) |
| `src/data/generated/recepcao.json` | Piloto de recepção: pinturas do Wikidata sobre o bom samaritano e a criação (`scripts/data/reception.ts`) |
| `src/data/generated/community/trilha-antes-do-natal.json` | Trilha "Antes do Natal": 26 pares (o mais votado de cada livro do AT com Mt 1–2 / Lc 1–2), datas sugeridas (`scripts/data/trilha.ts`) |
| `src/data/generated/community/ponte-built.json`, `public/data/ponte/calendar.json`, `public/data/ponte/<n>.json` | Ponte nº N: calendário de um ano (fuso de São Paulo), mínimo de saltos, rotas mínimas, rota mais forte e mapa de distâncias por ponte (`scripts/data/ponte.ts`); páginas só até a ponte do dia do build |
| `src/data/generated/explore/<slug>.json` | Explorar: para cada capítulo, os 35 capítulos ligados com mais votos (na ordem de `src/lib/chapter-rank.ts`, a mesma do "Mais ligados" da leitura), com o par de versículos mais votado e os versículos de cada lado, e até 60 arestas entre eles (`scripts/data/explore.ts`) |
| `public/data/verse-links/<slug>/<cap>.json` | Ligações de cada versículo do capítulo `[parceiro, votos, …]`, lidas pela faixa da Ponte e pela Mesa da semana |

## Páginas

- `/`: a capa (céu de Isaías 9:6) e, abaixo dela, o Explorar de Isaías 9 (`src/lib/explore/home.ts`).
- `/ler`, `/<livro>`, `/<livro>/<cap>`, `/<livro>/<cap>/<vers>`: leitura. Livros e capítulos saem no build; versículos, os 200 mais ligados no build e os outros na primeira visita. A seleção de um trecho abre a barra Copiar, Compartilhar, Salvar e Explorar (`src/components/reader/SelectionBar.tsx`).
- Painel do versículo: todas as ligações com o texto inteiro (`src/components/reader/LinksPanel.tsx`) e, embaixo, a lista sem fim das ligações das ligações (`src/components/reader/LinksFeed.tsx`, regra em `src/lib/links-feed.ts`, teste em `tests/links-feed.test.ts`; design §6.2).
- `/explorar` redireciona para `/explorar/isaias/9`. `/explorar/<livro>/<cap>`: grafo local do capítulo (os 200 capítulos com mais pares, Isaías 9 e João 1 saem no build; os outros na primeira visita); `/explorar/<livro>/<cap>/<livro2>/<cap2>`: a conexão escolhida, um dos 35 capítulos do grafo (outro par é 404). Medalhões: `public/medalhoes/` e `src/lib/medalhoes.ts`, que só roda no servidor. O mapa é vivo (design §7.1): a entrada, os pulsos de luz e a resposta ao toque ficam em `src/components/explore/AtlasMap.tsx`, `AtlasNodes.tsx` e `explore.module.css`, o botão de luzes em `AtlasLights.tsx`, e os tempos em `src/lib/explore/atlas-motion.ts` (teste em `tests/atlas-motion.test.ts`).
- `/conexao/<a>/<b>`: dois capítulos ou versículos lado a lado, com os pares que os ligam (`src/lib/conexao.ts`); a ordem invertida redireciona para a canônica.
- `/salvos`: os trechos salvos neste aparelho pela barra de seleção (`localStorage` `bc:salvos:v1`, `src/lib/salvos.ts`).
- Endereço que não nomeia página: uma referência solta (`/Isaías/9/6`, `/is 9:6`) vai para a página dela (`src/lib/canon/loose.ts`, `src/lib/missing.ts`); o resto é a 404 do site. As rotas dinâmicas chamam `notFound()` quando os parâmetros não nomeiam nada.
- `/linha-do-tempo` e `/linha-do-tempo/<id>-<referência>` (ex.: `/linha-do-tempo/423-lucas-10-25-37`): os 450 eventos, todos no build. Os dez períodos da lista são convenção do site, cada um aberto por um evento (`src/lib/timeline-periods.ts`); o filtro por período é CSS (`:has()`), sem JavaScript. As ligações entre eventos (os arcos do céu e os "Eventos ligados") saem de `src/lib/timeline-graph.ts`, que o `check-dist` e `tests/timeline-view.test.ts` recontam. As eras da recepção ficam em `src/lib/eras.ts`.
- `/tema` e `/tema/<palavra>`: temas publicados, todos no build, com índice de A a Z; as passagens vêm das mais ligadas às menos ligadas e as palavras em comum saem do texto da BLIVRE (`src/lib/timeline-graph.ts`). `/palavra` e `/palavra/<palavra>`: versículos com a palavra marcada (`src/lib/words.ts`, `src/lib/word-index.ts`); as palavras dos temas saem no build, as outras na primeira visita.
- `/dados`: os dados abertos, com tamanhos e registros lidos do manifesto do pacote (conferidos por `check-dist`). Os arquivos de `/dados/v1/` respondem com `Access-Control-Allow-Origin: *` (`next.config.ts`).
- `/is/9/6` e outras abreviações redirecionam para o livro (`src/lib/canon/redirects.ts`); abreviação que serve a dois livros sem acento ("jo") fica de fora.
- Arcos da leitura: `src/components/reader/Arcs.tsx` (SVG no servidor, estilo do vídeo 1, `src/lib/arc-style.ts`).
- Comunidade sem conta (tudo fica no aparelho, em `localStorage`; código em `src/components/community/` e `src/lib/community/`):
  `/trilha/antes-do-natal` e os 26 passos `/trilha/antes-do-natal/<n>` (com o cartão de ligação desenhado no aparelho),
  `/ponte` (a ponte de hoje, escolhida no aparelho pela data de São Paulo) e `/ponte/<n>` (arquivo até o dia do build),
  e `/mesa` (Mesa da semana num aparelho só). A faixa da Ponte (`PonteStrip`) fica no layout `(site)` e só carrega o
  código dela quando há uma ponte em andamento. `PONTE_LAUNCH` (`src/lib/community/ponte.ts`) marca o dia da Ponte nº 1.

Licença dos dados derivados: CC BY-SA 4.0, exceto o texto BLIVRE, que segue CC BY 4.0 Brasil (`../LICENSE-DATA.md`). Código: MIT (`../LICENSE`).

## Escultura de luz (/arcos)

A direção, a calibração da luz e o que ficou melhor que a referência estão em `../design/README.md` §15. O código fica em
`src/components/sculpture/`:

- `Sculpture.tsx`: o estado da página. A seleção fica no fragmento do endereço (`#isaias/53/5`, `#isaias/53`,
  `#caminho/genesis/3/15/apocalipse/12/9`, `#palavra/cordeiro`; `state.ts`), e o componente cuida da carga dos dados, do
  campo, da trilha, da força das ligações, dos rótulos no eixo (versículos, livros, grupos) e do cartão da ligação.
- `Panel.tsx`: o painel (folha no celular) do versículo e do capítulo. `PathPanel.tsx` e `WordPanel.tsx`, os painéis do
  caminho e da palavra, carregam só quando um deles abre.
- `engine.ts`: a câmera, os gestos, o voo, os quadros, a escolha do que está sob o ponteiro e a captura para a imagem.
- `renderer.ts` + `shaders.ts`: o WebGL2 próprio, sem biblioteca.
- `space.ts`: as contas puras de forma e câmera.
- `arcs.ts`: dos arquivos do pipeline (os mesmos do céu 2D) para o que se desenha.
- `home.ts`: a vista de abertura, a mesma do pôster.
- `groups.ts`: os grupos de livros no eixo (os dos medalhões; a página os lê no servidor).
- Carregados só quando pedidos: `path.ts` (o caminho mais curto entre dois versículos), `word.ts` (os versículos de uma
  palavra, pelo índice da busca) e `snapshot.ts` (a imagem para salvar ou compartilhar).

`tests/sculpture.test.ts` e `tests/sculpture-plus.test.ts` conferem contra o pipeline:

- os parceiros de cada versículo com os arquivos `verse-links`;
- as ligações de cada capítulo com o céu 2D;
- os planos dos fios, a câmera, o enquadramento e os endereços;
- as contagens da força das ligações (`summary.json`) com o `arcs.bin`, os grupos no eixo com `medalhoes.json`, o
  caminho com uma busca em largura independente, e os versículos de uma palavra com o texto da BLIVRE.

Sem GPU de verdade (ou sem WebGL2 com render em ponto flutuante), a página fica no pôster, com busca, painel e lista
funcionando. Para ver o desenho em software num teste, defina `window.__SCULPTURE_ALLOW_SOFTWARE__ = true` antes da carga;
o motor fica em `window.__sculpture`.

**Pôster.** A primeira pintura mostra a vista de abertura pronta, feita dos dados reais com o mesmo renderizador:
`public/sculpture/{noite,dia}-{854,2002}.{avif,webp}`, com o quadro da escultura nos 90% do meio (a borda leva o brilho).
O lugar é o mesmo do primeiro quadro vivo (`home.ts`; o CSS repete a conta em `sculpture.module.css`). As imagens
ficam no git e **não** são refeitas no build. Refaça quando mudarem os arcos, a luz (`renderer.ts`, `shaders.ts`,
`arcs.ts`), a vista de abertura (`home.ts`, `space.ts`) ou os tamanhos (`poster.ts`):

```bash
npm run data
CHROME=/caminho/do/chrome node scripts/render-sculpture-poster.mjs   # precisa de ffmpeg com libaom-av1 e libwebp
npm test                                                           # confere os arquivos contra poster.ts
```

`SCULPTURE_POSTER_ONLY=phone|wide` e `SCULPTURE_POSTER_THEME=noite|dia` refazem só uma parte; `SCULPTURE_POSTER_PNG=<pasta>`
guarda os PNG sem perda.

## Céu de ligações em 2D (/arcos/plano)

O código fica em `src/components/sky/`: `Sky.tsx` (estado, leitura, seletor, lista; carrega com a página),
`SkyCanvas.tsx` + `renderer.ts` + `shaders.ts` (WebGL2 próprio, carregado depois da primeira pintura por
`next/dynamic`), `model.ts` (contas puras, testadas em `tests/sky.test.ts`) e `initial.ts` (o que vai no HTML).
O visual é o do vídeo 1 (`../estudos/biblia-referencias/film.py`): densidade dos arcos com o tom de vitral pelo
comprimento, fios mais votados nítidos, brilho em duas escalas, risquinhos dos capítulos e Is 9:6 aceso em ouro.

**Pôster.** A primeira pintura mostra imagens prontas do céu, feitas dos dados reais com o mesmo código WebGL, em duas
camadas que a página junta com `mix-blend-mode: screen` (a mesma conta do shader): `public/sky/sky-*` (chão noturno,
arcos e risquinhos) e `public/sky/gold-*` (Is 9:6 aceso). Celular: 864 px, os arcos de `sky-head.bin` (o que o
celular desenha); a partir de 48rem: 2304 px, todos os arcos. As imagens ficam no git e **não** são refeitas no build
da Vercel. Refaça quando mudarem os arcos, o visual (`renderer.ts`, `shaders.ts`) ou os tamanhos (`poster.ts`):

```bash
npm run data
CHROME=/caminho/do/chrome node scripts/render-sky-poster.mjs   # precisa de ffmpeg com libaom-av1 e libwebp
npm test                                                     # confere os tamanhos declarados em poster.ts
```

Sem GPU, o Chromium desenha com SwiftShader: o céu completo em 2304 px leva cerca de 1 minuto.
`SKY_POSTER_ONLY=head|full` e `SKY_POSTER_LAYER=sky|gold` refazem só uma parte; `SKY_POSTER_PNG=<pasta>` guarda os
PNG sem perda para comparar.

## Fontes tipográficas

`src/fonts/*.woff2` são as fontes OFL dos vídeos, cortadas para o alfabeto latino por `scripts/subset-fonts.sh`
(o resultado fica no git; o script não roda no build). O subset mantém os campos de licença e direitos autorais do
arquivo (`--name-IDs='*'`), como pede a OFL.
