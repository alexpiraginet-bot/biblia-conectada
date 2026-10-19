#!/usr/bin/env python3
"""Original score + sound design for "Antes do Natal, já estava escrito" — synthesized here (no library music).

A score with movement: a 16th-note string-pluck ostinato at 100 BPM and taiko drums drive the map flights; the organ
of the first video breathes underneath (D minor), an Eb-major colour over D for Egypt, and the D MAJOR resolution on
"Porque um menino nos nasceu" (Picardy third, as in "A Bíblia, conectada"). Sound design follows the picture:
hits on every stamped word, ticks on the rolling counters, tape-rewind on the flash-back, risers into every landing.

  python3 score.py  -> renders/.film/mix.wav (float, music+sfx ducked under the narration) and score.wav
"""
import wave
from pathlib import Path
import numpy as np
from scipy import signal
from timeline import B, DUR

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
SR = 48000
N = int(SR * (DUR + 0.6))
rng = np.random.default_rng(1225)
BPM = 100.0; BEAT = 60 / BPM; S16 = BEAT / 4


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


def place(buf, x, t0, pan=0.0, gain=1.0):
    i = int(round(t0 * SR))
    if i >= buf.shape[1]: return
    if i < 0: x = x[-i:]; i = 0
    m = min(len(x), buf.shape[1] - i)
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + m] += x[:m] * gain * l * 1.414
    buf[1, i:i + m] += x[:m] * gain * r * 1.414


# ------------------------------------------------------------------ instruments
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
    nz = rng.normal(0, 1, n).astype(np.float32)
    b, a_ = signal.butter(2, [min(0.95, f * 1.5 / (SR / 2)), min(0.99, f * 6 / (SR / 2))], "band")
    x += 0.035 * signal.lfilter(b, a_, nz).astype(np.float32)
    return x * breath * env_ar(n, a, r) * amp


def chord(buf, notes, t0, dur, amp, a=0.8, r=1.5, bright=1.0, spread=0.5):
    for k, nn in enumerate(notes):
        pan = (k / max(1, len(notes) - 1) - 0.5) * 2 * spread
        place(buf, organ(hz(nn), dur, amp / len(notes) ** 0.5, a, r, bright), t0, pan)


def pluck(f, amp=1.0, dur=0.42, bright=1.0):
    """short string pluck: harmonics decaying faster as they go up (spiccato/harp-ish)"""
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for h in range(1, 9):
        if f * h > 10000: break
        x += (0.9 / h ** (1.15 / bright)) * np.sin(2 * np.pi * f * h * t + rng.random() * 6.28) * np.exp(-t * (6 + 5 * h) / bright)
    att = rng.normal(0, 1, n) * np.exp(-t / 0.003) * 0.15
    return ((x + att) * np.clip(t / 0.002, 0, 1) * amp).astype(np.float32)


def taiko(amp=1.0, f0=58, dur=1.1):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (1 + 1.4 * np.exp(-t / 0.018))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    nz = rng.normal(0, 1, n); b, a = signal.butter(2, 260 / (SR / 2)); thump = signal.lfilter(b, a, nz) * np.exp(-t / 0.05) * 2.5
    skin = rng.normal(0, 1, n) * np.exp(-t / 0.006) * 0.25
    return ((body + thump + skin) * amp).astype(np.float32)


