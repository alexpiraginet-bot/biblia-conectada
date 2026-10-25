#!/usr/bin/env python3
"""Pack everything the Remotion composition of "A outra marca" (video 8) shows into motion/src/data.json (nothing typed
by hand in the TSX: verses, references, chapter numbers and votes all come from here).

Inputs: renders/.film/narr.json (narration timeline, narration.py), data/stats.json (tools/analyze.py), script.py.

  python3 -I tools/motion_data.py
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import QUOTES, PAIRS  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
REF = json.load(open(ROOT.parent / "biblia-referencias/data/stats.json"))
OSIS, PT = REF["osis"], REF["books_pt"]


def pt(o):
    b, c, v = o.split(".")
    return f"{PT[OSIS.index(b)]} {c}:{v}"


def chap(o):
    b, c, _ = o.split(".")
    return f"{PT[OSIS.index(b)]} {c}"


TAIL = 2.6                                    # the end card stays after the last word
FPS = 60                                      # "muito movimento": 60 fps so the punches and whips stay sharp
DISPLAY = [("Deuteronômio seis", "Deuteronômio 6")]


def display(text):
    for a, b in DISPLAY:
        text = text.replace(a, b)
    return text


lines = [{"i": L["i"], "t0": L["t0"], "t1": L["t1"], "text": L["text"], "display": display(L["text"]),
          "words": [{"w": w["w"], "t0": w["t0"], "t1": w["t1"]} for w in L["words"]]} for L in N["lines"]]

# the verses the film shows; long ones as an excerpt (exact substrings of the BLIVRE verse, joined with an ellipsis)
SHOW = {"Rev.13.16": ["fosse lhes dada uma marca sobre sua mão direita ou sobre suas testas."],
        "Deut.6.8": ["E hás de atá-las por sinal em tua mão, e estarão por frontais entre teus olhos"],
        "Rev.13.4": ["“Quem [é] semelhante à besta? Quem pode batalhar contra ela?”"],
        "Rev.22.4": ["E eles verão o rosto dele, e o nome dele [estará] em suas testas."]}
LIT = {"Rev.13.16": ["mão direita", "testas"], "Deut.6.8": ["por sinal em tua mão", "entre teus olhos"],
       "Rev.13.4": ["Quem [é] semelhante à besta?", "Quem pode batalhar contra ela?"], "Rev.22.4": ["o nome dele [estará] em suas testas"]}
verses = {}
for ref, parts in SHOW.items():
    full = S["blivre"][ref]
    for p in parts: assert p in full, (ref, p)
    for f in LIT[ref]: assert f.lower() in full.lower(), (ref, f)
    text = " … ".join(parts)
    verses[ref.replace(".", "_")] = {"ref": pt(ref), "chapter": chap(ref), "text": ("…" if not full.startswith(parts[0]) else "") + text,
                                    "lit": LIT[ref]}
pairs = [{"a": pt(p["a"]), "b": pt(p["b"]), "votes": p["votes"]} for p in S["pairs"]]
assert [(p["a"], p["b"]) for p in pairs] == [(pt(a), pt(b)) for a, b in PAIRS]
# the chapter counter of line 11 rolls from the beast's chapter to the last one
c13, c22 = int(PAIRS[0][0].split(".")[1]), int(PAIRS[1][1].split(".")[1])
assert (c13, c22) == (13, 22) and PAIRS[0][0].startswith("Rev.") and PAIRS[1][1].startswith("Rev.")
out = {
    "fps": FPS, "duration": round(N["duration"] + TAIL, 3), "lines": lines, "provisional": bool(N.get("provisional")),
    "verses": verses, "pairs": pairs, "book": PT[OSIS.index("Rev")], "roll": [c13, c22],
    "credits": "Ligações e votos: OpenBible.info (CC BY), em Bíblia Conectada · Texto: Bíblia Livre (CC BY 4.0) · Narração com voz sintética",
    "site": S["site"],
}
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; duration", out["duration"], "s;", len(lines), "lines",
      "(PROVISIONAL timeline)" if out["provisional"] else "")
