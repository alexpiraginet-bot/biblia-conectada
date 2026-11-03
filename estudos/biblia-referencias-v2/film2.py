#!/usr/bin/env python3
""""A primeira página toca a última" — second Reels of the Bible cross-reference series, on the Ep. 1 engine.

Story (13 lines): one thread of light from Genesis 2:9 to Revelation 22:2 (the tree of life, first and last page) ->
the 191 Genesis/Revelation links -> the whole dome, 344,799 -> the brightest point, Isaiah 9:6, the most connected
verse (212 partners) is a birth announcement -> the call: comment a verse. Every arc and number comes from the data.
Engine: ../biblia-referencias/film.py (dome raster, camera, text, star, dust), imported as a module.

  python3 film2.py --still 0.5,9.0      -> renders/.film/still-<t>.jpg
  python3 film2.py                      -> renders/.film/video.mp4 (no audio; score2.py + finalize.py follow)
"""
import json
import math
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
_argv = sys.argv; sys.argv = [sys.argv[0]]
sys.path.insert(0, str(ROOT.parent / "biblia-referencias"))
import film as F          # noqa: E402  (builds the full dome once)
import arcs as A          # noqa: E402
sys.argv = _argv

W, H, FPS = F.W, F.H, F.FPS
NARR = json.load(open(WORK / "narr.json")); LINES = NARR["lines"]
DUR = round(NARR["duration"], 3); NF = int(round(DUR * FPS))
c01, ss, eo3, ei3, expo, lerp, win = F.c01, F.ss, F.eo3, F.ei3, F.expo, F.lerp, F.win
Cam, text_layer, titled, paste, draw_arcs, arc_poly, draw_bars, warp_dome, dust = \
    F.Cam, F.text_layer, F.titled, F.paste, F.draw_arcs, F.arc_poly, F.draw_bars, F.warp_dome, F.dust
font = F.font


def star_point(frame, x, y, inten=1.0, rad=18, rays=0.0, rot=0.0):
    """soft light point with no visible edge: the glow is windowed to zero at a wide radius; rays as in Ep. 1"""
    R = int(rad * 16 + rays * 560)
    xa, xb, ya, yb = int(max(0, x - R)), int(min(W, x + R)), int(max(0, y - R)), int(min(H, y + R))
    if xa >= xb or ya >= yb: return
    yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32); dx, dy = xx - x, yy - y; r2 = dx * dx + dy * dy
    g = np.exp(-r2 / (2 * rad * rad)) + 0.35 * np.exp(-r2 / (2 * (rad * 3) ** 2)) + 0.08 * np.exp(-r2 / (2 * (rad * 7) ** 2))
    if rays > 0:
        c, s_ = math.cos(rot), math.sin(rot); u, v = dx * c + dy * s_, -dx * s_ + dy * c; L = 520 * rays
        down = np.where(dy > 0, 0.3, 1.0).astype(np.float32)
        g += (0.9 * np.exp(-(v * v) / 3.5) * np.exp(-np.abs(u) / L) + 0.9 * np.exp(-(u * u) / 3.5) * np.exp(-np.abs(v) / L)) * down
        c2, s2 = math.cos(rot + math.pi / 4), math.sin(rot + math.pi / 4); u2, v2 = dx * c2 + dy * s2, -dx * s2 + dy * c2
        g += (0.45 * np.exp(-(v2 * v2) / 2.0) * np.exp(-np.abs(u2) / (L * 0.45)) + 0.45 * np.exp(-(u2 * u2) / 2.0) * np.exp(-np.abs(v2) / (L * 0.45))) * down
    win_ = np.clip(1 - np.sqrt(r2) / R, 0, 1) ** 0.5             # to zero at the box edge, invisibly
    frame[ya:yb, xa:xb] += (g * win_)[..., None] * np.array([1.0, 0.93, 0.78], np.float32) * inten


F.star_point = star_point                                       # the engine's arc heads use it too
GOLD3 = np.array([1.0, 0.86, 0.55], np.float32)
GOLD, CREAM, GREY = (255, 214, 140), (255, 236, 200), (170, 170, 180)


def LS(i): return LINES[i]["t0"]
def LE(i): return LINES[i]["t1"]
def WT(i, k): return LINES[i]["words"][k]["t0"]
def WE(i, k): return LINES[i]["words"][k]["t1"]


