#!/usr/bin/env python3
"""Every number, quote and word-level claim of "O Antigo dentro do Novo" (video 6), computed from the open data.

Cross references: ../biblia-referencias/data/xref.npz (OpenBible.info, CC BY). Same definitions as the site and videos
1-5: a "ligação" is a unique pair of verses, any vote, self-pairs excluded; a range counts as its first verse. An
"AT-NT ligação" is a pair with one verse in the 39 books of the Old Testament and the other in the 27 of the New.

Literal Greek (the orange lines): a pair is "palavra por palavra" when the New Testament verse (SBLGNT, MorphGNT) and the
Old Testament verse in the Septuagint (eBible grclxx, public domain) share a run of at least N_GRAM identical words in
the same order (accents, case and punctuation removed; the run must have at least 3 words outside a short list of
articles, pronouns and particles), AND OpenBible already links the NT verse to that OT passage. The second condition
removes coincidences ("the word of the Lord ...") and fixes the verse numbers: the Septuagint numbers some books
differently (Psalms, Jeremiah, Joel, Malachi), so the OT verse used is the OpenBible partner nearest to the Septuagint
reference, after mapping the Septuagint chapter to the Hebrew one (tables below).

Cross-check: source/site/*.html are the live pages of https://alexpiraginet-bot-biblia-conectada.vercel.app (fetched
25/10/2026); every vote shown in the film must match the list on those pages.
Quotes: BLIVRE, CC BY 4.0 BR (fontes/blivre).

  python3 -I tools/analyze.py   -> data/stats.json + data/lines.npz (asserts every claim of script.py)
"""
import collections, glob, html, json, re, sys, unicodedata, zipfile
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
BOOK = CHAP_BOOK[CHAP_OF]                       # book of every verse
N_GRAM = 5
MIN_CONTENT = 3                                 # words of the run outside STOP (drops "the heaven and the earth" formulas)


