#!/usr/bin/env python3
"""Map shots of the journey (3D relief + light trail + labels). Every shot is a function of film time t that returns the
frame (display float RGB). Routes: straight lines where the narration gives a distance (Nazaré -> Belém, 111 km in a
straight line; Jerusalém -> Belém), dashed 'rota aproximada' where the Gospels give no route (magi, Egypt, return).
  python3 mapscenes.py km:30.9,32.4 ... -> stills in renders/.stills
"""
import math, sys, time
from pathlib import Path
import numpy as np, cv2
import mapgl as M
from fx import *

S = Path(__file__).resolve().parent / "renders/.stills"
_R = {}


def R():
    if "r" not in _R:
        r = M.Renderer()
        _R["r"] = r
        _R["wide"] = r.terrain("wide", 3); _R["cor"] = r.terrain("corridor", 2)
        _R["jud"] = r.terrain("judea12", 2); _R["naz"] = r.terrain("nazare12", 2); _R["ultra"] = r.terrain("ultra", 4)
    return _R["r"]


def T(name): R(); return _R[name]


# ------------------------------------------------------------------ places and routes (lon, lat)
LL = {"NAZ": (35.29769, 32.70214), "BEL": (35.20764, 31.70431), "JER": (35.23417, 31.77667), "EGY": (31.3075, 30.12944),
      "RAMA": (35.23161, 31.85434)}
# approximate roads (no route is given in the Gospels): coastal Via Maris to the Nile Delta, magi from beyond the Jordan
ROUTE_EGY = [LL["BEL"], (34.80, 31.60), (34.47, 31.50), (34.25, 31.29), (33.80, 31.13), (33.10, 31.06), (32.55, 31.04),
             (31.95, 30.80), (31.55, 30.45), LL["EGY"]]
ROUTE_BACK = [LL["EGY"], (31.50, 30.52), (31.90, 30.88), (32.55, 31.10), (33.10, 31.12), (33.80, 31.19), (34.22, 31.36),
              (34.42, 31.57), (34.60, 31.80), (34.76, 32.10), (34.90, 32.48), (35.12, 32.62), LL["NAZ"]]
ROUTE_MAGI = [(36.75, 31.98), (36.20, 31.90), (35.75, 31.86), (35.45, 31.86), (35.30, 31.80), LL["JER"]]


def xz(ll): return np.array(M.ll2xz(ll[0], ll[1]), float)


P = {k: xz(v) for k, v in LL.items()}


def densify_ll(route, step_km):
    pts = np.array([xz(p) for p in route])
    out = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(np.ceil(np.linalg.norm(b - a) / step_km)))
        for k in range(1, n + 1): out.append(a + (b - a) * k / n)
    return np.array(out)


def drape(xz_pts, exag, lift=0.06, grids=("jud", "naz", "cor", "wide"), smooth=0):
    h = M.height_any([T(g) for g in grids], xz_pts[:, 0], xz_pts[:, 1]) / 1000.0
    if smooth: h = np.convolve(np.pad(h, smooth, mode="edge"), np.ones(2 * smooth + 1) / (2 * smooth + 1), "valid")
    return np.c_[xz_pts[:, 0], h * exag + lift, xz_pts[:, 1]]


def ground(p_xz, exag, grids=("jud", "naz", "cor", "wide")):
    h = M.height_any([T(g) for g in grids], np.array([p_xz[0]]), np.array([p_xz[1]]))[0] / 1000.0
    return np.array([p_xz[0], h * exag, p_xz[1]])


def path_at(pts3, u):
    """point at fraction u of arc length and the partial polyline up to it"""
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts3, axis=0), axis=1))]
    s = c01(u) * seg[-1]
    k = int(np.searchsorted(seg, s, side="right") - 1); k = min(max(k, 0), len(pts3) - 2)
    f = (s - seg[k]) / max(seg[k + 1] - seg[k], 1e-9)
    head = pts3[k] + (pts3[k + 1] - pts3[k]) * f
    return head, np.vstack([pts3[:k + 1], head[None]])


