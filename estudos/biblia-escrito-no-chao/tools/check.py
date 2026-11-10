#!/usr/bin/env python3
"""Said == shown == data == BLIVRE, for "Escrito no chão" (video 11).

1. Every quote the narration reads (script.QUOTES, lines of the cut) is literal BLIVRE text of that verse.
2. Every line of Scripture on screen (the serif lines of renders/.film/plan.json) is a literal fragment of the verse
   named by the chip of its block.
3. The only numbers on screen are the base's (30 ligações of John 8:6, 55 votos of its top partner, Jeremiah 17:13) and
   the "≈ 600 anos", which the script declares as a general historical statement, not a number of the base.
4. "Jesus só escreve uma vez": in the four Gospels he is the one who writes only in John 8:6 and 8:8 (one scene).
5. The narration timeline is the real one: each line said is the script's (minus the heads narration.py drops).
6. The edit handed to Higgsedit (edit/edit.jsx) is the plan: same shots, same lines, same times.

  python3 -I tools/check.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from script import LINES, QUOTES  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
P = json.load(open(ROOT / "renders/.film/plan.json"))
N = json.load(open(ROOT / "renders/.film/narr.json"))
ok = True
BOOK = {"JOÃO": "John", "JEREMIAS": "Jer"}
flat = lambda s: re.sub(r"\s+", " ", re.sub(r"[“”\"]", "", s)).strip().lower()


def need(cond, msg):
    global ok
    print(("OK   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


said = {L["i"]: L["text"] for L in N["lines"]}; src = {L["i"]: L["line"] for L in N["lines"]}      # id on the film -> script line
for i, text in said.items():
    need(text[1:] in LINES[src[i]], f"fala {i}: é a do roteiro (linha {src[i]})")
    if src[i] in QUOTES:
        ref, frags = QUOTES[src[i]]
        for f in frags:
            need(flat(f) in flat(S["blivre"][ref]) and re.sub(r"[,;.]", "", flat(f)) in re.sub(r"[,;.]", "", flat(text)), f"linha {i}: “{f}” = BLIVRE {ref}")
need([L["i"] for L in N["lines"]] == [160, 1, 2, 3, 6, 9, 10, 13, 15, 16, 17], "o corte: abertura (linha 16 sem a última palavra), linhas 1, 2, 3, 6, 9, 10, 13, 15, e o fecho (16 e 17)")
need(said[160] == "Hoje a pedra é um comentário." and said[16] == "Solta." and said[160] + " " + said[16] == LINES[16],
     "a abertura e o fecho são a linha 16 do roteiro, partida em duas: “Hoje a pedra é um comentário.” … “Solta.”")
rw = next(x for x in P["shots"] if x["id"] == "rw")
need(P["shots"][0]["id"] == "c01" and P["shots"][1]["id"] == "rw" and P["shots"][2]["id"] == "s01" and P["rewind"][0][0] == "c01" and P["rewind"][-1] == ["s01", 0.0]
     and 0.7 <= rw["t1"] - rw["t0"] <= 1.1, "abertura fria → rebobinada (das imagens do próprio filme, da última à primeira) → gancho")

for b in P["blocks"]:
    serif = [l["text"] for l in b["lines"] if l["face"] == "serif"]
    if not serif: continue
    chip = next((l["text"] for l in b["lines"] if l["face"] == "mono" and re.match(r"(JOÃO|JEREMIAS) \d+:\d+", l["text"])), None)
    need(chip is not None, f"{b['id']}: o trecho bíblico na tela tem a referência")
    m = re.match(r"(JOÃO|JEREMIAS) (\d+):(\d+)", chip); ref = f"{BOOK[m[1]]}.{m[2]}.{m[3]}"
    need(flat(" ".join(serif)) in flat(S["blivre"][ref]), f"{b['id']}: “{' '.join(serif)}” é texto literal da BLIVRE, {chip.split(' · ')[0]}")

texts = [l["text"] for b in P["blocks"] for l in b["lines"]]
nums = set()
for t in texts:
    t = re.sub(r"\b\d+:\d+(–\d+)?\b|CC BY 4\.0|P5\.BRUSH", "", t)
    nums |= set(re.findall(r"\d+", t))
need(nums == {str(S["john_8_6"]["partners"]), str(S["pairs"][0]["votes"]), "600"}, f"números na tela: {sorted(nums)} = ligações de João 8:6, votos do par, e o ≈ 600 anos")
need(S["john_8_6"]["top"][0] == ["Jeremias 17:13", S["pairs"][0]["votes"]] and S["john_8_6"]["top"][1][1] < S["pairs"][0]["votes"],
     f"“a ligação mais votada” de João 8:6 é Jeremias 17:13 ({S['pairs'][0]['votes']} votos; a 2ª tem {S['john_8_6']['top'][1][1]})")
need(P["numbers"] == {"john_8_6_partners": S["john_8_6"]["partners"], "votes_jo86_jr1713": S["pairs"][0]["votes"]}, "plan.json usa os números de data/stats.json")
need(any("≈ 600" in t for t in texts) and "seiscentos anos antes" in LINES[9], "os 600 anos aparecem como aproximação (≈), e o roteiro os declara como dado histórico geral")
need(S["jesus_writes"] == ["João 8:6", "João 8:8"] and S["gospel_verses_with_escrever"] == 17,
     "nos quatro evangelhos, Jesus é quem escreve só em João 8:6 e 8:8 (uma cena; 17 versículos com “escrev”)")
need(not any(re.search(r"sorteio|concorra", t, re.I) for t in texts), "nada de sorteio na tela")

jsx = (ROOT / "edit/edit.jsx").read_text()
E = json.loads(jsx[jsx.index("const PLAN = ") + 13:jsx.index(";\nconst SHADOW")])
need([s["id"] for s in E["shots"]] == [s["id"] for s in P["shots"]] and abs(E["dur"] - P["frames"] / P["fps"]) < 1e-9
     and all(abs(a["at"] - b["f0"] / P["fps"]) < 1e-9 and abs(a["dur"] - b["frames"] / P["fps"]) < 1e-9 for a, b in zip(E["shots"], P["shots"])),
     f"edit.jsx: os {len(P['shots'])} planos do plano, cortados no quadro ({P['frames']} quadros)")
need([[l["text"] for l in b["lines"]] for b in E["blocks"]] == [[l["text"] for l in b["lines"]] for b in P["blocks"]], "edit.jsx: as mesmas linhas de texto do plano")
need(E["tag"]["text"] == "ILUSTRAÇÃO" and "name: \"tag\"" in jsx and "at: 0, dur: PLAN.dur" in jsx, "a marca ILUSTRAÇÃO fica na tela o filme inteiro (regra da série para cena ilustrada)")
fps = P["fps"]
need(all(b["at"] * fps % 1 < 1e-6 or 1 - b["at"] * fps % 1 < 1e-6 for b in E["blocks"]) and all((b["at"] + b["dur"]) * fps < round((b["at"] + b["dur"]) * fps + 0.4) for b in E["blocks"]),
     "edit.jsx: cada bloco de texto começa num quadro e termina antes do quadro do corte seguinte")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
