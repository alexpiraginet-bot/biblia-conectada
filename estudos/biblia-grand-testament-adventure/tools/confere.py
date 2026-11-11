#!/usr/bin/env python3
"""Checks of a finished reel of "Grand Testament Adventure", measured on the file that is delivered.

  python3 -I tools/confere.py <episode> [--capa 1.0]

It prints and records (data/.fila.json -> reels[episode]) what the file is: picture size, frame rate, frames,
duration, bytes, sha256; loudness of the AAC (integrated LUFS, true peak); where the hard cuts are and how much the
picture changes per frame (the measure that showed the first pilot was slow: 3.20, against 5.78 of the reference; also
given relative to the brightness of the picture, because a night scene measures less for the same movement);
whether Whisper hears speech (the takes are asked for with ambience only); and the sound at every splice hud.py made
(mission boundaries, a change of pace inside a take, the held ending), read from renders/.hud/<episode>-tempos.json.
It also writes what has to be looked at: contact sheets with the Reels safe box drawn (renders/.hud/<episode>-folha-N.jpg, one frame per second) and the
cover (renders/capa-<episode>.jpg, the frame at --capa seconds, with the title card up).

Limits a reel has to respect are checked here and fail loudly: 1080x1920, 24 fps, at most 30 s (asked by Alex on
11/11), at most 29 MB, -14 LUFS +/- 0.3, true peak at or under -1 dBTP.
"""
import hashlib, json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import hud  # noqa: E402

STATE = ROOT / "data/.fila.json"


def probe(f):
    q = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                        "stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels:format=duration,size",
                        "-of", "json", str(f)], capture_output=True, text=True, check=True).stdout
    j = json.loads(q); v = [s for s in j["streams"] if s["codec_type"] == "video"][0]; a = [s for s in j["streams"] if s["codec_type"] == "audio"][0]
    num, den = v["r_frame_rate"].split("/")
    return {"largura": v["width"], "altura": v["height"], "fps": int(num) / int(den), "quadros": int(v["nb_read_frames"]), "video": v["codec_name"],
            "audio": f"{a['codec_name']} {a['sample_rate']} Hz {a['channels']}ch", "duracao_s": float(j["format"]["duration"]), "bytes": int(j["format"]["size"])}


