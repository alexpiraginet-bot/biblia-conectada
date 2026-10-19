#!/usr/bin/env python3
"""Checks that what is SAID matches what is SHOWN and what the data says:
  - every number spoken in the script (sent to the TTS) == the number computed in data/stats.json
  - what Whisper heard in the take actually used contains those numbers (as digits or words)
  - the two quotes spoken == BLIVRE, and the quotes on screen (film.Q314/Q316) == BLIVRE
  - every number on screen comes from data/stats.json
  python3 -I tools/check.py"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "tools"))
from script import LINES  # noqa: E402
from takes import norm  # noqa: E402

S = json.load(open(ROOT / "data/stats.json"))
NARR = json.load(open(ROOT / "renders/.film/narr.json"))
TK = json.load(open(ROOT / "source/narr/takes.json"))
LN = {L["i"]: L for L in NARR["lines"]}
CENT = {8: "oitocentos"}


def words(n):
    if n >= 100: return f"{CENT[n // 100]} e " + words(n % 100)
    return {62: "sessenta e dois", 21: "vinte e um", 16: "dezesseis", 14: "catorze", 3: "três"}[n]


def has(text, phrase): return " ".join(norm(phrase)) in " ".join(norm(text))


def heard(li): return TK["takes"][LN[li]["take"]]["lines"][li]["heard"]


chk = []
# spoken numbers <-> data
chk.append(("862 capítulos (L6) = cap. João 3 − cap. Números 21",
            S["chapters_back"] == S["chapter_index"]["João 3"] - S["chapter_index"]["Números 21"] == 862
            and has(LINES[6], words(862)) and has(heard(6), "862")))
chk.append(("Números 21 (L7) = livro/capítulo do parceiro mais votado de João 3:14",
            S["partners"]["John.3.14"][0]["ref"].startswith("Números 21:") and has(LINES[7], "Números " + words(21))
            and has(heard(7), "números 21")))
for li, v in [(3, 16), (5, 14), (16, 16)]:
    chk.append((f"João 3:{v} (L{li})", has(LINES[li], f"João {words(3)}, {words(v)}") and has(heard(li), f"joão 3 {v}")))
# quotes <-> BLIVRE
b314, b316 = S["blivre"]["JOH 3:14"], S["blivre"]["JOH 3:16"]
chk.append(("L12 = BLIVRE João 3:14", LINES[12].rstrip(".") == b314.rstrip(",")))
chk.append(("L17 = BLIVRE João 3:16 (1ª oração)", b316.startswith(LINES[17].rstrip("."))))
chk.append(("L10 'olhava… vivia' = Números 21:9 (BLIVRE)", "olhava à serpente de bronze, e vivia" in S["blivre"]["NUM 21:9"]))
chk.append(("L15 'quem crê nele… vida eterna' = João 3:15 (BLIVRE)",
            "todo aquele que nele crer" in S["blivre"]["JOH 3:15"] and "vida eterna" in S["blivre"]["JOH 3:15"]))
chk.append(("L13 'levantado… numa cruz' ↔ João 12:32–33 (BLIVRE)",
            "quando for levantado" in S["blivre"]["JOH 12:32"] and "de que morte" in S["blivre"]["JOH 12:33"]))
import film as F  # noqa: E402
chk.append(("tela: citação 3:14 = BLIVRE", " ".join(F.Q314).rstrip(",") == b314.rstrip(",")))
chk.append(("tela: citação 3:16 = BLIVRE", b316.startswith(" ".join(F.Q316).rstrip("…"))))
chk.append(("tela: 80 / 34 / 862 / 301.584 vêm de stats.json",
            (F.N16, F.N14, F.N_BACK) == (S["links"]["John.3.16"], S["links"]["John.3.14"], S["chapters_back"]) and S["n_pairs"] == 301584))
ok = True
for name, good in chk:
    ok &= bool(good); print(("OK  " if good else "ERR ") + name)
print("ALL OK" if ok else "MISMATCH")
sys.exit(0 if ok else 1)
