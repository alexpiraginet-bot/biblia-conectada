#!/usr/bin/env python3
""""Antes de João 3:16" — Reels 9:16, remake of episode 02 in the style of video 1 ("A Bíblia, conectada", 18/10/2026).

Same engine and look as video 1 (engine.py): the real cross-reference dome (OpenBible.info, CC BY), the stained-glass arcs,
gold highlights, chapter bars, star, dust, grain. Story: the one arc that John 3:14 throws back 862 chapters to Numbers 21
(its most voted link in the open base), the bronze serpent lifted on a pole, the same pole becoming a cross, and only then
John 3:16. Every number comes from data/stats.json (tools/analyze.py); quotes are BLIVRE; timeline = the narration.

  python3 film.py --still 1.0,12.5   -> renders/.film/still-<t>.jpg
  python3 film.py --keys             -> key times
  python3 film.py                    -> renders/.film/video.mp4  (then score.py, finalize.py)
"""
import json, math, subprocess, sys, time, unicodedata
import numpy as np
import cv2
from engine import ROOT, A, Cam, Dome, font, text_layer, paste, shadow, titled, warp_dome, draw_bars, arc_poly, \
    draw_arcs, star_point, dust, to8, fmt, c01, ss, eo3, eio, expo, lerp, win, GOLD, VIGN, BG, GRAIN, Y_BASE, Z_MAIN, W, H, FPS

WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
NARR = json.load(open(WORK / "narr.json"))
LN = {L["i"]: L for L in NARR["lines"]}
DUR = NARR["duration"]; NF = int(round(DUR * FPS))
S = json.load(open(ROOT / "data/stats.json"))
assert S["chapters_back"] == 862 and S["links"]["John.3.16"] == 80 and S["links"]["John.3.14"] == 34
assert S["partners"]["John.3.14"][0]["ref"] == "Números 21:7" and S["partners"]["John.3.14"][0]["votes"] == 81
XN, XJ, XJ16 = S["x"]["Num.21.7"], S["x"]["John.3.14"], S["x"]["John.3.16"]
N_BACK, N16, N14 = S["chapters_back"], S["links"]["John.3.16"], S["links"]["John.3.14"]


def LS(i): return LN[i]["t0"]
def LE(i): return LN[i]["t1"]


def _n(s): return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if c.isalnum())


def WF(i, *needles, end=False):
    """time of the first word of line i containing one of the needles (accents/punctuation ignored)"""
    for w in LN[i]["words"]:
        if any(_n(nd) in _n(w["w"]) for nd in needles): return w["t1"] if end else w["t0"]
    raise KeyError((i, needles, [w["w"] for w in LN[i]["words"]]))


# ------------------------------------------------------------------ key moments (from the narration timeline)
T = {
    "l2": LS(2), "l3": LS(3) - 0.10,
    "r15": WF(4, "dois", "2"), "r14": WF(4, "versic"), "l5": LS(5),
    "arc0": WF(6, "arco"), "arc1": WF(6, "capitul", end=True),
    "num": WF(7, "numer"), "l8": LS(8) - 0.10,
    "pole": WF(9, "moises"), "serp": WF(9, "serpente"), "bronze": WF(9, "bronze", end=True), "haste": WF(9, "haste"),
    "olhava": WF(10, "olhava"), "vivia": WF(10, "vivia"),
    "l11": LS(11), "l12": LS(12) - 0.10, "assim": WF(12, "assim"),
    "levantou": WF(12, "levantou"), "levantado": WF(12, "levantado"),
    "l13": LS(13), "cruz": WF(13, "cruz"),
    "l14": LS(14) - 0.10, "l15": LS(15) - 0.10,
    "l16": LS(16), "f15": WF(16, "joao"), "f16": WF(16, "dezesseis", "16"),
    "l17": LS(17) - 0.05, "filho": WF(17, "filho"), "l18": LS(18) - 0.10, "l19": LS(19) - 0.10, "nao": WF(19, "nao"),
    "end": DUR,
}

# ------------------------------------------------------------------ data: the two fans of arcs (partners -> verse)
def fan_data(key, x_to):
    P = S["partners"][key]
    xo = A.gv_x(np.array([p["gv"] for p in P])).astype(np.float64)
    v = np.array([p["votes"] for p in P])
    hi = np.zeros(len(P), bool); hi[np.argsort(-v, kind="stable")[:12]] = True
    return {"xo": xo, "x": x_to, "hi": hi, "first": P[0]}


F16 = fan_data("John.3.16", XJ16)
F14 = fan_data("John.3.14", XJ)
assert len(F16["xo"]) == N16 and len(F14["xo"]) == N14

# ------------------------------------------------------------------ the full dome (cached: identical every run)
_p = WORK / "full_dome.npy"
if _p.exists():
    FULL = np.load(_p)
else:
    t0 = time.time(); d = Dome(); d.grow_to(len(A.ORDER))
    FULL = d.image(float(np.percentile(d.den[d.den > 0], 99.5))); np.save(_p, FULL); del d
    print(f"full dome {time.time() - t0:.1f} s")


