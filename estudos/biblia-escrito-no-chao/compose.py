#!/usr/bin/env python3
"""Picture of "Escrito no chão": every shot of renders/.film/plan.json = its take (or key art) through the shot camera
(push-in, punch-in) with the p5.brush layers of renders/.film/paint/ on top. No type here: the cut, the typography and
the sound are made in Higgsedit (edit/edit.jsx). Text is drawn only in the previews (--still, --preview) so the framing
can be judged before the upload.

  python3 -I compose.py                 -> renders/.film/shots/<id>.mp4 (1080x1920, 24 fps, near-lossless)
  python3 -I compose.py s05 s12         -> only those shots
  python3 -I compose.py --still 0,2.9   -> renders/.stills/f-<t>.jpg (with text and the Reels safe box)
  python3 -I compose.py --preview       -> renders/.film/preview.mp4 (540x960, text + narration; for pacing)
"""
import json, subprocess, sys, zlib
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
P = json.load(open(WORK / "plan.json"))
W, H, FPS = P["W"], P["H"], P["fps"]
IDX = json.load(open(WORK / "paint/index.json"))
FONTS = ROOT.parent / "biblia-referencias/assets/fonts"
SRC = {"t01b": "takes/t01b-hook.mp4", "t01": "takes/t01-hook-720.mp4", "t02": "takes/t02-ring.mp4", "t03": "takes/t03-write.mp4",
       "t04": "takes/t04-rise.mp4", "t05": "takes/t05-fist.mp4", "t06": "takes/t06-leave.mp4", "t08": "takes/t08-feast.mp4",
       "t09": "takes/t09-water.mp4", "t10": "takes/t10-freed.mp4", "t11": "takes/t11-today.mp4",
       "k12": "art/k12-wide.jpg", "k13": "art/k13-stones.jpg", "k27": "art/k27-scroll.jpg", "k28": "art/k28-close.jpg"}
rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255
ease = lambda u: 1 - (1 - min(1.0, max(0.0, u))) ** 3            # fast in, soft landing
smooth = lambda x: np.clip(x, 0, 1) ** 2 * (3 - 2 * np.clip(x, 0, 1))
PANEL = 0.55                                                  # light left by a text panel (multiply), at its centre
fr_ = lambda t: int(round(t * FPS))                           # the plan's times live on whole frames, like the cuts


# ------------------------------------------------------------------ sources
def probe(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=width,height,nb_read_packets", "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout
    w, h, n = map(int, o.strip().split(",")[:3]); return w, h, n


def source_frames(s):
    """the frames of a shot, in source resolution (RGB uint8)"""
    path = ROOT / "source" / SRC[s["src"]]
    if path.suffix == ".jpg":                                  # key art (the PNG originals are on Higgsfield; job ids in PROJETO.md)
        im = np.asarray(Image.open(path).convert("RGB"))
        return [im] * s["frames"]
    w, h, n = probe(path)
    idx = [min(n - 1, int(round(s["in"] * 24 + k * s["speed"]))) for k in range(s["frames"])]
    assert s["in"] * 24 + (s["frames"] - 1) * s["speed"] <= n - 1 + 0.5, (s["id"], "the take is too short", idx[-1], n)
    a, b = idx[0], idx[-1]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"trim=start_frame={a}:end_frame={b + 1},setpts=PTS-STARTPTS",
                          "-sws_flags", "accurate_rnd+full_chroma_int", "-colorspace", "bt709", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    assert len(fr) == b - a + 1, (s["id"], len(fr), a, b)
    return [fr[i - a] for i in idx]


def camera(img, cam, u):
    """zoom z about the anchor (source-normalized), clamped so the view never leaves the picture; cover-fit at z = 1"""
    z0, z1, ax, ay = cam; z = z0 + (z1 - z0) * ease(u)
    sh, sw = img.shape[:2]; s = max(W / sw, H / sh) * z
    hw, hh = W / 2 / s, H / 2 / s
    cx = min(max(ax * sw, hw), sw - hw); cy = min(max(ay * sh, hh), sh - hh)
    M = np.array([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]], np.float64)
    if s < 0.95:                                               # key art, reduced: pre-filter against aliasing
        k = 0.6 * (1 / s - 1) + 0.3; img = cv2.GaussianBlur(img, (0, 0), k)
    out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC if s < 1.6 else cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
    if s > 1.15:                                               # enlarged: give the paper grain its edge back
        a = min(0.7, 0.45 * (s - 1)); bl = cv2.GaussianBlur(out, (0, 0), 1.6 * min(2.2, s) / 1.5)
        out = cv2.addWeighted(out, 1 + a, bl, -a, 0)
    return out


