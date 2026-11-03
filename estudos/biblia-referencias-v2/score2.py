#!/usr/bin/env python3
"""Score and sound design for "A primeira página toca a última": the Ep. 1 synthesised organ (D minor), bells, ticks,
risers and the braam, on this film's keys (renders/.film/keys.json from film2.py). Resolves to D major on the quote.
  python3 score2.py -> renders/.film/mix.wav (voice + music, float), score.wav
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import score as S  # noqa: E402  (the Ep. 1 instruments; its own build() is not used)

WORK = ROOT / "renders/.film"
K = json.load(open(WORK / "keys.json"))
NARR = json.load(open(WORK / "narr.json"))
SR = S.SR; DUR = NARR["duration"]; N = int(SR * (DUR + 0.5))
S.N = N; S.DUR = DUR
rng = np.random.default_rng(31)
hz, chord, place, organ, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb = \
    S.hz, S.chord, S.place, S.organ, S.sub_hit, S.braam, S.riser, S.whoosh, S.bell, S.tick, S.shimmer, S.reverb


def build():
    mus = np.zeros((2, N), np.float32); sfx = np.zeros((2, N), np.float32)
    # S0 · frame 0: the hit and the full minor chord at once (the dome is already lit), bells on the thread's feet
    place(sfx, sub_hit(0.9), 0.0); place(sfx, braam(0.3, 2.4), 0.0)
    chord(mus, ["D2", "A2", "D3", "F3", "A3", "D4", "F4"], 0.0, K["s1"] + 0.8, 0.8, a=0.03, r=1.8, bright=1.15)
    place(mus, bell(hz("D5"), 0.10), 0.05, -0.3); place(mus, bell(hz("A5"), 0.07), 0.12, 0.3)
    # S1 · the thread alone: a low D breathing, bells when the pages are named
    place(sfx, whoosh(0.8, 0.4, False), K["s1"] - 0.1)
    chord(mus, ["D1", "D2", "A2"], K["s1"], K["s5"] - K["s1"] + 0.6, 0.42, a=0.6, r=1.0, bright=0.7)
    place(mus, shimmer(2.0, 1175, 2350, 0.04), K["s1"] + 0.2, 0.0)
    place(mus, bell(hz("A5"), 0.06), K["pag1"], -0.4); place(mus, bell(hz("D6"), 0.06), K["ultima"], 0.4)
    # S2 · 191: ticks follow the counter
    ts = K["s4"] + 0.1; dt = 0.07
    while ts < K["n191"] + 0.5:
        place(sfx, tick(0.13, 2000 + rng.integers(-200, 200)), ts, rng.uniform(-0.5, 0.5)); ts += dt
    place(mus, bell(hz("F5"), 0.07), K["n191"] + 0.5, 0.2)
    # S3 · pull back: riser + accelerating ticks -> BRAAM on 344.799
    rd = K["n344"] - K["s5"]
    place(sfx, riser(rd, 0.32), K["s5"]); place(sfx, whoosh(rd * 0.6, 0.4, True), K["s5"])
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], K["s5"], rd + 0.1, 0.42, a=rd * 0.9, r=0.1, bright=1.0)
    ts = K["s5"] + 0.3; dt = 0.12
    while ts < K["n344"]:
        place(sfx, tick(0.14, 2600 + rng.integers(-300, 300)), ts, rng.uniform(-0.6, 0.6)); ts += dt; dt = max(0.018, dt * 0.93)
    place(sfx, braam(0.85), K["n344"] - 0.01); place(sfx, sub_hit(1.0), K["n344"] - 0.01)
    chord(mus, ["D2", "A2", "D3", "E3", "F3", "A3", "D4", "A4"], K["n344"] - 0.02, K["s7"] - K["n344"] + 1.2, 0.70, a=0.02, r=1.6, bright=1.2)
    # S4 · the brightest point: everything thins to the pedal, one high organ note, a shimmer as the star grows
    chord(mus, ["D1", "D2"], K["s7"], K["quote"] - K["s7"] + 0.5, 0.35, a=0.8, r=0.6, bright=0.7)
    place(mus, organ(hz("A4"), K["quote"] - K["s7"], 0.08, a=1.2, r=0.6, bright=0.6), K["s7"], 0.1)
    place(mus, shimmer(K["isa96"] - K["ponto"], 660, 1760, 0.05), K["ponto"], 0.0)
    place(sfx, sub_hit(0.55, 1.2), K["isa96"] - 0.05)
    place(mus, shimmer(2.0, 880, 1760, 0.06), K["isa96"] - 0.1, 0.0)
    # S5 · the quote: D MAJOR (Picardy third) and bells; 212 ticks; the child
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], K["quote"] - 0.05, K["s12"] - K["quote"] + 1.0, 0.62, a=0.35, r=2.6, bright=1.1)
    for k, nn in enumerate(["D6", "A5", "F#5", "D5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.06, 3.0), K["quote"] + 0.1 + k * 0.42, -0.6 + 0.24 * k)
    ts = K["n212"]; dt = 0.05
    while ts < K["n212"] + 0.8:
        place(sfx, tick(0.09, 2400 + rng.integers(-200, 200)), ts, rng.uniform(-0.5, 0.5)); ts += dt
    place(mus, bell(hz("D5"), 0.09, 4.0), K["crianca"], 0.0)
    # S7 · the call: the major chord stays, two bells
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4"], K["s12"], DUR - K["s12"] + 0.4, 0.5, a=0.5, r=2.4, bright=1.0)
    place(mus, bell(hz("A5"), 0.07, 4.0), K["s12"] + 0.1, -0.2); place(mus, bell(hz("D6"), 0.06, 4.0), K["mostro"], 0.2)
    mus, sfx = reverb(mus, 3.8, 0.42), reverb(sfx, 1.6, 0.18)
    b, a = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b, a, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


S.build = build
if __name__ == "__main__":
    S.mixdown(); print("ok", DUR)
