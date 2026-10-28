#!/usr/bin/env python3
"""Said == shown == data == BLIVRE for "Ossos secos, rio da vida" (video 10).

1. Every quote fragment of script.py is in the BLIVRE verse it cites (brackets removed), and the caption shows it.
2. Every number the composition shows comes from data.json, and data.json equals data/stats.json (analyze.py).
3. The narration said every line (Whisper per line, renders/.film/narr.json) and no number on screen contradicts the voice.
4. The film never calls Ezekiel 37 -> 47 a link (there is no such pair in the base).
5. Main.tsx has no typed digits that look like data (votes, counts) outside data.json.

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, LINKS  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
TSX = (ROOT / "motion/src/Main.tsx").read_text()
ok = []
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",")

# 1. quotes
for i, (o, frag) in QUOTES.items():
    assert frag in plain(S["blivre"][o]), (i, o)
    L = next(l for l in D["lines"] if l["i"] == i)
    assert frag.lower().rstrip(".?") in L["display"].lower(), (i, L["display"])
    assert L["quote"]["osis"] == o
ok.append(f"{len(QUOTES)} citações = BLIVRE e aparecem na legenda")

# 2. numbers on screen = stats
assert D["links"] == S["links"] and D["ez37"] == S["ez37"] and D["ez471"] == S["ez47_1"]
assert D["nch"] == S["n_chapters"] == 1189 and D["ch37"] == S["chapter_ez37"] and D["between"] == S["chapters_between"] == 10
assert D["arcs37"] == S["arcs37"] and D["arcs471"] == S["arcs471"]
assert len(D["arcs37"]) == S["ez37"]["pairs"] and len(D["arcs471"]) == S["ez47_1"]["links"]
for k, (a, b) in LINKS.items():
    assert D["links"][k]["a"] == a and D["links"][k]["b"] == b and D["links"][k]["votes"] > 0
ok.append("números da tela = data/stats.json: " + ", ".join(f"{v['a_pt']}↔{v['b_pt']} {v['votes']}" for v in D["links"].values())
          + f"; Ez 37 → {S['ez37']['verses_outside']} versículos; Ez 47:1 → {S['ez47_1']['links']}; cap. {S['chapter_ez37']} de {S['n_chapters']}")

# 3. the voice said every line (as in the script) and spoken numbers match the screen
assert [l["i"] for l in N["lines"]] == [i for i, _ in LINES]
low = [(l["i"], l["match"]) for l in N["lines"] if l["match"] < 0.9]
assert not low, low
assert "trinta e sete" in dict(LINES)[3] and "quarenta e sete" in dict(LINES)[11] and "sete, trinta e oito" in dict(LINES)[14]
ok.append(f"narração ({N['voice']}): {len(N['lines'])} falas, menor concordância Whisper {min(l['match'] for l in N['lines']):.2f}")

# 4. 37 -> 47 is never a link
assert S["direct_37_47_pairs"] == 0
for i, t in LINES:
    if "quarenta e sete" in t: assert "lig" not in t, t
ok.append("Ez 37 → Ez 47 não aparece como ligação (0 pares na base)")

# 5. no hand-typed data in the TSX: every vote/count is read from data.*
code = re.sub(r"//.*", "", TSX)
for n in ("477", "29", "839", "1189", "1.189", "602", "12 votos", "10 votos", "50 votos", "36 votos"):
    assert not re.search(r"(?<![\d.])" + re.escape(n) + r"(?![\d])", code), n
ok.append("Main.tsx sem números de dados digitados")
print("\n".join("ok  " + s for s in ok))
