#!/usr/bin/env python3
"""Shared 2D helpers for the film: easing, fonts, cached text layers, glow lines, light points, odometer counters,
grain and vignette. Frames are float32 RGB in display space (0..1, additive light allowed above 1 before the final clip).
"""
import math
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
W, H = 1080, 1920
GOLD = np.array([1.0, 0.80, 0.42], np.float32)
WARM = np.array([1.0, 0.93, 0.80], np.float32)
WHITE = np.array([1.0, 1.0, 1.0], np.float32)
GOLD8 = (255, 210, 130)


# ------------------------------------------------------------------ easing
def c01(x): return 0.0 if x <= 0 else 1.0 if x >= 1 else float(x)
def ss(x): x = c01(x); return x * x * (3 - 2 * x)
def eo3(x): x = c01(x); return 1 - (1 - x) ** 3
def ei3(x): x = c01(x); return x ** 3
def eio(x): x = c01(x); return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def eio2(x): x = c01(x); return 2 * x * x if x < 0.5 else 1 - (-2 * x + 2) ** 2 / 2
def expo(x): x = c01(x); return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)
def back(x, s=1.6): x = c01(x); return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2
def lerp(a, b, u): return a + (b - a) * u
def win(t, a, b, fi=0.25, fo=0.25):
    if t < a or t > b: return 0.0
    return min(c01((t - a) / fi) if fi > 0 else 1.0, c01((b - t) / fo) if fo > 0 else 1.0)


# ------------------------------------------------------------------ fonts and text
FD = ROOT / "assets/fonts"
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


_TC, _SC = {}, {}


def text_layer(lines, fnt, color=(255, 255, 255), track=0.0, align="c", lh=1.12, spans=None):
    """lines: list of str; spans: optional per-line list of (text, rgb) runs -> (premultiplied rgb float, alpha float)"""
    key = (tuple(lines), id(fnt), tuple(color), track, align, lh, repr(spans))
    if key in _TC: return _TC[key]
    if len(_TC) > 300: _TC.clear(); _SC.clear()
    asc, desc = fnt.getmetrics(); lh_px = int((asc + desc) * lh)
    runs_all = spans or [[(ln, color)] for ln in lines]

    def width(runs):
        w = 0.0
        for txt, _ in runs:
            for ch in txt: w += fnt.getlength(ch) + track * fnt.size
        return w - (track * fnt.size if any(t for t, _ in runs) else 0)
    ws = [width(r) for r in runs_all]
    pad = 14
    Wd = int(max(ws) + 2 * pad) + 1; Hd = int(lh_px * len(runs_all) + 2 * pad)
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
    _TC[key] = (rgb, al)
    return rgb, al


