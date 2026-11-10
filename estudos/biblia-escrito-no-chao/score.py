#!/usr/bin/env python3
"""Score + sound design of "Escrito no chão" (video 11), with the instruments of video 1 (sound.py): the breathing
organ of the series in D minor, audible from frame 0; stone thuds where a stone is seen (the fist, the stone that
falls, the phone); a riser into Jeremiah; the dominant under the prophecy; D major and running water when the fountain
arrives, held to the end. Ducked under the voice as in the other films. Every cue is timed from narr.json and plan.json.

  python3 -I score.py  -> renders/.film/mix.wav (+ score.wav)
"""
import json, re, sys, unicodedata
from pathlib import Path
import numpy as np
from scipy import signal
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sound import SR, rng, hz, place, chord, sub_hit, riser, whoosh, bell, tick, shimmer, reverb, read_mono

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
NJ = json.load(open(WORK / "narr.json")); PL = json.load(open(WORK / "plan.json"))
DUR = NJ["duration"]
N = int(SR * (DUR + 0.5))
LN = {L["i"]: L for L in NJ["lines"]}
T = {i: L["t0"] for i, L in LN.items()}
SH = {s["id"]: s["t0"] for s in PL["shots"]}
nrm = lambda s: re.sub(r"[^a-z0-9]", "", "".join(c for c in unicodedata.normalize("NFD", s.lower()) if not unicodedata.combining(c)))


def Wd(i, word, nth=0):
    hits = [w for w in LN[i]["words"] if nrm(w["w"]) == nrm(word)]
    return hits[nth]["t0"]


V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"],
     "A": ["A1", "E2", "A2", "C#3", "E3"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4"]}
up = lambda notes: [n[:-1] + str(int(n[-1]) + 1) for n in notes]     # the same voicing an octave higher (a phone can play it)


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)
    chord(buf, up(V[name][1:]), t_on, max(0.3, t_off - t_on), amp * 0.5, **{**kw, "bright": kw.get("bright", 1.0) * 1.1})


def thud(amp=1.0):
    """a stone on packed earth: short sub, a knock, a breath of grit"""
    n = int(0.5 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.09)
    knock = rng.normal(0, 1, n) * np.exp(-t / 0.012); b, a = signal.butter(2, [300 / (SR / 2), 2200 / (SR / 2)], "band"); knock = signal.lfilter(b, a, knock)
    grit = rng.normal(0, 1, n) * np.exp(-((t - 0.07) / 0.09) ** 2); b, a = signal.butter(2, 3000 / (SR / 2), "high"); grit = signal.lfilter(b, a, grit)
    return ((body + 1.6 * knock + 0.25 * grit) * amp).astype(np.float32)


def water(dur, amp=1.0):
    """running water: band noise that bubbles (random slow gains on three bands)"""
    n = int(dur * SR); out = np.zeros(n)
    for lo, hi, g in ((500, 1400, 0.8), (1400, 3800, 1.0), (3800, 9000, 0.5)):
        b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band"); x = signal.lfilter(b, a, rng.normal(0, 1, n))
        m = np.interp(np.arange(n), np.linspace(0, n, max(4, int(dur * 14))), rng.random(max(4, int(dur * 14)))) ** 1.5
        out += g * x * (0.35 + m)
    t = np.arange(n) / SR
    return (out * np.clip(t / 0.25, 0, 1) * np.clip((dur - t) / 0.5, 0, 1) * amp).astype(np.float32)


