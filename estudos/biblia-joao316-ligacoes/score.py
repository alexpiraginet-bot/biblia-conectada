#!/usr/bin/env python3
"""Original score + sound design for "João 3:16, por dentro" (video 5), synthesized with the instruments of video 1
(sound.py, copied verbatim): the breathing organ in D minor that only resolves to D MAJOR (Picardy third) when John 3:16
is spoken, as videos 1 and 4 did. Beats follow the narration timeline (renders/.film/narr.json):
hook (tender drone, a bell on "amar") -> the 80 arcs (ticks with the counter) -> five links (one bell per dot) ->
Genesis 22 at night (a slow heartbeat) -> "a primeira vez" (light chord) -> the altar (dominant, riser) ->
"O Filho de Deus... não." (everything drops to silence, one low hit) -> John 3:16 in D major (braam, shimmer, bells) ->
1 John 4:19 and the end, still in D major. Ducked under the voice as in videos 1, 3 and 4.

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
TAIL = 3.2                                       # same tail as tools/motion_data.py (end card)
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


V = {"Dm": ["D2", "A2", "D3", "F3", "A3"], "Bb": ["Bb1", "F2", "Bb2", "D3", "F3"], "F": ["F2", "C3", "F3", "A3", "C4"],
     "C": ["C2", "G2", "C3", "E3", "G3"], "Gm": ["G1", "D2", "G2", "Bb2", "D3"], "A": ["A1", "E2", "A2", "C#3", "E3"],
     "Dlow": ["D1", "A1", "D2", "A2"], "D": ["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"]}


def ch(buf, name, t_on, t_off, amp, **kw):
    chord(buf, V[name], t_on, max(0.3, t_off - t_on), amp, **kw)


def scene0(i):
    """frame time where the scene of line i starts in Main.tsx (line start - 0.18 s, rounded to frames)"""
    return round((T[i] - 0.18) * FPS) / FPS


def build():
    mus = np.zeros((2, N), np.float32)
    sfx = np.zeros((2, N), np.float32)
    # ---- hook: a tender drone already breathing at frame 0; a bell on "amar"; the climb
    chord(mus, ["D1", "D2", "A2"], 0.0, T[3] + 0.6, 0.45, a=0.2, r=0.8, bright=0.75)
    ch(mus, "Dm", 0.0, T[3] + 0.3, 0.30, a=1.2, r=0.6, bright=0.8)
    place(sfx, sub_hit(0.22, 1.2), 0.02)
    place(mus, shimmer(2.2, 1175, 2350, 0.035), 0.05, 0.3)
    place(mus, bell(hz("A4"), 0.05, 3.0), W(1, "amar") + 0.05, -0.3)
    place(mus, bell(hz("D5"), 0.04, 3.0), LE(2) + 0.05, 0.3)
    # ---- "ligado a João 3:16" -> the 80 arcs: VI, then ticks with the counter
    place(sfx, whoosh(1.0, 0.16, True), T[3] - 0.45, 0.0)
    ch(mus, "Bb", T[3] - 0.05, T[4] + 0.2, 0.36, a=0.3, r=0.5, bright=0.85)
    place(mus, bell(hz("F5"), 0.05, 2.6), W(3, "joao") + 0.02, 0.4)
    ch(mus, "F", T[4] - 0.1, T[5] + 0.2, 0.38, a=0.25, r=0.5, bright=0.95)
    s4 = scene0(4) + 10 / FPS
    for r in range(80):                                            # one tick per arc (Main.tsx: arc r starts at r*0.55 frames)
        if r % 2 == 0:
            place(sfx, tick(0.05, 2200 + rng.integers(-300, 300)), s4 + r * 0.55 / FPS, rng.uniform(-0.6, 0.6))
    place(mus, shimmer(1.8, 880, 1760, 0.04), s4 + 0.2, 0.0)
    # ---- method: quiet, the vote
    ch(mus, "Gm", T[5] - 0.05, T[6] + 0.1, 0.32, a=0.4, r=0.5, bright=0.8)
    place(sfx, tick(0.12, 1800), W(5, "leitores"), 0.2)
    # ---- five links: one bell per dot (Main.tsx S_Five: dot i at 8+4i frames)
    ch(mus, "Dm", T[6] - 0.05, T[7] + 0.1, 0.34, a=0.2, r=0.4, bright=0.9)
    for i, nn in enumerate(["D5", "E5", "F5", "G5", "A5"]):
        place(mus, bell(hz(nn), 0.035, 2.2), scene0(6) + (8 + 4 * i) / FPS, -0.6 + 0.3 * i)
    # ---- link 1: the ranking grows, a hit on "quinta"
    ch(mus, "C", T[7] - 0.05, T[8] + 0.1, 0.36, a=0.15, r=0.4, bright=0.95)
    place(sfx, riser(max(0.4, W(7, "quinta") - T[7]), 0.12), T[7])
    place(sfx, sub_hit(0.30, 1.1), W(7, "quinta") - 0.02)
    place(mus, bell(hz("G5"), 0.05, 2.6), W(7, "quinta") + 0.02, 0.3)
    # Paul: "Deus prova o seu amor... quando ainda éramos pecadores"
    ch(mus, "Dm", T[8] - 0.05, T[9] + 0.1, 0.34, a=0.4, r=0.5, bright=0.85)
    place(mus, bell(hz("F5"), 0.035, 2.8), W(8, "amor") + 0.05, -0.2)
    # ---- link 2: the same words light up; the rare word (dominant)
    ch(mus, "Bb", T[9] - 0.05, T[10] + 0.1, 0.36, a=0.2, r=0.4, bright=0.9)
    for k in range(5):
        place(mus, bell(hz(["D5", "F5", "A5", "C6", "D6"][k]), 0.025, 2.0), scene0(9) + (24 + k * 9.2) / FPS, -0.4 + 0.2 * k)
    ch(mus, "A", T[10] - 0.05, T[11] + 0.1, 0.40, a=0.3, r=0.4, bright=1.0)
    place(mus, shimmer(2.4, 1100, 2200, 0.04), T[10] + 0.1, 0.0)
    # nine occurrences, one of them Isaac
    ch(mus, "Dm", T[11] - 0.05, T[12] + 0.1, 0.34, a=0.2, r=0.4, bright=0.85)
    for i in range(9):
        place(sfx, tick(0.06, 2000 + 60 * i), scene0(11) + (4 + 3 * i) / FPS, -0.5 + 0.12 * i)
    place(mus, bell(hz("A5"), 0.06, 3.2), W(11, "isaque") + 0.02, 0.0)
    place(sfx, sub_hit(0.25, 1.0), W(11, "isaque") - 0.02)
    # ---- Genesis 22, at night: low drone + slow heartbeat until the altar
    place(sfx, whoosh(1.4, 0.14, False), T[12] - 0.4, -0.3)
    chord(mus, V["Dlow"], T[12] - 0.1, T[14] - T[12] + 0.3, 0.40, a=0.9, r=0.5, bright=0.7)
    hb = T[12] + 0.4
    while hb < T[14] - 0.2:
        place(sfx, sub_hit(0.13, 0.8), hb); place(sfx, sub_hit(0.08, 0.7), hb + 0.28); hb += 1.05
    place(mus, bell(hz("D5"), 0.05, 3.2), W(13, "amas") + 0.05, 0.2)
    # "É aqui. A primeira vez." light chord; the arc to John 3 rises on "grego"
    ch(mus, "F", T[14] - 0.04, W(14, "grego") + 0.2, 0.40, a=0.1, r=0.5, bright=1.05)
    place(mus, bell(hz("A5"), 0.06, 3.0), T[14] + 0.05, 0.0)
    ch(mus, "C", W(14, "grego") - 0.05, T[15] + 0.1, 0.38, a=0.3, r=0.5, bright=0.95)
    place(sfx, riser(max(0.5, W(14, "joao") - W(14, "grego")), 0.14), W(14, "grego"))
    place(mus, bell(hz("E5"), 0.05, 2.6), W(14, "joao") + 0.05, 0.4)
    # the question on the way up: heartbeat again, very quiet
    ch(mus, "Dm", T[15] - 0.05, T[17] + 0.1, 0.30, a=0.6, r=0.5, bright=0.75)
    hb = T[15]
    while hb < T[17] - 0.2:
        place(sfx, sub_hit(0.10, 0.8), hb); place(sfx, sub_hit(0.06, 0.7), hb + 0.28); hb += 1.1
    place(mus, bell(hz("F5"), 0.04, 2.8), LE(15) + 0.05, -0.3)
    place(mus, bell(hz("A5"), 0.04, 2.8), LE(16) + 0.05, 0.3)
    # ---- link 4: "Eis o Cordeiro" (light)
    ch(mus, "Bb", T[17] - 0.05, W(17, "eis") + 0.1, 0.36, a=0.2, r=0.4, bright=0.9)
    ch(mus, "F", W(17, "eis") - 0.05, T[18] + 0.1, 0.42, a=0.08, r=0.5, bright=1.05)
    place(mus, bell(hz("C6"), 0.05, 3.2), W(17, "eis") + 0.03, 0.0)
    # ---- the altar: dominant + riser into "Não"; the ram: release
    ch(mus, "A", T[18] - 0.05, T[19] + 0.1, 0.46, a=0.3, r=0.4, bright=1.0)
    place(sfx, riser(max(0.5, W(18, "nao") - T[18]), 0.18), T[18])
    place(sfx, braam(0.22, 2.4), W(18, "nao") - 0.08)
    place(sfx, sub_hit(0.45, 1.3), W(18, "nao") - 0.05)
    ch(mus, "Dm", T[19] - 0.05, T[20] + 0.1, 0.34, a=0.4, r=0.5, bright=0.85)
    place(mus, bell(hz("D5"), 0.04, 3.0), LE(19) + 0.05, 0.0)
    # ---- link 5 + the verb: iv -> V, ticks, tension held
    ch(mus, "Gm", T[20] - 0.05, T[21] + 0.1, 0.40, a=0.2, r=0.4, bright=0.9)
    place(sfx, sub_hit(0.25, 1.0), W(20, "poupou") - 0.02)
    ch(mus, "A", T[21] - 0.05, W(22, "o", 1) - 0.25, 0.44, a=0.2, r=0.25, bright=1.0)
    ts, dt = T[21] + 0.2, 0.22
    while ts < LE(21):
        place(sfx, tick(0.05, 2300 + rng.integers(-200, 200)), ts, rng.uniform(-0.5, 0.5)); ts += dt
    # ---- climax: "O filho de Abraão foi poupado." (light) "O Filho de Deus... não." (silence, one low hit)
    ch(mus, "F", T[22] - 0.05, W(22, "o", 1) - 0.12, 0.30, a=0.2, r=0.12, bright=0.9)
    cut = W(22, "o", 1)
    place(sfx, sub_hit(0.70, 2.4), W(22, "nao") - 0.04)
    place(sfx, braam(0.18, 3.0), W(22, "nao") - 0.10)
    # ---- John 3:16: D MAJOR (Picardy third). A soft riser from the silence, braam, shimmer, bells
    place(sfx, riser(max(0.6, T[23] - LE(22)), 0.10), LE(22) + 0.05)
    chord(mus, ["D1", "A1", "D2", "A2", "D3"], T[23] - 0.25, LE(23) - T[23] + 0.8, 0.40, a=0.6, r=0.3, bright=1.0)
    ch(mus, "D", T[23] - 0.15, T[25] + 0.5, 0.50, a=0.9, r=1.2, bright=1.10)
    place(sfx, braam(0.42), T[23] - 0.20); place(sfx, sub_hit(0.80), T[23] - 0.18)
    place(mus, shimmer(3.2, 880, 1760, 0.04), W(23, "amou") + 0.05, 0.0)
    for r_, nn in enumerate(["D5", "F#5", "A5", "D6"]):
        place(mus, bell(hz(nn), 0.055, 3.8), LE(23) + 0.04 + 0.2 * r_, -0.5 + 0.33 * r_)
    # 1 John 4:19 and the end: D major breathing
    place(mus, bell(hz("A5"), 0.05, 3.6), W(24, "nos", 1) + 0.03, 0.3)
    chord(mus, V["D"], T[25] - 0.1, DUR - T[25] + 0.6, 0.44, a=0.5, r=2.4, bright=1.08)
    place(mus, bell(hz("D6"), 0.06, 4.5), LE(25) + 0.08, -0.2)
    mus, sfx = reverb(mus, 3.8, 0.42), reverb(sfx, 1.6, 0.18)
    # the silence before "O Filho de Deus": music fades out over 0.25 s, comes back with the riser after "não"
    gate = np.ones(N, np.float32)
    a0, a1 = int((cut - 0.30) * SR), int((cut - 0.05) * SR)
    b0 = int((W(22, "nao") - 0.05) * SR)
    gate[a0:a1] = np.linspace(1, 0, a1 - a0); gate[a1:b0] = 0.0
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
