#!/usr/bin/env python3
"""Reels cover of the céu version (1080x1920; the profile grid shows the centred 1080x1440, y 240..1680): the heaven,
the rainbow dome, the hook as title and the number as the promise, João 3:16 as the light on the base.
  python3 cover.py -> renders/capa-biblia-conectada-ceu.jpg"""
import numpy as np, cv2
import film as F

fr = F.heaven(2.0)
cam = F.Cam(1.24, 0.5, 0.0, 540, 1330)
F.dome_over(fr, F.FULL, cam, 1.0)
F.draw_bars(fr, cam, op=0.9, hscale=0.9)
F.star_point(fr, float(cam.X(F.X316)), float(cam.Y(0)), 1.2, 16, rays=0.45, rot=0.0)
l1 = F.text_layer(["ISSO NÃO É", "UM ARCO-ÍRIS."], F.font("grot", 112, 700), track=-0.02)
F.titled(fr, l1, 540, 430, 1.0)
l2 = F.text_layer([f"É a Bíblia inteira: {F.fmt(F.N_ROWS)} ligações"], F.font("serifi", 58, 500), color=(255, 214, 140))
F.titled(fr, l2, 540, 612, 1.0)
l3 = F.text_layer(["entre versículos"], F.font("serifi", 58, 500), color=(255, 214, 140))
F.titled(fr, l3, 540, 672, 1.0)
F.twinkles(fr, 2.0)
fr = fr * (1 - F.EDGE) + F.ROYAL * F.EDGE
img = F.to8(fr)
cv2.imwrite(str(F.ROOT / "renders/capa-biblia-conectada-ceu.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("cover ok")
