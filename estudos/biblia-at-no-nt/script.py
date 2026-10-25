"""Narration of "O Antigo dentro do Novo" (video 6): exactly the text sent to Higgsfield (text2speech_v2, variant
elevenlabs, preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry per line,
joined with " ... " (a ~0.5 s pause the cutter uses). Line 0 is a warm-up that is cut in the edit. Numbers are spelled
out (the voice is English-native; digits invite an English reading). Hook in the mould of video 1 ("Isso não é um
arco-íris. É a Bíblia inteira."): an image that looks like something else, then the turn. Alex chose "Parece fibra
óptica." over "Isso não é fibra óptica." (25/10): shorter, and it is what the viewer is already thinking.

Every number and claim is asserted by tools/analyze.py (data/stats.json) and tools/check.py:
  67.293 AT-NT pairs (OpenBible.info); 39/39 and 27/27 books linked; 6.808 of 7.957 NT verses (85,6%) link to the OT
  ("mais de oito em cada dez"); Salmos 11.484 (1st), Isaías 8.468 (2nd); Malaquias 12,42 per verse (1st, the last OT
  book); Mateus 8.696 (1st NT); orange = 223 pairs with 5+ identical Greek words in order (LXX x SBLGNT) that OpenBible
  links; Is 7:14 ~ Mt 1:23 (10 words) and Is 61:1 ~ Lc 4:18 (18 of 22 words) among them.
QUOTES maps a line to the BLIVRE verse it quotes literally (check.py asserts each fragment is in the verse).
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                       # 0  warm-up (cut)
    "Parece fibra óptica.",                                                        # 1  hook (Alex, 25/10)
    "Mas é o Antigo Testamento dentro do Novo.",                                   # 2  the turn
    "Cada fio liga um versículo do Antigo a um do Novo.",                           # 3
    "Tipo: No princípio criou Deus os céus e a terra...",                           # 4  Gn 1:1
    "ligado a: No princípio era a Palavra.",                                        # 5  Jo 1:1 (724 votos)
    "São sessenta e sete mil, duzentas e noventa e três ligações.",                 # 6  67.293
    "Mais de oito em cada dez versículos do Novo apontam pro Antigo.",              # 7  85,6%
    "Desce comigo pelos trinta e nove livros.",                                     # 8  scroll
    "O mais ligado? Salmos. Onze mil, quatrocentas e oitenta e quatro.",            # 9  11.484
    "Depois, Isaías.",                                                              # 10 8.468
    "Mas, pelo tamanho, nenhum aponta mais pro Novo que o último: Malaquias.",      # 11 12,42 por versículo
    "Do outro lado, quem mais puxa o Antigo? Mateus.",                              # 12 8.696
    "E em laranja: quando o Novo repete o Antigo palavra por palavra, no grego.",   # 13 223 pares
    "Isaías sete, catorze. E Mateus repete: Eis que a virgem conceberá.",           # 14 Mt 1:23
    "Em Nazaré, deram a Jesus o livro do profeta Isaías.",                          # 15 Lc 4:17
    "Ele leu: O Espírito do Senhor está sobre mim, porque ele me ungiu para evangelizar os pobres.",  # 16 Lc 4:18
    "Ele fechou o livro. Os olhos de todos na sinagoga estavam fixos nele.",        # 17 Lc 4:20
    "E disse: Hoje esta escritura se cumpriu em vossos ouvidos.",                   # 18 Lc 4:21 (D major)
    "Qual livro do Antigo você ainda não leu? Comenta.",                            # 19 CTA
]
PROMPT = " ... ".join(LINES)

QUOTES = {
    4: ("Gen.1.1", ["No princípio criou Deus os céus e a terra"]),
    5: ("John.1.1", ["No princípio era a Palavra"]),
    14: ("Matt.1.23", ["Eis que a virgem conceberá"]),
    15: ("Luke.4.17", ["o livro do profeta Isaías"]),
    16: ("Luke.4.18", ["O Espírito do Senhor", "sobre mim, porque ele me ungiu para evangelizar os pobres"]),
    17: ("Luke.4.20", ["Ele fechou o livro", "Os olhos de todos na sinagoga estavam fixos nele"]),
    18: ("Luke.4.21", ["Hoje esta escritura se cumpriu em vossos ouvidos"]),
}
