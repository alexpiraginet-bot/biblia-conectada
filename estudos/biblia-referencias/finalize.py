#!/usr/bin/env python3
"""Audio to -14 LUFS / true peak <= -1 dBTP (measured on the decoded AAC), video to <= 29 MB (two-pass), mux.
  python3 finalize.py   (after film.py and score.py)
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
VID, MIX = WORK / "video.mp4", WORK / "mix.wav"
OUT = ROOT / "renders/biblia-conectada.mp4"
MAX_MB = 29.0


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-2500:])
    return r


def r128(p):
    e = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-vn", "-filter_complex", "ebur128=peak=true", "-f", "null", "-"]).stderr
    s = e[e.rfind("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", s).group(1))


def dur(p):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)]).stdout)


vdur = dur(VID)
i_in, tp_in = r128(MIX)
gain, ceiling, tries = -14.0 - i_in, -2.0, []
aac = WORK / "a.m4a"
for _ in range(5):
    chain = (f"atrim=0:{vdur:.3f},lowpass=f=18000:p=2,aresample=192000,volume={gain:.2f}dB,"
             f"alimiter=limit={10 ** (ceiling / 20):.4f}:attack=1.5:release=80:level=false:latency=true,aresample=48000")
    run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-i", str(MIX), "-af", chain, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-ac", "2", str(aac)])
    i_o, tp_o = r128(aac); tries.append((round(i_o, 1), round(tp_o, 1), ceiling, round(gain, 2)))
    if tp_o <= -1.0 and abs(i_o + 14.0) <= 0.3: break
    if tp_o > -1.0: ceiling = round(ceiling - (tp_o + 1.0) - 0.3, 1)
    if abs(i_o + 14.0) > 0.3: gain += (-14.0 - i_o)

size_mb = VID.stat().st_size / 1e6
vin = VID
if size_mb > MAX_MB - 1.2:
    kbps = int((MAX_MB * 8 * 1000 * 0.965) / vdur - 200)
    enc = ["-c:v", "libx264", "-preset", "slow", "-tune", "film", "-pix_fmt", "yuv420p", "-profile:v", "high", "-b:v", f"{kbps}k",
           "-maxrate", f"{int(kbps * 1.6)}k", "-bufsize", f"{kbps * 2}k", "-colorspace", "bt709", "-color_primaries", "bt709",
           "-color_trc", "bt709", "-color_range", "tv"]
    log = str(WORK / "x264")
    run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-i", str(VID), *enc, "-pass", "1", "-passlogfile", log, "-an", "-f", "null", "-"])
    vin = WORK / "video2.mp4"
    run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-i", str(VID), *enc, "-pass", "2", "-passlogfile", log, "-an", str(vin)])
    print(f"two-pass {kbps} kbps (crf file was {size_mb:.1f} MB)")
run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-i", str(vin), "-i", str(aac), "-map", "0:v:0", "-map", "1:a:0", "-c", "copy",
     "-movflags", "+faststart", "-shortest", str(OUT)])
nb = int(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames",
              "-of", "default=nw=1:nk=1", str(OUT)]).stdout)
print(json.dumps({"out": str(OUT.relative_to(ROOT)), "frames": nb, "dur": round(dur(OUT), 3), "mb": round(OUT.stat().st_size / 1e6, 2),
                  "audio_in": [i_in, tp_in], "audio_tries": tries}))
