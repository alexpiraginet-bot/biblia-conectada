#!/usr/bin/env python3
"""Word timestamps of the narration (faster-whisper large-v3-turbo, CPU int8).
  python3 tools/words.py IN16k.wav OUT.json"""
import json, sys, wave
import numpy as np
from faster_whisper import WhisperModel
m = WhisperModel("mobiuslabsgmbh/faster-whisper-large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=2)
with wave.open(sys.argv[1]) as w:  # 16 kHz mono PCM16 (PyAV here rejects faster-whisper's own decoder call)
    assert w.getframerate() == 16000 and w.getnchannels() == 1
    audio = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
segs, info = m.transcribe(audio, language="pt", word_timestamps=True, beam_size=5, vad_filter=False,
                          initial_prompt="Belém, Nazaré, Isaías, Oseias, Herodes, Jerusalém, Egito.")
words = []
for s in segs:
    for w in s.words:
        words.append({"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3), "p": round(w.probability, 3)})
json.dump(words, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
print(len(words), "words")
print(" ".join(f"{i}:{w['w']}" for i, w in enumerate(words)))
