# "Escrito no chão" (vídeo 11, 10/11/2026)

Pedido do Alex (10/11): "Vamos fazer um novo vídeo usando o @higgsfield e o p5.brush. Com uma história nova e algo muito
interessante que traz engajamento forte e retenção máxima! Criação única, história boa e conteúdo de alto nível" →
"vídeos da Bíblia e cristãos com história de Jesus" → "Quero edição por lá e gerações se preciso também de takes! Você
comanda" → (17:05, com o primeiro corte de 59 s já narrado) "Não deixa fala e vídeos lentos, deixe dinâmico e bom de
assistir mesmo para os impacientes" e "Nem muito longo! Vídeos curtos assim faremos mais vídeos e não longos" →
(18:10, com o corte de 37 s entregue) "A voz parece ter eco! E pouco efeito visual!" e "Algum gancho forte do vídeo
para iniciar o vídeo e fazer um rebobinamento até o começo".

## A ideia
João 8 é a única cena dos quatro evangelhos em que Jesus escreve, e o texto não diz o quê. O filme abre no fim: uma mão
de hoje segurando o celular como quem segura uma pedra, "Hoje a pedra é um comentário." A imagem rebobina pelo próprio
filme até o começo e a história começa: a pergunta sem resposta, a cena do chão (poeira, sombras compridas, pedras) e
uma ligação em vez de um palpite: a ligação mais votada de João 8:6 na base é Jeremias 17:13, "os que de mim se afastam
serão escritos no chão; pois abandonaram ao SENHOR, a fonte de águas vivas". A pregação é nossa: quem dá as costas pra
fonte fica com o nome no pó; só que pó, a água apaga. O filme volta à mão com o celular e fecha a frase da abertura:
"Solta." O filme nunca mostra escrita legível no chão e nunca diz o que ele escreveu.

## Entregáveis
- `renders/escrito-no-chao.mp4`: 1080×1920, 24 fps (a cadência dos takes), 930 quadros (38,75 s), 27,99 MB. Áudio medido
  no AAC: −14,1 LUFS, pico real −1,9 dBTP (`renders/.film/render.log`).
- `renders/capa-escrito-no-chao.jpg`: a capa, o quadro do título completo com o sublinhado já desenhado (no corte atual
  ele está em ≈ 4,9 s; a imagem é a mesma do corte anterior).
- `LEGENDA.md`: legenda, comentário fixado e quatro respostas prontas (manuscritos, "então ele escreveu Jeremias?",
  "escreveu duas vezes", "600 anos").
- Conferência: `tools/check.py` ALL OK; `tools/verify_audio.py`: o Whisper ouve o vídeo pronto e acha as 120 palavras do
  corte em ordem (0,983; diferenças só de grafia: "600" por "seiscentos", "para a" por "pra"), os 6 primeiros segundos
  saem como português (0,999), toda fala ≥ 0,92. Os 27 cortes planejados caem no quadro previsto (medido no arquivo
  final: em todos o maior salto de imagem da vizinhança está no quadro do plano; a entrada e a saída da rebobinada são
  movimento contínuo, sem pico isolado). Ninguém ouviu de ouvido ainda.

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
| "Quem dá as costas pra fonte…", "Hoje a pedra é um comentário." (abertura) … "Solta." (fecho) | nosso |

**O que ficou de fora, de propósito.** João 7:37 ("Se alguém tem sede, venha a mim, e beba", ligado a Jeremias 17:13
com 50 votos) e o "E voltou a escrever" estavam no primeiro corte (59 s) e saíram no corte curto; as falas estão
gravadas nas três tomadas e servem para outro vídeo. João 7:53–8:11 não está nos manuscritos mais antigos: a resposta
pronta está em `LEGENDA.md`.

## Forma
- **Abertura fria e rebobinada:** quadro 0 = a mão com o celular e a frase inteira na tela, dita em 0,10–1,52 s. De
  1,58 a 2,48 s (21 quadros) a imagem rebobina por dez estações do próprio filme, da última à primeira (a mão, o
  veredito, a água, as pedras no chão, o rolo, a pedra que cai, o punho, a roda, a escrita no chão, o gancho), com borrão de
  movimento, barras de fita, o sinal ⏪ e "DO COMEÇO". O gancho ("Nos evangelhos, Jesus só escreve uma vez") começa em
  2,54 s. No fim o filme volta à mesma mão (a frase reaparece na tela) e a palavra que faltava, "Solta.", é dita com o
  celular caindo no chão.
- **Ritmo:** 28 planos em 38,75 s (média 1,38 s; o mais longo 2,67 s, o mais curto 0,62 s). Um corte em quase toda
  oração, a palavra na tela no instante em que é dita. A narração é a tomada 2 inteira do Andre, acelerada a
  1,08–1,31× (33,1 s de fala).
- **A voz sem eco:** até o corte de 37 s a fala era acelerada com o rubberband (vocoder de fase), que a 1,2–1,3× borra a
  voz; foi isso que o Alex ouviu como eco. Agora é o `atempo` do ffmpeg (domínio do tempo). Medida nas 11 falas do
  filme (curtose do resíduo LPC, a medida usual de reverberação; maior = mais seca; mediana): tomada original 13,2;
  rubberband 8,8 (72% da tomada); `atempo`, o que está no filme, 12,1 (95% da tomada). A voz não recebe reverberação
  em nenhum ponto do mix (só a trilha e os efeitos).
- **Imagem (Higgsfield):** tudo visto de cima, aquarela e carvão em papel quente, ocres e sombras; o único azul do filme
  é a água. 10 artes-chave (GPT Image, 1520×2688) e 11 takes animados a partir delas (Seedance 2.5, 24 fps; 720p, e o
  gancho em 1080p). Os planos abertos são takes; os closes vêm da arte-chave em alta (nítidos). Sem rostos; Deus não
  aparece; a marca **ILUSTRAÇÃO** fica na tela o filme inteiro (regra da série).
