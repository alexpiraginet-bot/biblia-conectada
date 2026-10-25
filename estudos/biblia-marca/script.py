"""Narration of "A outra marca" (video 8): exactly the text sent to Higgsfield (text2speech_v2, variant elevenlabs, preset
voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry per line, joined with " ... ".
Line 0 is a warm-up that is cut in the edit. Numbers are spelled out.

Concept (25/10/2026, the day of the presidential run-off; Alex asked for a "polêmico" linking Revelation 13 and 22 to the
parties in dispute). The film does NOT name or picture any party or candidate, and does not say anyone is the beast:
that is not in the text, the project only states what it can show, and it would be partisan content on election day.
The controversy it keeps is the one the text supports, and it cuts both ways: the mark of the beast sits on the right
hand or the forehead (Ap 13:16), the very place where Deuteronomy 6:8 tells Israel to bind God's words; the beast asks
for worship of power (Ap 13:4); and the last chapter of the Bible puts a name back on the forehead (Ap 22:4).
Links: OpenBible pairs Ap 13:16 ~ Dt 6:8 and Ap 13:17 ~ Ap 22:4 (tools/analyze.py). Quotes: literal BLIVRE (QUOTES).
Delivery: fast, hard cuts on every line (Alex: "muito movimento e cortes marcantes").
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                       # 0  warm-up (cut)
    "Todo ano de eleição alguém descobre quem é a besta do Apocalipse.",            # 1  hook
    "E é sempre o outro lado.",                                                    # 2
    "Mas quase ninguém lê onde fica a marca.",                                     # 3
    "Na mão direita. Ou na testa.",                                                # 4  Ap 13:16
    "Sabe onde mais a Bíblia manda pôr um sinal na mão e na testa?",               # 5
    "Deuteronômio seis. As palavras de Deus: por sinal em tua mão, entre teus olhos.",  # 6  Dt 6:8
    "A marca não é um chip. É quem manda no que você faz e no que você pensa.",     # 7  the reading
    "E o que a besta quer? Adoração.",                                             # 8  Ap 13:4 "adoraram à besta"
    "Quem é semelhante à besta? Quem pode batalhar contra ela?",                   # 9  Ap 13:4 literal
    "É o grito de quem idolatra o poder. De qualquer lado.",                       # 10
    "Agora vai pro último capítulo da Bíblia.",                                    # 11 Ap 22
    "E o nome dele estará em suas testas.",                                        # 12 Ap 22:4
    "A marca volta no fim. Só muda o nome.",                                       # 13
    "A pergunta não é em quem você votou. É qual nome está na sua testa.",         # 14 the point
    "Manda pra quem chamou o outro lado de besta.",                                # 15 CTA
]
PROMPT = " ... ".join(LINES)

# line -> (BLIVRE verse, literal fragments the line quotes; checked case-insensitively, brackets of BLIVRE removed)
QUOTES = {
    4: ("Rev.13.16", ["mão direita", "testa"]),
    6: ("Deut.6.8", ["por sinal em tua mão", "entre teus olhos"]),
    8: ("Rev.13.12", ["besta"]),          # "adorem à primeira besta" (13:12; also 13:4, 13:8, 13:15)
    9: ("Rev.13.4", ["Quem [é] semelhante à besta? Quem pode batalhar contra ela?"]),
    12: ("Rev.22.4", ["e o nome dele [estará] em suas testas"]),
}
# the links the film shows (verse, verse); votes come from the base, checked against the live site
PAIRS = [("Rev.13.16", "Deut.6.8"), ("Rev.13.17", "Rev.22.4")]
