#!/usr/bin/env python3
"""Score + sound design for "Não foi um grito. Foi uma citação." (video 7), with the instruments of video 1 (sound.py).

Almost no music: a sub drone and a heartbeat that slows down, one pair at a time, under the four pairs; a soft riser as
the psalm scrolls; total silence after "ele assim fez"; then ONE chord in D major on "Está consumado", held to the end
with a few bells. Ducked under the voice as in the other films.

  python3 score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import json, re, unicodedata
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

from sound import SR, rng, hz, place, chord, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb, read_mono

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
NJ = json.load(open(WORK / "narr.json"))
TAIL = 3.0                                       # same tail as tools/motion_data.py
DUR = NJ["duration"] + TAIL
N = int(SR * (DUR + 0.5))
LN = {L["i"]: L for L in NJ["lines"]}
T = {i: L["t0"] for i, L in LN.items()}
LE = lambda i: LN[i]["t1"]


def nrm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))


def W(i, word, nth=0):
    hits = [w for w in LN[i]["words"] if nrm(w["w"]).startswith(nrm(word))]
    return (hits[nth] if len(hits) > nth else hits[0] if hits else {"t0": T[i]})["t0"]


def heartbeat(sfx, t0, t1, p0=0.95, p1=1.45, amp=0.14):
    """lub-dub, the period growing from p0 to p1 between t0 and t1 (same curve as Main.tsx heartbeat())"""
    t = t0
    while t < t1:
        k = (t - t0) / max(0.1, t1 - t0)
        place(sfx, sub_hit(amp, 0.7), t); place(sfx, sub_hit(amp * 0.6, 0.6), t + 0.22)
        t += p0 + (p1 - p0) * k


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    tCit, tFez, tCons = W(2, "citacao"), W(10, "fez"), T[11]
    # ---- the sentence in the dark: a sub drone, the first heartbeat
    chord(mus, ["D1", "D2"], 0.0, T[10] - 0.1, 0.34, a=1.5, r=0.6, bright=0.55)
    heartbeat(sfx, 0.3, T[10] - 0.4)
    # ---- "Foi uma citação.": one low hit, a thin shimmer
    place(sfx, sub_hit(0.30, 1.4), tCit - 0.04)
    place(mus, shimmer(2.0, 880, 1760, 0.025), tCit + 0.05, 0.0)
    # ---- the columns: a quiet minor pad enters under "mil anos antes"
    chord(mus, ["D2", "A2", "F3"], W(3, "mil") - 0.1, T[9] - W(3, "mil") + 0.3, 0.22, a=1.2, r=0.8, bright=0.7)
    place(mus, bell(hz("D5"), 0.035, 3.0), W(3, "salmo") + 0.02, -0.2)
    # ---- the four pairs: a tick when each thread lands (Main.tsx: thread drawn t0+0.5 .. t0+1.2)
    for li in (5, 6, 7, 8):
        place(sfx, tick(0.05, 1900), T[li] + 1.2, 0.0)
        place(mus, bell(hz(["A4", "D5", "F5", "A5"][li - 5]), 0.028, 2.6), T[li] + 1.22, -0.3 + 0.2 * (li - 5))
    # ---- the psalm scrolls: a riser to the last line, then silence
    place(sfx, riser(max(0.8, tFez - T[9] - 0.3), 0.10), T[9] + 0.3)
    place(sfx, whoosh(1.2, 0.10, False), T[9] + 0.2, 0.0)
    place(mus, bell(hz("A5"), 0.04, 3.4), tFez + 0.03, 0.0)
    # ---- "Está consumado.": ONE chord, D major, held to the end
    chord(mus, ["D1", "A1", "D2", "A2", "D3", "F#3", "A3", "D4"], tCons - 0.12, DUR - tCons + 0.8, 0.46, a=0.5, r=3.0, bright=1.05)
    place(sfx, sub_hit(0.70, 2.2), tCons - 0.10)
    place(mus, shimmer(3.6, 880, 1760, 0.04), tCons + 0.3, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.05, 4.0), LE(11) + 0.1 + 0.22 * r_, -0.5 + 0.33 * r_)
    place(mus, bell(hz("A5"), 0.04, 3.6), W(12, "tudo") + 0.03, 0.2)
    place(mus, bell(hz("D6"), 0.05, 4.5), LE(13) + 0.1, -0.2)
    mus, sfx = reverb(mus, 4.2, 0.45), reverb(sfx, 1.8, 0.18)
    gate = np.ones(N, np.float32)                     # silence from "ele assim fez" to "Está consumado"
    g0, g1, g2 = int((tFez + 0.5) * SR), int((tFez + 0.9) * SR), int((tCons - 0.15) * SR)
    gate[g0:g1] = np.linspace(1, 0, g1 - g0); gate[g1:g2] = 0.0
    mus *= gate[None, :]; sfx *= gate[None, :]
    b_, a_ = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b_, a_, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.20, 0.30


def mixdown():
    mus, sfx = build()
    voice = read_mono(WORK / "narr.wav"); v = np.zeros(N, np.float32); v[:len(voice)] = voice[:N]
    env = np.sqrt(signal.lfilter([1 - 0.995], [1, -0.995], v ** 2))
    thr = 0.02; d = np.clip(env / thr, 0, 1)
    duck = np.empty_like(d); g = 0.0
    a_dn = np.exp(-1 / (0.35 * SR)); a_up = np.exp(-1 / (0.03 * SR))
    for blk in range(0, N, 480):
        target = float(d[blk:blk + 480].max())
        g = target if target > g else g * a_dn ** 480 + target * (1 - a_dn ** 480)
        duck[blk:blk + 480] = g
    duck = signal.lfilter([1 - a_up], [1, -a_up], duck)
    mgain = (1 - 0.86 * duck).astype(np.float32)
    music = (mus * MUS_GAIN + sfx * SFX_GAIN) * mgain[None, :]
    out = music + np.stack([v, v])
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", round(DUR, 2))
