#!/usr/bin/env python3
"""Reels cover (1080x1920; the profile grid shows the centred 1080x1440, y 240..1680): the hook of the film — the whole
dome, the one gold arc from John 3 back to Numbers 21, the bronze serpent and the cross at its two ends.
  python3 cover.py -> renders/capa-antes-de-joao-316.jpg"""
import cv2
import film as F

fr = F.BG.copy()
cam = F.Cam(1.14, 0.5, 0.0, 540, 1330)
fr += F.warp_dome(F.FULL, cam) * 0.55
F.draw_bars(fr, cam, op=0.62, hscale=0.9)
F.gold_arc(fr, cam, 1.0, 1.1)
yb = float(cam.Y(0)); xn, xj = float(cam.X(F.XN)), float(cam.X(F.XJ))
F.icon(fr, xn, yb - 2, 260, 1.0, 1.0, 0.0, 1.0, lw=3)
F.icon(fr, xj, yb - 2, 260, 1.0, 0.0, 1.0, 1.0, lw=3)
F.star_point(fr, xj, yb, 1.0, 12, rays=0.3)
F.glow_point(fr, xn, yb, 0.8, 9)
l1 = F.tl(["ESSE ARCO LIGA", "JESUS A UMA", "SERPENTE."], 108, colors=[(255, 255, 255), (255, 255, 255), F.GOLDT])
F.titled(fr, l1, 540, 470, 1.0)
l2 = F.text_layer(["antes de João 3:16"], F.font("serifi", 62, 500), color=F.CREAM)
F.titled(fr, l2, 540, 752, 1.0)
fr *= F.VIGN
img = F.to8(fr)
cv2.imwrite(str(F.ROOT / "renders/capa-antes-de-joao-316.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("cover ok")