def gv(ref):
    bk, c, v = ref.split(".")
    ch = BFC[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


def bcv(g):
    c = int(CHAP_OF[g]); b = int(CHAP_BOOK[c])
    return b, c - BFC[b] + 1, g - int(CHAP_FIRST[c]) + 1


def name(g):
    b, c, v = bcv(g); return f"{BOOKS_PT[b]} {c}:{v}"


def osis(g):
    b, c, v = bcv(g); return f"{OSIS[b]}.{c}.{v}"


# ---------------------------------------------------------------- AT-NT pairs
ok = PA != PB
key = np.minimum(PA, PB)[ok] * NV + np.maximum(PA, PB)[ok]
uk, first = np.unique(key, return_index=True)
votes = np.zeros(len(uk), np.int64)
np.maximum.at(votes, np.searchsorted(uk, key), VOTES[ok])      # duplicates (if any) keep the larger total
A, B = uk // NV, uk % NV
assert len(uk) == 301539, len(uk)
x = (BOOK[A] < 39) != (BOOK[B] < 39)
OTV = np.where(BOOK[A] < 39, A, B)[x]; NTV = np.where(BOOK[A] < 39, B, A)[x]; XV = votes[x]
out = {"n_pairs": int(len(uk)), "ot_nt": int(x.sum()), "ot_nt_votes_gt0": int((XV > 0).sum())}
assert out["ot_nt"] == 67293, out["ot_nt"]
nv_book = np.bincount(BOOK, minlength=66)
cot = np.bincount(BOOK[OTV], minlength=66)[:39]; cnt = np.bincount(BOOK[NTV], minlength=66)[39:]
out["ot_books"] = [{"i": i, "osis": OSIS[i], "pt": BOOKS_PT[i], "links": int(cot[i]), "verses": int(nv_book[i]),
                    "per_verse": round(float(cot[i] / nv_book[i]), 2)} for i in range(39)]
out["nt_books"] = [{"i": 39 + i, "osis": OSIS[39 + i], "pt": BOOKS_PT[39 + i], "links": int(cnt[i]),
                    "verses": int(nv_book[39 + i]), "per_verse": round(float(cnt[i] / nv_book[39 + i]), 2)} for i in range(27)]
out["ot_books_linked"] = int((cot > 0).sum()); out["nt_books_linked"] = int((cnt > 0).sum())
assert out["ot_books_linked"] == 39 and out["nt_books_linked"] == 27
rank_ot = sorted(out["ot_books"], key=lambda b: -b["links"]); rank_nt = sorted(out["nt_books"], key=lambda b: -b["links"])
out["top_ot"] = [b["pt"] for b in rank_ot[:5]]; out["top_nt"] = [b["pt"] for b in rank_nt[:5]]
assert out["top_ot"][:2] == ["Salmos", "Isaías"] and rank_ot[0]["links"] == 11484 and rank_ot[1]["links"] == 8468
assert out["top_nt"][0] == "Mateus" and rank_nt[0]["links"] == 8696
dens = sorted(out["ot_books"], key=lambda b: -b["per_verse"])
out["densest_ot"] = {"pt": dens[0]["pt"], "per_verse": dens[0]["per_verse"], "links": dens[0]["links"],
                     "verses": dens[0]["verses"], "next": dens[1]["pt"], "next_per_verse": dens[1]["per_verse"]}
assert dens[0]["pt"] == "Malaquias" and dens[0]["osis"] == OSIS[38]       # the last book of the OT
nt_lv = np.unique(NTV); ot_lv = np.unique(OTV)
out["nt_verses"] = int(nv_book[39:].sum()); out["nt_verses_linked"] = int(len(nt_lv))
out["ot_verses"] = int(nv_book[:39].sum()); out["ot_verses_linked"] = int(len(ot_lv))
out["nt_share"] = round(out["nt_verses_linked"] / out["nt_verses"], 4)
assert out["nt_verses_linked"] == 6808 and out["nt_verses"] == 7957 and 0.8 < out["nt_share"] < 0.9   # "mais de 8 em 10"


def pairv(r1, r2):
    a, b = sorted((gv(r1), gv(r2)))
    k = np.searchsorted(uk, a * NV + b)
    return int(votes[k]) if k < len(uk) and uk[k] == a * NV + b else None


FAMOUS = [("Gen.1.1", "John.1.1"), ("Isa.7.14", "Matt.1.23"), ("Isa.61.1", "Luke.4.18"), ("Mal.3.1", "Matt.11.10"),
          ("Mal.3.1", "Mark.1.2")]
out["famous"] = {f"{a}~{b}": pairv(a, b) for a, b in FAMOUS}
assert out["famous"]["Gen.1.1~John.1.1"] == 724 and out["famous"]["Isa.7.14~Matt.1.23"] == 333
assert out["famous"]["Isa.61.1~Luke.4.18"] == 549
o = np.argsort(-XV, kind="stable")
out["top_ot_nt"] = [[name(int(OTV[i])), name(int(NTV[i])), int(XV[i])] for i in o[:10]]
out["rank_gen1_john1"] = int(np.where((OTV[o] == gv("Gen.1.1")) & (NTV[o] == gv("John.1.1")))[0][0]) + 1
out["rank_isa61_luke4"] = int(np.where((OTV[o] == gv("Isa.61.1")) & (NTV[o] == gv("Luke.4.18")))[0][0]) + 1

# ---------------------------------------------------------------- literal Greek: Septuagint x SBLGNT
def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn").replace("ς", "σ")
    w = re.sub(r"[^α-ω]", "", w)
    return re.sub(r"(ε|σι)ν$", r"\1", w) if len(w) > 3 else w      # movable nu: ἔχρισεν = ἔχρισε


LXX_BOOKS = ("GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH NEH ESG JOB PSA PRO ECC SOL ISA JER LAM EZE DNG "
             "HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL").split()
LXX_OSIS = ("Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Neh Esth Job Ps Prov Eccl Song Isa Jer Lam "
            "Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal").split()
L2O = dict(zip(LXX_BOOKS, LXX_OSIS))
lxx_raw = zipfile.ZipFile(REPO / "fontes/ebible/grclxx/grclxx_vpl.zip").read("grclxx_vpl.txt").decode("utf-8")
LXX = {}                                       # (book, chapter, verse, ref) -> words, raw text
for line in lxx_raw.splitlines():
    p = line.split(" ", 2)
    if len(p) < 3 or p[0] not in L2O:
        continue
    c, v = [int(re.match(r"\d+", s).group()) for s in p[1].split(":")]
    LXX[(p[0], c, v, p[1])] = ([w for w in map(norm, p[2].split()) if w], p[2])
assert len({k[0] for k in LXX}) == 38          # Ezra is not in this edition (fontes/README.md: 36 books + ESG/DNG)
NTC = dict(zip(range(1, 28), OSIS[39:]))
GNT = collections.OrderedDict()                # gv -> words, surface forms
for f in sorted(glob.glob(str(REPO / "fontes/morphgnt/*-morphgnt.txt"))):
    for line in open(f, encoding="utf-8"):
        c = line.split()
        bk_, ch_, vs_ = NTC[int(c[0][:2])], int(c[0][2:4]), int(c[0][4:])
        vs_ = min(vs_, int(CHAP_V[BFC[OSIS.index(bk_)] + ch_ - 1]))   # SBLGNT 3Jo 1:15 etc. -> last verse (KJV numbering)
        g = gv(f"{bk_}.{ch_}.{vs_}")
        GNT.setdefault(g, ([], []))
        GNT[g][0].append(norm(c[4])); GNT[g][1].append(c[4])
STOP = {norm(w) for w in ("καί ὁ ἡ τό τοῦ τῆς τῷ τῇ τόν τήν οἱ αἱ τά τῶν τοῖς ταῖς τούς τάς ἐν εἰς ἐκ ἐξ ἀπό πρός ἐπί "
                          "διά ὅτι δέ γάρ οὐ οὐκ μή αὐτοῦ αὐτῷ αὐτόν αὐτῶν αὐτοῖς αὐτούς αὐτός μου σου ἐγώ σύ ὑμῶν "
                          "ἡμῶν ὑμῖν ἡμῖν με σε ἵνα ὡς ἐάν ἄν εἰ ἦν ἐστιν εἶπεν λέγει").split()}
grams = collections.defaultdict(set)
for k, (ws, _) in LXX.items():
    for i in range(len(ws) - N_GRAM + 1):
        gr = tuple(ws[i:i + N_GRAM])
        if sum(w not in STOP for w in gr) >= MIN_CONTENT:
            grams[gr].add(k)
hits = collections.defaultdict(set)            # (nt gv, lxx key) -> word positions in the NT verse
for g, (ws, _) in GNT.items():
    for i in range(len(ws) - N_GRAM + 1):
        for k in grams.get(tuple(ws[i:i + N_GRAM]), ()):
            hits[(g, k)].update(range(i, i + N_GRAM))


def heb_psalm(c, v):
    """Septuagint psalm -> Hebrew/English (chapter, verse). Titles shift verses by 0-2; the match allows +-4."""
    if c <= 8 or c >= 148: return c, v
    if c == 9: return (9, v) if v <= 21 else (10, v - 21)
    if c <= 112: return c + 1, v
    if c == 113: return (114, v) if v <= 8 else (115, v - 8)
    if c == 114: return 116, v
    if c == 115: return 116, v + 9
    if c <= 145: return c + 1, v
    return (147, v) if c == 146 else (147, v + 11)


JER = {26: 46, 27: 50, 28: 51, 29: 47, 30: 49, 31: 48, 32: 25}          # LXX 25:14-31 are the oracles of MT 46-51


def heb_ref(b, c, v):
    """Septuagint (chapter, verse) -> the English numbering OpenBible uses, for the books the NT quotes most."""
    if b == "PSA": return heb_psalm(c, v)
    if b == "JER":
        if c == 25 and v >= 14: return 49, v + 20
        return JER.get(c, c - 7 if 33 <= c <= 51 else c), v
    if b == "JOE": return (2, v + 27) if c == 3 else ((3, v) if c == 4 else (c, v))      # LXX Jl 3:1-5 = Jl 2:28-32
    if b == "HOS" and c == 2: return (1, v + 9) if v <= 2 else (2, v - 2)               # LXX Os 2:1 = Os 1:10
    if b == "DNG" and c == 3 and v >= 91: return 3, v - 67                              # after the Greek additions
    return c, v


partners = collections.defaultdict(list)
for a, b2 in zip(A[x], B[x]):
    partners[int(a)].append(int(b2)); partners[int(b2)].append(int(a))
literal = {}                                   # (ot gv, nt gv) -> info
for (g, k), pos in hits.items():
    b, c, v, ref = k
    ob = OSIS.index(L2O[b]); hc, hv = heb_ref(b, c, v)
    best = None
    for p in partners[g]:
        pb, pc, pv = bcv(p)
        if pb != ob or pc != hc or abs(pv - hv) > 4:       # same book and chapter, verse within 4
            continue
        d = abs(pv - hv)
        if best is None or d < best[0]:
            best = (d, p)
    if best is None:
        continue
    kk = (best[1], g)
    prev = literal.get(kk)
    if prev is None or len(pos) > len(prev["pos"]):
        literal[kk] = {"lxx": f"{b} {ref}", "pos": sorted(pos)}
lit_ot = np.array([k[0] for k in literal]); lit_nt = np.array([k[1] for k in literal])
out["literal"] = {
    "n_gram": N_GRAM, "pairs": len(literal), "nt_verses": int(len(np.unique(lit_nt))), "ot_verses": int(len(np.unique(lit_ot))),
    "raw_lxx_matches": len(hits),
    "ot_books": {BOOKS_PT[i]: int(n) for i, n in enumerate(np.bincount(BOOK[lit_ot], minlength=39)[:39]) if n},
    "nt_books": {BOOKS_PT[39 + i]: int(n) for i, n in enumerate(np.bincount(BOOK[lit_nt], minlength=66)[39:]) if n},
}


def literal_pair(r_ot, r_nt):
    v = literal.get((gv(r_ot), gv(r_nt)))
    if not v: return None
    ws = GNT[gv(r_nt)][1]
    return {"lxx": v["lxx"], "nt_words": [w for w in ws], "lit": v["pos"],
            "lxx_text": next(t for (b, c, vv, r), (_, t) in LXX.items() if f"{b} {r}" == v["lxx"])}


out["literal"]["examples"] = {"Isa.7.14~Matt.1.23": literal_pair("Isa.7.14", "Matt.1.23"),
                              "Isa.61.1~Luke.4.18": literal_pair("Isa.61.1", "Luke.4.18")}
ex = out["literal"]["examples"]
assert ex["Isa.7.14~Matt.1.23"]["lit"] == list(range(10))                 # "Ἰδοὺ ἡ παρθένος ἐν γαστρὶ ἕξει καὶ τέξεται υἱόν καὶ"
assert ex["Isa.61.1~Luke.4.18"]["lit"] == list(range(18))                 # 18 of the 22 Greek words of Lc 4:18
assert out["literal"]["pairs"] == 223 and out["literal"]["nt_verses"] == 193, out["literal"]["pairs"]   # pinned (film)   # pinned (script + film)
assert (gv("Gen.1.1"), gv("John.1.1")) not in literal                       # Gn 1:1 ~ Jo 1:1 is blue (theme, not words)
o2 = sorted(literal.items(), key=lambda kv: -len(kv[1]["pos"]))
out["literal"]["longest"] = [[name(k[0]), name(k[1]), len(v["pos"])] for k, v in o2[:12]]

# ---------------------------------------------------------------- the live site lists the same votes
SITE = "https://alexpiraginet-bot-biblia-conectada.vercel.app"
site = {}
for f in sorted((ROOT / "source/site").glob("*.html")):
    page = f.read_text(encoding="utf-8")
    items = re.findall(r'<li class="bc-conn"><a class="bc-conn__ref" href="([^"]+)">([^<]+)<span class="i i-(\w+)[^"]*">'
                       r'</span>.*?</a><span class="bc-conn__votes">.*?</span>([\d.]+) votos?</span>', page, flags=re.S)
    site[f.stem] = {html.unescape(r): int(n.replace(".", "")) for _, r, _, n in items}
CHECK = {"joao-1-1": ("Gênesis 1:1", "Gen.1.1~John.1.1"), "mateus-1-23": ("Isaías 7:14", "Isa.7.14~Matt.1.23"),
         "lucas-4-18": ("Isaías 61:1", "Isa.61.1~Luke.4.18"), "malaquias-3-1": ("Mateus 11:10", "Mal.3.1~Matt.11.10")}
for page, (ref, pair) in CHECK.items():
    assert site[page][ref] == out["famous"][pair], (page, ref, site[page].get(ref), out["famous"][pair])
assert site["malaquias-3-1"]["Marcos 1:2"] == out["famous"]["Mal.3.1~Mark.1.2"]
out["site"] = {"base": SITE, "fetched": "2026-10-25", "pages": sorted(site), "all_votes_match": True}

# ---------------------------------------------------------------- BLIVRE text of every quote
BL = {}
t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
VPL = {"Gen": "GEN", "John": "JOH", "Isa": "ISA", "Matt": "MAT", "Luke": "LUK", "Mal": "MAL", "Mark": "MAR"}
want = ["Gen.1.1", "John.1.1", "Isa.7.14", "Matt.1.23", "Isa.61.1", "Luke.4.17", "Luke.4.18", "Luke.4.20", "Luke.4.21",
        "Luke.24.27", "Mal.3.1"]
idx = {" ".join(l.split(" ", 2)[:2]): l.split(" ", 2)[2] for l in t.splitlines() if l.count(" ") >= 2}
for r in want:
    b, c, v = r.split("."); BL[r] = idx[f"{VPL[b]} {c}:{v}"]
out["blivre"] = BL

# ---------------------------------------------------------------- the lines the film draws
np.savez_compressed(ROOT / "data/lines.npz", ot=OTV.astype(np.int32), nt=NTV.astype(np.int32), votes=XV.astype(np.int32),
                    lit_ot=lit_ot.astype(np.int32), lit_nt=lit_nt.astype(np.int32),
                    ot_pos=np.array([bcv(int(g))[1] for g in range(NV)], np.int16))
out["chapter_counts"] = {OSIS[i]: int((CHAP_BOOK == i).sum()) for i in range(66)}
json.dump(out, open(ROOT / "data/stats.json", "w"), ensure_ascii=False, indent=1)
print("AT-NT:", out["ot_nt"], "| NT verses linked:", out["nt_verses_linked"], "/", out["nt_verses"], f"({out['nt_share']:.1%})",
      "| literal:", out["literal"]["pairs"], "pairs,", out["literal"]["nt_verses"], "NT verses | site ok")
print("top OT:", [(b["pt"], b["links"]) for b in rank_ot[:5]], "| top NT:", [(b["pt"], b["links"]) for b in rank_nt[:3]])
print("densest:", out["densest_ot"], "| ranks Gn1:1~Jo1:1", out["rank_gen1_john1"], "Is61:1~Lc4:18", out["rank_isa61_luke4"])
print("literal OT books:", sorted(out["literal"]["ot_books"].items(), key=lambda kv: -kv[1])[:8])
print("literal NT books:", sorted(out["literal"]["nt_books"].items(), key=lambda kv: -kv[1])[:8])
print("longest:", out["literal"]["longest"][:6])
if "--sample" in sys.argv:
    import random
    random.seed(6)
    for (a, g), v in random.sample(sorted(literal.items()), 40):
        ws = GNT[g][1]
        print(f"{name(a):18s} {name(g):18s} [{v['lxx']}] ", " ".join(ws[i] for i in v["pos"]))
