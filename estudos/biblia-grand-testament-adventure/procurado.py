#!/usr/bin/env python3
""""Procurado": the open-world special of Grand Testament Adventure (approved by Alex on 12/11/2026).

If he lived today in an open world, every sign he gives raises his wanted level, as the Gospels tell it: after the
healing on the sabbath the Pharisees plan how to kill him (Mark 3:6), after the tables are overturned they look for a way
to kill him (Mark 11:18), the woman is brought to have something to accuse him of (John 8:6), after Lazarus they plan
his death (John 11:53), and then there is an order to report where he is so he can be arrested (John 11:57). At five
stars every player runs; he walks toward the lights and asks "A quem buscais?" (John 18:4-6).

Three parts of three takes (cenas.py, procurado-1..3). This file holds what is drawn over them and builds each part:
the mission line (hud.objective), the stars of the wanted level (ours: five stars beside the radar, a pop and a siren
chirp when one is gained, blinking at five), a radar of a fictional city of today (drawn here, seeded, so it is the same
map in every part), the place plate, the key prompts, the subtitles (literal BLIVRE, checked here before anything is
drawn) and the cards ("12 HORAS ANTES", the part's opening and its ending).

  python3 -I procurado.py procurado-1                    -> renders/procurado-1.mp4 (1080x1920, 24 fps)
  python3 -I procurado.py procurado-1 --still 0.5,5,12   -> renders/.hud/procurado-1-<t>.jpg
  python3 -I procurado.py --check                        -> every subtitle against the BLIVRE
  python3 -I procurado.py --map                          -> renders/.hud/procurado-mapa.png (the city of the radar)
"""
import json, math, re, subprocess, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))                         # -I leaves the script's folder out of the path
import hud  # noqa: E402
from hud import (W, H, FPS, TAKE, SAFE, CREAM, GOLD, DARK, SKY, R, SS, MX, MY, grot, mono, tw, draw_text, wrap_even, shadowed, layer,
                 cropped, faded, ramp, scrims, objective, subtitle, prompt, progress, cut_times, loudness)

ROOT = hud.ROOT
REPO = ROOT.parent.parent
RED, BLUE, WHITE = (255, 72, 64), (80, 150, 255), (255, 255, 255)
LIVROS = {"Matt": ("MAT", "Mateus"), "Mark": ("MAR", "Marcos"), "Luke": ("LUK", "Lucas"), "John": ("JOH", "João")}

