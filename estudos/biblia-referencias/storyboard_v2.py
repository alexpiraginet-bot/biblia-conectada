#!/usr/bin/env python3
"""Storyboard stills for a second "Bíblia, conectada" film: five key frames drawn with the Ep. 1 engine (real arcs
from data/xref.npz), so what Alex sees is what the render would be. Verse texts: Bíblia Livre (BLIVRE, CC BY 4.0 BR).

  python3 storyboard_v2.py   -> renders/storyboard-v2/*.jpg + renders/storyboard-v2/sheet.jpg
"""
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.argv = [sys.argv[0]]                  # film.py must not see a --still flag
import film as F                          # noqa: E402  (builds the full dome once, ~1 min)
import arcs as A                          # noqa: E402

W, H = F.W, F.H
OUT = F.ROOT / "renders/storyboard-v2"; OUT.mkdir(parents=True, exist_ok=True)
GOLD, AMBER, WHITE, GREY = (255, 214, 140), (255, 196, 110), (255, 255, 255), (170, 170, 180)
VERSE = {
    "Gen.2.9": "“…também a árvore da vida\nem meio do jardim…”",
    "Rev.22.2": "“…e de um lado e do outro do rio,\nestava a árvore da vida…”",
    "Isa.9.6": "“Porque um menino nos nasceu,\num filho nos foi dado…”",
    "Isa.41.10": "“Não temas,\nporque eu estou contigo;\nnão te assombres,\nporque eu sou teu Deus.”",
    "Phil.4.13": "“Posso todas as coisas\nem Cristo\nque me fortalece.”",
}


def base():
    return F.BG.copy()


def text(fr, s, kind, size, cx, cy, color=WHITE, wt=None, track=0.0, glow=0.0, op=1.0, lh=1.1, scale=1.0):
    lay = F.text_layer(s.split("\n"), F.font(kind, size, wt), color=color, track=track, glow=glow, lh=lh)
    F.shadow(fr, lay, cx, cy, op * 0.9, scale, blur=14); F.paste(fr, lay, cx, cy, op, scale)


def finish(fr, name, grain=True):
    fr = fr * F.VIGN
    if grain:
        fr = fr + cv2.resize(F.GRAIN[0], (W, H), interpolation=cv2.INTER_NEAREST)[..., None] * 0.008
    Image.fromarray(F.to8(fr)).save(OUT / f"{name}.jpg", quality=93)
    print(OUT / f"{name}.jpg")


# ---- 1 · hook (0-3 s): one verse on black, a single thread of light crosses the whole Bible to the last page
def f1():
    fr = base()
    cam = F.Cam(1.0, 0.5, 0.0, 540, 1180)
    poly = F.arc_poly(F.X_GN29, F.X_AP222, cam, 1.0, 400)
    F.draw_arcs(fr, [poly], np.array([1.0, 0.86, 0.55], np.float32), width=3, core=1.0, glow=1.6)
    for x in (F.X_GN29, F.X_AP222):
        F.star_point(fr, float(cam.X(x)), float(cam.Y(0)), 1.2, 14)
    text(fr, "GÊNESIS 2:9", "mono", 34, 170, 1245, GOLD, track=0.08)
    text(fr, VERSE["Gen.2.9"], "serifi", 44, 230, 1330, (255, 236, 200), 500)
    text(fr, "APOCALIPSE 22:2", "mono", 34, 905, 1245, GOLD, track=0.08)
    text(fr, VERSE["Rev.22.2"], "serifi", 44, 820, 1330, (255, 236, 200), 500)
    text(fr, "A PRIMEIRA PÁGINA", "grot", 112, 540, 430, WHITE, 700, track=-0.02, glow=4)
    text(fr, "TOCA A ÚLTIMA.", "grot", 112, 540, 545, GOLD, 700, track=-0.02, glow=6)
    text(fr, "191 ligações entre Gênesis e Apocalipse", "serifi", 50, 540, 680, (230, 220, 200), 500)
    finish(fr, "01-gancho")


# ---- 2 · the pull-back (8-15 s): the whole dome seen as a cathedral, the two first threads still gold inside it
def f2():
    fr = base()
    cam = F.Cam(1.55, 0.5, 0.12, 540, 1500)
    fr += F.warp_dome(F.FULL, cam) * 1.0
    F.draw_bars(fr, cam, op=0.5)
    poly = F.arc_poly(F.X_GN29, F.X_AP222, cam, 1.0, 400)
    F.draw_arcs(fr, [poly], np.array([1.0, 0.86, 0.55], np.float32), width=2, core=0.8, glow=0.8)
    text(fr, "344.799", "grot", 190, 540, 380, WHITE, 700, track=-0.03, glow=8)
    text(fr, "LIGAÇÕES ENTRE VERSÍCULOS", "mono", 36, 540, 505, GOLD, track=0.14)
    text(fr, "cada fio é uma referência cruzada real", "serifi", 50, 540, 590, (230, 220, 200), 500)
    finish(fr, "02-catedral")


