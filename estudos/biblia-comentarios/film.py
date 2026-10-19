#!/usr/bin/env python3
""""Os versículos de vocês" — Reels 9:16 answering the comments of "A Bíblia, conectada" (18/10/2026).

Video 1 ended with "comenta teu versículo favorito: os mais pedidos ganham o próprio mapa". Here every verse cited in the
comments (Alex's 5 screenshots, 19/10) gets its map: its real cross-references (OpenBible.info, CC BY) drawn as gold arcs
converging on it, with the @ of who asked. Bible order, Psalms -> Revelation, so the star travels along the Bible.
Finale: all of them together (1.024 verses, 59 of 66 books) and the three people whose verses were already linked.
Same engine and look as video 1 (engine.py). Numbers: data/stats.json (tools/analyze.py). Timeline: narration.

  python3 film.py --still 1.0,12.5   -> renders/.film/still-<t>.jpg
  python3 film.py                     -> renders/.film/video.mp4  (then score.py, finalize.py)
"""
import json, math, subprocess, sys, time
import numpy as np
import cv2
from engine import *  # noqa: F401,F403  (W, H, FPS, A, Cam, Dome, text_layer, ...)
from engine import ROOT, A, Cam, Dome, font, text_layer, paste, shadow, titled, warp_dome, draw_bars, arc_poly, \
    draw_arcs, star_point, dust, to8, fmt, c01, ss, eo3, eio, expo, lerp, win, GOLD, VIGN, BG, GRAIN, Y_BASE, Z_MAIN, W, H, FPS

WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
NARR = json.load(open(WORK / "narr.json"))
LN = {L["i"]: L for L in NARR["lines"]}
DUR = NARR["duration"]; NF = int(round(DUR * FPS))
S = json.load(open(ROOT / "data/stats.json"))
ITEMS = S["items"]; NI = len(ITEMS)
assert NI == 19 and S["union_any"] == 1024 and S["union_books"] == 59 and S["n_comments_citing"] == 20


def LS(i): return LN[i]["t0"]
def WT(i, k): return LN[i]["words"][k]["t0"]
def WE(i, k): return LN[i]["words"][k]["t1"]


def WFIND(i, needle):
    """index of the first word of line i whose text contains needle (case/accents/punctuation ignored)"""
    import unicodedata
    def n(s): return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if c.isalnum())
    for k, w in enumerate(LN[i]["words"]):
        if n(needle) in n(w["w"]): return k
    raise KeyError((i, needle, [w["w"] for w in LN[i]["words"]]))


# ------------------------------------------------------------------ key moments (from the narration timeline)
FIRST = 3                                                    # script lines 3..21 = the 19 items
TI = [LS(FIRST + k) - 0.10 for k in range(NI)]              # each cut lands just before the reference is spoken
TJ = LS(22) - 0.15                                           # "Juntos..."
TI_END = TI[1:] + [TJ]
T = {"pop": WT(1, WFIND(1, "versicul")), "l2": LS(2), "mil": WE(22, WFIND(22, "mil")),
     "livros": WT(22, WFIND(22, "cinquenta") if any("cinquenta" in w["w"].lower() for w in LN[22]["words"]) else WFIND(22, "59")),
     "l23": LS(23) - 0.10, "l24": LS(24) - 0.10, "l25": LS(25), "end": DUR}

# ------------------------------------------------------------------ data per item: arcs (partner -> requested verse)
IT = []
for it in ITEMS:
    gs = np.array(it["gv"])
    j = np.where(np.isin(A.PA, gs) | np.isin(A.PB, gs))[0]
    a, b = A.PA[j], A.PB[j]
    in_a = np.isin(a, gs)
    tgt, oth = np.where(in_a, a, b), np.where(in_a, b, a)
    keep = ~np.isin(oth, gs)                                   # inside a range (Fp 3:13 <-> 3:14) is not a "link out"
    j, tgt, oth = j[keep], tgt[keep], oth[keep]
    assert len(np.unique(oth)) == it["n"], (it["label"], len(np.unique(oth)), it["n"])
    v = A.VOTES[j]
    hi = np.zeros(len(j), bool); hi[np.argsort(-v)[:12]] = True
    xt, xo = A.gv_x(tgt), A.gv_x(oth)
    IT.append({"label": it["label"], "n": it["n"], "handles": it["handles"], "x": float(A.gv_x(gs).mean()),
               "xt": xt.astype(np.float64), "xo": xo.astype(np.float64), "hi": hi, "votes": v})
