# biblia-conectada

Maior grafo do mundo sobre a Bíblia: esta é a meta do projeto.

Mapa navegável das ligações da Bíblia, no estilo Obsidian: livros, capítulos, versículos, lugares, pessoas, eventos e profecias, todos ligados entre si. É público, em português e montado só com fontes livres.

> **Estado em 19/10/2026:** os estudos e as fontes estão salvos. O site ainda vai ser construído. O plano completo, com fases e critérios de aceite, está em **[HANDOFF.md](HANDOFF.md)**.

## O que tem aqui

| Caminho | Conteúdo |
|---|---|
| `estudos/` | Os três vídeos do projeto, com código, dados, mídia e o vídeo final: **A Bíblia, conectada**, **Antes do Natal, já estava escrito** e **Os versículos de vocês** |
| `grafo/` | O grafo pronto para usar: 301.539 pares de versículos em CSV e binário, grafo de capítulos (CSV, GEXF para Gephi, JSON), matriz livro × livro, rankings e imagens |
| `fontes/` | Cópias exatas das bases abertas: texto bíblico em 7 línguas (português, hebraico, grego, latim, inglês, espanhol), hebraico e grego com morfologia e Strong, léxicos, versificação, lugares, pessoas, eventos e nomes próprios. Cada arquivo tem SHA-256 e licença conferida; índice em `fontes/catalogo.json` |
| `design/` | Direção visual do site (tokens com contraste conferido, layout, interação) e referências |
| `scripts/fetch_sources.sh` | Baixa as fontes de novo e confere com as cópias |
| branch `film-intermediates` | Masters e mixagens dos vídeos (cerca de 530 MB). Fica fora do `main` pra o clone continuar leve |

![A Bíblia inteira como arcos](grafo/imagens/biblia-arcos.png)

## Números (calculados por código a partir das fontes)

- 66 livros, 1.189 capítulos, 31.102 versículos.
- 344.799 referências cruzadas (OpenBible.info), que formam 301.584 pares únicos de versículos.
- 30.303 versículos têm pelo menos uma ligação.
- O versículo mais ligado é **Isaías 9:6**, com 212. Depois vêm 1 Pedro 2:9 (194), Mateus 28:20 (169), Tito 2:14 (157), Apocalipse 5:9 e Apocalipse 11:15 (156 cada).
- 67.293 pares cruzam o Antigo e o Novo Testamento. O par mais votado é Isaías 41:10 ↔ Filipenses 4:13 (1.477 votos).
- Os 100 mais ligados, os pares mais votados, os capítulos e os livros: `grafo/RANKINGS.md`.

## Créditos

O texto bíblico do site vem da Bíblia Livre (BLIVRE, CC BY 4.0) e de outras traduções abertas; o hebraico e o grego vêm do OSHB, do SBLGNT/MorphGNT e do STEPBible. Traduções protegidas (ACF, NVI, ARA etc.) não entram no repositório. Créditos e licenças completos: **[ATTRIBUTION.md](ATTRIBUTION.md)**.
