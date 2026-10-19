#!/usr/bin/env python3
"""Contact sheets from the FINAL mp4 (what Instagram gets): one frame per requested verse, read at TI[k] + 1.25 s, plus
the hook, "Juntos", the three linked people and the call.  python3 tools/sheets.py -> renders/.film/sheet-*.jpg"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import film as F  # noqa: E402

MP4 = ROOT / "renders/versiculos-de-voces.mp4"
times = [("hook", 0.8), ("pontos", F.T["pop"] + 1.4)] + [(f"{k + 1:02d}", F.TI[k] + 1.25) for k in range(F.NI)] + \
        [("juntos", F.T["livros"] + 1.0), ("3 de voces", F.T["l24"] - 0.25), ("cta", F.DUR - 0.6)]


def grab(t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(MP4), "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3).copy()


tiles = []
for name, t in times:
    im = cv2.resize(grab(t), (360, 640), interpolation=cv2.INTER_AREA)
    cv2.putText(im, f"{name} {t:.1f}s", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    tiles.append(im)
per = 8
for s in range(0, len(tiles), per):
    chunk = tiles[s:s + per]
    chunk += [np.zeros_like(tiles[0])] * (per - len(chunk))
    sheet = np.vstack([np.hstack(chunk[:4]), np.hstack(chunk[4:])])
    out = ROOT / f"renders/.film/sheet-{s // per + 1}.jpg"
    cv2.imwrite(str(out), sheet, [cv2.IMWRITE_JPEG_QUALITY, 88]); print(out)
