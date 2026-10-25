#!/usr/bin/env python3
"""Score every narration line in every take of "Não foi um grito. Foi uma citação." (voice "Andre", ElevenLabs via Higgsfield) to pick
the best Portuguese delivery. Copied from ../biblia-joao316/tools/takes.py; only norm() learned "1 João" = "Primeira de João".

The voice is English-native and the multilingual model sometimes drifts (mostly at the start of a take). Per line we
measure, with Whisper (faster-whisper large-v3-turbo):
  p_pt  - language-ID probability of Portuguese on the line alone (proxy for accent drift)
  sim   - similarity between what Whisper hears (forced pt) and the script line (intelligibility)
  lp    - mean log word probability of the line (one pt transcription per take, word timestamps)
Output: source/narr/takes.json (word times per take + line ranges + scores) and a printed table.

  python3 -I tools/takes.py
"""
import json, re, subprocess, sys, unicodedata
from difflib import SequenceMatcher
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
NARR = ROOT / "source/narr"
sys.path.insert(0, str(ROOT))
from script import LINES  # noqa: E402  (spoken text of every line, warm-up first)
EXTRA = {}

TAKES = sorted(NARR.glob("take*.mp3")) + sorted(NARR.glob("cta*.mp3"))
UNITS = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze",
         "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]
TENS = {2: "vinte", 3: "trinta", 4: "quarenta", 5: "cinquenta", 6: "sessenta", 7: "setenta", 8: "oitenta", 9: "noventa"}


def num_pt(n):
    if n < 20: return UNITS[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else " e " + UNITS[n % 10])
    if n == 100: return "cem"
    if n < 1000: return {1: "cento", 2: "duzentos", 3: "trezentos"}.get(n // 100, str(n)) + ("" if n % 100 == 0 else " e " + num_pt(n % 100))
    if n == 1000: return "mil"
    if n < 1000000:
        k, r = divmod(n, 1000)
        head = "mil" if k == 1 else num_pt(k) + " mil"
        return head if r == 0 else head + (" e " if r < 100 or r % 100 == 0 else " ") + num_pt(r)
    return str(n)


def norm(s):
    s = s.lower().replace("quatorze", "catorze").replace("ótica", "óptica")
    s = re.sub(r"(\d)\.(\d{3})\b", r"\1\2", s)                     # 67.293 -> 67293
    for f, m in (("duzentas", "duzentos"), ("trezentas", "trezentos"), ("quatrocentas", "quatrocentos")):
        s = s.replace(f, m).replace("1ª", "primeira").replace("1a ", "primeira ")
    s = re.sub(r"\b1\s+(tessalonicenses|timóteo|timoteo)", r"primeira \1", s)
    s = re.sub(r"\b(1|primeira)\s+(de\s+)?jo[aã]o", "primeira de joão", s)
    s = re.sub(r"\d+", lambda m: num_pt(int(m.group())), s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.findall(r"[a-z]+", s)


def load16(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def main():
    from faster_whisper import WhisperModel
    m = WhisperModel("mobiuslabsgmbh/faster-whisper-large-v3-turbo", device="cpu", compute_type="int8", cpu_threads=2)
    script_tok = [(li, w) for li, L in enumerate(LINES) for w in norm(L)]
    out = {"lines": LINES, "takes": {}}
    takes = TAKES
    if "--extra" in sys.argv:
        # only the re-recorded single lines (script.EXTRA: cta*.mp3 -> 19, l13*.mp3 -> 13) are transcribed; the full takes
        # keep their other lines and lose the re-recorded ones
        out = json.load(open(NARR / "takes.json")); out["lines"] = LINES
        for name, tk in out["takes"].items():
            if any(name.startswith(k) for k in EXTRA): continue
            for li in EXTRA.values():
                tk["lines"][li] = {"line": li, "missing": True}
        takes = [f for k in EXTRA for f in sorted(NARR.glob(f"{k}*.mp3"))]
    for tp in takes:
        x = load16(tp)
        segs, info = m.transcribe(x, language="pt", word_timestamps=True, beam_size=2, vad_filter=False,
                                  condition_on_previous_text=False)
        words = [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3), "p": round(w.probability, 3)}
                 for s in segs for w in s.words]
        # align whisper tokens to the script tokens
        wt = []
        for k, w in enumerate(words):
            for tok in norm(w["w"]): wt.append((k, tok))
        sm = SequenceMatcher(a=[t for _, t in script_tok], b=[t for _, t in wt], autojunk=False)
        line_words = {}
        for a, b, size in sm.get_matching_blocks():
            for d in range(size):
                li = script_tok[a + d][0]; k = wt[b + d][0]
                line_words.setdefault(li, set()).add(k)
        rng = {}
        for li in range(len(LINES)):
            ks = sorted(line_words.get(li, []))
            if ks: rng[li] = (ks[0], ks[-1])
        res = []
        for li, L in enumerate(LINES):
            if li not in rng:
                res.append({"line": li, "missing": True}); continue
            k0, k1 = rng[li]
            t0, t1 = words[k0]["t0"], words[k1]["t1"]
            a, b = max(0, int((t0 - 0.12) * 16000)), min(len(x), int((t1 + 0.15) * 16000))
            lang, prob, allp = m.detect_language(x[a:b])
            ap = dict(allp)
            # what was heard on this line = the words of the full-take transcription (faster than a second pass)
            heard = " ".join(w["w"] for w in words[k0:k1 + 1])
            lp = float(np.mean([np.log(max(w["p"], 1e-4)) for w in words[k0:k1 + 1]]))
            sim = SequenceMatcher(a=norm(L), b=norm(heard), autojunk=False).ratio()
            res.append({"line": li, "k": [k0, k1], "t": [t0, t1], "p_pt": round(ap.get("pt", 0.0), 3),
                        "p_en": round(ap.get("en", 0.0), 3), "p_es": round(ap.get("es", 0.0), 3), "lang": lang,
                        "sim": round(sim, 3), "lp": round(lp, 3), "heard": heard})
        if "--extra" in sys.argv:    # a single-line take holds only the warm-up and its line; a stray 1-word match elsewhere is noise
            mine = next(li for k, li in EXTRA.items() if tp.stem.startswith(k))
            res = [r if r["line"] in (0, mine) else {"line": r["line"], "missing": True} for r in res]
        out["takes"][tp.stem] = {"words": words, "lines": res, "dur": round(len(x) / 16000, 3)}
        print(f"== {tp.stem} ({len(x) / 16000:.1f} s, {len(words)} words)")
        for r in res:
            if r.get("missing"):
                print(f"  L{r['line']:02d} MISSING"); continue
            print(f"  L{r['line']:02d} {r['t'][0]:6.2f}-{r['t'][1]:6.2f} pt={r['p_pt']:.3f} en={r['p_en']:.3f} es={r['p_es']:.3f}"
                  f" sim={r['sim']:.2f} lp={r['lp']:.2f} | {r['heard'][:70]}")
        sys.stdout.flush()
    json.dump(out, open(NARR / "takes.json", "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