# ---- 3 · the star (20-28 s): of all 31,102 verses, the most connected one is a birth announcement
def f3():
    fr = base()
    cam = F.Cam(1.45, F.X96, 0.0, 540, 1300)
    fr += F.warp_dome(F.FULL, cam) * 0.09
    F.draw_bars(fr, cam, op=0.45)
    polys = [F.arc_poly(x, F.X96, cam, 1.0) for x in F.XP96]
    F.draw_arcs(fr, polys, F.GOLD * 0.75, width=1, glow=0.9)
    sx, sy = float(cam.X(F.X96)), float(cam.Y(0))
    F.star_point(fr, sx, sy, 2.3, 24, rays=0.95, rot=0.03)
    text(fr, "O VERSÍCULO MAIS CONECTADO DOS 31.102", "mono", 34, 540, 270, GOLD, track=0.1)
    text(fr, "ISAÍAS 9:6", "grot", 130, 540, 390, WHITE, 700, track=-0.01, glow=6)
    text(fr, VERSE["Isa.9.6"], "serifi", 66, 540, 540, (255, 226, 170), 500, lh=1.05)
    text(fr, "212 versículos apontam pra ele", "mono", 34, 540, 650, WHITE, track=0.04)
    finish(fr, "03-estrela")


# ---- 4 · the strongest link (30-38 s): a promise for the afraid, and the answer, 1,477 votes
def f4():
    fr = base()
    cam = F.Cam(2.0, (F.X_IS4110 + F.X_FP413) / 2, 0.0, 540, 1120)
    fr += F.warp_dome(F.FULL, cam) * 0.05
    poly = F.arc_poly(F.X_IS4110, F.X_FP413, cam, 1.0, 400)
    F.draw_arcs(fr, [poly], np.array([1.0, 0.86, 0.55], np.float32), width=4, core=1.2, glow=2.0)
    for x in (F.X_IS4110, F.X_FP413):
        F.star_point(fr, float(cam.X(x)), float(cam.Y(0)), 1.4, 16)
    text(fr, "A LIGAÇÃO MAIS FORTE DE TODAS", "mono", 34, 540, 270, GOLD, track=0.1)
    text(fr, "1.477", "grot", 150, 540, 385, WHITE, 700, track=-0.02, glow=6)
    text(fr, "votos, entre 301.584 pares", "serifi", 50, 540, 490, (230, 220, 200), 500)
    xa, xb = float(cam.X(F.X_IS4110)), float(cam.X(F.X_FP413))
    text(fr, "ISAÍAS 41:10", "mono", 32, xa, 1185, GOLD, track=0.08)
    text(fr, VERSE["Isa.41.10"], "serifi", 42, xa, 1300, (255, 236, 200), 500)
    text(fr, "FILIPENSES 4:13", "mono", 32, xb, 1185, GOLD, track=0.08)
    text(fr, VERSE["Phil.4.13"], "serifi", 42, xb, 1280, (255, 236, 200), 500)
    finish(fr, "04-mais-forte")


# ---- 5 · the call (42-48 s): any verse; comment it and I show who it talks to
def f5():
    fr = base()
    cam = F.Cam(1.25, 0.5, 0.0, 540, 1420)
    fr += F.warp_dome(F.FULL, cam) * 0.55
    F.draw_bars(fr, cam, op=0.4)
    text(fr, "COMENTA UM", "grot", 96, 540, 400, WHITE, 700, track=-0.01)
    text(fr, "VERSÍCULO", "grot", 96, 540, 505, GOLD, 700, track=-0.01, glow=4)
    text(fr, "e eu te mostro com quem ele conversa", "serifi", 56, 540, 625, (230, 220, 200), 500)
    text(fr, "DADOS: OPENBIBLE.INFO (CC BY) · 344.799 REFERÊNCIAS CRUZADAS\nTEXTO: BÍBLIA LIVRE (CC BY 4.0 BR)", "mono", 22, 540, 1500, GREY, track=0.02, lh=1.3)
    finish(fr, "05-chamada")


for f in (f1, f2, f3, f4, f5):
    f()
fs = sorted(OUT.glob("0*.jpg"))
tw, th = 432, 768
sheet = Image.new("RGB", (len(fs) * (tw + 10) + 10, th + 20), (8, 8, 10))
for i, p in enumerate(fs):
    sheet.paste(Image.open(p).resize((tw, th), Image.LANCZOS), (10 + i * (tw + 10), 10))
sheet.save(OUT / "sheet.jpg", quality=90); print(OUT / "sheet.jpg")