def build():
    mus = np.zeros((2, N), np.float32); sfx = np.zeros((2, N), np.float32)
    tAdul, tAped, tQ, tDrop = Wd(3, "Adultério"), Wd(3, "apedrejar"), T[6], PL["cues"]["stone"]      # the stone is heard when it is seen landing
    tMas, tJer, t600, tOs, tFonte = T[9], Wd(9, "Jeremias"), Wd(9, "600"), T[10], Wd(10, "fonte")
    tQuem, tSo, tAgua, tNem, tHoje, tSolta, tCta = T[13], Wd(13, "Só"), Wd(13, "água"), T[15], T[16], Wd(16, "Solta"), T[17]
    # ---- the hook: the bed is there on frame 0 (mids, not only sub), a hit under the title, shimmer
    chord(mus, ["D1", "D2"], 0.0, tDrop, 0.30, a=0.25, r=0.4, bright=0.55)
    ch(mus, "Dm", 0.0, T[3] + 0.1, 0.36, a=0.2, r=0.6, bright=0.95)
    place(sfx, sub_hit(0.40, 1.2), 0.02); place(mus, shimmer(2.2, 1175, 2350, 0.035), 0.05, 0.3)
    place(sfx, whoosh(0.5, 0.10, True), SH["s02"] - 0.25, -0.3); place(sfx, tick(0.05, 1900), SH["s03"], 0.2)
    # ---- the scene: the chord walks down as the ring closes; a knock on "Adultério", a stone on "apedrejar"
    ch(mus, "Bb", T[3] - 0.05, tAped + 0.1, 0.38, a=0.3, r=0.5, bright=0.95)
    place(sfx, whoosh(0.5, 0.09, True), SH["s04"] - 0.25, 0.3)
    place(sfx, sub_hit(0.34, 0.9), tAdul - 0.02); place(sfx, thud(0.30), tAped + 0.02, 0.1)
    # ---- "Aquele de vós...": dominant, held breath; the stone falls in the silence after it
    ch(mus, "A", tAped + 0.05, tQ + (LN[6]["t1"] - tQ) + 0.1, 0.40, a=0.4, r=0.35, bright=1.0)
    place(mus, bell(hz("E5"), 0.045, 2.6), tQ + 0.03, -0.2); place(mus, bell(hz("A5"), 0.04, 2.4), Wd(6, "seja") + 0.02, 0.25)
    place(sfx, thud(0.75), tDrop, 0.0); place(sfx, sub_hit(0.42, 1.0), tDrop + 0.01)
    place(sfx, thud(0.28), tDrop + 0.26, -0.5); place(sfx, thud(0.22), tDrop + 0.44, 0.5)      # the others follow
    # ---- the turn: a riser from "Mas" into Jeremiah; bell on the name, tick on the 600 years
    place(sfx, riser(max(0.6, tJer - tMas), 0.12), tMas)
    ch(mus, "Gm", tMas - 0.05, tOs + 0.1, 0.38, a=0.5, r=0.5, bright=0.95)
    place(sfx, sub_hit(0.36, 1.2), tJer - 0.03); place(mus, bell(hz("D5"), 0.06, 3.2), tJer + 0.02, 0.0)
    place(sfx, tick(0.05, 1700), t600, 0.0); place(mus, bell(hz("G5"), 0.04, 2.6), t600 + 0.03, 0.3)
    # ---- the prophecy: dominant, growing; on "a fonte de águas vivas" D major opens and the water is heard for the first time
    ch(mus, "A", tOs - 0.05, tFonte + 0.15, 0.42, a=0.5, r=0.4, bright=1.02)
    place(sfx, riser(max(0.6, tFonte - Wd(10, "pois")), 0.10), Wd(10, "pois"))
    ch(mus, "D", SH["s18"] - 0.05, tQuem + 0.1, 0.46, a=0.35, r=0.6, bright=1.1)
    place(mus, shimmer(1.9, 880, 1760, 0.05), SH["s18"], 0.0); place(sfx, water(SH["s19"] - SH["s18"] + 0.3, 0.16), SH["s18"] - 0.05)
    for r_, nn in enumerate(["D5", "F#5", "A5"]): place(mus, bell(hz(nn), 0.05, 3.0), tFonte + 0.02 + 0.16 * r_, -0.4 + 0.4 * r_)
    # ---- the sermon: back to the dust (G minor, dry) ... and the water takes it: D major, full, to the end
    ch(mus, "Gm", tQuem - 0.05, tAgua, 0.36, a=0.3, r=0.3, bright=0.9)
    place(sfx, thud(0.20), Wd(13, "pó") + 0.02, 0.0); place(sfx, whoosh(0.7, 0.16, False), SH["s22"] - 0.38, 0.0)
    chord(mus, ["D1", "A1", "D2", "A2"], SH["s22"] - 0.05, DUR - SH["s22"] + 0.6, 0.40, a=0.3, r=2.0, bright=1.0)
    ch(mus, "D", SH["s22"] - 0.05, tHoje + 0.1, 0.52, a=0.3, r=0.8, bright=1.12)
    place(sfx, sub_hit(0.5, 1.6), SH["s22"]); place(sfx, water(tNem - SH["s22"] + 0.6, 0.20), SH["s22"] - 0.1)
    place(mus, shimmer(2.6, 880, 1760, 0.05), SH["s22"] + 0.05, 0.0)
    for r_, nn in enumerate(["D5", "A5", "D6"]): place(mus, bell(hz(nn), 0.055, 3.6), tAgua + 0.05 + 0.2 * r_, -0.4 + 0.4 * r_)
    place(mus, bell(hz("F#5"), 0.05, 3.4), tNem + 0.03, -0.2); place(mus, bell(hz("A5"), 0.045, 3.4), Wd(15, "Vai") + 0.02, 0.25)
    # ---- today: the bed thins out, the phone lands on "Solta." ; the call: D major again, a last bell
    ch(mus, "Bb", tHoje - 0.05, tSolta + 0.1, 0.34, a=0.3, r=0.3, bright=0.9)
    place(sfx, thud(0.6), PL["cues"]["phone"], 0.0); place(sfx, tick(0.07, 2600), PL["cues"]["phone"] + 0.01, 0.0)
    ch(mus, "D", tCta - 0.25, DUR - tCta + 0.8, 0.50, a=0.35, r=1.6, bright=1.1)
    place(mus, bell(hz("D5"), 0.05, 3.5), tCta + 0.3, -0.2); place(mus, bell(hz("A5"), 0.045, 3.5), LN[17]["t1"] + 0.05, 0.2)
    mus, sfx = reverb(mus, 3.2, 0.36), reverb(sfx, 1.4, 0.14)
    gate = np.ones(N, np.float32)                               # the held breath: the bed drops out while the stones fall
    g0, g1, g2, g3 = (int(x * SR) for x in (LN[6]["t1"] + 0.02, LN[6]["t1"] + 0.22, tMas - 0.25, tMas))
    gate[g0:g1] = np.linspace(1, 0.12, g1 - g0); gate[g1:g2] = 0.12; gate[g2:g3] = np.linspace(0.12, 1, g3 - g2)
    mus *= gate[None, :]
    b_, a_ = signal.butter(2, 32 / (SR / 2), "high")
    w0 = 2 * np.pi * 2500 / SR; A_ = 10 ** (-4.5 / 40); al = np.sin(w0) / (2 * 0.9)
    pb = np.array([1 + al * A_, -2 * np.cos(w0), 1 - al * A_]); pa = np.array([1 + al / A_, -2 * np.cos(w0), 1 - al / A_])
    eq = lambda x: signal.lfilter(pb / pa[0], pa / pa[0], signal.lfilter(b_, a_, x, axis=1), axis=1).astype(np.float32)
    return eq(mus), eq(sfx)


