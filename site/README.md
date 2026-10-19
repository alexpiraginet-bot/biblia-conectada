# site/

O site da Bíblia Conectada: Next.js 16 (App Router) na Vercel, com Root Directory `site`.

## Comandos

```bash
npm ci              # instala as dependências travadas no package-lock.json (Node 22)
npm run dev         # servidor local em http://localhost:3000 (rode `npm run data` antes, uma vez)
npm run data        # gera src/data/generated/ e public/data/ a partir de ../fontes e ../estudos/*/data
npm test            # gera os dados e roda os testes (vitest)
npm run build       # dados + testes + next build + conferência dos créditos no HTML
npm run budget      # JS que cada página manda ao navegador (gzip), depois do build
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
| `public/data/sky.json` + `sky-head.bin` | Céu de ligações (/arcos): capítulos, livros e os 20.000 arcos mais votados (mesmo formato de `arcs.bin`) |
| `public/data/chapter-graph.json` + `chapter-edges.bin` | Grafo de capítulos com posições (ForceAtlas2, semente fixa) |

Licença dos dados derivados: CC BY-SA 4.0 (`../LICENSE-DATA.md`). Código: MIT (`../LICENSE`).

## Céu de ligações (/arcos)

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
(o resultado fica no git; o script não roda no build).
