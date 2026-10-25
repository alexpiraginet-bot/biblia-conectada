"""Narration of "Não foi um grito. Foi uma citação." (video 7): exactly the text sent to Higgsfield (text2speech_v2,
variant elevenlabs, preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry
per line, joined with " ... ". Line 0 is a warm-up that is cut in the edit. Numbers are spelled out.

Concept (25/10, Alex asked for a format entirely of Claude's own, 30-40 s, strongest possible hook): the viewer already
knows Jesus' words on the cross; the turn is that they are the first line of Psalm 22, and the psalm describes the scene
around him. Delivered slow and low: this film wins by weight, not speed. Every pair the film shows is a real OpenBible
pair (tools/analyze.py); every quote is literal BLIVRE text (QUOTES). Honesty notes: Ps 22:16 ("perfuraram minhas mãos")
is left out (disputed Hebrew reading); "ele assim fez" (Ps 22:31) and "Está consumado" (Jo 19:30) are not the same word
and are not called a "ligação" (they are not a pair in the base); the film says the psalm "termina assim".
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                       # 0  warm-up (cut)
    "Deus meu, Deus meu, por que me desamparaste?",                                # 1  Ps 22:1 / Mt 27:46 (frame 0)
    "Isso não foi um grito. Foi uma citação.",                                     # 2  the turn
    "É a primeira linha do Salmo vinte e dois. Escrito mil anos antes da cruz.",   # 3  Ps 22:1
    "E o salmo descreve a cena.",                                                  # 4
    "Zombam de mim e sacodem a cabeça.",                                           # 5  Ps 22:7 -> Mt 27:39
    "Confiou no Senhor, que ele o salve.",                                         # 6  Ps 22:8 -> Mt 27:43
    "Repartem minhas roupas e lançam sortes.",                                     # 7  Ps 22:18 -> Jo 19:24
    "Minha língua está grudada no céu da boca.",                                   # 8  Ps 22:15 -> Jo 19:28 "tenho sede"
    "Esse salmo começa no abandono. E termina assim:",                             # 9  scroll down the psalm
    "Anunciarão a justiça dele ao povo que nascer, porque ele assim fez.",          # 10 Ps 22:31
    "Está consumado.",                                                             # 11 Jo 19:30 (D major)
    "Jesus não estava perguntando por quê. Estava dizendo: olhem o salmo. Está tudo aqui.",  # 12 the point
    "Manda pra quem só conhece a primeira frase.",                                 # 13 CTA
]
PROMPT = " ... ".join(LINES)

# line -> (BLIVRE verse, literal fragments the line quotes)
QUOTES = {
    1: ("Ps.22.1", ["Deus meu, Deus meu, por que me desamparaste"]),
    5: ("Ps.22.7", ["Zombam de mim", "sacodem a cabeça"]),
    6: ("Ps.22.8", ["que ele o salve"]),
    7: ("Ps.22.18", ["minhas roupas", "lançam sortes"]),
    8: ("Ps.22.15", ["Minha língua está grudada no céu da boca"]),
    10: ("Ps.22.31", ["Anunciarão a justiça dele ao povo que nascer, porque ele", "fez"]),
    11: ("John.19.30", ["Está consumado"]),
}
# the four pairs the film draws (psalm verse, gospel verse); votes come from the base, checked against the site
PAIRS = [("Ps.22.7", "Matt.27.39"), ("Ps.22.8", "Matt.27.43"), ("Ps.22.18", "John.19.24"), ("Ps.22.15", "John.19.28")]
