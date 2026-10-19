#!/usr/bin/env python3
"""Parse the OpenBible.info cross references (CC-BY) against the Protestant canon (66 books, KJV versification via
pythonbible) and compute every number the video may say or show. Output: data/xref.npz (arcs) + data/stats.json.

  python3 -I tools/analyze.py
"""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np
import pythonbible as pb

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/openbible-cross_references.txt"

BOOKS = list(pb.Book)[:66]
assert BOOKS[0].name == "GENESIS" and BOOKS[-1].name == "REVELATION", BOOKS[-1]
# OSIS ids used by OpenBible, in canonical order (checked against the data below)
OSIS = ["Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra",
        "Neh", "Esth", "Job", "Ps", "Prov", "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", "Obad",
        "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt", "Mark", "Luke", "John", "Acts", "Rom", "1Cor",
        "2Cor", "Gal", "Eph", "Phil", "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", "1Pet", "2Pet",
        "1John", "2John", "3John", "Jude", "Rev"]
PT = ["Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis",
      "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios", "Eclesiastes",
      "Cânticos", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas",
      "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus", "Marcos", "Lucas", "João",
      "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses",
      "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro",
      "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"]
BI = {o: i for i, o in enumerate(OSIS)}

# ---- canon: chapters and verses (KJV versification)
nch = [pb.get_number_of_chapters(b) for b in BOOKS]
vpc = [[pb.get_number_of_verses(b, c) for c in range(1, n + 1)] for b, n in zip(BOOKS, nch)]
chap_index, verse_base, ci = {}, {}, 0
gv = 0
chap_list = []  # (book, chapter, verses, first global verse index)
for bi in range(66):
    for c in range(1, nch[bi] + 1):
        chap_index[(bi, c)] = ci
        nv = vpc[bi][c - 1]
        chap_list.append((bi, c, nv, gv))
        verse_base[(bi, c)] = gv
        gv += nv; ci += 1
N_CHAP, N_VERSE = ci, gv
print(f"canon: 66 books, {N_CHAP} chapters, {N_VERSE} verses; longest chapter:",
      max(chap_list, key=lambda x: x[2])[:3])


def parse(ref):
    """'Gen.1.1' or 'Gen.1.1-Gen.1.3' -> (book, chapter, verse) of the first verse (+ last verse for ranges)"""
    a = ref.split("-")[0]
    m = re.fullmatch(r"([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", a)
    if not m:
        raise ValueError(ref)
    return BI[m.group(1)], int(m.group(2)), int(m.group(3))


rows, bad, seen_books = [], Counter(), set()
with open(SRC, encoding="utf-8") as f:
    header = f.readline()
    for line in f:
        p = line.rstrip("\n").split("\t")
        if len(p) < 3:
            bad["short"] += 1; continue
        try:
            fb, fc, fv = parse(p[0]); tb, tc, tv = parse(p[1]); votes = int(p[2])
        except (ValueError, KeyError) as e:
            bad[type(e).__name__] += 1; continue
        seen_books.update((p[0].split(".")[0], p[1].split(".")[0]))
        if (fb, fc) not in chap_index or (tb, tc) not in chap_index:
            bad["chapter_out_of_canon"] += 1; continue
        fv = min(fv, vpc[fb][fc - 1]); tv = min(tv, vpc[tb][tc - 1])
        rows.append((fb, fc, fv, tb, tc, tv, votes))
print("header:", header.strip()); print("parsed rows:", len(rows), "skipped:", dict(bad))
unknown = {b.lstrip("0123456789") for b in seen_books} - {o.lstrip("0123456789") for o in OSIS}
assert not unknown, unknown

R = np.array(rows, dtype=np.int32)
fchap = np.array([chap_index[(r[0], r[1])] for r in rows], np.int32)
tchap = np.array([chap_index[(r[3], r[4])] for r in rows], np.int32)
fgv = np.array([verse_base[(r[0], r[1])] + r[2] - 1 for r in rows], np.int32)
tgv = np.array([verse_base[(r[3], r[4])] + r[5] - 1 for r in rows], np.int32)
votes = R[:, 6]

