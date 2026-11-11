#!/usr/bin/env python3
"""HUD and edit of one episode of "Grand Testament Adventure" (Gospel passages as third-person open-world gameplay,
set in first-century Galilee and Judea).

The takes are generated clean (no interface); everything a game would draw on top is drawn here, with our own design:
the mission line, a counter of what the passage counts (disciples called, jars filled), a key prompt, the line of the
passage as a subtitle (literal BLIVRE), a radar in the corner built from real relief and real places with the route to
the next point, a progress bar, and the "missão concluída" card. Nothing here copies the interface or the lettering of
an existing game.

Radar: relief = AWS Terrain Tiles (SRTM/GMTED2010 USGS, ETOPO1 NOAA, Mapzen), prepared by ../biblia-natal/tools;
places = OpenBible.info Bible Geocoding Data (CC BY 4.0), names as the BLIVRE writes them (data/passagens.json, made
by tools/check.py).

  python3 -I hud.py <episode>                      -> renders/<episode>.mp4 (1080x1920, 24 fps)
  python3 -I hud.py <episode> --still 0.5,10,19    -> renders/.hud/<episode>-<t>.jpg
  python3 -I hud.py <episode> --map                -> renders/.hud/<episode>-mapa.png (the radar's world, to check)
  python3 -I hud.py <episode> --tempos             -> renders/.hud/<episode>-tempos.json only (what happens when; every
                                                      run writes it, tools/confere.py reads it)
"""
import json, math, re, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
FONTS = ROOT.parent / "biblia-referencias/assets/fonts"
TERR = ROOT.parent / "biblia-natal/data/terrain"
W, H, FPS, TAKE = 1080, 1920, 24, 8.0                  # TAKE: seconds of every generated take
SAFE = (90, 260, 990, 1660)                            # Reels safe box
CREAM, GOLD, INK, DARK, SKY = (255, 248, 236), (255, 207, 115), (58, 40, 24), (14, 16, 14), (132, 196, 255)
R, PAD, SS = 300, 76, 2                                # radar side, scroll margin, supersampling
MX, MY = SAFE[0], 1290                                 # radar top-left on the frame
SPEED = 0.8                                            # radar scroll at vel=1, px/s (the radar is a regional map: the player barely moves on it)

DATA = json.load(open(ROOT / "data/passagens.json", encoding="utf-8"))
PASS = {p["id"]: p for p in DATA["passagens"]}


def font(name, size, wght=None):
    f = ImageFont.truetype(str(FONTS / name), size)
    if wght:
        try: f.set_variation_by_axes([wght])
        except Exception: pass
    return f


def grot(size, w=600): return font("SpaceGrotesk-VF.ttf", size, w)
def mono(size, bold=True): return font("SpaceMono-Bold.ttf" if bold else "SpaceMono-Regular.ttf", size)
def serif_i(size, w=600): return font("Cormorant-Italic-VF.ttf", size, w)


def tw(text, f, track=0):
    return sum(f.getlength(ch) + track for ch in text) - track if text else 0


def draw_text(d, xy, text, f, fill, track=0, edge=0):
    x, y = xy; kw = dict(stroke_width=edge, stroke_fill=(10, 10, 8, 235)) if edge else {}
    if not track:
        d.text((x, y), text, font=f, fill=fill, **kw); return
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill, **kw); x += f.getlength(ch) + track


def wrap(text, f, width, track=0):
    lines, cur = [], ""
    for word in text.split():
        t = (cur + " " + word).strip()
        if tw(t, f, track) <= width or not cur: cur = t
        else: lines.append(cur); cur = word
    return lines + [cur] if cur else lines


def wrap_even(text, f, width, track=0):
    """wrap() with the same number of lines, broken where the longest line is shortest: no word left alone on the
    last line of a title."""
    from itertools import combinations
    words = text.split(); n = len(wrap(text, f, width, track)); best = None
    if n < 2: return [text]
    for cut in combinations(range(1, len(words)), n - 1):
        lines = [" ".join(words[a:b]) for a, b in zip((0,) + cut, cut + (len(words),))]
        longest = max(tw(l, f, track) for l in lines)
        if longest <= width and (best is None or longest < best[0]): best = (longest, lines)
    return best[1] if best else wrap(text, f, width, track)


def shadowed(img, blur=6, off=(0, 3), strength=0.85):
    """An RGBA layer over a soft dark copy of itself: text that reads on any picture."""
    a = img.getchannel("A")
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(min(255, v * 1.6) * strength)))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(sh, off); out.alpha_composite(img)
    return out


