#!/usr/bin/env python3
"""Contact sheets from the FINAL mp4 (what Instagram gets): one frame per beat of the story.
  python3 tools/sheets.py -> renders/.film/sheet-*.jpg"""
import subprocess, sys
from pathlib import Path
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import film as F  # noqa: E402

MP4 = ROOT / "renders/antes-de-joao-316.mp4"
T = F.T
times = [("hook f0", 0.0), ("hook", 1.2), ("ligacao", T["l2"] + 1.2), ("3:16", T["l3"] + 1.4), ("volta", T["r14"] + 0.5),
         ("3:14", F.LS(5) + 1.0), ("arco", (T["arc0"] + T["arc1"]) / 2), ("862", T["arc1"] + 0.3),
         ("numeros 21", T["num"] + 0.9), ("serpentes", T["l8"] + 1.5), ("bronze", T["haste"] + 0.3), ("vivia", T["vivia"] + 0.4),
         ("escuta", T["l11"] + 0.7), ("3:14 citacao", T["levantado"] + 0.5), ("cruz", T["cruz"] + 0.5), ("la", T["l14"] + 1.0),
         ("aqui", T["l15"] + 1.6), ("3:15>3:16", T["f16"] + 0.4), ("3:16 citacao", T["filho"] + 0.8), ("pergunta", T["l18"] + 1.2),
         ("comenta", T["nao"] + 0.5), ("fim", F.DUR - 0.05)]


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
