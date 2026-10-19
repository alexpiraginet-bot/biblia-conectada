#!/usr/bin/env python3
"""Reels cover 1080x1920 (the profile grid shows the centred 1080x1440, y 240..1680): Belém under the star (recreation),
the hook as title.   python3 cover.py -> renders/capa-antes-do-natal.jpg"""
from pathlib import Path
import numpy as np, cv2
from fx import *

ROOT = Path(__file__).resolve().parent
src = cv2.cvtColor(cv2.imread(str(ROOT / "source/img/belem-v1.png")), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
h, w = src.shape[:2]
s = max(W / w, H / h)
img = cv2.resize(src, (int(round(w * s)), int(round(h * s))), interpolation=cv2.INTER_AREA)
y0 = (img.shape[0] - H) // 2; x0 = (img.shape[1] - W) // 2
fr = img[y0:y0 + H, x0:x0 + W].copy()
# move the picture's star into the grid crop (y >= 240): remove it and redraw it lower, same place in the sky
yy_, xx_ = np.unravel_index(np.argmax((fr[100:400, 400:900].mean(-1))), (300, 500)); sy, sx = yy_ + 100, xx_ + 400
m = np.zeros((H, W), np.uint8); cv2.circle(m, (int(sx), int(sy)), 16, 255, -1)
fr = cv2.inpaint((fr * 255).astype(np.uint8), m, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
STAR = (float(sx), 300.0)
# film grade (same as the clips) + darker sky for the title
x = np.clip(fr, 0, 1); x = x * x * (3 - 2 * x) * 0.35 + x * 0.65
lum = x.mean(-1, keepdims=True); x = lum + (x - lum) * 0.88
fr = np.clip(x * 0.96, 0, 1).astype(np.float32)
g = np.clip(1 - np.linspace(0, 1, int(H * 0.55)), 0, 1) ** 1.4
fr[:len(g)] *= (1 - 0.45 * g)[:, None, None]
# the golden trail arriving at the village (the film's motif)
pts = np.array([[620, 1930], [600, 1700], [560, 1500], [520, 1330], [470, 1180]], np.float32)
t = np.linspace(0, 1, 120)
curve = np.stack([np.interp(t, np.linspace(0, 1, len(pts)), pts[:, 0]), np.interp(t, np.linspace(0, 1, len(pts)), pts[:, 1])], 1)
glow_lines(fr, [curve], GOLD * 0.9, width=3, core=1.0, glow=0.9, big=0.7)
star_point(fr, 470, 1180, 1.5, 9, rays=0.12, rot=0.3)
# the star, now inside the grid
star_point(fr, STAR[0], STAR[1], 1.1, 5, rays=0.10, rot=0.2)
l0 = text_layer(["700 ANOS ANTES DO NATAL"], font("monob", 42), (255, 214, 140), track=0.08)
l1 = text_layer(["JÁ ESTAVA"], font("grot", 138, 700), (255, 255, 255), track=-0.01)
l2 = text_layer(["ESCRITO"], font("grot", 138, 700), (255, 214, 140), track=-0.01)
l3 = text_layer(["o nome da cidade onde", "Jesus ia nascer"], font("serifi", 60, 500), (255, 236, 200), lh=1.0)
titled(fr, l0, W / 2, 400, 1.0, dark=0.9, blur=12)
titled(fr, l1, W / 2, 520, 1.0, dark=0.95, blur=18)
titled(fr, l2, W / 2, 650, 1.0, dark=0.95, blur=18)
titled(fr, l3, W / 2, 800, 1.0, dark=0.95, blur=14)
out = finish(fr, 3, grain=0.006)
cv2.imwrite(str(ROOT / "renders/capa-antes-do-natal.jpg"), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
print("cover ok")
