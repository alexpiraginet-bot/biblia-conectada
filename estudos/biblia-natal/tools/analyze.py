#!/usr/bin/env python3
"""Every number the 'Antes do Natal' video says about the cross references, computed from the same OpenBible.info file
used in 'A Bibl ia, conectada' (CC BY; SHA-256 recorded in biblia-referencias/PROJETO.md).
Birth narratives = Matthew 1-2 + Luke 1-2.   python3 -I tools/analyze.py  ->  data/natal-stats.json"""
import json, re, hashlib
from collections import defaultdict
from pathlib import Path
import pythonbible as pb

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "biblia-referencias/data/openbible-cross_references.txt"
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
BOOKS = list(pb.Book)[:66]
NV = {(bi, c): pb.get_number_of_verses(b, c) for bi, b in enumerate(BOOKS) for c in range(1, pb.get_number_of_chapters(b) + 1)}
BIRTH = {(BI["Matt"], 1), (BI["Matt"], 2), (BI["Luke"], 1), (BI["Luke"], 2)}
OT = set(range(39))


def parse(ref):
    m = re.fullmatch(r"([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)", ref.split("-")[0])
    return BI[m.group(1)], int(m.group(2)), int(m.group(3))


def name(v):
    return f"{PT[v[0]]} {v[1]}:{v[2]}"


sha = hashlib.sha256(SRC.read_bytes()).hexdigest()
rows = []
with open(SRC, encoding="utf-8") as f:
    f.readline()
    for line in f:
        p = line.rstrip("\n").split("\t")
        if len(p) < 3: continue
        try:
            a, b, v = parse(p[0]), parse(p[1]), int(p[2])
        except (ValueError, KeyError, AttributeError):
            continue
        if (a[0], a[1]) not in NV or (b[0], b[1]) not in NV: continue
        rows.append((a, b, v))

# undirected pair -> list of directed rows
pairs = defaultdict(list)
for a, b, v in rows:
    ot, nt = (a, b) if a[0] in OT else (b, a)
    if ot[0] in OT and (nt[0], nt[1]) in BIRTH:
        pairs[(ot, nt)].append(((a, b), v))

out_pairs = []
for (ot, nt), lst in pairs.items():
    vs = [v for _, v in lst]
    d_ot_nt = [v for (a, b), v in lst if a == ot]
    d_nt_ot = [v for (a, b), v in lst if a == nt]
    out_pairs.append({"ot": name(ot), "nt": name(nt), "ot_book": PT[ot[0]], "max": max(vs), "sum": sum(vs),
                      "ot_to_nt": d_ot_nt, "nt_to_ot": d_nt_ot})
out_pairs.sort(key=lambda r: -r["max"])
by_sum = sorted(out_pairs, key=lambda r: -r["sum"])
pos = [r for r in out_pairs if r["max"] > 0]
birth_verses = sum(NV[k] for k in BIRTH)
stats = {
    "source_sha256": sha, "rows_total": len(rows),
    "birth_chapters": "Mateus 1-2, Lucas 1-2", "birth_chapter_verses": birth_verses,
    "pairs_all": len(out_pairs), "pairs_maxvote_gt0": len(pos),
    "ot_verses_all": len({r["ot"] for r in out_pairs}), "ot_verses_pos": len({r["ot"] for r in pos}),
    "ot_books_all": len({r["ot_book"] for r in out_pairs}), "ot_books_pos": len({r["ot_book"] for r in pos}),
    "ot_books_pos_list": sorted({r["ot_book"] for r in pos}, key=PT.index),
    "nt_verses_linked_pos": len({r["nt"] for r in pos}),
    "top40": out_pairs[:40],
    "top10_by_sum": [(r["ot"], r["nt"], r["sum"]) for r in by_sum[:10]],
}
# per NT verse: how many OT verses point at it (positive pairs)
cnt = defaultdict(int)
for r in pos: cnt[r["nt"]] += 1
stats["nt_most_linked"] = sorted(cnt.items(), key=lambda kv: -kv[1])[:12]
want = [("Isaías 7:14", "Mateus 1:23"), ("Miqueias 5:2", "Mateus 2:6"), ("Oseias 11:1", "Mateus 2:15"),
        ("Jeremias 31:15", "Mateus 2:18"), ("Números 24:17", "Mateus 2:2"), ("Isaías 9:6", "Lucas 2:11"),
        ("Jeremias 32:17", "Lucas 1:37"), ("Isaías 60:6", "Mateus 2:11"), ("Salmos 72:10", "Mateus 2:11"),
        ("Isaías 40:3", "Lucas 1:76"), ("Malaquias 4:5", "Lucas 1:17"), ("Isaías 11:1", "Mateus 2:23"),
        ("Gênesis 3:15", "Lucas 1:31"), ("Isaías 9:7", "Lucas 1:32"), ("2 Samuel 7:12", "Lucas 1:32"),
        ("Isaías 42:6", "Lucas 2:32"), ("Isaías 49:6", "Lucas 2:32")]
idx = {(r["ot"], r["nt"]): r for r in out_pairs}
stats["key_pairs"] = {f"{a} -> {b}": idx.get((a, b)) for a, b in want}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data/natal-stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=1))
print(json.dumps({k: v for k, v in stats.items() if k not in ("top40", "key_pairs", "ot_books_pos_list")}, ensure_ascii=False))
missing = [b for b in PT[:39] if b not in stats["ot_books_pos_list"]]
stats["ot_books_missing"] = missing; print("OT books with no link to the birth chapters:", missing)
(ROOT / "data/natal-stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=1))
for r in out_pairs[:40]: print(f'{r["max"]:5d} {r["sum"]:5d}  {r["ot"]:20s} <-> {r["nt"]:14s} ot>nt={r["ot_to_nt"]} nt>ot={r["nt_to_ot"]}')
print("KEY")
for k, r in stats["key_pairs"].items(): print(k, None if r is None else (r["max"], r["sum"], r["ot_to_nt"], r["nt_to_ot"]))
