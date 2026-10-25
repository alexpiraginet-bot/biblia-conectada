# "A outra marca" (vídeo 8, 25/10/2026)

Pedido do Alex (25/10, 18:20, dia do 2º turno): "um polêmico com ligação política do Apocalipse 13 com o Apocalipse 22!
Relacionando aos partidos hoje em disputa". Depois: "Faz" e "Muito movimento e cortes marcantes".

## A decisão
O vídeo não diz que um partido ou candidato é a besta. O texto não diz isso, a regra do projeto é só afirmar o que dá para
mostrar, e no dia da votação seria propaganda contra candidato (Lei 9.504/97, art. 39, §5º; não é parecer jurídico). O
polêmico que ficou é o que o texto sustenta e que bate nos dois lados: cada lado chama o outro de besta, mas a marca fica
na mão e na testa, o lugar onde Deuteronômio 6:8 manda atar a palavra de Deus; a besta pede adoração do poder; e o último
capítulo da Bíblia põe um nome de volta na testa. Postar só depois do resultado (sugestão em `LEGENDA.md`).

## Entregáveis
- `renders/a-outra-marca.mp4`: 1080×1920, 60 fps, 3.075 quadros (51,25 s), 27,54 MB. Áudio medido no AAC: −14,1 LUFS,
  pico real −1,9 dBTP (`renders/.film/render.log`). A voz fica 10 a 21 dB acima da trilha em cada fala (mediana 14,5).
- Conferência: `tools/check.py` ALL OK; `tools/verify_audio.py`: o Whisper ouve o vídeo pronto e acerta 98,4% do roteiro
  em ordem; diferenças só de grafia ("pro"/"pra" ouvidos como "para o"/"para"). Ninguém ouviu de ouvido ainda.
- `renders/capa-a-outra-marca.jpg`: o fim da fala 14, "É QUAL NOME ESTÁ NA SUA TESTA?" (ouro na última linha).
- `LEGENDA.md`: legenda, comentário fixado e três respostas prontas (indireta a partido, chip/vacina, "22:4 não fala de marca").

## O que o vídeo diz e de onde vem (`data/stats.json`, `tools/analyze.py`)
| Fala | Dado |
|---|---|
| "Na mão direita. Ou na testa." | Ap 13:16 (BLIVRE: "sobre sua mão direita ou sobre suas testas") |
| "Deuteronômio 6 … por sinal em tua mão, entre teus olhos" | Ap 13:16 ↔ Dt 6:8, 9 votos (site e base); Dt 6:8 ata "estas palavras" de Dt 6:6 |
| "E o que a besta quer? Adoração." | Ap 13:4, 13:8, 13:12 e 13:15: os quatro versos do capítulo com "adorar" |
| "Quem é semelhante à besta? Quem pode batalhar contra ela?" | Ap 13:4, literal |
| "E o nome dele estará em suas testas." | Ap 22:4, literal; Ap 13:17 ↔ Ap 22:4, 6 votos, o par mais votado entre os capítulos 13 e 22 |
| contador 13 → 22 | os capítulos dos dois versos da ligação, lidos de `script.PAIRS` |

`tools/check.py` também falha se aparecer partido, candidato ou rótulo ideológico na narração, no `data.json` ou no
`Main.tsx`, ou vermelho/verde na paleta (cores de partido). A paleta é noite, papel e ouro.

## Forma
- 60 fps. Um plano por fala ou por palavra-chave, sempre começando na palavra dita (`narr.json`): corte seco, punch-in de
  7–16%, tremida e flash de 1–3 quadros nos impactos, planos "invertidos" (papel claro, tinta escura) nas batidas,
  chicote com desfoque de movimento nas viradas, varredura de luz em cada plano.
- Tipografia cinética em Space Grotesk 700 caixa-alta: as palavras da frase aparecem em "fantasma" (13%) e batem na tela
  quando são ditas (escala 1,45 → 1, desfoque → nítido). Citações em Newsreader itálico.
- Peças: carimbo circular (a marca), risco de ouro sobre "UM CHIP." e "EM QUEM VOCÊ VOTOU", tela dividida com setas que
  apontam uma para a outra ("o outro lado") e depois para fora ("de qualquer lado"), contador de capítulos que roda de
  13 a 22 como um caça-níquel, cartão de ligação (referência, linha de luz, votos contando, referência).
- Quadro 0 é o gancho: "TODO ANO DE ELEIÇÃO" já inteiro na tela, sem flash.

## Som (`score.py`)
Pulso em ré menor (pluck grave a cada tempo, tique no contratempo, bumbo a cada dois) que acelera na pergunta da linha 5;
clique em cada corte, sub e whoosh em cada impacto, braam nos grandes; Ap 13:4 corta o pulso para um ronco; o contador
dá um tique por capítulo (mesma curva do `Roll` do `Main.tsx`) com subida; Ap 22:4 abre ré maior com sinos; o fim fecha
em ré maior. Música abaixada sob a voz (1 − 0,82·duck); efeitos só pela metade, para os cortes baterem.

## Narração
Andre (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), tomada 3 inteira, ritmo 1,00–1,10.

## Como rodar
```bash
python3 -I tools/analyze.py            # data/stats.json (afirma cada número e cada citação)
python3 -I tools/takes.py              # pontua as 3 tomadas (source/narr/)
python3 -I narration.py                # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py        # motion/src/data.json
python3 -I tools/check.py              # fala = tela = dados = BLIVRE; nenhum partido
python3 score.py                       # renders/.film/mix.wav
bash renders/.film/run.sh              # render (Remotion, ~10 min) + capa + finalize + verify_audio
```
`motion/node_modules` é um link para o do vídeo 7 (fora do git).