# ------------------------------------------------------------------ cameras
def zmix(c0, c1, u):
    """zoom from c0 to c1 as a move into a point: log-scale zoom, screen-linear drift"""
    u = c01(u)
    z = math.exp(lerp(math.log(c0.z), math.log(c1.z), u))
    w = (1 / c0.z - 1 / z) / (1 / c0.z - 1 / c1.z) if abs(c1.z - c0.z) > 1e-6 else u
    return Cam(z, lerp(c0.fx, c1.fx, w), lerp(c0.fh, c1.fh, w), lerp(c0.ax, c1.ax, u), lerp(c0.ay, c1.ay, u))


ZN = 7.0
C_J = Cam(1.04, 0.52, 0.0, 540, Y_BASE)                    # John 3: the whole Bible, a touch to the right
C_N = Cam(ZN, XN, 0.0, 540, 1300)                          # down at Numbers 21
C_MID = Cam(1.12, 0.48, 0.0, 540, Y_BASE)                  # the flight back along the arc
C_JZ = Cam(ZN, XJ, 0.0, 540, 1300)                         # down at John 3:14
C_PAR = Cam(1.10, 0.50, 0.0, 540, Y_BASE)                  # both ends of the arc on screen
C_END = Cam(1.16, 0.50, 0.0, 540, Y_BASE)


def cam_at(t):
    if t < T["l3"]:
        return Cam(lerp(1.20, 1.26, ss(t / max(0.5, T["l3"]))), 0.5, 0.0, 540, Y_BASE)
    if t < T["num"]:
        h = Cam(1.26, 0.5, 0.0, 540, Y_BASE)
        return h.mix(C_J, eio((t - T["l3"]) / 0.9))
    if t < T["l11"]:
        c = zmix(C_J, C_N, eio((t - T["num"]) / 1.35))
        push = ss((t - T["num"] - 1.35) / max(0.5, T["l11"] - T["num"] - 1.35))
        return Cam(c.z * (1 + 0.08 * push), c.fx, c.fh, c.ax, c.ay)
    if t < T["l14"] - 0.30:
        a = T["l11"]; b = T["l12"] + 0.10; mid = (a + b) / 2
        cn = Cam(ZN * 1.08, XN, 0.0, 540, 1300)
        if t < mid: c = zmix(cn, C_MID, eio((t - a) / (mid - a)))
        else: c = zmix(C_MID, C_JZ, eio((t - mid) / (b - mid)))
        push = ss((t - b) / max(0.5, T["l14"] - 0.30 - b))
        return Cam(c.z * (1 + 0.07 * push), c.fx, c.fh, c.ax, c.ay)
    if t < T["l17"]:
        cj = Cam(ZN * 1.07, XJ, 0.0, 540, 1300)
        return zmix(cj, C_PAR, eio((t - T["l14"] + 0.30) / 1.10))
    return C_PAR.mix(C_END, ss((t - T["l17"]) / max(1.0, DUR - T["l17"])))


# ------------------------------------------------------------------ drawing helpers
PT_COL = np.array([1.0, 0.93, 0.78], np.float32)
BRONZE = np.array([0.95, 0.48, 0.20], np.float32)
RUBY = np.array([1.0, 0.30, 0.40], np.float32)


def glow_point(fr, x, y, inten=1.0, rad=9.0):
    if inten <= 0.002: return
    R = int(rad * 12) + 2
    xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R)), int(max(0, y - R)), int(min(H, y + R))
    if xa >= xb or ya >= yb: return
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32); r2 = (xx - x) ** 2 + (yy - y) ** 2
    g = np.exp(-r2 / (2 * rad * rad)) + 0.35 * np.exp(-r2 / (2 * (rad * 3) ** 2))
    fr[ya:yb, xa:xb] += g[..., None] * PT_COL * inten


def fan(fr, D, u, cam, op=1.0, lo=0.55, hi=1.0, dur=0.85):
    """the partners' arcs converging on the verse, drawn on from the far end (as the roll call of video 3)"""
    if op <= 0.002: return
    plo, phi = [], []
    for xo, h in zip(D["xo"], D["hi"]):
        p = eo3(u / dur * 1.4 - abs(xo - D["x"]) * 0.5)
        if p <= 0: continue
        poly = arc_poly(xo, D["x"], cam, 1.0, n=140)
        (phi if h else plo).append(poly[:max(2, int(len(poly) * p))])
    if plo: draw_arcs(fr, plo, GOLD * (lo * op), width=1, glow=0.8)
    if phi: draw_arcs(fr, phi, GOLD * (hi * op), width=2, glow=1.0)


def gold_arc(fr, cam, p=1.0, op=1.0, width=3, head=False, frm=XJ, to=XN, ymin=None):
    """the arc John 3:14 <-> Numbers 21; ymin keeps it out of the title zone when the camera is down at one end"""
    if op <= 0.002 or p <= 0: return
    poly = arc_poly(frm, to, cam, p, n=700 if ymin is None else 4000)
    runs = [poly]
    if ymin is not None:
        m = (poly[:, 1] > ymin) & (poly[:, 0] > -200) & (poly[:, 0] < W + 200)
        idx = np.flatnonzero(np.diff(np.concatenate([[0], m.astype(np.int8), [0]])))
        runs = [poly[a:b] for a, b in zip(idx[::2], idx[1::2]) if b - a > 1]
    draw_arcs(fr, runs, GOLD * (1.15 * op), width=width, glow=1.25)
    if head and p < 0.995:
        glow_point(fr, float(poly[-1][0]), float(poly[-1][1]), 1.2 * op, 8)


