# "Não foi um grito. Foi uma citação." (vídeo 7, 25/10/2026)

Pedido do Alex (25/10, 13:55): "uma opinião sua, uma construção 100% sua… formato de vídeo que seria viral… totalmente
autêntica sua… visual, roteiro, criação, áudio, sonoridade, narração, 100% sua. Porém com gancho muito forte, de retenção,
de no máximo 30-40 segundos." Depois: "Pode criar".

## A ideia
Pegar uma coisa que todo mundo acha que já conhece e mostrar que ela significa outra coisa. "Deus meu, Deus meu, por que
me desamparaste?" é a primeira linha do Salmo 22, escrito séculos antes da cruz; o salmo descreve a cena ao redor de Jesus
(zombaria e cabeças balançando, "confiou em Deus, que o livre", roupas repartidas e sortes, a sede) e termina em vitória:
"porque ele assim fez". Na cruz: "Está consumado". Jesus, morrendo, estava apontando para o salmo.

## Entregáveis
- `renders/nao-foi-um-grito.mp4`: 1080×1920, 30 fps, 1.443 quadros (48,2 s), 27,85 MB. Áudio medido no AAC: −14,2 LUFS,
  pico real −1,8 dBTP. A voz fica de 15 a 30 dB acima da trilha em toda fala (mediana 21,3).
- Conferência (`tools/check.py`: ALL OK; `tools/verify_audio.py`): o Whisper ouve o vídeo pronto e acerta 99,1% do
  roteiro em ordem; os 6 primeiros segundos saem como português (0,999). Diferenças só de grafia ("pra" ouvido como
  "para", "por quê" como "o porquê"). Ninguém ouviu de ouvido ainda.
- `renders/capa-nao-foi-um-grito.jpg`: a capa, que é o frame 0 (a frase conhecida, em branco no preto).
- `LEGENDA.md`: legenda, comentário fixado e duas respostas prontas para as objeções previsíveis.

## O que o vídeo diz e de onde vem (`data/stats.json`, `tools/analyze.py`)
| Fala | Dado |
|---|---|
| "É a primeira linha do Salmo 22" | Sl 22:1 ↔ Mt 27:46 é o par mais votado de Sl 22:1 (126 votos); Mc 15:34, 85 |
| "Zombam de mim e sacodem a cabeça" | Sl 22:7 ↔ Mt 27:39, 5 votos |
| "Confiou no Senhor, que ele o salve" | Sl 22:8 ↔ Mt 27:43, 15 votos |
| "Repartem minhas roupas e lançam sortes" | Sl 22:18 ↔ Jo 19:24, 60 votos (e Mt 27:35, 56) |
| "Minha língua está grudada no céu da boca" | Sl 22:15 ↔ Jo 19:28 ("Tenho sede"), 81 votos |
| "termina assim: … porque ele assim fez" / "Está consumado" | Sl 22:31 e Jo 19:30. Não é um par da base e não é chamado de ligação |
| "mil anos antes da cruz" | Davi, século X a.C., conforme o título do salmo na própria BLIVRE ("Salmo de Davi"); afirmação geral, sem número da base |

Todas as citações são texto literal da Bíblia Livre; os votos batem com as páginas do site (`source/site/`).

**O que ficou de fora, de propósito.** Sl 22:16 ("perfuraram minhas mãos e meus pés") tem leitura hebraica disputada
(כארי "como leão" × "perfuraram" na Septuaginta). "Ele fez" (עשה) e "está consumado" (τετέλεσται) não são a mesma
palavra; o vídeo diz "termina assim", não "mesma palavra". As duas respostas prontas estão em `LEGENDA.md`.

## Forma
- **Visual:** quase preto (`#04070C`), texto e silêncio. Frame 0: a frase conhecida em branco. "Isso não foi um grito" em
  branco, "Foi uma citação" em ouro. A frase sobe e vira o cabeçalho da coluna esquerda (SALMO 22, com o hebraico
  אלי אלי למה עזבתני embaixo); à direita, A CRUZ (Mateus 27 · João 19). Quatro pares, um por fala, cada um com os dois
  versículos lado a lado, as palavras iguais acesas em ouro e um fio entre as colunas com os votos. Em "começa no
  abandono", o salmo inteiro (31 versos) rola pela tela até parar no 31, com a última palavra em hebraico (עָשָׂה). Corte
  para preto: "Está consumado." sozinho, branco e depois ouro. Fecho: "Manda pra quem só conhece a primeira frase."
- **Som:** sem música até o fim. Um sub grave e um batimento cardíaco que desacelera (0,95 s → 1,45 s) sob os pares; um
  tique quando cada fio chega; uma subida enquanto o salmo rola; silêncio total depois de "ele assim fez"; UM acorde em
  ré maior em "Está consumado", segurado até o fim com poucos sinos. Ducking sob a voz como nos outros vídeos.
- **Narração:** Andre (ElevenLabs via Higgsfield, preset `f1e8226e-2248-4d5f-b43c-0a79e9949dbf`), 3 tomadas, ritmo 1,0
  (nada acelerado: este filme ganha por peso), 128 palavras.
- **Legendas:** só nas falas que não estão na tela como versículo (3, 4 e 9).

## Como rodar
```bash
python3 -I tools/analyze.py      # data/stats.json (confere pares, votos do site, BLIVRE, hebraico)
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
`motion/node_modules` é um link para o do vídeo 5 (mesmas versões travadas).