# ------------------------------------------------------------------ painted layers
_EL = {}


def element(e):
    """(crop of the painted element as float RGB, its place, reveal map u in 0..1: the order in which it appears)"""
    eid = e.get("same_as", e["id"])
    if e["id"] in _EL: return _EL[e["id"]]
    b = IDX[eid]; im = np.asarray(Image.open(WORK / f"paint/{eid}.png").convert("RGB")).astype(np.float32) / 255
    h, w = im.shape[:2]; yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rng = np.random.default_rng(zlib.crc32(eid.encode()))
    if e["type"] == "stroke":
        # reveal along the stroke: every pixel takes the path parameter of the nearest point of the polyline
        pts = np.array([[p[0] - b["x"], p[1] - b["y"]] for p in e["pts"]], np.float32)
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]) / seg.sum()
        ts = np.linspace(0, 1, 240); px = np.interp(ts, cum, pts[:, 0]); py = np.interp(ts, cum, pts[:, 1])
        q = 4; gx, gy = xx[::q, ::q], yy[::q, ::q]
        d = (gx[..., None] - px) ** 2 + (gy[..., None] - py) ** 2
        u = cv2.resize(ts[np.argmin(d, axis=2)].astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        n = cv2.resize(rng.random((max(2, h // 90), max(2, w // 90))).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
        u = (yy / h if e.get("dir") == "down" else xx / w) * 0.86 + n * 0.14
    if e["type"] == "panel":                                   # the same density for every panel, whatever the wash gave
        x, y, pw, ph = e["rect"]; cx, cy = int(x - b["x"] + pw * 0.2), int(y - b["y"] + ph * 0.2)
        med = float(np.median(im[cy:cy + int(ph * 0.6), cx:cx + int(pw * 0.6)] @ np.array([0.2126, 0.7152, 0.0722], np.float32)))
        im = im ** float(np.clip(np.log(PANEL) / np.log(min(0.97, med)), 1.0, 3.2))
    if e["layer"] in "PT":                                     # painted on white: recover the alpha of the ink
        a = 1 - im.min(axis=2); a = np.clip(a / max(1e-3, np.percentile(a, 99.5)), 0, 1)
    else:
        a = None
    _EL[e["id"]] = (im, a, u, b)
    return _EL[e["id"]]


def paint(frame, f, sid):
    """frame: float RGB 0..1, in place; f: film frame"""
    for layer in ("M", "T", "P"):
        for e in P["elements"]:
            if e["layer"] != layer or sid not in e["shots"] or not (fr_(e["t0"]) <= f < fr_(e["t1"])): continue
            im, a, u, b = element(e)
            p = 1.0 if e["dur"] <= 0 else ease((f - fr_(e["t0"]) + 1) / (e["dur"] * FPS))
            soft = 0.10 if e["type"] != "stroke" else 0.05
            m = np.ones_like(u) if p >= 1 else smooth((p * (1 + soft) - u) / soft)
            if e.get("fade"): m = m * max(0.0, 1 - (f - fr_(e["t0"])) / (e["fade"] * FPS))
            reg = frame[b["y"]:b["y"] + b["h"], b["x"]:b["x"] + b["w"]]
            if layer == "M":
                reg *= 1 - m[..., None] * (1 - im) * (e.get("opacity", 255) / 255 if e["type"] == "wash" else 1.0)
            else:
                al = (a * m * (e.get("opacity", 255) / 255 if e["type"] == "wash" else 1.0))[..., None]
                if layer == "T":                                   # tint: the wash takes the light and shade of what is under it
                    lum = np.clip((reg @ np.array([0.2126, 0.7152, 0.0722], np.float32)) / 0.70, 0.5, 1.3)[..., None]
                    reg *= 1 - al; reg += al * np.clip(rgb(e["color"]) * lum, 0, 1)
                else:
                    reg *= 1 - al; reg += al * rgb(e["color"])


# ------------------------------------------------------------------ preview type (the film's type is set in Higgsedit)
_F = {}


def font(face, size):
    if (face, size) not in _F:
        f = ImageFont.truetype(str(FONTS / P["faces"][face]["file"]), size)
        if P["faces"][face]["wght"]: f.set_variation_by_axes([P["faces"][face]["wght"]])
        _F[(face, size)] = f
    return _F[(face, size)]


def type_preview(img, f, sid):
    im = Image.fromarray(img); d = ImageDraw.Draw(im)
    for b in P["blocks"]:
        if sid not in b["shots"] or not (fr_(b["t0"]) <= f < fr_(b["t1"])): continue
        for l in b["lines"]:
            if f < fr_(l["t0"]): continue
            ft = font(l["face"], l["size"])
            d.text((l["x"] + 3, l["y"] + 4), l["text"], font=ft, fill=(20, 10, 4))
            d.text((l["x"], l["y"]), l["text"], font=ft, fill=l["color"])
    return np.asarray(im)


def render_frame(s, src, k, text=False):
    f = s["f0"] + k
    fr = camera(src[k], s["cam"], k / max(1, s["frames"] - 1)).astype(np.float32) / 255
    paint(fr, f, s["id"])
    out = (np.clip(fr, 0, 1) * 255 + 0.5).astype(np.uint8)
    return type_preview(out, f, s["id"]) if text else out


def encoder(path, size=None, crf=12, audio=None):
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if audio: cmd += ["-i", str(audio)]
    vf = "scale=out_color_matrix=bt709:out_range=tv" + (f":w={size[0]}:h={size[1]}:flags=area" if size else "")
    cmd += ["-vf", vf, "-c:v", "libx264", "-preset", "medium" if not size else "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
    if audio: cmd += ["-c:a", "aac", "-b:a", "160k", "-shortest"]
    return subprocess.Popen(cmd + [str(path)], stdin=subprocess.PIPE)


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--still" in args:
        (ROOT / "renders/.stills").mkdir(parents=True, exist_ok=True)
        for t in map(float, args[args.index("--still") + 1].split(",")):
            f = min(P["frames"] - 1, int(round(t * FPS)))
            s = next(x for x in P["shots"] if x["f0"] <= f < x["f0"] + x["frames"])
            one = {**s, "in": (s["in"] or 0) + (f - s["f0"]) * s["speed"] / 24, "frames": 1}
            img = Image.fromarray(render_frame({**s, "frames": s["frames"]}, {f - s["f0"]: source_frames(one)[0]}, f - s["f0"], text="--bare" not in args))
            d = ImageDraw.Draw(img); d.rectangle([90, 260, 990, 1660], outline=(0, 255, 255), width=2)
            img.resize((540, 960), Image.LANCZOS).save(ROOT / f"renders/.stills/f-{t:05.2f}.jpg", quality=86)
            print(f"{t:6.2f} s  {s['id']}")
        sys.exit()
    preview = "--preview" in args; only = [a for a in args if not a.startswith("--")]
    (WORK / "shots").mkdir(exist_ok=True)
    enc = encoder(WORK / "preview.mp4", (540, 960), 23, WORK / "narr.wav") if preview else None
    for s in P["shots"]:
        if only and s["id"] not in only: continue
        src = source_frames(s)
        if not preview: enc = encoder(WORK / f"shots/{s['id']}.mp4")
        for k in range(s["frames"]):
            enc.stdin.write(render_frame(s, src, k, text=preview).tobytes())
        if not preview:
            enc.stdin.close(); assert enc.wait() == 0, s["id"]
        print(f"{s['id']} {s['frames']} f", flush=True)
    if preview:
        enc.stdin.close(); assert enc.wait() == 0