def arc_point(cam, p, frm=XJ, to=XN):
    r = abs(to - frm) / 2; cx = (frm + to) / 2; sgn = 1 if to >= frm else -1
    th = math.pi * c01(p)
    return float(cam.X(cx - sgn * r * math.cos(th))), float(cam.Y(r * math.sin(th)))


def pulse(fr, cam, p, inten=1.0, frm=XJ, to=XN):
    """a light travelling on the gold arc (p: 0 at frm, 1 at to)"""
    if inten <= 0.002: return
    x, y = arc_point(cam, p, frm, to)
    glow_point(fr, x, y, 1.1 * inten, 7)
    for k in range(1, 7):                                  # short comet tail
        xt, yt = arc_point(cam, p - 0.012 * k, frm, to)
        glow_point(fr, xt, yt, 0.45 * inten * (1 - k / 7), 5)


def lines_(fr, polys, col, width=3, glow=1.0):
    polys = [np.asarray(p, np.float32) for p in polys if len(p) > 1]
    if polys: draw_arcs(fr, polys, col, width=width, glow=glow)


def icon(fr, x, yb, h, grow=1.0, serp=0.0, bar=0.0, op=1.0, serp_op=1.0, lw=3):
    """the lifted sign, drawn in light: a pole; a bronze serpent wound on it (Numbers 21:9); a crossbar (the cross)"""
    if op <= 0.002 or grow <= 0: return
    top = yb - h * grow
    lines_(fr, [[(x, yb), (x, top)]], GOLD * (0.80 * op), width=lw, glow=0.8)
    if serp > 0 and serp_op > 0.002:
        s = np.linspace(0, c01(serp), max(3, int(220 * c01(serp))))
        amp = 0.085 * h * (0.55 + 0.45 * np.sin(np.pi * np.clip(s * 1.1, 0, 1)))
        xs = x + amp * np.sin(2 * np.pi * 2.6 * s + 0.4)
        ys = yb - h * (0.10 + 0.80 * s)
        pts = np.stack([xs, ys], -1)
        if serp >= 0.999:                                  # the head, bent over the top of the pole
            hx, hy = pts[-1]
            head = [(hx, hy), (hx + 0.05 * h, hy - 0.035 * h), (hx + 0.10 * h, hy - 0.02 * h)]
            pts = np.concatenate([pts, np.array(head[1:], np.float32)])
        lines_(fr, [pts], BRONZE * (1.05 * op * serp_op), width=lw + 1, glow=1.0)
        hx, hy = pts[-1]
        glow_point(fr, float(hx), float(hy), 0.5 * op * serp_op, 5)
    if bar > 0:
        yc = yb - 0.74 * h; hw = 0.25 * h * eo3(bar)
        lines_(fr, [[(x - hw, yc), (x + hw, yc)]], GOLD * (0.95 * op), width=lw, glow=0.9)
    glow_point(fr, x, top, 0.35 * op, 6)


_SR = np.random.default_rng(21)
SNAKES = [{"x0": float(_SR.uniform(-420, 420)), "dir": float(_SR.choice([-1, 1])), "v": float(_SR.uniform(22, 44)),
           "L": float(_SR.uniform(150, 230)), "amp": float(_SR.uniform(9, 14)), "wl": float(_SR.uniform(56, 78)),
           "ph": float(_SR.uniform(0, 6.28)), "dy": float(_SR.uniform(12, 70))} for _ in range(9)]


def snakes(fr, t, cx, yb, op):
    """the serpents on the ground of Numbers 21:6 (abstract: ruby strokes slithering on the baseline)"""
    if op <= 0.002: return
    polys = []
    for s in SNAKES:
        hx = cx + s["x0"] + s["dir"] * s["v"] * t
        d = np.linspace(0, s["L"], 46)
        xs = hx - s["dir"] * d
        taper = 0.35 + 0.65 * np.sin(np.pi * np.clip(d / s["L"] * 0.9 + 0.1, 0, 1))
        ys = yb - s["dy"] + s["amp"] * taper * np.sin(2 * np.pi * d / s["wl"] - t * 7.0 * s["dir"] + s["ph"])
        polys.append(np.stack([xs, ys], -1))
    lines_(fr, polys, RUBY * (0.80 * op), width=3, glow=0.8)


def tl(lines, size=96, wt=700, colors=None, track=-0.01, glow=0):
    colors = colors or [(255, 255, 255)] * len(lines)
    return text_layer(lines, font("grot", size, wt), track=track, glow=glow, spans=[[(l, c)] for l, c in zip(lines, colors)])


def label(txt, size=30, col=(255, 214, 140), track=0.12): return text_layer([txt], font("mono", size), color=col, track=track)


