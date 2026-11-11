#!/usr/bin/env python3
"""The generation queue of "Grand Testament Adventure".

The free window of the Higgsfield account runs one video at a time, so the series is produced as a queue: one 8 s take
per mission (seedance_2_0, 720p). The first mission of an episode starts from the character sheet; each next one
starts from the last frame of the take before it, which has to be uploaded to Higgsfield first (media_upload, PUT,
media_confirm). This tool keeps the state and writes the next request, ready to hand to the Higgsfield tools.

  python3 -I tools/fila.py prox              the next video request (JSON), or what is missing before it can be asked
  python3 -I tools/fila.py job KEY ID        a request was accepted: remember its job id
  python3 -I tools/fila.py ok KEY URL        a job finished: remember the URL, download the take, save its last frame
  python3 -I tools/fila.py fim KEY MEDIA_ID  the last frame of KEY was uploaded: remember its media id
  python3 -I tools/fila.py falhou KEY        a job failed or was discarded: forget it, so it is asked again
  python3 -I tools/fila.py estado            what exists, per episode
  python3 -I tools/fila.py publicar          copy the state into data/geracoes.json (the tracked manifest)

State: data/.fila.json (not tracked: it changes at every job). KEY is <episode>-<mission>, e.g. jo-cana-2.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from cenas import CENAS, ORDEM, PERSONAGEM, pedido  # noqa: E402

STATE = ROOT / "data/.fila.json"
MANIFEST = ROOT / "data/geracoes.json"
VID = {"model": "seedance_2_0", "aspect_ratio": "9:16", "duration": 8, "resolution": "720p", "mode": "std", "generate_audio": True, "use_unlim": True}
LAST = 191                                                       # the takes have 193 frames; this one is clean


def load():
    if STATE.exists(): return json.load(open(STATE, encoding="utf-8"))
    m = json.load(open(MANIFEST, encoding="utf-8"))
    return {"takes": m.get("takes", {}), "reels": m.get("reels", {})}


def save(s):
    json.dump(s, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def nxt(s):
    """(request or None, note)"""
    busy = [k for k, v in s["takes"].items() if v.get("job") and not v.get("url")]
    if busy: return None, f"em andamento: {busy[0]} ({s['takes'][busy[0]]['job']})"
    for ep in ORDEM:
        for k in (1, 2, 3):
            key = f"{ep}-{k}"
            if key in s["takes"]: continue
            if k == 1:
                return {"key": key, "params": {**VID, "medias": [{"role": "image_references", "value": PERSONAGEM}], "prompt": pedido(ep, 1, True)}}, ""
            prev = s["takes"].get(f"{ep}-{k - 1}", {})
            if not prev.get("fim"):
                return None, f"falta subir o último quadro de {ep}-{k - 1}: source/frames/{ep}-{k - 1}-fim.png  ->  fila.py fim {ep}-{k - 1} MEDIA_ID"
            return {"key": key, "params": {**VID, "medias": [{"role": "start_image", "value": prev["fim"]}], "prompt": pedido(ep, k, False)}}, ""
    return None, "fila vazia: todos os takes de ORDEM existem"


def main():
    a = sys.argv[1:]; s = load()
    if a[0] == "prox":
        r, note = nxt(s)
        if r is None: print(note); return
        print(f"VIDEO {r['key']}:"); print(json.dumps([{"index": 0, "params": r["params"]}], ensure_ascii=False))
    elif a[0] == "job":
        s["takes"][a[1]] = {"job": a[2]}; save(s); print("ok", a[1], a[2])
    elif a[0] == "ok":
        s["takes"][a[1]]["url"] = a[2]; save(s)
        dst = ROOT / "source/takes" / (a[1] + ".mp4"); fr = ROOT / "source/frames" / (a[1] + "-fim.png"); fr.parent.mkdir(exist_ok=True)
        subprocess.run(["curl", "-sS", "-f", "-o", str(dst), a[2]], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(dst), "-vf", f"select='eq(n,{LAST})'", "-frames:v", "1", str(fr)], check=True)
        print("ok", dst, dst.stat().st_size, "bytes | último quadro:", fr)
    elif a[0] == "fim":
        s["takes"][a[1]]["fim"] = a[2]; save(s); print("ok fim", a[1], a[2])
    elif a[0] == "falhou":
        s["takes"].pop(a[1], None); save(s); print("esquecido", a[1])
    elif a[0] == "estado":
        mark = lambda v: "ok" if v and v.get("url") else ("…" if v else "-")
        for ep in ORDEM:
            print(f"{ep:16s} " + " ".join(f"{k}:{mark(s['takes'].get(f'{ep}-{k}')):2s}" for k in (1, 2, 3)) + ("  reel ok" if ep in s.get("reels", {}) else ""))
        print("takes prontos:", sum(1 for v in s["takes"].values() if v.get("url")), "de", 3 * len(ORDEM))
    elif a[0] == "publicar":
        m = json.load(open(MANIFEST, encoding="utf-8")); m.pop("quadros", None); m.update({"takes": s["takes"], "reels": s.get("reels", {})})
        json.dump(m, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1); print("manifest atualizado")


if __name__ == "__main__":
    main()
