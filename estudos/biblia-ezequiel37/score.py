#!/usr/bin/env python3
"""Original score + sound design for "Do vale ao rio" (video 10, version 2), synthesized with the instruments of video 1
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
TAIL = 3.0                                       # same tail as tools/motion_data.py (end card)
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
    # ---- the valley (D minor): drone breathing at frame 0, desert wind, bells on "Deus" and "vale"
    chord(mus, V["Dlow"], 0.0, T[3] + 0.4, 0.40, a=0.15, r=0.6, bright=0.7)
    ch(mus, "Dm", 0.0, T[3] + 0.2, 0.26, a=1.0, r=0.5, bright=0.8)
    place(sfx, noise_bed(T[8], 250, 1400, 0.045, 1.0), 0.0, 0.0)
    place(sfx, sub_hit(0.22, 1.2), 0.02)
    place(mus, bell(hz("A4"), 0.05, 3.0), W(1, "deus") + 0.03, -0.3)
    place(mus, bell(hz("F5"), 0.045, 3.0), W(1, "escolheu") + 0.1, 0.3)
    # "Ezequiel 37" pops on screen
    place(sfx, sub_hit(0.30, 1.0), T[2] - 0.02)
    place(mus, bell(hz("D5"), 0.06, 3.2), T[2] + 0.05, 0.0)
    # ---- the hand of the Lord: a column of light (shimmer rising), Bb; the camera opens on "vale"
    ch(mus, "Bb", T[3] - 0.05, T[4] + 0.1, 0.32, a=0.5, r=0.4, bright=0.9)
    place(mus, shimmer(2.6, 880, 1760, 0.05), W(3, "mao") - 0.1, 0.0)
    place(sfx, whoosh(1.2, 0.12, False), W(3, "vale") - 0.1, 0.2)
    # ---- not punishment, not chance (two low hits); the hand of God resolves to F major with bells
    ch(mus, "Gm", T[4] - 0.05, W(4, "mao") - 0.1, 0.30, a=0.3, r=0.3, bright=0.85)
    place(sfx, sub_hit(0.22, 0.9), W(4, "castigo") - 0.05)
    place(sfx, sub_hit(0.22, 0.9), W(4, "acaso") - 0.05)
    chord(mus, ["F2", "C3", "F3", "A3", "C4"], W(4, "mao") - 0.15, T[5] - W(4, "mao") + 0.3, 0.40, a=0.3, r=0.5, bright=1.05)
    for r_, nn in enumerate(["F5", "A5", "C6"]):
        place(mus, bell(hz(nn), 0.045, 3.0), W(4, "mao") + 0.05 + 0.12 * r_, -0.4 + 0.4 * r_)
    # ---- Jesus led into the desert: the wind again, Dm -> Bb, a bell on "deserto"
    ch(mus, "Dm", T[5] - 0.05, W(5, "levado") - 0.05, 0.30, a=0.4, r=0.4, bright=0.85)
    ch(mus, "Bb", W(5, "levado") - 0.1, T[6] + 0.1, 0.32, a=0.3, r=0.4, bright=0.9)
    place(sfx, whoosh(1.6, 0.10, True), W(5, "levado"), -0.3)
    place(mus, bell(hz("D5"), 0.045, 3.0), W(5, "deserto") + 0.05, 0.3)
    # ---- "não são destino. São passagem.": the camera climbs the path (whoosh), C lifts, a bell on "passagem"
    ch(mus, "C", T[6] - 0.05, T[7] + 0.1, 0.32, a=0.3, r=0.4, bright=1.0)
    place(sfx, whoosh(max(1.0, LE(6) - T[6]), 0.10, True), T[6], 0.0)
    place(mus, bell(hz("E5"), 0.05, 3.0), W(6, "passagem") + 0.03, 0.0)
    # ---- God asks from the light (shimmer rings), the bones tremble on "ossos"
    chord(mus, ["D1", "A1", "D2"], T[7] - 0.1, T[8] - T[7] + 0.4, 0.34, a=0.4, r=0.3, bright=0.7)
    place(mus, shimmer(2.0, 1175, 2350, 0.045), W(7, "pergunta") - 0.1, 0.0)
    tr = W(7, "ossos")
    place(sfx, sub_hit(0.45, 1.4), tr - 0.03)
    place(sfx, noise_bed(1.0, 40, 180, 0.30, 0.15), tr - 0.02)
    # ---- the bones fly together (Main.tsx S_Life: assemble = line 8 start - 14 frames; a bone lands +16..+42 frames),
    # the four winds on "sopro", D MAJOR on "devolve", life on "vida"
    asm = T[8] - 14 / FPS
    for k in range(70):
        place(sfx, clack(0.10 + 0.05 * rng.random()), asm + (16 + rng.uniform(0, 26)) / FPS, rng.uniform(-0.7, 0.7))
    for k in range(5):
        place(sfx, clack(0.18), asm + (38 + rng.uniform(0, 8)) / FPS, -0.6 + 0.3 * k)
    so, dv, vi = W(8, "sopro"), W(8, "devolve"), W(8, "vida")
    for k in range(4):
        place(sfx, whoosh(1.3, 0.20, True), so - 0.25 + 0.08 * k, [-0.8, 0.8, -0.5, 0.5][k])
    place(sfx, riser(max(0.3, dv - so + 0.2), 0.12), so - 0.2)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], dv - 0.15, T[9] - dv + 0.5, 0.40, a=0.4, r=0.4, bright=1.0)
    ch(mus, "D", dv - 0.1, T[9] + 0.1, 0.42, a=0.5, r=0.6, bright=1.1)
    place(sfx, braam(0.28, 2.2), dv - 0.12); place(sfx, sub_hit(0.55), dv - 0.1)
    place(mus, shimmer(2.4, 880, 1760, 0.045), dv, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.05, 3.2), vi + 0.03 + 0.12 * r_, -0.5 + 0.33 * r_)
    for k in range(10):
        place(sfx, tick(0.05, 3200 + 200 * k), vi + 0.05 + 0.04 * k, rng.uniform(-0.8, 0.8))
    arp(mus, "D", vi + 0.15, T[9], amp=0.05)
    # ---- chapter 47: ten ticks while the pin slides (Main.tsx S_Ch47: moveAt 4, len = d - 22 frames), Bm
    s9 = scene0(9); d9 = (scene0(10) - s9) * FPS + 8
    ln = max(10, d9 - 22)
    for k in range(10):
        place(sfx, tick(0.06, 1800 + 80 * k), s9 + (4 + (k + 0.5) * ln / 10) / FPS, -0.5 + k / 9)
    ch(mus, "Bm", T[9] - 0.05, T[10] + 0.1, 0.34, a=0.3, r=0.3, bright=0.95)
    place(mus, bell(hz("B5"), 0.05, 3.0), s9 + (4 + ln) / FPS, 0.0)
    # ---- the water leaves the temple (G), then rises: one splash per word, A; D when he swims
    ch(mus, "G", T[10] - 0.1, W(10, "tornozelos") - 0.05, 0.38, a=0.3, r=0.4, bright=1.0)
    place(sfx, noise_bed(LE(11) - T[10] + 0.8, 300, 2600, 0.06, 0.6), T[10] - 0.1, 0.0)
    arp(mus, "G", T[10], W(10, "tornozelos"), amp=0.04)
    for k, wd in enumerate(("tornozelos", "joelhos", "cintura")):
        place(sfx, splash(0.30 + 0.06 * k, 420 + 160 * k), W(10, wd) - 0.03, -0.3 + 0.3 * k)
    ch(mus, "A", W(10, "tornozelos") - 0.1, W(11, "rio") - 0.05, 0.38, a=0.2, r=0.3, bright=1.0)
    arp(mus, "A", W(10, "tornozelos"), W(11, "rio"), amp=0.045)
    place(sfx, splash(0.45, 300), W(11, "rio") - 0.05, 0.0)
    place(sfx, riser(max(0.4, W(11, "rio") - W(10, "tornozelos") - 0.2), 0.08), W(10, "tornozelos"))
    ch(mus, "D", W(11, "rio") - 0.1, T[12] + 0.1, 0.42, a=0.3, r=0.5, bright=1.05)
    place(mus, shimmer(2.0, 880, 1760, 0.04), W(11, "rio"), 0.0)
    arp(mus, "D", W(11, "rio"), T[12], amp=0.045)
    # ---- the same God: G over the valley, the water climbs over it on "rio" (D, braam, bells)
    rio12 = W(12, "rio")
    ch(mus, "G", T[12] - 0.05, rio12 - 0.2, 0.36, a=0.3, r=0.3, bright=1.0)
    ch(mus, "A", rio12 - 0.45, rio12 - 0.05, 0.38, a=0.1, r=0.2, bright=1.05)
    place(sfx, whoosh(1.2, 0.18, True), rio12 - 0.45, 0.0)
    place(sfx, splash(0.35, 360), rio12 + 0.2, 0.0)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], rio12 - 0.1, DUR - rio12, 0.20, a=0.5, r=2.5, bright=1.0)
    ch(mus, "D", rio12 - 0.05, DUR, 0.25, a=0.5, r=2.6, bright=1.05)
    place(sfx, braam(0.22, 2.6), rio12 - 0.12)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.05, 3.6), rio12 + 0.08 + 0.15 * r_, -0.5 + 0.33 * r_)
    arp(mus, "D", rio12 + 0.3, DUR - 1.2, amp=0.035)
    # ---- "o vale é caminho. o rio é promessa." and the call: bells on the words that land
    place(mus, bell(hz("A5"), 0.03, 3.0), W(13, "caminho") + 0.02, -0.3)
    place(mus, bell(hz("D6"), 0.033, 3.4), W(13, "promessa") + 0.02, 0.3)
    place(mus, shimmer(2.6, 880, 1760, 0.025), W(13, "promessa"), 0.0)
    place(sfx, sub_hit(0.25, 1.0), W(14, "eu", 1) - 0.06 if len([w for w in LN[14]["words"] if nrm(w["w"]) == "eu"]) > 1 else W(14, "eu") - 0.06)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.045, 3.2), W(14, "atravessar") + 0.05 + 0.15 * r_, -0.5 + 0.33 * r_)
    place(mus, bell(hz("D6"), 0.06, 4.5), LE(14) + 0.1, -0.2)
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