GOLDT = (255, 214, 140)
CREAM = (255, 226, 170)


def ref_roll(fr, t, y, events, op=1.0, size=116):
    """'JOÃO 3:' + a verse number that rolls like an odometer (down when going back, up when going forward)"""
    if op <= 0.002: return
    f = font("grot", size, 700); glow = 6; pad = int(12 + glow * 3)
    pre = text_layer(["JOÃO 3:"], f, track=-0.01, glow=glow)
    wp = sum(f.getlength(c) for c in "JOÃO 3:") - 0.01 * size * 6; wn = sum(f.getlength(c) for c in "16") - 0.01 * size
    left = W / 2 - (wp + wn) / 2; xs = left + wp
    k = max([i for i, (te, _) in enumerate(events) if te <= t], default=0)
    v = events[k][1]; vp = events[k - 1][1] if k > 0 else v
    u = eo3((t - events[k][0]) / 0.26) if k > 0 else 1.0
    titled(fr, pre, xs + pad, y, op, anchor="r")
    dirn = 1 if v < vp else -1                             # rewind: digits fall down
    if u < 1:
        titled(fr, text_layer([str(vp)], f, track=-0.01, glow=glow), xs - pad, y + dirn * 70 * u, op * (1 - u), anchor="l")
    titled(fr, text_layer([str(v)], f, track=-0.01, glow=glow, color=GOLDT if k == len(events) - 1 else (255, 255, 255)),
           xs - pad, y - dirn * 70 * (1 - u), op * u, anchor="l")


def counter_layer(n, size=96, col=GOLDT): return text_layer([fmt(n)], font("monob", size), color=col, track=-0.03, glow=4)


