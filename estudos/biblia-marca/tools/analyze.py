#!/usr/bin/env python3
"""Every claim of "A outra marca" (video 8), computed from the open data.

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY); "votos de um par" = sum of both
directions. Text: BLIVRE, CC BY 4.0 BR (fontes/blivre). Cross-check: source/site/*.html are live pages of
https://www.bibliaconectada.company (fetched 25/10/2026); every vote the film shows must match those pages.

  python3 -I tools/analyze.py   -> data/stats.json (asserts every claim of script.py)
"""
import html, json, re, sys, zipfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from script import PAIRS, QUOTES  # noqa: E402

REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, BOOKS_PT = S["osis"], S["books_pt"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BFC[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


def name(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{BOOKS_PT[b]} {c - BFC[b] + 1}:{g - int(CHAP_FIRST[c]) + 1}"


def pt(ref):
    return name(gv(ref))


def votes(r1, r2):
    a, b = gv(r1), gv(r2)
    k = np.where(((PA == a) & (PB == b)) | ((PA == b) & (PB == a)))[0]
    return int(VOTES[k].sum()) if len(k) else None


def chapter(bk, c):
    ch = BFC[OSIS.index(bk)] + c - 1
    return set(range(int(CHAP_FIRST[ch]), int(CHAP_FIRST[ch]) + int(CHAP_V[ch])))


out = {"pairs": []}
for a, b in PAIRS:
    v = votes(a, b)
    assert v and v > 0, (a, b, v)
    out["pairs"].append({"a": a, "b": b, "a_pt": pt(a), "b_pt": pt(b), "votes": v})
assert [p["votes"] for p in out["pairs"]] == [9, 6], out["pairs"]

# every pair between Revelation 13 and Revelation 22 in the base (the film shows the strongest)
c13, c22 = chapter("Rev", 13), chapter("Rev", 22)
m = np.where((np.isin(PA, list(c13)) & np.isin(PB, list(c22))) | (np.isin(PA, list(c22)) & np.isin(PB, list(c13))))[0]
links = {}
for k in m:
    x, y = sorted((int(PA[k]), int(PB[k])))
    links[(x, y)] = links.get((x, y), 0) + int(VOTES[k])
out["rev13_rev22"] = sorted(([name(x), name(y), v] for (x, y), v in links.items()), key=lambda r: -r[2])
assert out["rev13_rev22"][0] == ["Apocalipse 13:17", "Apocalipse 22:4", 6], out["rev13_rev22"]

# ---------------------------------------------------------------- BLIVRE text
t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
idx = {" ".join(l.split(" ", 2)[:2]): l.split(" ", 2)[2] for l in t.splitlines() if l.count(" ") >= 2}
VPL = {"Rev": "REV", "Deut": "DEU"}
REV13 = [l for l in t.splitlines() if l.startswith("REV 13:")]


def bl(ref):
    b, c, v = ref.split("."); return idx[f"{VPL[b]} {c}:{v}"]


want = {"Rev.13.4", "Rev.13.8", "Rev.13.12", "Rev.13.15", "Rev.13.16", "Rev.13.17", "Rev.22.4", "Deut.6.6", "Deut.6.8"} | {r for r, _ in QUOTES.values()} | {x for p in PAIRS for x in p}
out["blivre"] = {r: bl(r) for r in sorted(want)}
for i, (ref, frags) in QUOTES.items():
    for f in frags:
        assert f.lower() in out["blivre"][ref].lower(), (i, ref, f)
assert "estas palavras" in out["blivre"]["Deut.6.6"].lower()                       # Dt 6:8 binds "estas palavras" (6:6)
out["worship_in_rev13"] = [l.split(" ", 2)[1] for l in REV13 if "ador" in l.lower()]
assert out["worship_in_rev13"] == ["13:4", "13:8", "13:12", "13:15"], out["worship_in_rev13"]   # line 8: "o que a besta quer? Adoração."
assert out["blivre"]["Rev.22.4"].startswith("E eles verão o rosto dele")

# ---------------------------------------------------------------- the live site lists the same votes
site = {}
for f in sorted((ROOT / "source/site").glob("*.html")):
    page = f.read_text(encoding="utf-8")
    items = re.findall(r'<li class="bc-conn"><a class="bc-conn__ref" href="([^"]+)">([^<]+)<span class="i i-(\w+)[^"]*">'
                       r'</span>.*?</a><span class="bc-conn__votes">.*?</span>([\d.]+) votos?</span>', page, flags=re.S)
    site[f.stem] = {html.unescape(r): int(n.replace(".", "")) for _, r, _, n in items}
assert site["apocalipse-13-16"]["Deuteronômio 6:8"] == 9 and site["deuteronomio-6-8"]["Apocalipse 13:16"] == 9, site
assert site["apocalipse-13-17"]["Apocalipse 22:4"] == 6 and site["apocalipse-22-4"]["Apocalipse 13:17"] == 6, site
out["site"] = {"base": "https://www.bibliaconectada.company", "fetched": "2026-10-25", "pages": sorted(site), "all_votes_match": True}
json.dump(out, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print("pairs:", [(p["a_pt"], p["b_pt"], p["votes"]) for p in out["pairs"]], "| Ap13~Ap22:", out["rev13_rev22"], "| site ok")
