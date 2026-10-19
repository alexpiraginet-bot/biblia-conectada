# Referências

## 21st.dev (busca de 19/10/2026 pelo MCP do 21st; só metadados)

**Sobre o código desses componentes:**
- Baixar o código custa uma das retiradas diárias do plano do 21st.
- O comando de instalação usa `API_KEY_21ST`, que nunca vai pro repo.
- Quase todos são SVG/D3, feitos pra dezenas ou centenas de nós. Pra 1.189 estrelas e 301.584 arcos, use como referência visual e de interação, e implemente em WebGL.

| Para | Componente | Link | O que aproveitar |
|---|---|---|---|
| Grafo | Note Graph (astralyxdev) | https://21st.dev/@astralyxdev/components/note-graph | Grafo estilo vault: tamanho do nó = nº de ligações, órfãos vazados |
| Grafo | Knowledge Graph (heygaia) | https://21st.dev/@heygaia/components/knowledge-graph | Zoom, pan, arrastar, tooltip, exportar SVG/PNG |
| Grafo | neurons hero (dhileepkumargm) | https://21st.dev/@dhileepkumargm/components/neurons-hero | Pulso de luz correndo pela ligação (ligação "acendendo") |
| Grafo | InteractiveSynapseNetwork (dhileepkumargm) | https://21st.dev/@dhileepkumargm/components/interactive-synapse-network | Sinal percorrendo a rede em canvas |
| Busca | Command Menu with Global Search (ephraimduncan) | https://21st.dev/@ephraimduncan/components/command-menu-04 | Filtros por tipo + recentes (versículo/lugar/pessoa/estudo) |
| Busca | Command Menu (uvain, cmdk) | https://21st.dev/@uvain/components/command-menu-palette | ⌘K com busca difusa, grupos, atalhos |
| Busca | Command (wensity) | https://21st.dev/@wensity/components/command | Páginas aninhadas dentro da paleta |
| Busca | Command Palette (rafa-porto) | https://21st.dev/@rafa-porto/components/command-palette | Estilo Raycast, busca global |
| Prévia | Hover Card (shadcn) | https://21st.dev/@shadcn/components/hover-card | Prévia do versículo ligado |
| Prévia | Hover Card (kuratlielia) | https://21st.dev/@kuratlielia/components/hover-card | Abre também por foco de teclado (acessível) |
| Prévia | Hover Link Preview (preetsuthar17) | https://21st.dev/@preetsuthar17/components/hover-link-preview | Prévia do destino do link |
| Navegação | Branching Tree Nav (arunachalam) | https://21st.dev/@arunachalam/components/branching-tree-nav | Árvore livros → capítulos com linhas de ramo |
| Leitura | Proximity Sidebar (amitgajare2) | https://21st.dev/@amitgajare2/components/proximity-sidebar | Minimapa do capítulo (marcas crescem ao aproximar) |
| Leitura | Article With Author Sidebar (olewandowski1) | https://21st.dev/@olewandowski1/components/article-5 | Texto + coluna fixa (vira o painel de ligações) |
| Estudos | Project Index (ssychui) | https://21st.dev/@ssychui/components/project-index | Lista com capa que segue o cursor (lista de estudos) |
| Mapa | mapcn MarkerContent / MarkerTooltip / MarkerLabel | https://21st.dev/@mapcn/components/mapcn-marker-content | Marcadores e rótulos em MapLibre |
| Mapa | Location Map (Mazyar kawa) | https://21st.dev/@Mazyar%20kawa/components/location-map | Marcadores pulsando, transições suaves |
| Dados | Chords (airbnb-visx) | https://21st.dev/@airbnb-visx/components/chords | Livro × livro em acorde |
| Dados | Sunburst Chart (klyv-ui) | https://21st.dev/@klyv-ui/components/sunburst-chart | Estrutura da Bíblia em anéis com zoom e trilha de volta |

Busca por tema escuro "navy/gold/editorial" no 21st: nenhum resultado. Os tokens ficam em `design/README.md` §3.

## Outras referências

- **Chris Harrison & Christoph Römhild (2007):** "Bible Cross-References", arcos de 63.779 referências. Citado no vídeo 1, `N_2007` em `estudos/biblia-referencias/film.py`.
- **Viz.Bible:** visualizações sobre os dados do Theographic (https://viz.bible). A base está em `fontes/theographic/`.
- **OpenBible.info Labs:** referências cruzadas e geocodificação, as bases dos vídeos e do site.
- **STEPBible** (www.STEPBible.org): nomes próprios, textos marcados com Strong, léxicos. TIPNR em `fontes/stepbible/`.
- **Obsidian:** graph view, local graph, backlinks e hover preview. É o modelo de navegação pedido pelo Alex.
