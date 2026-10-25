# "O Antigo dentro do Novo" (vídeo 6, 25/10/2026)

Pedido do Alex (25/10), junto com o print de um post que mostrava o gráfico do Dr. Ben Gladd (Carson Center / The Gospel
Coalition, versão 3.0): "Seguindo mesmo conceito de roteiro e gancho do nosso vídeo 1, que começa com 'isso não é um
arco-íris', quero fazer um agora sobre esse tema com esse visual, com muito movimento! Motion, scroll para alta retenção!
Entregue capa, legenda e tudo pronto". Depois: "Use mesmo narrador desse primeiro vídeo que tivemos 1 milhão de
visualizações" (é o Andre, o mesmo preset) e "'Parece fibra óptica' acho que fica melhor, analise todas as variáveis para
escolher" (escolhido: ver Gancho). Às 09:15: "mais curto e emocionante do começo ao fim", com o tema central sendo como
Deus guiou as Escrituras, e que isso é uma das provas; os dados e as linhas ficam ("isso aí é bem atrativo"); Gn 1:1 →
Jo 1:1 abre os exemplos. O primeiro corte (73 s, com Malaquias, 85,6% e o grego palavra por palavra na tela) ficou em
`source/narr/v2-longo/` (tomadas) e fora do git (vídeo, em `renders/.film/`). Às 10:01: "Não acha muito grande? Faz
uma versão resumida também" (`renders/antigo-dentro-do-novo-curto.mp4`, as mesmas tomadas, só as falas de
`script.SHORT`). Às 10:05: fecho novo, "Comenta tua passagem favorita. Ela pode virar o próximo vídeo. E manda pra quem
precisa ver isso." (só essa frase foi regravada, `source/narr/cta*.mp3`). Às 10:32: "a ligação não ficou bem
entendível": Gn 1:1 → Jo 1:1 voltou pra curta e Mateus 1:23 passou a ser lido inteiro ("Mateus escreve as mesmas
palavras…", regravada sozinha em `source/narr/l13*.mp3`); os dois pares aparecem com os versículos lado a lado na tela
e as palavras iguais acesas. O resto da narração é a tomada 1.

## Entregáveis
Só a versão resumida foi renderizada e entregue (Alex, 10:17: "fazer só o mais curto"). A completa existe no roteiro e
no pipeline (sem `CUT`), mas não há MP4 dela no repo.
- `renders/antigo-dentro-do-novo-curto.mp4`: 1080×1920, 30 fps, 1.458 quadros (48,6 s), 27,81 MB. Áudio medido no
  AAC: −14,1 LUFS, pico real −1,9 dBTP.
- Conferência final (`CUT=curto tools/verify_audio.py`): o Whisper ouve o vídeo pronto e acerta 98,8% do roteiro em
  ordem; toda fala ≥ 0,90 de similaridade; os 6 primeiros segundos saem como português (0,999). A única diferença é
  "pro" ouvido como "para o".
- `renders/capa-antigo-dentro-do-novo-curto.jpg`: a capa, que é o frame 0 (o gancho).
- `LEGENDA.md`: a legenda, o comentário fixado e uma resposta pronta para quem citar o gráfico do Gladd.

## Gancho
Mesmo molde do vídeo 1: uma imagem que parece outra coisa e, em seguida, a virada. As duas opções comparadas:

| | "Isso não é fibra óptica." | "Parece fibra óptica." (escolhido) |
|---|---|---|
| Até o gancho | 5 palavras | 3 palavras |
| Mecanismo | nega o que a pessoa ainda nem pensou | concorda com o que ela já pensa, e o "Mas é…" vira a chave |
| Em relação ao vídeo 1 | repete o molde ao pé da letra | mantém a estrutura com frase nova |

As tomadas da primeira versão ficaram em `source/narr/v1-isso-nao-e/`, caso alguém queira fazer um teste A/B.

## O que o vídeo diz e de onde vem (tudo de `data/stats.json`, `tools/analyze.py`)
| Fala | Dado |
|---|---|
| Gênesis 1:1 → João 1:1 | 724 votos, o 5º par mais votado entre AT e NT (confere com /joao/1/1 do site) |
| 67.293 vezes | pares únicos da OpenBible.info com um versículo nos 39 livros do AT e o outro nos 27 do NT (de 301.539 pares) |
| Todos os 39 livros | 39/39 do AT (e 27/27 do NT) têm ligação |
| Salmos, 11.484 · depois Isaías | os dois livros do AT com mais ligações ao NT (Isaías: 8.468) |
| Mateus | o livro do NT com mais ligações ao AT: 8.696 |
| "Moisés, Davi, profetas e apóstolos que nunca se conheceram. Séculos de distância." | afirmação geral sobre a autoria tradicional dos livros, sem número; não vem da base |
| Laranja: 223 vezes | ver abaixo |
| Isaías 7:14 → Mateus 1:23 | 10 palavras gregas iguais em sequência (Septuaginta × SBLGNT), 333 votos |
| Isaías 61:1 → Lucas 4:18 | 18 das 22 palavras gregas de Lc 4:18 em sequência com Is 61:1, 549 votos (confere com /lucas/4/18) |
| "Isso não é coincidência. É Deus guiando cada linha." | a leitura de fé do vídeo, dita como tal; não é um dado |