# ---- undirected unique verse pairs (A->B and B->A are usually both listed)
lo, hi = np.minimum(fgv, tgv), np.maximum(fgv, tgv)
key = lo.astype(np.int64) * 40000 + hi
uniq, inv = np.unique(key, return_inverse=True)
pair_votes = np.zeros(len(uniq), np.int64); np.add.at(pair_votes, inv, votes)
pair_max = np.full(len(uniq), -10**9, np.int64); np.maximum.at(pair_max, inv, votes)
pa, pb_ = (uniq // 40000).astype(np.int32), (uniq % 40000).astype(np.int32)
self_pairs = int((pa == pb_).sum())

ot_end = verse_base[(39, 1)]  # first verse of Matthew
book_of_gv = np.zeros(N_VERSE, np.int16); chap_of_gv = np.zeros(N_VERSE, np.int32)
for (bi, c, nv, g0) in chap_list:
    book_of_gv[g0:g0 + nv] = bi; chap_of_gv[g0:g0 + nv] = chap_index[(bi, c)]


def vname(g):
    bi = int(book_of_gv[g]); ch = chap_list[int(chap_of_gv[g])]
    return f"{PT[bi]} {ch[1]}:{g - ch[3] + 1}"


def cname(ci_):
    bi, c, nv, g0 = chap_list[ci_]
    return f"{PT[bi]} {c}"


pos = votes > 0
stats = {
    "source": "OpenBible.info cross references (CC-BY), " + header.strip().split("\t")[-1],
    "rows_total": int(len(rows)),
    "rows_votes_gt0": int(pos.sum()), "rows_votes_ge10": int((votes >= 10).sum()), "rows_votes_lt0": int((votes < 0).sum()),
    "unique_verse_pairs": int(len(uniq)), "unique_pairs_maxvote_gt0": int((pair_max > 0).sum()),
    "self_pairs": self_pairs,
    "books": 66, "chapters": N_CHAP, "verses": N_VERSE,
    "verses_with_any_ref": int(len(np.unique(np.concatenate([fgv, tgv])))),
    "rows_ot_nt": int((((fgv < ot_end) & (tgv >= ot_end)) | ((fgv >= ot_end) & (tgv < ot_end))).sum()),
    "rows_gen_rev": int((((R[:, 0] == 0) & (R[:, 3] == 65)) | ((R[:, 0] == 65) & (R[:, 3] == 0))).sum()),
    "pairs_gen_rev": int((((book_of_gv[pa] == 0) & (book_of_gv[pb_] == 65))).sum()),
}
# most connected (rows touching it, both directions)
deg_v = np.bincount(np.concatenate([fgv, tgv]), minlength=N_VERSE)
deg_c = np.bincount(np.concatenate([fchap, tchap]), minlength=N_CHAP)
deg_b = np.bincount(np.concatenate([R[:, 0], R[:, 3]]), minlength=66)
stats["top_verses"] = [(vname(int(g)), int(deg_v[g])) for g in np.argsort(-deg_v)[:12]]
stats["top_chapters"] = [(cname(int(c)), int(deg_c[c])) for c in np.argsort(-deg_c)[:12]]
stats["top_books"] = [(PT[int(b)], int(deg_b[b])) for b in np.argsort(-deg_b)[:10]]
dens = deg_c / np.array([c[2] for c in chap_list])
stats["top_chapters_per_verse"] = [(cname(int(c)), round(float(dens[c]), 2)) for c in np.argsort(-dens)[:8]]
# outgoing-from-verse counts (as listed in the "From" column)
out_v = np.bincount(fgv, minlength=N_VERSE)
stats["top_from_verses"] = [(vname(int(g)), int(out_v[g])) for g in np.argsort(-out_v)[:8]]
# best-voted long-distance pairs (the "whole Bible" arcs), Gen <-> Rev
gr = np.where((book_of_gv[pa] == 0) & (book_of_gv[pb_] == 65))[0]
stats["gen_rev_best"] = [(vname(int(pa[i])), vname(int(pb_[i])), int(pair_votes[i])) for i in gr[np.argsort(-pair_votes[gr])][:15]]


def lookup(a, b):
    """votes for a specific verse pair, e.g. ('Gen.2.9','Rev.22.2')"""
    ga = verse_base[(BI[a.split('.')[0]], int(a.split('.')[1]))] + int(a.split('.')[2]) - 1
    gb = verse_base[(BI[b.split('.')[0]], int(b.split('.')[1]))] + int(b.split('.')[2]) - 1
    k = min(ga, gb) * 40000 + max(ga, gb)
    i = np.searchsorted(uniq, k)
    return int(pair_votes[i]) if i < len(uniq) and uniq[i] == k else None


stats["check_pairs"] = {f"{a}~{b}": lookup(a, b) for a, b in [
    ("Gen.2.9", "Rev.22.2"), ("Gen.3.15", "Rev.12.9"), ("Gen.1.1", "John.1.1"), ("Isa.53.5", "1Pet.2.24"),
    ("Ps.22.1", "Matt.27.46"), ("Gen.22.8", "John.1.29"), ("Isa.7.14", "Matt.1.23"), ("Gen.1.1", "Rev.21.1")]}
# arc distance distribution (chapters apart), for the colour legend
dist = np.abs(chap_of_gv[pb_] - chap_of_gv[pa])
stats["pair_chapter_distance_pct"] = {p: int(np.percentile(dist, p)) for p in (10, 25, 50, 75, 90, 99)}
stats["longest_pair"] = (vname(int(pa[np.argmax(pb_ - pa)])), vname(int(pb_[np.argmax(pb_ - pa)])))

np.savez_compressed(ROOT / "data/xref.npz", a=pa, b=pb_, votes=pair_votes, vmax=pair_max,
                    chap_verses=np.array([c[2] for c in chap_list], np.int16),
                    chap_book=np.array([c[0] for c in chap_list], np.int16),
                    chap_first=np.array([c[3] for c in chap_list], np.int32),
                    book_of_gv=book_of_gv, chap_of_gv=chap_of_gv)
json.dump({"stats": stats, "books_pt": PT, "osis": OSIS, "chapters_per_book": nch}, open(ROOT / "data/stats.json", "w"),
          ensure_ascii=False, indent=1)
print(json.dumps(stats, ensure_ascii=False, indent=1))
