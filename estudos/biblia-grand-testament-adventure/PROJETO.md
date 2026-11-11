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

## O que a série não faz
O letreiro, a sigla e o HUD do jogo em que o pedido se inspira são marca e desenho de outra empresa: não entram aqui.
O nome por extenso, o letreiro, o radar, a linha de missão e o cartão de "missão concluída" são desenho próprio
(`hud.py`), na tipografia da série (Space Grotesk, Space Mono, Cormorant). Nenhum prompt cita o jogo: o visual é
descrito (câmera de terceira pessoa, captura de gameplay, mundo aberto).

## Formato de um reel
- Quadro 0: a pergunta da série, o título da missão e a referência, já com o HUD inteiro.
- 3 missões, uma por take de 8 s; cada take tem 2 planos com corte seco no meio (algo muda a cada ~4 s). O ritmo de
  cada episódio (`ritmo` em `episodios.py`) acelera os takes; o reel fica em 20–24 s (máximo pedido: 30 s).
- Em cada missão: a linha de missão (nossa, falada ao jogador), a tecla de ação quando há uma, a fala da passagem como
  legenda (texto literal da Bíblia Livre, com a referência), o contador do que a passagem conta (discípulos chamados,
  vasos, cestos) e, no fim, o visto.
- Radar no canto: mapa do lugar real (relevo e água do modelo de elevação, lugares do OpenBible com o nome que a
  Bíblia Livre usa), rota, destino, seguidores e a barra de progresso das 3 missões.
- Fim: "MISSÃO CONCLUÍDA", título, "RECRIAÇÃO · referência" e os créditos das fontes.

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
   próprio script) e nivela o áudio a −14 LUFS.

```bash
python3 -I tools/check.py                  # passagens, falas, lugares e contadores contra as fontes -> data/passagens.json
python3 -I tools/fila.py prox              # o próximo pedido de take (estado em data/.fila.json)
python3 -I hud.py <episódio> --still 0,10  # confere quadros;  --map mostra o mundo do radar
python3 -I hud.py <episódio>               # -> renders/<episódio>.mp4
python3 -I tools/legenda.py                # -> LEGENDAS.md
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

## Estado (11/11, 09:55)
- Entregue: **Pescadores de gente** (Marcos 1:16–20), `renders/mc-pescadores.mp4`: 1080×1920, 24 fps, 525 quadros
  (21,875 s), 27,17 MB, −14,2 LUFS, pico real −1,8 dBTP. Medido no arquivo: mudança mediana por quadro 9,28 (a
  referência tem 5,78), cortes em 3,58 s, 10,67 s e 14,58 s (a passagem da missão 1 para a 2 é contínua, porque o take
  2 nasce do último quadro do take 1). O Whisper não acha fala no áudio. Capa: `renders/capa-mc-pescadores.jpg`.
- Na fila (`cenas.py` → `ORDEM`): Andando sobre o mar, Água feita vinho, A entrada em Jerusalém, Lázaro, Cinco pães e
  dois peixes, O buraco no telhado, Zaqueu, A fonte de Jacó. As outras 28 passagens ainda não têm cena escrita.
- Em teste: emendar a missão seguinte usando o take anterior como referência de vídeo (sem subir o último quadro).
- `python3 -I tools/fila.py estado` mostra o que existe. `source/v1/` (fora do git) guarda o primeiro piloto.

## Pendências e riscos
- Ninguém ouviu os reels: o som (ambiente dos takes mais os sons da interface) foi conferido por medida.
- Os takes são 720p ampliados para 1080; o HUD é desenhado em 1080.
- Cada take é uma geração: quantidade de pessoas, objetos e gestos precisa ser conferida quadro a quadro contra o
  texto antes de montar (no piloto: os quatro discípulos e o pai que fica no barco conferem).
- O radar é um mapa da região (9 km até a borda): o jogador quase não anda nele, e o ponto de algumas passagens é
  aproximado (marcado com "≈" e explicado em `passagens.py`).
- O nome e a ideia remetem a um jogo de outra empresa. O que está aqui não usa a marca nem o desenho dela; o risco de
  marca na publicação (título, sigla, capa) é decisão do Alex.
