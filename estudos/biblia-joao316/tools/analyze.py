#!/usr/bin/env python3
"""Every number and quote of "Antes de João 3:16", computed from the open data (nothing typed by hand).

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY; 301,584 unique verse pairs; a range on
either side is stored as its first verse). "Versículos ligados" = unique partner verses, any vote, self-pairs excluded
(same definition as videos 1 and 3). Raw rows of John 3:14 are read from openbible-cross_references.txt.
Text: BLIVRE (CC BY 4.0 BR), fontes/blivre/porbr2018_vpl.zip (repo root).

  python3 -I tools/analyze.py   -> data/stats.json (asserts the numbers spoken in script.py)
"""
import json, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT.parent / "biblia-referencias/data"
BLIVRE = next(p for p in [ROOT.parent.parent / "fontes/blivre/porbr2018_vpl.zip",
                          Path("/home/claude/biblia-conectada/fontes/blivre/porbr2018_vpl.zip")] if p.exists())
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, BOOKS_PT = S["osis"], S["books_pt"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BFC[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch]
    return int(CHAP_FIRST[ch]) + int(v) - 1


def name(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{BOOKS_PT[b]} {c - BFC[b] + 1}:{g - CHAP_FIRST[c] + 1}"


ok = PA != PB
P = np.concatenate([PA[ok], PB[ok]]); Q = np.concatenate([PB[ok], PA[ok]]); V = np.concatenate([VOTES[ok], VOTES[ok]])
deg = np.bincount(P, minlength=len(CHAP_OF))


def partners(ref):
    g = gv(ref); m = P == g
    o = np.argsort(-V[m], kind="stable")
    return [{"gv": int(Q[m][i]), "ref": name(int(Q[m][i])), "votes": int(V[m][i])} for i in o]


def pair(r1, r2):
    a, b = gv(r1), gv(r2)
    k = np.where(((PA == a) & (PB == b)) | ((PA == b) & (PB == a)))[0]
    return int(VOTES[k].max()) if len(k) else 0


def blivre():
    t = zipfile.ZipFile(BLIVRE).read("porbr2018_vpl.txt").decode("utf-8")
    want = {"JOH 3:14", "JOH 3:15", "JOH 3:16", "NUM 21:6", "NUM 21:8", "NUM 21:9", "JOH 12:32", "JOH 12:33"}
    out = {}
    for line in t.splitlines():
        k = " ".join(line.split(" ")[:2])
        if k in want: out[k] = line[len(k) + 1:]
    return out


raw = [l.rstrip("\n").split("\t") for l in open(REF / "openbible-cross_references.txt", encoding="utf-8") if l.startswith("John.3.14\t")]
raw.sort(key=lambda r: -int(r[2]))
ch_jo3 = int(CHAP_OF[gv("John.3.14")]) + 1; ch_nm21 = int(CHAP_OF[gv("Num.21.8")]) + 1
st = {
    "source": "OpenBible.info cross references (CC BY), xref.npz; BLIVRE (CC BY 4.0 BR)",
    "n_pairs": int(len(PA)),
    "chapter_index": {"João 3": ch_jo3, "Números 21": ch_nm21, "total": int(len(CHAP_V))},
    "chapters_back": ch_jo3 - ch_nm21,
    "links": {r: int(deg[gv(r)]) for r in ["John.3.14", "John.3.15", "John.3.16", "Num.21.8", "Num.21.9", "John.12.32"]},
    "rank_John.3.16": int((deg > deg[gv("John.3.16")]).sum()) + 1,
    "john314_raw_top": [{"to": r[1], "votes": int(r[2])} for r in raw[:5]],
    "pairs": {"John.3.14~Num.21.7": pair("John.3.14", "Num.21.7"), "John.3.14~Num.21.8": pair("John.3.14", "Num.21.8"),
              "John.3.14~Num.21.9": pair("John.3.14", "Num.21.9"), "John.3.14~John.12.32": pair("John.3.14", "John.12.32"),
              "John.3.15~John.3.16": pair("John.3.15", "John.3.16")},
    "partners": {r: partners(r) for r in ["John.3.14", "John.3.16"]},
    "x": {r: float((CHAP_OF[gv(r)] + (gv(r) - CHAP_FIRST[CHAP_OF[gv(r)]] + 0.5) / CHAP_V[CHAP_OF[gv(r)]]) / len(CHAP_V))
          for r in ["Num.21.7", "Num.21.8", "Num.21.9", "John.3.14", "John.3.15", "John.3.16", "John.12.32"]},
    "blivre": blivre(),
}
# the facts the narration and the screen rely on
assert st["chapters_back"] == 862, st["chapters_back"]
assert st["john314_raw_top"][0]["to"].startswith("Num.21.7"), st["john314_raw_top"][0]
assert st["partners"]["John.3.14"][0]["ref"] == "Números 21:7"
assert st["blivre"]["JOH 3:14"].startswith("E como Moisés levantou a serpente no deserto, assim deve o Filho do homem ser levantado")
assert st["blivre"]["JOH 3:16"].startswith("Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito")
assert "olhava à serpente de bronze, e vivia" in st["blivre"]["NUM 21:9"]
json.dump(st, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in st.items() if k not in ("partners", "blivre")}, ensure_ascii=False, indent=1))
print("John 3:16 links:", st["links"]["John.3.16"], "| John 3:14 links:", st["links"]["John.3.14"],
      "| top of 3:14:", st["partners"]["John.3.14"][:3])