def visible(cam, pts3, exag, grids, ns=20):
    """terrain occlusion test: sample the segment eye->point; a point is hidden if the ground rises above the ray"""
    e = cam.eye
    u = np.linspace(0.04, 0.96, ns)
    seg = pts3[:, None, :] * u[None, :, None] + e[None, None, :] * (1 - u[None, :, None])
    gh = M.height_any([T(g) for g in grids], seg[..., 0].ravel(), seg[..., 2].ravel()).reshape(seg.shape[:2]) / 1000 * exag
    return ~np.any(gh > seg[..., 1] + 0.02, axis=1)


# ------------------------------------------------------------------ overlays
def draw_trail(fr, cam, pts3, exag, grids, col=GOLD, width=3, dashed=False, op=1.0, head=None, head_int=1.0, phase=0.0,
               glow=1.0):
    if len(pts3) < 2 or op <= 0.002: return
    scr, dep = cam.project(pts3)
    vis = (dep > 0) & visible(cam, pts3, exag, grids)
    polys, cur = [], []
    for k in range(len(pts3)):
        if vis[k] and -400 < scr[k, 0] < W + 400 and -400 < scr[k, 1] < H + 400:
            cur.append(scr[k])
        elif cur:
            polys.append(np.array(cur)); cur = []
    if cur: polys.append(np.array(cur))
    if dashed:
        dd = []
        for p in polys: dd += dashes(p, 22, 14, phase)
        polys = dd
    glow_lines(fr, polys, np.asarray(col) * op, width=width, core=1.0, glow=0.9 * glow, big=0.8 * glow)
    if head is not None and head_int > 0:
        hs, hd = cam.project(head[None])
        if hd[0] > 0 and visible(cam, head[None], exag, grids)[0]:
            star_point(fr, hs[0, 0], hs[0, 1], 1.3 * head_int * op, 9, rays=0.11 * head_int, rot=0.3)


def place_label(fr, cam, p3, name, sub=None, op=1.0, t_in=1.0, lift_px=120, size=58, exag=1.0, grids=None, dot=True):
    if op <= 0.002: return
    sc, dp = cam.project(p3[None])
    if dp[0] <= 0: return
    x, y = sc[0]
    if not (-200 < x < W + 200 and -200 < y < H + 200): return
    if grids is not None and not visible(cam, p3[None], exag, grids)[0]: op *= 0.35
    k = eo3(t_in)
    L = lift_px * k
    if dot:
        star_point(fr, x, y, 0.9 * op, 6)
        cv2.circle(fr, (int(x), int(y)), int(13 + 10 * (1 - k)), tuple(float(c) * 0.85 * op for c in GOLD), 2, cv2.LINE_AA)
    if L > 2:
        cv2.line(fr, (int(x), int(y - 12)), (int(x), int(y - 12 - L)), tuple(float(c) * 0.55 * op for c in WARM), 2, cv2.LINE_AA)
    lay = text_layer([name], font("grot", size, 650), (255, 255, 255), track=0.16)
    titled(fr, lay, x, y - 12 - L - size * 0.62, op * k, sc=0.92 + 0.08 * k, dark=0.9, blur=12)
    if sub:
        ls = text_layer([sub], font("mono", 24), GOLD8, track=0.12)
        titled(fr, ls, x, y - 12 - L + 16, op * k * 0.95, dark=0.8, blur=8)


def sky_star(fr, cam, pos, inten, rays=0.5, rot=0.0):
    sc, dp = cam.project(np.asarray(pos, float)[None])
    if dp[0] <= 0 or inten <= 0: return
    x, y = sc[0]
    if -300 < x < W + 300 and -300 < y < H + 300:
        star_point(fr, x, y, inten, 7, rays=rays, rot=rot)


class Captured(Exception):
    def __init__(self, img): self.img = img


CAPTURE = [False]   # subframe pass: hand back the GL image before any overlay is drawn
BASE = [None]       # final pass: use this (motion-blurred) GL image instead of rendering


def gl_done(img):
    if CAPTURE[0]: raise Captured(img)
    if BASE[0] is not None: return BASE[0].copy()
    return img


