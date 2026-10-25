#!/usr/bin/env python3
"""Build the narration track of "A outra marca" (video 8) from the three Andre takes (copied from
../biblia-joao316-ligacoes/narration.py; only the per-line tempo, pauses and gaps are new: video 1's pace, expository
lines up to ~1.2x, a dry beat after the hook).

Per line, the take with the best Whisper score (source/narr/takes.json, tools/takes.py) is used: Portuguese language-ID
probability (accent drift proxy) + similarity to the script; one complete take is preferred for a consistent voice. The
line is cut on the pauses around its words, time-stretched with rubberband (pitch kept), levelled, and laid on the film
timeline with a gap per line (the beats of the edit).
Output: renders/.film/narr.wav (48 kHz mono) + renders/.film/narr.json (lines + words on the film timeline).

  python3 -I narration.py
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import os
from script import LINES as SCRIPT  # noqa: E402
SHORT = []

CUT = os.environ.get("CUT", "")                  # "" = the full film, "curto" = the short cut (script.SHORT)
SUFFIX = "-curto" if CUT == "curto" else ""
USE = SHORT if CUT == "curto" else list(range(1, len(SCRIPT)))

WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
NARR = ROOT / "source/narr"
TK = json.load(open(NARR / "takes.json"))


def _attach_orphans():
    """Whisper sometimes hears a word but not as the script word (e.g. "Isaque" at the end of line 11). Those orphan
    words sit between two lines' matches; give each to the closer line in time, so a line's cut keeps its last word."""
    for tk in TK["takes"].values():
        W_, Ls = tk["words"], tk["lines"]
        for li in range(len(Ls) - 1):
            a, b = Ls[li], Ls[li + 1]
            if a.get("missing") or b.get("missing"): continue
            k1, n0 = a["k"][1], b["k"][0]
            for k in range(k1 + 1, n0):
                if W_[k]["t0"] - W_[k1]["t1"] < W_[n0]["t0"] - W_[k]["t1"]:
                    a["k"][1] = k; a["t"][1] = W_[k]["t1"]


_attach_orphans()
SR = 48000
HEAD = 0.15                      # the hook is spoken over frame 0
MAX_PAUSE = 0.20                 # pauses inside a line (commas) are shortened to this...
KEEP_PAUSE = {4: 0.22, 6: 0.22, 8: 0.32, 13: 0.26, 14: 0.26}   # ...except the beats inside a line
TEMPO = {1: 1.06, 2: 1.04, 3: 1.08, 4: 1.02, 5: 1.10, 6: 1.08, 7: 1.10, 8: 1.04, 9: 1.04, 10: 1.06, 11: 1.10, 12: 1.00, 13: 1.04, 14: 1.06, 15: 1.06}
GAP = {1: 0.22, 2: 0.32, 3: 0.18, 4: 0.30, 5: 0.18, 6: 1.10, 7: 0.25, 8: 0.36, 9: 0.30, 10: 0.42, 11: 0.20, 12: 1.15, 13: 0.36, 14: 0.34, 15: 0.30}
OVERRIDE = {}                    # line -> take name, if a listening pass ever disagrees with the metric


def score(r):
    return r["sim"] * 1.0 + r["p_pt"] * 0.8 - r["p_en"] * 0.4 + r["lp"] * 0.15


def complete(name):
    """a take where every used line was heard exactly (sim) and as Portuguese"""
    rs = TK["takes"][name]["lines"][1:]
    return all(not r.get("missing") and r["sim"] >= SIM_MIN.get(r["line"], 0.95) and r["p_pt"] >= 0.95 for r in rs if r["line"] in USE)


# numbers come back as digits ("67.293", "8 em cada 10"), "pro" as "para o"
SIM_MIN = {11: 0.78, 15: 0.85}   # "pro"/"pra" are heard as "para o"/"para"


# one take for the whole film when possible (consistent delivery: the complaint about video 1 was the accent *changing*);
# per-line fallback only where that take fails
MAIN = max((n for n in TK["takes"] if complete(n)),
           key=lambda n: np.mean([score(r) for r in TK["takes"][n]["lines"][1:]]), default=None)


def choose(li):
    if li in OVERRIDE: return OVERRIDE[li]
    if MAIN: return MAIN
    best = None
    for name, tk in TK["takes"].items():
        r = tk["lines"][li]
        if r.get("missing"): continue
        if best is None or score(r) > score(best[1]): best = (name, r)
    assert best, f"line {li} missing in every take"
    return best[0]


def silences(path):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.08",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    return list(zip(map(float, re.findall(r"silence_start: ([\d.]+)", e)), map(float, re.findall(r"silence_end: ([\d.]+)", e))))


def chunks(name, thr_db=-50.0, min_pause=0.35):
    """speech chunks of a take, split on real pauses (the TTS renders '...' as ~0.5 s of digital silence)"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(NARR / f"{name}.mp3"), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    hop = 240; n = len(x) // hop
    r = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    loud = r > thr_db
    out, i = [], 0
    while i < n:
        if loud[i]:
            j = i
            while j < n:
                if loud[j]: j += 1; continue
                k = j
                while k < n and not loud[k]: k += 1
                if (k - j) * hop / SR >= min_pause or k >= n: break
                j = k
            out.append((i * hop / SR, j * hop / SR)); i = j
        else:
            i += 1
    return out


CH = {}


