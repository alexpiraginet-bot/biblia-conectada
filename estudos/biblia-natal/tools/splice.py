#!/usr/bin/env python3
"""Replace frame ranges of the intermediate video with re-rendered parts (renders/.film/part-<f0>-<f1>.mp4).
  python3 tools/splice.py  -> renders/.film/video.mp4 (previous kept as video_prev.mp4 until checked)"""
import re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "renders/.film"
src = WORK / "video.mp4"
n_src = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                            "stream=nb_read_frames", "-of", "default=nw=1:nk=1", str(src)], capture_output=True, text=True).stdout)
parts = sorted((int(m.group(1)), int(m.group(2)), p) for p in WORK.glob("part-*.mp4")
               if (m := re.fullmatch(r"part-(\d+)-(\d+)\.mp4", p.name)))
for (a0, a1, _), (b0, b1, _) in zip(parts, parts[1:]):
    assert a1 <= b0, f"overlapping parts {a0}-{a1} / {b0}-{b1}"
inputs = ["-i", str(src)]
chains, labels, cur = [], [], 0
for k, (f0, f1, p) in enumerate(parts, start=1):
    n_p = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                              "stream=nb_read_frames", "-of", "default=nw=1:nk=1", str(p)], capture_output=True, text=True).stdout)
    assert n_p == f1 - f0, f"{p.name}: {n_p} frames, expected {f1 - f0}"
    inputs += ["-i", str(p)]
    if f0 > cur:
        chains.append(f"[0:v]trim=start_frame={cur}:end_frame={f0},setpts=PTS-STARTPTS[s{k}]"); labels.append(f"[s{k}]")
    chains.append(f"[{k}:v]setpts=PTS-STARTPTS[p{k}]"); labels.append(f"[p{k}]")
    cur = f1
if cur < n_src:
    chains.append(f"[0:v]trim=start_frame={cur},setpts=PTS-STARTPTS[tail]"); labels.append("[tail]")
graph = ";".join(chains) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=1:a=0,fps=24[v]"
out = WORK / "video_spliced.mp4"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "medium",
                "-crf", "14", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                str(out)], check=True)


def luma(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-vf", "scale=108:192", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 192, 108).astype(np.float32)


a, b = luma(src), luma(out)
assert len(a) == len(b) == n_src, (len(a), len(b), n_src)
d = np.abs(a - b).mean((1, 2))
inside = np.zeros(n_src, bool)
for f0, f1, _ in parts: inside[f0:f1] = True
print("frames", n_src, "| parts", [(f0, f1) for f0, f1, _ in parts])
print("max diff outside the parts:", round(float(d[~inside].max()), 2), "| frames changed inside:", int((d[inside] > 2).sum()))
src.rename(WORK / "video_prev.mp4"); out.rename(src)
print("ok -> video.mp4")
