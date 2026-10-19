#!/usr/bin/env python3
"""Cut the AI narration (voice "Andre", ElevenLabs via Higgsfield) into lines on its pauses, time-stretch each line with
rubberband (pitch kept) and lay the lines on the film timeline with designed gaps. Line 0 is the cold open: an excerpt of
line 16 played first (flash-forward), followed by the rewind gap.
  python3 narration.py  ->  renders/.film/narr.wav (48 kHz mono) + renders/.film/narr.json (line and word times on the film)
"""
import json, re, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"; WORK.mkdir(parents=True, exist_ok=True)
SRC = ROOT / "source/narr/narr-andre-v1.mp3"
WORDS = json.load(open(ROOT / "source/narr/narr-v1-words.json"))
SR = 48000

# (id, first word, last word, tempo, gap after, subtitle text)
LINES = [  # cut for time (73.7 s -> ~60 s): "E ele não foi o único.", "Agora, segue o caminho.", "vimos a sua estrela.",
    # "E Oseias tinha escrito:" — the cards on screen carry the references
    ("teaser", 98, 106, 1.05, 0.95, "…a resposta é: “Em Belém. Porque assim está escrito.”"),
    ("hook", 0, 15, 1.17, 0.28, "700 anos antes do Natal, um profeta escreveu o nome da cidade onde Jesus ia nascer."),
    ("belem", 16, 16, 1.00, 0.40, "Belém."),
    ("dados", 23, 40, 1.25, 0.06, "O nascimento de Jesus, só 4 capítulos, se liga a mais de 1.500 versículos do Antigo Testamento."),
    ("livros", 41, 45, 1.18, 0.45, "De 38 dos 39 livros."),
    ("nazare", 50, 50, 1.00, 0.15, "Nazaré."),
    ("anjo", 51, 55, 1.18, 0.06, "Um anjo anuncia um filho."),
    ("isaias", 56, 60, 1.20, 0.06, "E Isaías já tinha escrito:"),
    ("virgem", 61, 65, 1.05, 0.18, "“Eis que a virgem conceberá.”"),
    ("votada", 66, 74, 1.22, 0.22, "É a ligação mais votada de todo o Natal."),
    ("km", 75, 78, 1.12, 0.40, "111 quilômetros até Belém."),
    ("magos", 79, 82, 1.15, 0.15, "Magos chegam a Jerusalém."),
    ("herodes", 87, 100, 1.24, 0.10, "E quando o rei Herodes pergunta onde o Cristo ia nascer, a resposta é:"),
    ("escrito", 101, 106, 1.03, 0.50, "“Em Belém. Porque assim está escrito.”"),
    ("egito", 107, 113, 1.18, 0.25, "Aí vem a fuga pro Egito."),
    ("filho", 118, 123, 1.05, 0.50, "“Do Egito chamei o meu filho.”"),
    ("conectado", 124, 131, 1.18, 0.22, "E o versículo mais conectado da Bíblia inteira?"),
    ("is96", 132, 134, 1.00, 0.10, "Isaías 9:6:"),
    ("menino", 135, 139, 1.00, 0.35, "“Porque um menino nos nasceu.”"),
    ("depois", 140, 147, 1.18, 0.10, "700 anos depois, o anjo diz aos pastores:"),
    ("salvador", 148, 152, 1.00, 0.50, "“Vos nasceu hoje o Salvador.”"),
    ("final", 153, 158, 0.98, 1.50, "Antes do Natal, já estava escrito."),
]
HEAD = 0.10


def silences(path):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "silencedetect=noise=-38dB:d=0.08",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    return list(zip(map(float, re.findall(r"silence_start: ([\d.]+)", e)), map(float, re.findall(r"silence_end: ([\d.]+)", e))))


def build():
    sil = silences(SRC)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(SRC)],
                               capture_output=True, text=True).stdout)
    t = HEAD; out = np.zeros(int(SR * 90), np.float32); lines = []
    for li, (lid, i, j, tempo, gap, text) in enumerate(LINES):
        w0, w1 = WORDS[i], WORDS[j]
        prev_end = WORDS[i - 1]["t1"] if i > 0 else 0.0
        nxt = WORDS[j + 1]["t0"] if j + 1 < len(WORDS) else dur
        ends = [e for s, e in sil if prev_end - 0.02 <= e <= w0["t0"] + 0.12]
        s0 = max(prev_end + 0.01, (max(ends) if ends else w0["t0"]) - 0.035) if i > 0 else 0.0
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
        lines.append({"i": li, "id": lid, "t0": round(t, 3), "t1": round(t + L, 3), "text": text, "tempo": tempo,
                      "src": [round(s0, 3), round(s1, 3)], "words": ws})
        t += L + gap
    total = t
    out = out[:int(SR * total)]
    with wave.open(str(WORK / "narr.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "lines": lines}, open(WORK / "narr.json", "w"), ensure_ascii=False, indent=1)
    return total, lines


if __name__ == "__main__":
    total, lines = build()
    for L in lines:
        print(f"L{L['i']:02d} {L['id']:9s} {L['t0']:6.2f}-{L['t1']:6.2f} x{L['tempo']:.2f}  {L['text']}")
    print("film duration:", round(total, 2))
