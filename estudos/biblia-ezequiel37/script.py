"""Script of "Cada osso a seu osso" (video 10, version 3, 28/10/2026): the prophet narrates in the words of the Bible.

Alex (28/10 11:09): "faça uma versão totalmente autêntica, autoral sua... esquece gancho, esquece tudo que a gente já
sugeriu". My take: no illustrations, no slogans. Ezekiel tells it in first person, in the BLIVRE text itself
(Ezekiel 37:1-10 and 47:1-5,9, lightly cut for breath), and the picture is made of the text: the letters of the
chapter lie scattered like bones; when the word comes they fly together, "cada osso a seu osso", and become the verse;
the four winds pass through them; the lines stand up as an army; in chapter 47 the text turns to water and rises,
measured, until the camera is under the river. Two lines are mine (the bridge and the close).

LINES: (i, text the voice reads). QUOTES: {i: (osis, BLIVRE fragment)}; brackets of the BLIVRE ([o], [que se fez]) are
read as plain words. tools/analyze.py asserts every fragment is in the verse it cites.
"""
LINES = [
    (1, "A mão do SENHOR veio sobre mim."),
    (2, "E me pôs no meio de um vale que estava cheio de ossos."),
    (3, "E eis que estavam sequíssimos."),
    (4, "E perguntou-me: Filho do homem, por acaso viverão estes ossos?"),
    (5, "E eu respondi: Senhor DEUS, tu o sabes."),
    (6, "Então disse-me: Profetiza sobre estes ossos. Ossos secos, ouvi a palavra do SENHOR."),
    (7, "Então profetizei; e houve um ruído, e eis que se fez um tremor, e os ossos se aproximaram, cada osso a seu osso."),
    (8, "E eis que havia nervos sobre eles, e a carne subiu, e a pele cobriu por cima deles; porém não havia espírito neles."),
    (9, "Vem dos quatro ventos, ó espírito, e sopra sobre estes mortos, para que vivam."),
    (10, "Então o espírito entrou neles, e viveram, e se puseram de pé, um exército extremamente grande."),
    (11, "Dez capítulos depois, o mesmo homem. Outra visão."),
    (12, "E eis que águas saíam de debaixo do umbral da casa."),
    (13, "Ele mediu mil côvados: as águas chegavam aos tornozelos. Mediu mil: aos joelhos. Mediu mais mil: à cintura."),
    (14, "E mediu mais mil, e já era um rio; as águas eram tão profundas que o rio não se podia atravessar a pé, somente a nado."),
    (15, "E toda alma vivente, por onde quer que este rio passar, viverá."),
    (16, "Quem te pôs no vale é quem te leva ao rio."),
]

# (osis, fragments of the BLIVRE verse the line reads, brackets removed); lines in MINE are authorial
QUOTES = {
    1: ("Ezek.37.1", ["A mão do SENHOR veio sobre mim"]),
    2: ("Ezek.37.1", ["me pôs no meio de um vale que estava cheio de ossos"]),
    3: ("Ezek.37.2", ["eis que estavam sequíssimos"]),
    4: ("Ezek.37.3", ["E perguntou-me: Filho do homem, por acaso viverão estes ossos?"]),
    5: ("Ezek.37.3", ["E eu respondi: Senhor DEUS, tu o sabes."]),
    6: ("Ezek.37.4", ["Então disse-me: Profetiza sobre estes ossos", "Ossos secos, ouvi a palavra do SENHOR."]),
    7: ("Ezek.37.7", ["Então profetizei", "e houve um ruído", "eis que se fez um tremor, e os ossos se aproximaram, cada osso a seu osso."]),
    8: ("Ezek.37.8", ["eis que havia nervos sobre eles, e a carne subiu, e a pele cobriu por cima deles; porém não havia espírito neles."]),
    9: ("Ezek.37.9", ["Vem dos quatro ventos, ó espírito, e sopra sobre estes mortos, para que vivam."]),
    10: ("Ezek.37.10", ["então o espírito entrou neles, e viveram, e se puseram de pé, um exército extremamente grande."]),
    12: ("Ezek.47.1", ["eis que águas saíam de debaixo do umbral da casa"]),
    13: ("Ezek.47.3", ["ele mediu mil côvados", "aos tornozelos"]),
    14: ("Ezek.47.5", ["E mediu mais mil, e já era um rio", "as águas eram tão profundas que o rio não se podia atravessar a pé, somente a nado."]),
    15: ("Ezek.47.9", ["toda alma vivente", "viverá"]),
}
EXTRA = {13: ("Ezek.47.4", ["aos joelhos", "à cintura"])}
MINE = {11, 16}
REF = {1: "Ezequiel 37:1", 2: "Ezequiel 37:1", 3: "Ezequiel 37:2", 4: "Ezequiel 37:3", 5: "Ezequiel 37:3", 6: "Ezequiel 37:4",
       7: "Ezequiel 37:7", 8: "Ezequiel 37:8", 9: "Ezequiel 37:9", 10: "Ezequiel 37:10", 12: "Ezequiel 47:1",
       13: "Ezequiel 47:3–4", 14: "Ezequiel 47:5", 15: "Ezequiel 47:9"}
# the voice reads numbers in words; nothing to re-display in v3 (chapter numbers are drawn from data)
DISPLAY = []
PROMPT_TTS = "\n".join(t for _, t in LINES)
