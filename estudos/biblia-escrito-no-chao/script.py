"""Narration of "Escrito no chão" (video 11): exactly the text sent to the narrator (voice "Andre", ElevenLabs via
Higgsfield text2speech_v2, preset f1e8226e-2248-4d5f-b43c-0a79e9949dbf, the narrator of the series), one entry per
line, joined with " ... ". Line 0 is a warm-up that is cut in the edit. Numbers are spelled out.

Concept (10/11/2026, Alex: "uma história nova… história de Jesus… engajamento forte e retenção máxima… você comanda",
made with p5.brush + Higgsfield): John 8, the only scene in the four Gospels where Jesus writes. The film opens on the
question nobody can answer (what did he write?), tells the scene from the ground (dust, long morning shadows, stones),
and pays off with a connection instead of a guess: the most voted cross-reference of John 8:6 is Jeremiah 17:13
("serão escritos no chão; pois abandonaram… a fonte de águas vivas"), and the same verse of Jeremiah is tied to what
Jesus cried out the day before in the same temple, John 7:37 ("Se alguém tem sede, venha a mim, e beba"). The sermon is
ours: dust keeps the name of whoever turns away from the fountain; water erases what is written in dust.

Honesty notes: the film never shows legible writing on the ground and never says what he wrote ("ninguém sabe"). "A
ligação mais votada" is the base's fact (tools/analyze.py). "Seiscentos anos antes" is a general historical statement
(Jeremiah, late 7th to early 6th century BC), not a number of the base. "Na véspera" follows the text as it stands
(John 7:37 the last day of the feast; 7:53 everyone goes home; 8:2 "pela manhã cedo voltou ao Templo"). John 7:53-8:11
is absent from the oldest manuscripts; the ready answer is in LEGENDA.md.

The film is the short cut (10/11, Alex: "nem muito longo... vídeos curtos"): narration.py uses lines 1, 2, 3 (without
"De manhã cedo, no templo,"), 6, 9, 10, 13, 15, 16 and 17 (without "E me conta:"), 120 words in 37 s. The takes hold
the whole script, so John 7:37 (lines 11 and 12) and the second writing (line 7) are recorded and ready for another
film. "Saíram um a um" (line 8) is a caption over the stone that falls. With line 7 out, "só escreve uma vez" means the
one scene: in it he bends and writes twice (8:6 and 8:8); the ready answer is in LEGENDA.md.
"""
LINES = [
    "Olá, pessoal, tudo bem? Vamos começar.",                                       # 0  warm-up (cut)
    "Nos evangelhos, Jesus só escreve uma vez.",                                     # 1  hook (frame 0)
    "No chão, com o dedo. E a Bíblia não conta o quê.",                              # 2  the open question
    "De manhã cedo, no templo, jogaram uma mulher no meio de todos. Adultério. A lei mandava apedrejar.",  # 3 Jo 8:2-5
    "Cobraram uma resposta. Ele se abaixou, e escrevia com o dedo na terra.",        # 4  Jo 8:6
    "Aí se levantou:",                                                               # 5
    "Aquele de vós que está sem pecado, seja o primeiro que atire pedra contra ela.",  # 6 Jo 8:7
    "E voltou a escrever.",                                                          # 7  Jo 8:8
    "Saíram um a um, começando dos mais velhos.",                                    # 8  Jo 8:9
    "Mas a ligação mais votada desse versículo é de Jeremias, seiscentos anos antes:",  # 9 the turn (Jo 8:6 <-> Jr 17:13)
    "Os que de mim se afastam serão escritos no chão; pois abandonaram ao Senhor, a fonte de águas vivas.",  # 10 Jr 17:13
    "E na véspera, ali mesmo, Jesus tinha gritado:",                                 # 11
    "Se alguém tem sede, venha a mim, e beba.",                                      # 12 Jo 7:37
    "Quem dá as costas pra fonte fica com o nome no pó. Só que pó, a água apaga.",   # 13 ours
    "Pra ela, ele disse:",                                                           # 14
    "Nem eu também te condeno; vai, e não peques mais.",                             # 15 Jo 8:11
    "Hoje a pedra é um comentário. Solta.",                                          # 16 ours (today)
    "E me conta: o que você acha que ele escreveu?",                                 # 17 CTA
]
PROMPT = " ... ".join(LINES)

# line -> (BLIVRE verse, literal fragments the line quotes)
QUOTES = {
    4: ("John.8.6", ["escrevia com o dedo na terra"]),
    6: ("John.8.7", ["Aquele de vós que está sem pecado, seja o primeiro que atire pedra contra ela"]),
    8: ("John.8.9", ["saíram um a um, começando dos mais velhos"]),
    10: ("Jer.17.13", ["os que de mim se afastam", "serão escritos no chão; pois abandonaram ao SENHOR, a fonte de águas vivas"]),
    12: ("John.7.37", ["Se alguém tem sede, venha a mim, e beba"]),
    15: ("John.8.11", ["Nem eu também te condeno; vai, e não peques mais"]),
}
# paraphrases that must stay true to a verse (fragment of the verse that carries the fact)
FACTS = {
    3: [("John.8.2", "pela manhã cedo voltou ao Templo"), ("John.8.3", "uma mulher tomada em adultério"),
        ("John.8.4", "pondo-a no meio"), ("John.8.5", "que as tais sejam apedrejadas")],
    4: [("John.8.6", "tentando-o"), ("John.8.6", "inclinando-se Jesus")],
    5: [("John.8.7", "ele se endireitou")],
    7: [("John.8.8", "voltando a se inclinar, escrevia na terra")],
    11: [("John.7.37", "no último e grande dia da festa"), ("John.7.53", "E cada um foi para sua casa"),
         ("John.8.2", "pela manhã cedo voltou ao Templo")],
    14: [("John.8.10", "Mulher, onde estão aqueles teus acusadores")],
}
# the two threads the film draws; votes come from the base (tools/analyze.py)
PAIRS = [("John.8.6", "Jer.17.13"), ("Jer.17.13", "John.7.37")]
# lines that are ours (no quote): the hook, the turn, the sermon, the call
MINE = {1, 2, 9, 13, 16, 17}
