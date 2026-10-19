#!/usr/bin/env python3
"""Every number of "Os versículos de vocês" (the comments video), computed from the same open base as video 1.

Base: ../biblia-referencias/data/xref.npz (OpenBible.info cross references, CC BY; 301,584 unique verse pairs).
Definition kept from video 1: "versículos ligados" = unique partner verses, any vote, self-pairs excluded.
For a range (Filipenses 3:13-14) the partners of every verse in it are united and the range's own verses removed.

  python3 -I tools/analyze.py   -> data/stats.json (+ printed table)
"""
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz")
ST = json.load(open(REF / "stats.json"))
C = json.load(open(ROOT / "data/comentarios.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, BOOKS_PT = ST["osis"], ST["books_pt"]
BOOK_FIRST_CHAP = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])
BOOK_OF = CHAP_BOOK[CHAP_OF]
assert ST["stats"]["rows_total"] == 344799 and len(PA) == 301584 and len(CHAP_OF) == 31102


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BOOK_FIRST_CHAP[OSIS.index(bk)] + int(c) - 1
    assert CHAP_BOOK[ch] == OSIS.index(bk) and 1 <= int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


def pt(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{BOOKS_PT[b]} {c - int(BOOK_FIRST_CHAP[b]) + 1}:{g - int(CHAP_FIRST[c]) + 1}"


def partners(gs):
    gs = np.asarray(gs)
    m = np.isin(PA, gs) | np.isin(PB, gs)
    other = np.where(np.isin(PA[m], gs), PB[m], PA[m])
    keep = ~np.isin(other, gs)
    return np.unique(other[keep]), np.where(m)[0][keep]


# sanity: the method reproduces video 1 (Isaiah 9:6 = 212)
assert len(partners([gv("Isa.9.6")])[0]) == 212

# one entry per verse (or range); several people may ask for the same verse
items = {}
for c in C["citations"]:
    key = tuple(c["refs"])
    items.setdefault(key, {"refs": list(key), "handles": []})["handles"].append(c["handle"])
rows = []
for key, it in items.items():
    gs = [gv(r) for r in key]
    p, pairs = partners(gs)
    best = pairs[np.argmax(VOTES[pairs])] if len(pairs) else None
    bo = None if best is None else (PB[best] if PA[best] in gs else PA[best])
    label = pt(gs[0]) if len(gs) == 1 else pt(gs[0]) + "–" + pt(gs[-1]).split(":")[1]
    rows.append({"refs": it["refs"], "gv": gs, "label": label, "handles": it["handles"], "n": int(len(p)),
                 "books": int(len(np.unique(BOOK_OF[p]))), "partners": p.tolist(),
                 "top": None if bo is None else {"label": pt(int(bo)), "gv": int(bo), "votes": int(VOTES[best])}})
rows.sort(key=lambda r: r["gv"][0])            # Bible order: Genesis -> Revelation

sel = sorted({g for r in rows for g in r["gv"]})
U_all, _ = partners(sel)                       # partners outside the requested verses
m_in = np.isin(PA, sel) & np.isin(PB, sel) & (PA != PB)
inter = []
for j in np.where(m_in)[0]:
    a, b = int(PA[j]), int(PB[j])
    ra = next(r for r in rows if a in r["gv"]); rb = next(r for r in rows if b in r["gv"])
    if ra is rb: continue                       # inside one range (Fp 3:13 <-> 3:14)
    inter.append({"a": pt(a), "b": pt(b), "votes": int(VOTES[j]), "ha": ra["handles"], "hb": rb["handles"]})
inter.sort(key=lambda x: -x["votes"])
# union counted the simple way too: every verse linked to at least one requested verse (requested ones included)
U_touch = np.unique(np.concatenate([np.asarray(r["partners"]) for r in rows]))
most = max(rows, key=lambda r: r["n"])
out = {
    "definition": "versículos ligados = parceiros únicos (qualquer voto), sem o próprio versículo; faixa = união",
    "check_isaiah_9_6": 212,
    "n_comments_citing": len(C["citations"]), "n_people": len({c["handle"] for c in C["citations"]}),
    "n_items": len(rows), "items": rows,
    "union_partners_outside": int(len(U_all)), "union_any": int(len(U_touch)),
    "union_books": int(len(np.unique(BOOK_OF[U_touch]))),
    "union_ot": int((BOOK_OF[U_touch] < 39).sum()), "union_nt": int((BOOK_OF[U_touch] >= 39).sum()),
    "most_connected": {"label": most["label"], "n": most["n"], "handles": most["handles"]},
    "inter_links": inter,
}
json.dump(out, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
for r in rows:
    print(f"{r['label']:24s} n={r['n']:4d} livros={r['books']:2d} top={r['top']['label'] if r['top'] else '-':22s}"
          f" ({r['top']['votes'] if r['top'] else 0:4d} votos)  {', '.join('@' + h for h in r['handles'])}")
print(f"\n{out['n_comments_citing']} comentários com versículo, {out['n_people']} pessoas, {out['n_items']} versículos/trechos")
print(f"união: {out['union_any']} versículos ligados (fora os pedidos: {out['union_partners_outside']}),"
      f" em {out['union_books']} dos 66 livros (AT {out['union_ot']}, NT {out['union_nt']})")
print("mais conectado:", out["most_connected"])
print("ligações entre os versículos pedidos:", json.dumps(inter, ensure_ascii=False, indent=0))
