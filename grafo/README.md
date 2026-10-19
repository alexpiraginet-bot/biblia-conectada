# O grafo da Bíblia, pronto para usar

Tudo aqui é gerado por `grafo/build.py` a partir da base aberta de referências cruzadas (OpenBible.info, CC BY), na grade de 66 livros, 1.189 capítulos e 31.102 versículos. Nenhum número foi digitado à mão. Rode `python3 -I grafo/build.py` para regerar.

![A Bíblia inteira como arcos](imagens/biblia-arcos.png)

## Resumo (`dados/resumo.json`)

| | |
|---|---|
| Referências cruzadas (linhas da base) | 344.799 |
| Pares únicos de versículos | 301.584 (301.539 sem as 45 auto-ligações) |
| Pares que cruzam AT ↔ NT | 67.293 |
| Versículos com pelo menos uma ligação | 30.303 de 31.102 (799 sem nenhuma) |
| Média / mediana de ligações por versículo | 19,39 / 15 |
| Arestas do grafo de capítulos | 142.082 |
| Pares de livros ligados | 2.036 dos 2.145 possíveis |
| Versículo mais ligado | Isaías 9:6, com 212 |
| Par mais votado | Isaías 41:10 ↔ Filipenses 4:13, 1.477 votos |

Definição: "ligações" de um versículo = versículos diferentes ligados a ele na base, qualquer voto. "Votos" = soma das duas direções.

## Datasets (`dados/`)

| Arquivo | O que é | Tamanho |
|---|---|---|
| `versiculos.csv` | 31.102 versículos: referência (OSIS e PT), livro, capítulo, testamento, ligações (total, no AT, no NT), soma de votos | 2 MB |
| `arestas.csv` | 301.539 pares de versículos com votos e marcação AT↔NT. É o grafo completo | 24 MB |
| `arestas.bin` | O mesmo grafo em binário para a web: por par `uint16 a, uint16 b, int16 votos` (little-endian, índices de `versiculos.csv`) | 1,8 MB |
| `capitulos.csv` | 1.189 capítulos com ligações e nº de capítulos ligados | 50 KB |
| `capitulos-arestas.csv` | 142.082 arestas entre capítulos (quantos pares de versículos, soma de votos) | 5 MB |
| `capitulos.gexf` | O grafo de capítulos para o **Gephi** (nós com livro, testamento, versículos, ligações; arestas com peso e votos) | 11 MB |
| `capitulos.json` | O grafo de capítulos compacto para JavaScript | 2 MB |
| `livros.csv` | 66 livros: ligações, ligações internas, livros ligados, versículo mais ligado de cada um | 5 KB |
| `livros-matriz.csv` | Matriz 66×66: pares de versículos entre cada dupla de livros (diagonal = dentro do livro) | 15 KB |
| `resumo.json` | Os números da tabela acima | 1 KB |

## Rankings

`RANKINGS.md` traz: os 100 versículos mais ligados, os 50 pares mais votados, os 30 pares AT ↔ NT mais votados, os 50 capítulos mais ligados, os 66 livros e os 40 pares de livros mais ligados.

## Imagens (`imagens/`)

| | |
|---|---|
| `biblia-arcos.png` | A Bíblia inteira como arcos, com o motor dos vídeos |
| `capitulos-circulo.png` | Os 1.189 capítulos em círculo, na ordem da Bíblia, com as 1.448 ligações de 12+ pares (laranja = AT ↔ NT) |
| `livros-matriz.png` | Mapa de calor livro × livro |
| `distribuicao-ligacoes.png` | Distribuição do nº de ligações por versículo |
| `top01…top12-*.png` | O mapa de cada um dos 12 versículos mais ligados, no estilo dos vídeos |

![Os capítulos em círculo](imagens/capitulos-circulo.png)

## Como usar

- **Gephi:** abra `dados/capitulos.gexf`. Layout ForceAtlas2 com peso das arestas.
- **Python:** `pandas.read_csv("grafo/dados/arestas.csv")`; `networkx.read_gexf("grafo/dados/capitulos.gexf")`.
- **JavaScript:** `fetch("arestas.bin")` → `new Uint16Array(buf, 0, 2*N)` para os índices e `new Int16Array(buf, 4*N, N)` para os votos (N = 301.539).
- O versículo `gv` de `versiculos.csv` é o índice global: Gênesis 1:1 = 0 … Apocalipse 22:21 = 31.101.

## Créditos

Referências cruzadas: OpenBible.info (CC BY), base derivada principalmente do Treasury of Scripture Knowledge. Visualizações e código: este repositório. Ver `ATTRIBUTION.md`.