MUS_GAIN, SFX_GAIN = 0.20, 0.34


def mixdown():
    mus, sfx = build()
    voice = read_mono(WORK / "narr.wav"); v = np.zeros(N, np.float32); v[:len(voice)] = voice[:N]
    env = np.sqrt(signal.lfilter([1 - 0.995], [1, -0.995], v ** 2))
    d = np.clip(env / 0.02, 0, 1)
    duck = np.empty_like(d); g = 0.0
    a_dn = np.exp(-1 / (0.30 * SR)); a_up = np.exp(-1 / (0.03 * SR))
    for blk in range(0, N, 480):
        target = float(d[blk:blk + 480].max())
        g = target if target > g else g * a_dn ** 480 + target * (1 - a_dn ** 480)
        duck[blk:blk + 480] = g
    duck = signal.lfilter([1 - a_up], [1, -a_up], duck)
    music = mus * MUS_GAIN * (1 - 0.84 * duck).astype(np.float32)[None, :] + sfx * SFX_GAIN * (1 - 0.45 * duck).astype(np.float32)[None, :]
    end = int(DUR * SR); fade = int(0.06 * SR)                  # the film loops: no tail after the last frame
    out = (music + np.stack([v, v]))[:, :end]; out[:, -fade:] *= np.linspace(1, 0, fade)[None, :]
    print("mix peak (float, pre-limiter):", round(float(np.abs(out).max()), 3))
    sf.write(str(WORK / "mix.wav"), out.T, SR, subtype="FLOAT"); sf.write(str(WORK / "score.wav"), music[:, :end].T, SR, subtype="FLOAT")
    return out


if __name__ == "__main__":
    mixdown(); print("ok", round(DUR, 2))
