# Licença dos dados derivados

Os dados que este projeto gera a partir das fontes abertas saem sob a **Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional (CC BY-SA 4.0)**: https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br

## O que entra

- O que `site/scripts/build-data.ts` calcula e escreve em `site/src/data/generated/` e `site/public/data/`: contagens, ligações, votos, posições e grafos (por exemplo `arcs.bin`, `sky-head.bin`, `chapter-graph.json`, `chapter-edges.bin`, `chapter-links.json`, `summary.json`).
- O pacote de dados abertos em `site/public/dados/v1/`, servido em `/dados/v1/` e descrito em `DADOS.md` (`livros.json`, `versiculos.csv`, `ligacoes.csv`, `capitulos.csv`, `capitulos-arestas.csv`, `estudos/natal.json`, `datapackage.json` e o zip com tudo).
- A linha do tempo, os temas e a recepção cultural em `site/src/data/generated/` (`linha-do-tempo/events.json`, `linha-do-tempo/place-names.json`, `temas.json`, `recepcao.json`), derivados do Theographic (CC BY-SA 4.0), da OpenBible.info Topics (CC BY 4.0) e do Wikidata (CC0). Por causa do Theographic, a CC BY-SA 4.0 aqui é obrigação.
- Qualquer outro conjunto de dados que o projeto derive de `fontes/` ou de `estudos/*/data/`.
- O corpus interlinear gerado e suas glosas/notas editoriais em `site/src/data/interlinear-editorial.json`. A seleção e as transformações estão descritas em `docs/INTERLINEAR.md`; a assistência de IA não equivale a revisão acadêmica independente.

Dentro desses mesmos arquivos há partes que **não** mudam de licença:

- **Interlinear:** campos originais do STEPBible (TAHOT/TAGNT) continuam CC BY 4.0, com o crédito exato de `ATTRIBUTION.md`. A leitura corrida BLIVRE continua na licença da Bíblia Livre, sem alterações. A licença do conjunto derivado não substitui as licenças dessas partes.

- **O texto bíblico** (o campo `t` de `books/*.json`, os arquivos de `public/data/text/` e os de `public/dados/v1/texto/`) é a Bíblia Livre sem alterações e continua sob a licença dela, CC BY 4.0 Brasil, com o crédito exato do `ATTRIBUTION.md`.
- **`credits.json`** reproduz o `ATTRIBUTION.md`: cada crédito segue a licença da fonte que ele descreve.
- **Open Nova Bíblia Viva:** os arquivos de `public/data/translations/open-nbv/` e `src/data/generated/translations/open-nbv/` reproduzem integralmente e sem alterações o texto da Biblica® Open Nova Bíblia Viva™. Copyright © 2007, 2010 by Biblica, Inc.; CC BY-SA 4.0. "The original Work by its copyright holders is available for free at www.biblica.com and open.bible." A marca Biblica pertence à Biblica, Inc. Esta é uma edição distinta da BLIVRE; seus identificadores de versículos não são IDs do grafo. Créditos completos em `ATTRIBUTION.md` e nos avisos que acompanham os arquivos públicos.

## Créditos que acompanham os dados

Quem reutilizar estes dados precisa manter os créditos das fontes, além do crédito a este projeto. O texto exato está em `ATTRIBUTION.md`. Hoje os dados derivados vêm de:

- Referências cruzadas: OpenBible.info (CC BY).
- Texto bíblico: Bíblia Livre (BLIVRE), CC BY 4.0 Brasil. O texto é reproduzido sem alterações.
- Leitura alternativa: Biblica® Open Nova Bíblia Viva™, CC BY-SA 4.0. O texto é reproduzido sem alterações, com sua própria numeração e avisos.
- Eventos, datas e lugares da linha do tempo: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones.
- Temas: OpenBible.info Topics (CC BY 4.0).
- Obras de arte da recepção cultural: Wikidata (CC0).

Quando entrarem dados do Theographic, da NBV Open, da BLT ou da TFT (todos CC BY-SA 4.0), a CC BY-SA 4.0 deixa de ser escolha e passa a ser obrigação.

## O que não entra

- As fontes em `fontes/` e os dados de terceiros em `estudos/*/data/`: valem as licenças de cada uma (ver `fontes/README.md` e `ATTRIBUTION.md`).
- O código-fonte: MIT (ver `LICENSE`).
- As fontes tipográficas: SIL Open Font License 1.1 (`site/src/fonts/OFL-*.txt`).
- A mídia dos estudos (vídeos, narrações, recriações, trilha) e os textos do site: ainda sem licença definida.