**Laranja: "palavra por palavra, no grego".** Um par entra quando o versículo do NT (SBLGNT, MorphGNT) e o do AT na
Septuaginta (eBible `grclxx`, domínio público) têm uma sequência de 5 ou mais palavras idênticas. A comparação ignora
acentos, maiúsculas, pontuação e o ν móvel, e a sequência precisa ter pelo menos 3 palavras que não sejam artigo,
pronome ou partícula. Além disso, a OpenBible precisa já ligar os dois versículos. A segunda condição elimina coincidências
e corrige a numeração da Septuaginta, que é diferente em Salmos, Jeremias, Joel, Oseias e Daniel (tabelas em
`analyze.py`). Resultado: 223 pares, em 193 versículos do NT. É uma contagem feita por código, não um índice de citações
montado à mão, e por isso o vídeo não usa a palavra "citações".

**O gráfico do Gladd.** Ele serviu de ideia para a forma (duas colunas, fios em duas cores) e leva crédito na legenda e
no fim do vídeo. Os números dele (citações e alusões) não aparecem aqui: não são dados abertos e foram medidos de outro
jeito. Por isso o líder também muda. Na base aberta, Salmos lidera em total, por ser o maior livro (2.461 versículos),
e Isaías lidera por versículo entre os dois (6,6 contra 4,7).

## Visual
- **O gráfico é feito por código** (`tools/layers.py`). Cada fio é um par real: uma curva que sai do lugar do versículo
  dentro do livro do AT (à esquerda) e chega ao lugar dele no livro do NT (à direita). A luz dos 67.293 fios é acumulada
  como densidade e recebe brilho. As camadas são azul (todos), laranja (os 223), ouro (o clímax) e uma camada de
  destaque para Salmos, Isaías, Malaquias e Mateus. Ficam em `motion/public/layers/`, em 2160×3840, para aguentar o zoom.
- **Remotion 4.0.532** (`motion/`):
  - Uma câmera percorre o gráfico com zoom, rolagem e chicotes, sempre na palavra da narração. Ela nunca para: tem
    flutuação e "respiração".
  - A rolagem desce pelos 39 livros em 2 s ("Todos os trinta e nove livros") com o nome do livro correndo no topo,
    um trilho de progresso e um tique por livro.
  - Há contadores e luzes que viajam por fios reais.
  - Títulos entram e saem dentro do tempo da própria fala, sem sobreposição na troca.
- **Cenas ilustradas** (`scroll.jpg`, `eyes.jpg`): geradas com GPT Image 2.5 via Higgsfield, no estilo de pincel do
  vídeo 5 (a referência de estilo foi `walk.jpg` do vídeo 5). Aparecem só adultos, sem rosto de criança, e toda cena
  tem a marca "ILUSTRAÇÃO".
- **Paleta:** Noite do site (`#051219`), azul vitral, laranja e ouro. Fontes: Space Grotesk, Space Mono, Newsreader e
  Gentium (grego).

## Som
- **Narração:** "Andre" (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), a mesma voz do
  vídeo 1. Foram 3 tomadas, avaliadas pelo Whisper (`tools/takes.py`); a tomada 1 inteira foi usada, para que o sotaque
  não mude. As falas expositivas têm ritmo até 1,16×.
- **Trilha:** sintetizada (`score.py`, instrumentos do vídeo 1 em `sound.py`):
  - órgão em ré menor;
  - um tique por livro na rolagem;
  - impactos em Salmos, Malaquias e Mateus;
  - subida longa e coro de sinos em "Uma só história";
  - silêncio depois de "E disse:";
  - ré maior no "Hoje esta escritura se cumpriu", e o acorde mais cheio em "É Deus guiando cada linha".

## Como rodar
```bash
python3 -I tools/analyze.py      # data/stats.json + data/lines.npz (confere tudo o que o roteiro diz)
python3 -I tools/layers.py       # camadas de luz + data/layout.json (~40 s)
# narração: 3 tomadas do script.PROMPT -> source/narr/take*.mp3 (Higgsfield)
python3 -I tools/takes.py        # avalia as tomadas (Whisper); --extra só as frases regravadas sozinhas (fecho e Mateus 1:23)
python3 -I narration.py          # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py  # motion/src/data.json
python3 -I tools/check.py        # dito = mostrado = dados = BLIVRE
python3 score.py                 # trilha + mix
cd motion && node render.mjs && node render.mjs --cover && cd ..
python3 finalize.py              # -14 LUFS, pico real <= -1 dBTP, <= 29 MB
python3 -I tools/verify_audio.py # o Whisper ouve o vídeo final e compara com o roteiro
# a versão resumida: os mesmos passos de narration.py em diante com CUT=curto no ambiente
# (narr-curto.json, mix-curto.wav, video-curto.mp4, antigo-dentro-do-novo-curto.mp4, capa-...-curto.jpg)
```
`motion/node_modules` é um link para o do vídeo 5 (mesmas versões travadas no `package-lock.json`).
