"""Render engine shared with "A Bíblia, conectada" (biblia-referencias/film.py, 18/10/2026), copied verbatim so this
video keeps the exact look: easing, fonts and cached text layers, camera, dome rasterizer, chapter bars, draw-on arcs,
light points/star, dust, vignette and grain. Only the module header (paths, the shared `dome`) is new.
"""
import math, sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "biblia-referencias"))
import arcs as A  # noqa: E402  (data: ../biblia-referencias/data/xref.npz)

W, H, FPS = 1080, 1920, 30

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


# ------------------------------------------------------------------ palette / fonts
GOLD = np.array([1.0, 0.80, 0.42], np.float32); WHITE = np.array([1, 1, 1], np.float32)
PAL_T = np.array([0.0, 0.22, 0.42, 0.62, 0.80, 1.0])
PAL_C = np.array([[0.16, 0.50, 1.00], [0.14, 0.26, 1.00], [0.55, 0.20, 1.00], [1.00, 0.16, 0.40], [1.00, 0.50, 0.12],
                  [1.00, 0.82, 0.36]], np.float32)
LUT = np.stack([np.interp(np.linspace(0, 1, 256), PAL_T, PAL_C[:, k]) for k in range(3)], -1).astype(np.float32)
def pal(t): return LUT[np.clip((t * 255).astype(np.int32), 0, 255)]
T_ARC = (np.clip(A.SPAN, 0, 1) ** 0.55).astype(np.float32)

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


