#!/usr/bin/env python3
"""Voice vs music (K-weighting approximation, 400 ms RMS): margin during speech, level per 4 s.
  python3 tools/levels.py renders/.film/narr.wav renders/.film/score.wav"""
import sys, wave
import numpy as np, soundfile as sf
from scipy import signal
SR = 48000
with wave.open(sys.argv[1]) as w: v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
m, _ = sf.read(sys.argv[2]); m = m.mean(1)
n = min(len(m), len(v)); m = m[:n]; v = v[:n]


def kw(x):
    b, a = signal.butter(2, 38 / (SR / 2), "high"); x = signal.lfilter(b, a, x)
    b, a = signal.butter(1, 1500 / (SR / 2), "high"); return x + 0.58 * signal.lfilter(b, a, x)


win = int(0.4 * SR)


def rms_db(x):
    c = np.cumsum(np.r_[0, x ** 2]); r = (c[win:] - c[:-win]) / win
    r = np.r_[np.full(win // 2, r[0]), r, np.full(len(x) - len(r) - win // 2, r[-1])]
    return 10 * np.log10(r + 1e-12)


md, vd = rms_db(kw(m)), rms_db(kw(v))
sp = vd > -35
d = vd[sp] - md[sp]
print("speech %", round(sp.mean() * 100, 1), "| margin voice-music in speech: median", round(np.median(d), 1), "dB, p10",
      round(np.percentile(d, 10), 1))
print("music median dB: in speech", round(np.median(md[sp]), 1), "| in gaps", round(np.median(md[~sp]), 1))
for t in range(0, int(n / SR), 4):
    a, b = int(t * SR), int((t + 4) * SR)
    print(f"{t:2d}s music {np.median(md[a:b]):6.1f} max {md[a:b].max():6.1f} | voice {np.median(vd[a:b]):6.1f}")
