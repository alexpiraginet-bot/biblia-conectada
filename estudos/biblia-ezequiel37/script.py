"""Script of "Do vale ao rio" (video 10, Ezekiel 37 -> 47): our own text, written 28/10/2026 (version 2).

Version 2 (Alex, 28/10 10:11; then 10:38 'parece desanimado... sem gancho inicial forte'): follow what the sermon means (the valley and the desert are places God leads us through;
in chapter 47 the prophet is in a river that overflows), recreated in our own words, without the cross-reference
framing of version 1, and God never drawn as a character (light from the sky only; Jesus may be drawn).

Alex sent a sermon by another preacher on Ezekiel 37 as the idea. A sermon is a protected work (Lei 9.610/98, art. 7º, II),
so nothing of it is used: not its audio, not its wording. The passage, the order of the Bible text and the cross references
are ours (art. 8º, I: ideas are not protected). Quotes are BLIVRE (CC BY 4.0 BR).

LINES: (i, text the voice reads). QUOTES: {i: (osis, BLIVRE fragment shown and checked)}; the fragment is the BLIVRE text
with the editorial brackets removed ("tu [o] sabes" -> "tu o sabes"). tools/check.py asserts every fragment is in BLIVRE.
"""
LINES = [
    (1, "Isso não é um cemitério."),
    (2, "É o vale para onde a mão de Deus levou Ezequiel."),
    (3, "Um vale cheio de ossos secos."),
    (4, "Não foi castigo. Não foi acaso. Foi Deus."),
    (5, "Com Jesus também foi assim: cheio do Espírito Santo, foi levado pelo Espírito ao deserto."),
    (6, "Vale e deserto não são destino. São passagem."),
    (7, "Porque é no vale que Deus pergunta: por acaso viverão estes ossos?"),
    (8, "E é no vale que o sopro dele devolve a vida."),
    (9, "Mas a história não termina aí."),
    (10, "No capítulo quarenta e sete, águas saem do templo. Nos tornozelos. Nos joelhos. Na cintura."),
    (11, "Até virar um rio que não se podia atravessar a pé, somente a nado."),
    (12, "O mesmo Deus que te levou ao vale está te levando para o rio."),
    (13, "O vale é caminho. O rio é promessa."),
    (14, "Se você está num vale hoje, escreve aqui: eu vou atravessar."),
]

QUOTES = {
    5: ("Luke.4.1", "foi levado pelo Espírito ao deserto"),
    7: ("Ezek.37.3", "por acaso viverão estes ossos?"),
    11: ("Ezek.47.5", "não se podia atravessar a pé, somente a nado"),
}

# Bible text behind the lines that paraphrase (not quoted on screen, checked to exist in BLIVRE)
GROUND = {
    2: ("Ezek.37.1", ["A mão do SENHOR veio sobre mim", "me pôs no meio de um vale"]),
    3: ("Ezek.37.1", ["um vale que estava cheio de ossos"]),
    8: ("Ezek.37.10", ["o espírito entrou neles, e viveram"]),
    10: ("Ezek.47.4", ["joelhos", "cintura"]),
}
LINKS = {}

# the voice reads numbers in words; captions show them as written
DISPLAY = [("capítulo quarenta e sete", "capítulo 47")]

PROMPT_TTS = "\n".join(t for _, t in LINES)
