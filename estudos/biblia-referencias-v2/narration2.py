#!/usr/bin/env python3
"""Narration timeline for "A primeira página toca a última" (Bíblia conectada, film 2).

Guide mode (no take yet): estimated word times, silent voice track.
  python3 narration2.py --guide
Take mode: faster-whisper large-v3-turbo hears the take, script words are matched (difflib), each line is cut at the
quietest point between lines, optionally sped up (atempo keeps pitch) and placed with designed gaps.
  python3 narration2.py source/narr/<take>.wav [--tempo 1.05]
Writes renders/.film/narr.wav (48 kHz mono) and renders/.film/narr.json (Ep. 1 format: duration, lines, words).
"""
import difflib
import json
import re
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
SR = 48000
# (text, gap after) — the subtitles show these texts; the digits are what the voice reads
LINES = [
    ("No meio do jardim, a árvore da vida.", 0.55),
    ("Isso é a primeira página da Bíblia.", 0.30),
    ("E isso... é a última.", 0.55),
    ("A primeira página toca a última.", 0.70),
    ("Entre Gênesis e Apocalipse, 191 ligações.", 0.55),
    ("E a Bíblia inteira tem 344.799.", 0.60),
    ("Cada fio aqui é uma referência real.", 0.60),
    ("Agora olha o ponto mais brilhante.", 0.55),
    ("De todos os versículos, o mais conectado da Bíblia inteira é esse: Isaías 9:6.", 0.50),
    ("“Porque um menino nos nasceu, um filho nos foi dado.”", 0.65),
    ("212 versículos apontam pra ele.", 0.50),
    ("O centro de tudo isso é o nascimento de uma criança.", 0.80),
    ("Comenta um versículo. Eu te mostro com quem ele conversa.", 1.40),
]
# what the voice says, word by word (numbers spelled out), aligned to the display text by the SPOKEN list below
SPOKEN = [
    "No meio do jardim, a árvore da vida.",
    "Isso é a primeira página da Bíblia.",
    "E isso é a última.",
    "A primeira página toca a última.",
    "Entre Gênesis e Apocalipse, cento e noventa e uma ligações.",
    "E a Bíblia inteira tem trezentas e quarenta e quatro mil, setecentas e noventa e nove.",
    "Cada fio aqui é uma referência real.",
    "Agora olha o ponto mais brilhante.",
    "De todos os versículos, o mais conectado da Bíblia inteira é esse: Isaías, nove, seis.",
    "Porque um menino nos nasceu, um filho nos foi dado.",
    "Duzentos e doze versículos apontam pra ele.",
    "O centro de tudo isso é o nascimento de uma criança.",
    "Comenta um versículo. Eu te mostro com quem ele conversa.",
]
# display token -> how many spoken words it covers (only where they differ; default 1)
SPAN = {"191": 5, "344.799.": 11, "9:6.": 2, "212": 3}
HEAD = 0.12


