"""Script of "Ossos secos, rio da vida" (video 10, Ezekiel 37 -> 47): our own text, written 28/10/2026.

Alex sent a sermon by another preacher on Ezekiel 37 as the idea. A sermon is a protected work (Lei 9.610/98, art. 7º, II),
so nothing of it is used: not its audio, not its wording. The passage, the order of the Bible text and the cross references
are ours (art. 8º, I: ideas are not protected). Quotes are BLIVRE (CC BY 4.0 BR); links and votes are OpenBible.info (CC BY).

LINES: (i, text the voice reads). QUOTES: {i: (osis, BLIVRE fragment shown and checked)}; the fragment is the BLIVRE text
with the editorial brackets removed ("tu [o] sabes" -> "tu o sabes"). tools/check.py asserts every fragment is in BLIVRE.
"""
LINES = [
    (1, "Um vale cheio de ossos secos."),
    (2, "E Deus pergunta: por acaso viverão estes ossos?"),
    (3, "Ezequiel, capítulo trinta e sete."),
    (4, "O profeta responde: Senhor Deus, tu o sabes."),
    (5, "Então Deus manda: profetiza sobre estes ossos."),
    (6, "Houve um tremor, e os ossos se aproximaram, cada osso a seu osso."),
    (7, "Nervos. Carne. Pele. Porém não havia espírito neles."),
    (8, "Até que vem o sopro. O espírito entrou neles, e viveram."),
    (9, "Esse sopro liga Ezequiel ao começo da Bíblia: Deus assoprou em seu nariz sopro de vida."),
    (10, "E liga ao Evangelho: Jesus soprou sobre os discípulos e disse: Recebei o Espírito Santo."),
    (11, "No capítulo quarenta e sete, Ezequiel vê águas saindo do templo."),
    (12, "Nos tornozelos. Nos joelhos. Na cintura."),
    (13, "Até virar um rio que não se podia atravessar a pé."),
    (14, "Esse rio está ligado a João sete, trinta e oito: rios de água viva."),
    (15, "E ao último capítulo da Bíblia: o rio puro da água da vida."),
    (16, "Do vale de ossos secos ao rio da vida."),
    (17, "Comenta qual versículo a gente liga no próximo vídeo."),
]

QUOTES = {
    2: ("Ezek.37.3", "por acaso viverão estes ossos?"),
    4: ("Ezek.37.3", "Senhor DEUS, tu o sabes."),
    5: ("Ezek.37.4", "Profetiza sobre estes ossos"),
    6: ("Ezek.37.7", "os ossos se aproximaram, cada osso a seu osso."),
    7: ("Ezek.37.8", "porém não havia espírito neles."),
    8: ("Ezek.37.10", "o espírito entrou neles, e viveram"),
    9: ("Gen.2.7", "assoprou em seu nariz sopro de vida"),
    10: ("John.20.22", "Recebei o Espírito Santo."),
    13: ("Ezek.47.5", "não se podia atravessar a pé"),
    14: ("John.7.38", "rios de água viva"),
    15: ("Rev.22.1", "o rio puro da água da vida"),
}

# the links the film lights (both ends real verses; votes come from the data, never typed)
LINKS = {
    "breath_gen": ("Ezek.37.5", "Gen.2.7"),
    "breath_john": ("Ezek.37.9", "John.20.22"),
    "river_john": ("Ezek.47.1", "John.7.38"),
    "river_rev": ("Ezek.47.1", "Rev.22.1"),
}

# the voice reads numbers in words; captions show them as written
DISPLAY = [("Ezequiel, capítulo trinta e sete", "Ezequiel 37"), ("Gênesis dois, sete", "Gênesis 2:7"),
           ("João sete, trinta e oito", "João 7:38"), ("capítulo quarenta e sete", "capítulo 47"),
           ("Senhor Deus, tu o sabes", "Senhor DEUS, tu o sabes")]

PROMPT_TTS = "\n".join(t for _, t in LINES)