def map_frame(cam, ter, exag, light, bg=None, t=0.0, exposure=2.6, sub=1, bg2=None):
    """GL render (optionally averaged over sub-frames = motion blur, cam may be a list) -> graded display float"""
    if BASE[0] is not None and not CAPTURE[0]: return BASE[0]
    r = R()
    cams = cam if isinstance(cam, (list, tuple)) else [cam]
    acc = None
    for c in cams:
        img = r.render(c, ter, exag=exag, t=t, light=light, bg=bg, bg2=bg2)
        acc = img if acc is None else acc + img
    img = acc / len(cams)
    g = M.grade(img, exposure)
    lum = g.mean(-1, keepdims=True)
    g = g * (0.55 + 0.45 * np.clip(lum / 0.30, 0, 1.6)) ** 0.5 * 0.95   # deeper toe: night, not haze
    return g.astype(np.float32)


def lookcam(eye, target, fov=44, roll=0.0): return M.Cam(eye, target, fov, roll)


def chase(head, dirv, back, alt, ahead, side=0.0, fov=46, roll=0.0, tdown=0.0):
    d = np.array([dirv[0], 0, dirv[1]], float); d /= np.linalg.norm(d)
    sidev = np.array([-d[2], 0, d[0]])
    eye = head - d * back + np.array([0, alt, 0]) + sidev * side
    tgt = head + d * ahead - np.array([0, tdown, 0])
    return M.Cam(eye, tgt, fov, roll)


# ------------------------------------------------------------------ the light of each scene (blue hour, warm trail light)
def light(head=None, inten=1.6, rad=6.0, stars=0.9, **kw):
    L = dict(stars=stars)
    if head is not None: L.update(head=(float(head[0]), float(head[1] + 0.5), float(head[2]), inten), head_r=rad)
    L.update(kw)
    return L


# ------------------------------------------------------------------ SHOT: Jerusalém -> Belém (teaser + "assim está escrito")
EX_J = 2.0
_JB = {}


def jb_path():
    if "p" not in _JB:
        a = P["JER"]; b = P["BEL"]
        pts = np.array([a + (b - a) * k / 160 for k in range(161)])
        _JB["p"] = drape(pts, EX_C, lift=0.08, grids=("cor",), smooth=2)
    return _JB["p"]


def shot_escrito(tl, t_start, t_land, dur):
    """tl: film time; trail leaves Jerusalém at t_start, lands in Belém at t_land; shot lasts until t_start+dur"""
    pts = jb_path()
    u = eio2((tl - t_start) / max(t_land - t_start, 1e-3))
    head, part = path_at(pts, u)
    post = c01((tl - t_land) / 0.9)
    d = (P["BEL"] - P["JER"]); d /= np.linalg.norm(d)
    cam = chase(head, d, back=lerp(15.0, 11.5, ss(u)) + 1.5 * post, alt=lerp(7.6, 6.2, u) + 0.8 * post,
                ahead=lerp(5.0, 3.0, ss(u)), side=lerp(3.0, 1.2, u), fov=46, roll=lerp(-3, 2, ss(u)), tdown=1.6 + 0.8 * post)
    star = np.array([P["BEL"][0] - 1.0, 7.5, P["BEL"][1] + 22.0])
    L = light(head, inten=0.8 + 1.4 * expo(post) * (1 - ss((tl - t_land - 0.5) / 0.6)), rad=1.1, stars=1.0,
              fog_den=0.0035, micro=0.15, relief=1.25, glow_dir=(-0.4, 0.05, 1.0), glow_col=(0.012, 0.007, 0.004))
    L["head_r"] = 2.2
    fr = gl_done(map_frame(cam, T("cor"), EX_C, L, bg=T("wide"), t=tl, exposure=1.9))
    sky_star(fr, cam, star, 0.9 + 0.4 * post, rays=0.35, rot=0.2)
    draw_trail(fr, cam, part, EX_C, ("cor",), width=3, head=head, head_int=1.0 + 1.5 * expo(post) * (1 - post))
    bel = ground(P["BEL"], EX_C, ("cor",))
    jer = ground(P["JER"], EX_C, ("cor",))
    place_label(fr, cam, jer, "JERUSALÉM", op=1 - ss(u * 1.6), t_in=1.0, lift_px=70, size=44, exag=EX_C, grids=("cor",))
    place_label(fr, cam, bel, "BELÉM", op=ss((u - 0.55) / 0.3), t_in=ss((tl - t_land + 0.25) / 0.5), lift_px=110, size=64,
                exag=EX_C, grids=("cor",))
    return fr


