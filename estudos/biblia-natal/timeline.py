#!/usr/bin/env python3
"""Film timeline (seconds) from the narration words — shared by score.py (film.py computes the same dict)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NARR = json.load(open(ROOT / "renders/.film/narr.json"))
LID = {L["id"]: L for L in NARR["lines"]}
DUR = float(NARR["duration"])


def WT(lid, k): return LID[lid]["words"][k]["t0"]
def WE(lid, k): return LID[lid]["words"][k]["t1"]
def LS(lid): return LID[lid]["t0"]
def LE(lid): return LID[lid]["t1"]


B = dict(
    t_land=WT("teaser", 4), t_assim=WT("teaser", 6), t_esta=WT("teaser", 7), t_escr=WT("teaser", 8),
    rew0=LE("teaser"), hook0=LS("hook"), prof=WT("hook", 6), city=WT("hook", 11), belem=WT("belem", 0),
    data0=LE("belem") + 0.25, nasc=WT("dados", 1), quatro=WT("dados", 5), liga=WT("dados", 7), testa=WE("dados", 17),
    livros0=WT("livros", 1), naz0=LE("livros") + 0.18, naz_lab=WT("nazare", 0), clipN0=LS("anjo"), isa=WT("isaias", 1),
    virgem=WT("virgem", 0), votes0=LE("virgem") + 0.05, votada=WT("votada", 4), km0=LE("votada") + 0.14, km_go=WT("km", 0),
    km_land=WT("km", 3), magos0=LS("magos"), jer=WT("magos", 3), clipJ0=LS("herodes"), herodes=WT("herodes", 4),
    esc0=LS("escrito"), esc_land=WT("escrito", 1), assim=WT("escrito", 3), esta=WT("escrito", 4), escr=WT("escrito", 5),
    egy0=LS("egito"), egy_word=WT("egito", 6), clipE0=LS("filho"), volta0=LS("conectado"), biblia=WT("conectado", 6),
    is96=WT("is96", 0), menino=WT("menino", 0), clipP0=LE("menino"), depois=WT("depois", 0), salv=WT("salvador", 0),
    final0=LE("salvador") + 0.09, antes=WT("final", 0), ja=WT("final", 3), end=DUR,
)
B["clipB0"] = B["esc_land"] + 0.63
B["dome0"] = B["volta0"] + 1.53
B["resposta"] = WT("herodes", 12)
