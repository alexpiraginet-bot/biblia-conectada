#!/usr/bin/env python3
"""Reels cover (1080x1920; the profile grid shows the centred 1080x1440, y 240..1680): the full dome, the hook as title,
the number as the promise.  python3 cover.py -> renders/capa-biblia-conectada.jpg"""
import numpy as np, cv2
import film as F

fr = F.BG.copy()
cam = F.Cam(1.24, 0.5, 0.0, 540, 1330)
fr += F.warp_dome(F.FULL, cam) * 1.15
F.draw_bars(fr, cam, op=0.9, hscale=0.9)
F.star_point(fr, float(cam.X(F.X96)), float(cam.Y(0)), 1.6, 18, rays=0.55, rot=0.0)
l1 = F.text_layer(["ISSO NÃO É", "UM ARCO-ÍRIS."], F.font("grot", 112, 700), track=-0.02)
F.titled(fr, l1, 540, 430, 1.0)
l2 = F.text_layer(["É a Bíblia inteira: 344.799 ligações"], F.font("serifi", 58, 500), color=(255, 214, 140))
F.titled(fr, l2, 540, 612, 1.0)
l3 = F.text_layer(["entre versículos"], F.font("serifi", 58, 500), color=(255, 214, 140))
F.titled(fr, l3, 540, 672, 1.0)
fr *= F.VIGN
img = F.to8(fr)
cv2.imwrite(str(F.ROOT / "renders/capa-biblia-conectada.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("cover ok")