# ------------------------------------------------------------------ SHOT: Nazaré -> Belém, 111 km (chase)
EX_C = 2.6
_NB = {}


def nb_path():
    if "p" not in _NB:
        a = P["NAZ"]; b = P["BEL"]
        n = 700
        pts = np.array([a + (b - a) * k / n for k in range(n + 1)])
        _NB["p"] = drape(pts, EX_C, lift=0.10, grids=("naz", "jud", "cor"), smooth=3)
        _NB["len"] = float(np.linalg.norm(b - a))
    return _NB["p"]


def shot_km(tl, t0, t_go, t_land, t_end):
    pts = nb_path()
    u = eio((tl - t_go) / (t_land - t_go))
    head, part = path_at(pts, u)
    post = c01((tl - t_land) / (t_end - t_land))
    pre = c01((tl - t0) / max(t_go - t0, 1e-3))
    d = P["BEL"] - P["NAZ"]
    cam = chase(head, d, back=lerp(30, 20, ss(u)) + 6 * ss(post), alt=lerp(16, 11, ss(u)) + 6 * ss(post),
                ahead=lerp(10, 4, ss(u)), side=lerp(-6, 3, ss(u)), fov=48, roll=3.5 * math.sin(u * math.pi) - 1.0,
                tdown=lerp(2.5, 6, ss(u)) + 6 * ss(post))
    L = light(head, inten=0.7 + 0.9 * expo(post), rad=3.2, stars=0.9, fog_den=0.0030, micro=0.5)
    fr = gl_done(map_frame(cam, T("cor"), EX_C, L, bg=T("wide"), t=tl, exposure=1.9))
    draw_trail(fr, cam, part, EX_C, ("cor",), width=3, head=head, head_int=1.2)
    naz = ground(P["NAZ"], EX_C, ("naz", "cor")); bel = ground(P["BEL"], EX_C, ("jud", "cor"))
    place_label(fr, cam, naz, "NAZARÉ", op=1 - ss((u - 0.05) / 0.2), lift_px=90, size=46, exag=EX_C, grids=("cor",))
    place_label(fr, cam, bel, "BELÉM", op=ss((u - 0.7) / 0.2), t_in=ss((tl - t_land + 0.2) / 0.5), lift_px=120, size=60,
                exag=EX_C, grids=("cor",))
    km = _NB["len"] * u
    return fr, km


_CO = {}


def coast_lines(fr, cam, op=0.5, col=(0.55, 0.75, 1.0)):
    if op <= 0.01: return
    if "l" not in _CO:
        z = np.load(M.ROOT / "data/coast.npz")
        _CO["l"] = [np.c_[M.ll2xz(a[:, 0], a[:, 1])[0], np.full(len(a), 0.03), M.ll2xz(a[:, 0], a[:, 1])[1]] for a in
                    (z[k] for k in z.files)]
    polys = []
    for w3 in _CO["l"]:
        sc, dp = cam.project(w3)
        ok = dp > 0
        if ok.sum() > 1: polys.append(sc[ok])
    glow_lines(fr, polys, np.asarray(col, np.float32) * op, width=1, core=0.5, glow=0.5, big=0.25)


# ------------------------------------------------------------------ region labels (faint, documentary map)
REGION = {"MAR MEDITERRÂNEO": (33.6, 32.45), "MAR MORTO": (35.47, 31.47), "MAR DA GALILEIA": (35.58, 32.84),
          "RIO NILO": (31.25, 30.62), "SINAI": (33.6, 30.2), "JUDEIA": (34.98, 31.52), "GALILEIA": (35.18, 32.90)}


def region_label(fr, cam, name, op=1.0, size=24, exag=3.0):
    if op <= 0.01: return
    ll = REGION[name]; p = xz(ll)
    sc, dp = cam.project(np.array([[p[0], 0.0, p[1]]]))
    if dp[0] <= 0: return
    lay = text_layer([name], font("mono", size), (200, 214, 235), track=0.32)
    titled(fr, lay, sc[0, 0], sc[0, 1], op * 0.55, dark=0.6, blur=8)


def fade_mix(a, b, u):
    return a if u <= 0 else b if u >= 1 else a * (1 - u) + b * u


# ------------------------------------------------------------------ SHOT: the hook — from space down to Belém
EX_H = 3.0


