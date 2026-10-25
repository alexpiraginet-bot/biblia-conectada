#!/usr/bin/env python3
"""Said == shown == data == BLIVRE, for "O Antigo dentro do Novo" (video 6).

1. Every quote the narration reads (script.QUOTES) is literal BLIVRE text of that verse.
2. Every number and ranking the narration says is the one in data/stats.json.
3. Every number the composition shows is read from motion/src/data.json (no digits typed in Main.tsx outside a short
   allow-list), and data.json matches data/stats.json.
4. The narration timeline used by the film is the real one (not the provisional test timeline).

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import os
from script import LINES, QUOTES, SHORT  # noqa: E402

CUT = os.environ.get("CUT", ""); SUFFIX = "-curto" if CUT == "curto" else ""
USE = SHORT if CUT == "curto" else list(range(1, len(LINES)))

S = json.load(open(ROOT / "data/stats.json"))
D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / f"renders/.film/narr{SUFFIX}.json"))
ok = True


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


ot = {b["pt"]: b for b in S["ot_books"]}
rank = sorted(S["ot_books"], key=lambda b: -b["links"])
# 1. quotes
for i, (ref, frags) in QUOTES.items():
    if i not in USE: continue
    for f in frags:
        need(f in LINES[i] and f.lower() in S["blivre"][ref].lower(), f"linha {i}: “{f}” = BLIVRE {ref}")
# 2. what the voice says
need("Sessenta e sete mil, duzentas e noventa e três" in LINES[6] and S["ot_nt"] == 67293, "linha 6: 67.293 pares AT↔NT")
need("trinta e nove livros" in LINES[7] and "Nenhum ficou de fora" in LINES[7] and S["ot_books_linked"] == 39,
     "linha 7: 39 livros do AT, todos ligados")
need("Salmos" in LINES[8] and rank[0]["pt"] == "Salmos" and "Onze mil, quatrocentas e oitenta e quatro" in LINES[8]
     and rank[0]["links"] == 11484, "linha 8: Salmos é o 1º, 11.484")
need("Isaías" in LINES[9] and rank[1]["pt"] == "Isaías" and "Mateus" in LINES[9] and S["top_nt"][0] == "Mateus",
     "linha 9: Isaías é o 2º do AT; Mateus é o 1º do NT")
need("duzentas e vinte e três" in LINES[11] and S["literal"]["pairs"] == 223,
     "linha 11: 223 pares palavra por palavra no grego (LXX × SBLGNT)")
need(S["literal"]["examples"]["Isa.7.14~Matt.1.23"] is not None and "Eis que a virgem conceberá" in S["blivre"]["Matt.1.23"],
     "linhas 12-13: Is 7:14 → Mt 1:23 é um dos pares literais; Mateus repete a frase")
need(S["literal"]["examples"]["Isa.61.1~Luke.4.18"] is not None and "livro do profeta Isaías" in LINES[14],
     "linhas 14-17: Lc 4:18 repete Is 61:1 palavra por palavra no grego")
need("No princípio" in LINES[4] and "No princípio" in LINES[5] and S["famous"]["Gen.1.1~John.1.1"] == 724,
     "linhas 4-5: Gn 1:1 ↔ Jo 1:1 é um par da base (724 votos)")
need(S["site"]["all_votes_match"], "votos mostrados = páginas do site (source/site/*.html)")
# 3. data.json == stats.json, and Main.tsx has no hand-typed numbers
need(D["otNt"] == S["ot_nt"] and D["ntLinked"] == S["nt_verses_linked"] and D["ntVerses"] == S["nt_verses"]
     and D["literal"]["pairs"] == S["literal"]["pairs"] and D["famous"] == S["famous"]
     and D["psalms"]["links"] == ot["Salmos"]["links"] and D["isaiah"]["links"] == ot["Isaías"]["links"]
     and D["matthew"]["links"] == S["nt_books"][0]["links"] and D["malachi"] == S["densest_ot"], "data.json = stats.json")
need([b["links"] for b in D["layout"]["ot"]] == [b["links"] for b in S["ot_books"]]
     and [b["links"] for b in D["layout"]["nt"]] == [b["links"] for b in S["nt_books"]], "rótulos dos 66 livros = stats.json")
tsx = (ROOT / "motion/src/Main.tsx").read_text()
text_nodes = [t for t in re.findall(r">([^<>{}]*\d[^<>{}]*)<", tsx) if not re.search(r"[=;()?]|[a-z]\.[a-z]", t)]
strings = re.findall(r'(?:text|label)="([^"]*\d[^"]*)"', tsx)
allowed = {"1"}                                    # "1 fio = 1 ligação"


def numbers(t):
    # verse references and "Lucas 4" (the chapter of the scene) are not data numbers
    t = re.sub(r"\b\d+:\d+\b|LUCAS 4(?!:)|CC BY 4\.0", "", t)
    return set(re.findall(r"\d+", t))


bad = [t.strip() for t in text_nodes + strings if t.strip() and not numbers(t) <= allowed]
need(not bad, f"Main.tsx: nenhum número digitado na tela {bad if bad else ''}")
# 4. the real narration
need(not N.get("provisional") and not D.get("provisional") and [L["i"] for L in N["lines"]] == USE and D.get("cut", "") == CUT,
     "narr.json é a narração real (não a linha do tempo de teste)")
for L in N["lines"]:
    if L["text"] != LINES[L["i"]]:
        need(False, f"narr.json linha {L['i']} = script.py")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