def paste(frame, layer, cx, cy, op=1.0, scale=1.0, anchor="c", add=False, tint=None):
    if op <= 0.002: return
    rgb, al = layer
    if scale != 1.0:
        if scale <= 0.01: return
        rgb = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        al = cv2.resize(al, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    if tint is not None: rgb = rgb * np.asarray(tint, np.float32)
    h, w = al.shape
    x0 = int(round(cx - (w / 2 if anchor == "c" else 0 if anchor == "l" else w))); y0 = int(round(cy - h / 2))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb: return
    sr = rgb[ya - y0:yb - y0, xa - x0:xb - x0] * op; sa = al[ya - y0:yb - y0, xa - x0:xb - x0, None] * op
    if add:
        frame[ya:yb, xa:xb] += sr
    else:
        frame[ya:yb, xa:xb] = frame[ya:yb, xa:xb] * (1 - sa) + sr


def shadow(frame, layer, cx, cy, op, scale=1.0, anchor="c", dark=0.6, blur=10):
    if op <= 0.002: return
    key = (id(layer[1]), dark, blur)
    if key not in _SC:
        rgb, al = layer
        pad = int(blur * 2.5)
        alp = np.pad(al, pad)
        _SC[key] = (np.zeros(alp.shape + (3,), np.float32), np.clip(cv2.GaussianBlur(alp, (0, 0), blur) * dark * 1.4, 0, 1))
    sh = _SC[key]
    paste(frame, sh, cx + (0 if anchor == "c" else (-1 if anchor == "l" else 1) * (sh[1].shape[1] - layer[1].shape[1]) / 2 * scale),
          cy, op, scale, anchor)


def titled(fr, lay, x, y, op, sc=1.0, anchor="c", dark=0.85, blur=14):
    shadow(fr, lay, x, y, op, sc, anchor, dark=dark, blur=blur); paste(fr, lay, x, y, op, sc, anchor)


# ------------------------------------------------------------------ light
def star_point(frame, x, y, inten=1.0, rad=18, rays=0.0, rot=0.0, col=None):
    """soft light point; rays>0 adds a 4+4 ray star"""
    if inten <= 0.001: return
    R = int(rad * 6 + rays * 520)
    xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R)), int(max(0, y - R)), int(min(H, y + R))
    if xa >= xb or ya >= yb: return
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32); dx, dy = xx - x, yy - y; r2 = dx * dx + dy * dy
    g = np.exp(-r2 / (2 * rad * rad)) + 0.35 * np.exp(-r2 / (2 * (rad * 3) ** 2))
    if rays > 0:
        c, s = math.cos(rot), math.sin(rot)
        u, v = dx * c + dy * s, -dx * s + dy * c
        L = 520 * rays
        g += 0.9 * np.exp(-(v * v) / 3.5) * np.exp(-np.abs(u) / L) + 0.9 * np.exp(-(u * u) / 3.5) * np.exp(-np.abs(v) / L)
        c2, s2 = math.cos(rot + math.pi / 4), math.sin(rot + math.pi / 4)
        u2, v2 = dx * c2 + dy * s2, -dx * s2 + dy * c2
        g += 0.4 * np.exp(-(v2 * v2) / 2.0) * np.exp(-np.abs(u2) / (L * 0.4)) + 0.4 * np.exp(-(u2 * u2) / 2.0) * np.exp(-np.abs(v2) / (L * 0.4))
    frame[ya:yb, xa:xb] += g[..., None] * (WARM if col is None else np.asarray(col, np.float32)) * inten