# ------------------------------------------------------------------------------------------------ the three parts
# Per mission: take, objetivo (shown from `objetivo_de`), lugar per shot (a = before the take's cut, b = after), falas
# (shot, or the second of the take where a shot-a line starts; OSIS verse; literal BLIVRE fragment), corte (the second
# where shot b starts, for a take without a hard cut), estrelas (shot or second of the take, count), acao (key prompt) or escolha
# (two keys, the second one pressed), cartao (a centred card at the cut), radar per shot (x, y in 0-1 of the city map,
# heading in degrees, speed), ritmo (as in hud.py).
PARTES = {
    "procurado-1": dict(parte=1, gancho=["TODO MUNDO FOGE COM 5 ESTRELAS.", "ELE FOI AO ENCONTRO."], inicio_ate="corte",
                        fim=["CONTINUA NA PARTE 2"], ritmo=1.1, pausa=1.5, missoes=[            # pausa: the balcony shot and its line stay up under the end card
        # this take changes shot with a dissolve, not a hard cut: 3.83-4.25 s (brightness 88 -> 146, measured), so its "cut" is
        # the middle of it, covered by a white flash and the card
        dict(take="procurado-1-1.mp4", corte=4.04, objetivo="Ande pela cidade", objetivo_de="corte", lugar={"a": "Parque das oliveiras", "b": "Calçadão"},
             falas=[], estrelas=[("a", 5), ("b", 0)], pisca="a", cartao="12 HORAS ANTES",
             radar={"a": (0.17, 0.74, 90, 0.4), "b": (0.70, 0.44, 0, 1.0)}),
        dict(take="procurado-1-2.mp4", objetivo="Cure o homem da mão definhada", lugar={"a": "Salão do centro"}, acao="Curar",
             falas=[("a", "Mark.3.5", "Estende a tua mão."), ("b", "Mark.3.6", "para combinarem sobre como o matariam.")], motivo="Curou a mão de um homem no sábado",
             estrelas=[("b", 1)], radar={"a": (0.56, 0.55, 270, 0.3)}),
        dict(take="procurado-1-3.mp4", objetivo="Vire as mesas dos cambistas", lugar={"a": "Templo da cidade"}, acao="Virar a mesa",
             falas=[("a", "John.2.16", "não torneis a casa de meu Pai uma casa de comércio!"), ("b", "Mark.11.18", "buscavam uma maneira de o matar")],
             motivo="Virou as mesas dos cambistas no templo",
             estrelas=[("b", 2)], radar={"a": (0.45, 0.37, 0, 0.5)}),
    ]),
    "procurado-2": dict(parte=2, gancho=["DUAS ESTRELAS POR FAZER O BEM.", "E VAI PIORAR."], fim=["CONTINUA NA PARTE 3"], ritmo=1.1, pausa=1.5, missoes=[
        # the opening card covers this mission's first 2.2 s, so shot a (he kneels and writes) has no room for a line; the
        # line goes on shot b, where he stands up as in John 8:7 and the stones drop; shot b runs at real speed to hold it
        dict(take="procurado-2-1.mp4", objetivo="Escreva na terra", lugar={"a": "Praia"}, acao="Escrever", estrelas=[("a", 2), ("b", 3)],
             falas=[("b", "John.8.7", "Aquele de vós que está sem pecado, seja o primeiro que atire pedra contra ela.")],
             motivo="Não deixou apedrejarem a mulher", ritmo=[("corte", 1.2), (None, 1.0)],
             radar={"a": (0.735, 0.56, 90, 0.15)}),
        # one continuous shot, no hard cut: he walks up, raises his arms from 2.9 s, and the doorway lights up at 4.6 s
        # (its mean brightness 9 -> 43 between 4.50 and 4.67 s, measured), so that is where shot b starts
        dict(take="procurado-2-2.mp4", objetivo="Chame Lázaro para fora", lugar={"a": "Cemitério do morro"}, acao="Chamar", corte=4.6,
             ritmo=[(2.9, 1.3), ("corte", 0.9), (None, 1.1)],
             falas=[(2.9, "John.11.43", "Lázaro, sai fora."), ("b", "John.11.44", "Desatai-o, e deixai-o ir.")],
             estrelas=[("a", 3)], radar={"a": (0.22, 0.24, 0, 0.4)}),
        # shot b (the police cars follow, hard cut at 4.08 s) plays at real speed so John 11:53 stays up before the end card
        dict(take="procurado-2-3.mp4", objetivo="Siga pela cidade", lugar={"a": "Centro"}, ritmo=[("corte", 1.2), (None, 1.0)],
             falas=[("a", "John.11.47", "Que faremos? Porque este homem faz muitos sinais."),
                    ("b", "John.11.53", "Então desde aquele dia se aconselhavam juntos para o matarem.")], motivo="Chamou Lázaro para fora do túmulo",
             estrelas=[("a", 3), ("b", 4)], radar={"a": (0.50, 0.47, 180, 1.0)}),
    ]),
    "procurado-3": dict(parte=3, gancho=["CINCO ESTRELAS.", "TODO JOGADOR FOGE. ELE NÃO."], fim=["CONTINUA NA PÁSCOA"], ritmo=1.1, pausa=1.2, missoes=[
        # as in part 2, the opening card leaves shot a of the first mission no room for a line: John 11:57 goes on shot b, where
        # the companion in the hoodie makes his call, and John 18:2 moves to the garden, while he prays
        # the screens turn red and the phones ring at 1.35 s of the take (red pixels 0.6% -> 1.2% at 1.33 s, sound -30 -> -24 dB
        # RMS at 1.34 s, measured): the fifth star; hard cut at 4.04 s, the call on shot b at real speed
        dict(take="procurado-3-1.mp4", objetivo="Atravesse o centro", lugar={"a": "Centro"}, estrelas=[("a", 4), (1.35, 5)],
             falas=[("b", "John.11.57", "se alguém soubesse onde ele estava, o denunciasse, para que o pudessem prender.")],
             motivo="A ordem de procura chegou a todos", ritmo=[("corte", 1.15), (None, 1.0)], radar={"a": (0.48, 0.60, 225, 1.0)}),
        dict(take="procurado-3-2.mp4", objetivo="Ore no jardim", lugar={"a": "Parque das oliveiras"}, acao="Orar", estrelas=[("a", 5)],
             falas=[("a", "John.18.2", "Judas, o que o traía, conhecia aquele lugar"), ("b", "John.18.3", "veio ali com lanternas, tochas, e armas.")],
             radar={"a": (0.16, 0.74, 90, 0.0)}),
        dict(take="procurado-3-3.mp4", objetivo="Vá ao encontro deles", lugar={"a": "Parque das oliveiras"}, escolha=("Fugir", "Ir ao encontro"),
             falas=[("a", "John.18.4", "A quem buscais?"), ("b", "John.18.6", "Quando pois lhes disse: Eu sou, voltaram para trás, e caíram em terra.")],
             estrelas=[("a", 5)], pisca="ab", radar={"a": (0.17, 0.74, 90, 0.4)}),
    ]),
}
CREDITOS = ["TEXTO: BÍBLIA LIVRE (CC BY 4.0 BR) · CIDADE E MAPA FICTÍCIOS", "IMAGENS GERADAS POR IA · RECRIAÇÃO, NÃO É UM JOGO QUE EXISTE"]

# ------------------------------------------------------------------------------------------------ the BLIVRE
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",").replace(" .", ".").strip()


def blivre():
    t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8"); raw = {}
    for line in t.splitlines():
        m = re.match(r"^(\w+) (\d+):(\d+) (.*)$", line)
        if m: raw[(m[1], int(m[2]), int(m[3]))] = m[4]
    assert len(raw) == 31102, len(raw)
    return raw


def check():
    """Every subtitle is a literal fragment of the BLIVRE verse it cites. Returns {(osis, frag): 'Livro c:v'}."""
    raw = blivre(); refs = {}; bad = []
    for pid, p in PARTES.items():
        for k, mi in enumerate(p["missoes"]):
            for shot, osis, frag in mi["falas"]:
                bk, c, v = osis.split("."); verse = plain(raw[(LIVROS[bk][0], int(c), int(v))])
                if frag not in verse: bad.append(f"{pid} missão {k + 1}: “{frag}” não é literal de {osis}: {verse}")
                refs[(osis, frag)] = f"{LIVROS[bk][1]} {c}:{v}"
    for b in bad: print("FAIL", b)
    assert not bad, "subtitles that are not literal BLIVRE"
    return refs


# ------------------------------------------------------------------------------------------------ the city of the radar
CITY = 1700                                                    # the map, px at 1x (the radar shows R px of it)


