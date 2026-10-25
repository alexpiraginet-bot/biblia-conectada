#!/usr/bin/env python3
"""Pack everything the Remotion composition shows into motion/src/data.json (nothing typed by hand in the TSX).

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


TAIL = 3.0                                    # the end card stays after the last word
DISPLAY = [("Salmo vinte e dois", "Salmo 22")]


def display(text):
    for a, b in DISPLAY:
        text = text.replace(a, b)
    return text


lines = []
for L in N["lines"]:
    q = QUOTES.get(L["i"])
    disp = display(L["text"])
    qw = None
    if q:
        low = disp.lower(); c = low.index(q[1][0].lower())
        qw = len(disp[:c].split())
    lines.append({"i": L["i"], "t0": L["t0"], "t1": L["t1"], "text": L["text"], "display": disp,
                  "quote": {"ref": pt(q[0]), "osis": q[0], "word": qw} if q else None,
                  "words": [{"w": w["w"], "t0": w["t0"], "t1": w["t1"]} for w in L["words"]]})
# what lights on each side of a pair (literal BLIVRE fragments)
LIT = {"Ps.22.7": (["zombam de mim", "sacodem a cabeça"], ["balançando suas cabeças"]),
       "Ps.22.8": (["Ele confiou no “SENHOR”", "que ele o salve"], ["Confiou em Deus, livre-o agora"]),
       "Ps.22.18": (["repartem entre si minhas roupas", "lançam sortes"], ["lancemos sortes", "partiram minhas roupas"]),
       "Ps.22.15": (["minha língua está grudada no céu da boca"], ["Tenho sede"])}
# long verses are shown as excerpts: exact substrings of the BLIVRE verse, joined with an ellipsis
SHOW = {"John.19.24": ["lancemos sortes sobre ela", "Entre si partiram minhas roupas, e sobre minha veste lançaram sortes."],
        "John.19.28": ["sabendo Jesus que já todas as coisas estavam feitas", "ele disse: Tenho sede."],
        "Ps.22.15": ["minha língua está grudada no céu da boca; e tu me pões no pó da morte;"],
        "Ps.22.8": ["Ele confiou no “SENHOR”; [agora] que ele o salve e o liberte;"]}


def show(ref):
    t = S["blivre"][ref]
    if ref not in SHOW: return t
    for f in SHOW[ref]: assert f in t, (ref, f)
    return "…" + " … ".join(SHOW[ref])


pairs = []
for p in S["pairs"]:
    a, b = LIT[p["ps"]]
    for f in a: assert f.lower() in S["blivre"][p["ps"]].lower(), (p["ps"], f)
    for f in b: assert f.lower() in S["blivre"][p["nt"]].lower(), (p["nt"], f)
    pairs.append({**p, "psText": show(p["ps"]), "ntText": show(p["nt"]), "psLit": a, "ntLit": b,
                  "line": {"Ps.22.7": 5, "Ps.22.8": 6, "Ps.22.18": 7, "Ps.22.15": 8}[p["ps"]]})
out = {
    "fps": 30, "duration": round(N["duration"] + TAIL, 3), "lines": lines, "provisional": bool(N.get("provisional")),
    "first": {"ps": S["blivre"]["Ps.22.1"], "mt": S["blivre"]["Matt.27.46"], "votes": S["first_line"]["votes"],
              "lit": "Deus meu, Deus meu, por que me desamparaste", "litMt": "Deus meu, Deus meu, porque me desamparaste",
              "hebrew": S["hebrew"]["first_words"]},
    "pairs": pairs, "psalm": S["psalm22"],
    "last": {"text": S["blivre"]["Ps.22.31"], "lit": "porque ele [assim] fez", "hebrew": S["hebrew"]["last_word"],
             "john": S["blivre"]["John.19.30"], "johnLit": "Está consumado"},
    "blivre": S["blivre"], "site": S["site"],
}
assert out["first"]["lit"] in out["first"]["ps"] and out["first"]["litMt"] in out["first"]["mt"]
assert out["last"]["lit"] in out["last"]["text"] and out["last"]["johnLit"] in out["last"]["john"]
assert len(out["psalm"]) == 31 and out["first"]["votes"] == 126
dst = ROOT / "motion/src/data.json"
json.dump(out, open(dst, "w"), ensure_ascii=False)
print("data.json:", dst.stat().st_size, "bytes; duration", out["duration"], "s;", len(lines), "lines",
      "(PROVISIONAL timeline)" if out["provisional"] else "")
