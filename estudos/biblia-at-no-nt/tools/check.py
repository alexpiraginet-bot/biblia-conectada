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
from script import LINES, QUOTES  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
D = json.load(open(ROOT / "motion/src/data.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
ok = True


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


ot = {b["pt"]: b for b in S["ot_books"]}
rank = sorted(S["ot_books"], key=lambda b: -b["links"])
# 1. quotes
for i, (ref, frags) in QUOTES.items():
    for f in frags:
        need(f in LINES[i] and f in S["blivre"][ref], f"linha {i}: “{f}” = BLIVRE {ref}")
# 2. what the voice says
need("sessenta e sete mil, duzentas e noventa e três" in LINES[6] and S["ot_nt"] == 67293, "linha 6: 67.293 pares AT↔NT")
need("Mais de oito em cada dez" in LINES[7] and 0.8 < S["nt_verses_linked"] / S["nt_verses"] < 0.9,
     f"linha 7: mais de 8 em 10 versículos do NT ({S['nt_verses_linked']}/{S['nt_verses']})")
need("trinta e nove livros" in LINES[8] and S["ot_books_linked"] == 39, "linha 8: 39 livros do AT, todos ligados")
need("Salmos" in LINES[9] and rank[0]["pt"] == "Salmos" and "Onze mil, quatrocentas e oitenta e quatro" in LINES[9]
     and rank[0]["links"] == 11484, "linha 9: Salmos é o 1º, 11.484")
need("Isaías" in LINES[10] and rank[1]["pt"] == "Isaías", "linha 10: Isaías é o 2º")
need("pelo tamanho" in LINES[11] and "último" in LINES[11] and S["densest_ot"]["pt"] == "Malaquias"
     and S["ot_books"][-1]["pt"] == "Malaquias", "linha 11: por versículo, Malaquias (o último livro do AT) é o 1º")
need("Mateus" in LINES[12] and S["top_nt"][0] == "Mateus", "linha 12: Mateus é o livro do NT mais ligado ao AT")
need(S["literal"]["examples"]["Isa.7.14~Matt.1.23"] is not None and "Isaías sete, catorze" in LINES[14],
     "linha 14: Is 7:14 → Mt 1:23 palavra por palavra no grego (LXX × SBLGNT)")
need(S["literal"]["examples"]["Isa.61.1~Luke.4.18"] is not None and "livro do profeta Isaías" in LINES[15],
     "linhas 15-16: Lc 4:18 repete Is 61:1 palavra por palavra no grego")
need("Cada fio liga um versículo do Antigo a um do Novo" in LINES[3] and S["famous"]["Gen.1.1~John.1.1"] == 724,
     "linhas 3-5: Gn 1:1 ↔ Jo 1:1 é um par da base (724 votos)")
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
need(not N.get("provisional") and not D.get("provisional") and len(N["lines"]) == len(LINES) - 1,
     "narr.json é a narração real (não a linha do tempo de teste)")
for L in N["lines"]:
    if L["text"] != LINES[L["i"]]:
        need(False, f"narr.json linha {L['i']} = script.py")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