def city():
    """A fictional coastal city (seeded: the same map every time): sea and beach to the east, a grid of streets and blocks,
    an avenue along the promenade, parks, the olive park in the south-west, the temple, the hill with the cemetery."""
    s = CITY * SS; rng = np.random.default_rng(1957)
    im = Image.new("RGB", (s, s), (40, 44, 48)); d = ImageDraw.Draw(im)
    u = lambda v: int(v * s)
    d.polygon([(u(0.76), 0), (s, 0), (s, s), (u(0.74), s), (u(0.75), u(0.6)), (u(0.77), u(0.3))], fill=(36, 92, 140))           # the sea
    d.line([(u(0.77), 0), (u(0.77), u(0.3)), (u(0.75), u(0.6)), (u(0.74), s)], fill=(214, 196, 150), width=u(0.022))              # the beach
    d.line([(u(0.735), 0), (u(0.735), u(0.3)), (u(0.715), u(0.6)), (u(0.705), s)], fill=(170, 170, 160), width=u(0.012))         # the avenue on the promenade
    step = 0.055
    for i in range(1, 15):                                                                                                         # blocks
        for j in range(1, 19):
            x0, y0 = i * step, j * step
            if x0 > 0.69: continue
            jit = rng.uniform(-0.004, 0.004, 4)
            shade = int(rng.uniform(56, 74)); d.rounded_rectangle([u(x0 + 0.006 + jit[0]), u(y0 + 0.006 + jit[1]), u(x0 + step - 0.006 + jit[2]), u(y0 + step - 0.006 + jit[3])],
                                                                   radius=u(0.004), fill=(shade, shade + 3, shade + 6))
    d.line([(u(0.05), u(0.95)), (u(0.70), u(0.15))], fill=(150, 150, 140), width=u(0.012))                                       # a diagonal avenue
    d.ellipse([u(0.08), u(0.65), u(0.27), u(0.83)], fill=(58, 96, 52))                                                             # the olive park
    for _ in range(90):
        cx, cy = rng.uniform(0.09, 0.26), rng.uniform(0.66, 0.82)
        if ((cx - 0.175) / 0.095) ** 2 + ((cy - 0.74) / 0.09) ** 2 < 1: d.ellipse([u(cx - 0.004), u(cy - 0.004), u(cx + 0.004), u(cy + 0.004)], fill=(92, 128, 70))
    d.ellipse([u(0.12), u(0.14), u(0.32), u(0.33)], fill=(84, 92, 70))                                                             # the hill with the cemetery
    for _ in range(40):
        cx, cy = rng.uniform(0.15, 0.29), rng.uniform(0.17, 0.30); d.rectangle([u(cx - 0.0025), u(cy - 0.0035), u(cx + 0.0025), u(cy + 0.0035)], fill=(150, 150, 140))
    d.rounded_rectangle([u(0.41), u(0.33), u(0.49), u(0.41)], radius=u(0.006), fill=(150, 124, 70))                               # the temple
    d.rounded_rectangle([u(0.43), u(0.35), u(0.47), u(0.39)], radius=u(0.004), fill=(206, 170, 96))
    for cx, cy in ((0.60, 0.20), (0.36, 0.56), (0.58, 0.80)): d.ellipse([u(cx - 0.03), u(cy - 0.03), u(cx + 0.03), u(cy + 0.03)], fill=(58, 96, 52))
    return im


def radar_marks(rumo, dest, stars, t, police_r):
    """Route, destination, the police around him (two per star, red and blue, blinking) and the player's arrow."""
    s = R * SS; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = s / 2
    a = math.radians(rumo); ux, uy = math.sin(a), -math.cos(a); L = dest * SS
    for q in np.arange(15 * SS, max(15 * SS, L - 10 * SS), 9 * SS):
        d.ellipse([c + ux * q - 2.3 * SS, c + uy * q - 2.3 * SS, c + ux * q + 2.3 * SS, c + uy * q + 2.3 * SS], fill=GOLD + (255,), outline=(24, 18, 12, 255))
    if dest > 0:
        dx, dy = c + ux * L, c + uy * L
        d.ellipse([dx - 6 * SS, dy - 6 * SS, dx + 6 * SS, dy + 6 * SS], fill=GOLD + (255,), outline=(24, 18, 12, 255), width=SS)
    for i in range(2 * stars):                                                                                                      # the police
        ang = 2 * math.pi * i / max(1, 2 * stars) + 0.7 + 0.15 * math.sin(t * 0.8 + i); rr = police_r * SS * (0.75 + 0.25 * ((i * 37) % 7) / 7)
        px, py = c + math.cos(ang) * rr, c + math.sin(ang) * rr
        col = RED if (i + int(t * 6)) % 2 else BLUE
        d.ellipse([px - 6 * SS, py - 6 * SS, px + 6 * SS, py + 6 * SS], fill=col + (255,), outline=(14, 10, 8, 255), width=SS)
    pts = [(0, -17), (12, 14), (0, 7), (-12, 14)]
    rot = [(c + (x * math.cos(a) - y * math.sin(a)) * SS, c + (x * math.sin(a) + y * math.cos(a)) * SS) for x, y in pts]
    d.polygon(rot, fill=(255, 255, 255, 255)); d.line(rot + [rot[0]], fill=(24, 18, 12, 255), width=2 * SS)
    return im.resize((R, R), Image.LANCZOS)