def shot_hook(tl, t0, t_prof, t_city, t_land, t_end):
    """t0 start (very high), t_city: the dive accelerates, t_land: 'Belém.'"""
    bel = ground(P["BEL"], EX_H, ("cor", "wide"))
    k1 = eio2((tl - t0) / (t_city - t0))          # slow descent, slight orbit
    k2 = ei3((tl - t_city) / (t_land - t_city))   # the dive
    alt = lerp(lerp(820, 260, k1), 24.0, ss(k2) ** 0.8)
    tx = lerp(lerp(-120, -40, k1), 0.0, ss(k2)); tz = lerp(lerp(40, 15, k1), 0.0, ss(k2))
    tilt = lerp(lerp(0.05, 0.25, k1), 0.95, ss(k2))   # horizontal offset (in units of alt), eye to the south
    ang = math.radians(lerp(-20, 10, k1) + 15 * ss(k2))
    off = np.array([math.sin(ang), 0, math.cos(ang)]) * alt * tilt   # eye south of the target: north is up
    post = c01((tl - t_land) / (t_end - t_land))
    eye = np.array([tx, alt, tz]) + off + np.array([0, 0.0, 0]) * post
    tgt = np.array([tx, bel[1] * ss(k2), tz])
    if post > 0:  # gentle push-in after the landing
        eye = eye + (tgt - eye) * 0.12 * eo3(post)
    cam = M.Cam(eye, tgt, 40 + 6 * ss(k2), roll=lerp(0, -3, ss(k2)))
    land_flash = expo((tl - t_land) / 0.12) * (1 - ss((tl - t_land - 0.1) / 0.8)) if tl >= t_land else 0
    L = light(bel + np.array([0, 1.2, 0]) if tl > t_land - 0.6 else None, inten=0.30 + 0.55 * land_flash, rad=3.0,
              stars=0.6 * ss(k2), fog_den=0.0012)
    switch = ss((alt - 170) / -60)               # 0 above 170 km -> 1 below 110 km: hand over to the detailed grid
    fr = None
    if switch < 1:
        fr = map_frame(cam, T("wide"), EX_H, L, bg=T("ultra"), t=tl, exposure=2.0)
    if switch > 0:
        f2 = map_frame(cam, T("cor"), EX_H, L, bg=T("wide"), t=tl, exposure=lerp(2.0, 1.7, ss(k2)))
        fr = fade_mix(fr, f2, switch) if fr is not None else f2
    fr = gl_done(fr)
    hi = 1 - ss(k2 * 1.6)
    coast_lines(fr, cam, 0.45 * hi)
    for nm in ("MAR MEDITERRÂNEO", "SINAI", "RIO NILO"): region_label(fr, cam, nm, hi * ss((tl - t0) / 0.6))
    for nm in ("JUDEIA", "GALILEIA", "MAR MORTO", "MAR DA GALILEIA"): region_label(fr, cam, nm, ss(k1) * (1 - ss((k2 - 0.5) / 0.3)), 22)
    # the city glows before the dive, the light grows as we fall
    sc, dp = cam.project(bel[None])
    if dp[0] > 0:
        star_point(fr, sc[0, 0], sc[0, 1], 0.6 + 1.2 * ss(k2) + 2.0 * land_flash, 6 + 10 * ss(k2), rays=0.10 + 0.25 * land_flash, rot=0.2)
    place_label(fr, cam, bel, "BELÉM", op=ss((tl - t_land + 0.05) / 0.2), t_in=ss((tl - t_land) / 0.45), lift_px=170, size=96,
                exag=EX_H)
    return fr


# ------------------------------------------------------------------ SHOT: arrival over Nazaré
EX_N = 2.2


