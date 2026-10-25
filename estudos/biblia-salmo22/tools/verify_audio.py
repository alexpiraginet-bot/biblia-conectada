#!/usr/bin/env python3
"""End-to-end check of the FINAL mp4's audio: Whisper transcribes it (forced pt) and the transcript must contain the whole
script, in order; also prints the language-ID probability of the first 6 s (the part of video 1 the accent complaint was about).
  python3 -I tools/verify_audio.py"""
import subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "tools"))
from script import LINES  # noqa: E402
import json  # noqa: E402
from takes import norm  # noqa: E402

import os
CUT = os.environ.get("CUT", ""); SUFFIX = "-curto" if CUT == "curto" else ""
SHORT = []
USE = SHORT if CUT == "curto" else list(range(1, len(LINES)))
MP4 = ROOT / f"renders/nao-foi-um-grito{SUFFIX}.mp4"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(MP4), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
from faster_whisper import WhisperModel  # noqa: E402
m = WhisperModel("mobiuslabsgmbh/faster-whisper-large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=2)
lang, prob, allp = m.detect_language(x[:16000 * 6])
segs, _ = m.transcribe(x, language="pt", beam_size=2, condition_on_previous_text=False)
heard = " ".join(s.text.strip() for s in segs)
want = norm(" ".join(LINES[i] for i in USE))
got = norm(heard)
sm = SequenceMatcher(a=want, b=got, autojunk=False)
print(f"first 6 s language: {lang} {prob:.3f} | top: " + ", ".join(f"{l} {p:.3f}" for l, p in sorted(allp, key=lambda kv: -kv[1])[:3]))
print(f"script words: {len(want)} | heard words: {len(got)} | in-order match ratio: {sm.ratio():.3f}")
for tag, a0, a1, b0, b1 in sm.get_opcodes():
    if tag != "equal":
        print(f"  {tag}: script '{' '.join(want[a0:a1])}' -> heard '{' '.join(got[b0:b1])}'")
print("HEARD:", heard)

# Long-form Whisper can skip a whole window under music; check every line on its own slot of the final mix too
NARR = json.load(open(ROOT / f"renders/.film/narr{SUFFIX}.json"))
bad = 0
for L in NARR["lines"]:
    a, b = int(max(0, L["t0"] - 0.10) * 16000), int((L["t1"] + 0.20) * 16000)
    s2, _ = m.transcribe(x[a:b], language="pt", beam_size=2, condition_on_previous_text=False)
    h = " ".join(t.text.strip() for t in s2)
    sim = SequenceMatcher(a=norm(LINES[L["i"]]), b=norm(h), autojunk=False).ratio()
    bad += sim < 0.9
    print(f"L{L['i']:02d} {L['t0']:6.2f} sim={sim:.2f} | {h}")
print("PER-LINE:", "ALL >= 0.90" if not bad else f"{bad} line(s) below 0.90")
