# Grafo ilustrado e cronologia editorial — parecer verificado

## Base existente

Inspeção do código, manifesto, arquivos e build local em 20/10/2026. Nenhum arquivo de aplicação foi alterado nesta revisão.

- `site/src/data/medalhoes.json` contém 20 símbolos, cada um em 96 e 192 px. Os 40 arquivos existem e seus SHA-256 conferem com o manifesto. Todos os arquivos de 192 px somam 92.216 bytes; os oito grupos usados pelo grafo somam apenas 32.664 bytes.
- Os oito medalhões de livros foram inspecionados visualmente: gravura dourada em fundo azul muito escuro `#051219`, silhuetas legíveis e espaço próprio para corte circular.
- `site/src/lib/medalhoes.ts` é `server-only`: devolver somente caminhos, label e alt como props; não enviar o manifesto com prompts/proveniência ao cliente.
- `site/src/lib/explore/living-graph.ts` continua sendo a fonte dos nós, textos, votos e pares. A build local expõe 53 capítulos reais. O arquivo `immersive-node-assets.json` registra o mapeamento completo dos 53 IDs aos assets, extraído do HTML compilado.

## Mapeamento concreto

Os símbolos representam **grupos de livros**, não cenas específicas de cada capítulo.

| Grupo | Nós nesta janela | Símbolo existente | Arquivo |
| --- | ---: | --- | --- |
| Profetas | 12 | Ramo de amendoeira | `/medalhoes/profetas-192.webp` |
| Evangelhos | 10 | Pães e peixes | `/medalhoes/evangelhos-192.webp` |
| Cartas | 6 | Carta selada | `/medalhoes/cartas-192.webp` |
| Apocalipse | 5 | Porta aberta no céu | `/medalhoes/apocalipse-192.webp` |
| Poesia | 5 | Lira | `/medalhoes/poesia-192.webp` |
| Pentateuco | 5 | Rolo fechado | `/medalhoes/pentateuco-192.webp` |
| Históricos | 5 | Coroa | `/medalhoes/historicos-192.webp` |
| Atos | 5 | Navio a vela | `/medalhoes/atos-192.webp` |

Exemplos: Isaías 9 (ID 687), Isaías 7 (685) e Jeremias 23 (767) usam Profetas; Lucas 2 (974), Mateus 4 (932), João 1 (997), Lucas 1 (973) e Mateus 1 (929) usam Evangelhos. Conservar o nome do capítulo junto ao símbolo. Um medalhão de pães e peixes junto a Lucas 2 precisa da legenda de categoria; não pode ser apresentado como uma cena do nascimento.

Os outros 12 símbolos são Cidade, Região, Monte, Água, Vale, Construção, Acampamento, Ilha, Caminho, Pessoa, Povo e Evento. Eles servem a entidades desses tipos; não devem criar pessoas ou lugares fictícios dentro do grafo de capítulos.

## Composição recomendada

1. **Fazer a gravura trabalhar em escala legível.** Começar com centro e capítulos proeminentes ilustrados; os pontos secundários mantêm uma presença discreta e revelam o medalhão ao foco/seleção ou com mais zoom. Cinquenta e três círculos igualmente grandes e repetidos seriam uma parede de ícones. O crescimento visual não deve aumentar hit targets sobrepostos nem mudar o capítulo sob o dedo.
2. **Ouro para relação, creme para leitura, mint apenas como apoio.** O fundo do grafo próximo ao navy dos arquivos evita retângulos aparentes. O ouro pertence às arestas ativas, aos contornos e às gravuras. Texto longo continua creme; o estado selecionado precisa também de contorno/rótulo, sem depender só de cor. O fundo claro da cronologia pode reaproveitar o mesmo creme, serifas, bordas finas, botões e espaçamento.
3. **Movimento que responde à exploração.** Uma ativação curta ilumina as arestas reais do capítulo; após isso, a leitura fica estável. Não mover continuamente os nós sob o cursor. `prefers-reduced-motion` deve retirar pulsos, deslocamentos e transições de câmera sem retirar o destaque estático. A força da linha continua ligada aos votos reais.
4. **Preservar a linguagem de interação já validada.** Hover/foco destaca; toque seleciona e abre trecho; setas percorrem; Enter seleciona; Escape restaura. Manter lista equivalente, zoom, retorno à visão inicial e hit-test geométrico. No celular, priorizar um trecho selecionado legível e referências próximas; não prender o scroll vertical.
5. **A cronologia é outra escala da mesma história.** As ilustrações narrativas em `/journey` são apropriadas aos episódios e devem continuar rotuladas “Recriação”. A imagem circular do episódio pode alimentar ramos aos evangelhos; linha sólida significa relato e tracejada significa relação, sempre com legenda textual. Não ligar um evangelho só para obter simetria. Na tela estreita, o episódio/texto precisam continuar alcançáveis mesmo quando a sequência horizontal exige deslize.