K_MOST = max(range(NI), key=lambda k: IT[k]["n"])
assert IT[K_MOST]["label"] == S["most_connected"]["label"]
K_TWICE = [k for k in range(NI) if len(IT[k]["handles"]) > 1]
BOOK_OF_GV = A.CHAP_BOOK[A.CHAP_OF]
U = np.unique(np.concatenate([np.asarray(it["partners"]) for it in ITEMS]))
BOOKS_ON = np.zeros(66, bool); BOOKS_ON[np.unique(BOOK_OF_GV[U])] = True
assert len(U) == 1024 and BOOKS_ON.sum() == 59

# inter-links: requested verses already linked to each other (the three people)
INTER = []
for x in S["inter_links"]:
    def gx_label(lbl):
        for k, it in enumerate(ITEMS):
            for g in it["gv"]:
                c = int(A.CHAP_OF[g]); bk = int(A.CHAP_BOOK[c])
                if f"{A.BOOKS_PT[bk]} {c - int(A.BOOK_FIRST_CHAP[bk]) + 1}:{g - int(A.CHAP_FIRST[c]) + 1}" == lbl:
                    return float(A.gv_x(g)), k
        raise KeyError(lbl)
    (xa, ka), (xb, kb) = gx_label(x["a"]), gx_label(x["b"])
    INTER.append({"xa": xa, "xb": xb, "ka": ka, "kb": kb, "votes": x["votes"]})
INTER.sort(key=lambda d: -abs(d["xb"] - d["xa"]))            # the big arc first
PEOPLE = sorted({k for d in INTER for k in (d["ka"], d["kb"])}, key=lambda k: IT[k]["x"])
assert len(PEOPLE) == 3

# ------------------------------------------------------------------ the full dome (cached: identical every run)
_p = WORK / "full_dome.npy"
if _p.exists():
    FULL = np.load(_p)
else:
    t0 = time.time(); d = Dome(); d.grow_to(len(A.ORDER))
    FULL = d.image(float(np.percentile(d.den[d.den > 0], 99.5))); np.save(_p, FULL); del d
    print(f"full dome {time.time() - t0:.1f} s")


# ------------------------------------------------------------------ cameras
def cam_rc(t):
    """roll call: the whole Bible on screen, a slow push to the right (most requests are in the NT)"""
    u = ss((t - TI[0]) / max(1.0, TJ - TI[0]))
    return Cam(lerp(1.0, 1.06, u), lerp(0.5, 0.55, u), 0.0, 540, Y_BASE)


CAM_J = Cam(1.06, 0.53, 0.0, 540, Y_BASE)


def cam_j(t):
    """roll call camera, then (from TJ) the move to the "together" framing"""
    return cam_rc(min(t, TJ)).mix(CAM_J, ss((t - TJ) / 0.8)) if t >= TJ else cam_rc(t)

_xs = [IT[k]["x"] for k in PEOPLE]
_x0, _x1 = min(_xs) - 0.012, max(_xs) + 0.012
CAM_Z = Cam(0.84 * W / ((_x1 - _x0) * 972.0), (_x0 + _x1) / 2, 0.0, 540, Y_BASE)
CAM_END = Cam(Z_MAIN, 0.5, 0.0, 540, Y_BASE)


# ------------------------------------------------------------------ drawing helpers
def item_arcs(fr, k, u, cam, op=1.0, dur=0.85, lo=0.55, hi=1.0):
    D = IT[k]; plo, phi = [], []
    for xo, xt, h in zip(D["xo"], D["xt"], D["hi"]):
        p = eo3(u / dur * 1.4 - abs(xo - xt) * 0.5)
        if p <= 0: continue
        poly = arc_poly(xo, xt, cam, 1.0)
        poly = poly[:max(2, int(len(poly) * p))]
        (phi if h else plo).append(poly)
    if plo: draw_arcs(fr, plo, GOLD * (lo * op), width=1, glow=0.8)
    if phi: draw_arcs(fr, phi, GOLD * (hi * op), width=2, glow=1.0)


