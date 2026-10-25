"""Narration of "O Antigo dentro do Novo" (video 6): exactly the text sent to Higgsfield (text2speech_v2, variant
elevenlabs, preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry per line,
joined with " ... " (a ~0.5 s pause the cutter uses). Line 0 is a warm-up that is cut in the edit. Numbers are spelled
out (the voice is English-native; digits invite an English reading). Hook in the mould of video 1 ("Isso não é um
arco-íris. É a Bíblia inteira."): an image that looks like something else, then the turn. Alex chose "Parece fibra
óptica." (25/10). Second cut (25/10, 09:15-09:18): "mais curto e emocionante do começo ao fim", the data and the lines
stay ("isso aí é bem atrativo"), God guiding the Scriptures is the centre from the start, and Gn 1:1 -> Jo 1:1 opens the
examples.

Every number and claim is asserted by tools/analyze.py (data/stats.json) and tools/check.py:
  67.293 AT-NT pairs (OpenBible.info); 39/39 OT books linked; Salmos 11.484 (1st), Isaías (2nd); Mateus (1st NT);
  Gn 1:1 ~ Jo 1:1 is a pair (724 votes); orange = 223 pairs with 5+ identical Greek words in order (LXX x SBLGNT) that
  OpenBible links; Is 7:14 ~ Mt 1:23 (10 words) and Is 61:1 ~ Lc 4:18 (18 of 22 words) among them.
QUOTES maps a line to the BLIVRE verse it quotes literally (check.py asserts each fragment is in the verse).
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                       # 0  warm-up (cut)
    "Parece fibra óptica.",                                                        # 1  hook
    "Mas é o Antigo Testamento dentro do Novo.",                                   # 2  the turn
    "Cada fio é Deus ligando um versículo ao outro.",                              # 3  thesis, from the start
    "Tipo: No princípio criou Deus os céus e a terra...",                           # 4  Gn 1:1
    "ligado a: No princípio era a Palavra.",                                        # 5  Jo 1:1 (724 votos)
    "Sessenta e sete mil, duzentas e noventa e três vezes, o Novo aponta pro Antigo.",   # 6  67.293
    "Todos os trinta e nove livros. Nenhum ficou de fora.",                        # 7  scroll, 39/39
    "O mais ligado? Salmos. Onze mil, quatrocentas e oitenta e quatro.",            # 8  11.484
    "Depois, Isaías. E do outro lado, quem mais puxa o Antigo: Mateus.",           # 9  2nd OT, 1st NT
    "Moisés, Davi, profetas e apóstolos que nunca se conheceram. Séculos de distância. Uma só história.",  # 10
    "E em laranja: duzentas e vinte e três vezes, o Novo repete o Antigo palavra por palavra.",  # 11 223
    "Isaías escreveu: Eis que a virgem conceberá.",                                # 12 Is 7:14
    "Séculos depois, Mateus escreve as mesmas palavras: Eis que a virgem conceberá, e dará à luz um filho. Emanuel: Deus conosco.",  # 13 Mt 1:23 (re-recorded alone, 10:32)
    "Em Nazaré, deram a Jesus o livro do profeta Isaías.",                         # 14 Lc 4:17
    "Ele leu: O Espírito do Senhor está sobre mim.",                               # 15 Lc 4:18
    "Fechou o livro. E disse:",                                                    # 16 Lc 4:20
    "Hoje esta escritura se cumpriu em vossos ouvidos.",                           # 17 Lc 4:21 (D major)
    "Isso não é coincidência. É Deus guiando cada linha, do começo ao fim.",       # 18 the point
    "Comenta tua passagem favorita. Ela pode virar o próximo vídeo. E manda pra quem precisa ver isso.",  # 19 CTA (Alex, 10:05)
]
PROMPT = " ... ".join(LINES)
# lines re-recorded alone (warm-up + the line): 19 = the new CTA (cta*.mp3, 10:05), 13 = Mateus quoted in full
# (l13*.mp3, 10:32: "a ligação não ficou bem entendível"). The other lines come from take1.
EXTRA = {"cta": 19, "l13": 13}
PROMPT_EXTRA = {k: " ... ".join([LINES[0], LINES[i]]) for k, i in EXTRA.items()}
# "Faz uma versão resumida também" (Alex, 25/10 10:01): the same takes, these lines only. CUT=curto in the pipeline.
# 10:32: Gn 1:1 -> Jo 1:1 back in ("a parte principal"), Mt 1:23 quoted so the link is felt.
SHORT = [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 16, 17, 18, 19]

QUOTES = {
    4: ("Gen.1.1", ["No princípio criou Deus os céus e a terra"]),
    5: ("John.1.1", ["No princípio era a Palavra"]),
    12: ("Isa.7.14", ["a virgem conceberá"]),
    13: ("Matt.1.23", ["Eis que a virgem conceberá, e dará à luz um filho", "Emanuel", "Deus conosco"]),
    14: ("Luke.4.17", ["o livro do profeta Isaías"]),
    15: ("Luke.4.18", ["O Espírito do Senhor", "sobre mim"]),
    16: ("Luke.4.20", ["Fechou o livro"]),
    17: ("Luke.4.21", ["Hoje esta escritura se cumpriu em vossos ouvidos"]),
}
