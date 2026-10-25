#!/usr/bin/env python3
"""Said == shown == data == BLIVRE, and no party on screen, for "A outra marca" (video 8).

1. Every quote the narration reads (script.QUOTES) is literal BLIVRE text of that verse.
2. Every link the film draws is a pair of the base, with the votes the live site lists.
3. Everything the composition shows comes from motion/src/data.json (no digits typed in Main.tsx); the verse texts and
   the lit fragments on screen are literal BLIVRE.
4. Neutrality: no party, candidate or ideological label in the narration, data.json or Main.tsx, and no party colours
   (red, green) in the palette. The film is about the text, on the day of the run-off.
5. The narration timeline used by the film is the real one.

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
tsx = (ROOT / "motion/src/Main.tsx").read_text()
ok = True


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


def unbr(s):
    return s.replace("[", "").replace("]", "").lower()


for i, (ref, frags) in QUOTES.items():
    for f in frags:
        need(unbr(f) in unbr(LINES[i]) and f.lower() in S["blivre"][ref].lower(), f"linha {i}: “{unbr(f)}” = BLIVRE {ref}")
need([(p["a"], p["b"]) for p in S["pairs"]] == [tuple(x) for x in PAIRS], "as ligações do filme são as de script.PAIRS")
need(all(p["votes"] > 0 for p in S["pairs"]) and S["site"]["all_votes_match"], "cada ligação existe na base e os votos batem com o site")
need([p["votes"] for p in D["pairs"]] == [p["votes"] for p in S["pairs"]], "data.json = stats.json (votos)")
for k, v in D["verses"].items():
    full = S["blivre"][k.replace("_", ".")]
    need(all(part in full for part in v["text"].strip("…").split(" … ")), f"{v['ref']}: o texto na tela é trecho literal da BLIVRE")
    need(all(f.lower() in full.lower() for f in v["lit"]), f"{v['ref']}: o que acende é texto literal")
need("estas palavras" in S["blivre"]["Deut.6.6"].lower(), "“as palavras de Deus” (linha 6): Dt 6:8 ata “estas palavras” de Dt 6:6")
need(D["roll"] == [int(PAIRS[0][0].split(".")[1]), int(PAIRS[1][1].split(".")[1])], "o contador da linha 11 vai do capítulo 13 ao 22 (dados)")

# neutrality
ACR = re.compile(r"\b(PT|PL|PSD|PSDB|MDB|PSOL|PSB|PDT|PP|União Brasil|Republicanos)\b")          # case-sensitive
NAMES = re.compile(r"lula|bolsonar|flávio|petista|esquerda|comunis|fascis|candidat|partido|direitista", re.I)


def party(s):
    return [m.group(0) for m in ACR.finditer(s)] + [m.group(0) for m in NAMES.finditer(s)]


said = " ".join(LINES)
need(not party(said), f"narração: nenhum partido, candidato ou rótulo ideológico {party(said) or ''}")
shown = json.dumps({k: v for k, v in D.items() if k != "site"}, ensure_ascii=False) + re.sub(r"//.*|/\*[\s\S]*?\*/", "", tsx)
need(not party(shown), f"tela: nenhum partido ou candidato {party(shown) or ''}")
code = re.sub(r"//.*|/\*[\s\S]*?\*/", "", tsx)                         # comments may name what is avoided
cols = [c.lower() for c in re.findall(r"#[0-9A-Fa-f]{6}\b", code)]


def partyish(c):
    r, g, b = int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16)
    return (r > 150 and g < 90 and b < 90) or (g > 120 and r < 90 and b < 110)        # red or green


need(not [c for c in cols if partyish(c)] and not re.search(r"\b(red|green)\b", code), "paleta sem vermelho nem verde (cores de partido)")

text_nodes = [t for t in re.findall(r">([^<>{}]*\d[^<>{}]*)<", tsx) if not re.search(r"[=;()?]|[a-z]\.[a-z]", t)]
strings = re.findall(r'(?:text|label)="([^"]*\d[^"]*)"', tsx)
bad = [t.strip() for t in text_nodes + strings if t.strip() and re.search(r"\d", t)]
need(not bad, f"Main.tsx: nenhum número digitado na tela {bad if bad else ''}")
need(not N.get("provisional") and not D.get("provisional") and len(N["lines"]) == len(LINES) - 1,
     "narr.json é a narração real (não a linha do tempo de teste)")
for L in N["lines"]:
    if L["text"] != LINES[L["i"]]:
        need(False, f"narr.json linha {L['i']} = script.py")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