# ------------------------------------------------------------------ text layers (PIL -> premultiplied float RGBA, cached)
_TC = {}
def text_layer(lines, fnt, color=(255, 255, 255), track=0.0, align="c", lh=1.12, glow=0.0, spans=None):
    """lines: list of str. spans: optional per-line list of (text, rgb) runs. Returns (rgb premult float, alpha float)"""
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
    if glow > 0:
        g = cv2.GaussianBlur(al, (0, 0), glow)
        rgb = rgb + 0.55 * g[..., None] * (rgb.max(axis=(0, 1)) if rgb.max() > 0 else 1)
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
    """soft dark halo under text so it reads over bright arcs (cached per layer)"""
    if op <= 0.002: return
    key = (id(layer[1]), dark, blur)
    if key not in _SC:
        rgb, al = layer
        _SC[key] = (np.zeros_like(rgb), np.clip(cv2.GaussianBlur(al, (0, 0), blur) * dark * 1.4, 0, 1))
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
            hj = j[h]; hm = h[rep]
            # hero strands: same points, crisper and brighter
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
        sh = (self.DH, DW)
        d = cv2.GaussianBlur(self.den.reshape(sh), (0, 0), 1.0)
        t = cv2.GaussianBlur(self.ts.reshape(sh), (0, 0), 1.0) / np.maximum(d, 1e-6)
        base = pal(t) * (0.30 * np.clip(d / p99, 0, 1.3) ** 0.9)[..., None]
        hb_ = cv2.GaussianBlur(self.hd.reshape(sh), (0, 0), 0.6)
        ht = cv2.GaussianBlur(self.hts.reshape(sh), (0, 0), 0.6) / np.maximum(hb_, 1e-6)
        img = base + pal(ht) * (1 - np.exp(-hb_ * he))[..., None]
        b1 = cv2.GaussianBlur(img, (0, 0), 8)
        sm = cv2.resize(img, (DW // 4, self.DH // 4), interpolation=cv2.INTER_AREA)
        b2 = cv2.resize(cv2.GaussianBlur(sm, (0, 0), 9), (DW, self.DH), interpolation=cv2.INTER_LINEAR)
        img = img + 0.35 * b1 + 0.25 * b2
        return (img / (1 + 0.25 * img)).astype(np.float32)

def warp_dome(img, cam, squash=1.0):
    """diagram canvas -> screen with the camera; squash<1 pulls the dome down onto the baseline"""
    s = cam.k / DW
    M = np.array([[s, 0, cam.ax - cam.fx * cam.k], [0, s * squash, cam.ay - (dome.base / DW - cam.fh) * cam.k * squash]], np.float32)
    # cam.ay - ((base - v)/DW - fh)*k  ->  y = s*v + ay - (base/DW - fh)*k   (squash scales around the baseline)
    M[1, 2] = cam.ay + cam.fh * cam.k - (dome.base / DW) * cam.k * squash
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

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
    col = np.array([0.95, 0.88, 0.74], np.float32)
    frame += f[..., None] * col * (0.55 * op)
    if glow:
        frame += cv2.GaussianBlur(f, (0, 0), 6)[..., None] * col * (0.25 * op)
    # baseline hairline
    frame[y0 - 3, :, :] += col * (0.18 * op)

# ------------------------------------------------------------------ highlight arcs (few, screen space, draw-on)
def arc_poly(x0, x1, cam, prog=1.0, n=160):
    r = abs(x1 - x0) / 2; cx = (x0 + x1) / 2; sgn = 1 if x1 >= x0 else -1
    th = np.linspace(0, np.pi * c01(prog), n)
    x = cx - sgn * r * np.cos(th); h = r * np.sin(th)
    return np.stack([cam.X(x), cam.Y(h)], -1)

def draw_arcs(frame, polys, color, width=2, core=1.0, glow=1.0, head=False):
    if not polys: return
    lay = np.zeros((H, W), np.uint8)
    pts = [np.round(p * 16).astype(np.int32) for p in polys if len(p) > 1]
    cv2.polylines(lay, pts, False, 255, width, cv2.LINE_AA, 4)
    f = lay.astype(np.float32) / 255.0
    frame += f[..., None] * color * core
    if glow > 0:
        frame += cv2.GaussianBlur(f, (0, 0), 5)[..., None] * color * (0.9 * glow)
        sm = cv2.resize(f, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        frame += cv2.resize(cv2.GaussianBlur(sm, (0, 0), 6), (W, H))[..., None] * color * (1.2 * glow)
    if head:
        for p in polys:
            if len(p) > 1: star_point(frame, p[-1][0], p[-1][1], 0.9, 16)

def star_point(frame, x, y, inten=1.0, rad=18, rays=0.0, rot=0.0):
    """soft light point; rays>0 adds a 4+4 ray star (the Bethlehem moment)"""
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
    col = np.array([1.0, 0.93, 0.78], np.float32)
    frame[ya:yb, xa:xb] += g[..., None] * col * inten

# ------------------------------------------------------------------ static textures
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIGN = (1 - 0.55 * (((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.52) / (H * 0.62)) ** 2)).clip(0.25, 1)[..., None]
BG = np.zeros((H, W, 3), np.float32)
BG += (np.exp(-(((xx - W / 2) / 700) ** 2 + ((yy - Y_BASE + 300) / 900) ** 2)) * 0.035)[..., None] * np.array([0.35, 0.3, 0.6], np.float32)
GRAIN = [rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]
del yy, xx

DUST_N = 110
_dr = np.random.default_rng(11)
DUST = {"x": _dr.uniform(0, W, DUST_N), "y": _dr.uniform(0, H, DUST_N), "s": _dr.uniform(0.6, 3.0, DUST_N) ** 1.4,
        "b": _dr.uniform(0.02, 0.12, DUST_N), "v": _dr.uniform(4, 18, DUST_N), "ph": _dr.uniform(0, 6.28, DUST_N)}
DUST_COL = np.array([1.0, 0.9, 0.75], np.float32)

def dust(fr, t, op=1.0):
    """slow motes in the air: depth without stealing attention"""
    for i in range(DUST_N):
        x = (DUST["x"][i] + 14 * math.sin(t * 0.3 + DUST["ph"][i])) % W
        y = (DUST["y"][i] - DUST["v"][i] * t) % H
        s = DUST["s"][i]; b = DUST["b"][i] * op * (0.6 + 0.4 * math.sin(t * 1.3 + DUST["ph"][i]))
        R = int(s * 3) + 2
        xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R + 1)), int(max(0, y - R)), int(min(H, y + R + 1))
        if xa >= xb or ya >= yb: continue
        gy, gx_ = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        fr[ya:yb, xa:xb] += np.exp(-((gx_ - x) ** 2 + (gy - y) ** 2) / (2 * s * s))[..., None] * (DUST_COL * b)

def titled(fr, lay, x, y, op, sc=1.0, anchor="c", dark=0.85, blur=14):
    shadow(fr, lay, x, y, op, sc, anchor, dark=dark, blur=blur); paste(fr, lay, x, y, op, sc, anchor)

Z_MAIN = 1.22   # the dome slightly wider than the screen: immersive, edges bleed off

def to8(fr): return (np.clip(fr, 0, 1) ** (1 / 1.06) * 255 + 0.5).astype(np.uint8)

dome = Dome()   # warp_dome() reads dome.base
def fmt(n): return f"{n:,}".replace(",", ".")
