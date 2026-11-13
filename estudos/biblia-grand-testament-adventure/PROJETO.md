# Grand Testament Adventure (série, começou em 11/11/2026)

"E se existisse um jogo com as missões da vida de Jesus?" Passagens dos evangelhos como gameplay de mundo aberto em
terceira pessoa, na Galileia e na Judeia do século I. Um reel por passagem, separado por evangelho.

## O pedido do Alex (11/11)
- 08:31: "gerar várias cenas retratando as passagens reais de Jesus dos evangelhos mais famosos, no estilo gameplay
  […] com HUD de mapa e até o mapa mesmo parecido, mas no estilo antigo, retratando a época […] takes de todas as
  passagens possíveis. […] usar aí o modo grátis do Higgs Field desses 3 dias […] separando por evangelho, por passagem."
- 08:37: o nome do jogo é "Grand Testament Adventure".
- 08:45: mandou "Paz em meio ao caos" (Marcos 4:35–41, releitura moderna, 24 s) como referência do formato. Essa
  passagem já está feita: não repetir.
- 08:51: "pense na história como um todo com no max 30s por reel completo" e "deixe bem parecido com jogo mas na época
  de Jesus".
- 09:18, sobre o primeiro piloto: "Tá muito lento e não parece o gameplay […] Tem que ser animado como se estivéssemos
  jogando com aventuras reais e tudo mais."
- 09:30, sobre o segundo teste: "Agora tá no caminho certo! E se existisse um jogo com as missões da vida de Jesus!
  Essa é a pegada!"
- 10:01, depois do piloto entregue: "Legenda viral".
- 13:45: "Retome e entregue o episódio 2 também".
- 12/11, 08:20: "Vamos retomar aos vídeos de gta Jesus! Vamos fazer dele expulsando demônios que foi pedido". Episódio 3:
  **Legião** (Marcos 5:1–20), à frente de Água feita vinho na fila. Os espíritos aparecem como fumaça escura, sem rosto
  nem criatura; o homem é selvagem, mas nunca ferido (Mc 5:5 não entra). O ponto no radar é Kursi (Gergesa no
  OpenBible), na margem leste: a BLIVRE diz "terra dos Gadarenos" e a manada cai no mar; o OpenBible liga Mc 5:1 a
  Gerasa (Jerash), longe do mar. A missão 1 cruza o lago de Cafarnaum até lá (rumo 131°, 9,3 km, medido nos pontos).
  Entregue `renders/mc-legiao.mp4`: 530 quadros (22,08 s), 20,24 MB, −14,1 LUFS, pico real −1,7 dBTP, nenhuma fala
  ouvida com detector de voz. Mudança mediana por quadro 1,33 (1,8% da luz): os takes 2 e 3 têm câmera parada (0,98 e
  0,71 nos takes, contra 6,21 do take 1 e 7 a 11 dos episódios 1 e 2); os planos mais parados rodam a 1,3x e 1,4x.
- 12/11, 08:53: "Faça um agora reunindo um pouco de tudo e o tema será! 'Agora quero ver se minha mãe não me deixa
  jogar. 🤣🤣'". `compilado.py` corta 10 trechos dos reels entregues (cada um com seu HUD, legenda e marca de
  recriação) sob a frase do Alex numa caixa branca, e grava `renders/compilado-mae.mp4`.
- 12/11, 14:18: pediu uma ideia viral ("como seria Jesus se ele vivesse hoje no mundo aberto"); 15:37: "Pode colocar
  para gerar no higgsf". Especial **Procurado**, em 3 partes de 3 takes (`cenas.py`, `procurado-1..3`): numa cidade de
  hoje, cada sinal sobe o nível de procura, como os evangelhos contam (Mc 3:6, Mc 11:18, Jo 8:6, Jo 11:53, Jo 11:57), e
  com 5 estrelas ele vai ao encontro das luzes (Jo 18:4–6). Ele mantém a túnica; todo o resto veste roupa de hoje. A
  polícia nunca saca arma e ninguém se fere. `procurado.py` desenha o HUD próprio do especial: as estrelas ao lado do
  radar, um mapa de cidade fictícia (o mesmo nas 3 partes) e as legendas literais da BLIVRE, conferidas antes de
  desenhar (`python3 -I procurado.py --check`). O take 1 da parte 1 troca de plano com uma fusão (3,83–4,25 s, medida),
  e não com um corte seco: o "corte" dele é o meio da fusão, coberto por um clarão e pelo cartão "12 HORAS ANTES".
