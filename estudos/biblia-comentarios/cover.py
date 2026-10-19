#!/usr/bin/env python3
"""Reels cover (1080x1920; the profile grid shows the centred 1080x1440, y 240..1680): the 19 requested verses with all
their arcs over the dimmed dome, the hook as title.  python3 cover.py -> renders/capa-versiculos-de-voces.jpg"""
import cv2
import film as F

fr = F.BG.copy()
cam = F.Cam(1.10, 0.53, 0.0, 540, 1330)
fr += F.warp_dome(F.FULL, cam) * 0.20
F.draw_bars(fr, cam, op=0.8, hscale=0.9)
F.all_arcs(fr, 9.0, cam, 1.35)
for k in range(F.NI):
    F.glow_point(fr, float(cam.X(F.IT[k]["x"])), float(cam.Y(0)), 0.6, 9)
l1 = F.text_layer(["OS VERSÍCULOS", "DE VOCÊS"], F.font("grot", 112, 700), track=-0.02,
                  spans=[[("OS VERSÍCULOS", (255, 255, 255))], [("DE VOCÊS", (255, 214, 140))]])
F.titled(fr, l1, 540, 440, 1.0)
l2 = F.text_layer([f"{F.NI} mapas pedidos nos comentários"], F.font("serifi", 58, 500), color=(255, 214, 140))
F.titled(fr, l2, 540, 612, 1.0)
fr *= F.VIGN
img = F.to8(fr)
cv2.imwrite(str(F.ROOT / "renders/capa-versiculos-de-voces.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("cover ok")
