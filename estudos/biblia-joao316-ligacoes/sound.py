"""Instruments of the score of "A Bíblia, conectada" (biblia-referencias/score.py, 18/10/2026), copied verbatim so the
comments video sounds like the same film: breathing organ, sub hit, braam, riser, whoosh, bells, ticks, shimmer, cathedral
reverb. Only SR/rng are declared here."""
import wave
import numpy as np
from scipy import signal

SR = 48000
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


def read_mono(p):
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        assert w.getframerate() == SR
    return x


