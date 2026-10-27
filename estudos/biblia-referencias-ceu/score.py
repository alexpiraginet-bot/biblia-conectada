#!/usr/bin/env python3
"""Original score + sound design for "A Bíblia, conectada", synthesized here (no library music, nothing licensed).

Idea: a pipe organ that breathes (the Temple Church organ of Interstellar as reference), D minor all the way, resolving
to D MAJOR (a Picardy third) on Isaiah 9:6, "porque um menino nos nasceu". Sound design follows the picture: ticks =
the counter, riser + braam = 344.799, bells = the star. Mixed under the narration with ducking.

  python3 score.py  -> renders/.film/score.wav (music+sfx, stereo 48 kHz) and renders/.film/mix.wav (with narration)
"""
import json, wave
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
K = json.load(open(WORK / "keys.json"))
NARR = json.load(open(WORK / "narr.json"))
SR = 48000
DUR = NARR["duration"]
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(31)


def hz(note):
    names = {"C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6, "E": -5, "F": -4, "F#": -3, "Gb": -3, "G": -2, "G#": -1,
             "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + (o - 4) * 12) / 12)


def env_ar(n, a, r, sus=1.0):
    t = np.arange(n) / SR; e = np.ones(n, np.float32) * sus
    if a > 0: e *= np.clip(t / a, 0, 1) ** 1.5
    if r > 0: e *= np.clip((n / SR - t) / r, 0, 1) ** 1.2
    return e


# ------------------------------------------------------------------ organ (additive, drawbar-like, breathing)
HARM = [(1, 1.0), (2, 0.55), (3, 0.30), (4, 0.26), (5, 0.08), (6, 0.12), (8, 0.07), (10, 0.03)]


def organ(f, dur, amp=1.0, a=0.6, r=1.2, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n, np.float32)
    breath = 1 + 0.07 * np.sin(2 * np.pi * (0.17 + 0.03 * rng.random()) * t + rng.random() * 6)
    for h, g in HARM:
        if f * h > 9000: continue
        gg = g * (bright ** (np.log2(h) if h > 1 else 0))
        for det in (-0.0011, 0.0011):
            x += (gg * 0.5 * np.sin(2 * np.pi * f * h * (1 + det) * t + rng.random() * 6.28)).astype(np.float32)
    # wind noise of the pipes
    nz = rng.normal(0, 1, n).astype(np.float32)
    b, a_ = signal.butter(2, [min(0.95, f * 1.5 / (SR / 2)), min(0.99, f * 6 / (SR / 2))], "band")
    x += 0.035 * signal.lfilter(b, a_, nz).astype(np.float32)
    return x * breath * env_ar(n, a, r) * amp


def place(buf, x, t0, pan=0.0, gain=1.0):
    i = int(round(t0 * SR))
    if i >= buf.shape[1]: return
    if i < 0: x = x[-i:]; i = 0
    m = min(len(x), buf.shape[1] - i)
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + m] += x[:m] * gain * l * 1.414
    buf[1, i:i + m] += x[:m] * gain * r * 1.414


def chord(buf, notes, t0, dur, amp, a=0.8, r=1.5, bright=1.0, spread=0.5):
    for k, nn in enumerate(notes):
        pan = (k / max(1, len(notes) - 1) - 0.5) * 2 * spread
        place(buf, organ(hz(nn), dur, amp / len(notes) ** 0.5, a, r, bright), t0, pan)