# key moments (film order): 0 toca · 1 jardim · 2 primeira página · 3 última · 4 191 · 5 344.799 · 6 olha o ponto
# 7 Isaías 9:6 · 8 quote · 9 212 · 10 criança · 11 comenta
K = {
    "toca": WT(0, 3), "s1": LS(1) - 0.1, "arvore": WT(1, 5), "pag1": WT(2, 3), "ultima": WT(3, 4), "s4": LS(4) - 0.1, "n191": WT(4, 5),
    "s5": LS(5) - 0.1, "n344": WT(5, 5), "s7": LS(6) - 0.1, "ponto": WT(6, 3), "s8": LS(7) - 0.1, "esse": WT(7, 11), "isa96": WT(7, 12) - 0.05,
    "quote": LS(8) - 0.1, "s10": LS(9) - 0.1, "n212": WT(9, 0), "s11": LS(10) - 0.1, "crianca": WT(10, 9), "s12": LS(11) - 0.1, "mostro": WT(11, 4), "end": DUR,
}
json.dump(K, open(WORK / "keys.json", "w"), indent=1)

# ------------------------------------------------------------------ data for the moments
X_GN, X_AP = F.X_GN29, F.X_AP222
BA, BB = A.CHAP_BOOK[A.CHAP_OF[A.PA]], A.CHAP_BOOK[A.CHAP_OF[A.PB]]
GR = np.nonzero(((BA == 0) & (BB == 65)) | ((BA == 65) & (BB == 0)))[0]
assert len(GR) == 191, len(GR)
GR = GR[np.argsort(A.VOTES[GR])]                  # the tree of life (35 votes) is among the last to draw: it stays the brightest
GR_ORDER = np.random.default_rng(191).permutation(len(GR))
VERSE = {
    "gn": ["“…também a árvore da vida", "em meio do jardim…”"],
    "ap": ["“…e de um lado e do outro do rio,", "estava a árvore da vida…”"],
    "isa": ["“Porque um menino nos nasceu,", "um filho nos foi dado…”"],
}
N_ROWS = F.N_ROWS


def fmt(n): return f"{int(n):,}".replace(",", ".")


# ------------------------------------------------------------------ cameras
CAM_HOOK = Cam(1.0, 0.5, 0.0, 540, 1180)          # the single thread across the screen
CAM_CATH = Cam(1.55, 0.5, 0.12, 540, 1500)        # inside the cathedral
CAM_STAR = Cam(1.45, F.X96, 0.0, 540, 1300)       # on Isaiah 9:6
CAM_CALL = Cam(1.25, 0.5, 0.0, 540, 1420)


def subtitle(fr, t):
    """spoken line as a karaoke chunk (<= 30 chars) at y 1505, like Ep. 1; title lines (3, 8) are drawn big instead"""
    for L in LINES:
        if L["i"] in (3,): continue
        if not (L["t0"] - 0.05 <= t <= L["t1"] + 0.3): continue
        words = [w["w"] for w in L["words"]]; times = [w["t0"] for w in L["words"]]
        chunks, cur = [], []
        for k, w in enumerate(words):
            if cur and len(" ".join(words[i] for i in cur + [k])) > 30: chunks.append(cur); cur = []
            cur.append(k)
        chunks.append(cur)
        ci = max([n for n, ch in enumerate(chunks) if times[ch[0]] - 0.05 <= t] or [0]); ch = chunks[ci]
        spoken = [k for k in ch if times[k] - 0.04 <= t]
        runs = [(" ".join(words[k] for k in ch if k in spoken) + (" " if spoken and len(spoken) < len(ch) else ""), (255, 255, 255)),
                (" ".join(words[k] for k in ch if k not in spoken), (120, 120, 132))]
        lay = text_layer([" ".join(words[k] for k in ch)], font("grot", 46, 500), spans=[runs])
        op = win(t, L["t0"] - 0.05, L["t1"] + 0.3, 0.08, 0.15)
        titled(fr, lay, W / 2, 1505, op, dark=0.75, blur=8)
        return


