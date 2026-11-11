#!/usr/bin/env python3
"""Captions of the reels of "Grand Testament Adventure", written from data/passagens.json (made by tools/check.py).

Built to be opened and answered (Alex, 11/11 10:01: "legenda viral"): the series' question alone on the first line (it
fits before the "mais" of Instagram), the mission as a checklist, the literal BLIVRE line, one question tied to the
passage, share and save lines, and the credits the sources require.

  python3 -I tools/legenda.py            -> LEGENDAS.md (every episode that has a resumo)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.load(open(ROOT / "data/passagens.json", encoding="utf-8"))
P = {p["id"]: p for p in D["passagens"]}
GANCHO = "E se existisse um jogo com as missões da vida de Jesus? 🎮"
CRED = ("Recriação feita com IA: é um “e se”, não um jogo que existe · Texto: Bíblia Livre (CC BY 4.0 BR) · Lugares do mapa: OpenBible.info "
        "(CC BY 4.0) · Relevo: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen")
TAGS = "#jesus #biblia #evangelho #gameplay #games #mundoaberto #cristao #fe #jovemcristao #esefosseumjogo"
out = ["# Legendas: Grand Testament Adventure", "",
       "Geradas por `tools/legenda.py` a partir de `data/passagens.json`. Toda fala entre aspas é texto literal da Bíblia Livre e todo número sai do "
       "versículo (`tools/check.py`).", "", f"A primeira linha tem {len(GANCHO)} caracteres.", ""]
n = 0
for eid, e in D["episodios"].items():
    if not e.get("resumo"): continue
    p = P[eid]; n += 1
    falas = [m["fala"] for m in e["missoes"] if m["fala"]]
    cnt = e.get("contador")
    body = [GANCHO, "", f"MISSÃO: {p['titulo'].upper()} ({p['ref_pt']})", ""]
    body += [f"✅ {m['objetivo']}" for m in e["missoes"]]
    body += ["", e["resumo"], ""]
    body += [f"👇 {e['pergunta']} Responde aqui.", "🎯 Qual passagem tem que virar a próxima missão? Comenta a referência.",
             "🔁 Manda pra quem zeraria esse jogo", f"💾 Salva e lê {p['ref_pt'].split(':')[0]} hoje", "", CRED, "", TAGS]
    out += [f"## {p['titulo']} ({p['ref_pt']})", "", "```", *body, "```", ""]
(ROOT / "LEGENDAS.md").write_text("\n".join(out), encoding="utf-8")
print("LEGENDAS.md:", n, "episódio(s); primeira linha com", len(GANCHO), "caracteres")
