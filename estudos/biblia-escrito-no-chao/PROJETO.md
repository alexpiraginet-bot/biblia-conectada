# "Escrito no chão" (vídeo 11, 10/11/2026)

Pedido do Alex (10/11): "Vamos fazer um novo vídeo usando o @higgsfield e o p5.brush. Com uma história nova e algo muito
interessante que traz engajamento forte e retenção máxima! Criação única, história boa e conteúdo de alto nível" →
"vídeos da Bíblia e cristãos com história de Jesus" → "Quero edição por lá e gerações se preciso também de takes! Você
comanda" → (17:05, com o primeiro corte de 59 s já narrado) "Não deixa fala e vídeos lentos, deixe dinâmico e bom de
assistir mesmo para os impacientes" e "Nem muito longo! Vídeos curtos assim faremos mais vídeos e não longos".

## A ideia
João 8 é a única cena dos quatro evangelhos em que Jesus escreve, e o texto não diz o quê. O filme abre nessa pergunta,
conta a cena do chão (poeira, sombras compridas, pedras) e paga com uma ligação em vez de um palpite: a ligação mais
votada de João 8:6 na base é Jeremias 17:13, "os que de mim se afastam serão escritos no chão; pois abandonaram ao
SENHOR, a fonte de águas vivas". A pregação é nossa: quem dá as costas pra fonte fica com o nome no pó; só que pó, a
água apaga. Hoje: a pedra é um comentário. Solta. O filme nunca mostra escrita legível no chão e nunca diz o que ele
escreveu.

## Entregáveis
- `renders/escrito-no-chao.mp4`: 1080×1920, 24 fps (a cadência dos takes), 891 quadros (37,125 s), 28,01 MB. Áudio medido
  no AAC: −14,0 LUFS, pico real −3,1 dBTP (`renders/.film/render.log`).
- `renders/capa-escrito-no-chao.jpg`: a capa, o quadro de 1,5 s (título com o sublinhado já desenhado).
- `LEGENDA.md`: legenda, comentário fixado e quatro respostas prontas (manuscritos, "então ele escreveu Jeremias?",
  "escreveu duas vezes", "600 anos").
- Conferência: `tools/check.py` ALL OK; `tools/verify_audio.py`: o Whisper ouve o vídeo pronto e acha as 120 palavras do
  corte em ordem (0,983; diferenças só de grafia: "600" por "seiscentos", "para a" por "pra"), os 6 primeiros segundos
  saem como português (0,999), toda fala ≥ 0,90. Os 25 cortes planejados caem no quadro previsto (medido no arquivo
  final). Ninguém ouviu de ouvido ainda.

## O que o vídeo diz e de onde vem (`data/stats.json`, `tools/analyze.py`)
| Fala / tela | Dado |
|---|---|
| "Nos evangelhos, Jesus só escreve uma vez" | 17 versículos dos quatro evangelhos têm "escrev" na BLIVRE; só em João 8:6 e 8:8 é Jesus quem escreve (uma cena, duas vezes) |
| "Jogaram uma mulher no meio de todos. Adultério. A lei mandava apedrejar." | paráfrase de João 8:3–5 ("uma mulher tomada em adultério", "pondo-a no meio", "que as tais sejam apedrejadas") |
| "Aquele de vós que está sem pecado…" | João 8:7, literal |
| "saíram um a um" (só na tela) | João 8:9, literal |
| "A ligação mais votada desse versículo é de Jeremias" · 30 LIGAÇÕES · 55 VOTOS | João 8:6 tem 30 ligações; a mais votada é Jeremias 17:13, 55 votos (a 2ª tem 8) |
| "seiscentos anos antes" · ≈ 600 ANOS | afirmação histórica geral (Jeremias, fim do séc. VII a começo do VI a.C.), não é número da base; por isso o "≈" |
| "os que de mim se afastam serão escritos no chão…" | Jeremias 17:13, literal |
| "Nem eu também te condeno; vai, e não peques mais." | João 8:11, literal |
| "Quem dá as costas pra fonte…", "Hoje a pedra é um comentário. Solta." | nosso |