- 12/11, 16:19: "Me entregue como está pronto já com capa e legenda": cada parte é entregue assim que passa no
  `tools/confere.py`, com a capa (quadro de 1,0 s) e a legenda gerada dos dados (`procurado.py <parte> --legenda`).
  Parte 1 entregue por volta das 16:30; parte 2 por volta das 17:00. Na parte 2:
  - o cartão de abertura cobre os primeiros 2,2 s, então a primeira missão das partes 2 e 3 não tem lugar para uma fala
    no plano a; Jo 8:7 foi para o plano b (ele se levanta) e Jo 8:11 saiu, e na parte 3 Jo 11:57 foi para o plano b e
    Jo 18:2 para o jardim;
  - o take do Lázaro saiu num plano só, sem corte: o plano b começa quando a porta do túmulo acende (4,6 s, brilho
    9 → 43 entre 4,50 e 4,67 s), e uma fala pode começar num segundo do take ("Lázaro, sai fora." em 2,9 s);
  - a primeira montagem mediu −0,8 dBTP: o limitador passou a trabalhar a 192 kHz, o que segura o pico real (−2,1 dBTP);
  - as legendas quebram as linhas com `wrap_even` (nenhuma palavra sozinha na última linha), em todos os reels a partir daqui.

  Parte 3 entregue por volta das 17:40, e com ela o especial completo. Na parte 3:
  - a quinta estrela entra quando os telões ficam vermelhos (1,35 s do take 3-1, medido pelos pixels vermelhos e pelo som);
  - o 1º take do jardim (job a4015ebf) foi descartado: um companheiro de túnica clara, cabelo comprido e barba, igual a
    ele; o pedido novo descreve os três de jeans, tênis e jaqueta escura;
  - o 2º take do jardim abre com ele de frente, rezando (o rosto aparece pela primeira vez, como cena de corte), e passa
    para a câmera atrás com uma transformação de 0,13 s, tocada a 20x (sobra 1 quadro com um leve fantasma de luz);
  - o último take pede "um passo" em vez de "fala uma palavra": o "Eu sou" de Jo 18:6 é da legenda, e o take não traz voz;
  - capa no quadro de 1,8 s (telões vermelhos e 5 estrelas), não no de 1,0 s.
- 13/11, 08:32: "Já temos novo episódio? Quero algo novo! De alto nível de jogabilidade! Esse mostrando cenas como se fossem
  jogadas mesmo! 50s total, mostrando toda Galiléia e vida de Jesus em missões e mundo aberto também" e, 08:33, "Até a
  fase final, redenção e crucificação e ressurreição". Episódio **A jornada** (`cenas.py` → `jornada`, `jornada.py`):
  7 takes de 8 s, cada um com dois planos, num reel de 50 s (o limite de 30 s continua para os outros; `tools/confere.py`
  aceita até 50,5 s só neste). Missões: os pescadores (com a abertura da região, "GALILEIA"), Caná e Cafarnaum, a
  tempestade e o andar sobre o mar, os pães e a viagem rápida até Jerusalém, a ceia e o Getsêmani, a fase final (a cruz
  levada, vista de costas, e três cruzes só em silhueta, longe: sem sangue, sem ferida, sem close) e o terceiro dia (o
  túmulo vazio e o monte na Galileia com os onze, Mt 28:16).
  - Jogabilidade desenhada pelo `jornada.py`: a tecla [E] aparece, acende quando é "apertada" e a fala entra com ela;
    contador de discípulos (2 nos pescadores, 12 na ceia, Lc 22:14) e de sinais (Caná, o paralítico, a tempestade, o
    mar, os pães); faixas de região e de capítulo; o mapa da viagem rápida cobre o corte entre os pães e a entrada, com a
    distância medida das coordenadas (Betsaida → monte das Oliveiras, 131 km em linha reta); a fase final é uma cena de
    corte (faixas pretas, sem HUD) que termina no preto, e o HUD volta no monte da Galileia.
  - O mapa da viagem rápida pega o litoral: a grade larga traz o fundo do mar (batimetria) e não fica plana como o
    lago, então o Mediterrâneo é pintado à parte (terreno abaixo de 1 m ligado à borda oeste do mapa).
  - O número do gancho ("EM 50 SEGUNDOS DE GAMEPLAY") é a duração medida do reel, arredondada.
  - 50 s a 9,5 Mbit/s passariam de 29 MB: o vídeo sai de um master quase sem perda em duas passadas, na taxa que cabe.
  - O 1º take de Caná e Cafarnaum (job 2aba6e6f) foi descartado: na casa, um homem da multidão com o cabelo, a barba e o
    manto vermelho do jogador, e o paralítico curado com o mesmo rosto. Os pedidos das missões 2, 4, 5, 6 e 7 dizem
    agora "fora o jogador, nenhum homem de cabelo comprido e ninguém de vermelho", e o paralítico é um senhor careca de
    barba grisalha; os pedidos de todos os outros takes ficaram iguais (164 de 164 comparados).

