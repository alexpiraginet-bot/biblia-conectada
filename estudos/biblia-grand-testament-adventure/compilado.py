#!/usr/bin/env python3
"""A meme compilation of "Grand Testament Adventure": the best moments of the finished reels, cut together under one
line of text (Alex, 12/11 08:53: 'Faça um agora reunindo um pouco de tudo e o tema será! "Agora quero ver se minha mãe
não me deixa jogar. 🤣🤣"').

The pieces are cut from the delivered reels (renders/<episode>.mp4), so every frame keeps its own HUD, its literal
BLIVRE subtitle and the "RECRIAÇÃO · IA" mark. The line sits in a white box between the mission line and the middle of
the frame, where the reels only show the title card (left out here). Sound: each piece keeps its own (ambience and
interface), 15 ms fades at every cut, then -14 LUFS with the true peak under -1 dBTP.

  python3 -I compilado.py --still 0,5,12     -> renders/.hud/compilado-*.jpg (with the Reels safe box)
  python3 -I compilado.py                    -> renders/compilado-mae.mp4
"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "renders/compilado-mae.mp4"
W, H, FPS = 1080, 1920, 24
TEXTO = ["Agora quero ver se minha mãe", "não me deixa jogar. 🤣🤣"]          # Alex's line, as he wrote it
# (reel, from s, to s): seconds of the delivered reel; each piece was chosen on its contact sheet (renders/.hud/*-folha-*)
PECAS = [
    ("mt-aguas", 3.00, 5.60),        # walking into the storm and onto the waves, the boat ahead
    ("mc-pescadores", 3.00, 5.20),   # down the village street to the beach
    ("mc-pescadores", 11.00, 13.40), # the two fishermen drop the net and run to him ("Vinde após mim")
    ("mc-legiao", 4.60, 7.00),       # the man with the broken chains runs down from the tombs
    ("mc-legiao", 8.00, 9.60),       # the key prompt "ORDENAR" over the kneeling man
    ("mc-legiao", 10.40, 12.40),     # the smoke tears out of him toward the herd
    ("mc-legiao", 14.10, 16.60),     # the herd goes over the cliff into the sea
    ("mt-aguas", 11.00, 13.50),      # Pedro walks on the water toward him, the wave rises
    ("mt-aguas", 14.00, 15.60),      # the key prompt "SEGURAR" as Pedro sinks
    ("mt-aguas", 20.90, 22.62),      # "MISSÃO CONCLUÍDA"
]
BOX_Y = 475                                                          # centre of the white box


def caixa():
    """The line in a white rounded box, black Inter ExtraBold, the emoji in colour (Noto Color Emoji is a bitmap font
    drawn at 109 px and scaled to the text)."""
    size = 52; f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", size)
    em = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
    lh = int(size * 1.22); pad_x, pad_y = 44, 30

    def parts(line):
        out, cur = [], ""
        for ch in line:
            e = ord(ch) >= 0x1F000
            if e:
                if cur: out.append(("t", cur)); cur = ""
                out.append(("e", ch))
            else: cur += ch
        return out + ([("t", cur)] if cur else [])

    def glyph(ch):
        g = Image.new("RGBA", (136, 128), (0, 0, 0, 0)); ImageDraw.Draw(g).text((0, 0), ch, font=em, embedded_color=True)
        g = g.crop(g.getbbox()); s = size * 1.05 / g.height
        return g.resize((max(1, round(g.width * s)), max(1, round(g.height * s))), Image.LANCZOS)

    widths = []
    for line in TEXTO:
        w = 0
        for k, v in parts(line): w += f.getlength(v) if k == "t" else glyph(v).width + 4
        widths.append(w)
    bw = int(max(widths) + 2 * pad_x); bh = int(lh * len(TEXTO) + 2 * pad_y)
    assert bw <= 900, f"box {bw} px wider than the safe box"
    im = Image.new("RGBA", (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=28, fill=(255, 255, 255, 255))
    for li, line in enumerate(TEXTO):
        x = (bw - widths[li]) / 2; yc = pad_y + li * lh + lh / 2
        for k, v in parts(line):
            if k == "t":
                d.text((x, yc), v, font=f, fill=(0, 0, 0, 255), anchor="lm"); x += f.getlength(v)
            else:
                g = glyph(v); im.alpha_composite(g, (int(x + 2), int(yc - g.height / 2))); x += g.width + 4
    return im


def overlay():
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); b = caixa()
    sh = Image.new("RGBA", b.size, (0, 0, 0, 0)); sh.putalpha(b.split()[3].point(lambda v: int(v * 0.28)))
    lay.alpha_composite(sh, ((W - b.width) // 2 + 4, BOX_Y - b.height // 2 + 8)); lay.alpha_composite(b, ((W - b.width) // 2, BOX_Y - b.height // 2))
    p = ROOT / "renders/.hud/compilado-texto.png"; lay.save(p); return p, b.size


def frames(a, b):
    return int(round(a * FPS)), int(round(b * FPS))


def build(out, stills=None):
    png, size = overlay()
    ins, fc, lab = [], [], []
    reels = sorted({r for r, _, _ in PECAS}); idx = {r: i for i, r in enumerate(reels)}
    for r in reels: ins += ["-i", str(ROOT / f"renders/{r}.mp4")]
    ins += ["-i", str(png)]
    total = 0
    for k, (r, a, b) in enumerate(PECAS):
        f0, f1 = frames(a, b); n = f1 - f0; d = n / FPS; total += n
        fc.append(f"[{idx[r]}:v]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS[v{k}]")
        fc.append(f"[{idx[r]}:a]atrim=start={f0 / FPS}:end={f1 / FPS},asetpts=PTS-STARTPTS,aresample=48000,"
                  f"afade=t=in:d=0.015,afade=t=out:st={d - 0.015:.4f}:d=0.015[a{k}]")
        lab.append(f"[v{k}][a{k}]")
    fc.append("".join(lab) + f"concat=n={len(PECAS)}:v=1:a=1[cv][ca]")
    fc.append(f"[cv][{len(reels)}:v]overlay=0:0:format=auto,format=yuv420p[v]")
    if stills:
        sel = "+".join(f"eq(n\\,{int(round(t * FPS))})" for t in stills)
        fc.append(f"[v]select='{sel}'[s]"); fc.append("[ca]anullsink")                 # the sound is not needed for stills
        raw = subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[s]", "-vsync", "0", "-f", "rawvideo",
                              "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
        n = len(raw) // (W * H * 3)
        for i, t in enumerate(stills[:n]):
            im = Image.frombytes("RGB", (W, H), raw[i * W * H * 3:(i + 1) * W * H * 3]); dd = ImageDraw.Draw(im)
            dd.rectangle([90, 260, 990, 1660], outline=(255, 0, 255), width=3); p = ROOT / f"renders/.hud/compilado-{t:05.2f}.jpg"; im.save(p, quality=88); print(p)
        return
    tmp = ROOT / "renders/.hud/compilado-bruto.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[ca]", "-c:v", "libx264", "-preset", "slow",
                    "-crf", "18", "-maxrate", "9M", "-bufsize", "18M", "-r", str(FPS), "-c:a", "pcm_s16le", str(tmp).replace(".mp4", ".mov")], check=True)
    src = str(tmp).replace(".mp4", ".mov"); I = loud(src)[0]; gain = -14.0 - I
    for _ in range(3):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af",
                        f"volume={gain:.2f}dB,alimiter=limit=0.8:level=disabled,aresample=48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
        I, P = loud(out)
        if abs(I + 14) <= 0.3: break
        gain += -14 - I
    print(out, f"{total} quadros, {total / FPS:.2f} s, {out.stat().st_size / 1e6:.2f} MB, {I} LUFS, pico real {P} dBTP, caixa {size}")


def loud(f):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(f), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]; return float(s.split("I:")[1].split()[0]), float(s.split("Peak:")[1].split()[0])


if __name__ == "__main__":
    if "--still" in sys.argv: build(OUT, [float(x) for x in sys.argv[sys.argv.index("--still") + 1].split(",")])
    else: build(OUT)