**O que ficou de fora, de propósito.** João 7:37 ("Se alguém tem sede, venha a mim, e beba", ligado a Jeremias 17:13
com 50 votos) e o "E voltou a escrever" estavam no primeiro corte (59 s) e saíram no corte curto; as falas estão
gravadas nas três tomadas e servem para outro vídeo. João 7:53–8:11 não está nos manuscritos mais antigos: a resposta
pronta está em `LEGENDA.md`.

## Forma
- **Ritmo:** 26 planos em 37 s (média 1,43 s; o mais longo 2,69 s, o mais curto 0,62 s). Um corte em quase toda oração,
  a palavra na tela no instante em que é dita, título completo no quadro 0. A narração é a tomada 2 inteira do Andre,
  esticada a 1,12–1,31× (a tomada tem 4,1–6,4 sílabas/s conforme a fala; o resultado fica em 5,0–7,2 sílabas/s,
  3,6 palavras/s no total; contagem aproximada de sílabas).
- **Imagem (Higgsfield):** tudo visto de cima, aquarela e carvão em papel quente, ocres e sombras; o único azul do filme
  é a água. 10 artes-chave (GPT Image, 1520×2688) e 11 takes animados a partir delas (Seedance 2.5, 24 fps; 720p, e o
  gancho em 1080p). Os planos abertos são takes; os closes vêm da arte-chave em alta (nítidos). Sem rostos; Deus não
  aparece; a marca **ILUSTRAÇÃO** fica na tela o filme inteiro (regra da série).
- **Pintura (p5.brush 3.0.0, MIT):** 40 elementos pintados em código (`paint/`, build standalone, Chromium headless):
  25 painéis de aguada atrás do texto, 2 painéis azuis e a aguada azul que desce quando "a água apaga", 5 sublinhados a
  marcador, o anel e o fio de carvão que ligam João 8:6 a Jeremias, a seta do final. Cada elemento é pintado uma vez no
  branco e revelado no tempo (`compose.py`).
- **Montagem (Higgsedit, no sandbox do Higgsfield):** `edit/edit.jsx` põe os 26 planos na linha do tempo cortados no
  quadro, 66 linhas de texto nativo (Space Grotesk, Cormorant, chips em Space Grotesk 600) que entram na palavra, a
  marca ILUSTRAÇÃO e o mix numa faixa própria; `edit/run.sh render` gera o master (H.264 20 Mbps). O acabamento
  (`finalize.py`) só normaliza o áudio e leva o arquivo a ≤ 29 MB.
- **Som:** o órgão da série em ré menor desde o quadro 0; batida de pedra onde uma pedra é vista (o punho, a pedra que
  cai, o celular), tirada do tempo da imagem (`plan.json` → `cues`); subida até "Jeremias"; dominante sob a profecia;
  ré maior e água corrente quando a fonte chega, até o fim. O filme termina na mesma imagem do quadro 0 (laço).

## Pipeline
```bash
python3 -I tools/analyze.py        # números e citações contra a base -> data/stats.json
python3 -I narration.py            # tomadas do Andre -> renders/.film/narr.wav + narr.json (37,1 s)
python3 -I plan.py                 # o corte inteiro (planos, texto, pintura) -> renders/.film/plan.json
(cd paint && npm ci && node render.cjs)   # p5.brush -> renders/.film/paint/
python3 -I compose.py              # takes + arte + pintura -> renders/.film/shots/*.mp4   (--still t para conferir)
python3 -I score.py                # trilha + mix -> renders/.film/mix.wav
python3 -I edit/make_edit.py       # -> edit/edit.jsx + edit/run.sh
# no sandbox do Higgsfield (shots/, fonts/, mix.wav, edit.jsx, run.sh em $ENC_ROOT):
#   bash run.sh build && bash run.sh render   -> film/renders/escrito-no-chao-master.mp4 -> renders/.film/master.mp4
python3 -I finalize.py && python3 -I tools/check.py && python3 -I tools/verify_audio.py
```
O master usado tem SHA-256 `651bfaa7…64af6` e saiu de `edit.jsx` `7166080a…` e `run.sh` `8a182070…` (iguais aos do repo).