## O que a série não faz
O letreiro, a sigla e o HUD do jogo em que o pedido se inspira são marca e desenho de outra empresa: não entram aqui.
O nome por extenso, o letreiro, o radar, a linha de missão e o cartão de "missão concluída" são desenho próprio
(`hud.py`), na tipografia da série (Space Grotesk, Space Mono, Cormorant). Nenhum prompt cita o jogo: o visual é
descrito (câmera de terceira pessoa, captura de gameplay, mundo aberto).

## Formato de um reel
- Quadro 0: a pergunta da série, o título da missão e a referência, já com o HUD inteiro.
- 3 missões, uma por take de 8 s; cada take tem 2 planos com corte seco no meio (algo muda a cada ~4 s). O ritmo de
  cada episódio (`ritmo` em `episodios.py`) acelera os takes, e uma missão pode ter ritmo próprio, até por plano: um
  plano que fica parado demais roda mais rápido. O reel fica em 20–24 s (máximo pedido: 30 s).
- Em cada missão: a linha de missão (nossa, falada ao jogador), a tecla de ação quando há uma, a fala da passagem como
  legenda (texto literal da Bíblia Livre, com a referência), o contador do que a passagem conta (discípulos chamados,
  vasos, cestos) e, no fim, o visto.
- A fala entra 1 s depois do começo da missão, ou logo depois do corte do take quando é ali que ela é dita (`fala_de`),
  e pode sair antes do corte seguinte (`fala_ate`). Na missão 1 ela nunca divide a tela com o cartão de abertura.
- Radar no canto: mapa do lugar real (relevo e água do modelo de elevação, lugares do OpenBible com o nome que a
  Bíblia Livre usa), rota, destino, seguidores e a barra de progresso das 3 missões. Quando a missão 1 atravessa a
  água (`da_margem`), o jogador sai da margem atrás dele, achada no modelo de elevação, e chega ao ponto da passagem.
- Fim: "MISSÃO CONCLUÍDA", título, "RECRIAÇÃO · referência" e os créditos das fontes, por 2,6 s. Quando o desfecho
  está nos últimos segundos do take, o último quadro fica parado embaixo do cartão (`pausa`), com um avanço lento de
  3%, e o cartão cobre menos a ação.

## Regras de conteúdo
- Toda fala na tela é fragmento literal da BLIVRE do versículo citado; todo nome de lugar no radar é o que a BLIVRE
  escreve; o número de cada contador sai do versículo (lista de nomes ou a palavra do número). `tools/check.py` confere
  tudo e grava `data/passagens.json`; a legenda de cada reel sai de `tools/legenda.py`, sem número digitado.
- Só adultos nas cenas (regra do repositório: sem rostos de crianças). Deus não aparece como personagem: no máximo luz.
- Toda cena leva a marca "RECRIAÇÃO · IA" e a legenda diz que é um "e se", não um jogo que existe.
- O jogador é visto de costas; o protagonista segue a folha de personagem (`source/ref/personagem.png`).

## Como é feito
1. `passagens.py`: 38 passagens (Mateus 10, Marcos 8, Lucas 9, João 11), cada uma com a fala, o lugar e o ponto no
   mapa. `episodios.py`: as 3 missões de cada episódio. `cenas.py`: o que acontece em cada take.
2. Geração no Higgsfield (`tools/fila.py`): direto em vídeo, `seedance_2_0`, 720p, 9:16, 8 s, com som ambiente. A
   missão 1 parte só da folha de personagem; cada missão seguinte parte do último quadro do take anterior, para o
   lugar, a luz e as pessoas continuarem.
3. `hud.py`: amplia para 1080×1920, desenha o HUD, junta os takes, soma os sons da interface (sintetizados no
   próprio script) e nivela o áudio a −14 LUFS. Grava também `renders/.hud/<episódio>-tempos.json` (o que acontece
   quando: missões, legendas, emendas do som).
