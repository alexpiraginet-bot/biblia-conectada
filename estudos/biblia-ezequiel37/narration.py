#!/usr/bin/env python3
"""Narration of "Ossos secos, rio da vida" (video 10): OpenAI TTS (gpt-4o-mini-tts), one call per line of script.py,
Brazilian Portuguese asked in the instructions (Alex approves the voice by ear: Whisper cannot tell pt-BR from pt-PT).

  OPENAI_API_KEY=... python3 -I narration.py --voice ash --style intima [--tempo 1.2 --squeeze 0.2]
    -> source/narr/<voice>-<style>/NN-<hash>.flac (cached by line text and direction)
    -> renders/.film/narr.wav + renders/.film/narr.json (line and word times, Whisper on each line)

The key is read from the environment only; it is never written to disk or printed.
"""
import argparse, hashlib, json, os, re, subprocess, sys, unicodedata, urllib.request
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from script import LINES  # noqa: E402

SR = 48000
MODEL = "gpt-4o-mini-tts-2025-12-15"
PACE = ("Ritmo natural e fluido de narração de Reels, por volta de 165 palavras por minuto: a emoção vem da entonação, "
        "nunca da lentidão; sem pausas longas dentro da frase. ")
ACCENT = ("Fale em português do Brasil, com sotaque brasileiro neutro do Sudeste (jamais português de Portugal: vogais "
          "abertas, 'de' como 'dji', 'te' como 'tchi', 's' final suave). ")
STYLES = {
    # Alex 28/10: "ash, porém com entonação mais arrepiante e que passe verdade e amor"
    "intima": ("Narrador brasileiro, voz masculina grave e quente, bem perto do microfone. Entonação arrepiante, íntima e "
               "verdadeira: fala como quem conta algo sagrado a um amigo, com amor e convicção serena, sem pressa mas sem "
               "arrastar. Pausas curtas e intencionais antes das palavras-chave. Nada de tom de locutor ou de teatro."),
    "intensa": ("Narrador brasileiro, voz masculina grave e quente. Entonação arrepiante e cheia de verdade: começa contida, "
                "quase sussurrada, e cresce com emoção e amor nas frases de esperança, como um trailer de filme bíblico, "
                "mas humano e sincero. Pausas curtas antes das palavras-chave. Nada de exagero teatral."),
}
MOOD = {  # direction per line (appended to the style)
    1: "Mistério e silêncio: um lugar de morte.", 2: "Pergunta suspensa, quase um sussurro, que deixa arrepio.",
    3: "Firme e simples.", 4: "Humildade e confiança.", 5: "Autoridade calma.", 6: "Tensão crescendo: algo está acontecendo.",
    7: "Três palavras marcadas; na última frase, um vazio triste.", 8: "Virada: esperança e assombro, a vida voltando.",
    9: "Revelação maravilhada.", 10: "Ternura e amor.", 11: "Nova descoberta, olhar adiante.",
    12: "A água subindo: cada palavra um pouco mais forte.", 13: "Grandeza e paz.", 14: "Promessa, amor e verdade.",
    15: "Clímax caloroso, cheio de vida.", 16: "Fecho emocionante e terno.", 17: "Convite leve e próximo.",
}
LEAD = 0.12                              # voice starts almost at frame 0 (the hook)
GAP = {2: 0.40, 3: 0.28, 7: 0.30, 8: 0.55, 9: 0.40, 10: 0.55, 11: 0.30, 12: 0.28, 13: 0.45, 14: 0.36, 15: 0.50,
       16: 0.55}                          # pause AFTER line i (default 0.26 s)
TARGET_DB = -20.0                        # every line to the same voiced RMS before the mix


