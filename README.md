# biblia-conectada

Maior grafo do mundo sobre a Bíblia: esta é a meta do projeto.

Mapa navegável das ligações da Bíblia, no estilo Obsidian: livros, capítulos, versículos, lugares, pessoas, eventos e profecias, todos ligados entre si. É público, em português e montado só com fontes livres.

> **Estado em 19/10/2026:** os estudos e as fontes estão salvos. O site começou em `site/` (Next.js), com o pipeline de dados e os testes das Fases 0 e 1. O plano completo, com fases e critérios de aceite, está em **[HANDOFF.md](HANDOFF.md)**.

## O que tem aqui

| Caminho | Conteúdo |
|---|---|
| `estudos/` | Os dois vídeos que deram origem ao projeto, com código, dados, mídia e o vídeo final: **A Bíblia, conectada** e **Antes do Natal, já estava escrito** |
| `fontes/` | Cópias exatas das bases abertas: traduções livres em português, referências de lugares, pessoas, eventos e nomes próprios. Cada arquivo tem SHA-256 |
| `design/` | Direção visual do site (tokens com contraste conferido, layout, interação) e referências |
| `site/` | O site (Next.js) e o pipeline que gera os dados dele a partir de `fontes/` e `estudos/*/data/`. Comandos em `site/README.md` |
| `scripts/fetch_sources.sh` | Baixa as fontes de novo e confere com as cópias |
| branch `film-intermediates` | Masters e mixagens dos vídeos (cerca de 530 MB). Fica fora do `main` pra o clone continuar leve |

## Números (calculados por código a partir das fontes)

- 66 livros, 1.189 capítulos, 31.102 versículos.
- 344.799 referências cruzadas (OpenBible.info), que formam 301.584 pares únicos de versículos.
- 30.303 versículos têm pelo menos uma ligação.
- O versículo mais ligado é **Isaías 9:6**, com 212. Depois vêm 1 Pedro 2:9 (194), Mateus 28:20 (169) e Tito 2:14 (157). Em quinto há um empate em 156: Isaías 41:10, Apocalipse 5:9 e Apocalipse 11:15.
- "Ligações" de um versículo são os outros versículos ligados a ele, contados uma vez cada, com qualquer voto. Os testes em `site/tests/` conferem todos esses números.

## Créditos

O texto bíblico do site vem da Bíblia Livre (BLIVRE, CC BY 4.0) e de outras traduções abertas. Traduções protegidas (ACF, NVI, ARA etc.) não entram no repositório. Créditos e licenças completos: **[ATTRIBUTION.md](ATTRIBUTION.md)**.

## Licença

Código: MIT ([LICENSE](LICENSE)). Dados derivados gerados pelo projeto: CC BY-SA 4.0 ([LICENSE-DATA.md](LICENSE-DATA.md)). As fontes de terceiros mantêm as licenças delas.