def layer(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def cropped(img):
    box = img.getbbox()
    return (img.crop(box), box[:2]) if box else (None, (0, 0))


def faded(img, k):
    if k >= 0.999: return img
    out = img.copy(); out.putalpha(img.getchannel("A").point(lambda v: int(v * k)))
    return out


def ramp(t, a, b, fade=0.18):
    """Opacity of something shown from a to b seconds, with short fades."""
    if t < a or t > b: return 0.0
    return max(0.0, min(1.0, (t - a) / fade, (b - t) / fade))


# ---------------------------------------------------------------- the radar's world
def merc(lon, lat, z=11):
    n = 256 * 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def flat_water(h, min_px):
    """Lakes and sea in the elevation data: large areas that are exactly level (the Sea of Galilee is one value)."""
    gy, gx = np.gradient(h)
    flat = ndimage.binary_opening(np.hypot(gx, gy) < 0.26, iterations=2)
    lab, _ = ndimage.label(flat); sizes = np.bincount(lab.ravel()); sizes[0] = 0
    keep = np.where(sizes >= min_px)[0]
    med = ndimage.median(h, lab, index=keep) if len(keep) else []
    keep = [k for k, m in zip(keep, med) if abs(m) < 2 or m < -150]           # sea level, or the Jordan rift lakes; not a level plain
    return ndimage.binary_dilation(np.isin(lab, keep), iterations=2)


def terrain(x0, y0, n):
    """Relief, standing water and rivers of the window [x0, x0+n) x [y0, y0+n), in zoom-11 world pixels: the zoom-9
    grid everywhere, the zoom-11 grid where it exists (Jerusalem to the Sea of Galilee)."""
    zw = np.load(TERR / "wide.npz"); hw = zw["h"]; s = 2 ** (11 - int(zw["z"]))
    mw = np.load(TERR / "wide_mask.npz")["m"]; ww = flat_water(hw, 200)
    ys, xs = np.mgrid[y0:y0 + n, x0:x0 + n].astype(np.float32)
    wy, wx = (ys + 0.5) / s - float(zw["py0"]) - 0.5, (xs + 0.5) / s - float(zw["px0"]) - 0.5
    h = ndimage.map_coordinates(hw, [wy, wx], order=1, mode="nearest")
    w = ndimage.map_coordinates(ww.astype(np.float32), [wy, wx], order=1, mode="nearest") > 0.5
    r = ndimage.map_coordinates(mw[..., 2].astype(np.float32), [wy, wx], order=1, mode="nearest") > 127
    zc = np.load(TERR / "corridor.npz"); hc = zc["h"]; px0, py0 = int(zc["px0"]), int(zc["py0"])
    mc = np.load(TERR / "corridor_mask.npz")["m"]; wc = flat_water(hc, 3000)
    ax0, ay0 = max(x0, px0), max(y0, py0); ax1, ay1 = min(x0 + n, px0 + hc.shape[1]), min(y0 + n, py0 + hc.shape[0])
    if ax1 > ax0 and ay1 > ay0:
        dst = (slice(ay0 - y0, ay1 - y0), slice(ax0 - x0, ax1 - x0)); src = (slice(ay0 - py0, ay1 - py0), slice(ax0 - px0, ax1 - px0))
        h[dst] = hc[src]; w[dst] = wc[src]; r[dst] = mc[..., 2][src] > 127
    return h, w, r


def world(ep_id, radius_km):
    """The map around the passage's place, 2x supersampled, north up: (image RGB, px per km at 1x, water mask of the
    same canvas). radius_km is the distance from the player to the edge of the radar."""
    p = PASS[ep_id]; geo = p["geo"]
    cx, cy = merc(geo["lon"], geo["lat"])                             # zoom-11 world px
    mpp = 40075016.686 * math.cos(math.radians(geo["lat"])) / (256 * 2 ** 11)
    half = (R / 2 + PAD) / (R / 2) * radius_km * 1000 / mpp          # DEM px from the centre to the canvas edge
    side = (R + 2 * PAD) * SS
    x0, y0 = int(round(cx - half)), int(round(cy - half)); n = int(round(2 * half))
    hc, wc, rc = terrain(x0, y0, n)
    k = side / n; cx, cy = x0 + n / 2, y0 + n / 2                    # the canvas centre, after rounding
    hi = np.asarray(Image.fromarray(hc.astype(np.float32), "F").resize((side, side), Image.BICUBIC))
    lake = np.asarray(Image.fromarray((wc * 255).astype(np.uint8)).resize((side, side), Image.BILINEAR)) > 127
    river = np.asarray(Image.fromarray((rc * 255).astype(np.uint8)).resize((side, side), Image.BILINEAR)) > 90
    hi = ndimage.gaussian_filter(hi, 1.2 * SS)
    gy, gx = np.gradient(hi, mpp / k)
    zx = 2.6                                                          # vertical exaggeration of the relief
    nrm = np.sqrt((gx * zx) ** 2 + (gy * zx) ** 2 + 1)
    shade = ((gx * zx) * 0.5 + (gy * zx) * 0.5 + 0.707) / nrm         # light from the north-west
    shade = np.clip((shade - 0.25) / 0.75, 0, 1)
    rng = np.random.default_rng(7)
    paper = np.array([226, 205, 164], np.float32)
    lo, hi_ = np.percentile(hi, 2), np.percentile(hi, 98)
    e = np.clip((hi - lo) / max(1.0, hi_ - lo), 0, 1)[..., None]
    img = paper * (0.90 + 0.12 * e) * (0.60 + 0.46 * shade[..., None])
    blot = ndimage.gaussian_filter(rng.normal(0, 1, (side, side)).astype(np.float32), 26 * SS); blot /= np.abs(blot).max() + 1e-6
    img *= (1 + 0.07 * blot[..., None])
    img += rng.normal(0, 3.2, (side, side, 1))
    if (lake | river).any():
        dist = ndimage.distance_transform_edt(lake)
        img[lake] = img[lake] * 0.12 + np.array([112, 140, 146], np.float32) * 0.88
        ripple = lake & (dist > 3 * SS) & (dist < 34 * SS) & ((dist / SS) % 9 < 1.3)
        img[ripple] = img[ripple] * 0.72 + np.array([70, 96, 104], np.float32) * 0.28
        shore = ndimage.binary_dilation(lake, iterations=SS) & ~lake
        img[shore] = np.array(INK, np.float32)
        rv = river & ~lake
        img[rv] = img[rv] * 0.25 + np.array([92, 122, 130], np.float32) * 0.75
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
    d = ImageDraw.Draw(out); ppk = (R / 2) / radius_km * SS                       # canvas px per km
    fl, fw = serif_i(19 * SS, 700), serif_i(17 * SS, 600)
    boxes = [(side / 2 - 22 * SS, side / 2 - 22 * SS, side / 2 + 22 * SS, side / 2 + 22 * SS)]       # the player marker
    order = sorted(DATA["lugares"], key=lambda g: (g["id"] != geo["id"], g["tipo"] != "t"))

    def free(b):
        return all(b[2] < o[0] or b[0] > o[2] or b[3] < o[1] or b[1] > o[3] for o in boxes) and b[0] > 4 and b[1] > 4 and b[2] < side - 4 and b[3] < side - 4

    for g in order:
        gx_, gy_ = merc(g["lon"], g["lat"]); x = (gx_ - cx) * k + side / 2; y = (gy_ - cy) * k + side / 2
        if not (20 < x < side - 20 and 20 < y < side - 20): continue
        town = g["tipo"] == "t"; f = fl if town else fw
        name = g["nome"] if town else g["nome"].upper(); tr = 0 if town else 2 * SS
        wd, ht = tw(name, f, tr), f.size; r = 4 * SS
        cands = ([(x + r + 4 * SS, y - ht * 0.62), (x - r - 4 * SS - wd, y - ht * 0.62), (x - wd / 2, y - r - ht - 2 * SS), (x - wd / 2, y + r + 1 * SS)]
                 if town else [(x - wd / 2, y - ht / 2 + dy * SS) for dy in (0, 26, -26, 52, -52)])
        for (lx, ly) in cands:
            b = (lx - 3, ly, lx + wd + 3, ly + ht * 1.15)
            if free(b):
                boxes.append(b)
                halo = Image.new("L", out.size, 0); draw_text(ImageDraw.Draw(halo), (lx, ly), name, f, 255, tr)
                halo = halo.filter(ImageFilter.GaussianBlur(2.2 * SS)).point(lambda v: min(255, int(v * 2.4)))
                out.paste(Image.new("RGB", out.size, (232, 214, 176)), (0, 0), halo)
                d = ImageDraw.Draw(out); draw_text(d, (lx, ly), name, f, INK if town else (52, 78, 88), tr)
                break
        if town: d.rectangle([x - r, y - r, x + r, y + r], fill=INK, outline=(236, 220, 186), width=SS)
    return out, ppk / SS, lake


def radar_frame():
    """Border of the radar (RGBA, R+16 square), drawn once."""
    s = (R + 16) * SS; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); o = 8 * SS
    d.rounded_rectangle([o - 5 * SS, o - 5 * SS, s - o + 5 * SS, s - o + 5 * SS], radius=13 * SS, outline=(18, 14, 10, 255), width=5 * SS)
    d.rounded_rectangle([o, o, s - o, s - o], radius=9 * SS, outline=(236, 220, 186, 150), width=1 * SS)
    f = mono(15 * SS); bx = s - o - 30 * SS; by = o + 8 * SS
    d.rounded_rectangle([bx, by, bx + 22 * SS, by + 22 * SS], radius=3 * SS, fill=(18, 14, 10, 235))
    d.text((bx + 11 * SS - f.getlength("N") / 2, by + 0 * SS), "N", font=f, fill=CREAM + (255,))
    return im.resize((R + 16, R + 16), Image.LANCZOS)