def tts(text, out, voice, instructions):
    key = os.environ.get("OPENAI_API_KEY")
    if not key: sys.exit("OPENAI_API_KEY not set")
    body = json.dumps({"model": MODEL, "input": text, "voice": voice, "instructions": instructions, "response_format": "flac"}).encode()
    r = urllib.request.Request("https://api.openai.com/v1/audio/speech", body,
                               {"Authorization": "Bearer " + key, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=600) as f:
            out.write_bytes(f.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace').replace(key, '***')[:600]}")


def load(p, tempo):
    af = ["aresample=48000"] + ([f"rubberband=tempo={tempo}:pitchq=quality"] if abs(tempo - 1) > 1e-3 else [])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-af", ",".join(af), "-ac", "1", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def trim(x, thr_db=-42, pad=0.03):
    w = int(0.01 * SR); n = len(x) // w
    e = 20 * np.log10(np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)
    on = np.where(e > thr_db)[0]
    a, b = max(0, on[0] * w - int(pad * SR)), min(len(x), (on[-1] + 1) * w + int(pad * SR))
    y = x[a:b].copy(); f = int(0.008 * SR)
    y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y


def squeeze(x, max_gap=0.2, thr_db=-40):
    """shorten pauses inside a line to max_gap s (the dramatic reads drag; the emotion is in the voice, not the silence)"""
    w = int(0.01 * SR); n = len(x) // w
    e = 20 * np.log10(np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)
    quiet = e < thr_db
    keep = np.ones(len(x), bool); k = 0
    while k < n:
        if quiet[k]:
            j = k
            while j < n and quiet[j]: j += 1
            run = j - k
            if run * w > max_gap * SR and k > 0 and j < n:
                cut0 = k * w + int(max_gap * SR / 2); cut1 = j * w - int(max_gap * SR / 2)
                keep[cut0:cut1] = False
            k = j
        else:
            k += 1
    y = x[keep]
    return y


def voiced_db(x):
    w = int(0.02 * SR); n = len(x) // w
    r = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)); r = r[r > r.max() * 0.1]
    return 20 * np.log10(np.sqrt((r ** 2).mean()) + 1e-9)


def wav_name(i, text, ins=""):
    """cache key = line number + hash of text and direction, so editing a line regenerates only that line"""
    return f"{i:02d}-{hashlib.sha1((text + ins).encode()).hexdigest()[:8]}.flac"


def instructions(i, style):
    return ACCENT + PACE + STYLES[style] + " " + MOOD[i] if style else ACCENT + PACE + STYLES["intima"]


SYS_ONEPASS = ("Você é um narrador brasileiro de documentários bíblicos para Reels, com sotaque brasileiro natural (nunca de "
               "Portugal). Leia em voz alta EXATAMENTE o texto do usuário, palavra por palavra, na ordem, sem acrescentar, omitir "
               "ou comentar nada. Fale como um ser humano de verdade: voz masculina grave e quente, íntima, arrepiante, cheia de "
               "verdade e amor, respiração natural, ritmo de conversa, variação de entonação; nada de tom de locutor ou de robô. "
               "Faça uma pausa curta entre as frases.")


def onepass_take(engine, voice, out):
    """one call for the whole script; gpt-audio models answer through chat completions with an audio modality"""
    key = os.environ.get("OPENAI_API_KEY")
    if not key: sys.exit("OPENAI_API_KEY not set")
    text = "\n".join(t for _, t in LINES)
    if engine.startswith("gpt-audio"):
        url = "https://api.openai.com/v1/chat/completions"
        body = {"model": engine, "modalities": ["text", "audio"], "audio": {"voice": voice, "format": "wav"},
                "messages": [{"role": "system", "content": SYS_ONEPASS}, {"role": "user", "content": text}]}
    else:
        url = "https://api.openai.com/v1/audio/speech"
        body = {"model": MODEL, "voice": voice, "input": text, "response_format": "wav",
                "instructions": SYS_ONEPASS.split(" Leia em voz alta")[0] + " " + SYS_ONEPASS.split("nada. ")[1]}
    r = urllib.request.Request(url, json.dumps(body).encode(), {"Authorization": "Bearer " + key, "Content-Type": "application/json"},
                               method="POST")
    try:
        with urllib.request.urlopen(r, timeout=900) as f:
            raw = f.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace').replace(key, '***')[:600]}")
    if engine.startswith("gpt-audio"):
        import base64
        raw = base64.b64decode(json.loads(raw)["choices"][0]["message"]["audio"]["data"])
    out.write_bytes(raw)


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if not unicodedata.combining(c))).split()


NUM = {"37": "trinta e sete", "47": "quarenta e sete", "7": "sete", "38": "trinta e oito"}


