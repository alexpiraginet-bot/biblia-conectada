#!/usr/bin/env python3
"""Said == shown == BLIVRE for "Do vale ao rio" (video 10, version 2).

1. Every quote fragment of script.py is in the BLIVRE verse it cites (brackets removed) and the caption shows it with
   that reference; every paraphrased line has its Bible text (GROUND) in BLIVRE.
2. Every number on screen comes from data.json, and data.json equals data/stats.json (analyze.py).
3. The narration said every line of the script, in order (Whisper per line, renders/.film/narr.json).
4. God is never a character: no image of God is used; the only people drawn are Ezekiel, the people of the valley and
   Jesus (source/img/ez37_assets.json).
5. Main.tsx has no typed chapter numbers (they come from data.json).

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, GROUND  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
TSX = (ROOT / "motion/src/Main.tsx").read_text()
ASSETS = json.load(open(ROOT / "source/img/ez37_assets.json"))
IMG = json.load(open(ROOT / "data/img.json"))
ok = []
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",")

# 1. quotes and grounding
for i, (o, frag) in QUOTES.items():
    assert frag in plain(S["blivre"][o]), (i, o)
    L = next(l for l in D["lines"] if l["i"] == i)
    assert frag.lower().rstrip(".?") in L["display"].lower(), (i, L["display"])
    assert L["quote"]["osis"] == o
for i, (o, frags) in GROUND.items():
    for frag in frags:
        assert frag in plain(S["blivre"][o]), (i, o, frag)
ok.append(f"{len(QUOTES)} citações = BLIVRE na legenda; {len(GROUND)} paráfrases com o texto conferido")

# 2. numbers on screen
assert D["chFrom"] == S["ch_from"] == 37 and D["chTo"] == S["ch_to"] == 47 and D["between"] == S["chapters_between"] == 10
assert D["ezChapters"] == S["ez_chapters"] == 48 and D["books"] == S["books"]
ok.append("capítulos na tela (37 → 47, +10, 48 em Ezequiel) = data/stats.json")

# 3. the voice said every line, in order
assert [l["i"] for l in N["lines"]] == [i for i, _ in LINES]
low = [(l["i"], l["match"]) for l in N["lines"] if l["match"] < 0.88]
assert not low, low
ok.append(f"narração ({N['voice']}): {len(N['lines'])} falas, menor concordância Whisper {min(l['match'] for l in N['lines']):.2f}")

# 4. no image of God; who is drawn
used = set(IMG)
for k in used:
    assert not re.search(r"\bgod\b", ASSETS[k]["prompt"].lower()), k
ok.append(f"{len(used)} imagens usadas, nenhum prompt desenha Deus (a luz do céu é feita em código: GodLight, Beam, SkyRings)")

# 5. the chapter ruler reads its numbers from data.json
for k in ("data.chFrom", "data.chTo", "data.between", "data.ezChapters"):
    assert k in TSX, k
ok.append("régua de capítulos lida de data.json (chFrom, chTo, between, ezChapters)")
print("\n".join("ok  " + s for s in ok))
