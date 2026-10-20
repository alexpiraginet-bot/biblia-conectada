#!/usr/bin/env python3
"""Every number, quote and word-level proof of "João 3:16, por dentro" (video 5), computed from the open data.

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY). Same definitions as the site and videos
1-4: "ligações de um versículo" = unique partner verses, any vote, self-pairs excluded; "votos de um par" = sum of both
directions; a range counts as its first verse.
Cross-check: source/site/joao-3-16.html is the live page https://alexpiraginet-bot-biblia-conectada.vercel.app/joao/3/16
(fetched 20/10/2026); every vote used in the film must match the list on that page.
Text (quotes): BLIVRE, CC BY 4.0 BR (fontes/blivre). Greek NT: MorphGNT on SBLGNT (fontes/morphgnt). Hebrew: OSHB
(fontes/oshb). Greek OT: Septuaginta, eBible grclxx, public domain (fontes/ebible/grclxx).
How the links are made: source/site/openbible-labs-cross-references.html (OpenBible.info "About This Page", 20/10/2026).

  python3 -I tools/analyze.py   -> data/stats.json + data/arcs.json (asserts every claim of script.py)
"""
import glob, html, json, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
OSIS, BOOKS_PT = S["osis"], S["books_pt"]
BFC = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])
NV = len(CHAP_OF)


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BFC[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


def name(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{BOOKS_PT[b]} {c - BFC[b] + 1}:{g - CHAP_FIRST[c] + 1}"


def osis(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return f"{OSIS[b]}.{c - BFC[b] + 1}.{g - CHAP_FIRST[c] + 1}"


ok = PA != PB
P = np.concatenate([PA[ok], PB[ok]]); Q = np.concatenate([PB[ok], PA[ok]]); V = np.concatenate([VOTES[ok], VOTES[ok]])


def partners(ref):
    g = gv(ref); m = P == g
    o = np.argsort(-V[m], kind="stable")
    return [{"gv": int(Q[m][i]), "osis": osis(int(Q[m][i])), "ref": name(int(Q[m][i])), "votes": int(V[m][i]),
             "chapter": int(CHAP_OF[int(Q[m][i])])} for i in o]


def pair(r1, r2):
    a, b = gv(r1), gv(r2)
    k = np.where(((PA == a) & (PB == b)) | ((PA == b) & (PB == a)))[0]
    assert len(k) <= 1
    return int(VOTES[k[0]]) if len(k) else None


out = {"source": "OpenBible.info (CC BY) via xref.npz; BLIVRE (CC BY 4.0 BR); MorphGNT/SBLGNT; OSHB; LXX (eBible grclxx)",
       "n_pairs": int(ok.sum())}
assert out["n_pairs"] == 301539

# ---------------------------------------------------------------- John 3:16 and the six links of the film
J = partners("John.3.16")
out["links_john316"] = len(J)
assert len(J) == 80
LINKS = ["Rom.5.8", "1John.4.9", "Gen.22.2", "Gen.22.12", "John.1.29", "Rom.8.32", "1John.4.19", "Heb.11.17"]
out["pairs"] = {r: pair("John.3.16", r) for r in LINKS}
assert out["pairs"] == {"Rom.5.8": 1146, "1John.4.9": 755, "Gen.22.2": 43, "Gen.22.12": 172, "John.1.29": 256,
                        "Rom.8.32": 591, "1John.4.19": 400, "Heb.11.17": 1}, out["pairs"]
assert J[0]["osis"] == "Rom.5.8"                                   # the most voted link of John 3:16
# rank of John 3:16 ~ Rom 5:8 in the whole base (pairs without self-pairs)
v = VOTES[ok]
above = int((v > 1146).sum()); tied = int((v == 1146).sum())
out["rank_rom58_pair"] = {"above": above, "tied_incl_self": tied, "rank": above + 1, "of": int(ok.sum())}
assert above == 4 and tied == 1                                    # "a quinta ligação mais votada da Bíblia inteira"
top = np.argsort(-v, kind="stable")[:6]
out["top_pairs"] = [{"a": name(int(PA[ok][i])), "b": name(int(PB[ok][i])), "votes": int(v[i])} for i in top]
# the chain around Genesis 22 (pairs between the linked verses themselves)
CHAIN = [("Gen.22.7", "John.1.29"), ("Gen.22.8", "John.1.29"), ("Gen.22.2", "Rom.8.32"), ("Gen.22.12", "Rom.8.32"),
         ("Gen.22.2", "Heb.11.17"), ("1John.4.9", "John.1.14")]
out["chain"] = {f"{a}~{b}": pair(a, b) for a, b in CHAIN}
assert out["chain"]["Gen.22.7~John.1.29"] == 15 and out["chain"]["Gen.22.12~Rom.8.32"] == 17
assert out["chain"]["Gen.22.2~Heb.11.17"] == 13 and out["chain"]["Gen.22.2~Rom.8.32"] == 35

# ---------------------------------------------------------------- the live site lists the same votes
page = (ROOT / "source/site/joao-3-16.html").read_text(encoding="utf-8")
items = re.findall(r'<li class="bc-conn"><a class="bc-conn__ref" href="([^"]+)">([^<]+)<span class="i i-(\w+)[^"]*">'
                   r'</span>.*?</a><span class="bc-conn__votes">.*?</span>([\d.]+) votos?</span>', page, flags=re.S)
site = {html.unescape(r): int(n.replace(".", "")) for _, r, _, n in items}
assert len(site) == 80, len(site)
assert "80 ligações · a mais votada: Romanos 5:8, 1.146 votos" in page
for p in J:
    assert site[p["ref"]] == p["votes"], (p["ref"], site.get(p["ref"]), p["votes"])
out["site"] = {"url": "https://alexpiraginet-bot-biblia-conectada.vercel.app/joao/3/16", "fetched": "2026-10-20",
               "links": len(site), "all_votes_match": True,
               "headline": "80 ligações · a mais votada: Romanos 5:8, 1.146 votos"}

# ---------------------------------------------------------------- how OpenBible.info says the links are made
lab = (ROOT / "source/site/openbible-labs-cross-references.html").read_text(encoding="utf-8")
lab_t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"(?s)<script.*?</script>|<style.*?</style>", "", lab))))
for s in ["About 340,000 cross references identify commonalities between different parts of the Bible",
          "chains of similar themes, words, events, or people",
          "especially the Treasury of Scripture Knowledge , which provides most of the data",
          "It also includes data (to seed the initial votes) from my Topical Bible and Twitter Bible Search"]:
    assert s in lab_t, s