def radar_frame(alarm):
    """The radar's border; at five stars it alternates red and blue."""
    s = (R + 16) * SS; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); o = 8 * SS
    d.rounded_rectangle([o - 5 * SS, o - 5 * SS, s - o + 5 * SS, s - o + 5 * SS], radius=13 * SS, outline=((alarm + (255,)) if alarm else (18, 14, 10, 255)), width=5 * SS)
    d.rounded_rectangle([o, o, s - o, s - o], radius=9 * SS, outline=(236, 220, 186, 150), width=1 * SS)
    return im.resize((R + 16, R + 16), Image.LANCZOS)


# ------------------------------------------------------------------------------------------------ the interface
def star(d, cx, cy, r, fill, outline, width):
    pts = [(cx + (r if i % 2 == 0 else r * 0.45) * math.sin(math.pi * i / 5), cy - (r if i % 2 == 0 else r * 0.45) * math.cos(math.pi * i / 5)) for i in range(10)]
    d.polygon(pts, fill=fill, outline=outline, width=width)


def stars_layer(n, pop, blink_on, t):
    """Five stars to the right of the radar, above the place plate: n filled; the newest pops (pop = 0..1 of its
    animation, None if none); at blink they alternate white and red."""
    s = 4; x0, y0, r, gap = (MX + R + 26) * s, (MY + 4) * s, 27 * s, 64 * s
    im = Image.new("RGBA", (420 * s, 110 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); ox, oy = x0 - 20 * s, y0 - 20 * s
    f = mono(21 * s); draw_text(d, (0, 0), "NÍVEL DE PROCURA", f, CREAM + (240,), 2 * s, 2 * s)
    for i in range(5):
        cx, cy = 20 * s + r + i * gap, 30 * s + 20 * s + r
        filled = i < n; rr = r
        if pop is not None and i == n - 1: rr = r * (1 + 0.6 * (1 - pop) ** 2)
        if filled:
            col = (WHITE if (blink_on and int(t * 4) % 2) else (RED if blink_on else GOLD))
            star(d, cx, cy, rr, col + (255,), (20, 14, 10, 255), 3 * s)
        else: star(d, cx, cy, rr, (14, 16, 14, 150), CREAM + (200,), 3 * s)
    im = im.resize((420, 110), Image.LANCZOS); out = layer(); out.alpha_composite(shadowed(im, 4, (0, 2), 0.8), (ox // s, oy // s))
    return out


def plate(lugar, parte):
    im = layer(); d = ImageDraw.Draw(im); x = MX + R + 26; y = MY + R - 104
    draw_text(d, (x, y + 18), lugar.upper(), grot(30, 700), CREAM + (255,), 1)
    draw_text(d, (x, y + 62), f"PROCURADO · PARTE {parte} DE 3", mono(21), GOLD + (255,), 1, 2)
    return shadowed(im, 5, (0, 2))


def choice(a, b, pressed):
    """Two keys: [Q] a and [E] b; once pressed, b lights up and a dims."""
    im = layer(); d = ImageDraw.Draw(im); f = grot(34, 600); fk = grot(32, 700); y = 1000
    items = [("Q", a.upper(), not pressed), ("E", b.upper(), True)]
    widths = [tw(t, f, 1.5) + 84 for _, t, _ in items]; total = sum(widths) + 50; x = 540 - total / 2
    d.rounded_rectangle([x - 18, y - 12, x + total + 18, y + 72], radius=12, fill=DARK + (170,))
    for (key, t, on), wd in zip(items, widths):
        lit = pressed and key == "E"; alpha = 255 if on else 110
        d.rounded_rectangle([x, y, x + 60, y + 60], radius=10, fill=((GOLD if lit else CREAM) + (alpha,)), outline=(24, 18, 12, 255), width=3)
        d.text((x + 30 - fk.getlength(key) / 2, y + 7), key, font=fk, fill=(24, 18, 12, 255))
        draw_text(d, (x + 76, y + 8), t, f, ((GOLD if lit else CREAM) + (alpha,)), 1.5)
        if not on: d.line([(x + 70, y + 32), (x + wd - 6, y + 32)], fill=RED + (230,), width=4)
        x += wd + 50
    return shadowed(im, 5, (0, 3), 0.6)


def title_card(p):
    im = layer(); d = ImageDraw.Draw(im); fh = grot(40, 700); f = grot(118, 700); y = 600
    for i, l in enumerate(p["gancho"]): draw_text(d, (540 - tw(l, fh, 2) / 2, 440 + i * 52), l, fh, GOLD + (255,), 2, 3)
    t = "PROCURADO"; draw_text(d, (540 - tw(t, f, 4) / 2, y), t, f, CREAM + (255,), 4, 4)
    for i in range(5): star(d, 540 - 2 * 62 + i * 62, y + 170, 24, (RED if i < 5 else CREAM) + (255,), (20, 14, 10, 255), 3)
    t = f"PARTE {p['parte']} DE 3"; fr = mono(30); draw_text(d, (540 - tw(t, fr, 3) / 2, y + 214), t, fr, GOLD + (255,), 3, 2)
    return shadowed(im, 9, (0, 4))


def big_card(text):
    im = layer(); d = ImageDraw.Draw(im); f = grot(84, 700)
    for i, l in enumerate(wrap_even(text, f, 900, 2)): draw_text(d, (540 - tw(l, f, 2) / 2, 640 + i * 96), l, f, CREAM + (255,), 2, 4)
    return shadowed(im, 9, (0, 4))


def end_card(p, n_stars):
    im = layer(); d = ImageDraw.Draw(im); y = 560
    for i in range(5): star(d, 540 - 2 * 74 + i * 74, y, 30, ((RED if i < n_stars else (14, 16, 14))) + (255,), CREAM + (230,), 3)
    f = grot(96, 700); t = "PROCURADO"; draw_text(d, (540 - tw(t, f, 4) / 2, y + 60), t, f, CREAM + (255,), 4, 4)
    f2 = grot(52, 700)
    for i, l in enumerate(p["fim"]): draw_text(d, (540 - tw(l, f2, 2) / 2, y + 200 + i * 62), l, f2, GOLD + (255,), 2, 3)
    f4 = mono(17, False)
    for i, l in enumerate(CREDITOS): draw_text(d, (540 - tw(l, f4) / 2, 1150 + i * 28), l, f4, CREAM + (225,), 0, 2)
    return shadowed(im, 8, (0, 4))


# ------------------------------------------------------------------------------------------------ sound
def ui_sounds(events, length_s):
    """Our own interface sounds: a thump at the start and on each mission, a tick for prompts and subtitles, a siren
    chirp (two alternating tones) for each star gained, a rewind sweep for "12 HORAS ANTES", a low chord at the end."""
    sr = 48000; x = np.zeros(int(length_s * sr) + sr, np.float32)

    def add(t, y):
        i = int(t * sr); y = y[:len(x) - i]; x[i:i + len(y)] += y.astype(np.float32)

    def tone(f, dur, amp, decay, attack=0.004):
        tt = np.arange(int(dur * sr)) / sr
        return amp * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt / decay) * np.clip(tt / attack, 0, 1)

    def thump(amp):
        tt = np.arange(int(0.5 * sr)) / sr; f = 46 + 44 * np.exp(-tt / 0.05)
        return amp * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.16)

    def chirp():
        tt = np.arange(int(0.52 * sr)) / sr; f = np.where((tt * 6).astype(int) % 2 == 0, 880.0, 1175.0)
        return 0.12 * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.clip(tt / 0.01, 0, 1) * np.clip((0.52 - tt) / 0.08, 0, 1)

    def sweep():
        tt = np.arange(int(0.6 * sr)) / sr; f = 2400 * np.exp(-tt / 0.18) + 120
        noise = np.random.default_rng(3).standard_normal(len(tt)) * 0.03
        return (0.10 * np.sin(2 * np.pi * np.cumsum(f) / sr) + noise) * np.clip((0.6 - tt) / 0.2, 0, 1)

    for kind, t in events:
        if kind == "thump": add(t, thump(0.5))
        elif kind == "mission": add(t + 0.02, thump(0.26))
        elif kind == "tick": add(t, tone(1480, 0.07, 0.10, 0.02))
        elif kind == "sub": add(t, tone(660.0, 0.09, 0.05, 0.03))
        elif kind == "star": add(t, chirp()); add(t, thump(0.3))
        elif kind == "rewind": add(t, sweep())
        elif kind == "end":
            add(t, thump(0.5))
            for i, f in enumerate((146.83, 220.0, 293.66, 349.23)): add(t + 0.06 * i, tone(f, 2.6, 0.12, 0.9, 0.05))     # D minor: it is not over
    return x[:int(length_s * sr)], sr


# ------------------------------------------------------------------------------------------------ one part
def build(pid, stills=None):
    refs = check(); p = PARTES[pid]; ms = p["missoes"]; n = len(ms)
    out_dir = ROOT / "renders/.hud"; out_dir.mkdir(parents=True, exist_ok=True)
    takes = [ROOT / "source/takes" / mi["take"] for mi in ms]; cuts = {}

    def cut_of(k):
        if isinstance(ms[k].get("corte"), (int, float)): return float(ms[k]["corte"])
        if k not in cuts: cuts[k] = cut_times(takes[k])
        assert cuts[k], f"{ms[k]['take']}: no hard cut found"
        return cuts[k][0]

    def pace(k):
        r = ms[k].get("ritmo") or p.get("ritmo", 1.0)
        if isinstance(r, (int, float)): return [(0.0, TAKE, float(r))]
        segs, s0 = [], 0.0
        for until, speed in r:
            s1 = TAKE if until is None else cut_of(k) if until == "corte" else float(until); segs.append((s0, s1, float(speed))); s0 = s1
        return segs

    SEG = [pace(k) for k in range(n)]
    NB = [int(round(sum((b - a) / v for a, b, v in sg) * FPS)) for sg in SEG]; BEAT = [x / FPS for x in NB]
    F0 = [sum(NB[:k]) for k in range(n)]; starts = [f / FPS for f in F0]
    nh = int(round(p.get("pausa", 0.0) * FPS)); total = sum(NB) + nh; fim = p.get("fim_s", 2.6)
    end_t = starts[-1] + BEAT[-1] + nh / FPS - fim                                   # the end card comes in

    def at(k, s): return sum((min(s, b) - a) / v for a, b, v in SEG[k] if s > a)
    CUT = [at(k, cut_of(k)) for k in range(n)]                                        # the cut of each take, in seconds of its mission

    def when(k, spec):
        """A moment of mission k (seconds of the mission): 'a' its start, 'b' its cut, or a second of the take."""
        return 0.0 if spec == "a" else CUT[k] if spec == "b" else at(k, float(spec))

    # the stars over the whole part: (global second, count), and the moments a star is gained
    st = []
    for k, mi in enumerate(ms):
        for spec, cnt in mi["estrelas"]: st.append((starts[k] + when(k, spec) + (0.15 if spec == "b" else 0.0), cnt))
    st.sort(); gains = [t for i, (t, c) in enumerate(st) if i and c > st[i - 1][1]]

    def stars_at(t):
        c = st[0][1]
        for tt, cc in st:
            if t >= tt: c = cc
        return c

    def blink_at(t):
        for k, mi in enumerate(ms):
            pk = mi.get("pisca", "")
            if not pk: continue
            a0 = starts[k] + (0 if "a" in pk else CUT[k]); a1 = starts[k] + (CUT[k] if "b" not in pk else BEAT[k] + (nh / FPS if k == n - 1 else 0))
            if a0 <= t < a1: return True
        return False

    # subtitles: shot a from 0.9 s (after the title card in the first mission) to just before the cut; shot b from just
    # after the cut to the mission's end (before the end card in the last one)
    SUBS = []
    for k, mi in enumerate(ms):
        for shot, osis, frag in mi["falas"]:
            if isinstance(shot, (int, float)):                                         # from a second of the take up to the cut
                a0, a1 = max(at(k, float(shot)), (TCARD + 0.1) if k == 0 else 0.0), CUT[k] - 0.08
            else:
                a0 = max(0.9, (TCARD + 0.1) if k == 0 else 0.9) if shot == "a" else CUT[k] + 0.12
                a1 = CUT[k] - 0.08 if shot == "a" else ((end_t - starts[k] - 0.2) if k == n - 1 else BEAT[k] - 0.3)
            assert a1 - a0 >= 1.6, f"{pid} mission {k + 1} shot {shot}: the subtitle stays only {a1 - a0:.2f} s"
            SUBS.append((starts[k] + a0, starts[k] + a1, cropped(subtitle({"texto": frag, "ref": refs[(osis, frag)]}))))
            print(f"mission {k + 1} shot {shot}: “{frag[:40]}…” {starts[k] + a0:.2f}–{starts[k] + a1:.2f} s")
    print(pid, f"{total} frames, {total / FPS:.2f} s; cuts at", [f"{starts[k] + CUT[k]:.2f}" for k in range(n)], "; stars", st)

    SCRIM, HEAD, CITYIMG = scrims(), hud.header(), city()
    mask = Image.new("L", (R * SS, R * SS), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, R * SS - 1, R * SS - 1], radius=9 * SS, fill=255)
    mask = mask.resize((R, R), Image.LANCZOS)
    OBJ = [(objective(k + 1, n, mi["objetivo"]), objective(k + 1, n, mi["objetivo"], True)) for k, mi in enumerate(ms)]
    PLATES = {}; START = cropped(title_card(p)); ENDC = cropped(end_card(p, st[-1][1]))
    CARD = {k: cropped(big_card(mi["cartao"])) for k, mi in enumerate(ms) if mi.get("cartao")}
    PROMPT = {k: cropped(prompt(mi["acao"])) for k, mi in enumerate(ms) if mi.get("acao")}
    CHOICE = {k: (cropped(choice(*mi["escolha"], False)), cropped(choice(*mi["escolha"], True))) for k, mi in enumerate(ms) if mi.get("escolha")}
    FR = {None: radar_frame(None), "r": radar_frame(RED), "b": radar_frame(BLUE)}

    def frame(k, j, src):
        t = j / FPS; g = starts[k] + t; mi = ms[k]; shot = "b" if t >= CUT[k] else "a"
        im = src.convert("RGBA"); im.alpha_composite(SCRIM); im.alpha_composite(HEAD)
        od = mi.get("objetivo_de"); show_obj = not (od == "corte" and shot == "a")
        done = g >= (end_t if k == n - 1 else starts[k] + BEAT[k] - 0.8)
        if show_obj: im.alpha_composite(OBJ[k][1 if done else 0])
        lug = mi["lugar"].get(shot, mi["lugar"]["a"])
        if lug not in PLATES: PLATES[lug] = plate(lug, p["parte"])
        im.alpha_composite(PLATES[lug])
        # radar: this shot's place on the city map, moving along its heading
        x, y, rumo, vel = mi["radar"].get(shot, mi["radar"]["a"]); t0 = 0.0 if shot == "a" else CUT[k]
        cx = x * CITY * SS + math.sin(math.radians(rumo)) * 10 * SS * vel * (t - t0); cy = y * CITY * SS - math.cos(math.radians(rumo)) * 10 * SS * vel * (t - t0)
        bx, by = int(round(cx - R * SS / 2)), int(round(cy - R * SS / 2))
        crop = CITYIMG.crop((bx, by, bx + R * SS, by + R * SS)).resize((R, R), Image.LANCZOS).convert("RGBA")
        n_st = stars_at(g); blink = blink_at(g)
        pol_r = 120 - (60 * min(1.0, max(0.0, (g - starts[-1]) / BEAT[-1])) if pid == "procurado-3" and k == n - 1 else 0)
        crop.alpha_composite(radar_marks(rumo, 0 if vel == 0 else 60, n_st, g, pol_r))
        im.paste(crop, (MX, MY), mask)
        im.alpha_composite(FR[("r" if int(g * 4) % 2 else "b") if (n_st >= 5 or blink) else None], (MX - 8, MY - 8))
        im.alpha_composite(progress(n, k + (1 if done else 0), 0.0 if done else min(1.0, t / max(0.1, BEAT[k] - 0.8))), (MX, MY + R + 14))
        pop = None
        for tg in gains:
            if 0 <= g - tg < 0.35: pop = (g - tg) / 0.35
        im.alpha_composite(stars_layer(n_st, pop, blink, g))
        for a0, a1, (img, xy) in SUBS:
            o = ramp(g, a0, a1)
            if o > 0: im.alpha_composite(faded(img, o), xy)
        if k in PROMPT:
            o = ramp(t, 0.25 if k else TCARD + 0.1, (1.25 if k else TCARD + 1.1))
            if o > 0: im.alpha_composite(faded(PROMPT[k][0], o), PROMPT[k][1])
        if k in CHOICE:
            pressed = t >= 1.3; o = ramp(t, 0.2, CUT[k] - 0.1)
            if o > 0: c = CHOICE[k][1 if pressed else 0]; im.alpha_composite(faded(c[0], o), c[1])
        if k in CARD:
            if abs(t - CUT[k]) < 0.25: im = Image.blend(im, Image.new("RGBA", (W, H), (255, 255, 255, 255)), 0.85 * (1 - abs(t - CUT[k]) / 0.25))
            o = ramp(t, CUT[k], CUT[k] + 1.5, 0.15)
            if o > 0: im.alpha_composite(faded(CARD[k][0], o), CARD[k][1])
        if k == 0:
            o = 1.0 if t < TCARD - 0.25 else ramp(t, -1, TCARD, 0.25)
            if o > 0: im.alpha_composite(faded(START[0], o), START[1])
        if g >= end_t:
            o = min(1.0, (g - end_t) / 0.3)
            im = Image.blend(im, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.55 * o); im.alpha_composite(faded(ENDC[0], o), ENDC[1])
        return im.convert("RGB")

    def retime(k):
        sg = SEG[k]
        if len(sg) == 1: return f"setpts=PTS/{sg[0][2]}"
        expr, c = "", 0.0
        for i, (a, b, v) in enumerate(sg):
            piece = f"{c:.6f}+(T-{a:.6f})/{v}"; expr += f"if(lt(T,{b:.6f}),{piece}," if i < len(sg) - 1 else piece; c += (b - a) / v
        return f"setpts='({expr}{')' * (len(sg) - 1)})/TB'"

    want = None if stills is None else {int(round(t * FPS)): t for t in stills}
    enc = None; vid = out_dir / f"{pid}-video.mp4"
    if want is None:
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "9500k", "-bufsize", "19000k", "-pix_fmt", "yuv420p",
                                "-movflags", "+faststart", str(vid)], stdin=subprocess.PIPE)
    for k, mi in enumerate(ms):
        nb = NB[k]; hold = nh if k == n - 1 else 0
        if want is not None and not any(F0[k] <= g < F0[k] + nb + hold for g in want): continue
        dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(takes[k]), "-vf", f"{retime(k)},fps={FPS},scale={W}:{H}:flags=lanczos,unsharp=5:5:0.4",
                                "-frames:v", str(nb), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
        held = None
        for j in range(nb + hold):
            g = F0[k] + j
            if j < nb:
                raw = dec.stdout.read(W * H * 3); assert len(raw) == W * H * 3, f"{mi['take']}: only {j} frames"
                pic = Image.frombuffer("RGB", (W, H), raw)
                if j == nb - 1: held = pic.copy()
            else:
                z = 1 + 0.03 * (j - nb + 1) / hold; cw, ch = W / z, H / z
                pic = held.resize((W, H), Image.BICUBIC, box=((W - cw) / 2, (H - ch) / 2, (W + cw) / 2, (H + ch) / 2))
            if want is not None and g not in want: continue
            im = frame(k, j, pic)
            if want is not None:
                f = out_dir / f"{pid}-{want[g]:05.2f}.jpg"; im.save(f, quality=90); print(f)
            else: enc.stdin.write(im.tobytes())
        dec.stdout.close(); dec.wait()
    if enc is None: return
    enc.stdin.close(); assert enc.wait() == 0
    # sound: each take's ambience at its pace, the held frames carry the last take's ambience backwards, plus ours; -14 LUFS
    import soundfile as sf
    ev = [("thump", 0.04)] + [("mission", starts[k]) for k in range(1, n)] + [("star", t) for t in gains] + [("sub", a0) for a0, _, _ in SUBS]
    ev += [("tick", starts[k] + (0.25 if k else TCARD + 0.1)) for k in PROMPT] + [("tick", starts[k] + 1.3) for k in CHOICE]
    ev += [("rewind", starts[k] + CUT[k]) for k in CARD] + [("end", end_t)]
    ui, sr = ui_sounds(ev, total / FPS); uiw = out_dir / f"{pid}-ui.wav"; sf.write(uiw, ui, sr)
    ins = sum((["-i", str(t)] for t in takes), []); fc = ""; ph = nh / FPS
    for i in range(n):
        sg = SEG[i]; beat = BEAT[i]
        if len(sg) == 1: head = f"[{i}:a]atrim=0:{TAKE},asetpts=PTS-STARTPTS,atempo={sg[0][2]}"
        else:
            head = f"[{i}:a]asplit={len(sg)}" + "".join(f"[s{i}_{q}]" for q in range(len(sg))) + ";"
            for q, (a, b, v) in enumerate(sg):
                head += f"[s{i}_{q}]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,atempo={v},afade=t=in:d=0.008,afade=t=out:st={(b - a) / v - 0.008:.4f}:d=0.008[p{i}_{q}];"
            head += "".join(f"[p{i}_{q}]" for q in range(len(sg))) + f"concat=n={len(sg)}:v=0:a=1"
        head += f",atrim=0:{beat:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.04"
        if i == n - 1 and nh:
            fc += (f"{head},asplit[m{i}][x{i}];[x{i}]atrim=start={beat - ph:.4f}:end={beat:.4f},asetpts=PTS-STARTPTS,areverse,"
                   f"afade=t=out:st=0.15:d={ph - 0.15:.4f}[r{i}];[m{i}][r{i}]concat=n=2:v=0:a=1[a{i}];")
        else: fc += f"{head},afade=t=out:st={beat - 0.06:.4f}:d=0.06[a{i}];"
    fc += "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,aresample=48000,loudnorm=I=-20:TP=-3:LRA=11,aresample=48000[amb];"
    fc += f"[{n}:a]aresample=48000[ui];[amb][ui]amix=inputs=2:normalize=0:duration=longest,afade=t=out:st={total / FPS - 0.1:.4f}:d=0.1[a]"
    mixw = out_dir / f"{pid}-mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-i", str(uiw), "-filter_complex", fc, "-map", "[a]", "-t", f"{total / FPS:.3f}", "-ar", "48000", str(mixw)], check=True)
    # the limiter runs at 4x the sample rate, so it also holds the peaks between samples (the true peak); a pass fixes one
    # thing at a time: a true peak over -1 dBTP lowers the ceiling, otherwise the gain moves toward -14 LUFS
    final = ROOT / f"renders/{pid}.mp4"; gain = -14.0 - loudness(mixw)[0]; lim = 0.78           # ceiling, -2.2 dBFS to start
    for _ in range(8):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-i", str(mixw), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-af", f"volume={gain:.2f}dB,aresample=192000,alimiter=limit={lim:.3f}:attack=1:release=60:level=disabled,aresample=48000",
                        "-c:a", "aac", "-b:a", "192k", "-t", f"{total / FPS:.3f}", "-movflags", "+faststart", str(final)], check=True)
        lufs, tp = loudness(final)
        if abs(lufs + 14.0) <= 0.3 and tp <= -1.0: break
        if tp > -1.0: lim *= 10 ** ((-1.25 - tp) / 20)
        else: gain += -14.0 - lufs
    assert abs(lufs + 14.0) <= 0.3 and tp <= -1.0, f"{pid}: loudness {lufs:.1f} LUFS, true peak {tp:.1f} dBTP after 8 passes"
    seams = [starts[k] for k in range(1, n)] + [starts[k] + at(k, b) for k in range(n) for a, b, v in SEG[k][:-1]] + ([starts[-1] + BEAT[-1]] if nh else [])
    json.dump({"quadros": total, "duracao_s": total / FPS, "missoes_s": starts, "cortes_s": [starts[k] + CUT[k] for k in range(n)], "estrelas": st,
               "emendas_som_s": sorted(seams),
               "legendas_s": [[a0, a1] for a0, a1, _ in SUBS], "cartao_final_s": end_t}, open(out_dir / f"{pid}-tempos.json", "w", encoding="utf-8"), indent=1)
    print(final, f"{total} frames, {total / FPS:.2f} s, {final.stat().st_size / 1e6:.2f} MB, {lufs:.1f} LUFS, true peak {tp:.1f} dBTP")