def thread_hook(fr, t, cam, op=1.0, glow=1.6):
    """the first thread: draws itself in 1.1 s from Genesis to Revelation, then breathes"""
    p = eo3((t - 0.05) / 1.1)
    if p <= 0: return
    poly = arc_poly(X_GN, X_AP, cam, p, 400)
    br = 1.0 + 0.12 * math.sin(t * 2.1)
    draw_arcs(fr, [poly], GOLD3 * br * op, width=3, core=1.0, glow=glow * op, head=p < 1)
    star_point(fr, float(cam.X(X_GN)), float(cam.Y(0)), 1.2 * op, 14)
    if p >= 1: star_point(fr, float(cam.X(X_AP)), float(cam.Y(0)), 1.2 * op, 14)


def render(fi):
    t = fi / FPS
    fr = F.BG.copy()
    dust(fr, t, 0.8)
    # ---------------- S0 (line 0, frame 0): the whole dome lit, one gold thread across it, the title. No fade.
    if t < K["s1"] + 0.8:
        o = 1.0 - ss((t - K["s1"]) / 0.8) if t > K["s1"] else 1.0
        cam = Cam(1.22 + 0.03 * ss(t / 3.0), 0.5, 0.0, 540, 1300)
        flash = 1 + 0.3 * max(0.0, 1 - t / 0.35)
        fr += warp_dome(F.FULL, cam) * 0.78 * o
        draw_bars(fr, cam, op=0.6 * o)
        poly = arc_poly(X_GN, X_AP, cam, 1.0, 400)
        draw_arcs(fr, [poly], GOLD3 * (1.0 + 0.1 * math.sin(t * 2.1)) * o * flash, width=5, core=1.6, glow=2.4 * o)
        draw_arcs(fr, [poly], np.array([1.0, 1.0, 0.95], np.float32) * o, width=2, core=0.9, glow=0.0)
        for x in (X_GN, X_AP): star_point(fr, float(cam.X(x)), float(cam.Y(0)), 2.0 * o * flash, 18)
        sc = 1.0 + 0.05 * max(0.0, 1 - t / 0.3)
        titled(fr, text_layer(["A PRIMEIRA PÁGINA"], font("grot", 112, 700), track=-0.02, glow=4), W / 2, 430, o, sc)
        titled(fr, text_layer(["TOCA A ÚLTIMA."], font("grot", 112, 700), color=GOLD, track=-0.02, glow=6), W / 2, 545, o, sc)
        titled(fr, text_layer(["GÊNESIS 2:9  ·  APOCALIPSE 22:2"], font("mono", 36), color=GOLD, track=0.1), W / 2, 660, o * c01((t - 0.4) / 0.3))
    # ---------------- S1 (lines 1-3): black, the thread alone, the two verses at its feet
    if K["s1"] <= t < K["s5"] + 0.6:
        op = 1.0 - ss((t - K["s5"]) / 0.6) if t > K["s5"] else 1.0
        cam = CAM_HOOK
        poly = arc_poly(X_GN, X_AP, cam, 1.0, 400)
        draw_arcs(fr, [poly], GOLD3 * (1.0 + 0.12 * math.sin(t * 2.1)) * op, width=3, core=1.0, glow=1.6 * op)
        for x in (X_GN, X_AP): star_point(fr, float(cam.X(x)), float(cam.Y(0)), 1.2 * op, 14)
        o_gn = win(t, K["s1"], K["s4"] + 1.0, 0.3, 0.4); o_ap = win(t, K["ultima"] - 0.3, K["s4"] + 1.0, 0.3, 0.4)
        titled(fr, text_layer(["GÊNESIS 2:9"], font("mono", 34), color=GOLD, track=0.08), 170, 1245, o_gn)
        titled(fr, text_layer(VERSE["gn"], font("serifi", 44, 500), color=CREAM), 230, 1330, o_gn)
        titled(fr, text_layer(["APOCALIPSE 22:2"], font("mono", 34), color=GOLD, track=0.08), 905, 1245, o_ap)
        titled(fr, text_layer(VERSE["ap"], font("serifi", 44, 500), color=CREAM), 820, 1330, o_ap)
        for x, tk in ((X_GN, K["pag1"]), (X_AP, K["ultima"])):
            k = 1 - ss((t - tk) / 0.7)
            if 0 < k and t >= tk: star_point(fr, float(cam.X(x)), float(cam.Y(0)), 2.6 * k, 22 + 30 * k)
        # ---------------- S2 (line 4): the 191 Genesis/Revelation links, counted
        if t >= K["s4"]:
            u = c01((t - K["s4"]) / (K["n191"] - K["s4"] + 0.6))
            n = int(round(len(GR) * eo3(u)))
            polys = []
            for q in GR_ORDER[:n]:                      # all 191 join the first book to the last: fanned in height so they read as many
                j = GR[q]; poly = arc_poly(A.XA[j], A.XB[j], cam, 1.0, 120)
                hmul = 0.55 + 0.6 * (q / len(GR)); poly[:, 1] = cam.ay - (cam.ay - poly[:, 1]) * hmul; polys.append(poly)
            draw_arcs(fr, polys, GOLD3 * 0.5, width=1, core=0.9, glow=0.6)
            o = win(t, K["s4"] + 0.1, K["s5"] + 0.5, 0.2, 0.3)
            titled(fr, text_layer([fmt(n)], font("grot", 150, 700), track=-0.02, glow=6), W / 2, 500, o)
            titled(fr, text_layer(["ligações entre Gênesis e Apocalipse"], font("serifi", 50, 500), color=CREAM), W / 2, 610, o * c01((t - K["s4"] - 0.3) / 0.3))
    # ---------------- S3 (lines 5-6): pull back, the whole Bible lights up, 344.799
    if t >= K["s5"]:
        u = ss((t - K["s5"]) / (K["n344"] - K["s5"] + 0.3))
        cam = CAM_HOOK.mix(CAM_CATH, u)
        cnt = int(round(191 + (N_ROWS - 191) * ei3(c01((t - K["s5"]) / (K["n344"] - K["s5"] + 0.3))) ** 0.8))
        img = F.build_image(cnt)
        gain = (0.55 + 0.45 * u) * (1 + 0.8 * max(0.0, 1 - (t - K["n344"]) / 0.5) * (t >= K["n344"]))
        if t >= K["s7"] - 0.1: gain *= lerp(1.0, 0.4, ss((t - K["s7"] + 0.1) / 1.0))
        if t >= K["s8"] - 0.1: gain = lerp(gain, 0.12, ss((t - K["s8"] + 0.1) / 0.8))
        fr += warp_dome(img, cam) * gain
        draw_bars(fr, cam, op=0.5 * u)
        if t < K["s7"]:
            o = win(t, K["s5"] + 0.2, K["s7"], 0.2, 0.3)
            titled(fr, text_layer([fmt(cnt)], font("grot", 170, 700), track=-0.03, glow=8), W / 2, 380, o,
                   1.0 + 0.1 * max(0.0, 1 - (t - K["n344"]) / 0.4) * (t >= K["n344"]))
            titled(fr, text_layer(["LIGAÇÕES ENTRE VERSÍCULOS"], font("mono", 36), color=GOLD, track=0.14), W / 2, 505, o * c01((t - K["n344"]) / 0.3))
            titled(fr, text_layer(["cada fio é uma referência cruzada real"], font("serifi", 50, 500), color=CREAM), W / 2, 590, win(t, K["n344"] + 0.6, K["s7"], 0.25, 0.3))
    # ---------------- S4-S6 (lines 7-11): the brightest point, Isaiah 9:6, 212 threads, a child
    if t >= K["s7"] - 0.1:
        push = ss((t - K["s7"]) / (K["isa96"] - K["s7"]))
        cam = CAM_CATH.mix(CAM_STAR, push)
        sx, sy = float(cam.X(F.X96)), float(cam.Y(0))
        draw_bars(fr, cam, op=0.45 * push)
        if t >= K["isa96"] - 0.4:
            u = (t - K["isa96"] + 0.4) / 1.2; polys = []
            for x in F.XP96:
                p = eo3(u * 1.4 - abs(x - F.X96) * 0.5)
                if p > 0:
                    poly = arc_poly(x, F.X96, cam, 1.0); polys.append(poly[:max(2, int(len(poly) * p))])
            draw_arcs(fr, polys, F.GOLD * 0.75, width=1, glow=0.9)
        ray = ss((t - K["quote"] + 0.2) / 0.9)
        star_point(fr, sx, sy, 0.6 + 1.0 * push + 1.4 * ray, 12 + 8 * push + 10 * ray, rays=ray * (0.9 + 0.08 * math.sin(t * 2.0)), rot=0.05 * math.sin(t * 0.7))
        titled(fr, text_layer(["O VERSÍCULO MAIS CONECTADO DOS 31.102"], font("mono", 34), color=GOLD, track=0.1), W / 2, 270, win(t, K["s8"], K["s12"] - 0.2, 0.3, 0.3))
        if t >= K["isa96"] - 0.1:
            o1 = win(t, K["isa96"] - 0.1, K["s12"] - 0.1, 0.2, 0.35)
            titled(fr, text_layer(["ISAÍAS 9:6"], font("grot", 130, 700), track=-0.01, glow=6), W / 2, 390, o1, 1.0 + 0.08 * (1 - eo3((t - K["isa96"]) / 0.4)))
            o2 = win(t, K["quote"], K["s12"] - 0.1, 0.4, 0.35)
            titled(fr, text_layer(VERSE["isa"], font("serifi", 66, 500), color=(255, 226, 170), lh=1.05), W / 2, 540, o2)
            o3 = win(t, K["n212"] - 0.05, K["s12"] - 0.1, 0.25, 0.35)
            n = int(round(212 * eo3((t - K["n212"] + 0.05) / 0.8)))
            titled(fr, text_layer([f"{n} versículos apontam pra ele"], font("mono", 34), track=0.04), W / 2, 650, o3)
        if t >= K["crianca"] - 0.15:
            o4 = win(t, K["crianca"] - 0.15, K["s12"] - 0.1, 0.3, 0.3)
            titled(fr, text_layer(["O centro de tudo", "é o nascimento de uma criança."], font("serifi", 58, 500), color=CREAM, lh=1.08), W / 2, 1290, o4)
    # ---------------- S7 (line 12): the call
    if t >= K["s12"] - 0.1:
        o = c01((t - K["s12"] + 0.1) / 0.5)
        cam = CAM_STAR.mix(CAM_CALL, ss((t - K["s12"]) / 1.4))
        fr += warp_dome(F.FULL, cam) * 0.55 * o
        draw_bars(fr, cam, op=0.4 * o)
        titled(fr, text_layer(["COMENTA UM"], font("grot", 96, 700), track=-0.01), W / 2, 400, o, 1.0 + 0.06 * (1 - eo3((t - K["s12"]) / 0.4)))
        titled(fr, text_layer(["VERSÍCULO"], font("grot", 96, 700), color=GOLD, track=-0.01, glow=4), W / 2, 505, o)
        titled(fr, text_layer(["e eu te mostro com quem ele conversa"], font("serifi", 56, 500), color=CREAM), W / 2, 625, c01((t - K["mostro"] + 0.1) / 0.35))
        cr = text_layer(["DADOS: OPENBIBLE.INFO (CC BY) · 344.799 REFERÊNCIAS CRUZADAS", "TEXTO: BÍBLIA LIVRE (CC BY 4.0 BR)"], font("mono", 22), color=GREY, track=0.02, lh=1.3)
        paste(fr, cr, W / 2, 1500, o * 0.9)
    if not (t >= K["s12"] - 0.1): subtitle(fr, t)
    fr *= F.VIGN
    fr += cv2.resize(F.GRAIN[fi % len(F.GRAIN)], (W, H), interpolation=cv2.INTER_NEAREST)[..., None] * 0.008
    return np.clip(fr, 0, 1)


if __name__ == "__main__":
    if "--still" in sys.argv:
        for tt in sorted(float(x) for x in sys.argv[sys.argv.index("--still") + 1].split(",")):
            t1 = time.time(); img = F.to8(render(int(round(tt * FPS))))
            cv2.imwrite(str(WORK / f"still-{tt:05.2f}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
            print(f"still {tt:.2f} ({time.time() - t1:.2f} s)")
        sys.exit(0)
    vid = WORK / "video.mp4"
    enc = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-colorspace", "bt709",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-x264-params", "aq-mode=3:deblock=-1,-1", str(vid)]
    pp = subprocess.Popen(enc, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    t1 = time.time()
    for fi in range(NF):
        pp.stdin.write(F.to8(render(fi)).tobytes())
        if fi % 150 == 0: print(f"frame {fi}/{NF}  {time.time() - t1:.0f} s", flush=True)
    pp.stdin.close(); err = pp.stderr.read().decode(); pp.wait()
    assert pp.returncode == 0, err[-2000:]
    print(f"video frames done in {time.time() - t1:.0f} s -> {vid}")