def cut(name, li, tempo):
    """the line = every speech chunk that holds one of its words (word midpoints: Whisper's word *starts* often sit in
    the pause before them). Words between the previous line's last match and this one (e.g. '1' for 'Primeira') belong
    to this line."""
    tk = TK["takes"][name]; W_ = tk["words"]; r = tk["lines"][li]
    if name not in CH: CH[name] = chunks(name)
    # the previous *present* line of this take (in a CTA-only take, line 0 precedes line 19)
    prev = next((tk["lines"][j] for j in range(li - 1, -1, -1) if not tk["lines"][j].get("missing")), None)
    # absorb at most 3 orphan words before the line ("Comenta a" in a CTA take); a whole re-recorded line left in the
    # full take (its words are now "missing" for the script) stays out
    k0 = prev["k"][1] + 1 if prev and r["k"][0] - prev["k"][1] - 1 <= 3 else r["k"][0]
    k1 = r["k"][1]
    mids = [(W_[k]["t0"] + W_[k]["t1"]) / 2 for k in range(k0, k1 + 1)]
    mine = [c for c in CH[name] if any(c[0] - 0.02 <= m <= c[1] + 0.02 for m in mids)]
    assert mine, (name, li)
    # a chunk must not also hold a word of another line
    others = [(W_[k]["t0"] + W_[k]["t1"]) / 2 for k in range(len(W_)) if k < k0 or k > k1]
    for c in mine:
        clash = [m for m in others if c[0] + 0.05 < m < c[1] - 0.05]
        assert not clash, (name, li, c, clash)
    s0, s1 = max(0.0, mine[0][0] - 0.03), min(tk["dur"], mine[-1][1] + 0.08)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s0:.3f}", "-t", f"{s1 - s0:.3f}", "-i", str(NARR / f"{name}.mp3"), "-af",
                          f"aresample={SR},rubberband=tempo={tempo}:pitchq=quality:transients=mixed:window=standard,"
                          f"afade=t=in:d=0.008,areverse,afade=t=in:d=0.03,areverse", "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    words = [{"w": W_[k]["w"], "t0": (min(max(W_[k]["t0"], s0), s1) - s0) / tempo, "t1": (min(max(W_[k]["t1"], s0), s1) - s0) / tempo}
             for k in range(k0, k1 + 1)]
    # a word whose start sat in the pause starts with the speech instead
    for w in words:
        if w["t0"] < 0.03 / tempo: w["t0"] = 0.03 / tempo
    return x, words, (round(s0, 3), round(s1, 3))


def compress_pauses(x, words, maxp=MAX_PAUSE, thr_db=-42.0):
    """shorten silences inside a line (never at its edges) to maxp seconds; word times follow"""
    hop = 480; nfr = len(x) // hop
    r = np.sqrt((x[:nfr * hop].reshape(nfr, hop) ** 2).mean(1) + 1e-12)
    quiet = r < 10 ** (thr_db / 20)
    cuts, i = [], 0
    while i < nfr:
        if quiet[i]:
            j = i
            while j < nfr and quiet[j]: j += 1
            if i > 0 and j < nfr and (j - i) * hop > maxp * SR:
                keep = int(maxp * SR)
                cuts.append((i * hop + keep // 2, j * hop - keep // 2))
            i = j
        else:
            i += 1
    if not cuts: return x, words
    parts, prev = [], 0
    for a, b in cuts:
        parts.append(x[prev:a]); prev = b
    parts.append(x[prev:])
    y = np.concatenate(parts)

    def mapt(t):
        sh = 0.0
        for a, b in cuts:
            if t * SR >= b: sh += (b - a) / SR
            elif t * SR > a: sh += (t * SR - a) / SR
        return t - sh
    return y, [{**w, "t0": mapt(w["t0"]), "t1": mapt(w["t1"])} for w in words]


def active_rms(x):
    """RMS over the voiced part (frames above -45 dBFS), a cheap stand-in for speech loudness"""
    f = x[:len(x) // 480 * 480].reshape(-1, 480)
    r = np.sqrt((f ** 2).mean(1) + 1e-12)
    v = r[r > 10 ** (-45 / 20)]
    return float(np.sqrt((v ** 2).mean())) if len(v) else 1e-3


SIL = {name: silences(NARR / f"{name}.mp3") for name in TK["takes"]}


def build():
    pieces = []
    for li in USE:
        name = choose(li)
        tempo = TEMPO[li]
        x, words, src = cut(name, li, tempo)
        x, words = compress_pauses(x, words, KEEP_PAUSE.get(li, MAX_PAUSE))
        pieces.append((li, name, tempo, x, words, src))
    target = float(np.median([active_rms(p[3]) for p in pieces]))
    t = HEAD; out = np.zeros(int(SR * 180), np.float32); lines = []
    for li, name, tempo, x, words, src in pieces:
        g = float(np.clip(target / active_rms(x), 10 ** (-3 / 20), 10 ** (3 / 20)))
        x = x * g
        a = int(round(t * SR)); out[a:a + len(x)] += x
        L = len(x) / SR
        lines.append({"i": li, "t0": round(t, 3), "t1": round(t + L, 3), "text": SCRIPT[li], "take": name, "tempo": tempo,
                      "gain_db": round(20 * np.log10(g), 2), "src": list(src),
                      "words": [{"w": w["w"], "t0": round(t + w["t0"], 3), "t1": round(t + w["t1"], 3)} for w in words]})
        t += L + GAP[li]
    total = t
    out = out[:int(SR * total)]
    import wave
    with wave.open(str(WORK / f"narr{SUFFIX}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "lines": lines}, open(WORK / f"narr{SUFFIX}.json", "w"), ensure_ascii=False, indent=1)
    return total, lines


if __name__ == "__main__":
    total, lines = build()
    for L in lines:
        print(f"L{L['i']:02d} {L['t0']:6.2f}-{L['t1']:6.2f} {L['take']} x{L['tempo']:.2f} {L['gain_db']:+.1f} dB  {L['text']}")
    print("film duration:", round(total, 2))