def radar_marks(rumo, dest, followers, pulse):
    """Route, destination, followers and the player's arrow, in the radar's own frame (player at the centre)."""
    s = R * SS; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = s / 2
    a = math.radians(rumo); ux, uy = math.sin(a), -math.cos(a)
    L = dest * SS                                                     # px from the player to the destination
    for t in np.arange(15 * SS, max(15 * SS, L - 10 * SS), 9 * SS):
        d.ellipse([c + ux * t - 2.3 * SS, c + uy * t - 2.3 * SS, c + ux * t + 2.3 * SS, c + uy * t + 2.3 * SS], fill=GOLD + (255,), outline=(24, 18, 12, 255))
    dx, dy = c + ux * L, c + uy * L; rr = (9 + 3 * pulse) * SS
    d.ellipse([dx - rr, dy - rr, dx + rr, dy + rr], outline=GOLD + (int(255 * (1 - 0.6 * pulse)),), width=2 * SS)
    d.ellipse([dx - 6 * SS, dy - 6 * SS, dx + 6 * SS, dy + 6 * SS], fill=GOLD + (255,), outline=(24, 18, 12, 255), width=SS)
    d.ellipse([dx - 2 * SS, dy - 2 * SS, dx + 2 * SS, dy + 2 * SS], fill=(24, 18, 12, 255))
    for i in range(followers):
        side_ = (-1) ** i * 6 * SS; back = (13 + 9 * (i // 2)) * SS
        fx, fy = c - ux * back - uy * side_, c - uy * back + ux * side_
        d.ellipse([fx - 4.5 * SS, fy - 4.5 * SS, fx + 4.5 * SS, fy + 4.5 * SS], fill=SKY + (255,), outline=(24, 18, 12, 255), width=SS)
    pts = [(0, -17), (12, 14), (0, 7), (-12, 14)]
    rot = [(c + (x * math.cos(a) - y * math.sin(a)) * SS, c + (x * math.sin(a) + y * math.cos(a)) * SS) for x, y in pts]
    d.polygon(rot, fill=(255, 255, 255, 255)); d.line(rot + [rot[0]], fill=(24, 18, 12, 255), width=2 * SS)
    return im.resize((R, R), Image.LANCZOS)


# ---------------------------------------------------------------- interface layers
def scrims():
    a = np.zeros((H, W), np.float32); y = np.arange(H, dtype=np.float32)[:, None]
    a += 0.40 * np.clip(1 - y / 560, 0, 1) ** 1.6
    a += 0.52 * np.clip((y - 1180) / (H - 1180), 0, 1) ** 1.4
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); im.putalpha(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)))
    return im


