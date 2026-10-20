#!/usr/bin/env python3
"""Pack everything the Remotion composition shows into motion/src/data.json (nothing typed by hand in the TSX).

Inputs: renders/.film/narr.json (narration timeline, narration.py), data/stats.json + data/arcs.json (tools/analyze.py),
script.py (QUOTES: which line quotes which BLIVRE verse).

  python3 -I tools/motion_data.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import QUOTES  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); A = json.load(open(ROOT / "data/arcs.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
REF = json.load(open(ROOT.parent / "biblia-referencias/data/stats.json"))
OSIS, PT = REF["osis"], REF["books_pt"]


def pt(o):
    b, c, v = o.split(".")
    return f"{PT[OSIS.index(b)]} {c}:{v}"


TAIL = 3.2                                    # the end card stays after the last word
# captions show references as written (the voice says them in words; numbers are spelled out for the TTS)
DISPLAY = [("João três, dezesseis", "João 3:16"), ("Romanos cinco, oito", "Romanos 5:8"),
           ("Primeira de João quatro, nove", "1 João 4:9"), ("Primeira de João quatro, dezenove", "1 João 4:19"),
           ("Gênesis vinte e dois", "Gênesis 22"), ("João um, vinte e nove", "João 1:29"),
           ("Romanos oito, trinta e dois", "Romanos 8:32"), ("Oitenta ligações", "80 ligações"),
           ("monoguenés", "monogenḗs"), ("Só nove vezes", "Só 9 vezes")]


def display(text):
    for a, b in DISPLAY:
        text = text.replace(a, b)
    text = re.sub(r"(\d+:\d+):", r"\1 —", text)      # "João 1:29: Eis" -> "João 1:29 — Eis"
    return re.sub(r"(\d+):$", r"\1", text)             # "Gênesis 22:" -> "Gênesis 22"


lines = []
for L in N["lines"]:
    q = QUOTES.get(L["i"])
    disp = display(L["text"])
    qw = None
    if q:
        c = disp.index(q[1][0])                  # the quote starts at its first BLIVRE fragment
        qw = len(disp[:c].split())
    lines.append({"i": L["i"], "t0": L["t0"], "t1": L["t1"], "text": L["text"], "display": disp,
                  "quote": {"ref": pt(q[0]), "osis": q[0], "word": qw} if q else None,
                  "words": [{"w": w["w"], "t0": w["t0"], "t1": w["t1"]} for w in L["words"]]})
out = {
    "fps": 30, "duration": round(N["duration"] + TAIL, 3), "lines": lines,
    "nPairs": S["n_pairs"], "links": S["links_john316"], "votes": S["pairs"], "rank": S["rank_rom58_pair"],
    "top5": S["top_pairs"][:5], "chain": S["chain"],
    "mono": [pt(r) for r in S["greek"]["monogenes"]["refs"]], "monoCount": S["greek"]["monogenes"]["count_nt"],
    "greek": S["greek"]["text"], "lxx": S["lxx"], "hebrew": S["hebrew"], "blivre": S["blivre"],
    "site": S["site"], "method": S["method"], "chapterIndex": S["chapter_index"],
    "arcs": A,
}
assert out["votes"]["Rom.5.8"] == 1146 and out["links"] == 80 and out["rank"]["rank"] == 5
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; duration", out["duration"], "s;", len(lines), "lines")
