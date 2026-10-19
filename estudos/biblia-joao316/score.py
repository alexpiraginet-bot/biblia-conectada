#!/usr/bin/env python3
"""Original score + sound design for "Antes de João 3:16", synthesized here with the instruments of video 1 (sound.py).

Same world as "A Bíblia, conectada": a breathing organ in D minor that only resolves to D MAJOR (Picardy third) when John
3:16 is finally spoken, as video 1 resolved on Isaiah 9:6. Story beats: the hook (impact + drone), the rewind (falling
ticks), the 862-chapter flight back (riser + accelerating ticks, hit on the landing), the desert (a slow low heartbeat),
the bronze serpent (shimmer), "e vivia" (bell + light chord), the cross (braam on the dominant), the forward count into
3:16 (riser) and the resolution. Ducked under the narration as in videos 1 and 3.

  python3 score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import numpy as np
from scipy import signal
import soundfile as sf

import film as F
from sound import SR, rng, hz, place, chord, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb, read_mono

WORK = F.WORK
DUR = F.DUR
N = int(SR * (DUR + 0.5))
T = F.T
LE = F.LE   # bells ring at line ends, in the gaps: never on top of a word

V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
     "C": ["C2", "G2", "C3", "E3", "G3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"],
     "Dlow": ["D1", "A1", "D2", "A2"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"]}


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    # ---- hook: the organ already breathing at frame 0, an impact with the dome, the arc rings
    chord(mus, ["D1", "D2", "A2"], 0.0, T["l3"] + 0.6, 0.55, a=0.25, r=0.8, bright=0.8)
    place(sfx, sub_hit(0.40, 1.3), 0.02)
    place(sfx, braam(0.10, 2.4), 0.02)
    place(mus, shimmer(2.0, 1175, 2350, 0.05), 0.05, 0.3)
    place(mus, bell(hz("D5"), 0.05, 2.6), 0.10, 0.5)
    place(mus, bell(hz("A4"), 0.04, 2.6), 0.42, -0.5)
    ch(mus, "Dm", T["l2"] - 0.2, T["l3"] + 0.4, 0.38, a=0.8, r=0.6, bright=0.85)
    place(sfx, whoosh(1.4, 0.18, True), T["l2"] + 0.2, 0.4)          # the light leaving John 3
    place(mus, bell(hz("A5"), 0.05, 2.4), LE(2) + 0.02, 0.4)
    # ---- John 3:16 and its 80 links (VI), the count ticks; the rewind falls
    ch(mus, "Bb", T["l3"] - 0.05, T["r15"] + 0.3, 0.40, a=0.15, r=0.45, bright=0.85)
    place(mus, bell(hz("F5"), 0.06, 2.4), T["l3"] + 0.02, 0.3)
    place(sfx, whoosh(0.6, 0.20, True), T["l3"] - 0.5, 0.0)
    ts, dt = T["l3"] + 0.12, 0.10
    while ts < T["l3"] + 0.75:
        place(sfx, tick(0.07, 2400 + rng.integers(-200, 200)), ts, rng.uniform(-0.5, 0.5)); ts += dt; dt = max(0.03, dt * 0.85)
    for k, (tt, f) in enumerate([(T["r15"], 2100), (T["r14"], 1700)]):
        place(sfx, tick(0.16, f), tt, -0.2 + 0.4 * k)
        place(sfx, whoosh(0.35, 0.10, False), tt - 0.05, 0.0)
        place(mus, bell(hz(["E5", "D5"][k]), 0.05, 2.0), tt + 0.02, 0.0)
    ch(mus, "Gm", T["r14"] - 0.05, T["arc0"] + 0.2, 0.40, a=0.2, r=0.5, bright=0.85)
    # ---- the arc back: 862 chapters (dominant, riser, ticks accelerating with the counter), hit on the landing
    ch(mus, "A", T["arc0"] - 0.1, T["num"] + 0.6, 0.44, a=0.5, r=0.5, bright=1.0)
    place(sfx, riser(T["arc1"] - T["arc0"] + 0.1, 0.24), T["arc0"])
    ts, dt = T["arc0"] + 0.1, 0.16
    while ts < T["arc1"]:
        place(sfx, tick(0.08, 2200 + rng.integers(-300, 300)), ts, rng.uniform(-0.6, 0.6)); ts += dt; dt = max(0.025, dt * 0.90)
    place(sfx, sub_hit(0.55, 1.4), T["arc1"] - 0.01)
    place(sfx, braam(0.35, 2.6), T["arc1"] - 0.01)
    place(mus, bell(hz("D5"), 0.07, 3.0), T["num"] + 0.02, -0.5)
    place(sfx, whoosh(1.2, 0.22, False), T["num"] + 0.05, -0.3)       # the dive into Numbers 21
    # ---- the desert: low drone, a slow heartbeat under the serpents
    chord(mus, V["Dlow"], T["num"] + 0.3, T["pole"] - T["num"] + 0.2, 0.44, a=0.9, r=0.6, bright=0.7)
    hb = T["l8"]
    while hb < T["pole"]:
        place(sfx, sub_hit(0.16, 0.8), hb); place(sfx, sub_hit(0.09, 0.7), hb + 0.28); hb += 0.95
    # the bronze serpent on the pole
    ch(mus, "Bb", T["pole"] - 0.1, T["olhava"] + 0.1, 0.40, a=0.4, r=0.5, bright=0.9)
    place(mus, shimmer(max(0.8, T["bronze"] - T["serp"] + 0.4), 700, 1400, 0.05), T["serp"], 0.0)
    place(sfx, whoosh(0.8, 0.12, True), T["pole"] - 0.15, 0.0)
    # "olhava... e vivia": the light chord
    ch(mus, "Dm", T["olhava"] - 0.05, T["vivia"] + 0.1, 0.34, a=0.3, r=0.4, bright=0.8)
    ch(mus, "F", T["vivia"] - 0.04, T["l11"] + 0.4, 0.44, a=0.08, r=0.6, bright=1.05)
    place(mus, bell(hz("A5"), 0.07, 3.2), LE(10) + 0.02, 0.0)
    place(mus, bell(hz("C6"), 0.05, 3.0), LE(10) + 0.24, 0.4)
    place(sfx, sub_hit(0.30, 1.2), T["vivia"] - 0.02)
    # ---- "agora escuta Jesus": the flight back along the arc
    ch(mus, "C", T["l11"] - 0.05, T["l12"] + 0.3, 0.38, a=0.3, r=0.5, bright=0.9)
    place(sfx, whoosh(T["l12"] - T["l11"] + 0.3, 0.26, True), T["l11"] - 0.05, 0.3)
    # John 3:14 quoted
    ch(mus, "Dm", T["l12"] - 0.05, T["assim"] + 0.2, 0.36, a=0.5, r=0.5, bright=0.85)
    ch(mus, "Bb", T["assim"] - 0.05, T["l13"] + 0.2, 0.38, a=0.3, r=0.5, bright=0.9)
    place(mus, bell(hz("F5"), 0.035, 2.6), T["levantou"] + 0.05, -0.3)
    place(mus, bell(hz("A5"), 0.06, 2.8), LE(12) + 0.02, 0.3)
    # "levantado... numa cruz": iv -> V, braam on the cross
    ch(mus, "Gm", T["l13"] - 0.05, T["cruz"] + 0.1, 0.40, a=0.3, r=0.4, bright=0.9)
    ch(mus, "A", T["cruz"] - 0.04, T["l14"] + 0.3, 0.50, a=0.05, r=0.6, bright=1.05)
    place(sfx, braam(0.40, 3.0), T["cruz"] - 0.10)
    place(sfx, sub_hit(0.70, 1.6), T["cruz"] - 0.06)
    place(mus, bell(hz("C#6"), 0.06, 3.4), LE(13) + 0.02, 0.0)
    # ---- the two ends of the arc
    place(sfx, whoosh(1.0, 0.18, False), T["l14"] - 0.35, 0.0)
    ch(mus, "Dm", T["l14"] - 0.05, T["l15"] + 0.1, 0.38, a=0.3, r=0.4, bright=0.85)
    place(mus, bell(hz("D5"), 0.04, 2.6), T["l14"] + 0.02, -0.6)
    ch(mus, "F", T["l15"] - 0.05, T["l16"] + 0.1, 0.42, a=0.2, r=0.4, bright=0.95)
    place(mus, bell(hz("F5"), 0.04, 2.6), T["l15"] + 0.02, 0.6)
    # ---- "e só depois vem João 3:16": the count goes forward, the dominant holds, a riser into the resolution
    ch(mus, "A", T["l16"] - 0.05, T["l17"] + 0.1, 0.46, a=0.4, r=0.2, bright=1.0)
    place(sfx, riser(T["l17"] - T["l16"] + 0.05, 0.28), T["l16"])
    for k, (tt, f) in enumerate([(T["f15"], 1900), (T["f16"], 2300)]):
        place(sfx, tick(0.14, f), tt, -0.2 + 0.4 * k)
    # ---- John 3:16: D MAJOR (Picardy third), braam, the 80 links bloom
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], T["l16"] - 0.3, T["l17"] - T["l16"] + 0.6, 0.40, a=0.8, r=0.1, bright=1.0)
    place(sfx, braam(0.55), T["l17"] - 0.22); place(sfx, sub_hit(0.95), T["l17"] - 0.20)
    ch(mus, "D", T["l17"] - 0.20, T["l18"] + 1.0, 0.52, a=0.03, r=1.4, bright=1.10)
    place(mus, shimmer(2.6, 880, 1760, 0.035), T["l17"] + 0.1, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.06, 3.6), LE(17) + 0.04 + 0.18 * r_, -0.5 + 0.33 * r_)
    # ---- the call: D major breathing to the end
    chord(mus, V["D"], T["l18"] - 0.05, DUR - T["l18"] + 0.6, 0.46, a=0.5, r=2.2, bright=1.1)
    place(sfx, sub_hit(0.40, 1.2), T["l18"])
    place(mus, bell(hz("A5"), 0.06, 4.0), LE(18) + 0.02, 0.25)
    place(mus, bell(hz("D6"), 0.07, 4.5), LE(19) + 0.05, -0.2)
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
    mgain = (1 - 0.86 * duck).astype(np.float32)   # the climax is a spoken quote: every word on top
    music = (mus * MUS_GAIN + sfx * SFX_GAIN) * mgain[None, :]
    out = music + np.stack([v, v])
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", DUR)
