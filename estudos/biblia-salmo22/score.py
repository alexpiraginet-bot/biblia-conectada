#!/usr/bin/env python3
"""Score + sound design for "Não foi um grito. Foi uma citação." (video 7), with the instruments of video 1 (sound.py).

Second version (25/10, 15:00: the first one was almost all below 300 Hz and vanished on a phone). A breathing organ bed in
D minor from frame 0, audible in the mids; the heartbeat as an accent that slows through the pairs; a bell when each
gospel verse answers; a dominant and a long riser as the psalm scrolls; 0.8 s of silence; D MAJOR full on "Está
consumado", held to the end with bells. Ducked under the voice as in the other films.

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


V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
     "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"],
     "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"]}


def up(notes):                                   # the same voicing one octave higher (mids a phone can play)
    return [n[:-1] + str(int(n[-1]) + 1) for n in notes]


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)
    chord(buf, up(V[name][1:]), t_on, max(0.3, t_off - t_on), amp * 0.5, **{**kw, "bright": kw.get("bright", 1.0) * 1.1})


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
    tCit, tSalmo, tFez, tCons, tTudo = W(2, "citacao"), W(3, "salmo"), W(10, "fez"), T[11], W(12, "tudo")
    # ---- a bed you can hear on a phone: breathing organ in D minor from frame 0 (mids and highs, as videos 1 and 6),
    #      plus a sub under it; the heartbeat is an accent on top, slowing down through the pairs
    chord(mus, ["D1", "D2"], 0.0, T[10] - 0.1, 0.30, a=1.5, r=0.6, bright=0.55)
    ch(mus, "Dm", 0.0, T[3] + 0.2, 0.34, a=1.4, r=0.8, bright=0.95)
    place(mus, shimmer(2.4, 1175, 2350, 0.03), 0.1, 0.3)
    heartbeat(sfx, 0.4, T[10] - 0.5, amp=0.11)
    # ---- "Foi uma citação.": one hit, a bell, the chord brightens
    place(sfx, sub_hit(0.30, 1.4), tCit - 0.04)
    place(mus, bell(hz("D5"), 0.05, 3.2), tCit + 0.02, 0.0)
    place(mus, shimmer(2.0, 880, 1760, 0.03), tCit + 0.05, 0.0)
    # ---- the first pair and "mil anos antes": VI, then iv, slow and wide
    ch(mus, "Bb", T[3] - 0.05, T[5] + 0.1, 0.36, a=0.8, r=0.8, bright=0.95)
    place(mus, bell(hz("A5"), 0.04, 3.0), tSalmo + 0.02, -0.2)
    place(sfx, whoosh(1.0, 0.10, True), tSalmo + 0.9, 0.3)
    place(mus, bell(hz("F5"), 0.04, 3.0), tSalmo + 1.15, 0.3)
    # ---- the four pairs: the chord walks (Gm, Dm, Bb, F); a tick when the bundle lands, a bell when the gospel answers
    for n, li in enumerate((5, 6, 7, 8)):
        ch(mus, ["Gm", "Dm", "Bb", "F"][n], T[li] - 0.05, (T[li + 1] if li < 8 else T[9]) + 0.1, 0.36, a=0.4, r=0.6, bright=0.95)
        place(sfx, whoosh(0.8, 0.08, True), T[li] + 0.4, -0.3 + 0.2 * n)
        place(sfx, tick(0.05, 1900), T[li] + 1.15, 0.0)
        place(mus, bell(hz(["A4", "D5", "F5", "A5"][n]), 0.04, 2.8), T[li] + 1.18, -0.3 + 0.2 * n)
    # ---- the psalm scrolls: dominant held, a long riser to the last line
    ch(mus, "A", T[9] - 0.05, tFez + 0.5, 0.40, a=0.4, r=0.5, bright=1.0)
    place(sfx, riser(max(0.8, tFez - T[9] - 0.2), 0.12), T[9] + 0.2)
    place(sfx, whoosh(1.2, 0.10, False), T[9] + 0.2, 0.0)
    place(mus, bell(hz("A5"), 0.05, 3.4), tFez + 0.03, 0.0)
    place(sfx, sub_hit(0.3, 1.2), tFez - 0.02)
    # ---- 0.8 s of silence, a swell back in, then D MAJOR on "Está consumado", full, held to the end
    place(sfx, riser(max(0.5, tCons - tFez - 0.9), 0.10), tFez + 0.9)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], tCons - 0.2, DUR - tCons + 0.8, 0.42, a=0.5, r=3.0, bright=1.0)
    ch(mus, "D", tCons - 0.12, DUR - tCons + 0.8, 0.52, a=0.7, r=3.0, bright=1.12)
    place(sfx, braam(0.40), tCons - 0.18); place(sfx, sub_hit(0.75, 2.2), tCons - 0.12)
    place(mus, shimmer(3.6, 880, 1760, 0.05), tCons + 0.2, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.055, 4.0), LE(11) + 0.1 + 0.22 * r_, -0.5 + 0.33 * r_)
    place(mus, bell(hz("A5"), 0.045, 3.6), tTudo + 0.03, 0.2)
    place(mus, shimmer(2.6, 1175, 2350, 0.04), tTudo + 0.05, 0.0)
    place(mus, bell(hz("D6"), 0.05, 4.5), LE(13) + 0.1, -0.2)
    mus, sfx = reverb(mus, 4.0, 0.42), reverb(sfx, 1.8, 0.18)
    gate = np.ones(N, np.float32)                     # the short silence between "ele assim fez" and "Está consumado"
    g0, g1, g2 = int((tFez + 0.35) * SR), int((tFez + 0.65) * SR), int((tFez + 0.9) * SR)
    gate[g0:g1] = np.linspace(1, 0, g1 - g0); gate[g1:g2] = 0.0
    mus *= gate[None, :]; sfx[:, g0:g2] *= gate[g0:g2]
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
