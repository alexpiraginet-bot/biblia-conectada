"""Narration timeline of the "céu" remake of "A Bíblia, conectada" (video 1, 18/10/2026, 1M+ views).

Lines 0-11 and the call (14-15) are the SAME cuts of the SAME take as the original (narr-andre-v2.mp3, voice "Andre"),
with the same tempo and the same gaps, so every word lands on the same frame as in the viral cut.
The climax changes passage: instead of "E o versículo mais conectado de todos? Isaías 9:6. Porque um menino nos nasceu…"
(true only for Isaiah 9:6), two lines already validated in "Antes de João 3:16" (biblia-joao316, same narrator, take1,
the exact cut points of that film's renders/.film/narr.json):
  "Você conhece João três, dezesseis."  /  "Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito."
(João 3:16 in the BLIVRE wording, checked in that study). The verse is placed to END where the original verse ended
(47.22 s), so the call starts at 47.72 s and the film keeps its 53.49 s; the space before the verse becomes a held breath.
The inserted lines are level-matched to the original take (voiced-RMS, per line).

Output: renders/.film/narr.wav (48 kHz mono) + renders/.film/narr.json (line + word times on the film).
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
ORIG = ROOT.parent / "biblia-referencias"
SRC = ORIG / "source/narr/narr-andre-v2.mp3"
WORDS = json.load(open(ORIG / "source/narr/narr-v2-words.json"))
J316 = ROOT.parent / "biblia-joao316"
SRC_J = J316 / "source/narr/take1.mp3"
JN = {L["i"]: L for L in json.load(open(J316 / "renders/.film/narr.json"))["lines"]}
SR = 48000

# ("v1", first word, last word, tempo, gap after, display)   — the original take, same as the original film
# ("j316", line of "Antes de João 3:16", tempo, gap after, display, end_at) — end_at: the line ENDS there (s)
LINES = [
    ("v1", 0, 5, 1.04, 0.26, "Isso não é um arco-íris."),
    ("v1", 6, 9, 1.00, 0.45, "É a Bíblia inteira."),
    ("v1", 10, 32, 1.25, 0.18, "Em 2007, um pastor e um pesquisador de computação resolveram desenhar cada vez que a Bíblia aponta pra ela mesma."),
    ("v1", 33, 42, 1.22, 0.14, "Embaixo, cada risquinho é um capítulo: do Gênesis ao Apocalipse."),
    ("v1", 43, 53, 1.20, 0.10, "E cada arco liga um versículo a outro que ele ecoa."),
    ("v1", 54, 59, 1.10, 0.08, "Tipo “Não temas, eu sou contigo”…"),
    ("v1", 60, 67, 1.10, 0.32, "ligado a “Tudo posso naquele que me fortalece”."),
    ("v1", 68, 74, 1.18, 0.10, "O gráfico deles mostrou 63 mil ligações."),
    ("v1", 75, 76, 1.08, 0.24, "E viralizou."),
    ("v1", 77, 88, 1.18, 0.12, "Só que a base aberta de hoje tem mais de 340 mil."),
    ("v1", 89, 91, 1.00, 0.42, "Cinco vezes mais."),
    ("v1", 98, 109, 1.18, 0.36, "Lendo uma por minuto, sem dormir, você ia levar quase 8 meses."),
    ("j316", 3, 1.00, None, "Você conhece João 3:16.", None),
    ("j316", 17, 1.00, 0.50, "“Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito.”", 47.22),
    ("v1", 130, 133, 1.10, 0.10, "Comenta teu versículo favorito."),
    ("v1", 134, 140, 1.10, 1.30, "Os mais pedidos ganham o próprio mapa."),
]
HEAD = 0.15  # film starts with the voice almost at once (hook)


def silences(path):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.08",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    return list(zip(map(float, re.findall(r"silence_start: ([\d.]+)", e)), map(float, re.findall(r"silence_end: ([\d.]+)", e))))


def cut(src, s0, s1, tempo, name):
    seg = WORK / name
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s0:.3f}", "-t", f"{s1 - s0:.3f}", "-i", str(src), "-af",
                    f"aresample={SR},rubberband=tempo={tempo}:pitchq=quality:transients=mixed:window=standard,"
                    f"afade=t=in:d=0.008,areverse,afade=t=in:d=0.03,areverse", "-ac", "1", "-c:a", "pcm_f32le", str(seg)], check=True)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(seg), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def voiced_db(x):
    """level of the voiced part: 95th percentile of 50 ms RMS (dBFS)"""
    n = int(0.05 * SR); fr = x[:len(x) // n * n].reshape(-1, n)
    rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
    return float(20 * np.log10(np.percentile(rms, 95)))


def build():
    sil = silences(SRC)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(SRC)],
                               capture_output=True, text=True).stdout)
    segs = []
    for li, L in enumerate(LINES):
        if L[0] == "v1":
            _, i, j, tempo, gap, text = L
            w0, w1 = WORDS[i], WORDS[j]
            prev_end = WORDS[i - 1]["t1"] if i > 0 else 0.0
            nxt = WORDS[j + 1]["t0"] if j + 1 < len(WORDS) else dur
            ends = [e for s, e in sil if prev_end - 0.02 <= e <= w0["t0"] + 0.12]
            s0 = max(prev_end + 0.01, (max(ends) if ends else w0["t0"]) - 0.035) if i > 0 else 0.0
            starts = [s for s, e in sil if w1["t0"] + 0.05 <= s <= nxt + 0.05]
            s1 = min(nxt - 0.01, (min(starts) if starts else w1["t1"]) + 0.06) if j + 1 < len(WORDS) else min(dur, w1["t1"] + 0.25)
            x = cut(SRC, s0, s1, tempo, f"line{li:02d}.wav")
            words = [(WORDS[k]["w"], max(WORDS[k]["t0"], s0) - s0, min(WORDS[k]["t1"], s1) - s0) for k in range(i, j + 1)]
            segs.append({"x": x, "tempo": tempo, "gap": gap, "text": text, "src": ["narr-andre-v2.mp3", round(s0, 3), round(s1, 3)],
                         "words": words, "end_at": None, "orig": True})
        else:
            _, k, tempo, gap, text, end_at = L
            J = JN[k]; s0, s1 = J["src"]
            x = cut(SRC_J, s0, s1, tempo, f"line{li:02d}.wav")
            # word times in the source: that film placed them at t + (src - s0) / its tempo
            words = [(w["w"], (w["t0"] - J["t0"]) * J["tempo"], (w["t1"] - J["t0"]) * J["tempo"]) for w in J["words"]]
            segs.append({"x": x, "tempo": tempo, "gap": gap, "text": text, "src": ["biblia-joao316 take1.mp3", s0, s1],
                         "words": words, "end_at": end_at, "orig": False})
    # level-match the inserted lines to the original take
    ref = float(np.median([voiced_db(s["x"]) for s in segs if s["orig"]]))
    for s in segs:
        s["gain_db"] = 0.0
        if not s["orig"]:
            s["gain_db"] = round(float(np.clip(ref - voiced_db(s["x"]), -6, 6)), 2)
            s["x"] = s["x"] * 10 ** (s["gain_db"] / 20)
    # timeline: sequential, except a line with end_at (placed so that it ends there; the gap before it absorbs the rest)
    t = HEAD; out = np.zeros(int(SR * 80), np.float32); lines = []
    for li, s in enumerate(segs):
        L = len(s["x"]) / SR
        if s["end_at"] is not None:
            assert s["end_at"] - L >= t, f"line {li} does not fit before {s['end_at']} s"
            t = s["end_at"] - L
        a = int(round(t * SR)); out[a:a + len(s["x"])] += s["x"]
        ws = [{"w": w, "t0": round(t + w0 / s["tempo"], 3), "t1": round(t + w1 / s["tempo"], 3)} for w, w0, w1 in s["words"]]
        lines.append({"i": li, "t0": round(t, 3), "t1": round(t + L, 3), "text": s["text"], "tempo": s["tempo"], "src": s["src"],
                      "gain_db": s["gain_db"], "words": ws})
        t += L + (s["gap"] or 0.0)
    total = t
    out = out[:int(SR * total)]
    import wave
    with wave.open(str(WORK / "narr.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "lines": lines}, open(WORK / "narr.json", "w"), ensure_ascii=False, indent=1)
    return total, lines


if __name__ == "__main__":
    total, lines = build()
    for L in lines:
        print(f"L{L['i']:02d} {L['t0']:6.2f}-{L['t1']:6.2f} x{L['tempo']:.2f} {L['gain_db']:+5.1f} dB  {L['text']}")
    print("film duration:", round(total, 2))