def header():
    im = layer(); d = ImageDraw.Draw(im); f = mono(22)
    draw_text(d, (70, 92), "GRAND TESTAMENT ADVENTURE", f, CREAM + (235,), 1, 2)
    t = "RECRIAÇÃO · IA"; draw_text(d, (1010 - tw(t, f, 1), 92), t, f, CREAM + (235,), 1, 2)
    return shadowed(im, 4, (0, 2))


def objective(k, n, text, done=False):
    im = layer(); d = ImageDraw.Draw(im); f = grot(36, 600); fs = mono(22)
    x, y = SAFE[0], SAFE[1] + 12
    draw_text(d, (x + 2, y), f"MISSÃO {k} DE {n}", fs, GOLD + (255,), 2, 2)
    t = text.upper(); wd = tw(t, f, 1.5); y2 = y + 40
    d.rounded_rectangle([x, y2, x + wd + 68, y2 + 70], radius=8, fill=DARK + (190,), outline=(GOLD + (255,)) if done else None, width=3)
    d.rectangle([x, y2 + 8, x + 6, y2 + 62], fill=GOLD + (255,))
    if done: d.line([(x + 18, y2 + 36), (x + 26, y2 + 45), (x + 41, y2 + 26)], fill=GOLD + (255,), width=6, joint="curve")
    else: d.polygon([(x + 28, y2 + 24), (x + 39, y2 + 35), (x + 28, y2 + 46), (x + 17, y2 + 35)], fill=GOLD + (255,))
    draw_text(d, (x + 54, y2 + 12), t, f, (GOLD if done else CREAM) + (255,), 1.5)
    return shadowed(im, 5, (0, 3), 0.6)


def counter(label, total, filled):
    im = layer(); d = ImageDraw.Draw(im); f = mono(21); x, y = SAFE[0] + 2, SAFE[1] + 12 + 40 + 70 + 16
    t = label.upper(); draw_text(d, (x, y), t, f, CREAM + (240,), 2, 2); px = x + tw(t, f, 2) + 18
    for i in range(total):
        box = [px + i * 30, y + 5, px + i * 30 + 20, y + 25]
        if i < filled: d.ellipse(box, fill=GOLD + (255,), outline=(24, 18, 12, 255), width=2)
        else: d.ellipse(box, fill=(14, 16, 14, 150), outline=CREAM + (230,), width=2)
    return shadowed(im, 4, (0, 2), 0.7)


def place_plate(p):
    im = layer(); d = ImageDraw.Draw(im); x = MX + R + 26; y = MY + R - 104
    geo = p["geo"]
    draw_text(d, (x, y), p["lugar"].upper(), grot(30, 700), CREAM + (255,), 1)
    lat = f"{abs(geo['lat']):.2f}".replace(".", ","); lon = f"{abs(geo['lon']):.2f}".replace(".", ",")
    coord = ("≈ " if geo.get("nota") else "") + f"{lat}° N · {lon}° L"
    draw_text(d, (x, y + 44), coord, mono(21), GOLD + (255,), 0, 2)
    draw_text(d, (x, y + 76), p["ref_pt"].upper(), mono(21), CREAM + (235,), 1, 2)
    return shadowed(im, 5, (0, 2))


def progress(n, done, frac):
    """The bar under the radar: one segment per mission; `done` full ones, the current one filled to `frac`."""
    im = Image.new("RGBA", (R, 14), (0, 0, 0, 0)); d = ImageDraw.Draw(im); gap = 6; sw = (R - gap * (n - 1)) / n
    for i in range(n):
        x0 = i * (sw + gap); d.rectangle([x0, 0, x0 + sw, 13], fill=(14, 16, 14, 215), outline=(18, 14, 10, 255))
        f = 1.0 if i < done else (frac if i == done else 0.0)
        if f > 0: d.rectangle([x0 + 2, 2, x0 + 2 + (sw - 4) * f, 11], fill=GOLD + (255,))
    return im


def subtitle(fala):
    im = layer(); d = ImageDraw.Draw(im); f = grot(46, 500); fr = mono(23)
    lines = wrap("“" + fala["texto"] + "”", f, 860); lh = 58
    bottom = 1236; top = bottom - 36 - lh * len(lines)
    for i, l in enumerate(lines): draw_text(d, (540 - tw(l, f) / 2, top + i * lh), l, f, (255, 255, 255, 255), 0, 3)
    t = fala["ref"].upper(); draw_text(d, (540 - tw(t, fr, 2) / 2, bottom - 26), t, fr, GOLD + (255,), 2, 2)
    return shadowed(im, 7, (0, 3), 0.9)


def prompt(text):
    im = layer(); d = ImageDraw.Draw(im); f = grot(36, 600); fk = grot(34, 700)
    t = text.upper(); wd = tw(t, f, 1.5); x = 540 - (wd + 84) / 2; y = 1010
    d.rounded_rectangle([x - 18, y - 12, x + wd + 102, y + 72], radius=12, fill=DARK + (170,))
    d.rounded_rectangle([x, y, x + 60, y + 60], radius=10, fill=CREAM + (250,), outline=(24, 18, 12, 255), width=3)
    d.text((x + 30 - fk.getlength("E") / 2, y + 7), "E", font=fk, fill=(24, 18, 12, 255))
    draw_text(d, (x + 84, y + 8), t, f, CREAM + (255,), 1.5)
    return shadowed(im, 5, (0, 3), 0.6)