out["method"] = {"openbible": ["About 340,000 cross references identify commonalities between different parts of the "
                               "Bible—chains of similar themes, words, events, or people.",
                               "This data draws primarily from public-domain sources, especially the Treasury of "
                               "Scripture Knowledge, which provides most of the data. It also includes data (to seed "
                               "the initial votes) from my Topical Bible and Twitter Bible Search."],
                 "fetched": "2026-10-20", "rows": S["stats"]["rows_total"]}
assert out["method"]["rows"] == 344799

# ---------------------------------------------------------------- Greek NT (MorphGNT / SBLGNT)
BK = {"61": "Matt", "62": "Mark", "63": "Luke", "64": "John", "65": "Acts", "66": "Rom", "67": "1Cor", "68": "2Cor",
      "69": "Gal", "70": "Eph", "71": "Phil", "72": "Col", "73": "1Thess", "74": "2Thess", "75": "1Tim", "76": "2Tim",
      "77": "Titus", "78": "Phlm", "79": "Heb", "80": "Jas", "81": "1Pet", "82": "2Pet", "83": "1John", "84": "2John",
      "85": "3John", "86": "Jude", "87": "Rev"}
NT = {}
for f in sorted(glob.glob(str(REPO / "fontes/morphgnt/*-morphgnt.txt"))):
    b = BK[Path(f).name[:2]]
    for line in open(f, encoding="utf-8"):
        p = line.split()
        NT.setdefault(f"{b}.{int(p[0][2:4])}.{int(p[0][4:6])}", []).append({"text": p[3], "word": p[4], "lemma": p[6]})
