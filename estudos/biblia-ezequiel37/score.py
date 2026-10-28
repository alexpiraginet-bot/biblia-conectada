#!/usr/bin/env python3
"""Original score + sound design for "Cada osso a seu osso" (video 10, v3), synthesized with the instruments of video 1
(sound.py, copied verbatim) plus a plucked string for the living part. The valley is D minor (drone, desert wind, the
question left hanging); the breath turns it to D MAJOR on "entrou" (the series' Picardy third), and from there a light
plucked ostinato follows the chords: the links ring as bells, the water rises with three splashes, the river of life
resolves in D major. Effects have a visible cause on screen (bones clacking as they fly together, the tremor, the four
winds, the water). Beats follow the narration timeline (renders/.film/narr.json) and the same word rule as Main.tsx.

  python3 score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import json, re, unicodedata
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

from sound import SR, rng, hz, place, chord, sub_hit, braam, riser, whoosh, bell, tick, shimmer, reverb

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
NJ = json.load(open(WORK / "narr.json"))
TAIL = 3.4                                       # same tail as tools/motion_data.py (end card)
DUR = NJ["duration"] + TAIL
N = int(SR * (DUR + 0.5))
LN = {L["i"]: L for L in NJ["lines"]}
T = {i: L["t0"] for i, L in LN.items()}
LE = lambda i: LN[i]["t1"]
FPS = 30


def nrm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))


def W(i, word, nth=0):
    """start time of the nth spoken word of line i that starts with `word` (same rule as Main.tsx wordT)"""
    hits = [w for w in LN[i]["words"] if nrm(w["w"]).startswith(nrm(word))]
    return (hits[nth] if len(hits) > nth else hits[0] if hits else {"t0": T[i]})["t0"]


def scene0(i):
    """frame time where the scene of line i starts in Main.tsx (line start - 0.18 s, rounded to frames)"""
    return round((T[i] - 0.18) * FPS) / FPS


V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"],
     "A": ["A1", "E2", "A2", "C#3", "E3"], "Dlow": ["D1", "A1", "D2", "A2"],
     "D": ["D2", "A2", "D3", "F#3", "A3", "D4"], "G": ["G1", "D2", "G2", "B2", "D3", "G3"], "Bm": ["B1", "F#2", "B2", "D3", "F#3"],
     "Em": ["E2", "B2", "E3", "G3", "B3"], "C": ["C2", "G2", "C3", "E3", "G3"]}
ARP = {"D": ["D5", "A4", "F#5", "A4", "D5", "E5", "F#5", "A5"], "G": ["G4", "D5", "B4", "D5", "G5", "F#5", "D5", "B4"],
       "A": ["A4", "E5", "C#5", "E5", "A5", "G5", "E5", "C#5"], "Bm": ["B4", "F#5", "D5", "F#5", "B5", "A5", "F#5", "D5"],
       "Em": ["E5", "B4", "G5", "B4", "E5", "F#5", "G5", "B5"]}


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)


def pluck(f, amp=1.0, dur=1.4):
    """Karplus-Strong string: the bright, simple voice of the drawings"""
    n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p).astype(np.float64); out = np.zeros(n)
    for k in range(n):
        out[k] = buf[k % p]
        buf[k % p] = 0.5 * (buf[k % p] + buf[(k + 1) % p]) * 0.996
    t = np.arange(n) / SR
    return (out * np.exp(-t / 0.6) * amp).astype(np.float32)


PL = {}


def pl(note, amp):
    if note not in PL: PL[note] = pluck(hz(note))
    return PL[note] * amp


def arp(buf, name, t0, t1, step=0.22, amp=0.05):
    t, k = t0, 0
    while t < t1:
        place(buf, pl(ARP[name][k % 8], amp * (1.0 if k % 4 == 0 else 0.7)), t, -0.5 + (k % 8) / 7)
        t += step; k += 1


def clack(amp=1.0):
    """a bone landing on a bone: short hollow knock"""
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = rng.uniform(900, 1600)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + 0.6 * np.sin(2 * np.pi * f * 2.3 * t) * np.exp(-t / 0.006)
    x += rng.normal(0, 1, n) * np.exp(-t / 0.003) * 0.5
    return (x * amp).astype(np.float32)


def noise_bed(dur, lo, hi, amp, fade=0.8):
    n = int(dur * SR); b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    x = signal.lfilter(b, a, rng.normal(0, 1, n)).astype(np.float32)
    t = np.arange(n) / SR
    env = np.clip(t / fade, 0, 1) * np.clip((dur - t) / fade, 0, 1)
    wob = 1 + 0.35 * np.sin(2 * np.pi * 0.23 * t) + 0.2 * np.sin(2 * np.pi * 0.61 * t + 1)
    return x * env * wob * amp


def splash(amp=1.0, f0=500):
    n = int(0.7 * SR); t = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    b, a = signal.butter(2, [f0 / (SR / 2), min(0.99, f0 * 8 / (SR / 2))], "band")
    x = signal.lfilter(b, a, nz) * np.exp(-t / 0.16)
    x += 0.5 * np.sin(2 * np.pi * (f0 * 0.5) * t * (1 + 2 * t)) * np.exp(-t / 0.08)
    return (x * amp).astype(np.float32)


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    # ---- "A mão do SENHOR": a low D already breathing at frame 0, a shimmer rising with the light; wind of the valley
    chord(mus, V["Dlow"], 0.0, T[4] + 0.3, 0.38, a=0.8, r=0.6, bright=0.65)
    place(mus, shimmer(2.4, 440, 1320, 0.05), 0.1, 0.0)
    place(sfx, noise_bed(T[7] - 0.2, 180, 1100, 0.03, 1.2), T[2] - 0.3, 0.0)
    ch(mus, "Dm", T[2] - 0.1, T[4] + 0.1, 0.16, a=1.2, r=0.5, bright=0.8)
    # the bones: dry rattles as the camera descends; "sequíssimos" a dry click
    for k in range(12):
        place(sfx, clack(0.035 + 0.03 * rng.random()), T[2] + 0.4 + rng.uniform(0, LE(3) - T[2] - 0.4), rng.uniform(-0.8, 0.8))
    place(sfx, clack(0.16), W(3, "sequissimos") + 0.05, 0.3)
    # ---- the question: the music stops; only the voice, rings of light, a single bell on "viverão"
    place(mus, bell(hz("D5"), 0.05, 3.6), W(4, "viverao") + 0.03, 0.0)
    chord(mus, ["D1", "A1"], T[5] - 0.2, T[6] - T[5] + 0.6, 0.26, a=0.6, r=0.5, bright=0.6)          # the answer, humble
    # ---- "Profetiza": Bb breathing; "palavra": the ring (shimmer) runs through the bones with a soft hit
    ch(mus, "Bb", T[6] - 0.05, W(7, "tremor") - 0.2, 0.30, a=0.5, r=0.4, bright=0.9)
    place(sfx, sub_hit(0.28, 1.2), W(6, "palavra") - 0.03)
    place(mus, shimmer(2.2, 660, 1980, 0.05), W(6, "palavra"), 0.0)
    # ---- tremor: low rumble + hit; the bones fly together (Main.tsx: from "aproximaram", each lands in 0..40 frames)
    tr = W(7, "tremor")
    place(sfx, sub_hit(0.55, 1.6), tr - 0.03)
    place(sfx, noise_bed(1.1, 40, 170, 0.32, 0.12), tr - 0.02)
    jn = W(7, "aproximaram")
    for k in range(60):
        place(sfx, clack(0.09 + 0.06 * rng.random()), jn + rng.uniform(0.15, 1.35), rng.uniform(-0.7, 0.7))
    ch(mus, "Gm", tr - 0.05, T[8] + 0.1, 0.30, a=0.3, r=0.4, bright=0.85)
    place(mus, bell(hz("G5"), 0.045, 3.0), W(7, "osso", 2) + 0.05, 0.2)
    # ---- nerves, flesh, skin: three soft hits and a rising third; "porém não havia espírito": everything thins
    for k, wd in enumerate(("nervos", "carne", "pele")):
        place(sfx, sub_hit(0.16, 0.7), W(8, wd) - 0.02)
        place(mus, bell(hz(["D5", "F5", "A5"][k]), 0.035, 2.2), W(8, wd) + 0.02, -0.3 + 0.3 * k)
    chord(mus, ["D1", "A1", "D2"], W(8, "porem") - 0.1, T[9] - W(8, "porem") + 0.5, 0.30, a=0.6, r=0.4, bright=0.55)
    # ---- the four winds: four whooshes crossing, a riser into "vivam"
    for k in range(4):
        place(sfx, whoosh(1.6, 0.18, True), T[9] - 0.1 + 0.25 * k, [-0.8, 0.8, -0.5, 0.5][k])
    place(sfx, riser(max(0.6, W(9, "vivam") - T[9]), 0.12), T[9])
    ch(mus, "A", T[9] - 0.05, W(10, "entrou") - 0.05, 0.34, a=0.3, r=0.3, bright=1.0)
    # ---- D MAJOR on "entrou" (the series' Picardy third); bells on "viveram"; the army stands: a wall of plucks
    en, vi, ar = W(10, "entrou"), W(10, "viveram"), W(10, "exercito")
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], en - 0.15, T[11] - en + 0.6, 0.40, a=0.4, r=0.5, bright=1.0)
    ch(mus, "D", en - 0.1, T[11] + 0.2, 0.34, a=0.5, r=0.7, bright=1.1)
    place(sfx, braam(0.30, 2.4), en - 0.12); place(sfx, sub_hit(0.6), en - 0.1)
    place(mus, shimmer(2.6, 880, 1760, 0.045), en, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.05, 3.2), vi + 0.03 + 0.12 * r_, -0.5 + 0.33 * r_)
    arp(mus, "D", ar - 0.1, T[11], step=0.11, amp=0.03)
    for k in range(40):
        place(sfx, tick(0.025, 2400 + rng.integers(-400, 400)), ar + k * 0.05, rng.uniform(-0.9, 0.9))
    # ---- the bridge: ticks with the counter 37 -> 47, a bell when it lands; Bm
    s11, s12 = T[11] + 0.2, T[12] - 8 / FPS
    for k in range(10):
        place(sfx, tick(0.06, 1800 + 80 * k), s11 + (s12 - s11) * (k + 0.5) / 10, -0.5 + k / 9)
    ch(mus, "Bm", T[11] - 0.05, T[12] + 0.1, 0.32, a=0.4, r=0.4, bright=0.95)
    place(mus, bell(hz("B5"), 0.05, 3.0), s12, 0.0)
    # ---- the threshold: G; the thread of water (a thin trickle), then the water rises with three splashes
    ch(mus, "G", T[12] - 0.05, W(13, "tornozelos") - 0.05, 0.36, a=0.4, r=0.4, bright=1.0)
    place(sfx, noise_bed(LE(14) - W(12, "aguas") + 1.0, 400, 3000, 0.045, 0.8), W(12, "aguas"), 0.0)
    arp(mus, "G", T[13], W(13, "tornozelos"), step=0.22, amp=0.035)
    for k, wd in enumerate(("tornozelos", "joelhos", "cintura")):
        place(sfx, splash(0.28 + 0.06 * k, 420 + 160 * k), W(13, wd) - 0.03, -0.3 + 0.3 * k)
        place(mus, bell(hz(["G5", "B5", "D6"][k]), 0.04, 2.6), W(13, wd) + 0.03, -0.3 + 0.3 * k)
    ch(mus, "A", W(13, "tornozelos") - 0.1, W(14, "rio") - 0.05, 0.36, a=0.2, r=0.3, bright=1.0)
    arp(mus, "A", W(13, "tornozelos"), W(14, "rio"), step=0.2, amp=0.04)
    # ---- the river: D, the camera goes under ("nado"): a low swell and everything softens
    rio, nado = W(14, "rio"), W(14, "nado")
    place(sfx, splash(0.45, 300), rio - 0.05, 0.0)
    ch(mus, "D", rio - 0.1, T[15] + 0.1, 0.42, a=0.3, r=0.6, bright=1.05)
    place(mus, shimmer(2.0, 880, 1760, 0.04), rio, 0.0)
    place(sfx, whoosh(1.8, 0.16, False), nado + 0.5, 0.0)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], nado + 0.6, DUR - nado, 0.22, a=1.2, r=2.5, bright=0.8)
    # ---- "toda alma vivente... viverá": G -> D, bells; the close, calm in D major
    ch(mus, "G", T[15] - 0.05, W(15, "vivera") - 0.1, 0.34, a=0.4, r=0.4, bright=1.0)
    ch(mus, "D", W(15, "vivera") - 0.1, DUR, 0.34, a=0.5, r=2.6, bright=1.05)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.045, 3.4), W(15, "vivera") + 0.05 + 0.14 * r_, -0.5 + 0.33 * r_)
    arp(mus, "D", T[16], DUR - 1.4, step=0.24, amp=0.03)
    place(mus, bell(hz("A5"), 0.035, 3.0), W(16, "vale") + 0.03, -0.3)
    place(mus, bell(hz("D6"), 0.05, 4.5), W(16, "rio") + 0.05, 0.3)
    mus, sfx = reverb(mus, 3.4, 0.38), reverb(sfx, 1.4, 0.16)
    # phone-friendly bus EQ (as video 1): no rumble below 32 Hz, a pocket at 2.5 kHz for the voice
    b_, a_ = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b_, a_, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.20, 0.30


def mixdown():
    mus, sfx = build()
    voice, sr = sf.read(str(WORK / "narr.wav"), dtype="float32"); assert sr == SR
    voice = voice.mean(1) if voice.ndim == 2 else voice
    v = np.zeros(N, np.float32); v[:len(voice)] = voice[:N]
    env = np.sqrt(signal.lfilter([1 - 0.995], [1, -0.995], v ** 2))
    thr = 0.02; d = np.clip(env / thr, 0, 1)
    duck = np.empty_like(d); g = 0.0
    a_dn = np.exp(-1 / (0.35 * SR)); a_up = np.exp(-1 / (0.03 * SR))
    for blk in range(0, N, 480):
        target = float(d[blk:blk + 480].max())
        g = target if target > g else g * a_dn ** 480 + target * (1 - a_dn ** 480)
        duck[blk:blk + 480] = g
    duck = signal.lfilter([1 - a_up], [1, -a_up], duck)
    mgain = (1 - 0.80 * duck).astype(np.float32)
    music = (mus * MUS_GAIN + sfx * SFX_GAIN) * mgain[None, :]
    out = music + np.stack([v, v])
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music.T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", round(DUR, 2))