HOOK = ["E SE EXISTISSE UM JOGO COM AS", "MISSÕES DA VIDA DE JESUS?"]          # the series' opening line (Alex, 11/11 09:30)


def start_card(p):
    im = layer(); d = ImageDraw.Draw(im); f = grot(92, 700); fh = grot(40, 700); y = 560
    for i, l in enumerate(HOOK): draw_text(d, (540 - tw(l, fh, 2) / 2, 440 + i * 50), l, fh, GOLD + (255,), 2, 3)
    lines = wrap_even(p["titulo"].upper(), f, 900, 1)
    for i, l in enumerate(lines): draw_text(d, (540 - tw(l, f, 1) / 2, y + i * 100), l, f, CREAM + (255,), 1, 3)
    y2 = y + 100 * len(lines) + 16
    d.rectangle([540 - 60, y2, 540 + 60, y2 + 6], fill=GOLD + (255,))
    t = p["ref_pt"].upper(); fr = mono(30); draw_text(d, (540 - tw(t, fr, 3) / 2, y2 + 26), t, fr, GOLD + (255,), 3, 2)
    return shadowed(im, 9, (0, 4))


def end_card(p):
    im = layer(); d = ImageDraw.Draw(im); y = 610
    c = (540, y); r = 54
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=GOLD + (255,), width=6)
    d.line([(c[0] - 24, c[1] + 2), (c[0] - 6, c[1] + 20), (c[0] + 26, c[1] - 18)], fill=GOLD + (255,), width=9, joint="curve")
    f = grot(84, 700); t = "MISSÃO CONCLUÍDA"; draw_text(d, (540 - tw(t, f, 2) / 2, y + 86), t, f, GOLD + (255,), 2, 3)
    f2 = grot(50, 600); lines = wrap_even(p["titulo"].upper(), f2, 880, 1)
    for i, l in enumerate(lines): draw_text(d, (540 - tw(l, f2, 1) / 2, y + 204 + i * 60), l, f2, CREAM + (255,), 1, 2)
    y3 = y + 204 + 60 * len(lines) + 20
    t = f"RECRIAÇÃO · {p['ref_pt'].upper()}"; f3 = mono(26); draw_text(d, (540 - tw(t, f3, 2) / 2, y3), t, f3, CREAM + (235,), 2, 2)
    f4 = mono(17, False)
    cred = ["TEXTO: BÍBLIA LIVRE (CC BY 4.0 BR) · LUGARES: OPENBIBLE.INFO (CC BY 4.0)", "RELEVO: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), MAPZEN · IMAGENS GERADAS POR IA"]
    for i, l in enumerate(cred): draw_text(d, (540 - tw(l, f4) / 2, 1150 + i * 28), l, f4, CREAM + (225,), 0, 2)      # outlined: it has to read over a light tunic too
    return shadowed(im, 8, (0, 4))


# ---------------------------------------------------------------- sound
def loudness(path):
    """(integrated LUFS, true peak dBTP) of a file, measured with ebur128."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rindex("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail)[1]), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)[1])


def ui_sounds(ms, TT, starts, sub0, length_s):
    """The interface's own sounds, synthesized here: a thump when the mission title comes in and on each new mission,
    a tick for the key prompt and for the subtitle, a two-note chime when a mission line is ticked, a D major chord
    under "missão concluída". TT holds the times inside each mission (see timing()), starts when each mission begins,
    sub0 when each subtitle comes in; length_s is the length of the reel."""
    sr = 48000; n = len(ms); length = int(length_s * sr); x = np.zeros(length + sr, np.float32)

    def add(t, y):
        i = int(t * sr); y = y[:len(x) - i]; x[i:i + len(y)] += y.astype(np.float32)

    def tone(f, dur, amp, decay, attack=0.004):
        t = np.arange(int(dur * sr)) / sr
        return amp * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t / decay) * np.clip(t / attack, 0, 1)

    def thump(amp):
        t = np.arange(int(0.5 * sr)) / sr; f = 46 + 44 * np.exp(-t / 0.05)
        return amp * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.16)

    add(0.04, thump(0.55))
    for k, mi in enumerate(ms):
        t0 = starts[k]; T = TT[k]
        if k: add(t0 + 0.02, thump(0.28))
        if mi.get("acao"): add(t0 + T["prompt"][0], tone(1480, 0.07, 0.10, 0.02))
        if mi.get("fala"): add(t0 + sub0[k], tone(660.0, 0.09, 0.05, 0.03))
        if k < n - 1:
            add(t0 + T["done"], tone(880.0, 0.5, 0.17, 0.16)); add(t0 + T["done"] + 0.10, tone(1318.5, 0.7, 0.17, 0.22))
    t0 = starts[-1] + TT[-1]["end"]
    add(t0, thump(0.5))
    for i, f in enumerate((293.66, 440.0, 587.33, 739.99)): add(t0 + 0.05 * i, tone(f, 2.6, 0.12, 0.9, 0.05))
    return x[:length], sr


def timing(beat, fim=2.6, pausa=0.0):
    """When things happen inside a mission of `beat` seconds. fim = how long the "missão concluída" card stays; pausa =
    how long the last frame of the last take is held under it (the card then covers less of the action)."""
    return {"beat": beat, "prompt": (0.2, 1.15), "sub": (1.0, beat - 0.3), "done": beat - 0.8, "start": 2.2, "end": beat + pausa - fim, "pausa": pausa}


def cut_times(path):
    """Seconds into a take where its hard cuts land (the first frame of each new shot): a change between two
    consecutive frames that is large and far above the changes around it. Measured on the take (24 fps)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", "scale=108:192,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, 192, 108).astype(np.int16)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    return [(i + 1) / FPS for i in range(len(d)) if d[i] > 18 and d[i] > 3 * np.median(d[max(0, i - 12):i + 13])]


