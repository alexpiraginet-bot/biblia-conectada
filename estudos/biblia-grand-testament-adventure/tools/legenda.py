#!/usr/bin/env python3
"""Captions of the reels of "Grand Testament Adventure", written from data/passagens.json (made by tools/check.py):
the opening line, the mission, the story with the literal BLIVRE line, the credits the sources require.

  python3 -I tools/legenda.py            -> LEGENDAS.md (every episode that has a resumo)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.load(open(ROOT / "data/passagens.json", encoding="utf-8"))
P = {p["id"]: p for p in D["passagens"]}
CRED = ("Recriação feita com IA: é um “e se”, não um jogo que existe · Texto: Bíblia Livre (CC BY 4.0 BR) · Lugares do mapa: OpenBible.info "
        "(CC BY 4.0) · Relevo: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Mapzen")
TAGS = "#jesus #biblia #evangelho #discipulos #fe #cristao #palavradedeus #gameplay #mundoaberto #esefosseumjogo"
out = ["# Legendas: Grand Testament Adventure", "",
       "Geradas por `tools/legenda.py` a partir de `data/passagens.json`. Toda fala entre aspas é texto literal da Bíblia Livre (`tools/check.py`).", ""]
for eid, e in D["episodios"].items():
    if not e.get("resumo"): continue
    p = P[eid]
    out += [f"## {p['titulo']} ({p['ref_pt']})", "", "```", "E se existisse um jogo com as missões da vida de Jesus?", "",
            f"Missão: {p['titulo']} ({p['ref_pt']})", "", e["resumo"], "",
            "💬 Qual missão você quer ver na próxima?", "📤 Manda pra quem jogaria esse jogo", f"💾 Salva e lê {p['ref_pt'].split(':')[0]} hoje", "",
            CRED, "", TAGS, "```", ""]
(ROOT / "LEGENDAS.md").write_text("\n".join(out), encoding="utf-8")
print("LEGENDAS.md:", sum(1 for e in D["episodios"].values() if e.get("resumo")), "episódio(s)")
