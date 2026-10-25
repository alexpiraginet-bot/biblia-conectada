#!/usr/bin/env python3
"""Draw the OT -> NT lines of "O Antigo dentro do Novo" as light layers (RGBA PNG) for the Remotion composition.

Every line is one real pair of data/lines.npz (tools/analyze.py): a cubic curve from the verse's place in its Old
Testament book (left column) to its place in its New Testament book (right column). The lines are accumulated as light
(density), tone-mapped and given a soft glow, so 67.293 threads read as one luminous weave.

Layout (data/layout.json) is shared with the composition: 1080x1920 chart units, books evenly spaced, each verse placed
inside its book's band by its position in the book. Layers are rendered at SCALE x for the zooms.

  python3 -I tools/layers.py   -> motion/public/layers/*.png + data/layout.json
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT.parent / "biblia-referencias/data"
D = np.load(REF / "xref.npz"); S = json.load(open(REF / "stats.json"))
CHAP_BOOK, CHAP_OF = D["chap_book"], D["chap_of_gv"]
BOOK = CHAP_BOOK[CHAP_OF]
L = np.load(ROOT / "data/lines.npz")
ST = json.load(open(ROOT / "data/stats.json"))

W, H, SCALE = 1080, 1920, 2
OT_X, NT_X, Y0, Y1 = 312.0, 768.0, 250.0, 1810.0
K = 0.56                                         # handle length of the S curve, fraction of the gap
first = np.searchsorted(BOOK, np.arange(67))     # verses are sorted by book
nverse = np.diff(first)
step_ot, step_nt = (Y1 - Y0) / 39, (Y1 - Y0) / 27
book_y = np.array([Y0 + (i + 0.5) * step_ot for i in range(39)] + [Y0 + (j + 0.5) * step_nt for j in range(27)])
half = np.array([0.40 * step_ot] * 39 + [0.40 * step_nt] * 27)


def vy(g):
    b = BOOK[g]
    frac = (g - first[b] + 0.5) / nverse[b]
    return book_y[b] + (frac - 0.5) * 2 * half[b]


def curves(ot, nt, n=None):
    """points of the cubic curves, (lines, samples, 2) in pixel units of the layer"""
    y0, y1 = vy(ot), vy(nt)
    dx = NT_X - OT_X
    n = n or 420
    t = np.linspace(0, 1, n)[None, :]
    a, b, c, d = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
    X = a * OT_X + b * (OT_X + K * dx) + c * (NT_X - K * dx) + d * NT_X
    Y = (a + b) * y0[:, None] + (c + d) * y1[:, None]
    return np.stack([np.broadcast_to(X, Y.shape), Y], -1) * SCALE


def density(ot, nt, w, chunk=3000, n=420):
    acc = np.zeros(W * SCALE * H * SCALE, np.float64)
    WW = W * SCALE
    for i in range(0, len(ot), chunk):
        P = curves(ot[i:i + chunk], nt[i:i + chunk], n)
        ww = np.repeat(w[i:i + chunk], P.shape[1])
        x, y = P[..., 0].ravel(), P[..., 1].ravel()
        x0, y0 = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
        fx, fy = x - x0, y - y0
        for dx_, dy_, ww_ in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            xi, yi = x0 + dx_, y0 + dy_
            m = (xi >= 0) & (xi < WW) & (yi >= 0) & (yi < H * SCALE)
            acc += np.bincount(yi[m] * WW + xi[m], weights=(ww * ww_)[m], minlength=acc.size)
    return acc.reshape(H * SCALE, W * SCALE)


def ramp(I, stops):
    """piecewise-linear colour ramp over I in [0,1]; stops = [(pos, (r,g,b)), ...]"""
    out = np.zeros(I.shape + (3,))
    pos = np.array([p for p, _ in stops]); col = np.array([c for _, c in stops], float)
    for ch in range(3):
        out[..., ch] = np.interp(I, pos, col[:, ch])
    return out


def save(name, dens, q, stops, glow=0.55, sigma=1.0, gsig=9.0, at=0.5):
    """q: density percentile (over lit pixels) that maps to brightness `at` (the tone curve is 1 - exp(-k d))"""
    d = gaussian_filter(dens, sigma)
    k = -np.log(1 - at) / np.percentile(d[d > 1e-3], q)
    I = 1 - np.exp(-k * d)
    G = 1 - np.exp(-k * 0.35 * gaussian_filter(dens, gsig * SCALE / 2))
    a = np.clip(I + glow * G, 0, 1)
    rgb = ramp(np.clip(I * 0.85 + 0.25 * G, 0, 1), stops)
    img = np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)
    out = ROOT / "motion/public/layers"; out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img, "RGBA").save(out / f"{name}.png", optimize=True)
    print(name, f"{(out / f'{name}.png').stat().st_size / 1e6:.1f} MB", "max I", round(float(I.max()), 3))


BLUE = [(0, (24, 70, 210)), (0.35, (41, 128, 255)), (0.7, (130, 190, 255)), (1, (225, 240, 255))]
GOLD = [(0, (150, 90, 20)), (0.35, (231, 170, 70)), (0.7, (255, 214, 120)), (1, (255, 246, 220))]
ORANGE = [(0, (200, 70, 10)), (0.4, (255, 128, 31)), (0.75, (255, 190, 90)), (1, (255, 240, 200))]
WHITE = [(0, (180, 150, 90)), (0.4, (255, 220, 150)), (1, (255, 255, 245))]

ot, nt, votes = L["ot"].astype(np.int64), L["nt"].astype(np.int64), L["votes"].astype(np.float64)
w = 0.55 + 0.45 * np.clip(np.log1p(np.maximum(votes, 0)) / np.log1p(300), 0, 1)
dens = density(ot, nt, w)
save("blue", dens, 88, BLUE, at=0.66)
save("gold", dens, 88, GOLD, at=0.6)
lo, ln = L["lit_ot"].astype(np.int64), L["lit_nt"].astype(np.int64)
save("orange", density(lo, ln, np.full(len(lo), 1.0), n=1600), 60, ORANGE, glow=0.8, sigma=1.4, gsig=7, at=0.7)
HL = {"psalms": ("Ps", "ot"), "isaiah": ("Isa", "ot"), "malachi": ("Mal", "ot"), "matthew": ("Matt", "nt")}
for name, (osis, side) in HL.items():
    b = S["osis"].index(osis)
    m = (BOOK[ot] == b) if side == "ot" else (BOOK[nt] == b)
    save(name, density(ot[m], nt[m], w[m], n=900), 85, WHITE, glow=0.6, at=0.7)


def pts(o, n_):
    return (curves(np.array([o]), np.array([n_]), n=48)[0] / SCALE).round(1).tolist()


gv = {}
for r in ("Gen.1.1", "John.1.1", "Isa.7.14", "Matt.1.23", "Isa.61.1", "Luke.4.18"):
    bk, c, v = r.split(".")
    ch = int(np.where(CHAP_BOOK == S["osis"].index(bk))[0][0]) + int(c) - 1
    gv[r] = int(D["chap_first"][ch]) + int(v) - 1
rng = np.random.default_rng(6)
pw = np.maximum(votes, 1.0) ** 0.7
pick = rng.choice(len(ot), 110, replace=False, p=pw / pw.sum())        # the travelling lights ride real pairs
lpick = rng.choice(len(lo), 36, replace=False)
layout = {"W": W,
          "pulses": [[round(float(vy(ot[i])), 1), round(float(vy(nt[i])), 1)] for i in pick],
          "litPulses": [[round(float(vy(lo[i])), 1), round(float(vy(ln[i])), 1)] for i in lpick], "k": K, "H": H, "scale": SCALE, "otX": OT_X, "ntX": NT_X, "y0": Y0, "y1": Y1,
          "ot": [{"pt": b["pt"], "links": b["links"], "y": round(float(book_y[i]), 2), "perVerse": b["per_verse"]}
                 for i, b in enumerate(ST["ot_books"])],
          "nt": [{"pt": b["pt"], "links": b["links"], "y": round(float(book_y[39 + j]), 2)} for j, b in enumerate(ST["nt_books"])],
          "curves": {f"{a}~{b}": pts(gv[a], gv[b]) for a, b in (("Gen.1.1", "John.1.1"), ("Isa.7.14", "Matt.1.23"),
                                                                ("Isa.61.1", "Luke.4.18"))}}
json.dump(layout, open(ROOT / "data/layout.json", "w"), ensure_ascii=False)
print("layout ok:", len(layout["ot"]), "+", len(layout["nt"]), "books")
