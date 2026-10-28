#!/usr/bin/env python3
"""Every number and quote of "Do vale ao rio" (video 10, version 2), checked against the open data.

Text: BLIVRE, CC BY 4.0 BR (fontes/blivre). Chapter numbers: ../biblia-referencias/data/xref.npz (book/chapter index of
the 1.189 chapters, same as videos 1-9). Version 2 shows no cross references (Alex, 28/10 10:11).

  python3 -I tools/analyze.py   -> data/stats.json (asserts every quote and every Bible claim of script.py)
"""
import json, re, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, GROUND  # noqa: E402

REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
CHAP_BOOK = D["chap_book"]
OSIS = S["osis"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])


def chap(bk, c):
    return int(BFC[OSIS.index(bk)] + c - 1)


def blivre():
    t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
    code = {"Ezek": "EZE", "Luke": "LUK"}
    want = {o for o, _ in QUOTES.values()} | {o for o, _ in GROUND.values()} | {"Ezek.37.1", "Ezek.37.2", "Ezek.37.3", "Ezek.37.9",
                                                                                "Ezek.37.10", "Ezek.47.1", "Ezek.47.3", "Ezek.47.4", "Ezek.47.5"}
    out = {}
    for line in t.splitlines():
        for o in want:
            b, c, v = o.split(".")
            if line.startswith(f"{code[b]} {c}:{v} "):
                out[o] = line.split(" ", 2)[2]
    assert set(out) == want, want - set(out)
    return out


BL = blivre()
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",")
for i, (o, frag) in QUOTES.items():
    assert frag in plain(BL[o]), (i, o, frag, plain(BL[o]))
for i, (o, frags) in GROUND.items():
    for frag in frags:
        assert frag in plain(BL[o]), (i, o, frag)
T = dict(LINES)
# what the voice claims, against the text
assert "Espírito Santo" in BL["Luke.4.1"] and "deserto" in BL["Luke.4.1"]                       # line 5
assert "por acaso viverão estes ossos?" in BL["Ezek.37.3"]                                        # line 7: asked in the valley (37:1-3)
assert "sopra" in BL["Ezek.37.9"] and "viveram" in BL["Ezek.37.10"]                               # line 8: the breath gives life
assert "águas saíam de debaixo do umbral da casa" in BL["Ezek.47.1"]                              # line 10: water from the temple
assert "tornozelos" in BL["Ezek.47.3"] and "joelhos" in BL["Ezek.47.4"] and "cintura" in BL["Ezek.47.4"]
assert "somente a nado" in BL["Ezek.47.5"]                                                         # line 11
assert "quarenta e sete" in T[10] and "sequíssimos" in BL["Ezek.37.2"]

NCH = len(D["chap_verses"])
books = [{"pt": S["books_pt"][b], "x0": round(int(BFC[b]) / NCH, 6), "x1": round((int(BFC[b + 1]) if b < 65 else NCH) / NCH, 6)}
         for b in range(66)]
st = {
    "source": "BLIVRE (CC BY 4.0 BR); chapter index of ../biblia-referencias/data/xref.npz",
    "books": books,
    "n_chapters": len(D["chap_verses"]),
    "ez_chapters": int((CHAP_BOOK == OSIS.index("Ezek")).sum()),
    "ch_from": 37, "ch_to": 47,
    "chapters_between": chap("Ezek", 47) - chap("Ezek", 37),
    "blivre": BL,
}
assert st["ez_chapters"] == 48 and st["chapters_between"] == 10
json.dump(st, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in st.items() if k not in ("blivre", "books")}, ensure_ascii=False))
print("quotes ok:", {i: q[0] for i, q in QUOTES.items()}, "grounded:", {i: g[0] for i, g in GROUND.items()})
