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
    """The map around the passage's place, 2x supersampled, north up: (image RGB, px per km at 1x). radius_km is the
    distance from the player to the edge of the radar."""
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
    return out, ppk / SS


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
    lines = wrap(p["titulo"].upper(), f, 900, 1)
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
    f2 = grot(50, 600); lines = wrap(p["titulo"].upper(), f2, 880, 1)
    for i, l in enumerate(lines): draw_text(d, (540 - tw(l, f2, 1) / 2, y + 204 + i * 60), l, f2, CREAM + (255,), 1, 2)
    y3 = y + 204 + 60 * len(lines) + 20
    t = f"RECRIAÇÃO · {p['ref_pt'].upper()}"; f3 = mono(26); draw_text(d, (540 - tw(t, f3, 2) / 2, y3), t, f3, CREAM + (235,), 2, 2)
    f4 = mono(17, False)
    cred = ["TEXTO: BÍBLIA LIVRE (CC BY 4.0 BR) · LUGARES: OPENBIBLE.INFO (CC BY 4.0)", "RELEVO: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), MAPZEN · IMAGENS GERADAS POR IA"]
    for i, l in enumerate(cred): draw_text(d, (540 - tw(l, f4) / 2, 1150 + i * 28), l, f4, CREAM + (200,))
    return shadowed(im, 8, (0, 4))


