# "O Antigo dentro do Novo" (vídeo 6, 25/10/2026)

Pedido do Alex (25/10), junto com o print de um post que mostrava o gráfico do Dr. Ben Gladd (Carson Center / The Gospel
Coalition, versão 3.0): "Seguindo mesmo conceito de roteiro e gancho do nosso vídeo 1, que começa com 'isso não é um
arco-íris', quero fazer um agora sobre esse tema com esse visual, com muito movimento! Motion, scroll para alta retenção!
Entregue capa, legenda e tudo pronto". Depois: "Use mesmo narrador desse primeiro vídeo que tivemos 1 milhão de
visualizações" (é o Andre, o mesmo preset) e "'Parece fibra óptica' acho que fica melhor, analise todas as variáveis para
escolher" (escolhido: ver Gancho).

## Entregáveis
- `renders/antigo-dentro-do-novo.mp4`: o vídeo, 1080×1920, 30 fps.
- `renders/capa-antigo-dentro-do-novo.jpg`: a capa, que é o frame 0 (o gancho).
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
| 67.293 ligações | pares únicos da OpenBible.info com um versículo nos 39 livros do AT e o outro nos 27 do NT (de 301.539 pares) |
| 39 livros, todos | 39/39 do AT e 27/27 do NT têm ligação |
| Mais de 8 em cada 10 versículos do Novo | 6.808 de 7.957 (85,6%) têm ao menos uma ligação com o AT |
| Salmos, 11.484 · Isaías, 8.468 | os dois livros do AT com mais ligações ao NT |
| Malaquias, pelo tamanho | 683 ligações em 55 versículos = 12,4 por versículo, o maior do AT (Zacarias vem depois, com 7,0) |
| Mateus | o livro do NT com mais ligações ao AT: 8.696 |
| Gênesis 1:1 → João 1:1 | 724 votos, o 5º par mais votado entre AT e NT (confere com /joao/1/1 do site) |
| Laranja: 223 pares | ver abaixo |
| Isaías 7:14 → Mateus 1:23 | 10 palavras gregas iguais em sequência (Septuaginta × SBLGNT), 333 votos |
| Isaías 61:1 → Lucas 4:18 | 18 das 22 palavras gregas de Lc 4:18 em sequência com Is 61:1, 549 votos (confere com /lucas/4/18) |

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
  - A rolagem desce pelos 39 livros com o nome do livro correndo no topo, um trilho de progresso e um tique por livro.
  - Há contadores e luzes que viajam por fios reais.
  - O grego acende palavra por palavra, só nas palavras iguais.
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
  - um sino por palavra grega que acende;
  - silêncio depois de "fixos nele";
  - ré maior no "Hoje esta escritura se cumpriu".

## Como rodar
```bash
python3 -I tools/analyze.py      # data/stats.json + data/lines.npz (confere tudo o que o roteiro diz)
python3 -I tools/layers.py       # camadas de luz + data/layout.json (~40 s)
# narração: 3 tomadas do script.PROMPT -> source/narr/take*.mp3 (Higgsfield)
python3 -I tools/takes.py        # avalia as tomadas (Whisper)
python3 -I narration.py          # renders/.film/narr.wav + narr.json
python3 -I tools/motion_data.py  # motion/src/data.json
python3 -I tools/check.py        # dito = mostrado = dados = BLIVRE
python3 score.py                 # trilha + mix
cd motion && node render.mjs && node render.mjs --cover && cd ..
python3 finalize.py              # -14 LUFS, pico real <= -1 dBTP, <= 29 MB
python3 -I tools/verify_audio.py # o Whisper ouve o vídeo final e compara com o roteiro
```
`motion/node_modules` é um link para o do vídeo 5 (mesmas versões travadas no `package-lock.json`).