# ------------------------------------------------------------------ subtitles (word by word, as in video 1)
SUB_LINES = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16}
sys.path.insert(0, str(ROOT))
from script import LINES as SCRIPT  # noqa: E402  (the text the narrator was given = the text shown)
import re
from difflib import SequenceMatcher
_U = ["zero", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze",
      "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
_T = {2: "vinte", 3: "trinta", 4: "quarenta", 5: "cinquenta", 6: "sessenta", 7: "setenta", 8: "oitenta", 9: "noventa"}
_C = {1: "cento", 2: "duzentos", 3: "trezentos", 4: "quatrocentos", 5: "quinhentos", 6: "seiscentos", 7: "setecentos",
      8: "oitocentos", 9: "novecentos"}


def _num(n):
    if n < 20: return _U[n]
    if n < 100: return _T[n // 10] + ("" if n % 10 == 0 else " e " + _U[n % 10])
    if n == 100: return "cem"
    if n < 1000: return _C[n // 100] + ("" if n % 100 == 0 else " e " + _num(n % 100))
    return str(n)


def _norm(w):
    w = re.sub(r"\d+", lambda m: " " + _num(int(m.group())) + " ", w.lower().replace("quatorze", "catorze"))
    w = "".join(c for c in unicodedata.normalize("NFKD", w) if not unicodedata.combining(c))
    return ["pra" if x == "para" else x for x in re.findall(r"[a-z]+", w)]


# display rules on the script tokens (spoken numbers -> digits; the TTS pause comma after a book name goes)
SUB_FIX = [(("três,", "dezesseis."), "3:16."), (("três,", "dezesseis:"), "3:16:"), (("três,", "quatorze."), "3:14."),
           (("oitocentos", "e", "sessenta", "e", "dois"), "862"), (("Números,", "vinte", "e", "um."), "Números 21.")]


def sub_tokens(L):
    """script words of the line, each timed by the Whisper word it matches (unmatched words take the previous time)"""
    toks = SCRIPT[L["i"]].split()
    a = [(k, x) for k, tk in enumerate(toks) for x in _norm(tk)]
    b = [(k, x) for k, w in enumerate(L["words"]) for x in _norm(w["w"])]
    sm = SequenceMatcher(a=[x for _, x in a], b=[x for _, x in b], autojunk=False)
    tm = {}
    for i0, j0, n in sm.get_matching_blocks():
        for d in range(n):
            tm.setdefault(a[i0 + d][0], L["words"][b[j0 + d][0]]["t0"])
    times, last = [], L["t0"]
    for k in range(len(toks)):
        last = tm.get(k, last); times.append(last)
    out, k = [], 0
    while k < len(toks):
        for src, rep in SUB_FIX:
            if tuple(toks[k:k + len(src)]) == src:
                out.append((rep, times[k])); k += len(src); break
        else:
            out.append((toks[k], times[k])); k += 1
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


# ------------------------------------------------------------------ quotes (BLIVRE), split for reading
Q314 = ["E como Moisés levantou", "a serpente no deserto,", "assim deve o Filho do homem", "ser levantado,"]
Q316 = ["Porque Deus amou ao mundo", "de tal maneira, que deu", "o seu Filho unigênito…"]
assert " ".join(Q314).rstrip(",") in S["blivre"]["JOH 3:14"]
assert " ".join(Q316).rstrip("…") in S["blivre"]["JOH 3:16"]


def quote_block(fr, lines, y0, size, reveal, op, marks=()):
    """centred quote, line by line (reveal[i] = opacity of line i); marks = (line, word, progress) gold underlines"""
    f = font("serifi", size, 500); asc, desc = f.getmetrics(); lh = int((asc + desc) * 1.18)
    for i, ln in enumerate(lines):
        o = op * reveal[i]
        if o <= 0.002: continue
        lay = text_layer([("“" if i == 0 else "") + ln + ("”" if i == len(lines) - 1 else "")], f, color=CREAM)
        titled(fr, lay, W / 2, y0 + i * lh, o, dark=0.85, blur=12)
    for li, word, prog in marks:
        if prog <= 0: continue
        s = ("“" if li == 0 else "") + lines[li] + ("”" if li == len(lines) - 1 else "")
        full = f.getlength(s); a = s.index(word)
        xa = W / 2 - full / 2 + f.getlength(s[:a]); wl = f.getlength(word)
        yl = y0 + li * lh + size * 0.52
        lines_(fr, [[(xa, yl), (xa + wl * eo3(prog), yl)]], GOLD * (1.1 * op * reveal[li]), width=3, glow=0.9)
    return y0 + (len(lines) - 1) * lh + int(size * 0.95)


# ------------------------------------------------------------------ the film
def render(fi):
    t = fi / FPS
    fr = BG.copy()
    dust(fr, t)
    cam = cam_at(t)
    yb = float(cam.Y(0))
    xn, xj = float(cam.X(XN)), float(cam.X(XJ))

    # ---------------- dome + bars, gain per act
    if t < T["l3"]:
        g = 0.62 - 0.12 * ss((t - T["l2"]) / 0.6)
        img = warp_dome(FULL, cam)
        xs = lerp(-200, W + 200, c01((t - 0.1) / 1.8))
        band = (1 + 0.5 * np.exp(-((np.arange(W, dtype=np.float32) - xs) / 110) ** 2))[None, :, None]
        fr += img * g * band
    else:
        if t < T["num"]: g = lerp(0.50, 0.10, ss((t - T["l3"]) / 0.6))
        elif t < T["l14"] - 0.3: g = lerp(0.13, 0.04, c01((cam.z - 1.2) / 2.0))
        elif t < T["l17"]: g = lerp(0.04, 0.14, ss((t - T["l14"] + 0.3) / 1.0))
        elif t < T["l18"]: g = lerp(0.14, 0.62, ss((t - T["l17"] - 0.3) / 2.2))
        else: g = 0.62 + 0.2 * ss((t - T["l18"]) / 2.0)
        fr += warp_dome(FULL, cam) * g
    zoomed = cam.z > 2.0
    draw_bars(fr, cam, op=0.62 if not zoomed else 0.42, hscale=0.9 if not zoomed else 0.55)

    # ---------------- S0 hook: the whole Bible from frame 0, one gold arc from John 3 to Numbers 21
    if t < T["l3"] + 0.6:
        o = 1 - c01((t - T["l3"]) / 0.6)
        gold_arc(fr, cam, 1.0, o * (1 + 0.15 * math.sin(t * 3.0)))
        if t >= T["l2"]:                                   # "quem fez essa ligação foi o próprio Jesus": a light leaves John
            pulse(fr, cam, c01((t - T["l2"] - 0.2) / 1.6), o * win(t, T["l2"] + 0.1, T["l3"] + 0.2, 0.2, 0.3))
        glow_point(fr, xn, yb, 0.8 * o, 9)
        star_point(fr, xj, yb, (0.9 + 0.5 * ss((t - T["l2"]) / 0.4)) * o, 12,
                   rays=0.35 * ss((t - T["l2"]) / 0.5) * o, rot=0.05 * math.sin(t * 0.7))
        o1 = 1.0 - c01((t - (T["l2"] - 0.15)) / 0.3)
        l1 = tl(["ESSE ARCO LIGA", "JESUS A UMA", "SERPENTE."], 104, colors=[(255, 255, 255), (255, 255, 255), GOLDT])
        titled(fr, l1, W / 2, 440, o1, 1.0 + 0.04 * (1 - eo3(t / 0.5)))
        ol = o
        titled(fr, label("NÚMEROS 21", 28), max(60, xn + 26), yb - 58, ol, anchor="l", dark=0.9, blur=10)
        titled(fr, label("JOÃO 3", 28), min(W - 60, xj - 34), yb - 58, ol, anchor="r", dark=0.9, blur=10)

    # ---------------- S1 John 3:16 -> back two verses -> John 3:14, its arc runs 862 chapters back
    if T["l3"] - 0.05 <= t < T["num"] + 1.0:
        u = t - T["l3"]
        o = c01(u / 0.35) * (1 - c01((t - T["num"] - 0.5) / 0.5))
        # 3:16 and its 80 links, gone when the count rolls back
        o16 = o * (1 - c01((t - T["r15"]) / 0.45))
        fan(fr, F16, u, cam, o16)
        o14 = o * c01((t - T["r14"]) / 0.3)
        dim = 1 - 0.7 * ss((t - T["arc0"] + 0.2) / 0.5)
        if o14 > 0:
            D = dict(F14); keep = np.array([abs(x - XN) > 0.002 for x in D["xo"]])   # the gold one is drawn apart
            D = {"xo": D["xo"][keep], "hi": D["hi"][keep], "x": D["x"]}
            fan(fr, D, t - T["r14"], cam, o14 * dim)
        # the arc back to Numbers 21, drawn from John
        pa = eo3((t - T["arc0"]) / max(0.6, T["arc1"] - T["arc0"]))
        if t < T["arc0"]:
            fan(fr, {"xo": np.array([XN]), "hi": np.array([True]), "x": XJ}, t - T["r14"], cam, o14)
        elif t < T["num"]:
            gold_arc(fr, cam, pa, o, head=True)
        ray = (0.40 + 0.2 * math.exp(-max(0.0, u) / 0.4)) * o
        star_point(fr, xj, yb, 1.0 * o + 0.5 * ray, 12 + 6 * ray, rays=ray * 0.9, rot=0.05 * math.sin(t * 0.7))
        if t >= T["num"]:
            e = t - T["num"]
            glow_point(fr, xn, yb, (0.8 + 1.6 * math.exp(-e / 0.3)) * o, 10)
        # texts
        ot = o * (1 - c01((t - T["num"] + 0.15) / 0.15))
        ref_roll(fr, t, 380, [(T["l3"], 16), (T["r15"], 15), (T["r14"], 14)], ot)
        n_on = t < T["arc0"] - 0.1
        if n_on:
            n = N16 if t < T["r15"] else N14
            t0 = T["l3"] if t < T["r15"] else T["r14"]
            nn = int(round(n * eo3((t - t0 - 0.1) / 0.7)))
            oc = ot * (1 - c01((t - T["r15"]) / 0.15) * (t < T["r14"])) * (1 - c01((t - T["arc0"] + 0.35) / 0.25))
            titled(fr, counter_layer(nn), W / 2, 500, oc)
            titled(fr, label("VERSÍCULOS LIGADOS", 28, (225, 225, 232), 0.10), W / 2, 564, oc, dark=0.8, blur=10)
        if t >= T["arc0"] - 0.1:
            nb = int(round(N_BACK * (XJ - arc_point(Cam(1, 0, 0, 0, 0), pa)[0] / 972.0) / (XJ - XN))) if pa < 1 else N_BACK
            nb = max(0, min(N_BACK, nb))
            oc = ot * c01((t - T["arc0"] + 0.1) / 0.2)
            hit = pa >= 1
            titled(fr, counter_layer(nb, 140, GOLDT if hit else (255, 255, 255)), W / 2, 515, oc,
                   1.0 + 0.10 * max(0.0, 1 - (t - T["arc1"]) / 0.4) * hit)
            titled(fr, label("CAPÍTULOS PRA TRÁS", 30, (225, 225, 232), 0.10), W / 2, 604, oc, dark=0.8, blur=10)
            titled(fr, label(f"A MAIS VOTADA DAS {N14} LIGAÇÕES DE JOÃO 3:14", 22, (190, 190, 200), 0.06), W / 2, 652,
                   oc * c01((t - T["arc0"] - 0.6) / 0.3), dark=0.8, blur=10)

    # ---------------- S2 Numbers 21: the serpents, the bronze serpent lifted on a pole
    if T["num"] - 0.1 <= t < T["l12"] + 0.4:
        u = t - T["num"]
        o = c01((u - 0.5) / 0.6) * (1 - c01((t - T["l11"] - 0.15) / 0.45))
        # the arc from John comes down into the chapter; it fades as the pole rises
        gold_arc(fr, cam, 1.0, (u >= 0) * (1 - 0.6 * ss((u - 1.0) / 0.6)) * (1 - 0.5 * ss((t - T["pole"]) / 0.6)) * (1 - c01((t - T["l11"]) / 0.3)),
                 ymin=lerp(-100, 720, ss((u - 0.15) / 0.6)))
        glow_point(fr, xn, yb, 0.9 * o, 10)
        snakes(fr, t - T["l8"], xn, yb, o * win(t, T["l8"] - 0.2, T["haste"] + 0.4, 0.5, 0.8))
        grow = eo3((t - T["pole"] + 0.15) / 0.8)
        serp = eio((t - T["serp"]) / max(0.8, T["bronze"] + 0.35 - T["serp"]))
        live = 1 + 0.9 * math.exp(-max(0.0, t - T["vivia"]) / 0.45) * (t >= T["vivia"])
        icon(fr, xn, yb - 2, 640, grow, serp, 0.0, o * live)
        if t >= T["vivia"]:
            star_point(fr, xn, yb - 640 * 0.9, 1.4 * o * math.exp(-(t - T["vivia"]) / 0.6), 14,
                       rays=0.5 * math.exp(-(t - T["vivia"]) / 0.8), rot=0.0)
        # texts: "até Números 21" (the landing), then the story
        on = c01((t - T["num"]) / 0.15) * (1 - c01((t - T["l8"]) / 0.3))
        titled(fr, tl(["NÚMEROS 21"], 116, glow=6), W / 2, 380, on, 1.0 + 0.06 * (1 - eo3((t - T["num"]) / 0.35)))
        o8 = win(t, T["l8"], T["pole"] - 0.05, 0.25, 0.2)
        titled(fr, label("NÚMEROS 21:6"), W / 2, 285, o8, dark=0.8, blur=10)
        titled(fr, tl(["MORDIDOS", "POR SERPENTES"], 96, colors=[(255, 255, 255), (255, 150, 160)]), W / 2, 445, o8)
        o9 = win(t, T["pole"], T["olhava"] - 0.05, 0.25, 0.2)
        titled(fr, label("NÚMEROS 21:8–9"), W / 2, 285, o9, dark=0.8, blur=10)
        titled(fr, tl(["UMA SERPENTE", "DE BRONZE"], 96, colors=[(255, 255, 255), (255, 190, 130)]), W / 2, 445, o9)
        o10 = win(t, T["olhava"], T["l11"] + 0.2, 0.2, 0.3)
        titled(fr, label("NÚMEROS 21:9"), W / 2, 285, o10, dark=0.8, blur=10)
        titled(fr, tl(["OLHAVA…"], 110), W / 2, 385, o10, 1.0 + 0.05 * (1 - eo3((t - T["olhava"]) / 0.35)))
        ov = o10 * c01((t - T["vivia"] + 0.05) / 0.2)
        titled(fr, tl(["E VIVIA."], 110, colors=[GOLDT], glow=6), W / 2, 505, ov, 1.0 + 0.08 * (1 - eo3((t - T["vivia"]) / 0.35)))

    # ---------------- flight back along the arc ("agora escuta Jesus"), then John 3:14 and the pole that becomes a cross
    if T["l11"] - 0.1 <= t < T["l17"]:
        u = c01((t - T["l11"]) / (T["l12"] + 0.1 - T["l11"]))
        of = win(t, T["l11"] - 0.1, T["l12"] + 0.5, 0.25, 0.4)
        gold_arc(fr, cam, 1.0, of * 0.9, frm=XN, to=XJ)
        pulse(fr, cam, eio(u), of * 1.2, frm=XN, to=XJ)
        o = c01((t - T["l12"] + 0.1) / 0.4) * (1 - c01((t - T["l14"] + 0.30) / 0.5))
        if o > 0.002:
            star_point(fr, xj, yb, 0.9 * o, 11, rays=0.3 * o)
            grow = eo3((t - T["l12"]) / 1.0)
            bar = c01((t - T["cruz"] + 0.05) / 0.45)
            lift = 1 + 1.0 * math.exp(-max(0.0, t - T["cruz"]) / 0.5) * (t >= T["cruz"])
            icon(fr, xj, yb - 2, 560, grow, 0.0, bar, o * lift)
            if t >= T["cruz"]:
                star_point(fr, xj, yb - 2 - 0.74 * 560, 1.5 * o * math.exp(-(t - T["cruz"]) / 0.7), 15,
                           rays=0.6 * math.exp(-(t - T["cruz"]) / 0.9))
        # the quote of John 3:14 (BLIVRE), clause by clause, "levantou" / "levantado" underlined when spoken
        oq = win(t, T["l12"], T["l13"] - 0.05, 0.3, 0.25)
        if oq > 0:
            rv = [c01((t - T["l12"]) / 0.35), c01((t - T["l12"] - 0.25) / 0.35), c01((t - T["assim"] + 0.1) / 0.35),
                  c01((t - T["assim"] + 0.1 - 0.25) / 0.35)]
            yr = quote_block(fr, Q314, 312, 72, rv, oq, marks=[(0, "levantou", (t - T["levantou"]) / 0.45),
                                                               (3, "levantado", (t - T["levantado"]) / 0.5)])
            titled(fr, label("JOÃO 3:14 · BLIVRE", 26, GOLDT, 0.10), W / 2, yr, oq * c01((t - T["l12"] - 0.4) / 0.3), dark=0.8, blur=10)
        o13 = win(t, T["l13"], T["l14"] - 0.25, 0.25, 0.3)
        titled(fr, label("JOÃO 12:32–33", 30), W / 2, 285, o13, dark=0.8, blur=10)
        titled(fr, tl(["LEVANTADO…"], 110, colors=[GOLDT], glow=6), W / 2, 395, o13, 1.0 + 0.05 * (1 - eo3((t - T["l13"]) / 0.35)))
        oc = o13 * c01((t - T["cruz"] + 0.05) / 0.2)
        titled(fr, tl(["NUMA CRUZ."], 110), W / 2, 515, oc, 1.0 + 0.08 * (1 - eo3((t - T["cruz"]) / 0.35)))

    # ---------------- the two ends of one arc: "lá, quem olhava, vivia / aqui, quem crê nele tem a vida eterna"
    if t >= T["l14"] - 0.4:
        u = t - T["l14"] + 0.4
        o = c01((u - 0.5) / 0.6)
        gold_arc(fr, cam, 1.0, o * (0.95 + 0.1 * math.sin(t * 2.5)), width=3)
        hN, hJ = 250, 250
        lN = 1 + 0.8 * math.exp(-max(0.0, t - T["l14"]) / 0.6) * (t >= T["l14"])
        lJ = 1 + 0.8 * math.exp(-max(0.0, t - T["l15"]) / 0.6) * (t >= T["l15"])
        oi = o * (1 - 0.35 * ss((t - T["l17"]) / 1.0))
        icon(fr, xn, yb - 2, hN, 1.0, 1.0, 0.0, oi * lN, lw=2)
        icon(fr, xj, yb - 2, hJ, 1.0, 0.0, 1.0, oi * lJ, lw=2)
        if T["l17"] - 0.2 > t:
            star_point(fr, xj, yb, 0.8 * o, 10, rays=0.25 * o)
        o14 = win(t, T["l14"], T["l16"] - 0.15, 0.25, 0.3)
        titled(fr, label("LÁ · NÚMEROS 21:9", 26), W / 2, 300, o14, dark=0.8, blur=10)
        titled(fr, tl(["QUEM OLHAVA, VIVIA."], 76, 700), W / 2, 372, o14, 1.0 + 0.04 * (1 - eo3((t - T["l14"]) / 0.35)))
        o15 = o14 * c01((t - T["l15"]) / 0.25)
        titled(fr, label("AQUI · JOÃO 3:15", 26), W / 2, 482, o15, dark=0.8, blur=10)
        titled(fr, tl(["QUEM CRÊ NELE TEM", "A VIDA ETERNA."], 76, 700, colors=[(255, 255, 255), GOLDT]), W / 2, 604, o15,
               1.0 + 0.04 * (1 - eo3((t - T["l15"]) / 0.35)))
        # "e só depois vem João 3:16": the count rolls forward
        o16 = win(t, T["l16"] - 0.05, T["l17"] + 0.2, 0.25, 0.3)
        ref_roll(fr, t, 400, [(T["l16"] - 0.05, 14), (T["f15"], 15), (T["f16"], 16)], o16)

    # ---------------- John 3:16, at last: its 80 links bloom over the whole Bible
    if t >= T["l17"] - 0.05:
        u = t - T["l17"]
        o = c01(u / 0.3)
        fan(fr, F16, u * 0.8, cam, o * (1 - 0.35 * ss((t - T["l18"]) / 1.0)), lo=0.5, hi=1.0, dur=1.3)
        ray = (0.75 + 0.25 * math.exp(-u / 0.5)) * o
        star_point(fr, float(cam.X(XJ16)), yb, (1.2 + 0.6 * math.exp(-u / 0.4)) * o, 14 + 6 * ray,
                   rays=ray * (0.95 + 0.05 * math.sin(t * 2.0)), rot=0.05 * math.sin(t * 0.7))
        oq = win(t, T["l17"], T["l18"] - 0.05, 0.35, 0.3)
        rv = [c01(u / 0.4), c01((u - 0.9) / 0.4), c01((t - T["filho"] + 0.3) / 0.4)]
        yr = quote_block(fr, Q316, 330, 78, rv, oq)
        titled(fr, label("JOÃO 3:16 · BLIVRE", 26, GOLDT, 0.10), W / 2, yr, oq * c01((u - 0.5) / 0.3), dark=0.8, blur=10)
        # the call
        o18 = win(t, T["l18"], T["l19"] - 0.05, 0.3, 0.25)
        titled(fr, tl(["VOCÊ CONHECIA", "A LIGAÇÃO", "QUE VEM ANTES?"], 92, colors=[(255, 255, 255), (255, 255, 255), GOLDT]),
               W / 2, 450, o18, 1.0 + 0.04 * (1 - eo3((t - T["l18"]) / 0.4)))
        o19 = c01((t - T["l19"]) / 0.3)
        titled(fr, tl(["COMENTA:"], 104), W / 2, 360, o19, 1.0 + 0.05 * (1 - eo3((t - T["l19"]) / 0.4)))
        titled(fr, tl(["“EU NÃO SABIA”"], 104, colors=[GOLDT], glow=6), W / 2, 480, o19 * c01((t - T["nao"] + 0.1) / 0.25),
               1.0 + 0.06 * (1 - eo3((t - T["nao"]) / 0.4)))
        cr = text_layer([f"REFERÊNCIAS CRUZADAS: OPENBIBLE.INFO (CC BY) · {fmt(S['n_pairs'])} PARES DE VERSÍCULOS",
                         "TEXTO: BÍBLIA LIVRE (BLIVRE), CC BY 4.0 BR"], font("mono", 22), color=(170, 170, 180), track=0.02)
        paste(fr, cr, W / 2, 1478, o19 * 0.9)

    subtitle(fr, t)
    fr *= VIGN
    g_ = cv2.resize(GRAIN[fi % len(GRAIN)], (W, H), interpolation=cv2.INTER_NEAREST)
    fr += g_[..., None] * 0.008
    return np.clip(fr, 0, 1)


if __name__ == "__main__":
    if "--keys" in sys.argv:
        print(json.dumps({k: round(v, 3) for k, v in T.items()}, indent=0)); sys.exit(0)
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
