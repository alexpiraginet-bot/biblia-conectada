#!/usr/bin/env python3
"""Said == shown == data == BLIVRE, for "Não foi um grito. Foi uma citação." (video 7).

1. Every quote the narration reads (script.QUOTES) is literal BLIVRE text of that verse.
2. Every pair the film draws is a pair of the base, with the votes the site lists.
3. Everything the composition shows comes from motion/src/data.json (no digits typed in Main.tsx); data.json matches
   data/stats.json; the texts lit on screen are literal fragments of the verses.
4. The narration timeline used by the film is the real one.

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES, PAIRS  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
ok = True


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


for i, (ref, frags) in QUOTES.items():
    for f in frags:
        need(f in LINES[i] and f.lower() in S["blivre"][ref].lower(), f"linha {i}: “{f}” = BLIVRE {ref}")
need("primeira linha do Salmo vinte e dois" in LINES[3] and S["first_line"]["votes"] == 126
     and S["first_line"]["partners_top"][0][1] == "Mateus 27:46",
     "linha 3: Mt 27:46 é a 1ª linha do Salmo 22 (par mais votado de Sl 22:1, 126 votos)")
need([(p["ps"], p["nt"]) for p in S["pairs"]] == [list(x) for x in PAIRS] or [(p["ps"], p["nt"]) for p in S["pairs"]] == PAIRS,
     "os 4 pares do filme são os de script.PAIRS")
need(all(p["votes"] > 0 for p in S["pairs"]) and S["site"]["all_votes_match"], "cada par existe na base e os votos batem com o site")
need(S["no_pair"]["Ps.22.31~John.19.30"] is None and "termina assim" in LINES[9] and "ligação" not in LINES[10] + LINES[11],
     "Sl 22:31 → Jo 19:30 não é chamado de ligação (não é um par da base)")
need("perfur" not in " ".join(LINES), "Sl 22:16 (“perfuraram”) fica fora: leitura hebraica disputada")
need(D["first"]["votes"] == S["first_line"]["votes"] and [p["votes"] for p in D["pairs"]] == [p["votes"] for p in S["pairs"]]
     and D["psalm"] == S["psalm22"] and D["last"]["hebrew"] == S["hebrew"]["last_word"], "data.json = stats.json")
for p in D["pairs"]:
    full_ps, full_nt = S["blivre"][p["ps"]], S["blivre"][p["nt"]]
    need(all(f in full_ps for f in p["psText"].strip("…").split(" … ")) and all(f in full_nt for f in p["ntText"].strip("…").split(" … ")),
         f"{p['ps_pt']} / {p['nt_pt']}: o texto na tela é trecho literal da BLIVRE")
    need(all(f.lower() in full_ps.lower() for f in p["psLit"]) and all(f.lower() in full_nt.lower() for f in p["ntLit"]),
         f"{p['ps_pt']} / {p['nt_pt']}: o que acende é texto literal")
tsx = (ROOT / "motion/src/Main.tsx").read_text()
text_nodes = [t for t in re.findall(r">([^<>{}]*\d[^<>{}]*)<", tsx) if not re.search(r"[=;()?]|[a-z]\.[a-z]", t)]
strings = re.findall(r'(?:text|label)="([^"]*\d[^"]*)"', tsx)


def numbers(t):
    t = re.sub(r"\b\d+:\d+\b", "", t)                                    # verse references are not data numbers
    t = re.sub(r"SALMO 22\b|Mateus 27 · João 19|CC BY 4\.0", "", t)
    return set(re.findall(r"\d+", t))


bad = [t.strip() for t in text_nodes + strings if t.strip() and numbers(t)]
need(not bad, f"Main.tsx: nenhum número digitado na tela {bad if bad else ''}")
need(not N.get("provisional") and not D.get("provisional") and len(N["lines"]) == len(LINES) - 1,
     "narr.json é a narração real (não a linha do tempo de teste)")
for L in N["lines"]:
    if L["text"] != LINES[L["i"]]:
        need(False, f"narr.json linha {L['i']} = script.py")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
