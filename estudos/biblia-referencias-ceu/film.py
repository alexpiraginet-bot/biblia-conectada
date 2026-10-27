#!/usr/bin/env python3
""""A Bíblia, conectada" — versão CÉU. Same film as the viral video 1 (18/10/2026): same narration cuts, same timing, same
camera moves, same organ; a new look and a new climax.

Look: a luminous heaven (an AI plate made on Alex's PC with FLUX.1 [dev] in ComfyUI, assets/ceu-plate.png, brief and
prompt in PROJETO.md) that breathes and follows the camera, twinkling stars, golden arcs alpha-blended over the light
(not added on black), navy ink with white halos for the type, gold accents.
Climax: João 3:16 (80 linked verses in this base, counted below) instead of Isaías 9:6 (212). Every arc is still drawn
from the data: OpenBible.info cross references (CC BY, TSK-based) on the Protestant canon (66 books, 1,189 chapters,
31,102 verses). The 2007 chart (Harrison & Römhild, 63,779) is only cited, never shown.

  python3 film.py --still 1.0,12.5     -> renders/.film/still-<t>.jpg
  python3 film.py                       -> renders/.film/video.mp4 (+ renders/.film/keys.json for score.py)
"""
import json, math, subprocess, sys, time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

import arcs as A

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
W, H, FPS = 1080, 1920, 30
NARR = json.load(open(WORK / "narr.json"))
LINES = NARR["lines"]
DUR = round(NARR["duration"] + 0.0, 3)
NF = int(round(DUR * FPS))
ST = A.STATS["stats"]
N_ROWS = ST["rows_total"]                     # 344,799
N_2007 = 63779                                # Harrison & Römhild (chrisharrison.net)
assert N_ROWS == 344799 and ST["chapters"] == 1189 and ST["verses"] == 31102

# ------------------------------------------------------------------ timing helpers (all from the narration timeline)
def LS(i): return LINES[i]["t0"]
def LE(i): return LINES[i]["t1"]
def WT(i, k): return LINES[i]["words"][k]["t0"]
def WE(i, k): return LINES[i]["words"][k]["t1"]

def c01(x): return 0.0 if x <= 0 else 1.0 if x >= 1 else x
def ss(x): x = c01(x); return x * x * (3 - 2 * x)
def eo3(x): x = c01(x); return 1 - (1 - x) ** 3
def ei3(x): x = c01(x); return x ** 3
def eio(x): x = c01(x); return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def expo(x): x = c01(x); return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)
def lerp(a, b, u): return a + (b - a) * u
def win(t, a, b, fi=0.25, fo=0.25):  # opacity window
    if t < a or t > b: return 0.0
    return min(c01((t - a) / fi) if fi > 0 else 1.0, c01((b - t) / fo) if fo > 0 else 1.0)

# lines 0-11 and the call are the original's (same indices up to 11); 12 = "Você conhece João 3:16", 13 = the verse,
# 14-15 = the call. Key names kept from the original film so score.py stays the same ("isa96" = the reference word).
assert LINES[12]["words"][2]["w"].startswith("João") and LINES[13]["words"][0]["w"] == "Porque", "narr.json is not the céu timeline"
T = {
    "bible": WT(1, 0), "s2": LS(2) - 0.15, "y2007": WT(2, 1), "pastor": WT(2, 6), "pesq": WT(2, 9), "draw": WT(2, 13),
    "s3": LS(3), "risq": WT(3, 2), "pan0": WT(3, 6), "pan1": WE(3, 9), "s4": LS(4), "isa": WT(5, 1), "lig": WT(6, 0),
    "fil": WT(6, 2), "s5": LS(7) + 0.35, "n63": WE(7, 5), "viral": WT(8, 1), "s6": LS(9), "n340": WE(9, 11), "x5": WT(10, 0),
    "s7": LS(11), "min": WT(11, 1), "semd": WT(11, 4), "meses": WT(11, 9), "s8": LS(12), "isa96": WT(12, 2) + 0.05,
    "quote": WT(13, 0) - 0.25, "s9": LS(14), "pedidos": WT(15, 0), "end": DUR,
}

# ------------------------------------------------------------------ palette / ink
# arcs: a rainbow by span, as a real one (short arcs inside violet -> long arcs outside red): the hook, seen.
# Gold is kept for the moment a link CONNECTS (highlight arcs turn gold as they land).
PAL_T = np.linspace(0, 1, 7)
PAL_C = np.array([[0.50, 0.28, 0.92], [0.16, 0.42, 1.00], [0.05, 0.72, 0.92], [0.22, 0.78, 0.36], [1.00, 0.82, 0.16],
                  [1.00, 0.52, 0.12], [0.93, 0.20, 0.26]], np.float32)
LUT = np.stack([np.interp(np.linspace(0, 1, 256), PAL_T, PAL_C[:, k]) for k in range(3)], -1).astype(np.float32)
def pal(t): return LUT[np.clip((t * 255).astype(np.int32), 0, 255)]
T_ARC = (np.clip(A.SPAN, 0, 1) ** 0.55).astype(np.float32)
GOLD = np.array([0.86, 0.60, 0.15], np.float32)          # connections, key fills
SLATE = np.array([0.30, 0.38, 0.60], np.float32)         # the chapter ruler under the rainbow
GOLD_GLOW = np.array([1.00, 0.86, 0.52], np.float32)     # light around them
ROYAL = np.array([0.10, 0.30, 0.86], np.float32)
# type: the original was white/gold on black; here navy ink with white halos, deep gold accents
INK = (14, 34, 92); INK_GOLD = (178, 116, 14); INK_SOFT = (78, 100, 150); INK_QUOTE = (24, 52, 128)
REMAP = {(255, 255, 255): INK, (255, 214, 140): INK_GOLD, (210, 210, 220): INK_SOFT, (170, 170, 180): INK_SOFT,
         (255, 226, 170): INK_QUOTE, (120, 120, 132): (150, 168, 205)}

FD = ROOT.parent / "biblia-referencias/assets/fonts"
_FC = {}
def font(kind, size, wt=None):
    key = (kind, int(size), wt)
    if key not in _FC:
        path = {"grot": "SpaceGrotesk-VF.ttf", "mono": "SpaceMono-Regular.ttf", "monob": "SpaceMono-Bold.ttf",
                "serif": "Cormorant-VF.ttf", "serifi": "Cormorant-Italic-VF.ttf"}[kind]
        f = ImageFont.truetype(str(FD / path), int(size))
        if wt is not None:
            f.set_variation_by_axes([wt])
        _FC[key] = f
    return _FC[key]