# ---------------------------------------------------------------- sound
def loudness(path):
    """(integrated LUFS, true peak dBTP) of a file, measured with ebur128."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rindex("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail)[1]), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)[1])


def ui_sounds(ms, T):
    """The interface's own sounds, synthesized here: a thump when the mission title comes in and on each new mission,
    a tick for the key prompt and for the subtitle, a two-note chime when a mission line is ticked, a D major chord
    under "missão concluída". T holds the times inside a mission (see timing())."""
    sr = 48000; n = len(ms); beat = T["beat"]; x = np.zeros(int(n * beat * sr) + sr, np.float32)

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
        if k: add(k * beat + 0.02, thump(0.28))
        if mi.get("acao"): add(k * beat + T["prompt"][0], tone(1480, 0.07, 0.10, 0.02))
        if mi.get("fala"): add(k * beat + T["sub"][0], tone(660.0, 0.09, 0.05, 0.03))
        if k < n - 1:
            add(k * beat + T["done"], tone(880.0, 0.5, 0.17, 0.16)); add(k * beat + T["done"] + 0.10, tone(1318.5, 0.7, 0.17, 0.22))
    t0 = (n - 1) * beat + T["end"]
    add(t0, thump(0.5))
    for i, f in enumerate((293.66, 440.0, 587.33, 739.99)): add(t0 + 0.05 * i, tone(f, 2.6, 0.12, 0.9, 0.05))
    return x[:int(n * beat * sr)], sr


def timing(beat):
    """When things happen inside a mission of `beat` seconds."""
    return {"beat": beat, "prompt": (0.2, 1.15), "sub": (1.0, beat - 0.3), "done": beat - 0.8, "start": 2.2, "end": beat - 2.6}


# ---------------------------------------------------------------- episode
def build(ep_id, stills=None, map_only=False):
    ep = DATA["episodios"][ep_id]; p = PASS[ep_id]; ms = ep["missoes"]; n = len(ms)
    ritmo = ep.get("ritmo", 1.0); nb = int(round(TAKE / ritmo * FPS)); beat = nb / FPS; T = timing(beat)
    wimg, ppk = world(ep_id, ep["raio_km"])
    out_dir = ROOT / "renders/.hud"; out_dir.mkdir(parents=True, exist_ok=True)
    if map_only:
        wimg.save(out_dir / f"{ep_id}-mapa.png"); print(out_dir / f"{ep_id}-mapa.png", wimg.size, f"{ppk:.2f} px/km"); return
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
    total = n * nb
    want = None if stills is None else {int(round(t * FPS)): t for t in stills}

    def frame(k, j, src):
        """Mission k, frame j of it, over the picture src (RGB 1080x1920)."""
        t = j / FPS; mi = ms[k]; a = math.radians(mi["rumo"]); last = k == n - 1
        v = SPEED * SS * mi.get("vel", 1); x = pos[0] + math.sin(a) * v * t; y = pos[1] - math.cos(a) * v * t
        t_done = T["end"] if last else T["done"]
        im = src.convert("RGBA"); im.alpha_composite(static_done[k] if t >= t_done else static[k])
        bx, by = int(round(x - R * SS / 2)), int(round(y - R * SS / 2))
        crop = wimg.crop((bx, by, bx + R * SS, by + R * SS)).resize((R, R), Image.LANCZOS).convert("RGBA")
        dest = (v / SS) * (beat - t) + 13.0                                         # px still to go to this mission's point
        crop.alpha_composite(radar_marks(mi["rumo"], dest, mi.get("seguidores", 0), (t * 1.4) % 1.0))
        im.paste(crop, (MX, MY), mask); im.alpha_composite(FRAME, (MX - 8, MY - 8))
        im.alpha_composite(progress(n, k + (1 if t >= t_done else 0), min(1.0, t / t_done)), (MX, MY + R + 14))
        if subs[k][0] is not None:
            o = ramp(t, T["sub"][0], T["end"] - 0.2 if last else T["sub"][1])
            if o > 0: im.alpha_composite(faded(subs[k][0], o), subs[k][1])
        if prompts[k][0] is not None:
            o = ramp(t, *T["prompt"])
            if o > 0: im.alpha_composite(faded(prompts[k][0], o), prompts[k][1])
        if k == 0:
            o = 1.0 if t < T["start"] - 0.25 else ramp(t, -1, T["start"], 0.25)
            if o > 0: im.alpha_composite(faded(START[0], o), START[1])
        if last:
            o = ramp(t, T["end"], beat + 1, 0.3)
            if o > 0:
                im = Image.blend(im, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.5 * o)
                im.alpha_composite(faded(ENDC[0], o), ENDC[1])
        return im.convert("RGB")

    def advance(mi):
        a = math.radians(mi["rumo"]); v = SPEED * SS * mi.get("vel", 1); pos[0] += math.sin(a) * v * beat; pos[1] -= math.cos(a) * v * beat

    enc = None; out = out_dir / f"{ep_id}-video.mp4"
    if want is None:
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "9500k", "-bufsize", "19000k", "-pix_fmt", "yuv420p",
                                "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)
    for k, mi in enumerate(ms):
        src = ROOT / "source/takes" / mi["take"]
        if want is not None and not any(k * nb <= g < (k + 1) * nb for g in want):
            advance(mi); continue
        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"setpts=PTS/{ritmo},fps={FPS},scale={W}:{H}:flags=lanczos,unsharp=5:5:0.4",
                                "-frames:v", str(nb), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
        for j in range(nb):
            raw = dec.stdout.read(W * H * 3)
            assert len(raw) == W * H * 3, f"{mi['take']}: only {j} frames"
            g = k * nb + j
            if want is not None and g not in want: continue
            im = frame(k, j, Image.frombuffer("RGB", (W, H), raw))
            if want is not None:
                f = out_dir / f"{ep_id}-{want[g]:05.2f}.jpg"; im.save(f, quality=90); print(f)
            else: enc.stdin.write(im.tobytes())
        dec.stdout.close(); dec.wait(); advance(mi)
    if enc is None: return
    enc.stdin.close(); assert enc.wait() == 0
    # sound: the takes' own ambience at the reel's pace, joined on the cut, plus the interface sounds; then levelled to
    # -14 LUFS with a ceiling, measured on the AAC
    import soundfile as sf
    ui, sr = ui_sounds(ms, T); uiw = out_dir / f"{ep_id}-ui.wav"; sf.write(uiw, ui, sr)
    ins = sum((["-i", str(ROOT / "source/takes" / mi["take"])] for mi in ms), [])
    fc = "".join(f"[{i}:a]atrim=0:{TAKE},asetpts=PTS-STARTPTS,atempo={ritmo},atrim=0:{beat:.4f},afade=t=in:d=0.04,afade=t=out:st={beat - 0.06:.4f}:d=0.06[a{i}];" for i in range(n))
    fc += "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,aresample=48000,loudnorm=I=-20:TP=-3:LRA=11,aresample=48000[amb];"
    fc += f"[{n}:a]aresample=48000[ui];[amb][ui]amix=inputs=2:normalize=0:duration=first[a]"
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
    elif "--still" in args: build(ep, stills=[float(x) for x in args[args.index("--still") + 1].split(",")])
    else: build(ep)