- **Efeito (`compose.py`, por plano, em `plan.json` → `fx`):** poeira no ar em todos os planos; 12 passagens por zoom
  com borrão radial (8 entradas, 4 saídas); 11 socos de zoom, 10 tremidas de câmera e 8 clarões nas palavras fortes e
  nas batidas; leve giro de câmera em 7 planos; explosão de poeira nas duas quedas (a pedra e o celular); 3 vazamentos
  de luz; brilhos sobre a água; um halo de luz na cena do veredito; vinheta.
- **Pintura (p5.brush 3.0.0, MIT):** 62 elementos pintados em código (`paint/`, build standalone, Chromium headless):
  28 painéis de aguada atrás do texto, 2 aguadas azuis que descem quando "a água apaga", 5 sublinhados a marcador, 6
  anéis de carvão (o celular, o dedo, a mulher, as pedras, João 8:6), 2 fios de carvão que ligam João 8:6 a Jeremias, 3
  raios sobre a mulher, 13 traços de impacto nas duas quedas, 3 setas. Cada elemento é pintado uma vez no branco e
  revelado no tempo.
- **Montagem (Higgsedit, no sandbox do Higgsfield):** `edit/edit.jsx` põe os 28 planos na linha do tempo cortados no
  quadro, 69 linhas de texto nativo (Space Grotesk, Cormorant, chips em Space Grotesk 600) que entram na palavra, 12
  delas batendo de 1,5× com tremida ("ADULTÉRIO.", "≈ 600 ANOS", "SOLTA."…), o sinal ⏪ da rebobinada, a marca
  ILUSTRAÇÃO e o mix numa faixa própria; `edit/run.sh render` gera o master (H.264 20 Mbps). O acabamento
  (`finalize.py`) só normaliza o áudio e leva o arquivo a ≤ 29 MB.
- **Som:** o órgão da série em ré menor desde o quadro 0; fita voltando na rebobinada; batida de pedra onde uma pedra é
  vista (o punho, a pedra que cai, o celular), tirada do tempo da imagem (`plan.json` → `cues`); sopro nas passagens
  por zoom e risco de carvão quando um traço é desenhado; subida até "Jeremias"; dominante sob a profecia; ré maior e
  água corrente quando a fonte chega, até o fim.

## Pipeline
```bash
python3 -I tools/analyze.py        # números e citações contra a base -> data/stats.json
python3 -I narration.py            # tomadas do Andre -> renders/.film/narr.wav + narr.json (38,7 s)
python3 -I plan.py                 # o corte inteiro (planos, texto, pintura, efeitos) -> renders/.film/plan.json
(cd paint && npm ci && node render.cjs)   # p5.brush -> renders/.film/paint/
python3 -I compose.py              # takes + arte + pintura + efeitos -> renders/.film/shots/*.mp4   (--still t para conferir)
python3 -I score.py                # trilha + mix -> renders/.film/mix.wav
python3 -I edit/make_edit.py       # -> edit/edit.jsx + edit/run.sh
# no sandbox do Higgsfield (shots/, fonts/, mix.wav, edit.jsx, run.sh em $ENC_ROOT):
#   bash run.sh build && bash run.sh render   -> film/renders/escrito-no-chao-master.mp4 -> renders/.film/master.mp4
python3 -I finalize.py && python3 -I tools/check.py && python3 -I tools/verify_audio.py
```
O master usado tem SHA-256 `1c4986ed…63e19` e saiu de `edit.jsx` `0da0d48c…` e `run.sh` `1fb9a486…` (iguais aos do repo).

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
- Master do Higgsedit: mídia `03cf74b8-6909-4c7c-a3f3-9e1f80bbbdf1` (o do corte de 37 s, sem abertura fria: `4a4019a7-4983-49fc-8143-d7a9786475c1`).
- Narração: Andre (`text2speech_v2`, ElevenLabs, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), 3 tomadas em `source/narr/`.
- Créditos: o saldo foi de 1.800 para 1.257,05 (plano max) ao longo do projeto: 542,95 créditos. A segunda passada
  (voz, abertura, efeitos) não gastou crédito: reusou os takes e as tomadas.

## Pendências e riscos
- Ninguém assistiu com som: a secura da voz, o ritmo da fala a 1,3× e o volume da trilha e dos efeitos foram conferidos
  por medida, não por ouvido. O `atempo` pode deixar outro tipo de marca (um leve picotado) nas falas a 1,31×.
- Ouvindo fala por fala, o Whisper escreve "inscritos" em Jeremias 17:13; ouvindo o vídeo inteiro, "escritos". Em
  português falado "serão escritos" e "serão inscritos" soam quase iguais; o texto na tela diz "serão escritos".
- O título na tela diz "JESUS SÓ ESCREVEU UMA VEZ." e a fala diz "só escreve uma vez" (já era assim no corte de 37 s).
- As linhas que batem de 1,5× passam da borda do quadro no primeiro quadro (1/24 s) antes de assentar.
- Os takes são 720p ampliados para 1080 (o gancho é 1080p nativo); os closes de arte-chave são nítidos.
- "Só escreve uma vez" = uma ocasião (na cena ele escreve duas vezes); resposta pronta na legenda.
- Licenças: p5.brush é MIT; o `p5` (LGPL-2.1) entra só como dependência par do npm e não é carregado (o filme usa
  `p5.brush/dist/brush.js`, o build standalone).
- `renders/direcao/` guarda a prancha de direção visual mostrada ao Alex antes da produção (do corte longo).