greek = lambda r: " ".join(w["text"] for w in NT[r])
mono = [r for r, ws in NT.items() for w in ws if w["lemma"] == "μονογενής"]
assert mono == ["Luke.7.12", "Luke.8.42", "Luke.9.38", "John.1.14", "John.1.18", "John.3.16", "John.3.18",
                "Heb.11.17", "1John.4.9"], mono
lem = lambda r: [w["lemma"] for w in NT[r]]
shared = [x for x in dict.fromkeys(lem("1John.4.9")) if x in lem("John.3.16")
          and x not in {"ὁ", "καί", "γάρ", "ἵνα", "εἰς", "αὐτός", "ἀλλά", "μή", "πᾶς"}]
assert shared == ["θεός", "υἱός", "μονογενής", "κόσμος"], shared
form = lambda r, lemma: [w["word"] for w in NT[r] if w["lemma"] == lemma]
assert form("John.3.16", "ἀγαπάω") == ["ἠγάπησεν"] and "ἠγάπησεν" in form("1John.4.19", "ἀγαπάω")
assert form("Rom.8.32", "φείδομαι") == ["ἐφείσατο"]
assert form("Heb.11.17", "μονογενής") == ["μονογενῆ"]
out["greek"] = {"monogenes": {"lemma": "μονογενής", "count_nt": len(mono), "refs": mono, "edition": "SBLGNT (MorphGNT)"},
                "shared_john316_1john49": shared,
                "agapao_form": {"John.3.16": "ἠγάπησεν", "1John.4.19": "ἠγάπησεν"},
                "pheidomai": {"Rom.8.32": "οὐκ ἐφείσατο"},
                "text": {r: greek(r) for r in ["John.3.16", "1John.4.9", "Rom.5.8", "Rom.8.32", "Heb.11.17",
                                                "John.1.29", "1John.4.19"]}}

# ---------------------------------------------------------------- Greek OT (Septuaginta)
lxx = zipfile.ZipFile(REPO / "fontes/ebible/grclxx/grclxx_vpl.zip").read("grclxx_vpl.txt").decode("utf-8").splitlines()
LXX = {" ".join(l.split(" ")[:2]): " ".join(l.split(" ")[2:]) for l in lxx if l.strip()}
first_agap = next(l for l in lxx if "ἀγαπ" in l)
assert first_agap.startswith("GEN 22:2 "), first_agap[:20]             # first ἀγαπ- of the Greek Bible
assert "ὃν ἠγάπησας" in LXX["GEN 22:2"] and "τὸν υἱόν σου τὸν ἀγαπητόν" in LXX["GEN 22:2"]
assert "οὐκ ἐφείσω τοῦ υἱοῦ σου" in LXX["GEN 22:12"] and "οὐκ ἐφείσω τοῦ υἱοῦ σου" in LXX["GEN 22:16"]
assert lxx[0].startswith("GEN 1:1 ")                                   # file order starts at Genesis 1:1
out["lxx"] = {"first_agap": "GEN 22:2", "Gen.22.2": "ὃν ἠγάπησας", "Gen.22.12": "οὐκ ἐφείσω τοῦ υἱοῦ σου",
              "Gen.22.16": "οὐκ ἐφείσω τοῦ υἱοῦ σου",
              "text": {k: LXX[k] for k in ["GEN 22:2", "GEN 22:12", "GEN 22:16"]}}

# ---------------------------------------------------------------- Hebrew (OSHB, Strong H157 אהב = to love)
ns = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
ORDER = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa "
         "Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal").split()
