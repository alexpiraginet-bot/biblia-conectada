#!/usr/bin/env python3
"""Pack everything the Remotion composition shows into motion/src/data.json (nothing typed by hand in the TSX).

Inputs: renders/.film/narr.json (narration.py), data/stats.json (tools/analyze.py), data/img.json (tools/prep_img.py),
script.py (QUOTES, DISPLAY).

  python3 -I tools/motion_data.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import QUOTES, DISPLAY  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); N = json.load(open(ROOT / "renders/.film/narr.json"))
IMG = json.load(open(ROOT / "data/img.json"))
TAIL = 3.0                                    # the end card stays after the last word (score.py uses the same)
REFPT = {"Ezek": "Ezequiel", "Luke": "Lucas"}


def display(text):
    for a, b in DISPLAY:
        text = text.replace(a, b)
    return text


lines = []
for L in N["lines"]:
    disp = display(L["text"]); q = QUOTES.get(L["i"]); quote = None
    if q:
        c = disp.lower().index(q[1].lower().rstrip(".?"))       # the quote starts at its BLIVRE fragment
        b, ch, v = q[0].split(".")
        quote = {"osis": q[0], "ref": f"{REFPT[b]} {ch}:{v}", "word": len(disp[:c].split())}
    lines.append({"i": L["i"], "t0": L["t0"], "t1": L["t1"], "display": disp, "quote": quote,
                  "words": [{"w": w["w"], "t0": w["t0"], "t1": w["t1"]} for w in L["words"]]})
out = {
    "fps": 30, "duration": round(N["duration"] + TAIL, 3), "voice": N["voice"], "lines": lines, "img": IMG,
    "nch": S["n_chapters"], "ezChapters": S["ez_chapters"], "between": S["chapters_between"],
    "chFrom": S["ch_from"], "chTo": S["ch_to"], "books": S["books"],
}
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; voice", out["voice"], "; duration", out["duration"], "s;", len(lines), "lines")
