# Licença dos dados derivados

Os dados que este projeto gera a partir das fontes abertas saem sob a **Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0)**: https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br

## O que entra

- O que `site/scripts/build-data.ts` calcula e escreve em `site/src/data/generated/` e `site/public/data/`: contagens, ligações, votos, posições e grafos (por exemplo `arcs.bin`, `sky-head.bin`, `chapter-graph.json`, `chapter-edges.bin`, `chapter-links.json`, `summary.json`).
- Qualquer outro conjunto de dados que o projeto derive de `fontes/` ou de `estudos/*/data/`.

Dentro desses mesmos arquivos há partes que **não** mudam de licença:

- **O texto bíblico** (o campo `t` de `books/*.json` e os arquivos de `public/data/text/`) é a Bíblia Livre sem alterações e continua sob a licença dela, CC BY 4.0 Brasil, com o crédito exato do `ATTRIBUTION.md`.
- **`credits.json`** reproduz o `ATTRIBUTION.md`: cada crédito segue a licença da fonte que ele descreve.

## Créditos que acompanham os dados

Quem reutilizar estes dados precisa manter os créditos das fontes, além do crédito a este projeto. O texto exato está em `ATTRIBUTION.md`. Hoje os dados derivados vêm de:

- Referências cruzadas: OpenBible.info (CC BY).
- Texto bíblico: Bíblia Livre (BLIVRE), CC BY 4.0 Brasil. O texto é reproduzido sem alterações.

Quando entrarem dados do Theographic, da NBV Open, da BLT ou da TFT (todos CC BY-SA 4.0), a CC BY-SA 4.0 deixa de ser escolha e passa a ser obrigação.

## O que não entra

- As fontes em `fontes/` e os dados de terceiros em `estudos/*/data/`: valem as licenças de cada uma (ver `fontes/README.md` e `ATTRIBUTION.md`).
- O código-fonte: MIT (ver `LICENSE`).
- As fontes tipográficas: SIL Open Font License 1.1 (`site/src/fonts/OFL-*.txt`).
- A mídia dos estudos (vídeos, narrações, recriações, trilha) e os textos do site: ainda sem licença definida.
