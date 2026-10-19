#!/usr/bin/env python3
"""Checks that what is SAID matches what is SHOWN, for every requested verse:
  - script line (sent to the TTS) == label on screen (book + chapter + verse, numbers spelled out)
  - what Whisper heard in the take actually used == the label's numbers (digits)
  - the requested verses sit in Bible order on the timeline
  python3 -I tools/check.py"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "tools"))
from script import LINES, FIRST_ITEM_LINE  # noqa: E402
from takes import num_pt, norm  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
NARR = json.load(open(ROOT / "renders/.film/narr.json"))
TK = json.load(open(ROOT / "source/narr/takes.json"))
LN = {L["i"]: L for L in NARR["lines"]}
ok = True
prev = -1
for k, it in enumerate(S["items"]):
    li = FIRST_ITEM_LINE + k
    m = re.match(r"^(.*) (\d+):(\d+)(?:–(\d+))?$", it["label"])
    book, c, v, v2 = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
    book_spoken = re.sub(r"^1 ", "Primeira ", book)
    said = f"{book_spoken} {num_pt(c)}, {num_pt(v)}" + (f" e {num_pt(int(v2))}" if v2 else "")
    script_ok = " ".join(norm(said)) in " ".join(norm(LINES[li]))
    take = LN[li]["take"]
    heard = TK["takes"][take]["lines"][li]["heard"]
    heard_ok = " ".join(norm(said)) in " ".join(norm(heard))
    order_ok = it["gv"][0] > prev; prev = it["gv"][0]
    ok &= script_ok and heard_ok and order_ok
    print(f"{'OK ' if script_ok and heard_ok and order_ok else 'ERR'} {it['label']:24s} | script: {LINES[li]:52s} | {take}: {heard}")
print("ALL OK" if ok else "MISMATCH")
sys.exit(0 if ok else 1)
