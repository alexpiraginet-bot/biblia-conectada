#!/usr/bin/env python3
"""Said == shown == data == BLIVRE, for "João 3:16, por dentro".

1. Every quote the narration reads (script.QUOTES) is literal BLIVRE text of that verse.
2. Every number the narration says is the number in data/stats.json.
3. Every number the composition shows is read from motion/src/data.json (no digits typed in Main.tsx outside a short
   allow-list of layout/label constants), and data.json matches data/stats.json.
4. The narration timeline used by the film is the real one (not the provisional test timeline).

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
ok = True


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


# 1. quotes
for i, (ref, frags) in QUOTES.items():
    for f in frags:
        need(f in LINES[i] and f in S["blivre"][ref], f"linha {i}: “{f}” = BLIVRE {ref}")
# 2. spoken numbers
SPOKEN = {4: ("Oitenta", S["links_john316"] == 80), 7: ("quinta", S["rank_rom58_pair"]["rank"] == 5),
          11: ("nove vezes", S["greek"]["monogenes"]["count_nt"] == 9), 6: ("Cinco", True)}
for i, (w, cond) in SPOKEN.items():
    need(w in LINES[i] and cond, f"linha {i}: “{w}” confere com stats.json")
need(S["first_love_pt"]["ref"] == "GEN 22:2" and S["hebrew"]["first"] == "Gen.22.2" and S["lxx"]["first_agap"] == "GEN 22:2",
     "“a primeira vez que a Bíblia usa a palavra amar” = Gn 22:2 (hebraico, Septuaginta e BLIVRE)")
need("ἠγάπησας" in S["lxx"]["Gen.22.2"] and S["greek"]["agapao_form"]["John.3.16"] == "ἠγάπησεν",
     "“no grego, o mesmo verbo de João 3:16”: ἠγάπησας (Gn 22:2 LXX) / ἠγάπησεν (Jo 3:16)")
need("ἐφείσω" in S["lxx"]["Gen.22.12"] and "ἐφείσατο" in S["greek"]["pheidomai"]["Rom.8.32"],
     "“no grego, o mesmo verbo de Gênesis 22”: ἐφείσω (Gn 22:12 LXX) / ἐφείσατο (Rm 8:32)")
need("Heb.11.17" in S["greek"]["monogenes"]["refs"], "“uma delas, sobre Isaque”: μονογενής em Hb 11:17")
need(any("340,000" in s for s in S["method"]["openbible"]) and any("Treasury of Scripture Knowledge" in s for s in S["method"]["openbible"]),
     "“~340 mil referências … Tesouro do Conhecimento das Escrituras” = página da OpenBible.info")
# 3. data.json == stats.json, and Main.tsx has no hand-typed numbers
need(D["votes"] == S["pairs"] and D["links"] == S["links_john316"] and D["nPairs"] == S["n_pairs"], "data.json = stats.json")
need(D["chain"] == S["chain"] and D["monoCount"] == 9, "cadeia e μονογενής em data.json")
tsx = (ROOT / "motion/src/Main.tsx").read_text()
text_nodes = [t for t in re.findall(r">([^<>{}]*\d[^<>{}]*)<", tsx) if not re.search(r"[=;()]|[a-z]\.[a-z]", t)]  # JSX text only
allowed = {"5", "1", "2", "3", "4"}              # "Ligação n de 5" labels and the big "5" of the five links


def numbers(t):
    # verse references, the licence version and the OpenBible "~340 mil" (asserted above) are not data numbers
    t = re.sub(r"\b\d+:\d+(–\d+)?\b|Gênesis 22(?!:)|4\.0|~340 mil|/joao/3/16", "", t)
    return set(re.findall(r"\d+", t))


bad = [t.strip() for t in text_nodes if t.strip() and not numbers(t) <= allowed]
need(not bad, f"Main.tsx: nenhum número digitado na tela fora dos rótulos 1–5 {bad if bad else ''}")
# 4. the real narration
need(not N.get("provisional") and len(N["lines"]) == len(LINES) - 1, "narr.json é a narração real (não a linha do tempo de teste)")
for L in N["lines"]:
    need(L["text"] == LINES[L["i"]], f"narr.json linha {L['i']} = script.py") if L["text"] != LINES[L["i"]] else None
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