# ---------------------------------------------------------------- episode
def build(ep_id, stills=None, map_only=False, times_only=False):
    ep = DATA["episodios"][ep_id]; p = PASS[ep_id]; ms = ep["missoes"]; n = len(ms)
    wimg, ppk, lake = world(ep_id, ep["raio_km"])
    out_dir = ROOT / "renders/.hud"; out_dir.mkdir(parents=True, exist_ok=True)
    if map_only:
        wimg.save(out_dir / f"{ep_id}-mapa.png"); print(out_dir / f"{ep_id}-mapa.png", wimg.size, f"{ppk:.2f} px/km"); return
    takes = [ROOT / "source/takes" / mi["take"] for mi in ms]; cuts = {}

    def cut_of(k, which):
        """The hard cut of mission k's take named "corte" (the first) or "corte2" (the second), in seconds of the take."""
        if k not in cuts: cuts[k] = cut_times(takes[k])
        i = int(which[5:] or 1) - 1
        assert which.startswith("corte") and i < len(cuts[k]), f"{ms[k]['take']}: asked for {which}, cuts found at {cuts[k]}"
        return cuts[k][i]

    def pace(k):
        """The pace of mission k's take as segments (from, to, speed), in seconds of the take: the episode's ritmo, the
        mission's own number, or its list of (until, speed), where until is a second, a cut or None (the end)."""
        r = ms[k].get("ritmo") or ep.get("ritmo", 1.0)
        if isinstance(r, (int, float)): return [(0.0, TAKE, float(r))]
        segs, s0 = [], 0.0
        for until, speed in r:
            s1 = TAKE if until is None else cut_of(k, until) if isinstance(until, str) else float(until)
            assert s0 < s1 <= TAKE, f"mission {k + 1}: pace segment {s0}-{s1}"
            segs.append((s0, s1, float(speed))); s0 = s1
        assert s0 == TAKE, f"mission {k + 1}: the pace has to run to the end of the take"
        return segs

    SEG = [pace(k) for k in range(n)]
    NB = [int(round(sum((b - a) / v for a, b, v in sg) * FPS)) for sg in SEG]; BEAT = [x / FPS for x in NB]     # frames and seconds of each mission
    F0 = [sum(NB[:k]) for k in range(n)]                                                                        # the first frame of each mission
    nh = int(round(ep.get("pausa", 0.0) * FPS)); total = sum(NB) + nh                                          # nh: frames the last picture is held
    TT = [timing(b, ep.get("fim", 2.6), nh / FPS) for b in BEAT]

    def at(k, s):
        """Second s of mission k's take, in seconds of the mission (after its pace)."""
        return sum((min(s, b) - a) / v for a, b, v in SEG[k] if s > a)

    FRAME = radar_frame(); SCRIM = scrims(); HEAD = header(); PLATE = place_plate(p); cnt = ep.get("contador")
    mask = Image.new("L", (R * SS, R * SS), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, R * SS - 1, R * SS - 1], radius=9 * SS, fill=255)
    mask = mask.resize((R, R), Image.LANCZOS)
    static, static_done = [], []
    for k, mi in enumerate(ms):
        before = ms[k - 1].get("conta", 0) if k else 0
        for lst, done in ((static, False), (static_done, True)):
            s = SCRIM.copy(); s.alpha_composite(HEAD); s.alpha_composite(objective(k + 1, n, mi["objetivo"], done)); s.alpha_composite(PLATE)
            if cnt: s.alpha_composite(counter(cnt["rotulo"], cnt["total"], mi.get("conta", before) if done else before))
            lst.append(s)
    subs = [cropped(subtitle(mi["fala"])) if mi["fala"] else (None, (0, 0)) for mi in ms]
    prompts = [cropped(prompt(mi["acao"])) if mi.get("acao") else (None, (0, 0)) for mi in ms]
    START, ENDC = cropped(start_card(p)), cropped(end_card(p))
    side = wimg.size[0]; pos = [side / 2, side / 2]                               # the player on the world canvas (2x px)
    V = [SPEED * SS * mi.get("vel", 1) for mi in ms]                              # canvas px per second, per mission
    if ms[0].get("da_margem"):                                                    # mission 1 crosses the water: from the shore behind the player to the passage's point
        a = math.radians(ms[0]["rumo"]); ux, uy = math.sin(a), -math.cos(a); d = 0
        while d < side / 2 - 2 and lake[int(round(side / 2 - uy * d)), int(round(side / 2 - ux * d))]: d += 1
        d += 0.25 * ppk * SS                                                      # a step inland: the mission starts on the beach
        assert d <= PAD * SS, f"the shore is {d / SS / ppk:.1f} km away: farther than the radar's margin"
        pos = [side / 2 - ux * d, side / 2 - uy * d]; V[0] = d / BEAT[0]
        print(f"mission 1 starts on the shore {d / SS / ppk:.1f} km behind the passage's point (bearing {(ms[0]['rumo'] + 180) % 360}°)")

    def sub_from(k, mi):
        """When the subtitle of mission k comes in: 1 s by default, right after one of the take's cuts ("corte",
        "corte2"), or at a given second; in mission 1 never before the title card has left."""
        s = mi.get("fala_de"); t0 = TT[k]["sub"][0]
        if isinstance(s, str): t0 = at(k, cut_of(k, s)) + 0.12
        elif s is not None: t0 = float(s)
        return max(t0, TT[k]["start"] + 0.1) if k == 0 else t0

    def sub_to(k, mi):
        """When it leaves: with the mission by default (before the end card in the last one), just before one of the
        take's cuts ("corte", "corte2"), or at a given second."""
        s = mi.get("fala_ate"); t1 = TT[k]["end"] - 0.2 if k == n - 1 else TT[k]["sub"][1]
        if isinstance(s, str): return min(t1, at(k, cut_of(k, s)) - 0.08)
        return t1 if s is None else min(t1, float(s))

    SUB0 = [sub_from(k, mi) if mi["fala"] else None for k, mi in enumerate(ms)]
    SUB1 = [sub_to(k, mi) if mi["fala"] else None for k, mi in enumerate(ms)]
    for k, mi in enumerate(ms):
        line = f"mission {k + 1}: {BEAT[k]:.2f} s, pace " + " + ".join(f"{b - a:.2f} s at {v}x" for a, b, v in SEG[k])
        if mi["fala"]:
            assert SUB1[k] - SUB0[k] >= 1.6, f"mission {k + 1}: the subtitle stays only {SUB1[k] - SUB0[k]:.2f} s"
            line += f"; subtitle {SUB0[k]:.2f}–{SUB1[k]:.2f} s"
        print(line)
    starts = [f / FPS for f in F0]
    seams = [starts[k] for k in range(1, n)] + [starts[k] + at(k, b) for k in range(n) for a, b, v in SEG[k][:-1]] + ([starts[-1] + BEAT[-1]] if nh else [])
    json.dump({"quadros": total, "duracao_s": total / FPS, "missoes_s": starts, "duracao_missao_s": BEAT, "pausa_s": nh / FPS,
               "cartao_final_s": starts[-1] + TT[-1]["end"], "legendas_s": [[starts[k] + SUB0[k], starts[k] + SUB1[k]] if ms[k]["fala"] else None for k in range(n)],
               "emendas_som_s": sorted(seams)}, open(out_dir / f"{ep_id}-tempos.json", "w", encoding="utf-8"), indent=1)
    if times_only: return
    want = None if stills is None else {int(round(t * FPS)): t for t in stills}

    def frame(k, j, src):
        """Mission k, frame j of it, over the picture src (RGB 1080x1920)."""
        t = j / FPS; mi = ms[k]; a = math.radians(mi["rumo"]); last = k == n - 1; T = TT[k]; beat = BEAT[k]
        tm = min(t, beat)                                                           # the player stops with the take; the held frames only keep the card up
        v = V[k]; x = pos[0] + math.sin(a) * v * tm; y = pos[1] - math.cos(a) * v * tm
        t_done = T["end"] if last else T["done"]
        im = src.convert("RGBA"); im.alpha_composite(static_done[k] if t >= t_done else static[k])
        bx, by = int(round(x - R * SS / 2)), int(round(y - R * SS / 2))
        crop = wimg.crop((bx, by, bx + R * SS, by + R * SS)).resize((R, R), Image.LANCZOS).convert("RGBA")
        dest = (v / SS) * (beat - tm) + 13.0                                        # px still to go to this mission's point
        crop.alpha_composite(radar_marks(mi["rumo"], dest, mi.get("seguidores", 0), (t * 1.4) % 1.0))
        im.paste(crop, (MX, MY), mask); im.alpha_composite(FRAME, (MX - 8, MY - 8))
        ticked = t >= t_done                                                        # once ticked, this mission's segment is full and the next one stays empty
        im.alpha_composite(progress(n, k + (1 if ticked else 0), 0.0 if ticked else min(1.0, t / t_done)), (MX, MY + R + 14))
        if subs[k][0] is not None:
            o = ramp(t, SUB0[k], SUB1[k])
            if o > 0: im.alpha_composite(faded(subs[k][0], o), subs[k][1])
        if prompts[k][0] is not None:
            o = ramp(t, *T["prompt"])
            if o > 0: im.alpha_composite(faded(prompts[k][0], o), prompts[k][1])
        if k == 0:
            o = 1.0 if t < T["start"] - 0.25 else ramp(t, -1, T["start"], 0.25)
            if o > 0: im.alpha_composite(faded(START[0], o), START[1])
        if last:
            o = ramp(t, T["end"], beat + T["pausa"] + 1, 0.3)
            if o > 0:
                im = Image.blend(im, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.5 * o)
                im.alpha_composite(faded(ENDC[0], o), ENDC[1])
        return im.convert("RGB")

    def advance(k):
        a = math.radians(ms[k]["rumo"]); pos[0] += math.sin(a) * V[k] * BEAT[k]; pos[1] -= math.cos(a) * V[k] * BEAT[k]

    def retime(k):
        """The setpts of mission k's take: one speed, or one per segment of its pace."""
        sg = SEG[k]
        if len(sg) == 1: return f"setpts=PTS/{sg[0][2]}"
        expr, c = "", 0.0
        for i, (a, b, v) in enumerate(sg):
            piece = f"{c:.6f}+(T-{a:.6f})/{v}"; expr += f"if(lt(T,{b:.6f}),{piece}," if i < len(sg) - 1 else piece; c += (b - a) / v
        return f"setpts='({expr}{')' * (len(sg) - 1)})/TB'"

    enc = None; out = out_dir / f"{ep_id}-video.mp4"
    if want is None:
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "9500k", "-bufsize", "19000k", "-pix_fmt", "yuv420p",
                                "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)
    for k, mi in enumerate(ms):
        nb = NB[k]; hold = nh if k == n - 1 else 0
        if want is not None and not any(F0[k] <= g < F0[k] + nb + hold for g in want):
            advance(k); continue
        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(takes[k]), "-vf", f"{retime(k)},fps={FPS},scale={W}:{H}:flags=lanczos,unsharp=5:5:0.4",
                                "-frames:v", str(nb), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
        for j in range(nb + hold):
            g = F0[k] + j
            if j < nb:
                raw = dec.stdout.read(W * H * 3)
                assert len(raw) == W * H * 3, f"{mi['take']}: only {j} frames"
                if want is not None and g not in want and not (hold and j == nb - 1): continue
                pic = Image.frombuffer("RGB", (W, H), raw)
                if j == nb - 1: held = pic.copy()
                if want is not None and g not in want: continue
            else:                                                                   # the last picture, held under the end card with a slow push-in so it is not a dead still
                if want is not None and g not in want: continue
                z = 1 + 0.03 * (j - nb + 1) / hold; cw, ch = W / z, H / z
                pic = held.resize((W, H), Image.BICUBIC, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
            im = frame(k, j, pic)
            if want is not None:
                f = out_dir / f"{ep_id}-{want[g]:05.2f}.jpg"; im.save(f, quality=90); print(f)
            else: enc.stdin.write(im.tobytes())
        dec.stdout.close(); dec.wait(); advance(k)
    if enc is None: return
    enc.stdin.close(); assert enc.wait() == 0
    # sound: the takes' own ambience at each mission's pace, joined on the cut, plus the interface sounds; then levelled
    # to -14 LUFS with a ceiling, measured on the AAC
    import soundfile as sf
    ui, sr = ui_sounds(ms, TT, starts, SUB0, total / FPS); uiw = out_dir / f"{ep_id}-ui.wav"; sf.write(uiw, ui, sr)
    ins = sum((["-i", str(t)] for t in takes), [])
    fc = ""; ph = nh / FPS
    for i in range(n):
        sg = SEG[i]; beat = BEAT[i]
        if len(sg) == 1: head = f"[{i}:a]atrim=0:{TAKE},asetpts=PTS-STARTPTS,atempo={sg[0][2]}"
        else:                                                                       # one tempo per segment of the take, joined with a few milliseconds of fade
            head = f"[{i}:a]asplit={len(sg)}" + "".join(f"[s{i}_{q}]" for q in range(len(sg))) + ";"
            for q, (a, b, v) in enumerate(sg):
                head += f"[s{i}_{q}]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,atempo={v},afade=t=in:d=0.008,afade=t=out:st={(b - a) / v - 0.008:.4f}:d=0.008[p{i}_{q}];"
            head += "".join(f"[p{i}_{q}]" for q in range(len(sg))) + f"concat=n={len(sg)}:v=0:a=1"
        head += f",atrim=0:{beat:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.04"
        if i == n - 1 and nh:                                                       # the held frames: the end of this take's ambience played backwards, so it carries on without a seam
            fc += (f"{head},asplit[m{i}][x{i}];[x{i}]atrim=start={beat - ph:.4f}:end={beat:.4f},asetpts=PTS-STARTPTS,areverse,"
                   f"afade=t=out:st=0.15:d={ph - 0.15:.4f}[r{i}];[m{i}][r{i}]concat=n=2:v=0:a=1[a{i}];")
        else: fc += f"{head},afade=t=out:st={beat - 0.06:.4f}:d=0.06[a{i}];"
    fc += "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,aresample=48000,loudnorm=I=-20:TP=-3:LRA=11,aresample=48000[amb];"
    fc += f"[{n}:a]aresample=48000[ui];[amb][ui]amix=inputs=2:normalize=0:duration=longest,afade=t=out:st={total / FPS - 0.1:.4f}:d=0.1[a]"
    mixw = out_dir / f"{ep_id}-mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-i", str(uiw), "-filter_complex", fc, "-map", "[a]", "-t", f"{total / FPS:.3f}", "-ar", "48000", str(mixw)], check=True)
    final = ROOT / f"renders/{ep_id}.mp4"; gain = -14.0 - loudness(mixw)[0]
    for _ in range(3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-i", str(mixw), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,alimiter=limit=0.78:attack=3:release=60:level=disabled,aresample=48000",       # -2.2 dBFS: the AAC stays under -1 dBTP
                        "-c:a", "aac", "-b:a", "192k", "-t", f"{total / FPS:.3f}", "-movflags", "+faststart", str(final)], check=True)
        lufs, tp = loudness(final)
        if abs(lufs + 14.0) <= 0.3: break
        gain += -14.0 - lufs
    print(final, f"{total} frames, {total / FPS:.2f} s, {final.stat().st_size / 1e6:.2f} MB, {lufs:.1f} LUFS, true peak {tp:.1f} dBTP")


if __name__ == "__main__":
    args = sys.argv[1:]; ep = args[0]
    if "--map" in args: build(ep, map_only=True)
    elif "--tempos" in args: build(ep, times_only=True)
    elif "--still" in args: build(ep, stills=[float(x) for x in args[args.index("--still") + 1].split(",")])
    else: build(ep)
