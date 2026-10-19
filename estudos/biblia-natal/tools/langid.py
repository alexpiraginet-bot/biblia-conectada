#!/usr/bin/env python3
"""Language probabilities (Whisper) per audio file or per narration line — a proxy for accent drift.
  python3 tools/langid.py a.wav [b.wav ...]      (16 kHz mono PCM16 or any rate: resampled with numpy)"""
import sys, wave
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("mobiuslabsgmbh/faster-whisper-large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=2)


def load(p):
    import soundfile as sf
    x, sr = sf.read(p, dtype="float32")
    if x.ndim > 1: x = x.mean(1)
    if sr != 16000:
        n = int(len(x) * 16000 / sr); x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    return x


for p in sys.argv[1:]:
    x = load(p)
    lang, prob, allp = m.detect_language(x)
    top = sorted(allp, key=lambda kv: -kv[1])[:4]
    segs, _ = m.transcribe(x, beam_size=3)
    txt = " ".join(s.text.strip() for s in segs)
    print(f"{p.split('/')[-1]}: {lang} {prob:.3f} | " + ", ".join(f"{l} {q:.3f}" for l, q in top) + f" | {txt[:120]}")
