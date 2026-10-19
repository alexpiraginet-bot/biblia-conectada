#!/usr/bin/env python3
""""Antes do Natal, já estava escrito" — Reels 9:16 documentary. Cold open (flash-forward of the strongest moment) ->
rewind to ~700 a.C. -> the prophecies of the birth narratives followed on a 3D map of the real relief, diving into
recreations of each place. Every number comes from code (tools/analyze.py, tools/places.py, dome.py asserts).

  python3 film.py --still 1.0,12.5      -> renders/.stills/still-*.jpg
  python3 film.py                       -> renders/.film/video.mp4 (no audio; score.py + finalize.py follow)
"""
import json, math, subprocess, sys, time
from pathlib import Path
import numpy as np, cv2
from fx import *
import dome as D
import mapscenes as MS

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
FPS = 24
NARR = json.load(open(WORK / "narr.json")); LINES = NARR["lines"]; DUR = float(NARR["duration"])
NF = int(round(DUR * FPS))
LID = {L["id"]: L for L in LINES}
STATS = json.load(open(ROOT / "data/natal-stats.json")); PLACES = json.load(open(ROOT / "data/places.json"))
SCR = ROOT / "renders/.stills"


def WT(lid, k): return LID[lid]["words"][k]["t0"]
def WE(lid, k): return LID[lid]["words"][k]["t1"]
def LS(lid): return LID[lid]["t0"]
def LE(lid): return LID[lid]["t1"]


# ------------------------------------------------------------------ numbers (all computed upstream; asserted here)
def kp(a, b): return STATS["key_pairs"][f"{a} -> {b}"]["sum"]
V_IS714 = kp("Isaías 7:14", "Mateus 1:23"); V_MQ52 = kp("Miqueias 5:2", "Mateus 2:6"); V_OS111 = kp("Oseias 11:1", "Mateus 2:15")
V_IS96 = kp("Isaías 9:6", "Lucas 2:11"); V_JR3217 = kp("Jeremias 32:17", "Lucas 1:37")
TOP3 = STATS["top10_by_sum"][:3]
assert (V_IS714, V_MQ52, V_OS111, V_IS96, V_JR3217) == (333, 226, 104, 228, 241)
assert [r[2] for r in TOP3] == [333, 241, 228] and TOP3[0][:2] == ["Isaías 7:14", "Mateus 1:23"]
KM_NB = PLACES["_distances_km"]["Nazareth-Bethlehem"]; KM_JB = PLACES["_distances_km"]["Bethlehem-Jerusalem"]
assert round(KM_NB) == 111 and round(KM_JB) == 8
assert (D.N_PAIRS, D.N_OTV, D.N_BOOKS, len(D.P96)) == (2094, 1561, 38, 212)
N_REFS = int(D.A.STATS["stats"]["rows_total"]); assert N_REFS == 344799 == STATS["rows_total"]


def fmt(n): return f"{int(n):,}".replace(",", ".")


# ------------------------------------------------------------------ timeline (film seconds, from the narration words)
B = dict(
    t_land=WT("teaser", 4), t_assim=WT("teaser", 6), t_esta=WT("teaser", 7), t_escr=WT("teaser", 8),
    rew0=LE("teaser"), hook0=LS("hook"), prof=WT("hook", 6), city=WT("hook", 11), belem=WT("belem", 0),
    data0=LE("belem") + 0.25, nasc=WT("dados", 1), quatro=WT("dados", 5), liga=WT("dados", 7), testa=WE("dados", 17),
    livros0=WT("livros", 1), naz0=LE("livros") + 0.18, naz_lab=WT("nazare", 0), clipN0=LS("anjo"), isa=WT("isaias", 1),
    virgem=WT("virgem", 0), votes0=LE("virgem") + 0.05, votada=WT("votada", 4), km0=LE("votada") + 0.14, km_go=WT("km", 0),
    km_land=WT("km", 3), magos0=LS("magos"), jer=WT("magos", 3), clipJ0=LS("herodes"), herodes=WT("herodes", 4),
    esc0=LS("escrito"), esc_land=WT("escrito", 1), assim=WT("escrito", 3), esta=WT("escrito", 4), escr=WT("escrito", 5),
    egy0=LS("egito"), egy_word=WT("egito", 6), clipE0=LS("filho"), volta0=LS("conectado"), biblia=WT("conectado", 6),
    is96=WT("is96", 0), menino=WT("menino", 0), clipP0=LE("menino"), depois=WT("depois", 0), salv=WT("salvador", 0),
    final0=LE("salvador") + 0.09, antes=WT("final", 0), ja=WT("final", 3), end=DUR,
)
B["clipB0"] = B["esc_land"] + 0.63
B["dome0"] = B["volta0"] + 1.53

# ------------------------------------------------------------------ clips (Kling 3.0 image-to-video of GPT Image 2.5 stills)
CLIPS = {k: ROOT / f"source/clips/{k}.mp4" for k in ("belem", "nazare", "jerusalem", "egito", "pastores")}
_CL = {}


def clip_frames(name):
    if name not in _CL:
        if len(_CL) >= 2: _CL.pop(next(iter(_CL)))
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(CLIPS[name]), "-vf", "scale=1084:1920,crop=1080:1920",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        _CL[name] = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    return _CL[name]


def grade_clip(x):
    """bring the generated footage into the film's look: denser blacks, navy shadows, warm highlights, a touch less chroma"""
    x = np.clip(x, 0, 1)
    x = x * x * (3 - 2 * x) * 0.35 + x * 0.65
    lum = x.mean(-1, keepdims=True)
    x = lum + (x - lum) * 0.88
    x = x + (1 - lum) ** 3 * np.array([-0.012, 0.0, 0.022], np.float32) + lum ** 3 * np.array([0.025, 0.008, -0.02], np.float32)
    return np.clip(x * 0.96, 0, 1).astype(np.float32)