def frase(t):
    """Sentence case for a hook written in capitals: every sentence opens with a capital letter, the rest goes lower case."""
    return re.sub(r"(^|[.!?]\s+)(\w)", lambda m: m.group(1) + m.group(2).upper(), t.lower())


def legenda(pid):
    """The post's caption, from the data: the hook, the part, each star with what it was for and its literal lines."""
    refs = check(); p = PARTES[pid]; ms = p["missoes"]; out = [frase(" ".join(p["gancho"])) + " 🚨", "",
                                                              f"PROCURADO · Parte {p['parte']} de 3", "",
                                                              "E se Jesus vivesse hoje num mundo aberto? Cada sinal que ele faz sobe o nível de procura, do jeito que os evangelhos contam:", ""]
    prev = None
    for k, mi in enumerate(ms):
        top = max(c for _, c in mi["estrelas"])
        if mi.get("motivo"):
            linhas = " ".join(f"“{frag}” ({refs[(osis, frag)]})" for _, osis, frag in mi["falas"])
            out.append(f"{'⭐' * top} {mi['motivo']}: {linhas}")
        prev = top
    nxt = {1: "Continua na Parte 2 👀", 2: "Continua na Parte 3 👀", 3: "Continua na Páscoa."}[p["parte"]]
    out += ["", nxt, "", "👇 E você, fugiria ou iria ao encontro? Comenta aí.", "🔁 Manda pra quem tá contando os dias pro dia 19", "",
            "Recriação feita com IA: é um \"e se\", não um jogo que existe · Cidade e mapa fictícios · Texto: Bíblia Livre (CC BY 4.0 BR)", "",
            "#jesus #biblia #gameplay #mundoaberto #procurado #games #cristao #fe #esefosseumjogo"]
    return "\n".join(out)


TCARD = 2.2                                                       # the opening card of parts 2 and 3 (part 1 keeps it up to the cut)

if __name__ == "__main__":
    a = sys.argv[1:]
    if "--check" in a: r = check(); print(f"{len(r)} legendas literais da BLIVRE: ok")
    elif "--legenda" in a:
        txt = "# Legendas do especial Procurado (geradas por procurado.py --legenda)\n\n" + "\n\n".join(f"## {pid}\n\n```\n{legenda(pid)}\n```" for pid in PARTES)
        (ROOT / "LEGENDAS-PROCURADO.md").write_text(txt + "\n", encoding="utf-8"); print(legenda(a[0]) if a[0] in PARTES else txt)
    elif "--map" in a: city().resize((CITY // 2, CITY // 2)).save(ROOT / "renders/.hud/procurado-mapa.png"); print(ROOT / "renders/.hud/procurado-mapa.png")
    elif "--still" in a: build(a[0], stills=[float(x) for x in a[a.index("--still") + 1].split(",")])
    else: build(a[0])