def spoken(s):
    s = re.sub(r"(\d+)\s*[:,]\s*(\d+)", r"\1 \2", s)
    s = re.sub(r"(\d+)", r" \1 ", s)
    return " ".join(NUM.get(t, t) for t in s.split())


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--voice", default="cedar"); ap.add_argument("--tempo", type=float, default=1.0); ap.add_argument("--style", default=""); ap.add_argument("--squeeze", type=float, default=0.0); ap.add_argument("--engine", default="lines"); ap.add_argument("--maxgap", type=float, default=0.7); ap.add_argument("--files", default="")
    a = ap.parse_args()
    if a.engine != "lines":
        return main_onepass(a)
    take = a.voice + (f"-{a.style}" if a.style else "")
    src = ROOT / "source/narr" / take; src.mkdir(parents=True, exist_ok=True)
    from faster_whisper import WhisperModel
    wm = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")

    def hear(x):
        x16 = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"],
                             input=x.tobytes(), capture_output=True, check=True).stdout
        segs, _ = wm.transcribe(np.frombuffer(x16, np.float32), language="pt", word_timestamps=True, beam_size=5, vad_filter=False)
        return [w for s in segs for w in s.words]

    def score(text, ws):
        return SequenceMatcher(a=norm(text), b=norm(spoken(" ".join(w.word.strip() for w in ws))), autojunk=False).ratio()

    for i, text in LINES:
        ins = instructions(i, a.style)
        p = src / wav_name(i, text, ins)
        if p.exists(): continue
        best = None
        for k in range(3):                                   # TTS sometimes repeats or invents a phrase: retake
            q = src / f"tmp-{i:02d}-{k}.flac"; tts(text, q, a.voice, ins)
            m = score(text, hear(trim(load(q, 1.0))))
            print(f"tts {i:2d} take {k} match {m:.2f}", flush=True)
            if best is None or m > best[0]: best = (m, q)
            if m >= 0.97: break
        best[1].rename(p)
        for q in src.glob(f"tmp-{i:02d}-*.flac"): q.unlink()
    out, lines, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
    for i, text in LINES:
        x = trim(load(src / wav_name(i, text, instructions(i, a.style)), a.tempo))
        if a.squeeze: x = squeeze(x, a.squeeze)
        x *= 10 ** ((TARGET_DB - voiced_db(x)) / 20)
        ws = hear(x)
        heard = " ".join(w.word.strip() for w in ws)
        ratio = score(text, ws)
        d = len(x) / SR
        lines.append({"i": i, "t0": round(t, 3), "t1": round(t + d, 3), "text": text, "voice": take, "heard": heard,
                      "match": round(ratio, 3),
                      "words": [{"w": w.word.strip(), "t0": round(t + max(0.0, w.start), 3), "t1": round(t + min(d, w.end), 3)} for w in ws]})
        print(f"{i:2d} {d:5.2f}s match {ratio:.2f} | {heard}", flush=True)
        out.append(x); t += d
        g = GAP.get(i, 0.26)
        if i != LINES[-1][0]:
            out.append(np.zeros(int(g * SR), np.float32)); t += g
    y = np.concatenate(out)
    work = ROOT / "renders/.film"; work.mkdir(parents=True, exist_ok=True)
    sf.write(work / "narr.wav", np.stack([y, y], 1), SR, subtype="PCM_24")
    json.dump({"duration": round(len(y) / SR, 3), "voice": take, "style": a.style, "model": MODEL, "tempo": a.tempo, "squeeze": a.squeeze, "lines": lines},
              open(work / "narr.json", "w"), ensure_ascii=False, indent=1)
    print("narr", round(len(y) / SR, 2), "s; min match", min(L["match"] for L in lines))