def shot_nazare(tl, t0, t_label, t_dive, t_end):
    naz = ground(P["NAZ"], EX_N, ("naz", "cor"))
    k = eio2((tl - t0) / (t_end - t0))
    dv = ei3((tl - t_dive) / (t_end - t_dive))
    e0 = np.array([P["NAZ"][0] - 10, 9.0, P["NAZ"][1] + 16]); e1 = np.array([P["NAZ"][0] - 3.5, 4.2, P["NAZ"][1] + 6.0])
    eye = lerp(e0, e1, k); eye = eye + (naz - eye) * 0.75 * dv
    cam = M.Cam(eye, naz + np.array([0, -0.3, 0]), 46, roll=lerp(-4, 0, k))
    flash = expo((tl - t_dive) / (t_end - t_dive))
    L = light(naz, inten=0.8 + 3 * dv, rad=1.6 + 2 * dv, stars=1.0, fog_den=0.006, micro=0.25)
    fr = map_frame(cam, T("naz"), EX_N, L, bg=T("cor"), t=tl, exposure=1.9)
    sc, dp = cam.project(naz[None])
    if dp[0] > 0: star_point(fr, sc[0, 0], sc[0, 1], 1.0 + 4 * dv, 8 + 30 * dv, rays=0.15, rot=0.4)
    place_label(fr, cam, naz, "NAZARÉ", sub="GALILEIA", op=ss((tl - t_label + 0.05) / 0.15) * (1 - dv),
                t_in=ss((tl - t_label) / 0.45), lift_px=140, size=88, exag=EX_N)
    fr += np.array([1.0, 0.86, 0.62], np.float32) * (0.5 * flash ** 2)
    return fr


# ------------------------------------------------------------------ SHOT: magi from the east to Jerusalém; the star rises
_MG = {}


def magi_path():
    if "p" not in _MG:
        _MG["p"] = drape(densify_ll(ROUTE_MAGI, 0.6), EX_C, lift=0.12, grids=("cor", "wide"), smooth=2)
    return _MG["p"]


def shot_magos(tl, t0, t_jer, t_end, km_pts=None):
    jer = ground(P["JER"], EX_C, ("jud", "cor")); bel = ground(P["BEL"], EX_C, ("jud", "cor"))
    k = eio2((tl - t0) / (t_end - t0))
    eye = lerp(np.array([44.0, 15.0, -30.0]), np.array([33.0, 10.5, -22.0]), k)
    tgt = lerp(np.array([8.0, 0.5, -6.0]), np.array([2.0, 0.8, -5.0]), k)
    cam = M.Cam(eye, tgt, 46, roll=lerp(2, -1, k))
    u = eo3((tl - t0 - 0.1) / (t_jer - t0 - 0.1))
    head, part = path_at(magi_path(), u)
    L = light(head, inten=0.8, rad=3.0, stars=1.1, fog_den=0.0030, micro=0.2)
    fr = map_frame(cam, T("cor"), EX_C, L, bg=T("wide"), t=tl, exposure=1.9)
    if km_pts is not None:
        draw_trail(fr, cam, km_pts, EX_C, ("cor",), width=2, op=0.55, glow=0.6)
    draw_trail(fr, cam, part, EX_C, ("cor", "wide"), width=3, dashed=True, head=head, head_int=0.9, phase=tl * 40)
    star = np.array([P["BEL"][0] - 1.0, 9.0, P["BEL"][1] + 2.0])
    sky_star(fr, cam, star, lerp(0.3, 1.6, ss((tl - t0) / 1.2)), rays=0.55, rot=0.15)
    region_label(fr, cam, "MAR MORTO", 0.9 * ss((tl - t0) / 0.5))
    place_label(fr, cam, bel, "BELÉM", op=0.8, t_in=1.0, lift_px=80, size=40, exag=EX_C, grids=("cor",))
    place_label(fr, cam, jer, "JERUSALÉM", op=ss((tl - t_jer + 0.1) / 0.2), t_in=ss((tl - t_jer) / 0.45), lift_px=150, size=64,
                exag=EX_C, grids=("cor",))
    if u < 0.9:
        sc, dp = cam.project(part[:1])
        if dp[0] > 0:
            lay = text_layer(["MAGOS DO ORIENTE"], font("mono", 24), GOLD8, track=0.2)
            titled(fr, lay, min(max(sc[0, 0], 200), W - 200), sc[0, 1] - 40, 0.8 * (1 - ss((u - 0.6) / 0.3)), dark=0.7, blur=8)
    return fr


# ------------------------------------------------------------------ SHOT: the flight to Egypt (approximate road)
EX_W = 3.0
_EG = {}


