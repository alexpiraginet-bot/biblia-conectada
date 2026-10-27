"""Arc engine for the Bible cross-reference film: geometry, stained-glass colouring, additive rasterizer, tone map.

Diagram space: x in [0,1] = Genesis 1:1 .. Revelation 22:21, chapters equally spaced (as in Harrison & Romhild 2007),
verse offset inside its chapter. Each unique verse pair is a semicircle above the baseline.
"""
import json
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "biblia-referencias/data"   # same base as the original film (OpenBible.info, CC BY)
D = np.load(DATA / "xref.npz")
STATS = json.load(open(DATA / "stats.json"))
PA, PB, VOTES = D["a"].astype(np.int64), D["b"].astype(np.int64), D["votes"].astype(np.int64)
CHAP_V, CHAP_FIRST, CHAP_BOOK, CHAP_OF = D["chap_verses"], D["chap_first"], D["chap_book"], D["chap_of_gv"]
NCH, NV = len(CHAP_V), len(CHAP_OF)
OSIS, BOOKS_PT = STATS["osis"], STATS["books_pt"]
BOOK_FIRST_CHAP = np.array([int(np.where(CHAP_BOOK == i)[0][0]) for i in range(66)])


def gv_x(g):
    g = np.asarray(g); c = CHAP_OF[g]
    return (c + (g - CHAP_FIRST[c] + 0.5) / CHAP_V[c]) / NCH


def ref_gv(ref):
    """'Isa.9.6' -> global verse index"""
    bk, c, v = ref.split(".")
    ch = BOOK_FIRST_CHAP[OSIS.index(bk)] + int(c) - 1
    assert int(v) <= CHAP_V[ch], ref
    return int(CHAP_FIRST[ch]) + int(v) - 1


XA, XB = gv_x(PA), gv_x(PB)
SPAN = XB - XA
NARC = len(PA)
# keep self-pairs out (zero-length arcs)
VALID = SPAN > 1e-6

# stained glass palette by span (short -> long): cobalt, ultramarine, violet, ruby, amber, gold
PAL_T = np.array([0.0, 0.18, 0.38, 0.6, 0.82, 1.0])
PAL_C = np.array([[0.10, 0.30, 1.00], [0.25, 0.20, 1.00], [0.62, 0.22, 1.00], [1.00, 0.16, 0.42], [1.00, 0.52, 0.12],
                  [1.00, 0.80, 0.36]], np.float32)


def palette(t):
    t = np.clip(t, 0, 1)
    return np.stack([np.interp(t, PAL_T, PAL_C[:, k]) for k in range(3)], -1).astype(np.float32)


T_COL = np.clip(SPAN / 0.85, 0, 1) ** 0.62
COL = palette(T_COL)
W_ARC = (0.55 + 0.45 * np.clip(np.log1p(np.maximum(VOTES, 0)) / np.log1p(150), 0, 1)).astype(np.float32)
RNG = np.random.default_rng(2007)
ORDER = RNG.permutation(NARC)          # reveal order for the counter build (uniform density, not left-to-right)
RANK = np.empty(NARC, np.int64); RANK[ORDER] = np.arange(NARC)


class Canvas:
    """additive RGB accumulator in diagram space: width DW px for x in [0,1]; baseline on the last row"""

    def __init__(self, DW=1600, margin=8):
        self.DW = DW; self.DH = DW // 2 + margin; self.base = self.DH - 1 - margin // 2
        self.acc = np.zeros((3, self.DH * self.DW), np.float32)

    def clear(self):
        self.acc[:] = 0

    def add(self, idx, spacing=1.15, gain=1.0, colors=None, weights=None, chunk=12000):
        idx = np.asarray(idx); idx = idx[VALID[idx]]
        for s in range(0, len(idx), chunk):
            j = idx[s:s + chunk]
            r = SPAN[j] * 0.5 * self.DW
            n = np.maximum(3, np.ceil(np.pi * r / spacing).astype(np.int64))
            tot = int(n.sum())
            rep = np.repeat(np.arange(len(j)), n)
            start = np.repeat(np.cumsum(n) - n, n)
            k = (np.arange(tot) - start).astype(np.float32)
            th = np.pi * k / np.repeat(n - 1, n).astype(np.float32)
            cx = ((XA[j] + XB[j]) * 0.5 * self.DW).astype(np.float32)
            px = cx[rep] - r.astype(np.float32)[rep] * np.cos(th)
            py = self.base - r.astype(np.float32)[rep] * np.sin(th)
            ix = np.clip(np.rint(px).astype(np.int64), 0, self.DW - 1)
            iy = np.clip(np.rint(py).astype(np.int64), 0, self.DH - 1)
            pix = iy * self.DW + ix
            col = (colors[s:s + chunk] if colors is not None else COL[j])
            w = (weights[s:s + chunk] if weights is not None else W_ARC[j]) * gain
            for c in range(3):
                self.acc[c] += np.bincount(pix, weights=(col[:, c] * w)[rep], minlength=self.DH * self.DW).astype(np.float32)

    def image(self):
        return self.acc.reshape(3, self.DH, self.DW).transpose(1, 2, 0)


def tonemap(lin, exposure=1.0, bloom=0.55):
    """linear additive light -> display RGB float [0,1]: soft blur (AA), filmic shoulder, two-scale bloom"""
    x = cv2.GaussianBlur(lin, (0, 0), 0.6) * exposure
    y = 1.0 - np.exp(-x)
    if bloom > 0:
        b1 = cv2.GaussianBlur(y, (0, 0), 6)
        b2 = cv2.GaussianBlur(cv2.resize(y, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA), (0, 0), 7)
        b2 = cv2.resize(b2, (y.shape[1], y.shape[0]), interpolation=cv2.INTER_LINEAR)
        y = y + bloom * (0.55 * b1 + 0.45 * b2)
    return np.clip(y, 0, 1.5)
