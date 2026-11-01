# Uma Palavra. Novos caminhos.

Direção aprovada por Alex em 01/11/2026: Dia deve parecer dia. Céu de amanhecer, vale e nuvens convivem com a assinatura bordô e dourada. A correção mais recente pede **minimalismo premium: controles discretos e leitura protagonista**, mantendo vidro e reflexos suaves. A primeira versão plana foi substituída antes da publicação pela paisagem e pelas esferas de cristal mais próximas do storyboard aprovado.

## Nesta entrega

- Abertura nativa, com título selecionável, links reais, controles por teclado e alvos de toque de pelo menos 44 px. A imagem não contém textos, botões, nós nem linhas.
- João 1 ligado a Gênesis 1, Colossenses 1 e Salmos 33, somente se a aresta correspondente existir no mesmo grafo BLIVRE/OpenBible do atlas. A posição é editorial; não representa distância histórica.
- As esferas são links reais: toque inicia a viagem e abre `/encontro/joao-1/...`. Foco/toque reiniciam partículas douradas no fio selecionado; cabeça e rastro percorrem a mesma curva SVG. Pulso ambiente de 2,8 s e travessia de página de 1 s têm funções distintas.
- Pausa manual, preferência de movimento reduzido e pausa fora da tela ou em aba oculta. Sem WebGL ou biblioteca de animação adicional na abertura.
- **Sistema é o padrão de novos visitantes**, inclusive sem JavaScript ou com armazenamento bloqueado. A aparência acompanha mudanças claras/escuras do aparelho. Dia ou Noite escolhidos manualmente continuam salvos e respeitados. Dia usa a paisagem clara; Noite conserva leitura clara sobre céu discreto e escuro.
- A chegada mostra as duas passagens reais, número derivado de conexões, leitura lado a lado, IA, conexões e compartilhamento. A viagem não altera o texto bíblico.
- Atalhos para liturgia, Coração, constelação completa, arcos e mapa. O atlas de Isaías 9 e seus números derivados continuam no fim da página.

## Arte e procedência

Paisagens imaginadas, esfera de cristal e túnel gerados com a ferramenta integrada `image_gen` em 01/11/2026. Não representam reconstrução histórica, lugar real ou passagem bíblica. Sem pessoas ou texto dentro da arte. Texto, versículos, rótulos, pulsos e controles permanecem nativos.

Direção de produção: amanhecer azul/pérola, luz dourada discreta, montanhas e vale entre nuvens; espaço para tipografia bordô, sem UI na imagem. Esfera transparente com refração e borda dourada. Túnel de anéis de vidro e ouro sobre o mesmo vale, ponto de fuga à direita, sem rótulos incorporados.

Originais preservados em `C:/Users/R2/.codex/generated_images/01a15a31-4795-7dc2-b8a3-9529afb4fe17/`: `exec-cf291739-9032-413f-9e3e-c452ac1f6fa5.png` (vale vertical), `exec-12d5aed1-537b-414c-a892-643fd7cb52a3.png` (vale horizontal), `exec-19ec3374-a2eb-4d0a-a28c-07128ff2ec27.png` (esfera transparente) e `exec-7d82d3b8-a427-4f3b-af9c-782bd6e20637.png` (túnel). O primeiro céu `exec-89679d37-d5e0-4862-bd6d-f397c870a7e6.png` e os WebP `dawn-768`/`dawn-1536` continuam preservados, mas não são mais usados nesta abertura.

Derivados por Sharp, apenas tamanho/codec, em `site/public/home/`:

| Arquivo | Dimensão | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `dawn-valley-mobile-v2.webp` | 960 × 1440 | 125878 | `08874d0fb66699a597f6506147bd5b357e997aa5eee2883bd15c1a34e98cb86b` |
| `dawn-valley-wide-v2.webp` | 1536 × 1024 | 113754 | `7808e8c436c3c85ca226d256e95a14e887b78de2b4f12418c0d4773335e892a5` |
| `crystal-orb-v2.webp` | 400 × 400, alfa | 44924 | `fbae4d731f25735d82faeb73cf5e8bcb94663666e98c93637e91bb6f6814f7c0` |
| `golden-passage-v2.webp` | 960 × 1440 | 228478 | `a389220c1e71cab247b45da76bccb7f72be054903f5294d1ccf9449fd8dbed01` |
| `share-valley-v2.jpg` | 1024 × 1536 | 222201 | `c2ce4b294a607e29936895eac6e9364d90cb520378b95007af3cb692e2fa8725` |
| `share-tunnel-v2.jpg` | 1024 × 1536 | 325718 | `1be687d70863a1234274e930c127ef5d832a81d4d7cb553e43e0329315687a4c` |

## Travessia de luz em 1 segundo

**Aprovada explicitamente e implementada nesta revisão.** Storyboard preservado como `proposta-travessia-1s.png` na pasta local de evidências desta rodada. O storyboard define a atmosfera; logo, tipografia e passagens reais são os do app.

