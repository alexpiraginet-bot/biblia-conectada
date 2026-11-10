#!/usr/bin/env python3
"""Every quote and every Bible claim of "Escrito no chão" (video 11), checked against the open data.

Text: BLIVRE, CC BY 4.0 BR (fontes/blivre). Cross-references: ../biblia-referencias/data/xref.npz (OpenBible, CC BY).

  python3 -I tools/analyze.py   -> data/stats.json
"""
import json, re, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, FACTS, PAIRS, MINE  # noqa: E402

D = np.load(ROOT.parent / "biblia-referencias/data/xref.npz"); S = json.load(open(ROOT.parent / "biblia-referencias/data/stats.json"))
OSIS, PT, CB, CF = S["osis"], S["books_pt"], D["chap_book"], D["chap_first"]
BFC = np.array([int(np.where(CB == i)[0][0]) for i in range(66)])
VPL = {"John": "JOH", "Jer": "JER", "Matt": "MAT", "Mark": "MAR", "Luke": "LUK"}
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",").replace(" .", ".").strip()


def gv(o):
    bk, c, v = o.split("."); return int(CF[BFC[OSIS.index(bk)] + int(c) - 1] + int(v) - 1)


def name(g):
    ch = int(D["chap_of_gv"][g]); b = int(CB[ch]); return f"{PT[b]} {ch - BFC[b] + 1}:{g - int(CF[ch]) + 1}"


t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
RAW = {}
for line in t.splitlines():
    m = re.match(r"^(\w+) (\d+):(\d+) (.*)$", line)
    if m: RAW[(m[1], int(m[2]), int(m[3]))] = m[4]
assert len(RAW) == 31102, len(RAW)


def bl(o):
    bk, c, v = o.split("."); return plain(RAW[(VPL[bk], int(c), int(v))])


# 1. every quoted fragment is literal BLIVRE; every paraphrase has its verse
T = dict(enumerate(LINES))
for i, (o, frags) in QUOTES.items():
    for f in frags:
        assert f in bl(o), (i, o, f)
        spoken = f.replace("SENHOR", "Senhor")
        assert re.sub(r"[,;.]", "", spoken).lower() in re.sub(r"[,;.]", "", T[i]).lower(), (i, spoken, T[i])
for i, facts in FACTS.items():
    for o, f in facts:
        assert f in bl(o), (i, o, f)
assert set(range(1, len(LINES))) == set(QUOTES) | set(FACTS) | MINE, "every line is a quote, a paraphrase with its verse, or ours"

# 2. "Nos evangelhos, Jesus só escreve uma vez": every verse of the four Gospels with a form of "escrever"
ESC = [(b, c, v) for (b, c, v) in RAW if b in ("MAT", "MAR", "LUK", "JOH") and re.search(r"escrev", RAW[(b, c, v)], re.I)]
JESUS_WRITES = [k for k in ESC if re.search(r"Jesus[^.;:]*escrevia|inclinar, escrevia", RAW[k])]
assert JESUS_WRITES == [("JOH", 8, 6), ("JOH", 8, 8)], JESUS_WRITES
# the other 15 have another subject (read one by one on 10/11/2026): Moses (Mk 10:4-5; 12:19; Lk 20:28; Jo 1:45; 5:46),
# Luke (Lk 1:3), Zechariah (Lk 1:63), the debtors (Lk 16:6-7), Pilate (Jo 19:19-22), the disciple (Jo 21:24-25)
OTHERS = {("MAR", 10, 4): "Moisés", ("MAR", 10, 5): "Moisés", ("MAR", 12, 19): "Moisés", ("LUK", 1, 3): "Lucas",
          ("LUK", 1, 63): "Zacarias", ("LUK", 16, 6): "devedor", ("LUK", 16, 7): "devedor", ("LUK", 20, 28): "Moisés",
          ("JOH", 1, 45): "Moisés", ("JOH", 5, 46): "Moisés", ("JOH", 19, 19): "Pilatos", ("JOH", 19, 21): "Pilatos",
          ("JOH", 19, 22): "Pilatos", ("JOH", 21, 24): "o discípulo", ("JOH", 21, 25): "livros (hipótese)"}
assert set(ESC) == set(JESUS_WRITES) | set(OTHERS), sorted(set(ESC) - set(JESUS_WRITES) - set(OTHERS))

# 3. the threads: partners and votes
a, b, vt = D["a"], D["b"], D["votes"]


def partners(o):
    g = gv(o); m = (a == g) | (b == g); other = np.where(a[m] == g, b[m], a[m]); w = vt[m]
    order = np.argsort(-w, kind="stable")
    return [(name(int(other[i])), int(w[i])) for i in order if int(other[i]) != g]


def votes(o1, o2):
    g1, g2 = gv(o1), gv(o2); m = ((a == g1) & (b == g2)) | ((a == g2) & (b == g1))
    assert m.sum() == 1, (o1, o2, int(m.sum())); return int(vt[m][0])


P86 = partners("John.8.6")
assert P86[0] == ("Jeremias 17:13", 55) and P86[1][1] < 55, P86[:3]      # "a ligação mais votada desse versículo"
pairs = [{"a": o1, "b": o2, "a_pt": name(gv(o1)), "b_pt": name(gv(o2)), "votes": votes(o1, o2)} for o1, o2 in PAIRS]
assert [p["votes"] for p in pairs] == [55, 50], pairs
assert name(gv("John.7.37")) == "João 7:37" and name(gv("Jer.17.13")) == "Jeremias 17:13"

st = {
    "source": "BLIVRE (CC BY 4.0 BR); OpenBible cross references (CC BY) via ../biblia-referencias/data/xref.npz",
    "definition": "ligações = parceiros únicos, qualquer voto; votos de um par = soma das duas direções (como nos vídeos 1-10)",
    "john_8_6": {"partners": len(P86), "top": P86[:5]},
    "jer_17_13": {"partners": len(partners("Jer.17.13")), "top": partners("Jer.17.13")[:6]},
    "pairs": pairs,
    "gospel_verses_with_escrever": len(ESC),
    "jesus_writes": [f"João {c}:{v}" for _, c, v in JESUS_WRITES],
    "others_write": {f"{b} {c}:{v}": who for (b, c, v), who in OTHERS.items()},
    "blivre": {o: bl(o) for o in sorted({q[0] for q in QUOTES.values()} | {o for fs in FACTS.values() for o, _ in fs})},
    "words": sum(len(l.split()) for l in LINES[1:]),
}
json.dump(st, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print(f"ok: João 8:6 tem {len(P86)} ligações; a mais votada é {P86[0][0]} ({P86[0][1]} votos; a 2ª tem {P86[1][1]}).")
print(f"ok: {pairs[1]['a_pt']} ↔ {pairs[1]['b_pt']}: {pairs[1]['votes']} votos.")
print(f"ok: {len(ESC)} versículos dos evangelhos com 'escrev*'; Jesus escreve só em {st['jesus_writes']}.")
print(f"ok: {len(QUOTES)} falas citam a BLIVRE literalmente; roteiro com {st['words']} palavras.")