def clip_at(name, src_t, zoom=1.0, cx=0.5, cy=0.5, blur=0.0):
    fr_ = clip_frames(name)
    i = int(round(src_t * 24)); i = min(max(i, 0), len(fr_) - 1)
    img = fr_[i].astype(np.float32) / 255.0
    if zoom != 1.0:
        M_ = np.array([[zoom, 0, (1 - zoom) * W * cx], [0, zoom, (1 - zoom) * H * cy]], np.float32)
        img = cv2.warpAffine(img, M_, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if blur > 0.3: img = cv2.GaussianBlur(img, (0, 0), blur)
    return grade_clip(img)


def top_shade(fr, amount=0.45, h=0.55):
    g = np.clip(1 - np.linspace(0, 1, int(H * h)) , 0, 1) ** 1.6
    fr[:len(g)] *= (1 - amount * g)[:, None, None]


def flash(fr, a, col=(1.0, 0.86, 0.62)):
    if a > 0.002: fr += np.asarray(col, np.float32) * a


def tag(fr, text, t, t0, t1):
    op = win(t, t0, t1, 0.4, 0.3) * 0.85
    if op <= 0: return
    lay = text_layer([text], font("mono", 21), (215, 222, 235), track=0.18)
    titled(fr, lay, 84, 268, op, anchor="l", dark=0.7, blur=8)


# ------------------------------------------------------------------ typography pieces
def stamp(fr, words, times, t, y0=470, size=132, gap=1.0, op=1.0):
    """kinetic words, stacked: each lands at its spoken time (scale-down + flash)"""
    f = font("grot", size, 700)
    for k, (w_, tw) in enumerate(zip(words, times)):
        if t < tw - 0.04: continue
        u = (t - tw + 0.04) / 0.22
        sc = 1.0 + 0.32 * (1 - eo3(u))
        o = c01(u * 2.5) * op
        col = (255, 214, 140) if k == len(words) - 1 else (255, 255, 255)
        lay = text_layer([w_], f, col, track=0.02)
        y = y0 + k * size * gap
        titled(fr, lay, W / 2, y, o, sc, dark=0.95, blur=16)
        if u < 1: star_point(fr, W / 2, y, 0.25 * (1 - u), 120)


def link_card(fr, t, t0, ref_a, sub_a, ref_b, votes=None, t_votes=None, y0=360, t1=None, op=1.0, quote=None, t_quote=None,
              t_link=None):
    """OLD TESTAMENT ref (gold) -> line of light drawing down -> NEW TESTAMENT ref; optional quote and vote odometer"""
    if t < t0 - 0.05: return
    o = op * (win(t, t0, t1, 0.25, 0.35) if t1 else c01((t - t0) / 0.25))
    if o <= 0.002: return
    dy = 16 * (1 - eo3((t - t0) / 0.5))
    la = text_layer([ref_a], font("monob", 44), (255, 214, 140), track=0.08)
    titled(fr, la, W / 2, y0 + dy, o, dark=0.9, blur=12)
    if sub_a:
        ls = text_layer([sub_a], font("mono", 24), (205, 212, 228), track=0.14)
        titled(fr, ls, W / 2, y0 + 44 + dy, o * 0.9, dark=0.8, blur=8)
    yq = y0 + 120
    if quote:
        oq = o * c01((t - (t_quote or t0)) / 0.35)
        lq = text_layer(quote, font("serifi", 62, 500), (255, 236, 200), lh=1.02)
        titled(fr, lq, W / 2, yq + 30 * (len(quote) - 1), oq, dark=0.95, blur=14)
        yq += 70 * len(quote) + 10
    tl_ = t_link if t_link is not None else t0 + 0.5
    u = eio2((t - tl_) / 0.55)
    ya, yb = yq - 20, yq + 120
    if u > 0:
        y_ = ya + (yb - ya) * u
        glow_lines(fr, [np.array([[W / 2, ya], [W / 2, y_]])], GOLD * o, width=3, core=1.0, glow=0.8, big=0.6)
        star_point(fr, W / 2, y_, 0.9 * o * (1 - 0.6 * c01((u - 0.95) / 0.05)), 7)
    if u >= 1:
        ob = o * c01((t - tl_ - 0.55) / 0.2)
        lb = text_layer([ref_b], font("monob", 44), (255, 255, 255), track=0.08)
        titled(fr, lb, W / 2, yb + 44, ob, dark=0.9, blur=12)
        if votes is not None:
            tv = t_votes if t_votes is not None else tl_ + 0.6
            v = votes * eo3((t - tv) / 0.9)
            sp = votes * (eo3((t - tv) / 0.9) - eo3((t - tv - 1 / FPS) / 0.9))
            if t >= tv:
                ov = ob * c01((t - tv) / 0.15)
                shadow_box(fr, W / 2, yb + 128, 300, 70, 0.55 * ov)
                odometer(fr, v, W / 2 - 40, yb + 128, font("monob", 60), (255, 214, 140), digits=len(str(votes)), op=ov,
                         speed=sp)
                lv = text_layer(["VOTOS"], font("mono", 26), (215, 222, 235), track=0.2)
                paste(fr, lv, W / 2 + 70, yb + 132, ov, anchor="l")


def shadow_box(fr, cx, cy, w, h, a):
    if a <= 0: return
    x0, x1 = int(max(0, cx - w / 2)), int(min(W, cx + w / 2)); y0, y1 = int(max(0, cy - h / 2)), int(min(H, cy + h / 2))
    if x0 < x1 and y0 < y1:
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        m = np.exp(-(((xx - cx) / (w / 2)) ** 4 + ((yy - cy) / (h / 2)) ** 4))
        fr[y0:y1, x0:x1] *= (1 - a * m)[..., None]


# ------------------------------------------------------------------ motion blur for the fast map moves
def mb(fn, t, *a, n=3, shutter=0.5):
    """motion blur on the terrain only: the GL image is averaged over n sub-frames, the overlays are drawn once at t"""
    if n <= 1: return fn(t, *a)
    acc = None
    for k in range(n):
        tt = t + (k / (n - 1) - 0.5) * shutter / FPS
        MS.CAPTURE[0] = True
        try:
            fn(tt, *a)
            raise RuntimeError("shot did not hand back its GL frame")
        except MS.Captured as c:
            acc = c.img if acc is None else acc + c.img
        finally:
            MS.CAPTURE[0] = False
    MS.BASE[0] = acc / n
    try:
        return fn(t, *a)
    finally:
        MS.BASE[0] = None


# ------------------------------------------------------------------ scenes
T_CUT1 = 0.62


def sc_teaser(t, stamps=True):
    """flash-forward montage: the 111 km flight (fastest moment) -> the landing in Belém -> 'assim está escrito'"""
    if t < T_CUT1:
        tk = B["km_go"] + 0.55 + t * 0.9            # a slice from the middle of the Nazaré -> Belém flight
        fr, _ = mb(MS.shot_km, tk, B["km0"], B["km_go"], B["km_land"], B["magos0"], shutter=0.45)
        flash(fr, 0.7 * ei3((t - (T_CUT1 - 0.08)) / 0.08))
        return fr
    if t < B["t_land"]:
        fr = mb(MS.shot_escrito, t, T_CUT1 - 0.25, B["t_land"], B["t_land"] + 0.6)
        flash(fr, 0.6 * (1 - eo3((t - T_CUT1) / 0.12)) + 0.9 * ei3((t - B["t_land"] + 0.18) / 0.18))
        return fr
    u = t - B["t_land"]
    fr = clip_at("belem", u, zoom=1.0 + 0.12 * (1 - eo3(u / 0.5)))
    flash(fr, 0.9 * (1 - eo3(u / 0.35)))
    top_shade(fr, 0.35)
    if stamps:
        stamp(fr, ["ASSIM", "ESTÁ", "ESCRITO"], [B["t_assim"], B["t_esta"], B["t_escr"]], t, y0=520)
        lm = text_layer(["MATEUS 2:5"], font("mono", 28), (215, 222, 235), track=0.2)
        titled(fr, lm, W / 2, 520 + 3 * 132 - 40, c01((t - B["t_escr"] - 0.15) / 0.3) * 0.9, dark=0.8, blur=8)
    return fr


def sc_rewind(t):
    a, b = B["rew0"], B["hook0"]
    k = c01((t - a) / (b - a - 0.14))
    ts = B["rew0"] * (1 - ei3(k) * 0.35 - 0.65 * k)          # scrub back through the teaser, accelerating
    fr = sc_teaser(max(ts, 0.0), stamps=True)
    lum = fr.mean(-1, keepdims=True); fr = lum + (fr - lum) * 0.45
    sh = 6 + int(10 * k)
    fr[..., 0] = np.roll(fr[..., 0], sh, axis=1); fr[..., 2] = np.roll(fr[..., 2], -sh, axis=1)
    band = (0.85 + 0.15 * np.sin(np.linspace(0, 60, H) + t * 90))[:, None, None]
    fr = fr * band * 0.8
    # the years roll back: 2026 d.C. -> 1 d.C. | 1 a.C. -> 700 a.C.
    kr = c01((t - a) / 0.62)                                   # years roll in 0.62 s, then hold
    k1 = c01(kr / 0.55); k2 = c01((kr - 0.55) / 0.45)
    if kr < 0.55:
        y = 2026 - 2025 * ei3(k1) ** 0.85; era = "d.C."; sp = 2025 * (ei3(k1) ** 0.85 - ei3(c01(k1 - 0.05)) ** 0.85)
    else:
        y = 1 + 699 * eo3(k2); era = "a.C."; sp = 699 * (eo3(k2) - eo3(c01(k2 - 0.12)))
    hold = c01((t - a - 0.62) / 0.1)
    shadow_box(fr, W / 2, 960, 820, 300, 0.8)
    n = odometer(fr, y, W / 2 - 70, 950, font("monob", 170), (255, 214, 140), digits=4 if y >= 999.5 else 3 if y >= 99.5 else None,
                 sep="", speed=sp * (1 - hold))
    le = text_layer([era], font("monob", 64), (255, 255, 255), track=0.02)
    paste(fr, le, W / 2 - 70 + n / 2 + 26, 972, 1.0, anchor="l")
    if hold > 0: star_point(fr, W / 2, 950, 0.25 * hold * (1 + 0.3 * math.sin(t * 40)), 160)
    flash(fr, 1.1 * ei3((t - (b - 0.12)) / 0.12))
    return fr


def sc_hook(t):
    fr = mb(MS.shot_hook, t, B["hook0"], B["prof"], B["city"], B["belem"], B["data0"] + 0.4, n=3 if t > B["city"] else 1)
    flash(fr, 1.0 * (1 - eo3((t - B["hook0"]) / 0.4)))
    o1 = win(t, B["hook0"], B["prof"] + 0.9, 0.2, 0.5)
    shadow_box(fr, W / 2, 330, 780, 120, 0.5 * o1)
    l1 = text_layer(["700 ANOS ANTES DO NATAL"], font("monob", 46), (255, 214, 140), track=0.08)
    titled(fr, l1, W / 2, 330, o1, dark=0.9, blur=12)
    o2 = win(t, B["prof"] - 0.05, B["belem"] - 0.6, 0.25, 0.5)
    lp = text_layer(["MIQUEIAS"], font("grot", 74, 650), (255, 255, 255), track=0.12)
    ls = text_layer(["PROFETA · SÉCULO VIII a.C."], font("mono", 26), (255, 214, 140), track=0.16)
    dx = 20 * (1 - eo3((t - B["prof"]) / 0.5))
    titled(fr, lp, W / 2 + dx, 470, o2, dark=0.9, blur=14); titled(fr, ls, W / 2 + dx, 532, o2 * 0.95, dark=0.8, blur=8)
    o3 = win(t, B["belem"] + 0.25, B["data0"] + 0.3, 0.3, 0.3)
    lq = text_layer(["“E tu, Belém Efrata…", "de ti me sairá o que", "governará em Israel”"], font("serifi", 58, 500), (255, 236, 200), lh=1.0)
    titled(fr, lq, W / 2, 400, o3, dark=0.95, blur=14)
    lr = text_layer(["MIQUEIAS 5:2"], font("mono", 26), (255, 214, 140), track=0.2)
    titled(fr, lr, W / 2, 530, o3 * 0.95, dark=0.8, blur=8)
    if t > B["data0"] - 0.05:
        flash(fr, 1.0 * ei3((t - B["data0"] + 0.05) / 0.4))
    return fr


CAM_D = D.DCam(1000, 0.5, 0.0, 540, 1180)
_rng = np.random.default_rng(1561)
_order = np.argsort(D.BX0 + _rng.uniform(0, 0.03, D.N_PAIRS))
LAUNCH = np.empty(D.N_PAIRS, np.float32)
LAUNCH[_order] = np.linspace(0, 1, D.N_PAIRS) ** 0.9
SPAN_N = (D.BX1 - D.BX0) / (D.BX1 - D.BX0).max()
DUR_ARC = (0.32 + 0.38 * SPAN_N).astype(np.float32)
OTV = D.A.PA[D.SEL]
_DCACHE = {}


def data_prog(t):
    t0 = B["liga"] + 0.05; sweep = (B["testa"] - 0.45) - t0
    return np.clip((t - t0 - LAUNCH * sweep) / DUR_ARC, 0, 1).astype(np.float32)


def sc_data(t):
    fr = np.zeros((H, W, 3), np.float32)
    a, b = B["data0"], B["naz0"]
    cam = CAM_D
    grow = eo3((t - a) / 0.7)
    bh = {c for c in D.BIRTH_CH} if t > B["nasc"] - 0.1 else None
    prog = data_prog(t)
    collapse = ss((t - (b - 0.75)) / 0.6)
    if prog.max() > 0:
        if prog.min() >= 1:
            img = _DCACHE.get("full")
            if img is None: img = _DCACHE["full"] = D.birth_arcs(prog, head=None)
        else:
            img = D.birth_arcs(prog, head=True)
        pulse = 1.0 + 0.25 * win(t, B["livros0"] - 0.1, B["livros0"] + 1.4, 0.2, 0.8)
        fr += D.warp(img, cam, squash=1 - 0.97 * collapse, sx=1 - 0.985 * collapse, x_pivot=0.80) * pulse * (1 - 0.5 * collapse)
    D.draw_bars(fr, cam, op=(1 - collapse) * c01((t - a) / 0.2), grow=grow, hi=bh, hi_col=GOLD)
    # labels under the bar
    o_l = c01((t - a - 0.4) / 0.4) * (1 - collapse)
    lot = text_layer(["ANTIGO TESTAMENTO"], font("mono", 22), (190, 198, 215), track=0.22)
    titled(fr, lot, cam.X(D.X_OT_END / 2), 1262, o_l * 0.85, dark=0.7, blur=8)
    if t > B["nasc"] - 0.1:
        ob = c01((t - B["nasc"] + 0.1) / 0.3) * (1 - collapse)
        xb = float(cam.X((D.X_MT + D.X_LC) / 2))
        lb = text_layer(["NASCIMENTO"], font("monob", 24), (255, 214, 140), track=0.18)
        lb2 = text_layer(["MT 1–2 · LC 1–2"], font("mono", 22), (215, 222, 235), track=0.12)
        titled(fr, lb, min(xb, W - 150), 1262, ob, dark=0.8, blur=8); titled(fr, lb2, min(xb, W - 150), 1296, ob * 0.9, dark=0.8, blur=8)
        star_point(fr, xb, cam.Y(0), (0.5 + 0.6 * (prog > 0.999).mean()) * ob, 10)
    # counters (rolling digits)
    o_c1 = win(t, B["quatro"] - 0.1, B["liga"] + 0.25, 0.2, 0.25)
    if o_c1 > 0:
        lq = text_layer(["4 CAPÍTULOS"], font("grot", 92, 700), (255, 255, 255), track=0.02)
        titled(fr, lq, W / 2, 400, o_c1, 1 + 0.15 * (1 - eo3((t - B["quatro"]) / 0.35)), dark=0.9, blur=14)
        v = 180 * eo3((t - B["quatro"] - 0.15) / 0.6)
        odometer(fr, v, W / 2 - 110, 510, font("monob", 52), (255, 214, 140), digits=3, op=o_c1)
        lv = text_layer(["VERSÍCULOS"], font("mono", 30), (215, 222, 235), track=0.16)
        paste(fr, lv, W / 2 - 40, 514, o_c1, anchor="l")
    o_c2 = win(t, B["liga"] + 0.05, B["livros0"] - 0.05, 0.25, 0.25)
    if o_c2 > 0:
        done = prog > 0.02
        nv = len(np.unique(OTV[done])) if done.any() else 0
        nv_prev = len(np.unique(OTV[data_prog(t - 1 / FPS) > 0.02])) if t > B["liga"] else 0
        shadow_box(fr, W / 2, 420, 700, 190, 0.45 * o_c2)
        odometer(fr, nv, W / 2, 410, font("monob", 150), (255, 214, 140), digits=4, op=o_c2, speed=nv - nv_prev)
        lc = text_layer(["VERSÍCULOS DO ANTIGO TESTAMENTO"], font("mono", 28), (215, 222, 235), track=0.14)
        titled(fr, lc, W / 2, 512, o_c2, dark=0.8, blur=8)
        npairs = int((prog > 0.02).sum())
        odometer(fr, npairs, W / 2 - 92, 578, font("monob", 44), (255, 255, 255), digits=4, op=o_c2 * 0.9,
                 speed=npairs - int((data_prog(t - 1 / FPS) > 0.02).sum()))
        ll = text_layer(["LIGAÇÕES"], font("mono", 26), (215, 222, 235), track=0.16)
        paste(fr, ll, W / 2 + 22, 582, o_c2 * 0.9, anchor="l")
    o_c3 = win(t, B["livros0"] - 0.1, b - 0.5, 0.2, 0.3)
    if o_c3 > 0:
        v = 38 * eo3((t - B["livros0"] + 0.05) / 0.7)
        shadow_box(fr, W / 2, 420, 640, 190, 0.45 * o_c3)
        n = odometer(fr, v, W / 2 - 80, 410, font("monob", 150), (255, 214, 140), digits=2, op=o_c3,
                     speed=38 * (eo3((t - B["livros0"] + 0.05) / 0.7) - eo3((t - B["livros0"] + 0.05 - 1 / FPS) / 0.7)))
        l39 = text_layer(["/39"], font("monob", 84), (255, 255, 255))
        paste(fr, l39, W / 2 - 80 + n / 2 + 10, 430, o_c3, anchor="l")
        lc = text_layer(["LIVROS DO ANTIGO TESTAMENTO"], font("mono", 28), (215, 222, 235), track=0.14)
        titled(fr, lc, W / 2, 512, o_c3, dark=0.8, blur=8)
        # sweep along the Old Testament books; Jonah is the only one with no arc into the birth chapters
        sw = c01((t - B["livros0"]) / 1.1)
        xs = float(cam.X(sw * D.X_OT_END))
        if 0 < sw < 1: star_point(fr, xs, cam.Y(0), 0.8 * o_c3, 8)
        xj = float(cam.X((D.A.BOOK_FIRST_CHAP[D.JONAH] + 2) / D.A.NCH))
        oj = o_c3 * c01((t - B["livros0"] - 0.85) / 0.3)
        lj = text_layer(["JONAS"], font("monob", 24), (255, 140, 120), track=0.16)
        lj2 = text_layer(["o único de fora"], font("serifi", 34, 500), (255, 200, 190))
        glow_lines(fr, [np.array([[xj, 1190], [xj, 1228]])], np.array([1.0, 0.45, 0.4], np.float32) * oj, width=2, glow=0.5, big=0.2)
        titled(fr, lj, xj, 1330, oj, dark=0.8, blur=8); titled(fr, lj2, xj, 1368, oj * 0.95, dark=0.8, blur=8)
    if collapse > 0:
        px, py = float(cam.X(0.80)), float(cam.Y(0.0))
        star_point(fr, px, py, 2.5 * collapse, 10 + 40 * collapse, rays=0.6 * collapse, rot=0.3)
        flash(fr, 1.0 * ei3((t - (b - 0.2)) / 0.2))
    if t < a + 0.35: flash(fr, 1.0 * (1 - eo3((t - a) / 0.35)))
    return fr


def sc_nazmap(t):
    fr = MS.shot_nazare(t, B["naz0"], B["naz_lab"], B["clipN0"] - 0.36, B["clipN0"])
    flash(fr, 0.8 * (1 - eo3((t - B["naz0"]) / 0.3)))
    return fr


def sc_nazclip(t):
    u = t - B["clipN0"]
    fr = clip_at("nazare", u * 0.87, zoom=1.0 + 0.10 * (1 - eo3(u / 0.6)) + 0.02 * u / 6)
    flash(fr, 0.55 * (1 - eo3(u / 0.4)))
    top_shade(fr, 0.55 * c01((t - B["isa"] + 0.3) / 0.4))
    tag(fr, "NAZARÉ · RECRIAÇÃO", t, B["clipN0"] + 0.3, B["votes0"])
    link_card(fr, t, B["isa"] - 0.05, "ISAÍAS 7:14", "SÉCULO VIII a.C.", "MATEUS 1:23", y0=380, t1=B["votes0"] + 0.1,
              quote=["“Eis que a virgem", "conceberá”"], t_quote=B["virgem"], t_link=B["virgem"] + 0.75)
    return fr


def sc_votes(t):
    a, b = B["votes0"], B["km0"]
    bgimg = _DCACHE.get("vbg")
    if bgimg is None:
        bgimg = _DCACHE["vbg"] = cv2.GaussianBlur(clip_at("nazare", (b - B["clipN0"]) * 0.87), (0, 0), 18) * 0.32
    fr = bgimg.copy()
    o = win(t, a, b, 0.15, 0.2)
    lt = text_layer(["A LIGAÇÃO MAIS VOTADA", "DO NATAL"], font("grot", 58, 650), (255, 255, 255), track=0.04, lh=1.05)
    titled(fr, lt, W / 2, 400, o * c01((t - B["votada"] + 0.2) / 0.3), dark=0.9, blur=12)
    k = eo3((t - a - 0.1) / 1.3)
    sp = 333 * (k - eo3((t - a - 0.1 - 1 / FPS) / 1.3))
    odometer(fr, 333 * k, W / 2, 640, font("monob", 230), (255, 214, 140), digits=3, op=o, speed=sp)
    lv = text_layer(["VOTOS"], font("mono", 40), (215, 222, 235), track=0.3)
    titled(fr, lv, W / 2, 790, o, dark=0.8, blur=8)
    labels = [f"{a_.upper()}  →  {b_.upper()}" for a_, b_, _ in TOP3]
    for r, ((a_, b_, v), lab) in enumerate(zip(TOP3, labels)):
        tr = a + 0.9 + r * 0.18
        orr = o * c01((t - tr) / 0.25)
        if orr <= 0: continue
        y = 930 + r * 92
        frac = v / TOP3[0][2] * eo3((t - tr) / 0.7)
        x0, x1 = 120, 120 + int(840 * frac)
        col = GOLD if r == 0 else np.array([0.62, 0.66, 0.78], np.float32)
        fr[y + 18:y + 26, x0:x1] = fr[y + 18:y + 26, x0:x1] * (1 - orr) + col * orr
        ll = text_layer([f"#{r + 1}  {lab}"], font("mono", 25), (255, 255, 255) if r == 0 else (200, 206, 220), track=0.04)
        paste(fr, ll, 120, y - 6, orr, anchor="l")
        lv2 = text_layer([str(int(round(v * eo3((t - tr) / 0.7))))], font("monob", 28), (255, 214, 140) if r == 0 else (200, 206, 220))
        paste(fr, lv2, 960, y - 6, orr, anchor="r")
    lf = text_layer(["votos de leitores no OpenBible.info"], font("mono", 22), (170, 176, 190), track=0.06)
    paste(fr, lf, W / 2, 1230, o * c01((t - a - 1.4) / 0.3) * 0.9)
    flash(fr, 0.5 * (1 - eo3((t - a) / 0.25)))
    return fr


def sc_km(t):
    fr, km = mb(MS.shot_km, t, B["km0"], B["km_go"], B["km_land"], B["magos0"])
    o = win(t, B["km_go"] - 0.15, B["magos0"] + 0.1, 0.15, 0.3)
    shadow_box(fr, W / 2, 420, 720, 220, 0.5 * o)
    gl = B["km_land"] - B["km_go"]
    sp = KM_NB * (eio((t - B["km_go"]) / gl) - eio((t - 1 / FPS - B["km_go"]) / gl))
    n = odometer(fr, km, W / 2 - 70, 400, font("monob", 170), (255, 214, 140), digits=3, op=o, speed=sp)
    lk = text_layer(["KM"], font("monob", 70), (255, 255, 255))
    paste(fr, lk, W / 2 - 70 + n / 2 + 16, 420, o, anchor="l")
    ls = text_layer(["NAZARÉ → BELÉM · EM LINHA RETA"], font("mono", 26), (215, 222, 235), track=0.12)
    titled(fr, ls, W / 2, 528, o * 0.95, dark=0.8, blur=8)
    flash(fr, 0.6 * (1 - eo3((t - B["km0"]) / 0.25)))
    return fr


def sc_magos(t):
    km_pts = MS.nb_path()
    fr = MS.shot_magos(t, B["magos0"], B["jer"], B["clipJ0"], km_pts=km_pts)
    flash(fr, 0.9 * ei3((t - (B["clipJ0"] - 0.16)) / 0.16))
    return fr


def sc_jerclip(t):
    u = t - B["clipJ0"]
    fr = clip_at("jerusalem", 0.35 + u, zoom=1.0 + 0.08 * (1 - eo3(u / 0.6)))
    flash(fr, 0.8 * (1 - eo3(u / 0.35)))
    top_shade(fr, 0.25)
    tag(fr, "JERUSALÉM · TEMPLO DE HERODES · RECRIAÇÃO", t, B["clipJ0"] + 0.3, B["esc0"])
    flash(fr, 0.9 * ei3((t - (B["esc0"] - 0.12)) / 0.12))
    return fr


def sc_escmap(t):
    fr = mb(MS.shot_escrito, t, B["esc0"] - 0.02, B["esc_land"], B["clipB0"] + 0.4)
    o = win(t, B["esc0"], B["clipB0"], 0.1, 0.1)
    n = odometer(fr, KM_JB * eo3((t - B["esc0"]) / (B["esc_land"] - B["esc0"])), W / 2 - 50, 400, font("monob", 120),
                 (255, 214, 140), digits=1, op=o)
    lk = text_layer(["KM"], font("monob", 54), (255, 255, 255))
    paste(fr, lk, W / 2 - 50 + n / 2 + 12, 414, o, anchor="l")
    flash(fr, 0.9 * ei3((t - (B["clipB0"] - 0.18)) / 0.18))
    return fr


def sc_belclip(t):
    u = t - B["clipB0"]
    fr = clip_at("belem", u, zoom=1.0 + 0.12 * (1 - eo3(u / 0.5)))
    flash(fr, 0.9 * (1 - eo3(u / 0.35)))
    top_shade(fr, 0.4)
    stamp(fr, ["ASSIM", "ESTÁ", "ESCRITO"], [B["assim"], B["esta"], B["escr"]], t, y0=430, size=120)
    link_card(fr, t, B["clipB0"] + 0.08, "MIQUEIAS 5:2", "~700 ANOS ANTES", "MATEUS 2:6", votes=V_MQ52, y0=860,
              t_link=B["clipB0"] + 0.35, t_votes=B["clipB0"] + 0.95)
    return fr


def sc_egymap(t):
    fr = MS.shot_egito(t, B["egy0"], B["egy0"] + 0.18, B["clipE0"] - 0.35, B["clipE0"])
    # Micah card lingers over the take-off
    o = 1 - ss((t - B["egy0"] - 0.25) / 0.6)
    if o > 0:
        link_card(fr, t, B["clipB0"] + 0.08, "MIQUEIAS 5:2", "~700 ANOS ANTES", "MATEUS 2:6", votes=V_MQ52, y0=860,
                  t_link=B["clipB0"] + 0.35, t_votes=B["clipB0"] + 0.95, op=o)
    flash(fr, 0.9 * ei3((t - (B["clipE0"] - 0.16)) / 0.16))
    return fr


def sc_egyclip(t):
    u = t - B["clipE0"]
    fr = clip_at("egito", 0.2 + u, zoom=1.0 + 0.10 * (1 - eo3(u / 0.5)))
    flash(fr, 0.8 * (1 - eo3(u / 0.35)))
    top_shade(fr, 0.5)
    tag(fr, "DELTA DO NILO · RECRIAÇÃO", t, B["clipE0"] + 0.3, B["volta0"])
    link_card(fr, t, B["clipE0"] + 0.1, "OSEIAS 11:1", "~750 ANOS ANTES", "MATEUS 2:15", votes=V_OS111, y0=380,
              t1=B["volta0"] + 0.1, t_link=B["clipE0"] + 0.55, t_votes=B["clipE0"] + 1.15)
    return fr


def sc_volta(t):
    fr = MS.shot_volta(t, B["volta0"], B["dome0"])
    flash(fr, 0.7 * (1 - eo3((t - B["volta0"]) / 0.3)))
    fade = ss((t - (B["dome0"] - 0.45)) / 0.45)
    if fade > 0:
        fr = fr * (1 - fade) + sc_dome(t) * fade
    return fr


def sc_dome(t):
    fr = np.zeros((H, W, 3), np.float32)
    full = D.full_dome()
    k_is = ss((t - B["is96"] + 0.1) / 0.8)
    k_m = eio2((t - B["menino"] - 0.2) / 1.4)
    cam0 = D.DCam(1000, 0.5, 0.0, 540, 1180)
    cam1 = D.DCam(1500, D.X96, 0.0, 540, 1180)
    cam2 = D.DCam(1450, (D.X96 + D.X_LC211) / 2, 0.0, 540, 1180)
    cam = cam0.mix(cam1, k_is).mix(cam2, k_m)
    o_in = c01((t - B["dome0"] + 0.5) / 0.6)
    g = o_in * lerp(0.55, 0.12, k_is)
    fr += D.warp(full, cam) * g
    D.draw_bars(fr, cam, op=0.55 * o_in)
    lt = text_layer(["A BÍBLIA INTEIRA"], font("mono", 30), (215, 222, 235), track=0.24)
    titled(fr, lt, W / 2, 400, win(t, B["biblia"] - 0.1, B["is96"] + 0.1, 0.2, 0.25), dark=0.8, blur=8)
    lc = text_layer([f"{fmt(N_REFS)} REFERÊNCIAS"], font("monob", 60), (255, 214, 140), track=0.04)
    titled(fr, lc, W / 2, 470, win(t, B["biblia"] - 0.1, B["is96"] + 0.1, 0.2, 0.25), dark=0.9, blur=12)
    if t >= B["is96"] - 0.1:
        u = (t - B["is96"] + 0.1) / 1.0
        polys = []
        for x in D.XP96:
            p = eo3(u * 1.4 - abs(x - D.X96) * 0.5)
            if p > 0:
                poly = D.arc_poly(x, D.X96, cam, 1.0); polys.append(poly[:max(2, int(len(poly) * p))])
        glow_lines(fr, polys, GOLD * 0.55 * (1 - 0.6 * k_m), width=1, core=1.0, glow=0.8, big=0.6)
        sx, sy = float(cam.X(D.X96)), float(cam.Y(0))
        star_point(fr, sx, sy, 1.0 + 1.2 * k_is, 14 + 8 * k_is, rays=0.7 * k_is, rot=0.05 * math.sin(t * 0.7))
        oi = win(t, B["is96"] - 0.05, B["clipP0"] + 0.1, 0.2, 0.2)
        li = text_layer(["ISAÍAS 9:6"], font("grot", 120, 700), (255, 255, 255), track=-0.01)
        titled(fr, li, W / 2, 360, oi, 1.0 + 0.1 * (1 - eo3((t - B["is96"]) / 0.4)), dark=0.95, blur=16)
        v = 212 * eo3((t - B["is96"] - 0.2) / 0.9)
        n = odometer(fr, v, W / 2 - 110, 470, font("monob", 56), (255, 214, 140), digits=3, op=oi,
                     speed=212 * (eo3((t - B["is96"] - 0.2) / 0.9) - eo3((t - B["is96"] - 0.2 - 1 / FPS) / 0.9)))
        lp = text_layer(["VERSÍCULOS LIGADOS"], font("mono", 26), (215, 222, 235), track=0.14)
        paste(fr, lp, W / 2 - 110 + n / 2 + 18, 474, oi, anchor="l")
        oq = win(t, B["menino"] - 0.05, B["clipP0"] + 0.1, 0.3, 0.2)
        lq = text_layer(["“Porque um menino", "nos nasceu”"], font("serifi", 76, 500), (255, 236, 200), lh=1.0)
        titled(fr, lq, W / 2, 600, oq, dark=0.95, blur=16)
    if t >= B["menino"] + 0.2:   # the climax link: Isaiah 9:6 -> Luke 2:11
        u = eio2((t - B["menino"] - 0.2) / 1.2)
        poly = D.arc_poly(D.X96, D.X_LC211, cam, u, 260)
        glow_lines(fr, [poly], np.array([1.0, 0.86, 0.5], np.float32) * 1.2, width=4, core=1.0, glow=1.2, big=1.2)
        star_point(fr, poly[-1, 0], poly[-1, 1], 1.6, 10, rays=0.2)
        if u >= 1:
            ox = c01((t - B["menino"] - 1.4) / 0.25)
            xl = float(cam.X(D.X_LC211))
            ll = text_layer(["LUCAS 2:11"], font("monob", 40), (255, 255, 255), track=0.08)
            titled(fr, ll, min(xl, W - 140), 1250, ox, dark=0.85, blur=10)
            star_point(fr, xl, cam.Y(0), 1.6 * ox, 16, rays=0.4 * ox)
    flash(fr, 0.95 * ei3((t - (B["clipP0"] - 0.16)) / 0.16))
    return fr


def sc_pastores(t):
    u = t - B["clipP0"]
    fr = clip_at("pastores", u * 0.86, zoom=1.0 + 0.10 * (1 - eo3(u / 0.6)) + 0.015 * u / 6)
    flash(fr, 0.9 * (1 - eo3(u / 0.4)))
    top_shade(fr, 0.45)
    tag(fr, "CAMPOS DE BELÉM · RECRIAÇÃO", t, B["clipP0"] + 0.3, B["final0"])
    o = win(t, B["depois"] - 0.1, B["salv"] - 0.25, 0.2, 0.3)
    if o > 0:
        k = eo3((t - B["depois"]) / 0.9)
        n = odometer(fr, 700 * k, W / 2 + 26, 390, font("monob", 150), (255, 214, 140), digits=3, op=o,
                     speed=700 * (k - eo3((t - B["depois"] - 1 / FPS) / 0.9)))
        lp = text_layer(["+"], font("monob", 120), (255, 214, 140))
        paste(fr, lp, W / 2 + 26 - n / 2 - 70, 386, o)
        la = text_layer(["ANOS DEPOIS DE ISAÍAS"], font("mono", 30), (230, 234, 245), track=0.16)
        titled(fr, la, W / 2, 500, o, dark=0.85, blur=10)
    link_card(fr, t, B["salv"] - 0.15, "ISAÍAS 9:6", None, "LUCAS 2:11", votes=V_IS96, y0=600, t1=B["final0"] + 0.1,
              t_link=B["salv"] + 0.1, t_votes=B["salv"] + 0.7)
    flash(fr, 0.9 * ei3((t - (B["final0"] - 0.16)) / 0.16))
    return fr


def sc_final(t):
    fr = MS.shot_final(t, B["final0"], B["end"])
    flash(fr, 0.8 * (1 - eo3((t - B["final0"]) / 0.35)))
    o1 = c01((t - B["antes"] + 0.05) / 0.3); o2 = c01((t - B["ja"] + 0.05) / 0.3)
    shadow_box(fr, W / 2, 370, 980, 280, 0.55 * o1)
    l1 = text_layer(["ANTES DO NATAL,"], font("grot", 96, 700), (255, 255, 255), track=-0.01)
    l2 = text_layer(["JÁ ESTAVA ESCRITO."], font("grot", 96, 700), (255, 214, 140), track=-0.01)
    titled(fr, l1, W / 2, 322, o1, 1 + 0.1 * (1 - eo3((t - B["antes"]) / 0.4)), dark=0.95, blur=16)
    titled(fr, l2, W / 2, 428, o2, 1 + 0.12 * (1 - eo3((t - B["ja"]) / 0.4)), dark=0.95, blur=16)
    oc = c01((t - LE("final") - 0.1) / 0.4)
    lc = text_layer(["Qual dessas você não conhecia?"], font("grot", 50, 600), (255, 255, 255))
    titled(fr, lc, W / 2, 1440, oc, dark=0.9, blur=12)
    cr = text_layer(["Dados: OpenBible.info (CC BY) · relevo SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), Terrain Tiles (Mapzen)",
                     "Natural Earth · textos bíblicos: ACF · recriações por IA (sem rostos)"], font("mono", 15), (160, 166, 180), lh=1.25)
    paste(fr, cr, W / 2, 1532, oc * 0.85)
    return fr


SCENES = [
    (0.0, B["rew0"], sc_teaser), (B["rew0"], B["hook0"], sc_rewind), (B["hook0"], B["data0"], sc_hook),
    (B["data0"], B["naz0"], sc_data), (B["naz0"], B["clipN0"], sc_nazmap), (B["clipN0"], B["votes0"], sc_nazclip),
    (B["votes0"], B["km0"], sc_votes), (B["km0"], B["magos0"], sc_km), (B["magos0"], B["clipJ0"], sc_magos),
    (B["clipJ0"], B["esc0"], sc_jerclip), (B["esc0"], B["clipB0"], sc_escmap), (B["clipB0"], B["egy0"], sc_belclip),
    (B["egy0"], B["clipE0"], sc_egymap), (B["clipE0"], B["volta0"], sc_egyclip), (B["volta0"], B["dome0"], sc_volta),
    (B["dome0"], B["clipP0"], sc_dome), (B["clipP0"], B["final0"], sc_pastores), (B["final0"], B["end"] + 1, sc_final),
]

# ------------------------------------------------------------------ subtitles (Whisper tokens -> display tokens)
SUB_FIX = {
    "teaser": [(("a",), "…a"), (("é,",), "é:"), (("em",), "“Em"), (("Belém,",), "Belém."), (("porque",), "Porque"), (("escrito.",), "escrito.”")],
    "hook": [(("nascer,",), "nascer.")],
    "dados": [(("1", ".500"), "1.500"), (("Testamento,",), "Testamento.")],
    "livros": [(("de",), "De")],
    "isaias": [(("escrito.",), "escrito:")],
    "virgem": [(("Eis",), "“Eis"), (("Virgem",), "virgem"), (("conceberá.",), "conceberá.”")],
    "magos": [], "herodes": [(("é,",), "é:")],
    "escrito": [(("em",), "“Em"), (("Belém,",), "Belém."), (("porque",), "Porque"), (("escrito.",), "escrito.”")],
    "egito": [(("para", "o"), "pro")],
    "filho": [(("Do",), "“Do"), (("filho.",), "filho.”")],
    "conectado": [(("inteira,",), "inteira?")],
    "menino": [(("Porque",), "“Porque"), (("nasceu.",), "nasceu.”")],
    "depois": [(("pastores.",), "pastores:")],
    "salvador": [(("Vos",), "“Vos"), (("Salvador.",), "Salvador.”")],
}
NO_SUB = {"belem", "nazare", "is96", "final"}


def sub_tokens(L):
    ws, out, k = L["words"], [], 0
    rules = SUB_FIX.get(L["id"], [])
    while k < len(ws):
        for src, rep in rules:
            if tuple(w["w"] for w in ws[k:k + len(src)]) == src:
                out.append((rep, ws[k]["t0"])); k += len(src); break
        else:
            out.append((ws[k]["w"], ws[k]["t0"])); k += 1
    return out


def subtitle(fr, t):
    if B["t_assim"] - 0.1 <= t < B["rew0"] + 1 or B["assim"] - 0.1 <= t < B["egy0"]:
        return
    for L in LINES:
        if L["id"] in NO_SUB: continue
        if not (L["t0"] - 0.05 <= t <= L["t1"] + 0.22): continue
        toks = sub_tokens(L)
        words = [w for w, _ in toks]; times = [tt for _, tt in toks]
        chunks, cur = [], []
        for k, w_ in enumerate(words):
            if cur and len(" ".join(words[i] for i in cur + [k])) > 32:
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
                (" ".join(words[k] for k in ch if k not in spoken), (125, 128, 140))]
        lay = text_layer([" ".join(words[k] for k in ch)], fnt, spans=[runs], align="c")
        op = win(t, L["t0"] - 0.05, L["t1"] + 0.22, 0.08, 0.15)
        shadow(fr, lay, W / 2, 1505, op, dark=0.8, blur=9)
        paste(fr, lay, W / 2, 1505, op)
        return


