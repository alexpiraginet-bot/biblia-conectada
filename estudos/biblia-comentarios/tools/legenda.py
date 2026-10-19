#!/usr/bin/env python3
"""Write LEGENDA.md (Instagram caption) from data/stats.json, so every number and @ in it comes from the data.
  python3 -I tools/legenda.py"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = json.load(open(ROOT / "data/stats.json"))
ITEMS = S["items"]


def fmt(n): return f"{n:,}".replace(",", ".")


rows = []
for it in ITEMS:
    hs = " e ".join("@" + h for h in it["handles"])
    extra = ""
    if it["label"] == S["most_connected"]["label"]: extra = " ⭐ o mais conectado de vocês"
    if len(it["handles"]) > 1: extra = " (pedido duas vezes)"
    rows.append(f"{it['label']} — {it['n']} ligações · {hs}{extra}")
links = "; ".join(f"{x['a']} ↔ {x['b']}" for x in S["inter_links"])
mentions = sum(len(it["handles"]) for it in ITEMS)
cap = f"""# Legenda — "Os versículos de vocês" (19/10/2026)

Vocês pediram, e cada versículo ganhou o próprio mapa 📖✨

Os {len(ITEMS)} que vocês mandaram, na ordem da Bíblia, com quantos versículos se ligam a cada um:

""" + "\n".join(rows) + f"""

Juntos, eles se ligam a {fmt(S['union_any'])} versículos, em {S['union_books']} dos 66 livros. E três de vocês já estavam ligados entre si: {links}.

Respondendo às perguntas:
• "Como ter acesso a esse gráfico?" / "Tem no GitHub?" Tem! O projeto é aberto: github.com/alexpiraginet-bot/biblia-conectada (dados, código e os vídeos).
• "Os apócrifos tão aí?" Não: a base de referências cruzadas cobre os 66 livros do cânon protestante.
• "Isaías, a mini Bíblia": Isaías tem 66 capítulos, e a Bíblia, 66 livros 😉

👇 Comenta o teu versículo (livro + capítulo + versículo). O próximo mapa pode ser o teu.

Dados: OpenBible.info (CC BY), base derivada do Treasury of Scripture Knowledge · "ligações" = versículos diferentes ligados a ele na base · narração com voz sintética · visualização e trilha originais.

#biblia #palavradedeus #estudobiblico #referenciascruzadas #versiculododia #curiosidadesbiblicas #fe #jesus #visualizacaodedados

---
Notas para postar:
- A legenda menciona {mentions} perfis (cada @ uma vez). Se o Instagram recusar por excesso de menções, tira os @ da legenda: eles já aparecem no vídeo.
- Comentário fixado sugerido: "Manda o teu no formato livro + capítulo + versículo (ex.: Salmos 23:1). Os próximos ganham o mapa no próximo vídeo 👇"
- Voz sintética: ao postar, liga o rótulo de IA do Instagram ("Rótulo de IA" nas configurações avançadas).
"""
(ROOT / "LEGENDA.md").write_text(cap, encoding="utf-8")
print(cap)
