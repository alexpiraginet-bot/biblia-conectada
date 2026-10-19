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
| `public/data/chapter-graph.json` + `chapter-edges.bin` | Grafo de capítulos com posições (ForceAtlas2, semente fixa) |

Licença dos dados derivados: CC BY-SA 4.0 (`../LICENSE-DATA.md`). Código: MIT (`../LICENSE`).

## Fontes tipográficas

`src/fonts/*.woff2` são as fontes OFL dos vídeos, cortadas para o alfabeto latino por `scripts/subset-fonts.sh`
(o resultado fica no git; o script não roda no build).
