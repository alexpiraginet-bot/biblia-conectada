"""What a raea composition needs to draw one mission of a special the way jornada.py draws it.

    python3 -I tools/raea_export.py fase-final 1            # -> renders/.raea/fase-final-m1/

The pilot of 21/11/2026 (PROJETO.md): the same mission rendered by raea (React/TypeScript on the GPU) on Alex's
machine, to compare with ours. Nothing here is typed by hand: the times, the lines and their references, the place's
plate and the radar come from jornada.build(plano=True), the same code that renders the reel. Written:

    <ep>-m<k>.json        the schedule in seconds of the mission, the lines, the plate, the progress bar frame by frame
    radar-a.png, radar-b.png  the radar of each shot as jornada draws it (cropped; its corner is in the JSON)
    scrim.png             hud.scrims(), the dark ramps at the top and the bottom
    som.wav               the mission's sound from the reel's mix (renders/.hud/<ep>-mix.wav: ambience at its pace and the
                          interface sounds, before the loudness pass; raea masters it with <Mix>)
    fonts/                Space Grotesk 500/600/700 (static cuts of the variable font hud.py uses), Space Mono, the OFL
"""
import hashlib, json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from PIL import Image  # noqa: E402
import hud  # noqa: E402
import jornada  # noqa: E402


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()


def fonts(dst):
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    dst.mkdir(parents=True, exist_ok=True)
    for w in (500, 600, 700):                                                     # the weights hud.py asks for (grot(size, w))
        f = instantiateVariableFont(TTFont(hud.FONTS / "SpaceGrotesk-VF.ttf"), {"wght": w})
        f.save(dst / f"SpaceGrotesk-{w}.ttf")
    for name in ("SpaceMono-Bold.ttf", "SpaceMono-Regular.ttf", "OFL-SpaceGrotesk.txt", "OFL-SpaceMono.txt"):
        (dst / name).write_bytes((hud.FONTS / name).read_bytes())


def main(ep, k1, out=None):
    jornada.usar(ep); J = jornada.J; ms = J["missoes"]; n = len(ms); k = k1 - 1
    P = jornada.build(plano=True); FPS = P["fps"]
    starts, BEAT, CUT, end_t = P["starts"], P["beats"], P["cuts"], P["end_t"]
    nb = P["nb"][k]; s0 = starts[k]; mi = ms[k]
    out = Path(out) if out else ROOT / f"renders/.raea/{ep}-m{k1}"; out.mkdir(parents=True, exist_ok=True)

    # the take, played at the mission's pace: one clip per stretch of jornada's retime(), in frames of the reel
    segs, c = [], 0.0
    for a, b, v in P["segs"][k]:
        j0 = -(-int(round(c * FPS * 1e6)) // 1_000_000); c1 = c + (b - a) / v
        j1 = min(nb, -(-int(round(c1 * FPS * 1e6)) // 1_000_000))
        segs.append(dict(de_quadro=j0, quadros=j1 - j0, origem_quadro=(a + (j0 / FPS - c) * v) * FPS, velocidade=v,
                         origem_s=[a, b])); c = c1
    assert segs[-1]["de_quadro"] + segs[-1]["quadros"] == nb, (segs, nb)

    # frame by frame, the two states jornada.build.frame() decides with a rule rather than an event: whether the
    # objective is ticked (its "done" line) and the progress bar under the radar (its "prog_done" line)
    isd = isinstance(mi.get("objetivo"), dict); quadros = []
    for j in range(nb):
        t = j / FPS; g = s0 + t; shot = "b" if t >= CUT[k] else "a"
        done = (g >= end_t) if k == n - 1 else (t >= (CUT[k] - 0.55 if isd and shot == "a" else BEAT[k] - 0.8))
        pd = sum(1 for kk in range(n) if starts[kk] + BEAT[kk] - 0.8 <= g) if g < end_t else n
        quadros.append([shot, int(done), min(pd, n), round(0.0 if pd > k else min(1.0, t / max(0.1, BEAT[k] - 0.8)), 5)])
    assert not mi.get("cena") and not mi.get("viagem") and not mi.get("contador") and not mi.get("banner"), \
        "this pilot draws a mission without cutscene, travel, counter or banner"

    obj = mi.get("objetivo"); txt = (lambda sh: obj.get(sh) if isd else obj)
    radar = {}
    for sh in "ab":                                                              # each shot's radar at its first frame
        im = Image.new("RGBA", (hud.W, hud.H), (0, 0, 0, 0)); t0 = 0.0 if sh == "a" else CUT[k]
        P["radar_on"](im, k, sh, t0, s0 + t0, placa=False)
        box = im.getbbox(); im.crop(box).save(out / f"radar-{sh}.png"); radar[sh] = dict(arquivo=f"radar-{sh}.png", x=box[0], y=box[1])
    hud.scrims().save(out / "scrim.png")

    mix = ROOT / f"renders/.hud/{ep}-mix.wav"
    assert mix.exists(), f"{mix}: render the reel first (python3 -I jornada.py --ep {ep})"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s0:.6f}", "-t", f"{nb / FPS:.6f}", "-i", str(mix), "-c:a", "pcm_s16le",
                    str(out / "som.wav")], check=True)
    fonts(out / "fonts")

    take = ROOT / "source/takes" / mi["take"]
    rec = json.load(open(ROOT / "data/geracoes.json", encoding="utf-8"))["takes"].get(Path(mi["take"]).stem, {})
    head = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    doc = dict(
        origem=f"tools/raea_export.py {ep} {k1} (commit {head}), {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        ep=ep, missao=k1, missoes=n, fps=FPS, quadros=nb, largura=hud.W, altura=hud.H,
        take=dict(arquivo=mi["take"], url=rec.get("url"), sha256=sha256(take), quadros_origem=jornada.frames_of(take)),
        clipes=segs, corte_s=CUT[k], quadros_estado=quadros,
        cartao=dict(ate_s=P["tcard"] if k == 0 else 0.0, some_s=0.25,
                    gancho=[gl.format(s=round(P["total"] / FPS)) for gl in J["gancho"]], titulo=J["titulo"].upper(), ref=J["ref"].upper()),
        topo=["GRAND TESTAMENT ADVENTURE", "RECRIAÇÃO · IA"],                    # as hud.header() writes them
        rotulo=f"MISSÃO {k1} DE {n}",
        objetivo={sh: txt(sh).upper() for sh in "ab" if txt(sh)},
        acoes=[dict(texto=a.upper(), plano=sh, mostra_s=st, aperta_s=pr) for a, sh, st, pr in P["acoes"][k]],
        falas=[dict(texto=f, ref=r.upper(), de_s=a0 - s0, ate_s=a1 - s0, plano=sh,                      # the lines broken as hud.subtitle() breaks them
                    linhas=hud.wrap_even("“" + f + "”", hud.grot(46, 500), 860)) for a0, a1, f, r, kk, sh in P["falas"] if kk == k],
        placa={sh: P["placa"](k, sh) for sh in "ab"},
        radar=radar, layout=dict(safe=hud.SAFE, mx=hud.MX, my=hud.MY, r=hud.R),
        cores=dict(creme=hud.CREAM, ouro=hud.GOLD, escuro=hud.DARK),
        som=dict(arquivo="som.wav", de_s=s0, origem=f"renders/.hud/{ep}-mix.wav"))
    (out / f"{ep}-m{k1}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    print(out, f"{nb} frames;", ", ".join(f"{c['quadros']} at {c['velocidade']}x" for c in segs))


if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], int(a[1]), a[a.index("--out") + 1] if "--out" in a else None)