Primeiro risco a testar: colisão de medalhões e rótulos ao adaptar o grafo para 375 px, especialmente Mateus 4 e João 8. Aceitação: toque no centro visual de cada um seleciona o capítulo correto em zoom 1 e 1,2; setas + Enter alcançam a mesma seleção; o trecho e a contagem permanecem derivados dos dados reais.

## O que os caminhos existentes já oferecem

- **`/explorar/isaias/9`** é a base existente mais próxima do grafo de medalhões: atlas radial, selo central e oito grupos ilustrados com capítulos mais votados ao redor. `AtlasMap.tsx` já declara “Ilustração por grupo de livros” e explica linhas/votos. Melhor referência interna para reaproveitar gravura, legenda e semântica.
- **`/arcos`** é a escultura 3D da Bíblia inteira. A geometria usa o eixo canônico e arcos; a imagem mostra o volume luminoso sobre esse eixo, não um anel de 53 capítulos. Possui giro, zoom, busca por palavra/caminho, seleção de passagem e fallback. Link recomendado: “Ver o céu completo”.
- **`/arcos/plano`** é a vista 2D de arcos semicirculares sobre uma linha de capítulos, incluindo pôster/listas sem WebGL. Link recomendado como alternativa “Ver em 2D”.
- Os dois céus completos partem dos mesmos números gerados: 66 livros, 1.189 capítulos, 31.102 versículos e 301.539 pares entre versículos diferentes. O grafo de 53 nós é uma janela de exploração; não deve ser descrito como a Bíblia inteira.
- Atalho contextual já suportado pela escultura: `/arcos#isaias/9/6`. Não é necessário redesenhar o céu completo para acrescentar a nova apresentação de capítulos ilustrados.

## Integração por etapas

Primeiro integrar a camada ilustrada no grafo preservando dados e controles. Depois a composição da cronologia. Em cada etapa verificar desktop, 375 px, teclado e redução de movimento, e só então integrar na branch principal. Esta recomendação não altera a autorização de merge/publicação definida pelo usuário.

## Parecer local

Consulta limitada ao Gemma local concluída em 26,3 s, salva em `gemma-immersive-art-direction.json`, com prompt em `gemma-immersive-art-direction-prompt.txt`. O limite de 650 tokens encerrou a saída após quatro críticas completas e o início da quinta; não houve uma crítica integral de cinco pontos. A primeira tentativa havia expirado enquanto outra tarefa usava o runner; a tentativa útil foi sequencial, e o modelo já foi descarregado.

Conferência humana do parecer:

- **Adotado:** evitar colisões e trabalhar hierarquia/zoom progressivo; não identificar cenas usando apenas o símbolo do grupo. Isso coincide com os assets e com o problema de seleção móvel já reproduzido e corrigido.
- **Adotado com limite:** ouro como destaque e texto escuro no pergaminho. O modelo não mediu contraste; nenhuma conformidade de contraste foi certificada por ele.
- **Já existente:** toque seleciona/mostra o trecho e a navegação acontece por link explícito; preservar esse comportamento e o foco de teclado, sem inventar uma nova etapa de toque.
- **Não adotado:** aura/relevo como obrigação e a expressão “Luxo Arqueológico Moderno”. Acrescentariam ornamentação ou posicionamento que não são requisitos do usuário.
- **Não inferir relevância teológica:** qualquer escala de nó ou força de linha continua baseada nos dados definidos pelo produto (votos/pares), ou é explicitamente uma hierarquia visual. “Relevância” genérica sugerida pelo modelo não justifica alterar os pesos.

Sugestões de modelo são pareceres auxiliares; os fatos e mapeamentos deste documento foram conferidos diretamente nos arquivos e na build.