def egy_path():
    if "p" not in _EG:
        _EG["p"] = drape(densify_ll(ROUTE_EGY, 2.0), EX_W, lift=0.25, grids=("cor", "wide"), smooth=2)
        _EG["back"] = drape(densify_ll(ROUTE_BACK, 2.0), EX_W, lift=0.25, grids=("cor", "wide"), smooth=2)
    return _EG["p"]


def shot_egito(tl, t0, t_go, t_arrive, t_end):
    pts = egy_path()
    k = eio2((tl - t0) / (t_end - t0))
    u = eio((tl - t_go) / (t_arrive - t_go))
    head, part = path_at(pts, u)
    eye = lerp(np.array([30.0, 45.0, -40.0]), np.array([-110.0, 340.0, -150.0]), ss(k))
    tgt = lerp(np.array([-15.0, 0.0, 15.0]), np.array([-275.0, 0.0, 120.0]), ss(k))
    cam = M.Cam(eye, tgt, 44, roll=lerp(-2, 3, k))
    L = light(head, inten=1.2, rad=lerp(5, 24, k), stars=0.7, fog_den=0.0011)
    fr = map_frame(cam, T("wide"), EX_W, L, bg=T("ultra"), t=tl, exposure=2.0)
    coast_lines(fr, cam, 0.35 * ss(k * 2))
    draw_trail(fr, cam, part, EX_W, ("wide",), width=3, dashed=True, head=head, head_int=1.1, phase=tl * 60)
    region_label(fr, cam, "MAR MEDITERRÂNEO", 0.9 * ss(k * 2)); region_label(fr, cam, "SINAI", 0.8 * ss(k * 2 - 0.5))
    bel = ground(P["BEL"], EX_W, ("cor", "wide"))
    place_label(fr, cam, bel, "BELÉM", op=1 - ss(k * 3), t_in=1.0, lift_px=70, size=40, exag=EX_W)
    egy = ground(P["EGY"], EX_W, ("wide",))
    place_label(fr, cam, egy, "EGITO", op=ss((u - 0.8) / 0.15), t_in=ss((u - 0.85) / 0.15), lift_px=150, size=80, exag=EX_W)
    if 0.15 < u < 0.95:
        sc, dp = cam.project(head[None])
        if dp[0] > 0:
            lay = text_layer(["ROTA APROXIMADA"], font("mono", 22), (200, 214, 235), track=0.25)
            titled(fr, lay, sc[0, 0] + 10, sc[0, 1] + 56, 0.65 * ss((u - 0.15) / 0.1) * (1 - ss((u - 0.85) / 0.1)), dark=0.7, blur=8)
    return fr


def all_routes():
    egy_path(); return {"km": nb_path(), "magi": magi_path(), "egy": _EG["p"], "back": _EG["back"], "jb": jb_path()}


# ------------------------------------------------------------------ SHOT: return to Nazaré + pull-out; final map
CEN = (P["NAZ"] + P["EGY"]) / 2
DNE = (P["NAZ"] - P["EGY"]) / np.linalg.norm(P["NAZ"] - P["EGY"])


def journey_cam(D, tilt_deg, shift=0.0, side=0.0, fov=42.0, roll=0.0):
    """camera that puts the Egypt -> Nazareth axis vertical on screen (portrait framing of the whole journey)"""
    c = CEN + DNE * shift + np.array([-DNE[1], DNE[0]]) * side
    tl_ = math.radians(tilt_deg)
    eye = np.array([c[0] - DNE[0] * D * math.sin(tl_), D * math.cos(tl_), c[1] - DNE[1] * D * math.sin(tl_)])
    return M.Cam(eye, np.array([c[0], 0.0, c[1]]), fov, roll)


