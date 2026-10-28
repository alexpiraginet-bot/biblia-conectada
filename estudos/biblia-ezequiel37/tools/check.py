#!/usr/bin/env python3
"""Said == shown == BLIVRE for "Cada osso a seu osso" (video 10, v3).
1. Every line is either a BLIVRE quote (fragments in the cited verse, brackets removed) or marked as mine; the on-screen
   reference tag is the cited verse. 2. The letters on screen are the chapter's own (data.ch37 == stats.ch37 == BLIVRE).
3. The narration said every line, in order (Whisper per line). 4. Chapter numbers on screen come from data.json.
5. No image file is used (the picture is typography and light only).
  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, EXTRA, MINE, REF  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json")); TSX = (ROOT / "motion/src/Main.tsx").read_text()
ok = []
for i, (o, frags) in list(QUOTES.items()) + list(EXTRA.items()):
    for f in frags:
        assert f in S["blivre"][o], (i, o, f)
for L in D["lines"]:
    if L["i"] in MINE:
        assert L["ref"] is None
    else:
        assert L["ref"] == REF[L["i"]] and L["ref"].startswith("Ezequiel " + QUOTES[L["i"]][0].split(".")[1]), L
ok.append(f"{len(QUOTES)} falas citam a BLIVRE com a referência certa na tela; {len(MINE)} falas são autorais (sem referência)")
assert D["ch37"] == S["ch37"] and len(D["ch37"]) == 28 and D["ch47"] == S["ch47"]
ok.append("as letras do vale e as linhas do exército são o texto de Ezequiel 37 da BLIVRE (28 versículos); o rio, Ezequiel 47")
assert [l["i"] for l in N["lines"]] == [i for i, _ in LINES]
low = [(l["i"], l["match"]) for l in N["lines"] if l["match"] < 0.88]
assert not low, low
ok.append(f"narração ({N['voice']}): {len(N['lines'])} falas em ordem, menor concordância Whisper {min(l['match'] for l in N['lines']):.2f}")
assert D["chFrom"] == 37 and D["chTo"] == 47 and D["between"] == S["chapters_between"] == 10
for k in ("data.chFrom", "data.chTo", "data.between"):
    assert k in TSX, k
ok.append("capítulos (37 → 47, +10) lidos de data.json")
assert "staticFile(`img" not in TSX and "<Img" not in TSX
ok.append("nenhuma imagem: só tipografia, luz e água em código")
print("\n".join("ok  " + s for s in ok))