ahav = []; g222 = None
for b in ORDER:
    for vv in ET.parse(REPO / f"fontes/oshb/wlc/{b}.xml").getroot().iter(ns + "verse"):
        ws = list(vv.iter(ns + "w"))
        for w in ws:
            if "157" in [re.sub(r"\D", "", x) for x in w.get("lemma", "").split("/")]:
                ahav.append((vv.get("osisID"), w.text))
        if vv.get("osisID") == "Gen.22.2": g222 = ws
assert ahav[0][0] == "Gen.22.2", ahav[0]                              # first אהב of the Hebrew Bible
yachid = [w.text for w in g222 if w.get("lemma") == "3173"]
assert len(yachid) == 1                                               # יָחִיד "único" in the same verse
out["hebrew"] = {"lemma": "H157 אהב", "first": "Gen.22.2", "form": "אָהַבְתָּ", "count": len(ahav),
                 "yachid_Gen.22.2": "יְחִידְךָ", "edition": "OSHB (WLC 4.20)"}

# ---------------------------------------------------------------- Portuguese quotes (BLIVRE)
bl = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
BL = {" ".join(l.split(" ")[:2]): " ".join(l.split(" ")[2:]) for l in bl.splitlines() if l.strip()}
KEYS = {"John.3.16": "JOH 3:16", "Rom.5.8": "ROM 5:8", "1John.4.9": "1JO 4:9", "Heb.11.17": "HEB 11:17",
        "Gen.22.2": "GEN 22:2", "Gen.22.7": "GEN 22:7", "Gen.22.8": "GEN 22:8", "Gen.22.11": "GEN 22:11",
        "Gen.22.12": "GEN 22:12", "Gen.22.13": "GEN 22:13", "John.1.29": "JOH 1:29", "Rom.8.32": "ROM 8:32",
        "1John.4.19": "1JO 4:19"}
out["blivre"] = {k: BL[v] for k, v in KEYS.items()}
gen = sorted([(k, t) for k, t in BL.items() if k.startswith("GEN ")],
             key=lambda kv: tuple(int(x) for x in kv[0].split(" ")[1].split(":")))
LOVE = re.compile(r"\b(amar|amor|amou|amas|ama|amo|amava|amavam|amado|amada|amados|amadas|amei|amaste|amam|amais|amamos)\b",
                  re.I)
first_love_pt = next(k for k, t in gen if LOVE.search(t))
assert first_love_pt == "GEN 22:2", first_love_pt
out["first_love_pt"] = {"ref": "GEN 22:2", "word": LOVE.search(BL["GEN 22:2"]).group(0)}

# ---------------------------------------------------------------- arcs of John 3:16 (for the graphic)
ch316 = int(CHAP_OF[gv("John.3.16")])
out["chapter_index"] = {"João 3": ch316 + 1, "Gênesis 22": int(CHAP_OF[gv("Gen.22.2")]) + 1, "total": len(CHAP_V)}
arcs = {"n_chapters": len(CHAP_V), "from": {"ref": "João 3:16", "chapter": ch316},
        "books": [{"pt": BOOKS_PT[b], "first": int(BFC[b]), "chapters": int((CHAP_BOOK == b).sum())} for b in range(66)],
        "links": [{"ref": p["ref"], "osis": p["osis"], "chapter": p["chapter"], "votes": p["votes"]} for p in J]}
json.dump(arcs, open(ROOT / "data/arcs.json", "w"), ensure_ascii=False, indent=1)
json.dump(out, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- print the claims
print("pares:", out["n_pairs"], "| João 3:16:", out["links_john316"], "ligações | site confere:", out["site"]["all_votes_match"])
print("votos:", out["pairs"])
print("Rm 5:8 ~ Jo 3:16 =", out["rank_rom58_pair"]["rank"], "ª mais votada de", out["rank_rom58_pair"]["of"])
print("cadeia:", out["chain"])
print("μονογενής:", len(mono), mono)
print("amar 1ª vez: hebraico", out["hebrew"]["first"], "| grego (LXX)", out["lxx"]["first_agap"], "| BLIVRE", first_love_pt)
print("capítulos:", out["chapter_index"])
