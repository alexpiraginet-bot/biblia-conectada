#!/usr/bin/env python3
"""Every claim of "Não foi um grito. Foi uma citação." (video 7), computed from the open data.

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY); "votos de um par" = sum of both
directions. Text: BLIVRE, CC BY 4.0 BR (fontes/blivre), all 31 verses of Psalm 22 and the gospel verses the film shows.
Hebrew: OSHB (fontes/oshb/wlc/Ps.xml); the Hebrew Psalm 22 numbers the title as verse 1, so BLIVRE 22:n = OSHB 22:n+1.
Cross-check: source/site/*.html are live pages of https://alexpiraginet-bot-biblia-conectada.vercel.app (25/10/2026);
every vote the film shows must match the list on those pages.

  python3 -I tools/analyze.py   -> data/stats.json (asserts every claim of script.py)
"""
import html, json, re, sys, zipfile
import xml.etree.ElementTree as ET
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


def partners(ref):
    g = gv(ref); m = (PA == g) | (PB == g)
    o = np.where(PA[m] == g, PB[m], PA[m])
    return sorted(((int(v), name(int(x))) for x, v in zip(o, VOTES[m])), reverse=True)


out = {"first_line": {"pair": "Ps.22.1~Matt.27.46", "votes": votes("Ps.22.1", "Matt.27.46"),
                      "mark": votes("Ps.22.1", "Mark.15.34"), "partners_top": partners("Ps.22.1")[:6]},
       "pairs": [], "no_pair": {"Ps.22.31~John.19.30": votes("Ps.22.31", "John.19.30")}}
assert out["first_line"]["votes"] == 126 and out["first_line"]["mark"] == 85
assert out["first_line"]["partners_top"][0][1] == "Mateus 27:46"          # Mt 27:46 is the most voted partner of Ps 22:1
for a, b in PAIRS:
    v = votes(a, b)
    assert v and v > 0, (a, b, v)
    out["pairs"].append({"ps": a, "nt": b, "ps_pt": pt(a), "nt_pt": pt(b), "votes": v})
assert [p["votes"] for p in out["pairs"]] == [5, 15, 60, 81]
assert out["no_pair"]["Ps.22.31~John.19.30"] is None                        # the film does not call this a "ligação"

# ---------------------------------------------------------------- BLIVRE text
t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
idx = {" ".join(l.split(" ", 2)[:2]): l.split(" ", 2)[2] for l in t.splitlines() if l.count(" ") >= 2}
VPL = {"Ps": "PSA", "Matt": "MAT", "John": "JOH", "Mark": "MAR"}


def bl(ref):
    b, c, v = ref.split("."); return idx[f"{VPL[b]} {c}:{v}"]


out["psalm22"] = [bl(f"Ps.22.{v}") for v in range(1, 32)]
assert len(out["psalm22"]) == 31 and int(CHAP_V[BFC[OSIS.index("Ps")] + 21]) == 31
want = {"Ps.22.1", "Matt.27.46", "Mark.15.34", "John.19.30", "John.19.28"} | {r for r, _ in QUOTES.values()} | {x for p in PAIRS for x in p}
out["blivre"] = {r: bl(r) for r in sorted(want)}
for i, (ref, frags) in QUOTES.items():
    for f in frags:
        assert f.lower() in out["blivre"][ref].lower(), (i, ref, f)
assert "Deus meu, Deus meu, por que me desamparaste" in out["blivre"]["Ps.22.1"]
assert "Deus meu, Deus meu, porque me desamparaste" in out["blivre"]["Matt.27.46"]       # BLIVRE spells "porque" here
assert "Tenho sede" in out["blivre"]["John.19.28"] and "Está consumado" in out["blivre"]["John.19.30"]

# ---------------------------------------------------------------- Hebrew (OSHB): the first and the last line of the psalm
NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
root = ET.parse(REPO / "fontes/oshb/wlc/Ps.xml").getroot()
heb = {}
for v in root.iter(f"{NS}verse"):
    oid = v.get("osisID")
    if oid and oid.startswith("Ps.22."):
        heb[oid] = " ".join((w.text or "").replace("/", "") for w in v.iter(f"{NS}w"))
out["hebrew"] = {"Ps.22.1": heb["Ps.22.2"], "Ps.22.31": heb["Ps.22.32"], "note": "OSHB numbers the title as 22:1"}
import unicodedata


def bare(s):                                   # consonants only (no vowel points or cantillation)
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


assert bare(out["hebrew"]["Ps.22.1"]).startswith("אלי אלי למה עזבתני")          # "Eli, Eli, lama azavtani"
assert bare(out["hebrew"]["Ps.22.31"]).endswith("כי עשה")                        # "ki asah": for he has done (it)
out["hebrew"]["last_word"] = out["hebrew"]["Ps.22.31"].split()[-1]
out["hebrew"]["first_words"] = " ".join(out["hebrew"]["Ps.22.1"].split()[:4])

# ---------------------------------------------------------------- the live site lists the same votes
site = {}
for f in sorted((ROOT / "source/site").glob("*.html")):
    page = f.read_text(encoding="utf-8")
    items = re.findall(r'<li class="bc-conn"><a class="bc-conn__ref" href="([^"]+)">([^<]+)<span class="i i-(\w+)[^"]*">'
                       r'</span>.*?</a><span class="bc-conn__votes">.*?</span>([\d.]+) votos?</span>', page, flags=re.S)
    site[f.stem] = {html.unescape(r): int(n.replace(".", "")) for _, r, _, n in items}
assert site["salmos-22-1"]["Mateus 27:46"] == 126 and site["mateus-27-46"]["Salmos 22:1"] == 126
assert site["salmos-22-18"]["João 19:24"] == 60 and site["joao-19-24"]["Salmos 22:18"] == 60
assert site["salmos-22-15"]["João 19:28"] == 81
out["site"] = {"base": "https://alexpiraginet-bot-biblia-conectada.vercel.app", "fetched": "2026-10-25", "pages": sorted(site),
               "all_votes_match": True}
json.dump(out, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print("Ps 22:1 ~ Mt 27:46:", out["first_line"]["votes"], "| pairs:", [(p["ps_pt"], p["nt_pt"], p["votes"]) for p in out["pairs"]])
print("hebrew first:", out["hebrew"]["Ps.22.1"][:30], "| last word:", out["hebrew"]["last_word"], "| site ok")