def sub_hit(amp=1.0, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 32 + 34 * np.exp(-t / 0.12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    click = rng.normal(0, 1, n) * np.exp(-t / 0.004) * 0.6
    b, a = signal.butter(2, 2500 / (SR / 2), "high"); click = signal.lfilter(b, a, click)
    return ((x + click) * amp).astype(np.float32)


def braam(amp=1.0, dur=3.0, root=36.71):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for m, g in ((1, 1.0), (2, 0.8), (3, 0.55), (4, 0.35)):
        ph = np.cumsum(root * m * (1 + 0.004 * np.sin(2 * np.pi * 0.7 * t)) / SR)
        x += g * (2 * (ph % 1.0) - 1)
    out = np.zeros(n); zi = None; blk = 512
    for s in range(0, n, blk):
        tt = s / SR; fc = 180 + 1400 * np.exp(-((tt - 0.12) / 0.5) ** 2) + 220 * np.exp(-tt / 1.5)
        b, a = signal.butter(2, min(0.99, fc / (SR / 2)))
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, x[s:s + blk], zi=zi)
    out = np.tanh(out * 2.2) * env_ar(n, 0.02, 1.6) * np.exp(-t / 1.5)
    return (out * amp).astype(np.float32)


def _bandnoise(n, fc_fn, blk=256, q=(0.5, 1.5)):
    nz = rng.normal(0, 1, n); out = np.zeros(n); zi = None
    for s in range(0, n, blk):
        fc = fc_fn(s / n)
        b, a = signal.butter(2, [max(0.001, fc * q[0] / (SR / 2)), min(0.99, fc * q[1] / (SR / 2))], "band")
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        out[s:s + blk], zi = signal.lfilter(b, a, nz[s:s + blk], zi=zi)
    return out


def riser(dur, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    out = _bandnoise(n, lambda k: 300 + 7000 * k ** 2, 512, (0.6, 1.4))
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 700 * u ** 2) / SR) * 0.25
    return ((out * 0.8 + sweep) * u ** 2.2 * amp).astype(np.float32)


def whoosh(dur=0.9, amp=1.0, up=True):
    n = int(dur * SR); u = np.arange(n) / n
    out = _bandnoise(n, (lambda k: 400 + 3500 * k) if up else (lambda k: 3900 - 3500 * k))
    return (out * np.sin(np.pi * u) ** 1.5 * amp).astype(np.float32)


def rewind(dur, amp=1.0):
    """tape scrubbing backwards: falling resonant sweep + stutter, cut dead at the end"""
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    out = _bandnoise(n, lambda k: 3200 * (1 - k) ** 1.6 + 180, 256, (0.8, 1.25))
    stut = 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * (14 + 30 * u) * t))
    tone = np.sin(2 * np.pi * np.cumsum(900 * (1 - u) ** 2 + 70) / SR) * 0.35
    return ((out * 1.4 + tone) * stut * (0.4 + 0.6 * u) * amp).astype(np.float32)


def rev_swell(dur, f_notes, amp=1.0):
    """reversed cymbal + organ crescendo that ends exactly at t0+dur"""
    n = int(dur * SR); u = np.arange(n) / n
    nz = _bandnoise(n, lambda k: 6000 + 2000 * k, 512, (0.5, 1.6)) * u ** 3
    x = nz * 0.9
    for f in f_notes:
        x += np.sin(2 * np.pi * f * np.arange(n) / SR) * u ** 2.5 * 0.25
    return (x * amp).astype(np.float32)


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
    n = int(rt * SR); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(x.shape[0]):
        ir = rng.normal(0, 1, n) * np.exp(-6.9 * t / rt)
        b, a = signal.butter(1, 4500 / (SR / 2)); ir = signal.lfilter(b, a, ir)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir]); ir /= np.sqrt((ir ** 2).sum())
        wet = signal.fftconvolve(x[c], ir)[:x.shape[1]]
        out[c] = x[c] * (1 - mix) + wet * mix * 2.2
    return out.astype(np.float32)


