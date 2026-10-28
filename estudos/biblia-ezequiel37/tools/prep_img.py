#!/usr/bin/env python3
"""source/img/*.png (generated, see source/img/ez37_assets.json) -> motion/public/img: backgrounds as 1080x1920 JPEG
(cover crop: scaled to 1920 high, centre 1080 kept), characters trimmed to their alpha bounding box (PNG). Prints the
boxes so the composition can place things in frame pixels.

  python3 -I tools/prep_img.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, DST = ROOT / "source/img", ROOT / "motion/public/img"
DST.mkdir(parents=True, exist_ok=True)
BG = ["bg-vale", "bg-eden", "sala-jo20", "bg-templo", "bg-rio", "bg-rio-vida"]
CH = ["ezequiel", "ezequiel-profetiza", "ezequiel-frente", "povo", "adao"]
info = {}
for n in BG:
    im = Image.open(SRC / f"{n}.png").convert("RGB")
    k = 1920 / im.height; w = round(im.width * k)
    im = im.resize((w, 1920), Image.LANCZOS)
    x0 = (w - 1080) // 2
    im.crop((x0, 0, x0 + 1080, 1920)).save(DST / f"{n}.jpg", quality=92, optimize=True)
    info[n] = {"w": 1080, "h": 1920}
for n in CH:
    im = Image.open(SRC / f"{n}.png").convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v > 8 else 0)
    box = a.getbbox(); pad = 6
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    c = im.crop(box); c.save(DST / f"{n}.png", optimize=True)
    info[n] = {"w": c.width, "h": c.height}
json.dump(info, open(ROOT / "data/img.json", "w"), indent=1)
print(json.dumps(info))
