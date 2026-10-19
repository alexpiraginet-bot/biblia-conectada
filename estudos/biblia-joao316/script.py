"""Narration script of "Antes de João 3:16" (remake in the style of "A Bíblia, conectada") — exactly the text sent to
Higgsfield (text2speech_v2, variant elevenlabs, preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf), one entry per
line, joined with " ... " (a ~0.5 s pause the cutter uses); the warm-up line is cut in the edit.

Every number and quote is checked by tools/analyze.py (data/stats.json): 862 = chapter of John 3 (1000) - chapter of
Numbers 21 (138); quotes are BLIVRE (João 3:14, João 3:16 first clause).
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                    # 0 warm-up (not used)
    "Esse arco liga Jesus a uma serpente.",                                       # 1  hook
    "E quem fez essa ligação foi o próprio Jesus.",                               # 2
    "Você conhece João três, dezesseis.",                                         # 3
    "Mas volta dois versículos.",                                                 # 4
    "João três, quatorze.",                                                       # 5
    "Dali sai um arco que volta oitocentos e sessenta e dois capítulos.",          # 6
    "Até Números, vinte e um.",                                                   # 7
    "O povo, no deserto, estava sendo mordido por serpentes.",                    # 8  Nm 21:6
    "Por ordem de Deus, Moisés fez uma serpente de bronze e colocou numa haste.", # 9  Nm 21:8-9
    "Quem era mordido e olhava pra ela... vivia.",                                # 10 Nm 21:9
    "Agora escuta Jesus:",                                                        # 11
    "E como Moisés levantou a serpente no deserto, assim deve o Filho do homem ser levantado.",  # 12 Jo 3:14 BLIVRE
    "Levantado... numa cruz.",                                                    # 13 Jo 12:32-33
    "Lá, quem olhava, vivia.",                                                    # 14
    "Aqui, quem crê nele tem a vida eterna.",                                     # 15 Jo 3:15
    "E só depois vem João três, dezesseis:",                                      # 16
    "Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito.",   # 17 Jo 3:16 BLIVRE
    "Você conhecia a ligação que vem antes?",                                     # 18
    "Comenta: eu não sabia.",                                                     # 19
]
PROMPT = " ... ".join(LINES)