def all_arcs(fr, u, cam, op=1.0):
    plo, phi = [], []
    for D in IT:
        for xo, xt, h in zip(D["xo"], D["xt"], D["hi"]):
            p = eo3(u * 1.4 - abs(xo - xt) * 0.5)
            if p <= 0: continue
            poly = arc_poly(xo, xt, cam, 1.0, n=120)
            (phi if h else plo).append(poly[:max(2, int(len(poly) * p))])
    if plo: draw_arcs(fr, plo, GOLD * (0.18 * op), width=1, glow=0.5)
    if phi: draw_arcs(fr, phi, GOLD * (0.60 * op), width=1, glow=0.8)


PT_COL = np.array([1.0, 0.93, 0.78], np.float32)


def glow_point(fr, x, y, inten=1.0, rad=9.0):
    """soft light point (star_point without rays, but wide enough that many of them never show a square edge)"""
    if inten <= 0.002: return
    R = int(rad * 12) + 2
    xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R)), int(max(0, y - R)), int(min(H, y + R))
    if xa >= xb or ya >= yb: return
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32); r2 = (xx - x) ** 2 + (yy - y) ** 2
    g = np.exp(-r2 / (2 * rad * rad)) + 0.35 * np.exp(-r2 / (2 * (rad * 3) ** 2))
    fr[ya:yb, xa:xb] += g[..., None] * PT_COL * inten


def ref_layer(label, maxw=930, size=116):
    txt = label.upper()
    f = font("grot", size, 700)
    w = sum(f.getlength(ch) for ch in txt) - 0.01 * size * len(txt)
    if w > maxw: size = int(size * maxw / w)
    return text_layer([txt], font("grot", size, 700), track=-0.01, glow=6)


def counter(n): return text_layer([fmt(n)], font("monob", 96), color=(255, 214, 140), track=-0.03, glow=4)


# ------------------------------------------------------------------ subtitles (word by word, as in video 1)
SUB_LINES = {2, 22}
SUB_FIX = {22: [(("cinquenta", "e", "nove"), "59"), (("sessenta", "e", "seis"), "66"), (("livros.",), "livros.")]}


def sub_tokens(L):
    ws, out, k = L["words"], [], 0
    rules = SUB_FIX.get(L["i"], [])
    while k < len(ws):
        for src, rep in rules:
            if tuple(w["w"].lower() for w in ws[k:k + len(src)]) == src:
                out.append((rep, ws[k]["t0"])); k += len(src); break
        else:
            out.append((ws[k]["w"], ws[k]["t0"])); k += 1
    return out


def subtitle(frame, t):
    for i in SUB_LINES:
        L = LN[i]
        if not (L["t0"] - 0.05 <= t <= L["t1"] + 0.25): continue
        toks = sub_tokens(L); words = [w for w, _ in toks]; times = [tt for _, tt in toks]
        chunks, cur = [], []
        for k, w in enumerate(words):
            if cur and len(" ".join(words[i_] for i_ in cur + [k])) > 34:
                chunks.append(cur); cur = []
            cur.append(k)
        chunks.append(cur)
        ci = 0
        for n_, ch in enumerate(chunks):
            if times[ch[0]] - 0.05 <= t: ci = n_
        ch = chunks[ci]
        fnt = font("grot", 46, 500)
        spoken = [k for k in ch if times[k] - 0.04 <= t]
        runs = [(" ".join(words[k] for k in ch if k in spoken) + (" " if len(spoken) < len(ch) and spoken else ""), (255, 255, 255)),
                (" ".join(words[k] for k in ch if k not in spoken), (120, 120, 132))]
        lay = text_layer([" ".join(words[k] for k in ch)], fnt, spans=[runs], align="c")
        op = win(t, L["t0"] - 0.05, L["t1"] + 0.25, 0.08, 0.15)
        shadow(frame, lay, W / 2, 1505, op, dark=0.75, blur=8)
        paste(frame, lay, W / 2, 1505, op)
        return


# ------------------------------------------------------------------ the film
POP = [T["pop"] + 0.06 * k for k in range(NI)]               # the 19 points light up on "versículos"


