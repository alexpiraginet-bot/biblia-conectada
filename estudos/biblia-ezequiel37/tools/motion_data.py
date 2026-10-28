#!/usr/bin/env python3
"""Pack everything the Remotion composition shows into motion/src/data.json (nothing typed by hand in the TSX).
  python3 -I tools/motion_data.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import MINE, REF  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); N = json.load(open(ROOT / "renders/.film/narr.json"))
TAIL = 3.4
lines = [{"i": L["i"], "t0": L["t0"], "t1": L["t1"], "text": L["text"], "ref": REF.get(L["i"]), "mine": L["i"] in MINE,
          "words": [{"w": w["w"], "t0": w["t0"], "t1": w["t1"]} for w in L["words"]]} for L in N["lines"]]
out = {"fps": 30, "duration": round(N["duration"] + TAIL, 3), "voice": N["voice"], "lines": lines,
       "chFrom": S["ch_from"], "chTo": S["ch_to"], "between": S["chapters_between"], "ch37": S["ch37"], "ch47": S["ch47"]}
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; voice", out["voice"], "; duration", out["duration"], "s;", len(lines), "lines")