4. `tools/confere.py`: mede o arquivo que vai ser entregue (tamanho, quadros, duração, bytes, LUFS e pico real, cortes,
   mudança da imagem por quadro, fala ouvida pelo Whisper, estalo nas emendas do som), falha se algum limite estourar,
   e gera as folhas de contato com a caixa segura do Reels e a capa.

```bash
python3 -I tools/check.py                  # passagens, falas, lugares e contadores contra as fontes -> data/passagens.json
python3 -I tools/fila.py prox              # o próximo pedido de take (estado em data/.fila.json)
python3 -I hud.py <episódio> --still 0,10  # confere quadros;  --map mostra o mundo do radar
python3 -I hud.py <episódio>               # -> renders/<episódio>.mp4
python3 -I tools/confere.py <episódio>     # medidas, folhas de contato e capa; registra o reel em data/.fila.json
python3 -I tools/legenda.py                # -> LEGENDAS.md
python3 -I tools/fila.py publicar          # copia o estado para data/geracoes.json (o que vai para o git)
```

## Higgsfield
- Conta do dia 11/11: plano ultra em teste, 50 créditos; gerações ilimitadas grátis até 14/11 às 08:30 (horário de
  Brasília), uma imagem e um vídeo por vez. É outra conta, não a do vídeo 11 (aquela tinha 1.257,05 créditos).
- Grátis nesta janela e usado aqui: `gpt_image_2_6` (2k, qualidade média) e `seedance_2_0` (720p, até 15 s). O
  `seedance_2_5` só é grátis em 480p.
- Os ids de tudo o que foi gerado ficam em `data/geracoes.json`. Mídia gerada não vai para o git (`.gitignore`): os
  takes ficam na biblioteca do Higgsfield e os reels prontos são entregues ao Alex.

## O que aprendi no primeiro piloto (para não repetir)
- Primeira versão: quadro-chave no `gpt_image_2_6` com luz dourada e depois animação. Saiu ilustração bíblica, com 3
  planos contínuos de 8 s. Medido quadro a quadro (mudança mediana da imagem): 3,20, contra 5,78 do vídeo de
  referência, que ainda tem um corte dentro da primeira missão.
- Segunda versão: pedido como captura de gameplay, direto em vídeo, 2 planos por take. O primeiro take mediu 11,56 e o
  segundo 8,30, com o corte em 3,96 s e 3,71 s.
- A fileira de seis vasos de Caná cresce quando a câmera avança: nesses takes a câmera fica parada.
- O contorno do mar da Galileia do Natural Earth erra a margem em cerca de 1 km nessa escala (Cafarnaum caía na água):
  o radar tira a água do próprio modelo de elevação.

## O que aprendi no episódio 2
- Emendar a missão seguinte dando o take anterior como referência de vídeo não serviu: o take recomeçou da praia e
  vestiu Pedro com a roupa do protagonista. Vale o que já valia: a missão seguinte parte do último quadro.
- Quando o take anterior termina por cima do ombro do jogador, o pedido seguinte diz onde ele está no primeiro quadro
  (`heroi` em `cenas.py`) e chama o outro personagem pela roupa ("o pescador de túnica marrom-escura").
- A barra de progresso enchia o segmento da missão seguinte nos 0,8 s depois do visto e esvaziava no começo da missão
  seguinte. Estava no piloto entregue às 09:49; corrigido, e o episódio 1 foi montado de novo.
- O cartão de "missão concluída" cobria o desfecho (a calmaria e os homens de joelhos são os últimos 2 s do take 3):
  daí o `pausa`.
