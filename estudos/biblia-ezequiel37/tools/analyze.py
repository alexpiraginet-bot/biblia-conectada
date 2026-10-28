#!/usr/bin/env python3
"""Every number and quote of "Ossos secos, rio da vida" (video 10), computed from the open data.

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY). Same definitions as the site and videos
1-9: "ligações de um versículo" = unique partner verses, any vote, self-pairs excluded; "votos de um par" = the pair's
votes in the base (both directions summed by the base build). Text: BLIVRE, CC BY 4.0 BR (fontes/blivre).

  python3 -I tools/analyze.py   -> data/stats.json (asserts every claim of script.py)
"""
import json, re, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, LINKS  # noqa: E402

REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, BOOKS_PT = S["osis"], S["books_pt"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])
NCH = len(CHAP_V)
OK = PA != PB


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BFC[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


def chap(bk, c):
    return int(BFC[OSIS.index(bk)] + c - 1)


def name(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{BOOKS_PT[b]} {c - BFC[b] + 1}:{g - CHAP_FIRST[c] + 1}"


def x_of(g):
    """same diagram space as video 1 (arcs.py gv_x): chapters equally spaced, verse offset inside its chapter, in [0,1]"""
    c = int(CHAP_OF[g])
    return (c + (g - CHAP_FIRST[c] + 0.5) / CHAP_V[c]) / NCH


def pair_votes(r1, r2):
    a, b = gv(r1), gv(r2)
    m = ((PA == a) & (PB == b)) | ((PA == b) & (PB == a))
    assert m.sum() == 1, (r1, r2, int(m.sum()))
    return int(VOTES[m][0])


def arcs_touching(verses):
    vs = np.array(sorted(verses))
    m = OK & (np.isin(PA, vs) | np.isin(PB, vs))
    out = [[round(x_of(int(a)), 6), round(x_of(int(b)), 6), int(v)] for a, b, v in zip(PA[m], PB[m], VOTES[m])]
    return m, out


# ---- Ezekiel 37 and 47:1 in the base
ez37 = set(range(int(CHAP_FIRST[chap("Ezek", 37)]), int(CHAP_FIRST[chap("Ezek", 37)]) + int(CHAP_V[chap("Ezek", 37)])))
m37, arcs37 = arcs_touching(ez37)
other37 = set(np.where(np.isin(PA, list(ez37)), PB, PA)[m37].tolist()) - ez37
m471, arcs471 = arcs_touching({gv("Ezek.47.1")})
partners471 = set(np.where(PA == gv("Ezek.47.1"), PB, PA)[m471].tolist())
ez47 = set(range(int(CHAP_FIRST[chap("Ezek", 47)]), int(CHAP_FIRST[chap("Ezek", 47)]) + int(CHAP_V[chap("Ezek", 47)])))
direct_37_47 = int((OK & ((np.isin(PA, list(ez37)) & np.isin(PB, list(ez47))) | (np.isin(PB, list(ez37)) & np.isin(PA, list(ez47))))).sum())

links = {}
for k, (r1, r2) in LINKS.items():
    links[k] = {"a": r1, "b": r2, "a_pt": name(gv(r1)), "b_pt": name(gv(r2)), "votes": pair_votes(r1, r2),
                "xa": round(x_of(gv(r1)), 6), "xb": round(x_of(gv(r2)), 6)}


# ---- BLIVRE
def blivre():
    t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
    code = {"Gen": "GEN", "Ezek": "EZE", "John": "JOH", "Rev": "REV", "Luke": "LUK"}
    want = {o for o, _ in QUOTES.values()} | {"Ezek.37.1", "Ezek.47.1", "Ezek.47.3", "Ezek.47.4", "Ezek.47.5"}
    out = {}
    for line in t.splitlines():
        for o in want:
            b, c, v = o.split(".")
            if line.startswith(f"{code[b]} {c}:{v} "):
                out[o] = line.split(" ", 2)[2]
    assert set(out) == want, want - set(out)
    return out


BL = blivre()
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",")
for i, (o, frag) in QUOTES.items():
    assert frag in plain(BL[o]), (i, o, frag, plain(BL[o]))
# the water rises in this order in Ezekiel 47:3-5 (what line 13 says)
assert "tornozelos" in BL["Ezek.47.3"] and "joelhos" in BL["Ezek.47.4"] and "cintura" in BL["Ezek.47.4"]
assert "não se podia atravessar a pé" in BL["Ezek.47.5"]
assert "templo" not in BL["Ezek.47.1"] and "casa" in BL["Ezek.47.1"]   # the voice says "templo" (the house of 40-46)

books = [{"pt": BOOKS_PT[b], "x0": round(int(BFC[b]) / NCH, 6),
          "x1": round((int(BFC[b + 1]) if b < 65 else NCH) / NCH, 6)} for b in range(66)]
st = {
    "source": "OpenBible.info cross references (CC BY), ../biblia-referencias/data/xref.npz; BLIVRE (CC BY 4.0 BR)",
    "n_chapters": NCH,
    "chapter_ez37": chap("Ezek", 37) + 1, "chapter_ez47": chap("Ezek", 47) + 1,
    "chapters_between": chap("Ezek", 47) - chap("Ezek", 37),
    "ez_chapters": int((CHAP_BOOK == OSIS.index("Ezek")).sum()),
    "ez37": {"pairs": int(m37.sum()), "verses_outside": len(other37), "x": round(x_of(gv("Ezek.37.1")), 6)},
    "ez47_1": {"links": len(partners471), "x": round(x_of(gv("Ezek.47.1")), 6)},
    "direct_37_47_pairs": direct_37_47,
    "links": links,
    "nt_x": round(int(BFC[39]) / NCH, 6),
    "books": books,
    "blivre": BL,
    "arcs37": arcs37, "arcs471": arcs471,
}
# claims the film makes
assert st["ez_chapters"] == 48
assert st["chapters_between"] == 10                      # "No capítulo quarenta e sete" (10 chapters after 37)
assert all(v["votes"] > 0 for v in links.values())
assert st["direct_37_47_pairs"] == 0                     # so the film never calls 37 -> 47 a "ligação"
assert BOOKS_PT[65] == "Apocalipse" and chap("Rev", 22) == NCH - 1   # "o último capítulo da Bíblia"
json.dump(st, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in st.items() if k not in ("blivre", "arcs37", "arcs471", "books")}, ensure_ascii=False, indent=1))
print("arcs37", len(arcs37), "arcs471", len(arcs471))