def render(fi):
    t = fi / FPS
    fr = BG.copy()
    dust(fr, t)
    # ---------------- S0 hook: the full dome from frame 0, the 19 requests light up on the baseline
    if t < TI[0]:
        c0 = Cam(lerp(1.20, 1.28, ss(t / max(0.5, TI[0]))), 0.5, 0.0, 540, Y_BASE)
        mv = ss((t - (TI[0] - 0.75)) / 0.75)
        cam = c0.mix(cam_rc(TI[0]), mv)
        gain = lerp(1.0, 0.5, ss((t - T["pop"]) / 0.8)) * (1 - mv) + 0.06 * mv
        img = warp_dome(FULL, cam)
        xs = lerp(-200, W + 200, c01((t - 0.1) / 1.8))
        band = (1 + 0.5 * np.exp(-((np.arange(W, dtype=np.float32) - xs) / 110) ** 2))[None, :, None]
        fr += img * gain * band
        draw_bars(fr, cam, op=0.75 - 0.25 * mv, hscale=0.9)
        for k in range(NI):
            if t >= POP[k]:
                e = expo((t - POP[k]) / 0.12)
                inten = (0.55 + 0.9 * math.exp(-(t - POP[k]) / 0.35)) * e
                if mv > 0 and k > 0: inten *= 1 - mv
                glow_point(fr, float(cam.X(IT[k]["x"])), float(cam.Y(0)), inten, 9)
        o1 = 1.0 - c01((t - (TI[0] - 0.35)) / 0.25)
        l1 = text_layer(["OS VERSÍCULOS", "DE VOCÊS"], font("grot", 104, 700), track=-0.02,
                        spans=[[("OS VERSÍCULOS", (255, 255, 255))], [("DE VOCÊS", (255, 214, 140))]])
        titled(fr, l1, W / 2, 420, o1, 1.0 + 0.04 * (1 - eo3(t / 0.5)))
        l2 = text_layer([f"{S['n_comments_citing']} PEDIDOS  ·  {NI} MAPAS"], font("mono", 32), color=(230, 230, 236), track=0.08)
        titled(fr, l2, W / 2, 575, o1 * c01((t - T["pop"]) / 0.3), dark=0.8, blur=10)
    # ---------------- S1 roll call: one verse at a time, its arcs converge on it, the @ of who asked
    if TI[0] <= t < TJ + 0.45:
        cam = cam_j(t)
        k = max(i for i in range(NI) if TI[i] <= t) if t >= TI[0] else 0
        u = t - TI[k]
        ping = math.exp(-max(0.0, u) / 0.35)
        o_rc = 1.0 - c01((t - TJ) / 0.45)
        fr += warp_dome(FULL, cam) * ((0.06 + 0.035 * ping) * o_rc)
        draw_bars(fr, cam, op=0.5 * (1 - c01((t - TJ) / 0.3)))
        if k > 0 and u < 0.35:
            item_arcs(fr, k - 1, 9.0, cam, op=1.0 - c01(u / 0.35))
        item_arcs(fr, k, max(0.0, u), cam, op=o_rc)
        xprev = IT[k - 1]["x"] if k > 0 else IT[0]["x"]
        xs_ = lerp(xprev, IT[k]["x"], eio(c01(u / 0.32)))
        ray = (0.42 + 0.18 * ping) * c01(u / 0.12 + 0.3)
        if k == K_MOST: ray *= 1.35
        star_point(fr, float(cam.X(xs_)), float(cam.Y(0)), (0.9 + 0.9 * ray) * o_rc, 12 + 8 * ray,
                   rays=ray * (0.9 + 0.06 * math.sin(t * 2.0)), rot=0.05 * math.sin(t * 0.7))
        # texts of item k
        D = IT[k]
        op = win(t, TI[k], TI_END[k], 0.10, 0.12) * (1.0 if k < NI - 1 else o_rc)
        if op > 0:
            sc = 1.0 + 0.06 * (1 - expo(u / 0.35))
            if k == K_MOST:
                lt = text_layer(["O MAIS CONECTADO DE VOCÊS"], font("grot", 38, 600), color=(255, 214, 140), track=0.12)
            else:
                lt = text_layer([f"{k + 1:02d}/{NI}"], font("mono", 30), color=(255, 214, 140), track=0.14)
            titled(fr, lt, W / 2, 278, op, dark=0.8, blur=10)
            titled(fr, ref_layer(D["label"]), W / 2, 380, op, sc)
            n_now = int(round(D["n"] * eo3((u - 0.10) / 0.70)))
            titled(fr, counter(n_now), W / 2, 500, op, 1.0 + (0.10 if k == K_MOST else 0.05) * math.exp(-max(0.0, u - 0.8) / 0.18) * (u > 0.8))
            ll = text_layer(["VERSÍCULOS LIGADOS"], font("mono", 28), color=(225, 225, 232), track=0.10)
            titled(fr, ll, W / 2, 564, op, dark=0.8, blur=10)
            oh = op * c01((u - 0.22) / 0.25); dy = 14 * (1 - eo3((u - 0.22) / 0.4))
            by = "pedido duas vezes, por" if len(D["handles"]) > 1 else "pedido por"
            lb = text_layer([by], font("serifi", 46, 500), color=(255, 214, 140))
            titled(fr, lb, W / 2, 640 + dy, oh, dark=0.75, blur=10)
            for hi_, h in enumerate(D["handles"]):
                lh = text_layer(["@" + h], font("grot", 50, 600), track=0.01)
                titled(fr, lh, W / 2, 698 + 58 * hi_ + dy, oh, dark=0.85, blur=12)
    # ---------------- S2 together: every requested verse at once, 1.024 linked verses, 59 of 66 books
    if TJ - 0.05 <= t < T["l23"] + 0.5:
        u = t - TJ
        cam = cam_j(t)
        if t >= T["l23"]: cam = CAM_J.mix(CAM_Z, eio((t - T["l23"]) / 0.9))
        o = c01(u / 0.3) * (1 - c01((t - T["l23"]) / 0.5))
        fr += warp_dome(FULL, cam) * (0.08 * o)
        draw_bars(fr, cam, op=0.5 * o)
        all_arcs(fr, u / 1.5, cam, o)
        for k in range(NI):
            glow_point(fr, float(cam.X(IT[k]["x"])), float(cam.Y(0)), 0.6 * o, 8)
        hit = t >= T["mil"]
        n = int(round(1024 * eo3((t - (TJ + 0.35)) / max(0.3, T["mil"] - TJ - 0.35)) ** 1.2)) if not hit else 1024
        ot = win(t, TJ, T["l23"] + 0.05, 0.25, 0.3)
        titled(fr, text_layer(["JUNTOS"], font("grot", 40, 600), color=(255, 214, 140), track=0.14), W / 2, 285, ot)
        lc = text_layer([fmt(n)], font("monob", 156), color=(255, 214, 140) if hit else (255, 255, 255), track=-0.04, glow=6 if hit else 0)
        titled(fr, lc, W / 2, 395, ot, 1.0 + 0.12 * max(0.0, 1 - (t - T["mil"]) / 0.4) * hit)
        titled(fr, text_layer(["versículos ligados"], font("serifi", 54, 500)), W / 2, 484, ot)
        # the 66 books, Genesis -> Revelation; the 59 touched light up in order
        if t >= T["livros"] - 0.1:
            ob = ot * c01((t - T["livros"] + 0.1) / 0.25)
            cw, gap = 12.0, 1.0
            x0 = (W - (66 * (cw + gap) - gap)) / 2
            for b in range(66):
                lit = c01((t - T["livros"]) / 0.9 * 66 - b)
                xa = int(x0 + b * (cw + gap)); ya = 572
                base = np.array([0.16, 0.16, 0.20], np.float32)
                col = base + (GOLD - base) * (lit if BOOKS_ON[b] else 0.0)
                fr[ya:ya + 26, xa:xa + int(cw)] = fr[ya:ya + 26, xa:xa + int(cw)] * (1 - ob) + col * ob
            lb = text_layer(["59 DOS 66 LIVROS"], font("mono", 30), color=(230, 230, 236), track=0.10)
            titled(fr, lb, W / 2, 636, ob, dark=0.8, blur=10)
    # ---------------- S3 three of you were already linked: zoom on the two arcs between requested verses
    if T["l23"] - 0.05 <= t < T["l24"] + 0.6:
        u = t - T["l23"]
        cam = CAM_J.mix(CAM_Z, eio(u / 0.9))
        if t >= T["l24"]: cam = CAM_Z.mix(CAM_END, ss((t - T["l24"]) / 1.2))
        o = c01(u / 0.35) * (1 - c01((t - T["l24"]) / 0.6))
        fr += warp_dome(FULL, cam) * (0.05 * o)
        draw_bars(fr, cam, op=0.55 * o)
        for n_, d in enumerate(INTER):
            p = eo3((u - 0.45 - 0.55 * n_) / 0.8)
            if p > 0:
                draw_arcs(fr, [arc_poly(d["xa"], d["xb"], cam, p)], GOLD * (1.15 * o), width=3, glow=1.3, head=p < 0.99)
        for r, k in enumerate(PEOPLE):
            tk = 0.45 + 0.3 * r
            ok = o * c01((u - tk) / 0.25)
            sx, sy = float(cam.X(IT[k]["x"])), float(cam.Y(0))
            glow_point(fr, sx, sy, 0.9 * ok, 11)
            lh = text_layer(["@" + IT[k]["handles"][0]], font("grot", 42, 600), track=0.01)
            lr = text_layer([IT[k]["label"]], font("mono", 26), color=(255, 214, 140), track=0.04)
            ly = {0: 700, 1: 800, 2: 600}[r]
            anchor = "l" if sx < W * 0.45 else "r"
            lx = sx - 18 if anchor == "r" else sx + 18
            lx = min(max(lx, 60), W - 60)
            titled(fr, lh, lx, ly, ok, anchor=anchor, dark=0.85, blur=10)
            titled(fr, lr, lx, ly + 44, ok, anchor=anchor, dark=0.85, blur=10)
            y_top = int(ly - 26); y_bot = int(sy - 10)
            xi = int(round(sx))
            if 0 <= xi < W and y_bot > y_top:
                fr[y_top:y_bot, xi:xi + 2] += GOLD * (0.35 * ok)
        l3 = text_layer(["3 DE VOCÊS", "LIGADOS ENTRE SI"], font("grot", 84, 700), track=-0.01,
                        spans=[[("3 DE VOCÊS", (255, 255, 255))], [("LIGADOS ENTRE SI", (255, 214, 140))]])
        titled(fr, l3, W / 2, 380, win(t, T["l23"] + 0.05, T["l24"] + 0.1, 0.25, 0.3))
    # ---------------- S4 the call: the whole Bible again, the 19 points stay lit
    if t >= T["l24"] - 0.05:
        u = t - T["l24"]
        cam = CAM_Z.mix(CAM_END, ss(u / 1.2))
        g = 0.05 + 0.80 * ss((u - 0.2) / 1.4)
        fr += warp_dome(FULL, cam) * g
        draw_bars(fr, cam, op=0.55 * c01(u / 0.6) + 0.25 * ss(u / 1.2), hscale=0.9)
        for k in range(NI):
            glow_point(fr, float(cam.X(IT[k]["x"])), float(cam.Y(0)), 0.7 * c01(u / 0.4), 8)
        o3 = c01((u - 0.1) / 0.35)
        lc1 = text_layer(["COMENTA O TEU", "VERSÍCULO"], font("grot", 96, 700), track=-0.01,
                         spans=[[("COMENTA O TEU", (255, 255, 255))], [("VERSÍCULO", (255, 214, 140))]])
        titled(fr, lc1, W / 2, 400, o3, 1.0 + 0.06 * (1 - eo3((u - 0.1) / 0.4)))
        lc2 = text_layer(["o próximo mapa pode ser o teu"], font("serifi", 58, 500))
        titled(fr, lc2, W / 2, 540, c01((t - T["l25"] + 0.1) / 0.35))
        cr = text_layer(["DADOS: OPENBIBLE.INFO (CC BY) · 344.799 REFERÊNCIAS CRUZADAS",
                         "VERSÍCULOS E @ DOS COMENTÁRIOS DE “A BÍBLIA, CONECTADA”"], font("mono", 22), color=(170, 170, 180), track=0.02)
        paste(fr, cr, W / 2, 1478, o3 * 0.9)
    subtitle(fr, t)
    fr *= VIGN
    g_ = cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_NEAREST)
    fr += g_[..., None] * 0.008
    return np.clip(fr, 0, 1)


if __name__ == "__main__":
    if "--still" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--still") + 1].split(",")]
        for tt in sorted(ts):
            fi = int(round(tt * FPS)); t1 = time.time(); img = to8(render(fi))
            cv2.imwrite(str(WORK / f"still-{tt:05.2f}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print(f"still {tt:.2f} ({time.time() - t1:.2f} s)")
        sys.exit(0)
    if "--keys" in sys.argv:
        print(json.dumps({"TI": [round(x, 3) for x in TI], **{k: round(v, 3) for k, v in T.items()}, "TJ": round(TJ, 3)}, indent=0))
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