- O plano de "chamar Pedro" ficava 4 s quase parado: ele roda a 1,5x e o resto do take a 1,1x.
- Título em duas linhas quebra onde a linha mais longa fica mais curta ("ANDANDO / SOBRE O MAR", não "ANDANDO SOBRE O
  / MAR"). Isso mudou também a abertura do episódio 1 ("PESCADORES / DE GENTE").
- A medida de mudança da imagem depende da luz: cena noturna mede menos para o mesmo movimento. `tools/confere.py` dá
  o número absoluto e o relativo à luz do quadro.
- O número 9,28 que eu tinha registrado para o arquivo final do piloto não se reproduz. Pelo método de
  `tools/confere.py`, que dá os mesmos 5,78 para a referência e os mesmos 11,56 e 8,30 para os takes 1 e 2, o arquivo
  final do piloto mede 7,49: o HUD parado e as faixas escuras em cima e embaixo baixam a medida dos takes.
- A fila do Higgsfield ficou mais lenta à tarde: o take pedido às 13:48 só chegou às 14:04 (de manhã, 4,5 a 7 min).
- Em cena de festa à noite o modelo pendura um varal de lâmpadas e gosta de despejar líquido: o pedido diz de onde vem
  a luz ("só tochas nas paredes e lamparinas de barro nas mesas, nada pendurado no alto") e mostra a falta do vinho
  parada (copos vazios, jarro tombado e seco), sem verbo de despejar. "Câmera na altura dos olhos" trouxe o rosto do
  jogador de perfil: o pedido repete a distância ("ainda 4 metros atrás, só as costas").

## Estado (11/11, 14:27)
- Entregue: **Andando sobre o mar** (Mateus 14:22–33), `renders/mt-aguas.mp4`: 1080×1920, 24 fps, 544 quadros
  (22,667 s), 24,07 MB, −14,0 LUFS, pico real −2,0 dBTP. Medido no arquivo (`tools/confere.py`): mudança mediana por
  quadro 5,08 (8,2% da luz do quadro; a referência do Alex mede 5,78 e 6,3%), cortes em 3,79 s, 10,29 s, 16,71 s e
  18,00 s (as passagens entre missões são contínuas: cada take nasce do último quadro do anterior), nenhuma fala
  ouvida pelo Whisper com detector de voz, nenhuma emenda de som com estalo. O plano de chamar Pedro roda a 1,5x; o
  último quadro fica 1,9 s parado embaixo do cartão final. Capa: `renders/capa-mt-aguas.jpg`.
- Entregue de novo: **Pescadores de gente** (Marcos 1:16–20), `renders/mc-pescadores.mp4`, com a barra de progresso
  corrigida, o título quebrado em "PESCADORES / DE GENTE" e os créditos do cartão final com contorno: 525 quadros
  (21,875 s), 27,16 MB, −14,2 LUFS, pico real −1,8 dBTP, mudança mediana 7,46 (8,9% da luz), cortes em 3,58 s,
  10,67 s e 14,58 s. Comparado com o arquivo entregue às 09:49 (guardado em `source/v2/`, fora do git), a imagem só
  muda no título (0–2,21 s), na barra (6,50–7,29 s e 13,79–14,58 s) e nos créditos (19,38–21,88 s).
- Na fila (`cenas.py` → `ORDEM`): Água feita vinho (o take 1 já foi recusado duas vezes à tarde e está no terceiro
  pedido, das 14:38: o primeiro terminava num jarro de barro pingando; o segundo veio com um varal de lâmpadas de
  festa no céu, o rosto do jogador de perfil e um servente despejando água; os dois estão em `source/descartados/`),
  A entrada em Jerusalém, Lázaro, Cinco pães e dois peixes, O buraco no telhado, Zaqueu, A fonte de Jacó. As outras
  28 passagens ainda não têm cena escrita.
- `python3 -I tools/fila.py estado` mostra o que existe. `source/v1/` (fora do git) guarda o primeiro piloto.

## Pendências e riscos
- Ninguém ouviu os reels: o som (ambiente dos takes mais os sons da interface) foi conferido por medida.
- Os takes são 720p ampliados para 1080; o HUD é desenhado em 1080.
- Cada take é uma geração: quantidade de pessoas, objetos e gestos precisa ser conferida quadro a quadro contra o
  texto antes de montar (no piloto: os quatro discípulos e o pai que fica no barco conferem).
- O radar é um mapa da região (9 km até a borda): o jogador quase não anda nele, e o ponto de algumas passagens é
  aproximado (marcado com "≈" e explicado em `passagens.py`).
- Episódio 2, o que a recriação mostra e Mateus 14 não diz: chuva (o texto fala de vento contrário e ondas), um barco
  grande, com mastro, cordame e lanterna (maior que um barco de pesca da Galileia), e a margem de onde ele sai no
  radar (a oposta a Genesaré, na linha que passa pelo ponto do lago: suposição a partir de Mt 14:22 e 14:34). O
  número de homens no barco não é contado (o texto diz "os discípulos"). No último plano o manto aparece no ombro
  direito (a folha de personagem põe no esquerdo).
- O nome e a ideia remetem a um jogo de outra empresa. O que está aqui não usa a marca nem o desenho dela; o risco de
  marca na publicação (título, sigla, capa) é decisão do Alex.