# ------------------------------------------------------------------ sound design pieces
def sub_hit(amp=1.0, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 32 + 34 * np.exp(-t / 0.12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    click = rng.normal(0, 1, n) * np.exp(-t / 0.004) * 0.6
    b, a = signal.butter(2, 2500 / (SR / 2), "high"); click = signal.lfilter(b, a, click)
    return ((x + click) * amp).astype(np.float32)


def braam(amp=1.0, dur=3.2):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f, g in ((36.71, 1.0), (73.42, 0.8), (110.0, 0.55), (146.83, 0.35)):
        ph = np.cumsum(f * (1 + 0.004 * np.sin(2 * np.pi * 0.7 * t)) / SR)
        x += g * (2 * (ph % 1.0) - 1)                 # saw
    # opening then closing low-pass, processed in blocks
    out = np.zeros(n); zi = None; blk = 512
    for s in range(0, n, blk):
        tt = s / SR; fc = 180 + 1400 * np.exp(-((tt - 0.12) / 0.5) ** 2) + 220 * np.exp(-tt / 1.5)
        b, a = signal.butter(2, min(0.99, fc / (SR / 2)))
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, x[s:s + blk], zi=zi)
    out = np.tanh(out * 2.2) * env_ar(n, 0.02, 1.8) * np.exp(-t / 1.6)
    return (out * amp).astype(np.float32)


def riser(dur, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = rng.normal(0, 1, n)
    out = np.zeros(n); zi = None; blk = 512
    for s in range(0, n, blk):
        fc = 300 + 7000 * (s / n) ** 2
        b, a = signal.butter(2, [max(0.001, fc * 0.6 / (SR / 2)), min(0.99, fc * 1.4 / (SR / 2))], "band")
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, nz[s:s + blk], zi=zi)
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 700 * u ** 2) / SR) * 0.25
    return ((out * 0.8 + sweep) * u ** 2.2 * amp).astype(np.float32)


def whoosh(dur=0.9, amp=1.0, up=True):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = rng.normal(0, 1, n); out = np.zeros(n); zi = None; blk = 256
    for s in range(0, n, blk):
        k = s / n; fc = 400 + 3500 * (k if up else 1 - k)
        b, a = signal.butter(2, [max(0.001, fc * 0.5 / (SR / 2)), min(0.99, fc * 1.5 / (SR / 2))], "band")
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, nz[s:s + blk], zi=zi)
    return (out * np.sin(np.pi * u) ** 1.5 * amp).astype(np.float32)


def bell(f, amp=1.0, dur=3.5):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for ratio, g, d in ((1.0, 1.0, 2.4), (2.756, 0.45, 1.1), (5.404, 0.25, 0.55), (8.933, 0.12, 0.28), (2.0, 0.3, 1.8)):
        x += g * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / d)
    return (x * np.clip(t / 0.003, 0, 1) * amp).astype(np.float32)


