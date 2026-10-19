#!/usr/bin/env python3
"""Original score + sound design for "Os versículos de vocês", synthesized here with the instruments of video 1 (sound.py).

Same world as "A Bíblia, conectada": a breathing organ in D minor that resolves to D MAJOR when all the requested verses
light up together ("Juntos..."). The roll call walks a i-VI-III-VII loop, one chord per verse, a bell on every cut whose
melody climbs slowly; a heartbeat sub joins halfway, a riser carries the last verses into the resolution. Ducked under
the narration as in video 1.

  python3 score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import json
import numpy as np
from scipy import signal
import soundfile as sf

import film as F
from sound import SR, rng, hz, organ, place, chord, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb, read_mono

WORK = F.WORK
DUR = F.DUR
N = int(SR * (DUR + 0.5))
TI, TJ, T, NI = F.TI, F.TJ, F.T, F.NI

PROG = ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C", "Gm", "Bb", "A"]
VOICING = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
           "C": ["C2", "G2", "C3", "E3", "G3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"]}
MELODY = ["F5", "F5", "A5", "G5", "A5", "Bb5", "C6", "G5", "F5", "D5", "F5", "E5", "D5", "F5", "A5", "C6", "Bb5", "D6", "C#6"]
assert len(PROG) == len(MELODY) == NI


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    t0 = TI[0]
    # hook: the organ is breathing at frame 0; a soft impact with the dome; the 19 points ring as a fast arpeggio
    chord(mus, ["D1", "D2", "A2"], 0.0, t0 + 0.6, 0.55, a=0.25, r=0.8, bright=0.8)
    place(sfx, sub_hit(0.40, 1.3), 0.02)
    place(sfx, braam(0.10, 2.4), 0.02)
    place(mus, shimmer(2.0, 1175, 2350, 0.05), 0.05, 0.3)
    arp = ["D5", "F5", "A5", "C6", "D6", "F6", "A5", "C6", "D6", "F6", "A6", "C6", "D6", "F6", "A6", "C7", "D6", "A6", "D7"]
    for k, nn in enumerate(arp[:NI]):
        place(mus, bell(hz(nn), 0.030, 1.6), F.POP[k], -0.7 + 1.4 * k / (NI - 1))
    chord(mus, VOICING["Dm"] + ["D4"], F.T["l2"] - 0.2, t0 - F.T["l2"] + 0.8, 0.40, a=0.9, r=0.6, bright=0.85)
    place(sfx, whoosh(0.9, 0.40, True), t0 - 0.85)
    # roll call: one chord per verse, a bell on every cut, a heartbeat from the 7th verse, riser into "Juntos"
    for k in range(NI):
        a, b = TI[k], (TI[k + 1] if k + 1 < NI else TJ)
        chord(mus, VOICING[PROG[k]], a - 0.05, b - a + 0.5, 0.36 + 0.10 * k / NI, a=0.12, r=0.45, bright=0.8 + 0.25 * k / NI)
        amp = 0.05 if k != F.K_MOST else 0.08    # the reference is spoken right after the cut: keep the bell under it
        place(mus, bell(hz(MELODY[k]), amp, 2.6), a + 0.02, -0.45 + 0.9 * (k % 2))
        place(sfx, tick(0.10, 1800 + 60 * k), a, 0.0)
        if k >= 6: place(sfx, sub_hit(0.12 + 0.08 * (k - 6) / (NI - 6), 0.9), a - 0.04)
        if k > 0 and abs(F.IT[k]["x"] - F.IT[k - 1]["x"]) > 0.05:
            place(sfx, whoosh(0.35, 0.16, True), a - 0.05, 0.0)
        if k == F.K_MOST:           # the most connected: a wider bloom
            place(sfx, braam(0.20, 2.2), a)
            place(mus, shimmer(1.6, 880, 1760, 0.05), a + 0.1, 0.0)
        if k in F.K_TWICE:          # asked twice: the bell answers itself
            place(mus, bell(hz(MELODY[k]), 0.06, 2.4), a + 0.30, 0.45)
    rd = TJ - TI[NI - 3]
    place(sfx, riser(rd + 0.1, 0.26), TI[NI - 3])
    # "Juntos": counter ticks accelerate, BRAAM + D MAJOR when it lands on 1.024 ("mais de mil")
    ts, dt = TJ + 0.35, 0.12
    while ts < T["mil"]:
        place(sfx, tick(0.12, 2600 + rng.integers(-300, 300)), ts, rng.uniform(-0.6, 0.6)); ts += dt; dt = max(0.02, dt * 0.92)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], TJ - 0.3, T["mil"] - TJ + 0.4, 0.42, a=min(1.2, (T["mil"] - TJ) * 0.6), r=0.1, bright=1.0)
    place(sfx, braam(0.75), T["mil"] - 0.01); place(sfx, sub_hit(0.95), T["mil"] - 0.01)
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], T["mil"] - 0.02, T["l23"] - T["mil"] + 1.2, 0.66, a=0.03, r=1.4, bright=1.15)
    for b in range(66):             # the books lighting up, Genesis -> Revelation
        if F.BOOKS_ON[b]:
            place(sfx, tick(0.035, 3200 + 20 * b), T["livros"] + 0.9 * b / 66, -0.8 + 1.6 * b / 65)
    # three of you, already linked: one bell per person, the arcs shimmer
    chord(mus, ["D2", "A2", "D3", "F#3", "A3"], T["l23"], T["l24"] - T["l23"] + 0.8, 0.40, a=0.6, r=0.8, bright=0.9)
    place(mus, shimmer(1.8, 660, 1320, 0.05), T["l23"] + 0.45, 0.0)
    for r, nn in enumerate(["F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.08, 3.2), T["l23"] + 0.45 + 0.3 * r, -0.5 + 0.5 * r)
    # the call: the whole Bible again, D major breathing to the end
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], T["l24"] - 0.05, DUR - T["l24"] + 0.6, 0.58, a=0.5, r=2.2, bright=1.1)
    place(sfx, sub_hit(0.45, 1.2), T["l24"])
    place(mus, bell(hz("D5"), 0.08, 4.0), T["l24"] + 0.05, 0.0)
    place(mus, bell(hz("A5"), 0.06, 4.0), T["l25"], 0.25)
    mus, sfx = reverb(mus, 3.8, 0.42), reverb(sfx, 1.6, 0.18)
    # phone-friendly bus EQ (as video 1): no rumble below 32 Hz, a pocket at 2.5 kHz for the voice
    b_, a_ = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b_, a_, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.20, 0.32


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
    mgain = (1 - 0.82 * duck).astype(np.float32)   # deeper than video 1 (0.72): a list of names needs every syllable
    music = (mus * MUS_GAIN + sfx * SFX_GAIN) * mgain[None, :]
    out = music + np.stack([v, v])
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", DUR)
