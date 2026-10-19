"""Narration script of "Os versículos de vocês" — exactly the text sent to Higgsfield (text2speech_v2, variant elevenlabs,
preset voice "Andre" f1e8226e-2248-4d5f-b43c-0a79e9949dbf), one entry per line, warm-up first (cut in the edit).
Takes: source/narr/take0.mp3 (job ee4396fd-3b10-43c3-a1fa-8126a1c58c07), take1.mp3 (1d12eb8e-e0f6-4c67-884b-33ae05a6902a),
take2.mp3 (796486fa-07b2-46ea-9ac3-626cbd6f11df); 3,15 créditos cada.
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                      # 0 warm-up (not used)
    "Vocês mandaram seus versículos.",                             # 1
    "E, como prometido, cada um ganhou o próprio mapa.",           # 2
    "Salmos um, três.",                                            # 3
    "Salmos vinte e três, quatro.",                                # 4
    "Salmos cinquenta e um, dezessete.",                           # 5
    "Isaías cinquenta e cinco, seis: o mais conectado de vocês.",  # 6
    "Jeremias vinte e nove, onze.",                                # 7
    "Oseias seis, três.",                                          # 8
    "Naum um, sete.",                                              # 9
    "Mateus sete, vinte e quatro.",                                # 10
    "Mateus vinte e três, vinte e três.",                          # 11
    "Lucas seis, trinta e cinco.",                                 # 12
    "João três, dezesseis: pedido duas vezes.",                    # 13
    "Romanos oito, dezoito.",                                      # 14
    "Romanos oito, vinte e oito.",                                 # 15
    "Romanos doze, dois.",                                         # 16
    "Filipenses um, vinte e um.",                                  # 17
    "Filipenses três, treze e catorze.",                           # 18
    "Primeira Tessalonicenses quatro, dezesseis.",                 # 19
    "Primeira Timóteo quatro, doze.",                              # 20
    "E Apocalipse vinte, dez.",                                    # 21
    "Juntos, os versículos de vocês se ligam a mais de mil versículos... em cinquenta e nove dos sessenta e seis livros.",  # 22
    "E três de vocês já estavam ligados entre si.",                # 23
    "Comenta o teu versículo.",                                    # 24
    "O próximo mapa pode ser o teu.",                              # 25
]
FIRST_ITEM_LINE = 3   # lines 3..21 = the 19 requested verses, in Bible order (same order as data/stats.json items)