def glow_lines(frame, polys, color, width=2, core=1.0, glow=1.0, big=1.0, closed=False):
    """polylines (list of (N,2) screen arrays) as light: AA core + small and wide bloom"""
    pts = []
    for p in polys:
        if p is None or len(p) < 2: continue
        p = np.asarray(p, np.float64)
        p = p[np.isfinite(p).all(1)]                      # projected points can blow up near the camera plane
        if len(p) < 2: continue
        pts.append(np.round(np.clip(p, -20000, 20000) * 16).astype(np.int32))
    if not pts: return
    lay = np.zeros((H, W), np.uint8)
    cv2.polylines(lay, pts, closed, 255, max(1, int(width)), cv2.LINE_AA, 4)
    f = lay.astype(np.float32) / 255.0
    col = np.asarray(color, np.float32)
    frame += f[..., None] * col * core
    if glow > 0:
        frame += cv2.GaussianBlur(f, (0, 0), 4)[..., None] * col * (0.8 * glow)
    if big > 0:
        sm = cv2.resize(f, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        frame += cv2.resize(cv2.GaussianBlur(sm, (0, 0), 5), (W, H))[..., None] * col * (1.3 * big)


def dashes(poly, dash=26.0, gap=16.0, phase=0.0):
    """split a screen polyline into dash polylines by arc length"""
    p = np.asarray(poly, np.float64)
    if len(p) < 2: return []
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    L = seg[-1]; out = []
    s = -phase % (dash + gap) - (dash + gap)
    while s < L:
        a, b = max(s, 0), min(s + dash, L)
        if b > a:
            ss_ = np.linspace(a, b, max(2, int((b - a) / 4)))
            out.append(np.stack([np.interp(ss_, seg, p[:, 0]), np.interp(ss_, seg, p[:, 1])], 1))
        s += dash + gap
    return out


# ------------------------------------------------------------------ odometer counter (digits roll like a mechanical counter)
_STRIP = {}


def _strip(fnt, color):
    key = (id(fnt), tuple(color))
    if key not in _STRIP:
        asc, desc = fnt.getmetrics(); lh = int((asc + desc) * 1.02)
        cw = int(math.ceil(max(fnt.getlength(str(d)) for d in range(10))))
        im = Image.new("RGBA", (cw + 8, lh * 11), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        for k in range(11):
            ch = str(k % 10)
            d.text((4 + (cw - fnt.getlength(ch)) / 2, k * lh), ch, font=fnt, fill=tuple(color) + (255,))
        a = np.asarray(im).astype(np.float32) / 255
        _STRIP[key] = (a[..., :3] * a[..., 3:4], a[..., 3].copy(), lh, cw + 8)
    return _STRIP[key]


def odometer(frame, value, cx, cy, fnt, color=(255, 255, 255), digits=None, sep=".", op=1.0, speed=0.0, anchor="c",
             prefix="", suffix="", pfont=None, scolor=None):
    """draw value (float, >=0) as rolling digits; speed = value change per frame (for motion blur of the fast digits)"""
    if op <= 0.002: return 0
    v = max(0.0, float(value))
    n = digits or max(1, len(str(int(v))))
    rgb_s, al_s, lh, cw = _strip(fnt, color)
    cols = []
    for i in range(n - 1, -1, -1):
        p = 10 ** i
        base = math.floor(v / p) % 10
        low = v % p
        frac = c01(low - (p - 1)) if i > 0 else v % 1.0
        pos = (base + frac) % 10
        visible = v >= p or i == 0
        cols.append((pos, visible, i))
    sep_lay = text_layer([sep], fnt, color) if sep else None
    sep_w = int(fnt.getlength(sep) * 0.9) if sep else 0
    pre = text_layer([prefix], pfont or fnt, scolor or color) if prefix else None
    suf = text_layer([suffix], pfont or fnt, scolor or color) if suffix else None
    nvis = sum(1 for c in cols if c[1])
    gaps = sum(1 for _, vis, i in cols if vis and i > 0 and i % 3 == 0)
    total = nvis * (cw - 8) + gaps * sep_w + (pre[1].shape[1] - 28 if pre else 0) + (suf[1].shape[1] - 28 if suf else 0)
    x = cx - total / 2 if anchor == "c" else cx if anchor == "l" else cx - total
    y0 = int(round(cy - lh / 2))
    if pre:
        paste(frame, pre, x - 14, cy, op, anchor="l"); x += pre[1].shape[1] - 28
    for pos, vis, i in cols:
        if not vis: continue
        r0 = pos * lh
        a0 = int(math.floor(r0)); fr_ = r0 - a0
        rows = np.arange(a0, a0 + lh + 1) % (lh * 10)
        cr = rgb_s[rows]; ca = al_s[rows]
        cr = cr[:-1] * (1 - fr_) + cr[1:] * fr_; ca = ca[:-1] * (1 - fr_) + ca[1:] * fr_
        sp = abs(speed) / (10 ** i)
        k = int(min(lh * 0.9, sp * lh * 0.9))
        if k >= 3:
            cr = cv2.blur(cr, (1, k)); ca = cv2.blur(ca, (1, k))
        xa = int(round(x)) - 4
        x0c, x1c = max(0, xa), min(W, xa + cw)
        y0c, y1c = max(0, y0), min(H, y0 + lh)
        if x0c < x1c and y0c < y1c:
            sr = cr[y0c - y0:y1c - y0, x0c - xa:x1c - xa] * op; sa = ca[y0c - y0:y1c - y0, x0c - xa:x1c - xa, None] * op
            frame[y0c:y1c, x0c:x1c] = frame[y0c:y1c, x0c:x1c] * (1 - sa) + sr
        x += cw - 8
        if sep and i > 0 and i % 3 == 0:
            paste(frame, sep_lay, x + sep_w / 2 - 2, cy + lh * 0.05, op); x += sep_w
    if suf:
        paste(frame, suf, x - 14, cy, op, anchor="l"); x += suf[1].shape[1] - 28
    return total


# ------------------------------------------------------------------ post
_rng = np.random.default_rng(7)
_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGN = (1 - 0.50 * (((_xx - W / 2) / (W * 0.78)) ** 2 + ((_yy - H * 0.50) / (H * 0.66)) ** 2)).clip(0.30, 1)[..., None]
GRAIN = [_rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(8)]
del _yy, _xx


def finish(fr, fi, grain=0.010):
    fr *= VIGN
    g = cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_LINEAR)
    lum = fr.mean(-1, keepdims=True)
    fr += g[..., None] * grain * (0.35 + 0.65 * np.clip(1 - lum, 0, 1))
    # soft shoulder for additive light above 1
    over = np.maximum(fr - 0.85, 0)
    fr = np.where(fr > 0.85, 0.85 + over / (1 + over * 4.0), fr)
    return (np.clip(fr, 0, 1) * 255 + 0.5).astype(np.uint8)