def shot_volta(tl, t0, t_end):
    r = all_routes()
    k = eio2((tl - t0) / (t_end - t0))
    cam = journey_cam(lerp(640, 1300, ei3(k)), lerp(32, 10, k), shift=10)
    u = eio((tl - t0) / ((t_end - t0) * 0.55))
    head, part = path_at(r["back"], u)
    L = light(head, inten=1.0, rad=20, stars=0.5, fog_den=0.0008)
    fr = map_frame(cam, T("wide"), EX_W, L, bg=T("ultra"), t=tl, exposure=2.0)
    coast_lines(fr, cam, 0.35)
    for key, dashed in (("km", False), ("egy", True), ("magi", True)):
        pts = r[key] if key != "km" else drape(r["km"][:, [0, 2]], EX_W, 0.25, ("cor", "wide"))
        draw_trail(fr, cam, pts, EX_W, ("wide",), width=2, dashed=dashed, op=0.7, glow=0.7)
    draw_trail(fr, cam, part, EX_W, ("wide",), width=3, dashed=True, head=head, head_int=1.0, phase=tl * 60)
    for nm, key in (("NAZARÉ", "NAZ"), ("BELÉM", "BEL"), ("EGITO", "EGY")):
        place_label(fr, cam, ground(P[key], EX_W, ("cor", "wide")), nm, op=0.9 * (1 - ss((k - 0.6) / 0.3)), t_in=1.0, lift_px=60,
                    size=34, exag=EX_W)
    return fr


def shot_final(tl, t0, t_end):
    r = all_routes()
    k = eio2((tl - t0) / (t_end - t0))
    cam = journey_cam(lerp(860, 780, k), lerp(28, 34, k), shift=lerp(115, 130, k), roll=lerp(-1.5, 1.0, k))
    bel = ground(P["BEL"], EX_W, ("cor", "wide"))
    L = light(bel, inten=1.4, rad=22, stars=0.6, fog_den=0.0008)
    fr = map_frame(cam, T("wide"), EX_W, L, bg=T("ultra"), t=tl, exposure=2.0)
    coast_lines(fr, cam, 0.35)
    grow = ss((tl - t0) / 1.2)
    for key, dashed, w_ in (("km", False, 3), ("egy", True, 2), ("back", True, 2), ("magi", True, 2)):
        pts = r[key] if key not in ("km",) else drape(r["km"][:, [0, 2]], EX_W, 0.25, ("cor", "wide"))
        _, part = path_at(pts, grow)
        draw_trail(fr, cam, part, EX_W, ("wide",), width=w_, dashed=dashed, op=0.9, glow=0.8, phase=tl * 30)
    for nm, key in (("NAZARÉ", "NAZ"), ("JERUSALÉM", "JER"), ("EGITO", "EGY")):
        place_label(fr, cam, ground(P[key], EX_W, ("cor", "wide")), nm, op=0.85 * grow, t_in=1.0, lift_px=56, size=32, exag=EX_W)
    sc, dp = cam.project(bel[None])
    if dp[0] > 0:
        star_point(fr, sc[0, 0], sc[0, 1] - 40, 1.6 + 0.3 * math.sin(tl * 2.1), 9, rays=0.45, rot=0.2)
        star_point(fr, sc[0, 0], sc[0, 1], 1.0, 6)
    region_label(fr, cam, "MAR MEDITERRÂNEO", 0.8 * grow)
    return fr


def still(t, fn, *a):
    t0 = time.time()
    fr = fn(t, *a)
    if isinstance(fr, tuple): fr = fr[0]
    out = finish(fr.copy(), 0)
    S.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(S / f"map-{fn.__name__}-{t:.2f}.jpg"), cv2.cvtColor(out, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
    print(fn.__name__, t, f"{time.time() - t0:.2f}s")
    return out


SHOTS = {
    "escrito": (shot_escrito, (0.15, 1.46, 2.0)),
    "km": (shot_km, (30.15, 30.32, 31.92, 32.84)),
    "hook": (shot_hook, (4.64, 6.88, 8.30, 10.60, 11.45)),
    "nazare": (shot_nazare, (20.30, 20.61, 21.30, 21.66)),
    "magos": (shot_magos, (32.84, 33.80, 34.58)),
    "egito": (shot_egito, (41.77, 41.95, 43.45, 43.81)),
    "volta": (shot_volta, (46.17, 47.70)),
    "final": (shot_final, (58.90, 63.87)),
}

if __name__ == "__main__":
    ims = []
    req = sys.argv[1:] or ["escrito:0.3,1.4", "km:30.9,32.4"]
    for item in req:
        name, ts = item.split(":")
        fn, args = SHOTS[name]
        for t in map(float, ts.split(",")):
            ims.append(still(t, fn, *args))
    sm = [cv2.resize(im, (270, 480), interpolation=cv2.INTER_AREA) for im in ims]
    cv2.imwrite(str(S / "map-sheet.jpg"), cv2.cvtColor(np.hstack(sm), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
