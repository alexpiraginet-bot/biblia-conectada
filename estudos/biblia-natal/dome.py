#!/usr/bin/env python3
"""Cross-reference arcs (same engine and data as "A Bíblia, conectada"): the full dome, the 2,094 arcs between the Old
Testament and the four birth chapters, chapter bars and the diagram camera. Data: OpenBible.info (CC BY) via
../biblia-referencias/data/xref.npz (built by its tools/analyze.py from the same file, SHA-256 2aba58d2…).
"""
import math, sys, time
from pathlib import Path
import numpy as np, cv2

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "biblia-referencias"))
import arcs as A  # noqa: E402
from fx import *  # noqa: E402,F403

WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)

PAL_T = np.array([0.0, 0.22, 0.42, 0.62, 0.80, 1.0])
PAL_C = np.array([[0.16, 0.50, 1.00], [0.14, 0.26, 1.00], [0.55, 0.20, 1.00], [1.00, 0.16, 0.40], [1.00, 0.50, 0.12],
                  [1.00, 0.82, 0.36]], np.float32)
LUT = np.stack([np.interp(np.linspace(0, 1, 256), PAL_T, PAL_C[:, k]) for k in range(3)], -1).astype(np.float32)
def pal(t): return LUT[np.clip((np.asarray(t) * 255).astype(np.int32), 0, 255)]
T_ARC = (np.clip(A.SPAN, 0, 1) ** 0.55).astype(np.float32)


# ------------------------------------------------------------------ diagram camera (x in [0,1] Genesis..Revelation)
class DCam:
    def __init__(self, k=1000.0, fx=0.5, fh=0.0, ax=540, ay=1180):
        self.k, self.fx, self.fh, self.ax, self.ay = k, fx, fh, ax, ay
    def X(self, x): return self.ax + (np.asarray(x) - self.fx) * self.k
    def Y(self, h): return self.ay - (np.asarray(h) - self.fh) * self.k
    def mix(self, o, u):
        return DCam(*(lerp(a, b, u) for a, b in zip((self.k, self.fx, self.fh, self.ax, self.ay), (o.k, o.fx, o.fh, o.ax, o.ay))))


HOME = DCam()
DW = 1600


class Dome:
    def __init__(self):
        self.cv = A.Canvas(DW); self.DH = self.cv.DH; self.base = self.cv.base
        n = self.DH * DW
        self.den = np.zeros(n, np.float32); self.ts = np.zeros(n, np.float32)
        self.hd = np.zeros(n, np.float32); self.hts = np.zeros(n, np.float32)
        self.hero = A.VOTES >= 25

    def raster(self, j, foot=0.8, spacing=1.1):
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


DH = A.Canvas(DW).DH
BASE = A.Canvas(DW).base


def warp(img, cam, squash=1.0, sx=1.0, x_pivot=None):
    """diagram canvas (DW wide, baseline at row BASE) -> screen; squash pulls arcs onto the baseline; sx squeezes toward x_pivot"""
    s = cam.k / DW
    xp = cam.fx if x_pivot is None else x_pivot
    # screen x = ax + ((u/DW) - fx) * k, with an optional horizontal squeeze around xp
    a = s * sx
    bx = cam.ax + ((xp - cam.fx) - xp * sx) * cam.k
    M = np.array([[a, 0, bx], [0, s * squash, cam.ay + cam.fh * cam.k - (BASE / DW) * cam.k * squash]], np.float32)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


_FULL = {}


def full_dome():
    """the whole Bible (301,584 arcs) — cached on disk"""
    if "img" not in _FULL:
        p = WORK / "full_dome.npy"
        if p.exists():
            _FULL["img"] = np.load(p)
        else:
            t0 = time.time(); d = Dome()
            j = np.arange(len(A.PA)); j = j[A.VALID[j]]
            for s in range(0, len(j), 15000): d.raster(j[s:s + 15000])
            p99 = float(np.percentile(d.den[d.den > 0], 99.5))
            _FULL["img"] = d.image(p99); np.save(p, _FULL["img"])
            print(f"full dome {time.time() - t0:.1f} s")
    return _FULL["img"]


# ------------------------------------------------------------------ chapter bars on the baseline
CH_X = (np.arange(A.NCH) + 0.5) / A.NCH
CH_H = (6 + 104 * (A.CHAP_V / 176.0) ** 0.75).astype(np.float32)


def draw_bars(frame, cam, op=1.0, hscale=1.0, grow=1.0, hi=None, hi_col=GOLD, dim_from=None):
    """grow: 0..1 draws Genesis->Revelation; hi: set of chapter indices drawn in hi_col"""
    if op <= 0.002: return
    X = cam.X(CH_X); vis = (X > -20) & (X < W + 20) & (CH_X <= grow)
    if not vis.any(): return
    lay = np.zeros((H, W), np.uint8); lay2 = np.zeros((H, W), np.uint8)
    hs = CH_H * hscale * 0.62
    y0 = int(cam.Y(0) + 6)
    wpx = max(1, int(round(cam.k / A.NCH * 0.55)))
    for c in np.where(vis)[0]:
        x = X[c]
        tgt = lay2 if (hi is not None and c in hi) else lay
        cv2.line(tgt, (int(round(x * 16)), y0 * 16), (int(round(x * 16)), int((y0 + hs[c]) * 16)), 255, wpx, cv2.LINE_AA, 4)
    f = lay.astype(np.float32) / 255.0
    col = np.array([0.95, 0.88, 0.74], np.float32)
    frame += f[..., None] * col * (0.45 * op)
    frame += cv2.GaussianBlur(f, (0, 0), 5)[..., None] * col * (0.18 * op)
    if hi is not None:
        f2 = lay2.astype(np.float32) / 255.0
        frame += f2[..., None] * np.asarray(hi_col) * (1.3 * op)
        frame += cv2.GaussianBlur(f2, (0, 0), 7)[..., None] * np.asarray(hi_col) * (0.9 * op)
    x_end = int(cam.X(min(grow, 1.0)))
    frame[y0 - 3, max(0, int(cam.X(0))):max(0, min(W, x_end)), :] += col * (0.16 * op)