## Higgsfield (ids para baixar de novo)
- Artes-chave (`source/art/`, as quatro usadas ficam em JPG; os PNG originais não vão para o git): k11 `efa4d65f-62cc-416a-b6e1-a806f60f1e72`,
  k12 `7f161526-c905-4630-87a5-b1121d65153c`, k13 `1fc62e5f-d8c1-4ed8-a0dc-e7d2fe4cdd30`, k22 `437f6722-3b7c-4103-8a62-32ed1ce94257`,
  k23 `c56edfd2-5f44-463a-a08c-ebb03f15e191`, k24 `b033b2b9-8ba7-46c2-a273-11a571a3eb84`, k25 `bb2c507c-d97d-4644-a15c-2eb9080bde64`,
  k26 `4f2c6815-e324-4a36-aefb-bb73fe7fc8cf`, k27 `e6e3096d-a12a-40cd-9ced-c7100c1935ba`, k28 `47257ea2-8923-437b-a1e5-ffe8a324a719`.
- Takes (`source/takes/`): t01 `ce87c092-223a-4a48-950e-e6e8b8cdeeab`, t01b (1080p, 8 s) `6380caf0-24ee-46f7-8d53-3ebdfd17e08c`,
  t02 `19ed827d-7c29-46d2-8c21-1044fa3faf3d`, t03 `d5cb0787-011b-4ec1-8d87-7e6ea2ce3337`, t04 `66541296-02ee-4177-b0ee-6f07a41dfdfa`,
  t05 `7b587ba9-f30e-4742-abeb-7b1d632716bd`, t06 `727179bf-79fa-425b-bbb7-2a85c35e7d0e`, t08 `d9e62aec-c24c-4d1c-b25d-b5011948d6da` (a festa; fora do corte curto),
  t09 `7f8901da-0b2a-488a-a1f5-1c734fd033bc`, t10 `7e18be09-f096-4330-a2f6-c0f1941e2344`, t11 `760ea43d-b204-4786-8cc7-63e5db646342`.
  Dois takes pedidos às 17:03 (o rolo e as pedras animados) falharam no Higgsfield e não fizeram falta: no corte curto
  esses planos duram 1,1–1,5 s e usam a arte-chave.
- Master do Higgsedit: mídia `4a4019a7-4983-49fc-8143-d7a9786475c1`.
- Narração: Andre (`text2speech_v2`, ElevenLabs, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), 3 tomadas em `source/narr/`.
- Créditos: o saldo foi de 1.800 para 1.257,05 (plano max) ao longo do projeto: 542,95 créditos.

## Pendências e riscos
- Ninguém assistiu com som: ritmo da fala a 1,3× e volume da trilha foram conferidos por medida, não por ouvido. As duas
  falas mais rápidas são a citação de João 8:7 e a pergunta final (~7 sílabas/s; a tomada já as diz rápido).
- Os takes são 720p ampliados para 1080 (o gancho é 1080p nativo); os closes de arte-chave são nítidos.
- "Só escreve uma vez" = uma ocasião (na cena ele escreve duas vezes); resposta pronta na legenda.
- Licenças: p5.brush é MIT; o `p5` (LGPL-2.1) entra só como dependência par do npm e não é carregado (o filme usa
  `p5.brush/dist/brush.js`, o build standalone).
- `renders/direcao/` guarda a prancha de direção visual mostrada ao Alex antes da produção (do corte longo).