def render_t(t):
    for a, b, fn in SCENES:
        if a <= t < b:
            fr = fn(t)
            break
    subtitle(fr, t)
    return fr


def main():
    args = sys.argv[1:]
    if args and args[0] == "--still":
        ts = [float(x) for x in args[1].split(",")]
        SCR.mkdir(parents=True, exist_ok=True)
        for t in ts:
            t0 = time.time()
            img = finish(render_t(t), int(t * FPS))
            cv2.imwrite(str(SCR / f"still-{t:05.2f}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print(f"still {t:.2f} {time.time() - t0:.1f}s")
        return
    f0, f1 = 0, NF
    if args and args[0] == "--range":
        a, b = args[1].split("-"); f0, f1 = int(float(a) * FPS), int(float(b) * FPS)
    out = WORK / ("video.mp4" if (f0, f1) == (0, NF) else f"part-{f0}-{f1}.mp4")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                            "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p",
                            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", str(out)],
                           stdin=subprocess.PIPE)
    t_start = time.time()
    for fi in range(f0, f1):
        t = fi / FPS
        img = finish(render_t(t), fi)
        enc.stdin.write(img.tobytes())
        if fi % 48 == 0:
            el = time.time() - t_start; done = fi - f0 + 1
            print(f"frame {fi}/{f1} t={t:.2f} {el:.0f}s eta {el / done * (f1 - fi):.0f}s", flush=True)
    enc.stdin.close(); enc.wait()
    print("done", out, f"{time.time() - t_start:.0f}s")


if __name__ == "__main__":
    main()