def arc_poly(x0, x1, cam, prog=1.0, n=160):
    r = abs(x1 - x0) / 2; cx = (x0 + x1) / 2; sgn = 1 if x1 >= x0 else -1
    th = np.linspace(0, np.pi * c01(prog), n)
    x = cx - sgn * r * np.cos(th); h = r * np.sin(th)
    return np.stack([cam.X(x), cam.Y(h)], -1)


# ------------------------------------------------------------------ the birth-chapter arcs (Old Testament -> Mt 1-2, Lc 1-2)
BOOK_OF = A.CHAP_BOOK[A.CHAP_OF]
CH_MT1 = int(A.BOOK_FIRST_CHAP[A.OSIS.index("Matt")]); CH_LC1 = int(A.BOOK_FIRST_CHAP[A.OSIS.index("Luke")])
BIRTH_CH = {CH_MT1, CH_MT1 + 1, CH_LC1, CH_LC1 + 1}
_birth = np.isin(A.CHAP_OF, list(BIRTH_CH))
_ot = BOOK_OF < 39
SEL = np.where(_ot[A.PA] & _birth[A.PB])[0]
N_PAIRS = len(SEL); N_OTV = len(np.unique(A.PA[SEL])); N_BOOKS = len(np.unique(BOOK_OF[A.PA[SEL]]))
assert (N_PAIRS, N_OTV, N_BOOKS) == (2094, 1561, 38), (N_PAIRS, N_OTV, N_BOOKS)
assert int(A.CHAP_V[list(BIRTH_CH)].sum()) == 180
JONAH = A.OSIS.index("Jonah")
assert JONAH not in set(BOOK_OF[A.PA[SEL]].tolist())
BX0, BX1 = A.XA[SEL].astype(np.float32), A.XB[SEL].astype(np.float32)
BCOL = A.COL[SEL]
BW = (0.7 + 0.6 * np.clip(np.log1p(np.maximum(A.VOTES[SEL], 0)) / np.log1p(150), 0, 1)).astype(np.float32)
X_MT = (CH_MT1 + 1.0) / A.NCH; X_LC = (CH_LC1 + 1.0) / A.NCH       # centre of each pair of chapters
X_OT_END = float(A.BOOK_FIRST_CHAP[39]) / A.NCH


def birth_arcs(prog, head=None, spacing=1.1):
    """accumulate the 2,094 arcs, each drawn from its Old-Testament end up to prog[i] (0..1) -> diagram image (DH, DW, 3)"""
    act = np.where(prog > 0.001)[0]
    acc = np.zeros((3, DH * DW), np.float32)
    if len(act):
        r = (BX1[act] - BX0[act]) * 0.5 * DW
        pa = prog[act]
        nn = np.maximum(3, np.ceil(np.pi * r * pa / spacing).astype(np.int64)); tot = int(nn.sum())
        rep = np.repeat(np.arange(len(act)), nn); start = np.repeat(np.cumsum(nn) - nn, nn)
        kk = (np.arange(tot) - start).astype(np.float32)
        th = (np.pi * pa)[rep] * kk / np.maximum(np.repeat(nn - 1, nn), 1).astype(np.float32)
        cx = ((BX0[act] + BX1[act]) * 0.5 * DW).astype(np.float32); rr = r.astype(np.float32)
        px = cx[rep] - rr[rep] * np.cos(th); py = BASE - rr[rep] * np.sin(th)
        pix = np.clip(np.rint(py).astype(np.int64), 0, DH - 1) * DW + np.clip(np.rint(px).astype(np.int64), 0, DW - 1)
        w = BW[act][rep] * (0.25 + 0.75 * np.clip(np.sin(th), 0, 1) ** 0.6)
        if head is not None:   # comet heads on the arcs still travelling
            thh = (np.pi * pa)[rep]
            w = w * (1 + 3.0 * np.exp(-(thh - th) / 0.12) * (pa < 0.999)[rep])
        col = BCOL[act][rep]
        for c in range(3):
            acc[c] = np.bincount(pix, weights=col[:, c] * w, minlength=DH * DW).astype(np.float32)
    img = acc.reshape(3, DH, DW).transpose(1, 2, 0)
    img = cv2.GaussianBlur(img, (0, 0), 0.7)
    y = 1 - np.exp(-img * 0.55)
    b = cv2.GaussianBlur(cv2.resize(y, (DW // 4, DH // 4), interpolation=cv2.INTER_AREA), (0, 0), 5)
    y = y + 0.55 * cv2.resize(b, (DW, DH)) + 0.25 * cv2.GaussianBlur(y, (0, 0), 4)
    return y.astype(np.float32)


# Isaiah 9:6 (the most connected verse) and its partners; the climax link Isaiah 9:6 -> Luke 2:11
G96 = A.ref_gv("Isa.9.6")
m96 = (A.PA == G96) | (A.PB == G96)
P96 = np.where(A.PA[m96] == G96, A.PB[m96], A.PA[m96]); P96 = np.unique(P96[P96 != G96])
assert len(P96) == 212, len(P96)
X96 = float(A.gv_x(G96)); XP96 = A.gv_x(P96)
X_LC211 = float(A.gv_x(A.ref_gv("Luke.2.11")))