def changes(f):
    """Mean absolute change between consecutive frames (108x192, grey), the same change as a percentage of the frames'
    brightness (a night scene changes less in absolute levels for the same movement), and the hard cuts found."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-vf", "scale=108:192,format=gray", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    g = np.frombuffer(raw, np.uint8).reshape(-1, 192, 108).astype(np.int16)
    d = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2)); cuts = []
    for i in range(len(d)):
        loc = np.median(d[max(0, i - 12):i + 13])
        if d[i] > 18 and d[i] > 3 * loc: cuts.append(i + 1)
    lum = g.mean(axis=(1, 2)); rel = d / np.maximum(1, (lum[1:] + lum[:-1]) / 2) * 100
    return d, rel, cuts


def speech(f):
    """What Whisper hears in the file: (segments after the voice detector, segments without it)."""
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    out = []
    for vad in (True, False):
        segs, _ = m.transcribe(x, language="pt", vad_filter=vad, condition_on_previous_text=False)
        out.append([{"de": round(s.start, 2), "ate": round(s.end, 2), "texto": s.text.strip(), "sem_fala": round(s.no_speech_prob, 2)} for s in segs])
    return out


def seams(ep):
    """The ambience around every splice (the mix minus the interface sounds, whose level in the mix is fitted): its level
    in the 30 ms before and after, and the largest jump between two samples within 5 ms of the splice against the
    jumps of the half second around it (a click stands far above them)."""
    import soundfile as sf
    t = json.load(open(ROOT / f"renders/.hud/{ep}-tempos.json", encoding="utf-8"))
    mix, sr = sf.read(ROOT / f"renders/.hud/{ep}-mix.wav"); ui, _ = sf.read(ROOT / f"renders/.hud/{ep}-ui.wav")
    m = mix.mean(axis=1) if mix.ndim > 1 else mix; n = min(len(m), len(ui)); m, ui = m[:n], ui[:n]
    amb = m - ui * (float(np.dot(m, ui)) / float(np.dot(ui, ui)))
    db = lambda x: 20 * np.log10(max(1e-9, float(np.sqrt(np.mean(x ** 2)))))
    out = []
    for s in t["emendas_som_s"]:
        i = int(round(s * sr)); w = int(0.03 * sr); c = int(0.005 * sr); h = int(0.5 * sr)
        d = np.abs(np.diff(amb[max(0, i - h):i + h])); mid = min(i, h)
        near = d[mid - c:mid + c].max(); far = np.percentile(np.concatenate([d[:mid - c], d[mid + c:]]), 99.9)
        out.append({"s": round(s, 2), "antes_db": round(db(amb[i - w:i]), 1), "depois_db": round(db(amb[i:i + w]), 1), "salto": round(float(near / max(far, 1e-9)), 2)})
    return out


def sheets(f, ep, n_frames, fps):
    idx = sorted(set([0] + list(range(int(fps), n_frames, int(fps))) + [n_frames - 1]))
    sel = "+".join(f"eq(n\\,{i})" for i in idx)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-vf", f"select='{sel}',scale=432:768", "-vsync", "0", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 768, 432, 3); assert len(fr) == len(idx), (len(fr), len(idx))
    k = 432 / hud.W; box = [round(v * k) for v in hud.SAFE]; files = []
    for s in range(0, len(idx), 5):
        part = idx[s:s + 5]; sheet = Image.new("RGB", (432 * len(part), 768))
        for j, i in enumerate(part):
            im = Image.fromarray(fr[s + j]); d = ImageDraw.Draw(im)
            d.rectangle(box, outline=(255, 0, 255), width=2); d.rectangle([0, 0, 118, 26], fill=(0, 0, 0)); d.text((6, 6), f"{i / fps:6.2f} s  q{i}", fill=(255, 255, 255))
            sheet.paste(im, (432 * j, 0))
        out = ROOT / f"renders/.hud/{ep}-folha-{s // 5 + 1}.jpg"; sheet.save(out, quality=88); files.append(out)
    return files


def main():
    ep = sys.argv[1]; capa_t = float(sys.argv[sys.argv.index("--capa") + 1]) if "--capa" in sys.argv else 1.0
    f = ROOT / f"renders/{ep}.mp4"; p = probe(f)
    lufs, tp = hud.loudness(f); d, rel, cuts = changes(f); fps = p["fps"]
    vad, raw = speech(f); sm = seams(ep)
    capa = ROOT / f"renders/capa-{ep}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-vf", f"select='eq(n\\,{int(round(capa_t * fps))})'", "-frames:v", "1", "-q:v", "2", str(capa)], check=True)
    r = {"arquivo": f"renders/{ep}.mp4", "sha256": hashlib.sha256(f.read_bytes()).hexdigest(), "bytes": p["bytes"], "quadros": p["quadros"],
         "duracao_s": round(p["quadros"] / fps, 3), "lufs": lufs, "pico_dbtp": tp, "cortes_s": [round(c / fps, 2) for c in cuts],
         "mudanca_mediana": round(float(np.median(d)), 2), "mudanca_relativa_pct": round(float(np.median(rel)), 1), "fala_ouvida": [s["texto"] for s in vad], "emendas_som": sm, "capa": f"renders/capa-{ep}.jpg"}
    print(f"{f.name}: {p['largura']}x{p['altura']}, {fps:g} fps, {p['quadros']} quadros, {r['duracao_s']} s (container {p['duracao_s']:.3f} s), "
          f"{p['bytes'] / 1e6:.2f} MB, {p['video']} + {p['audio']}")
    print(f"som: {lufs:.1f} LUFS, pico real {tp:.1f} dBTP")
    print(f"imagem: mudança mediana por quadro {r['mudanca_mediana']} ({r['mudanca_relativa_pct']}% da luz do quadro); cortes em {', '.join(f'{c:.2f} s' for c in r['cortes_s']) or 'nenhum'}")
    print("Whisper com detector de voz:", vad or "nenhuma fala"); print("Whisper sem detector (o que ele inventa em cima de ruído):", raw or "nada")
    print("emendas do som (ambiente, sem os sons da interface):")
    for s in sm: print(f"   {s['s']:6.2f} s: {s['antes_db']} dB antes, {s['depois_db']} dB depois, maior salto entre amostras = {s['salto']}x o normal em volta")
    for s in sheets(f, ep, p["quadros"], fps): print("folha:", s)
    print("capa:", capa, f"({capa.stat().st_size} bytes, quadro em {capa_t} s)")
    bad = []
    if (p["largura"], p["altura"]) != (hud.W, hud.H): bad.append("tamanho")
    if abs(fps - hud.FPS) > 1e-6: bad.append("fps")
    if r["duracao_s"] > 30: bad.append("mais de 30 s")
    if p["bytes"] > 29e6: bad.append("mais de 29 MB")
    if abs(lufs + 14.0) > 0.3: bad.append("LUFS fora de -14 +/- 0,3")
    if tp > -1.0: bad.append("pico real acima de -1 dBTP")
    if vad: bad.append("o detector de voz achou fala: ouvir o trecho")
    if any(s["salto"] > 6 for s in sm): bad.append("estalo numa emenda do som")
    tm = json.load(open(ROOT / f"renders/.hud/{ep}-tempos.json", encoding="utf-8"))
    if tm["quadros"] != p["quadros"]: bad.append(f"o arquivo tem {p['quadros']} quadros e hud.py montou {tm['quadros']}")
    s = json.load(open(STATE, encoding="utf-8")); old = s.setdefault("reels", {}).get(ep, {})
    s["reels"][ep] = {**r, **({"entregue": old["entregue"]} if old.get("entregue") and old.get("sha256") == r["sha256"] else {})}
    json.dump(s, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("LIMITES OK" if not bad else "FORA DO LIMITE: " + "; ".join(bad)); sys.exit(0 if not bad else 1)


if __name__ == "__main__":
    main()
