#!/usr/bin/env python3
"""Print the exact text of the verses the video quotes, from the thiagobodruk/biblia JSON files (ACF / AA / NVI).
  python3 -I tools/verses.py source/text/acf.json source/text/aa.json  ->  data/verses.json"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
REFS = [("Isaías", 7, 14), ("Mateus", 1, 23), ("Miqueias", 5, 2), ("Mateus", 2, 5), ("Mateus", 2, 6), ("Oseias", 11, 1),
        ("Mateus", 2, 15), ("Números", 24, 17), ("Mateus", 2, 2), ("Isaías", 9, 6), ("Lucas", 2, 11), ("Jeremias", 31, 15),
        ("Mateus", 2, 18), ("Jeremias", 32, 17), ("Lucas", 1, 37), ("Lucas", 2, 4), ("Mateus", 2, 1), ("Mateus", 2, 11),
        ("Isaías", 60, 6), ("Lucas", 1, 26), ("Mateus", 2, 23)]
OT_ORDER = 39
out = {}
for p in sys.argv[1:]:
    data = json.loads(Path(p).read_text(encoding="utf-8-sig"))
    names = [b.get("name") for b in data]
    ver = Path(p).stem.upper()
    out[ver] = {}
    for bk, c, v in REFS:
        try:
            bi = [i for i, n in enumerate(names) if n and n.lower().replace("é", "e").startswith(bk.lower()[:4].replace("é", "e"))]
            b = data[bi[0]]
            out[ver][f"{bk} {c}:{v}"] = b["chapters"][c - 1][v - 1]
        except Exception as e:
            out[ver][f"{bk} {c}:{v}"] = f"ERR {e!r}"
    out[ver]["_books_sample"] = names[:3] + names[38:41]
(ROOT / "data/verses.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
for ver, d in out.items():
    print("=====", ver)
    for k, t in d.items(): print(f"{k}: {t}")
