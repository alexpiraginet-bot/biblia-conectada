#!/usr/bin/env python3
"""Original score + sound design for "O Antigo dentro do Novo" (video 6), synthesized with the instruments of video 1
(sound.py, copied verbatim): the breathing organ in D minor that only resolves to D MAJOR (Picardy third) on the climax,
as videos 1, 4 and 5 did. Beats follow the narration timeline (renders/.film/narr.json) and the camera of Main.tsx:
hook (drone + sparkle of the fibres) -> "Cada fio é Deus" (first light chord) -> Gn 1:1 -> Jo 1:1 (riser, the two
"No princípio" answer each other) -> the count (ticks) -> all 39 books (one tick per book the camera passes) -> Salmos /
Isaías / Mateus (hits on the punch-ins) -> "Uma só história" (long swell, choir of bells) -> orange (shimmer, ticks) ->
"aconteceu" (hit) -> Nazareth (low drone, heartbeat) -> silence after "E disse:" -> "Hoje esta escritura se cumpriu" in
D MAJOR (braam, shimmer, bells) -> "É Deus guiando cada linha" (fullest chord, bells climbing) -> end.
Ducked under the voice as in videos 1, 3, 4 and 5.

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
LAY = json.load(open(ROOT / "data/layout.json"))
TAIL = 2.6                                       # same tail as tools/motion_data.py (end card)
DUR = NJ["duration"] + TAIL
N = int(SR * (DUR + 0.5))
LN = {L["i"]: L for L in NJ["lines"]}
T = {i: L["t0"] for i, L in LN.items()}
LE = lambda i: LN[i]["t1"]


def nrm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))


def W(i, word, nth=0):
    """start time of the nth spoken word of line i that starts with `word` (same rule as Main.tsx wordT)"""
    hits = [w for w in LN[i]["words"] if nrm(w["w"]).startswith(nrm(word))]
    return (hits[nth] if len(hits) > nth else hits[0] if hits else {"t0": T[i]})["t0"]


def AFTER(i, word):
    """start of the word after the match (Main.tsx afterT: Whisper writes numbers as digits)"""
    ws = LN[i]["words"]
    k = next((n for n, w in enumerate(ws) if nrm(w["w"]).startswith(nrm(word))), -1)
    return ws[k + 1]["t0"] if 0 <= k < len(ws) - 1 else T[i]


def ease_inout(x):
    """Easing.bezier(0.65, 0, 0.35, 1) of Main.tsx (camera moves), solved for x"""
    lo, hi = 0.0, 1.0
    for _ in range(40):
        u = (lo + hi) / 2
        bx = 3 * (1 - u) ** 2 * u * 0.65 + 3 * (1 - u) * u ** 2 * 0.35 + u ** 3
        lo, hi = (u, hi) if bx < x else (lo, u)
    u = (lo + hi) / 2
    return 3 * (1 - u) * u ** 2 + u ** 3


V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
     "C": ["C2", "G2", "C3", "E3", "G3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"],
     "Dlow": ["D1", "A1", "D2", "A2"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"]}


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    tPs, tIs, tMt, tLar = W(8, "salmos"), W(9, "isaias"), W(9, "mateus"), W(11, "laranja")
    tMat13, tHoje, tDeus = W(13, "mateus"), W(17, "hoje"), W(18, "deus")
    # ---- hook: a drone already breathing at frame 0, the sparkle of the fibres; "Mas é..." turns on a low hit
    chord(mus, ["D1", "D2", "A2"], 0.0, T[3] + 0.6, 0.45, a=0.2, r=0.8, bright=0.75)
    ch(mus, "Dm", 0.0, T[2] + 0.3, 0.30, a=1.0, r=0.6, bright=0.85)
    place(sfx, sub_hit(0.22, 1.2), 0.02)
    place(mus, shimmer(2.6, 1175, 2350, 0.04), 0.05, 0.3)
    place(mus, bell(hz("A4"), 0.05, 3.0), W(1, "fibra") + 0.03, -0.3)
    place(sfx, whoosh(0.8, 0.14, True), T[2] - 0.55, 0.0)
    place(sfx, sub_hit(0.34, 1.4), T[2] - 0.03)
    ch(mus, "Bb", T[2] - 0.05, T[3] + 0.2, 0.38, a=0.15, r=0.5, bright=0.95)
    place(mus, bell(hz("D5"), 0.05, 3.0), W(2, "novo") + 0.05, 0.3)
    # ---- "Cada fio é Deus": the first light chord of the film, a bell on "Deus"
    ch(mus, "F", T[3] - 0.05, T[4] + 0.1, 0.40, a=0.12, r=0.5, bright=1.05)
    place(mus, bell(hz("A5"), 0.06, 3.4), W(3, "deus") + 0.02, 0.0)
    place(mus, shimmer(1.8, 880, 1760, 0.03), W(3, "deus") + 0.1, 0.0)
    # ---- Gn 1:1 -> Jo 1:1: riser while the thread draws; the two "No princípio" answer each other (same bell)
    place(sfx, whoosh(1.0, 0.12, True), T[4] - 0.3, -0.2)
    ch(mus, "Bb", T[4] - 0.05, T[5] + 0.1, 0.34, a=0.4, r=0.5, bright=0.9)
    place(sfx, riser(max(0.6, T[5] - T[4]), 0.08), T[4])
    place(mus, bell(hz("D5"), 0.05, 3.2), W(4, "principio") + 0.02, -0.4)
    place(mus, bell(hz("D5"), 0.05, 3.2), W(5, "principio") + 0.02, 0.4)
    place(mus, bell(hz("A5"), 0.04, 3.0), W(5, "palavra") + 0.05, 0.4)
    ch(mus, "F", T[5] - 0.05, T[6] + 0.1, 0.36, a=0.2, r=0.5, bright=1.0)
    # ---- the count: ticks accelerate with the counter, a hit when it lands
    ch(mus, "C", T[6] - 0.1, T[7] + 0.1, 0.38, a=0.15, r=0.4, bright=1.0)
    place(sfx, whoosh(0.9, 0.14, False), T[6] - 0.25, 0.0)
    for k in range(28):
        tt = T[6] - 0.05 + 1.55 * (1 - (1 - k / 28) ** 0.6)
        place(sfx, tick(0.045, 2100 + rng.integers(-300, 300)), tt, rng.uniform(-0.6, 0.6))
    place(sfx, sub_hit(0.28, 1.1), T[6] + 1.5)
    place(mus, shimmer(2.0, 880, 1760, 0.035), T[6] + 0.2, 0.0)
    # ---- all 39 books: a whoosh down and one tick per book the camera passes (same easing as the camera)
    ch(mus, "Gm", T[7] - 0.05, tPs + 0.2, 0.36, a=0.2, r=0.3, bright=0.95)
    place(sfx, whoosh(1.1, 0.18, False), T[7] + 0.3, 0.0)
    oty = [b["y"] for b in LAY["ot"]]
    a0, a1 = T[7] + 0.5, T[7] + 2.4
    for i in range(1, len(oty)):
        frac = (oty[i] - oty[0]) / (oty[-1] - oty[0])
        lo, hi = 0.0, 1.0
        for _ in range(30):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if ease_inout(m) < frac else (lo, m)
        place(sfx, tick(0.06, 1600 + 30 * i), a0 + (a1 - a0) * (lo + hi) / 2, -0.4 + 0.8 * i / len(oty))
    place(mus, bell(hz("G5"), 0.045, 2.6), W(7, "nenhum") + 0.02, 0.2)
    # ---- the champions: a hit + bell on each punch-in
    place(sfx, whoosh(0.7, 0.14, True), tPs - 0.4, 0.0)
    place(sfx, braam(0.20, 2.2), tPs - 0.06); place(sfx, sub_hit(0.42, 1.3), tPs - 0.03)
    ch(mus, "F", tPs - 0.05, tIs + 0.1, 0.40, a=0.08, r=0.4, bright=1.05)
    place(mus, bell(hz("A5"), 0.055, 3.0), tPs + 0.02, 0.0)
    for k in range(14):
        place(sfx, tick(0.04, 2400), AFTER(8, "salmos") + 1.3 * (1 - (1 - k / 14) ** 0.6), rng.uniform(-0.5, 0.5))
    place(sfx, whoosh(0.7, 0.12, False), tIs - 0.2, 0.3)
    ch(mus, "Bb", tIs - 0.05, tMt + 0.1, 0.38, a=0.1, r=0.4, bright=0.95)
    place(mus, bell(hz("F5"), 0.05, 2.8), tIs + 0.02, -0.3)
    place(sfx, whoosh(0.8, 0.18, True), tMt - 0.45, 0.5)
    ch(mus, "A", tMt - 0.05, T[10] + 0.1, 0.42, a=0.2, r=0.4, bright=1.0)
    place(sfx, braam(0.16, 2.0), tMt - 0.06); place(sfx, sub_hit(0.38, 1.2), tMt - 0.03)
    place(mus, bell(hz("C#6"), 0.045, 2.8), tMt + 0.02, 0.4)
    # ---- "Séculos de distância. Uma só história.": the warmest moment before the end, a long swell and a choir of bells
    place(sfx, whoosh(1.4, 0.12, False), T[10] - 0.3, 0.0)
    ch(mus, "Dm", T[10] - 0.05, W(10, "seculos") + 0.1, 0.36, a=0.4, r=0.5, bright=0.9)
    place(sfx, riser(max(0.8, W(10, "uma") - W(10, "seculos")), 0.10), W(10, "seculos"))
    ch(mus, "F", W(10, "uma") - 0.08, T[11] + 0.2, 0.46, a=0.1, r=0.8, bright=1.1)
    for r_, nn in enumerate(["F5", "A5", "C6", "F6"]):
        place(mus, bell(hz(nn), 0.05, 3.6), W(10, "historia") + 0.02 + 0.18 * r_, -0.5 + 0.33 * r_)
    place(mus, shimmer(2.8, 1175, 2350, 0.045), W(10, "uma") + 0.05, 0.0)
    # ---- orange: warm chord, shimmer as it sweeps in, ticks with the counter
    place(sfx, whoosh(0.9, 0.12, False), T[11] - 0.2, 0.0)
    ch(mus, "Gm", T[11] - 0.05, T[12] + 0.1, 0.36, a=0.3, r=0.4, bright=0.95)
    place(mus, shimmer(2.6, 1175, 2350, 0.05), tLar - 0.1, 0.0)
    for k in range(16):
        place(sfx, tick(0.04, 2600), tLar + 0.1 + 1.3 * (1 - (1 - k / 16) ** 0.6), rng.uniform(-0.5, 0.5))
    # ---- Isaías 7:14 -> Mateus 1:23: the orange thread draws under a riser; "aconteceu" lands on a hit + light chord
    ch(mus, "Bb", T[12] - 0.05, tMat13 + 0.1, 0.36, a=0.2, r=0.4, bright=0.9)
    place(mus, bell(hz("D5"), 0.045, 3.0), W(12, "eis") + 0.02, -0.3)
    place(sfx, riser(max(0.6, tMat13 - T[13] + 0.3), 0.12), T[13] - 0.3)
    ch(mus, "F", tMat13 - 0.05, T[14] + 0.1, 0.44, a=0.08, r=0.6, bright=1.1)
    place(sfx, sub_hit(0.40, 1.3), W(13, "aconteceu") - 0.03)
    place(mus, bell(hz("A5"), 0.06, 3.4), W(13, "aconteceu") + 0.02, 0.3)
    # ---- Nazareth: a low drone and a quiet heartbeat; a bell as he reads
    place(sfx, whoosh(1.2, 0.12, False), T[14] - 0.4, -0.2)
    chord(mus, V["Dlow"], T[14] - 0.1, LE(16) - T[14] + 0.3, 0.38, a=0.8, r=0.4, bright=0.7)
    ch(mus, "Dm", T[14] - 0.05, LE(16), 0.26, a=0.8, r=0.3, bright=0.8)
    hb = T[14] + 0.3
    while hb < LE(16) - 0.3:
        place(sfx, sub_hit(0.10, 0.8), hb); place(sfx, sub_hit(0.06, 0.7), hb + 0.28); hb += 1.05
    place(mus, bell(hz("D5"), 0.04, 3.0), W(15, "espirito") + 0.05, -0.2)
    place(mus, bell(hz("A5"), 0.035, 3.0), W(16, "livro") + 0.1, 0.0)
    # ---- silence after "E disse:", a riser through it, then "Hoje..." in D MAJOR as the gold floods
    place(sfx, riser(max(0.5, tHoje - LE(16)), 0.12), LE(16) + 0.02)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], tHoje - 0.2, LE(17) - tHoje + 0.8, 0.42, a=0.5, r=0.3, bright=1.0)
    ch(mus, "D", tHoje - 0.12, T[18] + 0.3, 0.50, a=0.8, r=1.2, bright=1.10)
    place(sfx, braam(0.42), tHoje - 0.18); place(sfx, sub_hit(0.80), tHoje - 0.15)
    place(mus, shimmer(3.4, 880, 1760, 0.045), tHoje + 0.1, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.055, 3.8), LE(17) + 0.04 + 0.2 * r_, -0.5 + 0.33 * r_)
    # ---- "É Deus guiando cada linha": the fullest chord, a hit on "Deus", bells climbing to the end
    ch(mus, "D", T[18] - 0.1, DUR - T[18] + 0.6, 0.52, a=0.6, r=2.4, bright=1.12)
    place(sfx, sub_hit(0.55, 1.6), tDeus - 0.04); place(sfx, braam(0.22, 2.6), tDeus - 0.10)
    place(mus, shimmer(3.0, 1175, 2350, 0.05), tDeus + 0.05, 0.0)
    for r_, nn in enumerate(["A5", "D6", "F#6", "A6"]):
        place(mus, bell(hz(nn), 0.045, 4.0), W(18, "fim") + 0.05 + 0.22 * r_, -0.5 + 0.33 * r_)
    place(mus, bell(hz("D6"), 0.06, 4.5), LE(19) + 0.08, -0.2)
    mus, sfx = reverb(mus, 3.8, 0.42), reverb(sfx, 1.6, 0.18)
    gate = np.ones(N, np.float32)                     # the music leaves on "E disse:" and comes back on "Hoje"
    g0, g1, g2 = int((LE(16) - 0.25) * SR), int((LE(16) + 0.05) * SR), int((tHoje - 0.22) * SR)
    gate[g0:g1] = np.linspace(1, 0, g1 - g0); gate[g1:g2] = 0.0
    mus *= gate[None, :]
    # phone-friendly bus EQ (as video 1): no rumble below 32 Hz, a pocket at 2.5 kHz for the voice
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