- No toque, o módulo sob demanda abre a camada visual; a navegação inicia em 125 ms, enquanto anéis e partículas avançam pelo túnel.
- A animação termina em 1000 ms, sem aguardar rede e sem loop. Se a rota ainda não chegou, o botão indica “Abrindo a conexão…” até a navegação concluir.
- A chegada é estável, com título focado e duas passagens reais. A função restaura foco, rolagem e interatividade ao concluir, pular, voltar, ocultar a aba ou ativar movimento reduzido.
- Viagem simbólica, sem datas históricas inventadas ou promessa de simulação quântica. Texto bíblico nunca deforma nem se torna partícula.
- Pular e Escape encerram imediatamente. Movimento reduzido abre direto, sem túnel. A camada usa Canvas 2D com resolução limitada e cenário WebP; não instala motor 3D. O cenário é pré-aquecido quando a abertura está visível em rede normal; economia de dados/2G impedem esse download especulativo. Se o módulo visual ainda não está pronto, o toque abre a passagem imediatamente, sem esperar o efeito nem mostrar um túnel atrasado.
- Links comuns continuam funcionando sem JavaScript. O antigo fallback de streaming que escondia a chegada sem JS foi removido; a navegação lenta conserva indicação no botão.

## Compartilhar a Palavra e as conexões

- Versículo ou leitura do dia: vale de amanhecer. Conexão: túnel dourado, com as duas referências verdadeiras. Textos vêm somente da fonte validada, nunca da arte nem de parâmetros arbitrários do visitante.
- Stories 1080 × 1920, Post 1080 × 1350 e capa horizontal 1200 × 630; área clara translúcida de leitura (84% após o refinamento de Alex), carimbo discreto com Bíblia Conectada e domínio sobre bordô, e créditos da edição em tinta escura.
- Data e edição são preservadas no link da liturgia. Open NBV mantém avisos e limites de alinhamento; capa diária de contexto não inventa citação. Trechos abreviados são identificados.
- O editor carrega ao abrir as ações. A imagem fica pronta antes do toque explícito para o compartilhamento nativo; há baixar PNG, copiar link e WhatsApp. Instagram depende dos destinos disponibilizados pelo aparelho, sem promessa de postagem automática.
- A nova sessão de Motion criada a pedido de Alex usa essas artes e o vídeo fornecido no Drive, preservando narração/roteiro. A produção do vídeo é separada da implantação do site.

## Próximas melhorias propostas para o app

As propostas abaixo não são funcionalidades novas já publicadas. Priorizam melhorar as ferramentas existentes.

| Prioridade | Área | Mudança proposta | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Leitura | Um toque no versículo revela uma barra compacta: Conexões, Entender, Ouvir, Compartilhar. Mostrar a tradução e preservar a posição ao fechar qualquer painel. | Mais texto na tela, sem procurar ações entre vários botões repetidos. |
| 1 | Arcos | Painel de leitura com alturas curta, média e ampliada; contagem real sempre junto à referência. Seleção por toque acende somente a vizinhança e seus pulsos. | Equilíbrio entre céu e leitura; a relação continua visível ao estudar. |
| 1 | Menu | Mesma cápsula bordô de vidro em todas as áreas, grupos claros e atalhos recentes. Em leitura, reduzir controles sem esconder a única saída. | Uma identidade e acesso previsível a todas as funções. |
| 2 | Liturgia | Navegação por Primeira leitura, Salmo, Segunda leitura quando houver e Evangelho; avanço discreto e conclusão do dia. Manter conexões, edição, compartilhamento e fontes junto ao texto. | Um ritmo diário fácil de acompanhar sem transformar a leitura em um formulário. |
| 2 | Mapa e cronologia | Um episódio selecionado sincroniza lugar, etapa cronológica e relatos dos evangelhos. Rota percorrida iluminada e próximo passo visível. | Entender onde a história acontece e como seguir, sem confundir localização aproximada com certeza histórica. |
| 2 | Coração e IA | Perguntas sugeridas ligadas ao contexto, referências clicáveis próximas de cada afirmação e áudio com estado claro de preparação/reprodução. | Conversa acolhedora que volta às fontes, sem alegar autoridade divina da IA. |
| 3 | Jornada | Calendário de constância, próximo marco explicável e revisão do que foi aprendido. Recompensar aprendizado com regras transparentes; manter a distinção entre pontos locais e validação de futuros presentes. | Vontade de voltar sem prometer um prêmio ainda indisponível. |
| 3 | Interlinear e salvos | Palavra selecionada com original, transliteração e glosa na mesma coluna; organizar salvos em caminhos pessoais de leitura. | Aprofundamento progressivo, com limites editoriais visíveis. |

Critérios comuns: bordô e ouro nos controles; superfícies claras de leitura no Dia; contraste, teclado, toque e movimento reduzido verificados. Nenhuma nova tradução protegida, chamada paga de IA, notificação ou conta é necessária para esta rodada visual.