def norm(s):
    s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def decode(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def display_words(li, spoken_times):
    """fold spoken word times onto the display tokens of line li"""
    toks = LINES[li][0].split(); out = []; k = 0
    for tok in toks:
        n = SPAN.get(tok, 1)
        seg = spoken_times[k:k + n]; k += n
        out.append({"w": tok, "t0": seg[0][0], "t1": seg[-1][1]})
    assert k == len(spoken_times), (li, k, len(spoken_times))
    return out


def write(lines, voice, total):
    with wave.open(str(WORK / "narr.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(voice[:int(SR * total)], -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "lines": lines}, open(WORK / "narr.json", "w"), ensure_ascii=False, indent=1)
    for L in lines:
        print(f"L{L['i']:02d} {L['t0']:6.2f}-{L['t1']:6.2f}  {L['text']}")
    print("film duration:", round(total, 2))


def guide():
    t, lines = HEAD, []
    for li, (text, gap) in enumerate(LINES):
        at = t; st = []
        for w in SPOKEN[li].split():
            d = max(0.14, len(norm(w)) * 0.046 + 0.08)
            st.append((round(t, 3), round(t + d, 3))); t += d
            if w[-1] in ",:": t += 0.12
            if w[-1] in ".!?" and w is not SPOKEN[li].split()[-1]: t += 0.3
        lines.append({"i": li, "t0": round(at, 3), "t1": round(t, 3), "text": text, "tempo": 1.0, "guide": True, "words": display_words(li, st)})
        t += gap
    write(lines, np.zeros(int(SR * (t + 1)), np.float32), round(t, 3))


def take(path, tempo):
    from faster_whisper import WhisperModel
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(decode(path, 16000), language="pt", word_timestamps=True, beam_size=5, vad_filter=False,
                               initial_prompt=" ".join(SPOKEN))
    heard = [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3)} for s in segs for w in s.words]
    json.dump(heard, open(ROOT / "source/narr/words.json", "w"), ensure_ascii=False, indent=1)
    script = [(li, w) for li, line in enumerate(SPOKEN) for w in line.split()]
    a, b = [norm(w) for _, w in script], [norm(h["w"]) for h in heard]
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False); match = [None] * len(script)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): match[blk.a + k] = blk.b + k
    times = [(heard[m]["t0"], heard[m]["t1"]) if m is not None else None for m in match]
    for i, tv in enumerate(times):
        if tv is None:
            prev = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
            nxt = next((times[j][0] for j in range(i + 1, len(times)) if times[j]), prev + 0.3)
            times[i] = (round(prev + (nxt - prev) * 0.3, 3), round(prev + (nxt - prev) * 0.8, 3))
    unmatched = [script[i][1] for i in range(len(script)) if match[i] is None]
    audio = decode(path); hop = int(0.01 * SR)
    rms = np.sqrt(np.convolve(audio ** 2, np.ones(hop) / hop, mode="same")); db = 20 * np.log10(rms + 1e-9)
    groups = [[i for i, (li, _) in enumerate(script) if li == n] for n in range(len(LINES))]
    quiet = lambda x, y: (int(x * SR) + int(np.argmin(rms[int(x * SR):int(y * SR)]))) / SR if y > x + 0.02 else x
    cuts = [0.0] + [quiet(times[g[-1]][1] - 0.1, times[h[0]][0] + 0.12) for g, h in zip(groups[:-1], groups[1:])] + [len(audio) / SR]
    thr = np.percentile(db, 95) - 20
    out = np.zeros(int(SR * 90), np.float32); lines, t = [], HEAD
    for n, (g, x, y) in enumerate(zip(groups, cuts[:-1], cuts[1:])):
        seg_db = db[int(x * SR):int(y * SR)]; loud = np.nonzero(seg_db > thr)[0]
        s0 = x + max(0, loud[0] - int(0.05 * SR)) / SR; s1 = x + min(len(seg_db), loud[-1] + int(0.12 * SR)) / SR
        seg = audio[int(s0 * SR):int(s1 * SR)]
        if abs(tempo - 1) > 1e-6:
            p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-af", f"atempo={tempo}", "-f", "f32le", "-"],
                               input=seg.astype(np.float32).tobytes(), capture_output=True, check=True)
            seg = np.frombuffer(p.stdout, np.float32).copy()
        fade = int(0.008 * SR); seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        out[int(t * SR):int(t * SR) + len(seg)] += seg
        st = [(round(t + max(0.0, times[i][0] - s0) / tempo, 3), round(t + max(0.0, times[i][1] - s0) / tempo, 3)) for i in g]
        lines.append({"i": n, "t0": round(t, 3), "t1": round(t + len(seg) / SR, 3), "text": LINES[n][0], "tempo": tempo, "src": [round(s0, 3), round(s1, 3)], "words": display_words(n, st)})
        t += len(seg) / SR + LINES[n][1]
    print("heard", len(heard), "words; unmatched:", unmatched)
    write(lines, out, round(t, 3))


if __name__ == "__main__":
    if "--guide" in sys.argv: guide()
    else:
        tempo = float(sys.argv[sys.argv.index("--tempo") + 1]) if "--tempo" in sys.argv else 1.0
        take(ROOT / sys.argv[1], tempo)