# ------------------------------------------------------------------ text layers (PIL -> premultiplied float RGBA, cached)
_TC = {}
def text_layer(lines, fnt, color=(255, 255, 255), track=0.0, align="c", lh=1.12, glow=0.0, spans=None):
    """lines: list of str. spans: optional per-line list of (text, rgb) runs. Returns (rgb premult float, alpha float)"""
    color = REMAP.get(tuple(color), tuple(color))
    if spans:
        spans = [[(txt, REMAP.get(tuple(c), tuple(c))) for txt, c in runs] for runs in spans]
    key = (tuple(lines), id(fnt), color, track, align, lh, glow, repr(spans))
    if key in _TC: return _TC[key]
    if len(_TC) > 260:   # counters/subtitles create many one-off layers: keep memory bounded
        _TC.clear(); _SC.clear()
    asc, desc = fnt.getmetrics(); lh_px = int((asc + desc) * lh)
    runs_all = spans or [[(ln, color)] for ln in lines]
    def width(runs):
        w = 0
        for txt, _ in runs:
            for ch in txt: w += fnt.getlength(ch) + track * fnt.size
        return w - (track * fnt.size if runs else 0)
    ws = [width(r) for r in runs_all]
    pad = int(12 + glow * 3)
    Wd = int(max(ws) + 2 * pad); Hd = int(lh_px * len(runs_all) + 2 * pad)
    im = Image.new("RGBA", (Wd, Hd), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for li, runs in enumerate(runs_all):
        x = pad + {"c": (max(ws) - ws[li]) / 2, "l": 0, "r": max(ws) - ws[li]}[align]
        y = pad + li * lh_px
        for txt, col in runs:
            for ch in txt:
                d.text((x, y), ch, font=fnt, fill=tuple(col) + (255,))
                x += fnt.getlength(ch) + track * fnt.size
    a = np.asarray(im).astype(np.float32) / 255.0
    rgb = a[..., :3] * a[..., 3:4]; al = a[..., 3].copy()
    if glow > 0:   # a warm light bloom around the letters (light, not ink)
        g = cv2.GaussianBlur(al, (0, 0), glow)
        rgb = rgb + 0.35 * g[..., None] * GOLD_GLOW
    _TC[key] = (rgb, al)
    return rgb, al

def paste(frame, layer, cx, cy, op=1.0, scale=1.0, anchor="c", add=False):
    if op <= 0.002: return
    rgb, al = layer
    if scale != 1.0:
        rgb = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        al = cv2.resize(al, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    h, w = al.shape
    x0 = int(round(cx - (w / 2 if anchor in "c" else 0 if anchor == "l" else w))); y0 = int(round(cy - h / 2))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb: return
    sr = rgb[ya - y0:yb - y0, xa - x0:xb - x0] * op; sa = al[ya - y0:yb - y0, xa - x0:xb - x0, None] * op
    if add:
        frame[ya:yb, xa:xb] += sr
    else:
        frame[ya:yb, xa:xb] = frame[ya:yb, xa:xb] * (1 - sa) + sr

_SC = {}
def shadow(frame, layer, cx, cy, op, scale=1.0, anchor="c", dark=0.6, blur=10):
    """soft WHITE halo under the ink so it reads over the blue ribbons and the bright light (cached per layer)"""
    if op <= 0.002: return
    key = (id(layer[1]), dark, blur)
    if key not in _SC:
        rgb, al = layer
        ha = np.clip(cv2.GaussianBlur(al, (0, 0), blur) * dark * 1.5, 0, 0.92)
        _SC[key] = (np.repeat(ha[..., None], 3, -1) * np.array([1.0, 0.99, 0.96], np.float32), ha)
    paste(frame, _SC[key], cx, cy, op, scale, anchor)

# ------------------------------------------------------------------ camera: diagram (x in [0,1], h = height in x-units) -> screen
Y_BASE = 1300
class Cam:
    def __init__(self, z=1.0, fx=0.5, fh=0.0, ax=540, ay=Y_BASE):
        self.z, self.fx, self.fh, self.ax, self.ay = z, fx, fh, ax, ay
    @property
    def k(self): return 972.0 * self.z
    def X(self, x): return self.ax + (np.asarray(x) - self.fx) * self.k
    def Y(self, h): return self.ay - (np.asarray(h) - self.fh) * self.k
    def mix(self, o, u):
        return Cam(*(lerp(a, b, u) for a, b in zip((self.z, self.fx, self.fh, self.ax, self.ay), (o.z, o.fx, o.fh, o.ax, o.ay))))
HOME = Cam()

# ------------------------------------------------------------------ dome engine (diagram space DW px)
DW = 1600
class Dome:
    def __init__(self):
        self.cv = A.Canvas(DW); self.DH = self.cv.DH; self.base = self.cv.base
        n = self.DH * DW
        self.den = np.zeros(n, np.float32); self.ts = np.zeros(n, np.float32)
        self.hd = np.zeros(n, np.float32); self.hts = np.zeros(n, np.float32)
        self.n = 0
        self.hero = A.VOTES >= 25

    def _raster(self, j, foot=0.8, spacing=1.1):
        r = A.SPAN[j] * 0.5 * DW
        nn = np.maximum(3, np.ceil(np.pi * r / spacing).astype(np.int64)); tot = int(nn.sum())
        if tot == 0: return
        rep = np.repeat(np.arange(len(j)), nn); start = np.repeat(np.cumsum(nn) - nn, nn)
        kk = (np.arange(tot) - start).astype(np.float32); th = np.pi * kk / np.repeat(nn - 1, nn).astype(np.float32)
        cx = ((A.XA[j] + A.XB[j]) * 0.5 * DW).astype(np.float32); rr = r.astype(np.float32)
        jit = (np.random.default_rng(len(j)).random(tot, dtype=np.float32) - 0.5) * 0.6
        px = cx[rep] - rr[rep] * np.cos(th) + jit; py = self.base - rr[rep] * np.sin(th) + jit
        pix = np.clip(np.rint(py).astype(np.int64), 0, self.DH - 1) * DW + np.clip(np.rint(px).astype(np.int64), 0, DW - 1)
        pw = np.clip(np.sin(th), 0, 1) ** foot * A.W_ARC[j][rep]
        tt = T_ARC[j][rep]
        self.den += np.bincount(pix, weights=pw, minlength=self.den.size).astype(np.float32)
        self.ts += np.bincount(pix, weights=pw * tt, minlength=self.den.size).astype(np.float32)
        h = self.hero[j]
        if h.any():
            hm = h[rep]
            pw2 = (np.clip(np.sin(th), 0, 1) ** 0.5 * A.W_ARC[j][rep])[hm]
            self.hd += np.bincount(pix[hm], weights=pw2, minlength=self.den.size).astype(np.float32)
            self.hts += np.bincount(pix[hm], weights=pw2 * tt[hm], minlength=self.den.size).astype(np.float32)

    def grow_to(self, n_arcs):
        n_arcs = int(min(max(n_arcs, 0), len(A.ORDER)))
        if n_arcs <= self.n: return False
        j = A.ORDER[self.n:n_arcs]; j = j[A.VALID[j]]
        for s in range(0, len(j), 15000): self._raster(j[s:s + 15000])
        self.n = n_arcs; return True

    def image(self, p99, he=0.3):
        """-> (RGBA premultiplied gold ink, additive glow): the threads are gold over the light, with a little light around"""
        sh = (self.DH, DW)
        d = cv2.GaussianBlur(self.den.reshape(sh), (0, 0), 1.0)
        t = cv2.GaussianBlur(self.ts.reshape(sh), (0, 0), 1.0) / np.maximum(d, 1e-6)
        dn = np.clip(d / p99, 0, 2.0)
        detail = np.clip(dn - cv2.GaussianBlur(dn, (0, 0), 5), 0, None)          # keep the threads readable
        a_b = np.clip(0.30 * (1 - np.exp(-1.3 * dn)) + 1.0 * detail, 0, 0.7)
        hb_ = cv2.GaussianBlur(self.hd.reshape(sh), (0, 0), 0.6)
        ht = cv2.GaussianBlur(self.hts.reshape(sh), (0, 0), 0.6) / np.maximum(hb_, 1e-6)
        a_h = (1 - np.exp(-hb_ * he * 1.33)) * 0.92
        rgb = pal(t) * (a_b * (1 - a_h))[..., None] + pal(ht) * a_h[..., None]
        al = 1 - (1 - a_b) * (1 - a_h)
        rgba = np.dstack([rgb, al]).astype(np.float32)
        glow = (cv2.GaussianBlur(rgb, (0, 0), 7) * 0.18).astype(np.float32)
        return rgba, glow

def _dome_M(cam, squash):
    s = cam.k / DW
    M = np.array([[s, 0, cam.ax - cam.fx * cam.k], [0, s * squash, 0]], np.float32)
    M[1, 2] = cam.ay + cam.fh * cam.k - (dome.base / DW) * cam.k * squash
    return M

def warp_dome(img, cam, squash=1.0):
    """diagram canvas -> screen with the camera; squash<1 pulls the dome down onto the baseline"""
    M = _dome_M(cam, squash)
    rgba, glow = img
    return (cv2.warpAffine(rgba, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0),
            cv2.warpAffine(glow, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0))

def dome_over(fr, img, cam, k=1.0, squash=1.0, band=None, warped=None):
    """the original added k * dome light; here k <= 1 is the opacity of the gold ink and anything above 1 is extra glow"""
    rgba, glow = warped if warped is not None else warp_dome(img, cam, squash)
    op = min(1.0, k); g = k
    a = rgba[..., 3:4] * op
    if band is not None:
        a = np.clip(a * band, 0, 1)
    fr *= (1 - a); fr += rgba[..., :3] * (op if band is None else op * band)
    fr += glow * (g if band is None else g * band)

# ------------------------------------------------------------------ baseline bars (chapters), screen space
CH_X = (np.arange(A.NCH) + 0.5) / A.NCH
CH_H = (6 + 104 * (A.CHAP_V / 176.0) ** 0.75).astype(np.float32)   # Psalm 119 (176 verses) = tallest
def draw_bars(frame, cam, op=1.0, hscale=1.0, smear=0.0, glow=True, hi=None):
    if op <= 0.002: return
    X = cam.X(CH_X); vis = (X > -20) & (X < W + 20)
    if not vis.any(): return
    lay = np.zeros((H, W), np.uint8)
    hs = CH_H * hscale * (min(cam.z, 3.0) ** 0.45)
    xs = X[vis]; hh = hs[vis]
    wpx = max(1, int(round(cam.k / A.NCH * 0.55)))
    y0 = int(cam.Y(0) + 6)
    reps = 5 if smear > 2 else 1
    for r in range(reps):
        off = (r / max(1, reps - 1) - 0.5) * smear if reps > 1 else 0
        for x, h_ in zip(xs + off, hh):
            cv2.line(lay, (int(round(x * 16)), y0 * 16), (int(round(x * 16)), int((y0 + h_) * 16)), 255 // reps + 1, wpx, cv2.LINE_AA, 4)
    f = lay.astype(np.float32) / 255.0
    a = (f * 0.62 * op)[..., None]
    frame *= (1 - a); frame += a * SLATE
    if glow:
        frame += cv2.GaussianBlur(f, (0, 0), 6)[..., None] * np.array([1.0, 1.0, 1.0], np.float32) * (0.10 * op)
    # baseline hairline
    yb = min(max(y0 - 3, 0), H - 1)
    frame[yb, :, :] = frame[yb, :, :] * (1 - 0.40 * op) + SLATE * (0.40 * op)

# ------------------------------------------------------------------ highlight arcs (few, screen space, draw-on)
def arc_poly(x0, x1, cam, prog=1.0, n=160):
    r = abs(x1 - x0) / 2; cx = (x0 + x1) / 2; sgn = 1 if x1 >= x0 else -1
    th = np.linspace(0, np.pi * c01(prog), n)
    x = cx - sgn * r * np.cos(th); h = r * np.sin(th)
    return np.stack([cam.X(x), cam.Y(h)], -1)

def span_color(x0, x1):
    """the rainbow colour an arc of this span has in the dome"""
    return pal(np.array([min(1.0, abs(x1 - x0)) ** 0.55]))[0]

def connect_color(rain, g):
    return np.asarray(rain, np.float32) * (1 - g) + GOLD * g

def draw_arcs(frame, polys, color, op=1.0, width=2, glow=1.0, head=False, colors=None, gold=None):
    """ink lines (one colour, or one per arc) + light where they are gold; `op` is the opacity.
    gold: per-arc 0..1 (or one value) = how far the arc has turned gold, i.e. connected"""
    if not polys or op <= 0.002: return
    lay = np.zeros((H, W), np.uint8); col = np.zeros((H, W, 3), np.uint8); gl = np.zeros((H, W), np.uint8)
    for k, p in enumerate(polys):
        if len(p) < 2: continue
        c = colors[k] if colors is not None else color
        g = (gold[k] if hasattr(gold, "__len__") else gold) if gold is not None else 1.0
        pts = [np.round(p * 16).astype(np.int32)]
        cv2.polylines(lay, pts, False, 255, width, cv2.LINE_AA, 4)
        cv2.polylines(col, pts, False, tuple(int(255 * v) for v in np.clip(c, 0, 1)), width, cv2.LINE_AA, 4)
        if g > 0.01: cv2.polylines(gl, pts, False, int(255 * g), width + 1, cv2.LINE_AA, 4)
    f = lay.astype(np.float32) / 255.0
    a = (f * min(1.0, op))[..., None]
    frame *= (1 - a); frame += col.astype(np.float32) / 255.0 * min(1.0, op)
    if glow > 0 and gl.any():
        fg = gl.astype(np.float32) / 255.0
        frame += cv2.GaussianBlur(fg, (0, 0), 5)[..., None] * GOLD_GLOW * (0.55 * glow * op)
        sm = cv2.resize(fg, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        frame += cv2.resize(cv2.GaussianBlur(sm, (0, 0), 6), (W, H))[..., None] * GOLD_GLOW * (0.8 * glow * op)
    if head:
        for p in polys:
            if len(p) > 1: star_point(frame, p[-1][0], p[-1][1], 0.9 * op, 16)

def star_point(frame, x, y, inten=1.0, rad=18, rays=0.0, rot=0.0):
    """soft light point; rays>0 adds a 4+4 ray star (the glory moment). Warm gold so it reads on the bright sky."""
    R = int(rad * 6 + rays * 520)
    xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R)), int(max(0, y - R)), int(min(H, y + R))
    if xa >= xb or ya >= yb: return
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32); dx, dy = xx - x, yy - y; r2 = dx * dx + dy * dy
    g = np.exp(-r2 / (2 * rad * rad)) + 0.35 * np.exp(-r2 / (2 * (rad * 3) ** 2))
    if rays > 0:
        c, s = math.cos(rot), math.sin(rot)
        u, v = dx * c + dy * s, -dx * s + dy * c
        L = 520 * rays
        down = np.where(dy > 0, 0.3, 1.0).astype(np.float32)
        g += (0.9 * np.exp(-(v * v) / 3.5) * np.exp(-np.abs(u) / L) + 0.9 * np.exp(-(u * u) / 3.5) * np.exp(-np.abs(v) / L)) * down
        c2, s2 = math.cos(rot + math.pi / 4), math.sin(rot + math.pi / 4)
        u2, v2 = dx * c2 + dy * s2, -dx * s2 + dy * c2
        g += (0.45 * np.exp(-(v2 * v2) / 2.0) * np.exp(-np.abs(u2) / (L * 0.45)) + 0.45 * np.exp(-(u2 * u2) / 2.0) * np.exp(-np.abs(v2) / (L * 0.45))) * down
    core = np.exp(-r2 / (2 * (rad * 0.45) ** 2))
    frame[ya:yb, xa:xb] += (g[..., None] * np.array([1.0, 0.80, 0.40], np.float32) + core[..., None] * np.array([0.3, 0.3, 0.3], np.float32)) * inten

# ------------------------------------------------------------------ data for the highlighted moments
def gx(ref): return float(A.gv_x(A.ref_gv(ref)))
DEMO = [("Gen.1.1", "John.1.1"), ("Isa.53.5", "1Pet.2.24"), ("Ps.22.1", "Matt.27.46")]
X_IS4110, X_FP413 = gx("Isa.41.10"), gx("Phil.4.13")
X_GN29, X_AP222 = gx("Gen.2.9"), gx("Rev.22.2")
G316 = A.ref_gv("John.3.16")
m316 = (A.PA == G316) | (A.PB == G316)
P316 = np.where(A.PA[m316] == G316, A.PB[m316], A.PA[m316])
P316 = np.unique(P316[P316 != G316]); X316 = float(A.gv_x(G316)); XP316 = A.gv_x(P316)
N316 = int(len(P316))                     # shown on screen: "80 versículos ligados a ele" (computed here, not typed)
TOPV = np.argsort(-A.VOTES)[:60]  # teaser arcs in S2 (best voted)
_vi = np.argsort(-A.VOTES)[0]
assert {int(A.PA[_vi]), int(A.PB[_vi])} == {A.ref_gv("Isa.41.10"), A.ref_gv("Phil.4.13")} and int(A.VOTES[_vi]) == 1477
BOOK_X0 = A.BOOK_FIRST_CHAP / A.NCH

# ------------------------------------------------------------------ the heaven plate (FLUX, generated for this film)
PLATE_SRC = cv2.cvtColor(cv2.imread(str(ROOT / "assets/ceu-plate.png"), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
PH, PW = PLATE_SRC.shape[:2]
PLATE = (PLATE_SRC.astype(np.float32) / 255.0) ** 1.0
PS = max(W / PW, H / PH) * 1.18          # 18% headroom for the breathing zoom and the camera parallax

def plate(t, dx=0.0, dy=0.0, z=1.0, rot=0.0):
    """the heaven: a slow breath (zoom + sway) plus whatever the scene's camera asks (dx, dy in px; z >= 1)"""
    s = PS * z * (1.0 + 0.025 * math.sin(t * 0.21)) * (1.0 + 0.0016 * t)
    ang = rot + 0.35 * math.sin(t * 0.13)
    M = cv2.getRotationMatrix2D((PW / 2, PH / 2), ang, s)
    M[0, 2] += W / 2 - PW / 2 + dx + 14 * math.sin(t * 0.17)
    M[1, 2] += H / 2 - PH / 2 + dy + 10 * math.sin(t * 0.11 + 1.0)
    return cv2.warpAffine(PLATE, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

def bg_cam(t):
    """how the heaven follows the story: dive with the Powers-of-Ten scan, push into the counter, lean toward João 3:16"""
    dx = dy = 0.0; z = 1.0
    if T["s3"] <= t < T["s4"] + 0.6:                     # the dive into the chapters
        if t < T["pan0"]: u = ss((t - T["s3"]) / 0.9); z += 0.10 * u; dy += 60 * u; dx += 140 * u
        elif t < T["pan1"]:
            u = eio((t - T["pan0"]) / (T["pan1"] - T["pan0"])); z += 0.10; dy += 60; dx += lerp(140, -140, u)
        else:
            u = ss((t - T["pan1"]) / 0.7); z += 0.10 * (1 - u); dy += 60 * (1 - u); dx += -140 * (1 - u)
    if T["s5"] - 0.2 <= t < T["s7"] + 0.6:               # the counter: the heaven opens a little
        z += 0.04 * ss((t - T["s5"]) / 3.0) + 0.03 * ss((t - T["n340"]) / 2.0)
    if t >= T["s8"] - 0.1:                                # João 3:16: lean toward it, then come back for the call
        push = ss((t - T["quote"]) / 2.2); back = ss((t - T["s9"]) / 1.4)
        dx += -(X316 - 0.5) * 260 * push * (1 - 0.55 * back); z += 0.06 * push * (1 - back)
    return dx, dy, z

# ------------------------------------------------------------------ living light: twinkles, glitter, the glory above
_tr = np.random.default_rng(316)
TW_N = 18
TW = {"x": _tr.uniform(30, W - 30, TW_N), "y": _tr.uniform(60, H - 60, TW_N), "s": _tr.uniform(0.6, 1.6, TW_N) ** 1.3,
      "f": _tr.uniform(0.25, 0.9, TW_N), "ph": _tr.uniform(0, 6.28, TW_N), "v": _tr.uniform(-6, 6, TW_N)}

def _sprite(r):
    k = int(r * 9); yy, xx = np.mgrid[-k:k + 1, -k:k + 1].astype(np.float32)
    rr = np.sqrt(xx * xx + yy * yy)
    core = np.exp(-(rr / (r * 0.55)) ** 2)
    cross = np.exp(-np.abs(yy) / 0.9) * np.exp(-np.abs(xx) / (r * 3.2)) + np.exp(-np.abs(xx) / 0.9) * np.exp(-np.abs(yy) / (r * 3.2))
    halo = 0.25 * np.exp(-(rr / (r * 2.2)) ** 2)
    return (core + 0.7 * cross + halo).astype(np.float32)
SPRITES = {r: _sprite(r) for r in (2, 3, 4, 5, 6)}
TW_COL = np.array([1.0, 0.97, 0.90], np.float32)

def twinkles(fr, t, op=1.0):
    for i in range(TW_N):
        b = (0.5 + 0.5 * math.sin(t * TW["f"][i] * 6.28 + TW["ph"][i])) ** 6 * op
        if b < 0.03: continue
        r = min(6, max(2, int(round(2 + 3 * TW["s"][i]))))
        sp = SPRITES[r]; k = sp.shape[0] // 2
        x = int(TW["x"][i] + TW["v"][i] * t); y = int(TW["y"][i] - 3 * t)
        xa, xb, ya, yb = max(0, x - k), min(W, x + k + 1), max(0, y - k), min(H, y + k + 1)
        if xa >= xb or ya >= yb: continue
        fr[ya:yb, xa:xb] += sp[ya - (y - k):yb - (y - k), xa - (x - k):xb - (x - k), None] * TW_COL * (0.9 * b)

GL_N = 50
_gr = np.random.default_rng(11)
GL = {"x": _gr.uniform(0, W, GL_N), "y": _gr.uniform(0, H, GL_N), "s": _gr.uniform(0.7, 2.2, GL_N),
      "b": _gr.uniform(0.05, 0.22, GL_N), "v": _gr.uniform(6, 22, GL_N), "ph": _gr.uniform(0, 6.28, GL_N)}
GL_COL = np.array([1.0, 0.92, 0.70], np.float32)

def glitter(fr, t, op=1.0):
    """slow golden motes rising through the light"""
    for i in range(GL_N):
        x = (GL["x"][i] + 18 * math.sin(t * 0.35 + GL["ph"][i])) % W
        y = (GL["y"][i] - GL["v"][i] * t) % H
        s = GL["s"][i]; b = GL["b"][i] * op * (0.55 + 0.45 * math.sin(t * 1.7 + GL["ph"][i]))
        R = int(s * 3) + 2
        xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R + 1)), int(max(0, y - R)), int(min(H, y + R + 1))
        if xa >= xb or ya >= yb: continue
        gy, gx_ = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        fr[ya:yb, xa:xb] += np.exp(-((gx_ - x) ** 2 + (gy - y) ** 2) / (2 * s * s))[..., None] * (GL_COL * b)

_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
_R = 2400
_ry, _rx = np.mgrid[-_R // 2:_R // 2, -_R // 2:_R // 2].astype(np.float32)
_th = np.arctan2(_rx, _ry); _rr = np.sqrt(_rx * _rx + _ry * _ry)
_pat = sum(a * (0.5 + 0.5 * np.sin(f * _th + p)) for f, a, p in ((9, 0.6, 0.3), (17, 0.4, 2.1), (29, 0.25, 4.0))) / 1.25
RAYS = (np.clip((_pat - 0.42) * 1.9, 0, 1) ** 1.8 * np.exp(-_rr / 1400) * np.clip((_rr - 120) / 400, 0, 1)
        * np.clip((1150 - _rr) / 250, 0, 1)).astype(np.float32)
RAYS = cv2.GaussianBlur(RAYS, (0, 0), 5)
del _ry, _rx, _th, _rr, _pat

def rays(fr, t, op=1.0):
    """god rays from the light above the frame, turning slowly"""
    if op <= 0.002: return
    M = cv2.getRotationMatrix2D((_R / 2, _R / 2), 1.5 * math.sin(t * 0.13) + t * 0.45, 1.0)
    M[0, 2] += W / 2 - _R / 2; M[1, 2] += -240 - _R / 2
    r = cv2.warpAffine(RAYS, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)
    fr += r[..., None] * np.array([1.0, 0.94, 0.78], np.float32) * (0.12 * op)

# soft royal-blue edge (keeps the corners rich, like the reference) instead of the original's black vignette
EDGE = np.clip((((_xx - W / 2) / (W * 0.62)) ** 2 + ((_yy - H * 0.5) / (H * 0.62)) ** 2) - 0.45, 0, 1)[..., None] * 0.10
GRAIN = [np.random.default_rng(7 + k).normal(0, 1, (H // 2, W // 2)).astype(np.float32) for k in range(6)]
del _yy, _xx

# ------------------------------------------------------------------ subtitles
# spoken tokens (Whisper) -> display tokens: digits, "pra", quotes; each display token keeps the time of its first word
SUB_FIX = {2: [(("dois", "mil", "e", "sete,"), "2007,"), (("para",), "pra")],
           5: [(("Tipo,",), "Tipo"), (("não",), "“Não"), (("contigo.",), "contigo”…")],
           6: [(("Ligado",), "ligado"), (("a,",), "a"), (("tudo",), "“Tudo"), (("fortalece.",), "fortalece”.")],
           11: [(("oito",), "8")]}
NO_SUB = (0, 1, 12, 13, 14, 15)   # hook, João 3:16, the verse and the call have their own big type

def sub_tokens(L):
    ws, out, k = L["words"], [], 0
    rules = SUB_FIX.get(L["i"], [])
    while k < len(ws):
        for src, rep in rules:
            if tuple(w["w"] for w in ws[k:k + len(src)]) == src:
                out.append((rep, ws[k]["t0"])); k += len(src); break
        else:
            out.append((ws[k]["w"], ws[k]["t0"])); k += 1
    return out

def subtitle(frame, t):
    for L in LINES:
        if L["i"] in NO_SUB: continue
        if not (L["t0"] - 0.05 <= t <= L["t1"] + 0.25): continue
        toks = sub_tokens(L)
        words = [w for w, _ in toks]; times = [tt for _, tt in toks]
        chunks, cur = [], []
        for k, w in enumerate(words):
            if cur and len(" ".join(words[i] for i in cur + [k])) > 34:
                chunks.append(cur); cur = []
            cur.append(k)
        chunks.append(cur)
        ci = 0
        for n, ch in enumerate(chunks):
            if times[ch[0]] - 0.05 <= t: ci = n
        ch = chunks[ci]
        fnt = font("grot", 46, 600)
        spoken = [k for k in ch if times[k] - 0.04 <= t]
        runs = [(" ".join(words[k] for k in ch if k in spoken) + (" " if len(spoken) < len(ch) and spoken else ""), (255, 255, 255)),
                (" ".join(words[k] for k in ch if k not in spoken), (120, 120, 132))]
        lay = text_layer([" ".join(words[k] for k in ch)], fnt, spans=[runs], align="c")
        op = win(t, L["t0"] - 0.05, L["t1"] + 0.25, 0.08, 0.15)
        shadow(frame, lay, W / 2, 1505, op, dark=0.95, blur=9)
        paste(frame, lay, W / 2, 1505, op)
        return

# ------------------------------------------------------------------ the film, frame by frame
dome = Dome()
t0 = time.time(); dome.grow_to(len(A.ORDER)); print(f"full dome raster {time.time() - t0:.1f} s")
P99 = float(np.percentile(dome.den[dome.den > 0], 99.5))
FULL = dome.image(P99); print(f"full dome image {time.time() - t0:.1f} s")
build = Dome()  # incremental (counter scenes)
BUILD_IMG = {"n": -1, "img": None}

def build_image(count_rows):
    n = int(round(count_rows / N_ROWS * len(A.ORDER)))
    if build.grow_to(n) or BUILD_IMG["img"] is None:
        BUILD_IMG["img"] = build.image(P99)
    return BUILD_IMG["img"]

def counter_value(t):
    """0 -> 63,779 during "O gráfico deles mostrou 63 mil ligações", hold, then -> 344,799 by the end of "340 mil" """
    a0, a1 = T["s5"], T["n63"]; b0, b1 = T["s6"] + 0.25, T["n340"]
    if t < a0: return 0
    if t < a1: return int(round(N_2007 * eo3((t - a0) / (a1 - a0))))
    if t < b0: return N_2007
    if t < b1: return int(round(N_2007 + (N_ROWS - N_2007) * ei3((t - b0) / (b1 - b0)) ** 0.8))
    return N_ROWS

def fmt(n): return f"{n:,}".replace(",", ".")

def viral_wall(src, n):
    """the picture multiplies into a wall of posts (n copies per side, float)"""
    if n <= 1.01: return src
    cw, ch = W / n, H / n; gap = 4 + 5 * (n - 1)
    tw, th = max(8, int(cw - gap)), max(8, int(ch - gap))
    small = cv2.resize(src, (tw, th), interpolation=cv2.INTER_AREA)
    out = np.ones_like(src) * np.array([0.93, 0.95, 1.0], np.float32); m = int(math.ceil(n / 2)) + 1
    for iy in range(-m, m + 1):
        for ix in range(-m, m + 1):
            x0 = int(W / 2 + ix * cw - tw / 2); y0 = int(H / 2 + iy * ch - th / 2)
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + tw), min(H, y0 + th)
            if xa >= xb or ya >= yb: continue
            out[ya:yb, xa:xb] = small[ya - y0:yb - y0, xa - x0:xb - x0]
    return out

def titled(fr, lay, x, y, op, sc=1.0, anchor="c", dark=0.85, blur=14):
    shadow(fr, lay, x, y, op, sc, anchor, dark=dark, blur=blur); paste(fr, lay, x, y, op, sc, anchor)

def blend(fr, ys, xs, col, a):
    fr[ys, xs] = fr[ys, xs] * (1 - a) + np.asarray(col, np.float32) * a

Z_MAIN = 1.22   # the dome slightly wider than the screen: immersive, edges bleed off

def heaven(t):
    dx, dy, z = bg_cam(t)
    fr = plate(t, dx, dy, z)
    glory = 0.5 + 0.5 * ss((t - T["quote"]) / 1.5) if t >= T["quote"] else 0.5
    rays(fr, t, glory)
    glitter(fr, t)
    return fr

def render(fi):
    t = fi / FPS
    fr = heaven(t)
    # ---------------- S1 hook: the full dome from frame 0, big
    if t < T["s2"] + 0.9:
        sq = 1.0 - ss((t - T["s2"]) / 0.9) * 0.985 if t > T["s2"] else 1.0
        z = lerp(1.20, 1.30, ss(t / T["s2"])) + 0.04 * expo((t - T["bible"]) / 0.35) * (1 - ss((t - T["bible"] - 0.35) / 1.2))
        cam = Cam(z, 0.5, 0.0, 540, Y_BASE)
        gain = 1.0 + 0.9 * max(0.0, 1 - (t - T["bible"]) / 0.55) * (t >= T["bible"])
        gain *= (1 - ss((t - T["s2"]) / 0.9)) if t > T["s2"] else 1.0
        xs = lerp(-200, W + 200, c01((t - 0.15) / 1.9))
        band = (1 + 0.55 * np.exp(-((np.arange(W, dtype=np.float32) - xs) / 110) ** 2))[None, :, None]
        dome_over(fr, FULL, cam, gain, max(0.015, sq), band=band)
        draw_bars(fr, cam, op=0.55 + 0.45 * (t >= T["bible"]), hscale=0.9)
        l1 = text_layer(["ISSO NÃO É", "UM ARCO-ÍRIS."], font("grot", 98, 700), track=-0.02)
        l2 = text_layer(["É A BÍBLIA", "INTEIRA."], font("grot", 108, 700), track=-0.02,
                        spans=[[("É A ", (255, 255, 255)), ("BÍBLIA", (255, 214, 140))], [("INTEIRA.", (255, 255, 255))]])
        op1 = 1.0 if t < T["bible"] - 0.06 else 0.0
        op2 = win(t, T["bible"] - 0.06, T["s2"] + 0.25, 0.001, 0.3)
        sc2 = 1.0 + 0.10 * (1 - expo((t - T["bible"] + 0.06) / 0.3))
        titled(fr, l1, W / 2, 440, op1); titled(fr, l2, W / 2, 440, op2, sc2)
    # ---------------- S2 origin: 2007, the pastor and the computer researcher
    if T["s2"] - 0.1 <= t < T["s3"] + 0.4:
        cam = Cam(1.0, 0.5, 0.0, 540, Y_BASE)
        op = win(t, T["s2"] + 0.3, T["s3"] + 0.4, 0.5, 0.4)
        ghost = 0.16 * win(t, T["s2"] + 0.6, T["s3"] + 0.4, 0.9, 0.4)
        dome_over(fr, FULL, Cam(1.0 + 0.05 * ss((t - T["s2"]) / 7), 0.5, 0.0, 540, Y_BASE), ghost)
        draw_bars(fr, cam, op=0.85 * op + 0.15)
        if t > T["draw"]:
            u = (t - T["draw"]) / 1.6; polys, cols, golds = [], [], []
            for r, j in enumerate(TOPV):
                p = c01(u * 1.6 - r / len(TOPV) * 0.9)
                if p > 0:
                    g = ss((p - 0.85) / 0.15)                                  # gold the moment it lands
                    polys.append(arc_poly(A.XA[j], A.XB[j], cam, eo3(p)))
                    cols.append(connect_color(span_color(A.XA[j], A.XB[j]), g)); golds.append(g)
            draw_arcs(fr, polys, GOLD, 0.85 * win(t, T["draw"], T["s3"] + 0.3, 0.2, 0.3), width=1, glow=0.6, colors=cols, gold=golds)
        y_op = win(t, T["y2007"] - 0.05, T["s3"] + 0.1, 0.12, 0.3)
        ly = text_layer(["2007"], font("monob", 240), color=(255, 214, 140), track=-0.04, glow=10)
        titled(fr, ly, W / 2, 420, y_op, 1.0 + 0.06 * (1 - eo3((t - T["y2007"]) / 0.5)), dark=0.9, blur=18)
        for k, (who, role, tt, yy_) in enumerate((("CHRISTOPH RÖMHILD", "pastor", T["pastor"], 640),
                                                  ("CHRIS HARRISON", "pesquisador de computação", T["pesq"], 790))):
            o = win(t, tt - 0.1, T["s3"] + 0.1, 0.25, 0.3); dx = 30 * (1 - eo3((t - tt + 0.1) / 0.5))
            ln = text_layer([who], font("grot", 50, 600), track=0.06)
            lr = text_layer([role], font("serifi", 56, 500), color=(255, 214, 140))
            titled(fr, ln, 150 + dx, yy_, o, anchor="l", dark=0.85, blur=10); titled(fr, lr, 150 + dx, yy_ + 56, o, anchor="l", dark=0.85, blur=10)
            blend(fr, slice(yy_ - 24, yy_ + 82), slice(118, 122), GOLD, o)
    # ---------------- S3 bars: every tick is a chapter, Genesis -> Revelation (Powers-of-Ten dive into the base)
    if T["s3"] <= t < T["s4"] + 0.6:
        far0, far1 = Cam(7.5, 0.012, 0.0, 300, 1180), Cam(7.5, 0.988, 0.0, 780, 1180)
        home = Cam(1.0, 0.5, 0.0, 540, Y_BASE)
        if t < T["pan0"]: cam = home.mix(far0, ss((t - T["s3"]) / 0.9))
        elif t < T["pan1"]:
            u = eio((t - T["pan0"]) / (T["pan1"] - T["pan0"])); cam = far0.mix(far1, u)
        else: cam = far1.mix(home, ss((t - T["pan1"]) / 0.7))
        speed = 0.0
        if T["pan0"] < t < T["pan1"]:
            u1 = eio((t + 1 / FPS - T["pan0"]) / (T["pan1"] - T["pan0"])); u0 = eio((t - T["pan0"]) / (T["pan1"] - T["pan0"]))
            speed = (u1 - u0) * 0.976 * 972 * 7.5
        o_d = win(t, T["s3"], T["s4"] + 0.6, 0.6, 0.4)
        dome_over(fr, FULL, cam, 0.42 * o_d)   # the short arcs rising right above the chapters
        draw_bars(fr, cam, op=1.0, smear=min(speed, 160))
        o1 = win(t, T["risq"], T["pan0"] + 0.1, 0.2, 0.2)
        if o1 > 0:
            xg = float(cam.X(CH_X[0])); yb = float(cam.Y(0))
            star_point(fr, xg, yb + 4, 0.35 * o1, 10)
            lg = text_layer(["GÊNESIS 1"], font("grot", 52, 700), track=0.06)
            lv = text_layer([f"{int(A.CHAP_V[0])} versículos = 1 risquinho"], font("serifi", 50, 500), color=(255, 214, 140))
            titled(fr, lg, xg + 34, yb - 236, o1, anchor="l"); titled(fr, lv, xg + 34, yb - 180, o1, anchor="l")
        if T["pan0"] - 0.1 <= t < T["pan1"] + 0.5:
            o2 = win(t, T["pan0"] - 0.1, T["pan1"] + 0.5, 0.1, 0.3)
            ch = int(np.clip((cam.fx * A.NCH), 0, A.NCH - 1)); bk = int(A.CHAP_BOOK[ch])
            lb = text_layer([A.BOOKS_PT[bk].upper()], font("grot", 84, 700), track=0.02)
            lc = text_layer([f"CAPÍTULO {fmt(ch + 1)} DE 1.189"], font("mono", 38), color=(255, 214, 140), track=0.04)
            titled(fr, lb, W / 2, 420, o2); titled(fr, lc, W / 2, 500, o2)
        if t >= T["pan1"]:
            p = eo3((t - T["pan1"]) / 1.0); o3 = win(t, T["pan1"], T["s4"] + 0.6, 0.05, 0.35)
            camh = far1.mix(home, ss((t - T["pan1"]) / 0.7))
            g = ss((p - 0.85) / 0.15)
            draw_arcs(fr, [arc_poly(X_GN29, X_AP222, camh, p)], GOLD, o3, width=3, glow=1.0, head=p < 0.99,
                      colors=[connect_color(span_color(X_GN29, X_AP222), g)], gold=[g])
            la = text_layer(["GÊNESIS 2:9  →  APOCALIPSE 22:2"], font("mono", 34), color=(255, 214, 140), track=0.02)
            lt = text_layer(["a árvore da vida, do primeiro ao último livro"], font("serifi", 48, 500))
            o4 = o3 * c01((t - T["pan1"] - 0.5) / 0.3)
            titled(fr, la, W / 2, 600, o4); titled(fr, lt, W / 2, 656, o4)
    # ---------------- S4 one arc = one verse pointing to another; the most voted link
    if T["s4"] <= t < T["s5"] + 0.3:
        home = Cam(1.0, 0.5, 0.0, 540, Y_BASE)
        z_to = Cam(2.35, (X_IS4110 + X_FP413) / 2, 0.0, 540, Y_BASE)
        cam = home.mix(z_to, ss((t - T["isa"] + 0.5) / 0.9))
        if t > T["s5"] - 0.6: cam = z_to.mix(Cam(Z_MAIN, 0.5, 0.0, 540, Y_BASE), ss((t - T["s5"] + 0.6) / 0.6))
        op = win(t, T["s4"], T["s5"] + 0.3, 0.2, 0.35)
        dome_over(fr, FULL, cam, 0.16 * op)
        draw_bars(fr, cam, op=0.9 * op)
        polys = []
        for k, (a, b) in enumerate(DEMO):
            p = eo3((t - (T["s4"] + 0.35 + k * 0.75)) / 0.7)
            if p > 0: polys.append((arc_poly(gx(a), gx(b), cam, p), p, gx(a), gx(b)))
        dop = win(t, T["s4"], T["isa"] + 0.3, 0.1, 0.4)
        gs = [ss((p - 0.85) / 0.15) for _, p, _, _ in polys]
        draw_arcs(fr, [q for q, _, _, _ in polys], GOLD, 0.9 * dop, width=2, glow=0.5,
                  colors=[connect_color(span_color(xa, xb), g) for (_, _, xa, xb), g in zip(polys, gs)], gold=gs)
        for q, p, _, _ in polys:
            if p < 0.99: star_point(fr, q[-1][0], q[-1][1], 0.8 * dop, 14)
        if t > T["isa"] - 0.2:
            pe = expo((t - T["lig"]) / 1.6) if t > T["lig"] else 0.0
            xl, yl = float(cam.X(X_IS4110)), float(cam.Y(0)); xr = float(cam.X(X_FP413))
            star_point(fr, xl, yl, 0.8 * op * c01((t - T["isa"] + 0.2) / 0.3), 12)
            if pe > 0:
                g = ss((pe - 0.85) / 0.15)
                draw_arcs(fr, [arc_poly(X_IS4110, X_FP413, cam, pe)], GOLD, op, width=4, glow=1.3, head=pe < 0.99,
                          colors=[connect_color(span_color(X_IS4110, X_FP413), g)], gold=[g])
            if pe > 0.98: star_point(fr, xr, yl, 0.9 * op, 12)
            lq1 = text_layer(["“Não temas,", "eu sou contigo”"], font("serifi", 70, 500), align="l", lh=1.0)
            lr1 = text_layer(["ISAÍAS 41:10"], font("mono", 34), color=(255, 214, 140), track=0.06)
            lq2 = text_layer(["“Tudo posso naquele", "que me fortalece”"], font("serifi", 70, 500), align="r", lh=1.0)
            lr2 = text_layer(["FILIPENSES 4:13"], font("mono", 34), color=(255, 214, 140), track=0.06)
            o5 = op * c01((t - T["isa"]) / 0.35); o6 = op * c01((t - T["fil"]) / 0.35)
            for lay, x, y, o, an in ((lq1, 66, 560, o5, "l"), (lr1, 70, 660, o5, "l"), (lq2, W - 66, 780, o6, "r"), (lr2, W - 70, 880, o6, "r")):
                titled(fr, lay, x, y, o, anchor=an, dark=0.9, blur=10)
            lb = text_layer(["A LIGAÇÃO MAIS VOTADA"], font("grot", 40, 600), color=(255, 214, 140), track=0.12)
            lv = text_layer([f"{fmt(1477)} votos"], font("mono", 34), track=0.04)
            o7 = op * c01((t - T["lig"] - 0.3) / 0.3)
            titled(fr, lb, W / 2, 300, o7); titled(fr, lv, W / 2, 356, o7)
    # ---------------- S5/S6 the counter: 63,779 (2007) -> 344,799 (today), the dome fills with gold
    if T["s5"] - 0.2 <= t < T["s7"] + 0.6:
        n = counter_value(t)
        img = build_image(n)
        cam = Cam(Z_MAIN + 0.06 * ss((t - T["n340"]) / 2.5), 0.5, 0.0, 540, Y_BASE)
        flash = 1.0 + 1.1 * max(0.0, 1 - (t - T["n340"]) / 0.6) * (t >= T["n340"])
        op = win(t, T["s5"] - 0.2, T["s7"] + 0.6, 0.3, 0.6)
        wd = warp_dome(img, cam)
        vt = (t - T["viral"]) if t >= T["viral"] else -1
        back = T["s6"] + 0.05
        walling = 0 <= vt and t < back + 0.45
        if walling:
            g = 1 + 2 * eo3(vt / 0.3) + 2 * eo3((vt - 0.4) / 0.4)          # 1 -> 3 -> 5 copies per side
            g = g * (1 - ss((t - back) / 0.45)) + ss((t - back) / 0.45)
            tmp = fr.copy(); dome_over(tmp, img, cam, flash * op, warped=wd); draw_bars(tmp, cam, op=0.8 * op)
            fr[:] = viral_wall(tmp, g)
        else:
            dome_over(fr, img, cam, flash * op, warped=wd); draw_bars(fr, cam, op=0.8 * op)
        today = t >= T["s6"]
        x5 = t >= T["x5"] - 0.05
        lab_txt = "MAIS QUE O GRÁFICO DE 2007" if x5 else ("HOJE · BASE ABERTA" if today else "2007 · O GRÁFICO FAMOSO")
        lab = text_layer([lab_txt], font("grot", 40, 600), color=(255, 214, 140), track=0.12)
        hit = t >= T["n340"]
        lc = text_layer([fmt(n)], font("monob", 156), color=(255, 214, 140) if hit else (255, 255, 255), track=-0.04, glow=6 if hit else 0)
        ll = text_layer(["ligações entre versículos"], font("serifi", 54, 500))
        sc = 1.0 + 0.12 * max(0.0, 1 - (t - T["n340"]) / 0.4) * hit
        oc = win(t, T["s5"] - 0.1, T["s7"] + 0.2, 0.2, 0.3)
        titled(fr, lab, W / 2, 280, oc)
        o_num = oc * (1 - c01((t - T["x5"] + 0.05) / 0.12))
        titled(fr, lc, W / 2, 385, o_num, sc, dark=0.95, blur=16); titled(fr, ll, W / 2, 472, o_num)
        if x5:
            o8 = win(t, T["x5"] - 0.05, T["s7"] + 0.2, 0.12, 0.3)
            lx = text_layer(["5,4×"], font("grot", 220, 700), color=(255, 214, 140), track=-0.03, glow=10)
            titled(fr, lx, W / 2, 400, o8, 1.0 + 0.2 * (1 - eo3((t - T["x5"] + 0.05) / 0.35)), dark=0.95, blur=18)
            gw = 760; g2 = eo3((t - T["x5"]) / 0.6)
            for (yy_, ww, col, lbl, tcol) in ((560, gw * N_2007 / N_ROWS, (0.55, 0.62, 0.80), f"2007  {fmt(N_2007)}", INK_SOFT),
                                              (612, gw * g2, tuple(GOLD), f"HOJE  {fmt(N_ROWS)}", INK_GOLD)):
                if ww >= 1:
                    blend(fr, slice(yy_ - 11, yy_ + 11), slice(160, int(160 + ww)), col, o8)
                lt_ = text_layer([lbl], font("mono", 26), color=tcol, track=0.02)
                titled(fr, lt_, 160, yy_ - 30, o8, anchor="l", dark=0.8, blur=6)
    # ---------------- S7 eight months, one per minute, without sleeping
    if T["s7"] - 0.2 <= t < T["s8"] + 0.5:
        op = win(t, T["s7"] - 0.2, T["s8"] + 0.5, 0.3, 0.5)
        cam = Cam(lerp(Z_MAIN + 0.06, Z_MAIN + 0.16, ss((t - T["s7"]) / (T["s8"] - T["s7"]))), 0.5, 0.0, 540, Y_BASE)
        dim = 1.0 - 0.45 * ss((t - T["min"]) / 0.6)
        dome_over(fr, FULL, cam, op * dim)
        draw_bars(fr, cam, op=0.6 * op)
        if t > T["min"]:
            k = int(min(400, 3 * ((t - T["min"]) * FPS) ** 1.6))
            sel = A.ORDER[:k][-24:]
            gs = [1.0 if q >= len(sel) - 3 else 0.0 for q in range(len(sel))]       # the newest ones connect (gold)
            draw_arcs(fr, [arc_poly(A.XA[j], A.XB[j], cam) for j in sel], GOLD, 0.75 * op, width=1, glow=0.3,
                      colors=[connect_color(span_color(A.XA[j], A.XB[j]), g) for j, g in zip(sel, gs)], gold=gs)
        rows = [("1 LIGAÇÃO POR MINUTO", T["min"] - 0.1, 42, (255, 214, 140)), (f"{fmt(N_ROWS)} MINUTOS", T["semd"] - 0.15, 46, (255, 255, 255)),
                (f"= {fmt(round(N_ROWS / 60))} HORAS = {int(N_ROWS / 1440)} DIAS", T["semd"] + 0.45, 40, (210, 210, 220))]
        for k, (txt, tt, fs, col) in enumerate(rows):
            o = op * c01((t - tt) / 0.25)
            lay = text_layer([txt], font("mono", fs), color=col, track=0.03)
            titled(fr, lay, W / 2, 262 + k * 62, o, dark=0.9, blur=10)
        if t >= T["meses"] - 0.1:
            o = op * c01((t - T["meses"] + 0.1) / 0.2)
            lm = text_layer(["≈ 8 MESES"], font("grot", 150, 700), color=(255, 214, 140), track=-0.02, glow=8)
            ls_ = text_layer(["sem dormir"], font("serifi", 56, 500))
            sc = 1.0 + 0.12 * (1 - eo3((t - T["meses"] + 0.1) / 0.35))
            titled(fr, lm, W / 2, 500, o, sc, dark=0.95, blur=16); titled(fr, ls_, W / 2, 592, o)
        if t >= T["semd"]:
            u = c01((t - T["semd"]) / (T["meses"] - T["semd"] + 0.2))
            for m in range(8):
                fill = c01(u * (N_ROWS / 1440 / 30.44) - m)
                x0 = int(W / 2 - 4 * 92 + m * 92 + 8); y0 = 640
                blend(fr, slice(y0, y0 + 22), slice(x0, x0 + 76), (0.86, 0.90, 0.98), 0.55 * op)
                if fill > 0: blend(fr, slice(y0, y0 + 22), slice(x0, x0 + int(76 * fill)), GOLD, op)
    # ---------------- S8 João 3:16 becomes the light; S9 the call
    if t >= T["s8"] - 0.1:
        op = c01((t - T["s8"] + 0.1) / 0.5)
        push = ss((t - T["quote"]) / 2.2); back = ss((t - T["s9"]) / 1.4)
        cam = Cam(Z_MAIN + 0.4 * push - 0.3 * back, lerp(0.5, X316, push * (1 - 0.55 * back)), 0.0, 540, Y_BASE)
        dome_g = lerp(0.24, 0.10, ss((t - T["isa96"]) / 0.6)) + 0.45 * ss((t - T["s9"] - 0.3) / 1.2)
        dome_over(fr, FULL, cam, dome_g * op)
        draw_bars(fr, cam, op=0.5 * op)
        lt = text_layer(["VOCÊ CONHECE"], font("grot", 40, 600), color=(255, 214, 140), track=0.12)
        titled(fr, lt, W / 2, 270, win(t, T["s8"] + 0.1, T["s9"] - 0.2, 0.3, 0.3))
        if t >= T["isa96"] - 0.1:
            u = (t - T["isa96"] + 0.1) / 1.1
            polys, cols, golds = [], [], []
            for x in XP316:
                p = eo3(u * 1.4 - abs(x - X316) * 0.5)
                if p > 0:
                    poly = arc_poly(x, X316, cam, 1.0); polys.append(poly[:max(2, int(len(poly) * p))])
                    g = ss((p - 0.8) / 0.2)                                    # each link turns gold as it reaches João 3:16
                    cols.append(connect_color(span_color(x, X316), g)); golds.append(g)
            draw_arcs(fr, polys, GOLD, 0.95, width=2, glow=0.9, colors=cols, gold=golds)
            sx, sy = float(cam.X(X316)), float(cam.Y(0))
            ray = ss((t - T["quote"] + 0.2) / 0.9)
            star_point(fr, sx, sy, 0.9 + 1.4 * ray, 14 + 10 * ray, rays=ray * (0.9 + 0.08 * math.sin(t * 2.0)), rot=0.05 * math.sin(t * 0.7))
            li = text_layer(["JOÃO 3:16"], font("grot", 120, 700), track=-0.01)
            o1 = win(t, T["isa96"] - 0.1, T["s9"] - 0.1, 0.2, 0.35)
            titled(fr, li, W / 2, 375, o1, 1.0 + 0.08 * (1 - eo3((t - T["isa96"]) / 0.4)), dark=0.95, blur=16)
            lq = text_layer(["“Porque Deus amou ao mundo", "de tal maneira, que deu", "o seu Filho unigênito.”"],
                            font("serifi", 64, 500), color=(255, 226, 170), lh=1.04)
            ln = text_layer([f"{N316} versículos ligados a ele"], font("mono", 34), color=(255, 214, 140), track=0.04)
            o2 = win(t, T["quote"], T["s9"] - 0.1, 0.4, 0.35)
            titled(fr, lq, W / 2, 545, o2, dark=0.95, blur=14); titled(fr, ln, W / 2, 682, o2)
        if t >= T["s9"] - 0.1:
            o3 = c01((t - T["s9"] + 0.1) / 0.4)
            lc1 = text_layer(["COMENTA TEU", "VERSÍCULO FAVORITO"], font("grot", 88, 700), track=-0.01,
                             spans=[[("COMENTA TEU", (255, 255, 255))], [("VERSÍCULO FAVORITO", (255, 214, 140))]])
            titled(fr, lc1, W / 2, 380, o3, 1.0 + 0.06 * (1 - eo3((t - T["s9"]) / 0.4)), dark=0.95, blur=16)
            lc2 = text_layer(["os mais pedidos ganham o próprio mapa"], font("serifi", 56, 500))
            titled(fr, lc2, W / 2, 515, c01((t - T["pedidos"] + 0.1) / 0.35))
            cr = text_layer([f"DADOS: OPENBIBLE.INFO (CC BY) · {fmt(N_ROWS)} REFERÊNCIAS CRUZADAS",
                             "GRÁFICO ORIGINAL: CHRIS HARRISON & CHRISTOPH RÖMHILD (2007)"], font("mono", 22), color=(170, 170, 180), track=0.02)
            titled(fr, cr, W / 2, 1478, o3 * 0.9, dark=0.8, blur=6)
    twinkles(fr, t)
    subtitle(fr, t)
    fr = fr * (1 - EDGE) + ROYAL * EDGE
    g = cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_NEAREST)
    fr += g[..., None] * 0.006
    return np.clip(fr, 0, 1)

def to8(fr): return (np.clip(fr, 0, 1) ** (1 / 1.04) * 255 + 0.5).astype(np.uint8)

if __name__ == "__main__":
    json.dump({k: round(v, 3) for k, v in T.items()}, open(WORK / "keys.json", "w"), indent=1)
    print(f"João 3:16: {N316} linked verses (x = {X316:.4f})")
    if "--still" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--still") + 1].split(",")]
        for tt in sorted(ts):
            fi = int(round(tt * FPS)); t1 = time.time(); img = to8(render(fi))
            cv2.imwrite(str(WORK / f"still-{tt:05.2f}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print(f"still {tt:.2f} ({time.time() - t1:.2f} s)")
        sys.exit(0)
    vid = WORK / "video.mp4"
    enc = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
           "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-colorspace", "bt709",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-x264-params", "aq-mode=3:deblock=-1,-1", str(vid)]
    pp = subprocess.Popen(enc, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    t1 = time.time()
    for fi in range(NF):
        pp.stdin.write(to8(render(fi)).tobytes())
        if fi % 150 == 0: print(f"frame {fi}/{NF}  {time.time() - t1:.0f} s", flush=True)
    pp.stdin.close(); err = pp.stderr.read().decode(); pp.wait()
    assert pp.returncode == 0, err[-2000:]
    print(f"video frames done in {time.time() - t1:.0f} s -> {vid}")
