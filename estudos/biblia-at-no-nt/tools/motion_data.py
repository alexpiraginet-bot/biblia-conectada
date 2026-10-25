#!/usr/bin/env python3
"""Pack everything the Remotion composition shows into motion/src/data.json (nothing typed by hand in the TSX).

Inputs: renders/.film/narr.json (narration timeline, narration.py), data/stats.json (tools/analyze.py),
data/layout.json (tools/layers.py: positions of books, curves and travelling lights), script.py (QUOTES).

  python3 -I tools/motion_data.py
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import QUOTES  # noqa: E402

S = json.load(open(ROOT / "data/stats.json")); LAY = json.load(open(ROOT / "data/layout.json"))
import os
CUT = os.environ.get("CUT", ""); SUFFIX = "-curto" if CUT == "curto" else ""
N = json.load(open(ROOT / f"renders/.film/narr{SUFFIX}.json"))
REF = json.load(open(ROOT.parent / "biblia-referencias/data/stats.json"))
OSIS, PT = REF["osis"], REF["books_pt"]


def pt(o):
    b, c, v = o.split(".")
    return f"{PT[OSIS.index(b)]} {c}:{v}"


def fmt(n):
    return f"{n:,}".replace(",", ".")


TAIL = 2.6                                    # the end card stays after the last word
# captions show numbers and references as written (the voice says them in words for the TTS)
DISPLAY = [("Sessenta e sete mil, duzentas e noventa e três", fmt(S["ot_nt"])),
           ("Onze mil, quatrocentas e oitenta e quatro", fmt(S["ot_books"][OSIS.index("Ps")]["links"])),
           ("trinta e nove livros", f"{S['ot_books_linked']} livros"),
           ("duzentas e vinte e três", str(S["literal"]["pairs"]))]
assert S["ot_nt"] == 67293 and S["ot_books"][OSIS.index("Ps")]["links"] == 11484 and S["ot_books_linked"] == 39
assert S["literal"]["pairs"] == 223


def display(text):
    for a, b in DISPLAY:
        text = text.replace(a, b)
    return text


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn").replace("ς", "σ")
    w = re.sub(r"[^α-ω]", "", w)
    return re.sub(r"(ε|σι)ν$", r"\1", w) if len(w) > 3 else w


def greek(key, n_nt, n_lxx):
    """the NT words (first n_nt) and the Septuagint words (a window of n_lxx around the match), identical ones lit"""
    e = S["literal"]["examples"][key]
    nt = [{"w": w, "lit": i in e["lit"]} for i, w in enumerate(e["nt_words"])][:n_nt]
    lx = e["lxx_text"].split()
    lxn = [norm(w) for w in lx]
    run = [norm(w) for i, w in enumerate(e["nt_words"]) if i in e["lit"]]
    lit = set()
    for i in range(len(lxn)):                 # longest stretch of the LXX that follows the lit NT words in order
        j, k = i, 0
        while j < len(lxn) and k < len(run) and (lxn[j] == run[k] or not lxn[j]):
            if lxn[j]: k += 1
            j += 1
        if k >= 5:
            lit.update(range(i, j)); break
    first = min(lit)
    win = range(max(0, first - 2), min(len(lx), first - 2 + n_lxx))
    return {"nt": nt, "lxx": [{"w": lx[i], "lit": i in lit} for i in win], "lxxRef": e["lxx"],
            "nLit": len(e["lit"]), "nNt": len(e["nt_words"])}


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
ps = S["ot_books"][OSIS.index("Ps")]; isa = S["ot_books"][OSIS.index("Isa")]; mat = S["nt_books"][0]
out = {
    "fps": 30, "duration": round(N["duration"] + TAIL, 3), "lines": lines, "provisional": bool(N.get("provisional")),
    "layout": LAY,
    "otNt": S["ot_nt"], "nPairs": S["n_pairs"], "otBooks": S["ot_books_linked"], "ntBooks": S["nt_books_linked"],
    "ntVerses": S["nt_verses"], "ntLinked": S["nt_verses_linked"], "ntShare": S["nt_share"],
    "psalms": {"links": ps["links"], "rank": 1}, "isaiah": {"links": isa["links"], "rank": 2},
    "malachi": S["densest_ot"], "matthew": {"links": mat["links"], "pt": mat["pt"]},
    "literal": {"pairs": S["literal"]["pairs"], "ntVerses": S["literal"]["nt_verses"], "nGram": S["literal"]["n_gram"]},
    "famous": S["famous"], "rankGen1John1": S["rank_gen1_john1"],
    "greek714": greek("Isa.7.14~Matt.1.23", 14, 16), "greek611": greek("Isa.61.1~Luke.4.18", 21, 22),
    "blivre": S["blivre"], "site": S["site"],
}
out["cut"] = CUT
assert out["famous"]["Gen.1.1~John.1.1"] == 724 and out["literal"]["pairs"] == 223 and out["matthew"]["links"] == 8696
assert out["malachi"]["pt"] == "Malaquias" and out["isaiah"]["links"] == 8468
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; duration", out["duration"], "s;", len(lines), "lines",
      "(PROVISIONAL timeline)" if out["provisional"] else "")