def tick(amp=1.0, f=2400):
    n = int(0.035 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + rng.normal(0, 1, n) * np.exp(-t / 0.002) * 0.4
    return (x * amp).astype(np.float32)


def shimmer(dur, f0=880, f1=1760, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    x = np.zeros(n)
    for k, m in enumerate((1.0, 1.5, 2.0, 3.0)):
        f = (f0 + (f1 - f0) * u ** 1.5) * m
        x += np.sin(2 * np.pi * np.cumsum(f) / SR + k) * (0.6 ** k) * (1 + 0.3 * np.sin(2 * np.pi * (7 + k) * t))
    return (x * np.sin(np.pi * u) ** 0.8 * amp).astype(np.float32)


def reverb(x, rt=3.6, mix=0.32, pre=0.025):
    """cathedral-ish: decaying, low-passed, decorrelated noise IR, FFT convolution"""
    n = int(rt * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(x.shape[0]):
        ir = rng.normal(0, 1, n) * np.exp(-6.9 * t / rt)
        b, a = signal.butter(1, 4500 / (SR / 2)); ir = signal.lfilter(b, a, ir)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir]); ir /= np.sqrt((ir ** 2).sum())
        wet = signal.fftconvolve(x[c], ir)[:x.shape[1]]
        out[c] = x[c] * (1 - mix) + wet * mix * 2.2
    return out.astype(np.float32)


# ------------------------------------------------------------------ the score
def build():
    mus = np.zeros((2, N), np.float32)   # organ + bells (reverb heavy)
    sfx = np.zeros((2, N), np.float32)   # hits, ticks, whooshes (light reverb)
    Dm = ["D2", "A2", "D3", "F3", "A3"]
    # 0.0 hook: the organ is already breathing at frame 0, swelling to "É a Bíblia"
    chord(mus, ["D1", "D2", "A2"], 0.0, K["s2"] + 1.5, 0.55, a=0.25, r=1.2, bright=0.8)
    place(mus, shimmer(2.2, 1175, 2350, 0.05), 0.05, 0.3)
    # 2.2 "É a Bíblia": the hit + full chord
    place(sfx, sub_hit(0.9), K["bible"] - 0.01)
    place(sfx, braam(0.32, 2.6), K["bible"] - 0.01)
    chord(mus, ["D2", "A2", "D3", "F3", "A3", "D4", "F4"], K["bible"] - 0.02, 3.4, 0.9, a=0.03, r=2.2, bright=1.15)
    place(mus, bell(hz("D5"), 0.10), K["bible"], -0.3); place(mus, bell(hz("A5"), 0.07), K["bible"] + 0.05, 0.3)
    # origin (2007): quiet bed, a stamp on "2007", arcs teaser shimmer
    chord(mus, Dm, K["s2"] + 0.3, 4.2, 0.30, a=1.4, r=1.6, bright=0.7)
    chord(mus, ["Bb1", "F2", "Bb2", "D3", "F3"], K["draw"] - 0.3, K["s3"] - K["draw"] + 1.0, 0.30, a=1.0, r=1.0, bright=0.75)
    place(sfx, sub_hit(0.35, 0.9), K["y2007"] - 0.02)
    place(sfx, tick(0.25, 1600), K["pastor"] - 0.05, -0.3); place(sfx, tick(0.25, 1800), K["pesq"] - 0.05, 0.3)
    place(mus, shimmer(1.8, 660, 1320, 0.05), K["draw"], 0.0)
    # dive into the chapters + the pan: pulses, whoosh, landing bell on the tree of life
    for k in range(int((K["pan1"] - K["s3"]) / 0.3)):
        place(sfx, tick(0.12, 900 + 40 * k), K["s3"] + k * 0.3, -0.2 + 0.4 * (k % 2))
    place(sfx, whoosh(1.0, 0.55, True), K["s3"] - 0.1)
    place(sfx, whoosh(K["pan1"] - K["pan0"] + 0.3, 0.75, True), K["pan0"] - 0.1)
    chord(mus, ["A1", "E2", "A2", "C#3", "E3"], K["s3"], K["pan1"] - K["s3"] + 0.4, 0.28, a=1.2, r=0.5, bright=0.8)
    place(mus, bell(hz("A5"), 0.12), K["pan1"], 0.2); place(sfx, sub_hit(0.35, 1.0), K["pan1"])
    # one arc = one link; the most voted: Isaiah 41:10 -> Philippians 4:13
    chord(mus, ["Bb1", "F2", "Bb2", "D3", "F3", "Bb3"], K["s4"], K["lig"] - K["s4"] + 0.6, 0.34, a=0.9, r=0.8, bright=0.85)
    for k, _ in enumerate(range(3)):
        place(mus, bell(hz(["F5", "A5", "C6"][k]), 0.05), K["s4"] + 0.35 + k * 0.75 + 0.6, -0.4 + 0.4 * k)
    place(mus, shimmer(1.6, 520, 1560, 0.06), K["lig"], 0.0)
    chord(mus, ["F2", "C3", "F3", "A3", "C4"], K["lig"], K["s5"] - K["lig"] + 0.6, 0.38, a=0.5, r=1.0, bright=1.0)
    place(mus, bell(hz("F5"), 0.10), K["fil"] + 0.9, 0.35)
    # the counter, 2007: ticks follow the numbers
    chord(mus, ["G1", "D2", "G2", "Bb2", "D3"], K["s5"] - 0.2, K["s6"] - K["s5"] + 0.6, 0.30, a=0.8, r=0.6, bright=0.75)
    ts = K["s5"]; dt = 0.11
    while ts < K["n63"]:
        place(sfx, tick(0.16, 2200 + rng.integers(-200, 200)), ts, rng.uniform(-0.5, 0.5)); ts += dt; dt *= 0.985
    place(sfx, sub_hit(0.3, 0.8), K["n63"])
    place(sfx, whoosh(0.7, 0.45, True), K["viral"] - 0.05); place(sfx, whoosh(0.5, 0.35, False), K["s6"] - 0.05)
    for k in range(9): place(sfx, tick(0.10, 3000 + 120 * k), K["viral"] + 0.05 + k * 0.08, rng.uniform(-0.8, 0.8))
    # today: riser + accelerating ticks -> BRAAM on 344.799
    rd = K["n340"] - K["s6"]
    place(sfx, riser(rd, 0.30), K["s6"])
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], K["s6"], rd + 0.1, 0.42, a=rd * 0.9, r=0.1, bright=1.0)
    ts = K["s6"] + 0.25; dt = 0.12
    while ts < K["n340"]:
        place(sfx, tick(0.14, 2600 + rng.integers(-300, 300)), ts, rng.uniform(-0.6, 0.6)); ts += dt; dt = max(0.018, dt * 0.93)
    place(sfx, braam(0.85), K["n340"] - 0.01); place(sfx, sub_hit(1.0), K["n340"] - 0.01)
    chord(mus, ["D2", "A2", "D3", "E3", "F3", "A3", "D4", "A4"], K["n340"] - 0.02, K["s7"] - K["n340"] + 1.4, 0.70, a=0.02, r=1.6, bright=1.2)
    place(mus, bell(hz("D6"), 0.09), K["x5"], 0.0)
    # eight months: a clock, months filling
    chord(mus, ["C2", "G2", "C3", "E3", "G3"], K["s7"], K["s8"] - K["s7"] + 0.8, 0.28, a=1.0, r=1.0, bright=0.8)
    ts = K["min"]
    while ts < K["s8"] - 0.3:
        place(sfx, tick(0.18, 1500), ts, -0.15); place(sfx, tick(0.10, 1200), ts + 0.5, 0.15); ts += 1.0
    for m in range(8):
        place(mus, bell(hz(["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"][m]), 0.035, 1.2),
              K["semd"] + m * (K["meses"] - K["semd"] + 0.2) / 7.87, -0.5 + m / 7)
    place(sfx, sub_hit(0.4, 1.0), K["meses"])
    # suspense: almost nothing, a high organ note over the pedal
    chord(mus, ["D1", "D2"], K["s8"], K["quote"] - K["s8"] + 0.5, 0.35, a=0.6, r=0.6, bright=0.7)
    place(mus, organ(hz("A4"), K["quote"] - K["s8"], 0.08, a=1.0, r=0.6, bright=0.6), K["s8"], 0.1)
    # Isaiah 9:6: soft impact + bells; then D MAJOR (Picardy third) under the quote
    place(sfx, sub_hit(0.55, 1.2), K["isa96"] - 0.05)
    place(mus, shimmer(2.0, 880, 1760, 0.06), K["isa96"] - 0.1, 0.0)
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], K["quote"] - 0.05, DUR - K["quote"] + 0.4, 0.62, a=0.35, r=2.6, bright=1.1)
    for k, nn in enumerate(["D6", "A5", "F#5", "D5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.06, 3.0), K["quote"] + 0.1 + k * 0.42, -0.6 + 0.24 * k)
    place(mus, bell(hz("D5"), 0.08, 4.0), K["s9"], 0.0)
    place(mus, bell(hz("A5"), 0.06, 4.0), K["pedidos"], 0.2)
    mus, sfx = reverb(mus, 3.8, 0.42), reverb(sfx, 1.6, 0.18)
    # phone-friendly bus EQ: no sub rumble below 32 Hz, a pocket at 2.5 kHz so the voice sits on top
    b, a = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b, a, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.20, 0.32


def read_mono(p):
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        assert w.getframerate() == SR
    return x


def mixdown():
    mus, sfx = build()
    voice = read_mono(WORK / "narr.wav"); v = np.zeros(N, np.float32); v[:len(voice)] = voice[:N]
    # ducking: music dips under the voice (fast attack, slow release)
    env = np.sqrt(signal.lfilter([1 - 0.995], [1, -0.995], v ** 2))
    thr = 0.02; d = np.clip(env / thr, 0, 1)
    duck = np.empty_like(d); g = 0.0
    a_up, a_dn = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
    for blk in range(0, N, 480):   # 10 ms blocks
        target = float(d[blk:blk + 480].max())
        g = target if target > g else g * a_dn ** 480 + target * (1 - a_dn ** 480)
        duck[blk:blk + 480] = g
    duck = signal.lfilter([1 - a_up], [1, -a_up], duck)
    mgain = (1 - 0.72 * duck).astype(np.float32)
    music = (mus * MUS_GAIN + sfx * SFX_GAIN) * mgain[None, :]
    out = music + np.stack([v, v]) * 1.0
    import soundfile as sf  # float WAV: no clipping before the final limiter
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    np.save(WORK / "voice.npy", v); np.save(WORK / "music.npy", music)
    return out


if __name__ == "__main__":
    mixdown(); print("ok", DUR)
