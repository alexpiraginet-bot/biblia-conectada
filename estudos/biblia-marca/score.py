#!/usr/bin/env python3
"""Score + sound design for "A outra marca" (video 8), with the instruments of video 1 (sound.py).

Trailer grammar to match the edit (Alex: "muito movimento e cortes marcantes"): a ticking pulse in D minor that drives
the first half; every cut of the picture gets a click, every impact a sub hit, every whip a whoosh, the big beats a
braam (CUTS mirrors the shot anchors of motion/src/Main.tsx, from the same narration words). Ap 13:4 drops the pulse to a
rumble; the chapter counter ticks once per chapter with a riser; Ap 22:4 opens D MAJOR, calm, with bells; the stamp swap
and the strike hit again; the CTA ends on D major. Music ducked under the voice; the hits only half, so the cuts punch.

  python3 score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import json, re, unicodedata
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

from sound import SR, hz, place, chord, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb, read_mono

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
NJ = json.load(open(WORK / "narr.json"))
TAIL = 2.6                                       # same tail as tools/motion_data.py
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


# the shots of Main.tsx: (time, kind, big) ; big = a braam on top of the hit
A = lambda x: x - 0.04
CUTS = [
    (0.0, "cut", True), (A(W(1, "alguem")), "cut", False), (A(W(1, "quem")), "cut", False), (A(W(1, "besta")), "hit", True),
    (A(T[2]), "whip", False), (A(W(2, "lado")), "hit", False),
    (A(T[3]), "cut", False), (A(W(3, "onde")), "hit", False),
    (A(T[4]), "hit", True), (A(W(4, "ou")), "hit", True),
    (A(T[5]), "whip", False), (A(W(5, "por")), "cut", False),
    (A(T[6]), "hit", True), (A(W(6, "as")), "whip", False), (A(LE(6) + 0.12), "hit", False),
    (A(T[7]), "cut", False), (A(W(7, "chip") + 0.18), "hit", False), (A(W(7, "quem")), "hit", False),
    (A(T[8]), "whip", False), (A(W(8, "adoracao")), "hit", True),
    (A(T[9]), "hit", False), (A(W(9, "quem", 1)), "hit", False),
    (A(T[10]), "cut", False), (A(W(10, "de", 1)), "hit", True),
    (A(T[11]), "whip", False), (A(LE(11) - 0.05), "hit", True),
    (A(T[12]), "cut", False), (A(LE(12) + 0.1), "hit", False),
    (A(T[13]), "hit", False), (A(W(13, "so")), "hit", True),
    (A(T[14]), "cut", False), (A(W(14, "votou") + 0.3), "hit", False), (A(W(14, "qual")), "hit", True),
    (A(T[15]), "hit", True),
]

V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"],
     "A": ["A1", "E2", "A2", "C#3", "E3"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"],
     "G": ["G1", "D2", "G2", "B2", "D3"]}


def up(notes):
    return [n[:-1] + str(int(n[-1]) + 1) for n in notes]


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)
    chord(buf, up(V[name][1:]), t_on, max(0.3, t_off - t_on), amp * 0.5, **{**kw, "bright": kw.get("bright", 1.0) * 1.1})


def pulse(sfx, mus, t0, t1, bpm, amp, note="D2"):
    """the drive: a low pluck on every beat, a tick on the off-beats, a soft kick every two beats"""
    b = 60 / bpm; t = t0; k = 0
    while t < t1:
        place(mus, bell(hz(note), amp * 0.5, 0.35), t, 0.0)
        place(sfx, tick(amp * 0.35, 3200), t + b / 2, 0.25 if k % 2 else -0.25)
        if k % 2 == 0: place(sfx, sub_hit(amp * 0.55, 0.45), t)
        t += b; k += 1


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    # ---- first half: D minor, driving (the pulse speeds up a little at the question of line 5)
    ch(mus, "Dm", 0.0, T[5], 0.30, a=0.05, r=0.4, bright=1.0)
    ch(mus, "Bb", T[5] - 0.05, T[7], 0.32, a=0.1, r=0.4, bright=1.0)
    ch(mus, "Gm", T[7] - 0.05, T[9], 0.32, a=0.1, r=0.4, bright=1.0)
    pulse(sfx, mus, 0.0, T[5], 124, 0.16)
    pulse(sfx, mus, T[5], T[9] - 0.05, 132, 0.18)
    # ---- Ap 13:4: the pulse stops, a rumble and the dominant
    chord(mus, ["D1", "A1", "D2"], T[9] - 0.05, LE(9) - T[9] + 0.6, 0.42, a=0.05, r=0.6, bright=0.6)
    place(sfx, riser(max(0.6, LE(9) - T[9]), 0.08), T[9])
    ch(mus, "A", T[10] - 0.05, T[11], 0.32, a=0.05, r=0.3, bright=1.0)
    pulse(sfx, mus, T[10], T[11] - 0.05, 132, 0.18, "A1")
    # ---- the chapter counter: one tick per chapter (same easing as Roll in Main.tsx), a riser, a hit on the landing
    a, b = T[11] + 0.1, LE(11) - 0.05
    n0, n1 = 13, 22
    for k in range(1, n1 - n0 + 1):
        place(sfx, tick(0.20, 2600 + 90 * k), a + (b - a) * (k / (n1 - n0)) ** (1 / 3), 0.0)
    place(sfx, riser(max(0.5, b - a), 0.14), a)
    # ---- Ap 22:4: D MAJOR, calm, bells
    ch(mus, "D", b - 0.02, T[13], 0.40, a=0.15, r=1.0, bright=1.12)
    for r_, nn in enumerate(["D5", "F#5", "A5"]):
        place(mus, bell(hz(nn), 0.05, 3.6), W(12, "nome") + 0.12 * r_, -0.4 + 0.4 * r_)
    place(mus, shimmer(2.6, 880, 1760, 0.04), T[12], 0.0)
    # ---- the stamp swap and the point: the pulse comes back in D major, then the final chord
    ch(mus, "G", T[13] - 0.05, T[14], 0.32, a=0.05, r=0.4, bright=1.05)
    ch(mus, "A", T[14] - 0.05, T[15], 0.32, a=0.05, r=0.4, bright=1.05)
    pulse(sfx, mus, T[13], T[15] - 0.05, 132, 0.17, "D2")
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], T[15] - 0.1, DUR - T[15] + 0.6, 0.40, a=0.1, r=2.5, bright=1.0)
    ch(mus, "D", T[15] - 0.05, DUR - T[15] + 0.6, 0.46, a=0.1, r=2.5, bright=1.12)
    place(mus, bell(hz("D6"), 0.05, 4.0), LE(15) + 0.15, 0.2)
    # ---- the cuts
    for t, kind, big in CUTS:
        if kind == "whip":
            place(sfx, whoosh(0.32, 0.30, True), t - 0.24, 0.0)
            place(sfx, tick(0.18, 1800), t, 0.0)
        elif kind == "cut":
            place(sfx, tick(0.22, 2200), t, 0.0); place(sfx, sub_hit(0.10, 0.4), t)
        else:
            place(sfx, sub_hit(0.42, 1.0), t); place(sfx, whoosh(0.18, 0.18, False), t, 0.0)
        if big:
            place(sfx, braam(0.22, 2.0), t - 0.02)
    mus, sfx = reverb(mus, 2.6, 0.30), reverb(sfx, 1.2, 0.12)
    b_, a_ = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b_, a_, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.22, 0.34


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
    music = mus * MUS_GAIN * (1 - 0.82 * duck).astype(np.float32)[None, :] + sfx * SFX_GAIN * (1 - 0.6 * duck).astype(np.float32)[None, :]
    out = music + np.stack([v, v])
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", round(DUR, 2))