def main_onepass(a):
    """--engine gpt-audio-1.5 | gpt-audio | tts-whole | file (--files a,b, audio made outside): one take of the whole script (cached by engine+voice+text), up to 3
    tries until Whisper hears the script in order; lines are cut in the silences between them (never inside a word), the
    take keeps its own pace (no stretch, no squeeze); only pauses longer than --maxgap between lines are shortened."""
    from faster_whisper import WhisperModel
    wm = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    take = f"{a.voice}-{a.engine}"
    src = ROOT / "source/narr" / take; src.mkdir(parents=True, exist_ok=True)
    text = "\n".join(t for _, t in LINES)
    p = src / f"onepass-{hashlib.sha1((a.engine + a.voice + text + SYS_ONEPASS).encode()).hexdigest()[:8]}.flac"
    if a.engine == "file":
        # audio made outside (Fish Audio, by Alex): the blocks in order, joined with a short pause, kept as one take
        fs = [Path(f) for f in a.files.split(",") if f]
        assert fs, "--files a.mp3,b.mp3"
        parts = []
        for f in fs:
            parts += [load(f, 1.0), np.zeros(int(0.45 * SR), np.float32)]
        p = src / f"blocks-{hashlib.sha1(b''.join(f.read_bytes()[:65536] for f in fs)).hexdigest()[:8]}.flac"
        if not p.exists():
            sf.write(p, np.concatenate(parts), SR, format="FLAC")
    want = [(i, w) for i, t in LINES for w in norm(spoken(t))]

    def hear_full(path):
        x = load(path, a.tempo)
        x16 = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"],
                             input=x.tobytes(), capture_output=True, check=True).stdout
        segs, _ = wm.transcribe(np.frombuffer(x16, np.float32), language="pt", word_timestamps=True, beam_size=5, vad_filter=False)
        ws = []
        for s_ in segs:
            for w in s_.words:
                for tok in norm(spoken(w.word)):
                    ws.append((tok, w.start, w.end, w.word.strip()))
        return x, ws

    if not p.exists():
        best = None
        for k in range(3):
            q = src / f"tmp-{k}.wav"; onepass_take(a.engine, a.voice, q)
            x, ws = hear_full(q)
            m = SequenceMatcher(a=[w for _, w in want], b=[w[0] for w in ws], autojunk=False).ratio()
            print(f"take {k}: {len(x) / SR:.1f}s match {m:.3f}", flush=True)
            if best is None or m > best[0]: best = (m, q)
            if m >= 0.97: break
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(best[1]), "-c:a", "flac", str(p)], check=True)
        for q in src.glob("tmp-*.wav"): q.unlink()
    x, ws = hear_full(p)
    sm = SequenceMatcher(a=[w for _, w in want], b=[w[0] for w in ws], autojunk=False)
    owner = [None] * len(ws)                       # which script line each heard word belongs to
    for blk in sm.get_matching_blocks():
        for k in range(blk.size): owner[blk.b + k] = want[blk.a + k][0]
    last = None                                    # unmatched heard words take the line of the previous word
    for k in range(len(ws)):
        if owner[k] is None: owner[k] = last if last is not None else LINES[0][0]
        last = owner[k]
    spans = {}
    for k, (tok, t0, t1, raw) in enumerate(ws):
        i = owner[k]; sp = spans.setdefault(i, [t0, t1, []]); sp[0] = min(sp[0], t0); sp[1] = max(sp[1], t1); sp[2].append((raw, t0, t1))
    assert sorted(spans) == [i for i, _ in LINES], sorted(spans)
    w = int(0.01 * SR); n = len(x) // w
    e = 20 * np.log10(np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)) + 1e-9)

    def quiet_cut(t_a, t_b):
        """the quietest 10 ms between two words (a silence), as a sample index"""
        a0, b0 = int(t_a * 100), max(int(t_a * 100) + 1, int(t_b * 100))
        return (a0 + int(np.argmin(e[a0:b0]))) * w

    ids = [i for i, _ in LINES]
    cuts = [0] + [quiet_cut(spans[ids[k]][1], spans[ids[k + 1]][0]) for k in range(len(ids) - 1)] + [len(x)]
    out, lines, t = [np.zeros(int(LEAD * SR), np.float32)], [], LEAD
    for k, i in enumerate(ids):
        seg = trim(x[cuts[k]:cuts[k + 1]], pad=0.05)
        # word times relative to the trimmed segment: re-hear the segment so times are exact
        x16 = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"],
                             input=seg.tobytes(), capture_output=True, check=True).stdout
        segs, _ = wm.transcribe(np.frombuffer(x16, np.float32), language="pt", word_timestamps=True, beam_size=5, vad_filter=False)
        wl = [ww for s_ in segs for ww in s_.words]
        heard = " ".join(ww.word.strip() for ww in wl)
        text_i = dict(LINES)[i]
        ratio = SequenceMatcher(a=norm(text_i), b=norm(spoken(heard)), autojunk=False).ratio()
        d = len(seg) / SR
        lines.append({"i": i, "t0": round(t, 3), "t1": round(t + d, 3), "text": text_i, "voice": take, "heard": heard, "match": round(ratio, 3),
                      "words": [{"w": ww.word.strip(), "t0": round(t + max(0.0, ww.start), 3), "t1": round(t + min(d, ww.end), 3)} for ww in wl]})
        print(f"{i:2d} {d:5.2f}s match {ratio:.2f} | {heard}", flush=True)
        out.append(seg); t += d
        if k < len(ids) - 1:
            nat = (cuts[k + 1] - cuts[k]) / SR - d          # the natural pause after the line, kept up to --maxgap
            g = min(max(0.18, nat), a.maxgap)
            out.append(np.zeros(int(g * SR), np.float32)); t += g
    y = np.concatenate(out)
    y *= 10 ** ((TARGET_DB - voiced_db(y)) / 20)
    work = ROOT / "renders/.film"; work.mkdir(parents=True, exist_ok=True)
    sf.write(work / "narr.wav", np.stack([y, y], 1), SR, subtype="PCM_24")
    json.dump({"duration": round(len(y) / SR, 3), "voice": take, "engine": a.engine, "tempo": a.tempo, "lines": lines},
              open(work / "narr.json", "w"), ensure_ascii=False, indent=1)
    print("narr", round(len(y) / SR, 2), "s; min match", min(L["match"] for L in lines))


if __name__ == "__main__":
    main()
