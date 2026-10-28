#!/usr/bin/env python3
"""Every quote and every Bible claim of "Cada osso a seu osso" (video 10, v3), checked against the open data.

Text: BLIVRE, CC BY 4.0 BR (fontes/blivre): Ezekiel 37 and 47 in full (the letters on screen are the chapter's own).
Chapter numbers: ../biblia-referencias/data/xref.npz (book/chapter index, same as videos 1-9).

  python3 -I tools/analyze.py   -> data/stats.json
"""
import json, re, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, EXTRA, MINE, REF  # noqa: E402

D = np.load(ROOT.parent / "biblia-referencias/data/xref.npz"); S = json.load(open(ROOT.parent / "biblia-referencias/data/stats.json"))
CHAP_BOOK, OSIS = D["chap_book"], S["osis"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])
chap = lambda bk, c: int(BFC[OSIS.index(bk)] + c - 1)
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",").replace(" .", ".").strip()

t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
BL, CH = {}, {37: [], 47: []}
for line in t.splitlines():
    if line.startswith("EZE 37:") or line.startswith("EZE 47:"):
        _, cv, tx = line.split(" ", 2); c, v = cv.split(":")
        BL[f"Ezek.{c}.{v}"] = plain(tx); CH[int(c)].append({"v": int(v), "text": plain(tx)})
assert len(CH[37]) == 28 and len(CH[47]) == 23, (len(CH[37]), len(CH[47]))
for i, (o, frags) in list(QUOTES.items()) + list(EXTRA.items()):
    for f in frags:
        assert f in BL[o], (i, o, f)
T = dict(LINES)
assert set(T) - set(QUOTES) == MINE, "every line is a quote or mine"
assert all(i in REF for i in QUOTES)
assert "Dez capítulos" in T[11]
st = {"source": "BLIVRE (CC BY 4.0 BR); chapter index of ../biblia-referencias/data/xref.npz",
      "n_chapters": int(len(D["chap_verses"])), "ch_from": 37, "ch_to": 47, "chapters_between": chap("Ezek", 47) - chap("Ezek", 37),
      "ch37": CH[37], "ch47": CH[47], "blivre": BL}
assert st["chapters_between"] == 10
json.dump(st, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print("ok: 37 has", len(CH[37]), "verses,", sum(len(x["text"]) for x in CH[37]), "chars; 47 has", len(CH[47]), "verses; between", st["chapters_between"])
