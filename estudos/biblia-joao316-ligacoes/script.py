"""Narration of "João 3:16, por dentro" (video 5): exactly the text sent to Higgsfield (text2speech_v2, variant
elevenlabs, preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry per line,
joined with " ... " (a ~0.5 s pause the cutter uses). Line 0 is a warm-up that is cut in the edit (the voice drifts most
at the start of a take). Numbers are spelled out (the voice is English-native; digits invite an English reading).

Every number, quote and word-level claim is asserted by tools/analyze.py (data/stats.json) and tools/check.py:
  1.146 = votes of João 3:16 ~ Romanos 5:8 (5th most voted of 301.539 pairs); 80 = links of João 3:16; 9 = μονογενής in
  the Greek NT (SBLGNT); Gn 22:2 = first אהב (OSHB), first ἀγαπ- (LXX) and first "amar" (BLIVRE); ἠγάπησας (LXX Gn 22:2)
  and ἠγάπησεν (Jo 3:16) are the same verb; οὐκ ἐφείσω (LXX Gn 22:12, 16) and οὐκ ἐφείσατο (Rm 8:32) are the same verb.
QUOTES maps a line to the BLIVRE verse(s) it quotes literally (check.py asserts each fragment is in the verse).
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                      # 0  warm-up (cut)
    "A primeira vez que a Bíblia usa a palavra amar...",                           # 1  hook (Gn 22:2)
    "é sobre um pai, um filho único e um monte.",                                  # 2
    "E isso está ligado a João três, dezesseis.",                                  # 3
    "Oitenta ligações. Cada uma, um versículo que aponta pra outro.",              # 4  site /joao/3/16
    "A maioria vem do Tesouro do Conhecimento das Escrituras, e leitores votam nas que mais ajudam.",  # 5 OpenBible
    "Cinco delas, no grego e no hebraico.",                                        # 6
    "Romanos cinco, oito: a quinta ligação mais votada da Bíblia inteira.",        # 7  link 1 (1.146 votos)
    "Deus prova o seu amor por nós... quando ainda éramos pecadores.",             # 8  Rm 5:8
    "Primeira de João quatro, nove: quase a mesma frase.",                         # 9  link 2
    "E a mesma palavra rara: monoguenés. Unigênito.",                              # 10 μονογενής
    "Só nove vezes no Novo Testamento. Uma delas, sobre Isaque.",                  # 11 9x SBLGNT; Hb 11:17
    "Gênesis vinte e dois:",                                                       # 12 link 3
    "Toma agora teu filho, teu único, Isaque, a quem amas.",                       # 13 Gn 22:2
    "É aqui. A primeira vez. E no grego, o mesmo verbo de João três, dezesseis.",  # 14 אהב / ἠγάπησας ~ ἠγάπησεν
    "Subindo o monte, o filho pergunta: onde está o cordeiro?",                    # 15 Gn 22:7
    "E o pai: Deus se proverá de cordeiro.",                                       # 16 Gn 22:8
    "João um, vinte e nove: Eis o Cordeiro de Deus, que tira o pecado do mundo.",  # 17 link 4, Jo 1:29
    "No monte, o anjo grita: Não estendas tua mão sobre o jovem.",                 # 18 Gn 22:11-12
    "E um carneiro é oferecido no lugar dele.",                                    # 19 Gn 22:13
    "Romanos oito, trinta e dois: Aquele que nem mesmo ao seu próprio Filho poupou...",  # 20 link 5, Rm 8:32
    "No grego, o mesmo verbo de Gênesis vinte e dois.",                            # 21 ἐφείσω ~ ἐφείσατο
    "O filho de Abraão foi poupado. O Filho de Deus... não.",                      # 22 climax
    "Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito.",    # 23 Jo 3:16 (D major)
    "E Primeira de João quatro, dezenove responde: Nós o amamos, porque ele nos amou primeiro.",  # 24 link 6
    "Qual dessas você não conhecia? Comenta.",                                     # 25 CTA
]
PROMPT = " ... ".join(LINES)

QUOTES = {
    8: ("Rom.5.8", ["Deus prova o seu amor por nós", "quando ainda éramos pecadores"]),
    13: ("Gen.22.2", ["Toma agora teu filho, teu único, Isaque, a quem amas"]),
    15: ("Gen.22.7", ["onde está o cordeiro"]),
    16: ("Gen.22.8", ["Deus se proverá de cordeiro"]),
    17: ("John.1.29", ["Eis o Cordeiro de Deus, que tira o pecado do mundo"]),
    18: ("Gen.22.12", ["Não estendas tua mão sobre o jovem"]),
    20: ("Rom.8.32", ["Aquele que nem mesmo ao seu próprio Filho poupou"]),
    23: ("John.3.16", ["Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito"]),
    24: ("1John.4.19", ["Nós o amamos, porque ele nos amou primeiro"]),
}
