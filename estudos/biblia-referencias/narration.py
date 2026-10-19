"""Cut the AI narration (voice "Andre", ElevenLabs via Higgsfield) into its 18 lines on the pauses, time-stretch each
line with rubberband (pitch kept; exposition faster, dramatic lines near 1.0x) and lay them on the film timeline with
designed gaps. Output: renders/.film/narr.wav (48 kHz mono) + renders/.film/narr.json (line + word times on the film).
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
SRC = ROOT / "source/narr/narr-andre-v2.mp3"
WORDS = json.load(open(ROOT / "source/narr/narr-v2-words.json"))
SR = 48000

# (first word, last word, tempo, gap after, display text) — display text is what the subtitles show
LINES = [  # "Em média, 11 pra cada versículo" (words 92-97) left out: 58 s was too long; 8 meses carries the scale
    (0, 5, 1.04, 0.26, "Isso não é um arco-íris."),
    (6, 9, 1.00, 0.45, "É a Bíblia inteira."),
    (10, 32, 1.25, 0.18, "Em 2007, um pastor e um pesquisador de computação resolveram desenhar cada vez que a Bíblia aponta pra ela mesma."),
    (33, 42, 1.22, 0.14, "Embaixo, cada risquinho é um capítulo: do Gênesis ao Apocalipse."),
    (43, 53, 1.20, 0.10, "E cada arco liga um versículo a outro que ele ecoa."),
    (54, 59, 1.10, 0.08, "Tipo “Não temas, eu sou contigo”…"),
    (60, 67, 1.10, 0.32, "ligado a “Tudo posso naquele que me fortalece”."),
    (68, 74, 1.18, 0.10, "O gráfico deles mostrou 63 mil ligações."),
    (75, 76, 1.08, 0.24, "E viralizou."),
    (77, 88, 1.18, 0.12, "Só que a base aberta de hoje tem mais de 340 mil."),
    (89, 91, 1.00, 0.42, "Cinco vezes mais."),
    (98, 109, 1.18, 0.36, "Lendo uma por minuto, sem dormir, você ia levar quase 8 meses."),
    (110, 116, 1.12, 0.28, "E o versículo mais conectado de todos?"),
    (117, 119, 1.00, 0.10, "Isaías 9:6."),
    (120, 129, 1.00, 0.50, "“Porque um menino nos nasceu, um filho se nos deu.”"),
    (130, 133, 1.10, 0.10, "Comenta teu versículo favorito."),
    (134, 140, 1.10, 1.30, "Os mais pedidos ganham o próprio mapa."),
]
HEAD = 0.15  # film starts with the voice almost at once (hook)


def silences(path):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.08",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    return list(zip(map(float, re.findall(r"silence_start: ([\d.]+)", e)), map(float, re.findall(r"silence_end: ([\d.]+)", e))))


def build():
    sil = silences(SRC)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(SRC)],
                               capture_output=True, text=True).stdout)
    t = HEAD; out = np.zeros(int(SR * 80), np.float32); lines = []
    for li, (i, j, tempo, gap, text) in enumerate(LINES):
        w0, w1 = WORDS[i], WORDS[j]
        prev_end = WORDS[i - 1]["t1"] if i > 0 else 0.0
        nxt = WORDS[j + 1]["t0"] if j + 1 < len(WORDS) else dur
        # start: end of the silence right before the first word (never before the previous word ends)
        ends = [e for s, e in sil if prev_end - 0.02 <= e <= w0["t0"] + 0.12]
        s0 = max(prev_end + 0.01, (max(ends) if ends else w0["t0"]) - 0.035) if i > 0 else 0.0
        # end: start of the silence after the last word (never after the next word starts)
        starts = [s for s, e in sil if w1["t0"] + 0.05 <= s <= nxt + 0.05]
        s1 = min(nxt - 0.01, (min(starts) if starts else w1["t1"]) + 0.06) if j + 1 < len(WORDS) else min(dur, w1["t1"] + 0.25)
        seg = WORK / f"line{li:02d}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s0:.3f}", "-t", f"{s1 - s0:.3f}", "-i", str(SRC), "-af",
                        f"aresample={SR},rubberband=tempo={tempo}:pitchq=quality:transients=mixed:window=standard,"
                        f"afade=t=in:d=0.008,areverse,afade=t=in:d=0.03,areverse", "-ac", "1", "-c:a", "pcm_f32le", str(seg)], check=True)
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(seg), "-f", "f32le", "-"], capture_output=True).stdout
        x = np.frombuffer(raw, np.float32)
        a = int(round(t * SR)); out[a:a + len(x)] += x
        L = len(x) / SR
        ws = [{"w": WORDS[k]["w"], "t0": round(t + (max(WORDS[k]["t0"], s0) - s0) / tempo, 3),
               "t1": round(t + (min(WORDS[k]["t1"], s1) - s0) / tempo, 3)} for k in range(i, j + 1)]
        lines.append({"i": li, "t0": round(t, 3), "t1": round(t + L, 3), "text": text, "tempo": tempo, "src": [round(s0, 3), round(s1, 3)], "words": ws})
        t += L + gap
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
        print(f"L{L['i']:02d} {L['t0']:6.2f}-{L['t1']:6.2f} x{L['tempo']:.2f}  {L['text']}")
    print("film duration:", round(total, 2))