# ------------------------------------------------------------------ the ostinato (16ths), chords by section
CH = {  # pluck notes for each harmony (root position-ish, two octaves)
    "Dm": ["D3", "A3", "D4", "A3", "F4", "A3", "D4", "A3"], "Bb": ["Bb2", "F3", "Bb3", "F3", "D4", "F3", "Bb3", "F3"],
    "F": ["F3", "C4", "F4", "C4", "A4", "C4", "F4", "C4"], "C": ["C3", "G3", "C4", "G3", "E4", "G3", "C4", "G3"],
    "Gm": ["G2", "D3", "G3", "D3", "Bb3", "D3", "G3", "D3"], "A": ["A2", "E3", "A3", "E3", "C#4", "E3", "A3", "E3"],
    "Eb/D": ["D3", "Bb3", "Eb4", "Bb3", "G4", "Bb3", "Eb4", "Bb3"], "D": ["D3", "A3", "D4", "A3", "F#4", "A3", "D4", "A3"],
    "G": ["G2", "D3", "G3", "D3", "B3", "D3", "G3", "D3"],
}
PAD = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
       "C": ["C2", "G2", "C3", "E3", "G3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"],
       "Eb/D": ["D2", "Bb2", "Eb3", "G3", "Bb3"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4"], "G": ["G1", "D2", "G2", "B2", "D3"]}


def ostinato(buf, t0, t1, harm, amp, bright=1.0, every=1):
    """16th notes on the global grid between t0 and t1 with chord changes harm=[(t, name), ...]"""
    k0 = int(np.ceil(t0 / S16)); k1 = int(t1 / S16)
    for k in range(k0, k1):
        t = k * S16
        name = [h for tt, h in harm if tt <= t + 1e-6][-1]
        if k % every: continue
        nn = CH[name][k % 8]
        acc = 1.15 if k % 4 == 0 else 0.85 if k % 2 == 0 else 0.7
        a_ = amp(t) if callable(amp) else amp
        if a_ <= 0.002: continue
        place(buf, pluck(hz(nn), a_ * acc, 0.42, bright), t, pan=0.35 * np.sin(k * 0.9))


def pads(buf, harm, t_end, amp, bright=0.85):
    for (t, h), (t2, _) in zip(harm, harm[1:] + [(t_end, None)]):
        a_ = amp(t) if callable(amp) else amp
        chord(buf, PAD[h], t - 0.05, t2 - t + 0.9, a_, a=0.35, r=0.9, bright=bright)


def drums(buf, t0, t1, amp, pattern="taiko"):
    k0 = int(np.ceil(t0 / BEAT)); k1 = int(t1 / BEAT)
    for k in range(k0, k1):
        t = k * BEAT
        a_ = amp(t) if callable(amp) else amp
        if pattern == "taiko":
            place(buf, taiko(a_ * (1.0 if k % 2 == 0 else 0.6), 58 if k % 2 == 0 else 72), t, -0.15 + 0.3 * (k % 2))
            if k % 4 == 3: place(buf, taiko(a_ * 0.45, 84, 0.6), t + BEAT / 2, 0.3)
        else:  # heartbeat
            place(buf, taiko(a_, 46, 0.9), t); place(buf, taiko(a_ * 0.6, 46, 0.7), t + BEAT * 0.33)


def ticks_for(buf, t0, t1, n_events, amp=0.15, f=2300):
    """ticks that follow a counter: dense when it moves fast (ease-out spacing)"""
    for k in range(n_events):
        u = (k + 0.5) / n_events
        t = t0 + (t1 - t0) * (1 - (1 - u) ** 0.45)  # inverse of an ease-out: early ticks dense
        place(buf, tick(amp * (0.7 + 0.3 * rng.random()), f + rng.integers(-250, 250)), t, rng.uniform(-0.5, 0.5))


def build():
    mus = np.zeros((2, N), np.float32); sfx = np.zeros((2, N), np.float32); pul = np.zeros((2, N), np.float32)
    # ---------------- TEASER (flash-forward): full energy from frame 0
    hT = [(0.0, "Dm"), (B["t_land"], "Bb"), (B["t_assim"], "Gm"), (B["t_escr"], "A")]
    ostinato(pul, 0.0, B["rew0"], hT, 0.13)
    pads(mus, hT, B["rew0"], 0.34)
    drums(sfx, 0.0, B["t_land"], 0.32)
    place(sfx, sub_hit(0.8), 0.0); place(sfx, whoosh(1.3, 0.5, True), 0.05)
    place(sfx, sub_hit(0.75), B["t_land"] - 0.01); place(mus, bell(hz("A5"), 0.10), B["t_land"], 0.2)
    for k, tw in enumerate((B["t_assim"], B["t_esta"], B["t_escr"])):   # hits land just before each word (consonant stays clear)
        place(sfx, taiko(0.5 + 0.12 * k, 60 - 4 * k), tw - 0.06); place(sfx, sub_hit(0.25 + 0.12 * k, 1.0), tw - 0.06)
    place(sfx, braam(0.32, 2.0), B["t_escr"] + 0.25)
    # ---------------- REWIND to 700 a.C.
    place(sfx, rewind(B["hook0"] - B["rew0"] - 0.05, 0.55), B["rew0"])
    ticks_for(sfx, B["rew0"] + 0.05, B["rew0"] + 0.6, 26, 0.12, 2800)
    place(sfx, sub_hit(0.9, 1.4), B["rew0"] + 0.62); place(mus, bell(hz("D5"), 0.10), B["rew0"] + 0.62)
    # ---------------- HOOK: dive from space to Belém
    hH = [(B["hook0"], "Dm"), (B["hook0"] + 2 * BEAT * 2, "Bb"), (B["prof"], "Gm"), (B["city"], "A"), (B["belem"], "Dm")]
    pads(mus, hH, B["data0"], 0.36)
    ostinato(pul, B["hook0"] + 0.3, B["belem"], hH, lambda t: 0.05 + 0.15 * np.clip((t - B["hook0"]) / (B["belem"] - B["hook0"]), 0, 1) ** 1.5)
    drums(sfx, B["city"], B["belem"] - 0.1, lambda t: 0.25 + 0.35 * (t - B["city"]) / (B["belem"] - B["city"]))
    place(sfx, riser(B["belem"] - B["city"] + 0.2, 0.30), B["city"] - 0.2)
    place(sfx, sub_hit(1.0), B["belem"] - 0.01); place(sfx, braam(0.55, 2.6), B["belem"] - 0.01)
    place(mus, bell(hz("D6"), 0.08), B["belem"] + 0.02, -0.2); place(mus, bell(hz("A5"), 0.08), B["belem"] + 0.3, 0.3)
    # ---------------- DATA: four chapters, 1.561 verses, 38 of 39 books
    hD = [(B["data0"], "Dm"), (B["liga"], "Bb"), (B["liga"] + 4 * BEAT, "Gm"), (B["livros0"], "A"), (B["naz0"], "Dm")]
    pads(mus, hD, B["naz0"], 0.30)
    ostinato(pul, B["data0"] + 0.2, B["naz0"] - 0.3, hD, lambda t: 0.10 if t < B["liga"] else 0.16)
    place(sfx, tick(0.2, 1800), B["quatro"]); ticks_for(sfx, B["quatro"] + 0.15, B["quatro"] + 0.75, 14, 0.10, 2600)
    place(mus, shimmer(B["testa"] - B["liga"], 660, 1760, 0.05), B["liga"], 0.0)
    ticks_for(sfx, B["liga"] + 0.05, B["testa"] - 0.3, 60, 0.11, 2400)
    place(sfx, sub_hit(0.55, 1.2), B["testa"] - 0.25); place(mus, bell(hz("F5"), 0.07), B["testa"] - 0.2, 0.3)
    ticks_for(sfx, B["livros0"] - 0.05, B["livros0"] + 0.65, 18, 0.10, 2000)
    place(mus, pluck(hz("Eb4"), 0.25, 0.9, 0.7), B["livros0"] + 0.9, -0.3)   # Jonah: the odd one out
    place(sfx, rev_swell(0.85, [hz("D3"), hz("A3")], 0.35), B["naz0"] - 0.85)
    place(sfx, sub_hit(0.8, 1.2), B["naz0"] - 0.01)
    # ---------------- NAZARÉ: intimate
    hN = [(B["naz0"], "Bb"), (B["isa"], "F"), (B["virgem"], "F"), (B["virgem"] + 4 * BEAT, "C")]
    pads(mus, hN, B["votes0"], 0.30, 0.75)
    ostinato(pul, B["naz0"] + 0.2, B["votes0"], hN, 0.07, bright=0.8, every=2)
    place(mus, bell(hz("F5"), 0.09), B["naz_lab"], -0.2)
    place(mus, shimmer(2.2, 1046, 2093, 0.05), B["virgem"] - 0.1, 0.0); place(mus, bell(hz("C6"), 0.07), B["virgem"] + 0.8, 0.3)
    # ---------------- VOTES: 333
    hV = [(B["votes0"], "Dm"), (B["votes0"] + 4 * BEAT, "Bb")]
    pads(mus, hV, B["km0"], 0.30)
    ostinato(pul, B["votes0"], B["km0"], hV, 0.14)
    ticks_for(sfx, B["votes0"] + 0.1, B["votes0"] + 1.4, 34, 0.12, 2500)
    place(sfx, sub_hit(0.6, 1.0), B["votes0"] + 1.4); place(mus, bell(hz("D6"), 0.07), B["votes0"] + 1.42)
    # ---------------- 111 km: the flight
    hK = [(B["km0"], "Dm"), (B["km0"] + 2 * BEAT, "C"), (B["km0"] + 4 * BEAT, "Bb"), (B["km_land"] - 0.2, "A"), (B["km_land"] + 0.4, "Dm")]
    pads(mus, hK, B["magos0"], 0.36)
    ostinato(pul, B["km0"], B["magos0"], hK, 0.22, bright=1.1)
    drums(sfx, B["km0"], B["km_land"] + 0.3, 0.75)
    place(sfx, whoosh(B["km_land"] - B["km_go"] + 0.2, 0.7, True), B["km_go"] - 0.1)
    ticks_for(sfx, B["km_go"], B["km_land"], 40, 0.10, 2700)
    place(sfx, sub_hit(0.9), B["km_land"]); place(mus, bell(hz("A5"), 0.08), B["km_land"] + 0.02, 0.2)
    # ---------------- MAGOS: the star (Bb major colour)
    hM = [(B["magos0"], "Bb"), (B["jer"], "F")]
    pads(mus, hM, B["clipJ0"], 0.34, 0.95)
    ostinato(pul, B["magos0"], B["clipJ0"], hM, 0.10, every=2)
    place(mus, shimmer(1.6, 1175, 2350, 0.07), B["magos0"] + 0.1, -0.2)
    for k, nn in enumerate(["F5", "Bb5", "D6"]): place(mus, bell(hz(nn), 0.05), B["magos0"] + 0.2 + 0.35 * k, -0.4 + 0.4 * k)
    # ---------------- HERODES: tension, heartbeat, riser into the answer
    hJ = [(B["clipJ0"], "Gm"), (B["herodes"] + 0.6, "Eb/D"), (B["resposta"] - 0.4, "A")]
    pads(mus, hJ, B["esc0"], 0.30, 0.7)
    ostinato(pul, B["clipJ0"], B["esc0"], hJ, lambda t: 0.06 + 0.10 * np.clip((t - B["clipJ0"]) / 4, 0, 1), bright=0.75)
    drums(sfx, B["clipJ0"] + 0.2, B["esc0"] - 0.2, 0.30, "heart")
    place(sfx, riser(1.6, 0.28), B["esc0"] - 1.6)
    # ---------------- "EM BELÉM. PORQUE ASSIM ESTÁ ESCRITO."
    hE = [(B["esc0"], "Dm"), (B["assim"], "Bb"), (B["esta"], "Gm"), (B["escr"], "A"), (B["escr"] + 0.6, "Dm")]
    pads(mus, hE, B["egy0"], 0.42, 1.05)
    ostinato(pul, B["esc0"], B["egy0"], hE, 0.18, bright=1.1)
    place(sfx, sub_hit(0.8), B["esc_land"] - 0.01); place(sfx, whoosh(0.5, 0.4, True), B["esc0"])
    for k, tw in enumerate((B["assim"], B["esta"], B["escr"])):
        place(sfx, taiko(0.55 + 0.12 * k, 60 - 4 * k), tw - 0.06); place(sfx, sub_hit(0.25 + 0.15 * k, 1.0), tw - 0.06)
    place(sfx, braam(0.38, 2.2), B["escr"] + 0.25); place(mus, bell(hz("D6"), 0.07), B["escr"] + 0.3)
    ticks_for(sfx, B["clipB0"] + 0.95, B["clipB0"] + 1.85, 22, 0.10, 2400)
    # ---------------- EGYPT: flight (drums) then the Nile (Eb over D, Phrygian colour)
    hG = [(B["egy0"], "Dm"), (B["egy0"] + 2 * BEAT, "Eb/D"), (B["clipE0"], "Eb/D"), (B["clipE0"] + 4 * BEAT, "Dm")]
    pads(mus, hG, B["volta0"], 0.32, 0.85)
    ostinato(pul, B["egy0"], B["volta0"], hG, lambda t: 0.18 if t < B["clipE0"] else 0.09)
    drums(sfx, B["egy0"], B["clipE0"] - 0.1, 0.6)
    place(sfx, whoosh(B["clipE0"] - B["egy0"], 0.6, True), B["egy0"])
    place(sfx, sub_hit(0.7), B["clipE0"] - 0.01)
    ticks_for(sfx, B["clipE0"] + 1.15, B["clipE0"] + 2.0, 18, 0.09, 2300)
    # ---------------- RETURN + "o versículo mais conectado da Bíblia inteira?" (suspense on the dominant)
    hR = [(B["volta0"], "Gm"), (B["dome0"], "A")]
    pads(mus, hR, B["menino"], 0.34, 0.8)
    ostinato(pul, B["volta0"], B["is96"], hR, lambda t: 0.14 * (1 - np.clip((t - B["dome0"]) / 1.2, 0, 1)) + 0.03)
    place(sfx, whoosh(1.4, 0.45, True), B["volta0"] + 0.05)
    place(sfx, riser(B["is96"] - B["volta0"], 0.22), B["volta0"])
    place(sfx, sub_hit(0.8, 1.4), B["is96"] - 0.03); place(mus, shimmer(2.0, 880, 1760, 0.07), B["is96"] - 0.1)
    ticks_for(sfx, B["is96"] + 0.2, B["is96"] + 1.1, 24, 0.09, 2500)
    # ---------------- "Porque um menino nos nasceu": D MAJOR
    hP = [(B["menino"], "D"), (B["clipP0"] + 2 * BEAT, "G"), (B["depois"] + 4 * BEAT, "D"), (B["salv"] - 0.3, "A"), (B["salv"], "D")]
    pads(mus, hP, B["final0"], 0.55, 1.1)
    ostinato(pul, B["menino"] + 0.4, B["final0"], hP, lambda t: 0.08 + 0.10 * np.clip((t - B["menino"]) / 5, 0, 1), bright=1.05)
    for k, nn in enumerate(["D6", "A5", "F#5", "D5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.06, 3.0), B["menino"] + 0.1 + k * 0.38, -0.6 + 0.24 * k)
    place(sfx, sub_hit(0.6), B["menino"] - 0.02)
    place(mus, shimmer(1.4, 1175, 2350, 0.06), B["menino"] + 0.4)
    place(sfx, sub_hit(0.5, 1.2), B["clipP0"] - 0.01); place(sfx, whoosh(0.6, 0.35, False), B["clipP0"] - 0.2)
    ticks_for(sfx, B["depois"], B["depois"] + 0.9, 24, 0.10, 2400)
    drums(sfx, B["depois"] + 1.0, B["salv"] - 0.2, 0.22)
    place(sfx, rev_swell(1.0, [hz("A3"), hz("E4")], 0.30), B["salv"] - 1.0)
    place(sfx, sub_hit(0.45), B["salv"] - 0.06); place(sfx, braam(0.30, 2.4, 36.71), B["final0"] - 0.35)
    for k, nn in enumerate(["D5", "F#5", "A5", "D6"]): place(mus, bell(hz(nn), 0.06, 3.2), B["salv"] + 0.05 + 0.22 * k, -0.4 + 0.27 * k)
    ticks_for(sfx, B["salv"] + 0.7, B["salv"] + 1.6, 20, 0.08, 2400)
    # ---------------- FINAL: resolve, the two title hits, tail
    hF = [(B["final0"], "D"), (B["antes"] + 2 * BEAT, "G"), (B["ja"], "D")]
    pads(mus, hF, DUR + 0.6, 0.60, 1.15)
    ostinato(pul, B["final0"], B["ja"] + 1.6, hF, lambda t: 0.16 * (1 - np.clip((t - B["ja"]) / 1.6, 0, 1)), bright=1.05)
    drums(sfx, B["final0"], B["ja"] - 0.1, 0.35)
    place(sfx, sub_hit(0.7), B["antes"] - 0.02); place(sfx, taiko(0.8, 58), B["antes"] - 0.02)
    place(sfx, sub_hit(1.0), B["ja"] - 0.02); place(sfx, braam(0.45, 2.6), B["ja"] - 0.02)
    place(mus, bell(hz("D5"), 0.09, 4.0), B["ja"], 0.0); place(mus, bell(hz("A5"), 0.07, 4.0), B["ja"] + 0.45, 0.25)
    chord(mus, ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], B["ja"] - 0.05, DUR - B["ja"] + 0.6, 0.55, a=0.4, r=1.6, bright=1.15)
    # ---------------- space + bus EQ
    mus = reverb(mus, 3.6, 0.40); pul = reverb(pul, 1.8, 0.22); sfx = reverb(sfx, 1.4, 0.16)
    b, a = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b, a, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(pul), eq(sfx)


MUS_GAIN, PUL_GAIN, SFX_GAIN = 0.17, 0.19, 0.28


def read_mono(p):
    with wave.open(str(p)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        assert w.getframerate() == SR
    return x


def mixdown():
    mus, pul, sfx = build()
    voice = read_mono(WORK / "narr.wav"); v = np.zeros(N, np.float32); v[:len(voice)] = voice[:N]
    env = np.sqrt(signal.lfilter([1 - 0.995], [1, -0.995], v ** 2))
    d = np.clip(env / 0.02, 0, 1)
    duck = np.empty_like(d); g = 0.0
    a_dn = np.exp(-1 / (0.35 * SR)); a_up = np.exp(-1 / (0.03 * SR))
    for blk in range(0, N, 480):
        target = float(d[blk:blk + 480].max())
        g = target if target > g else g * a_dn ** 480 + target * (1 - a_dn ** 480)
        duck[blk:blk + 480] = g
    duck = signal.lfilter([1 - a_up], [1, -a_up], duck)
    mg = (1 - 0.68 * duck).astype(np.float32)          # music and pulse dip under the voice
    sg = (1 - 0.55 * duck).astype(np.float32)          # hits dip a little less (they mark the picture)
    music = (mus * MUS_GAIN + pul * PUL_GAIN) * mg[None, :] + sfx * SFX_GAIN * sg[None, :]
    out = music + np.stack([v, v])
    import soundfile as sf
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", DUR)
