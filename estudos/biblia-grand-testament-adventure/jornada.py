#!/usr/bin/env python3
"""A JORNADA (13/11, Alex: "Quero algo novo! De alto nível de jogabilidade! Esse mostrando cenas como se fossem jogadas
mesmo! 50s total, mostrando toda Galiléia e vida de Jesus em missões e mundo aberto também ... Até a fase final, redenção
e crucificação e ressurreição").

Seven takes of cenas.py "jornada", 8 s each, two shots each: Galilee as an open world (the region reveal, the two
fishermen), the first signs (Cana, the man on the mat), the sea (the storm, the walk on the water), the bread and the fast
travel to Jerusalem, the supper and the garden, the final phase (the cross carried, then three crosses far away in
silhouette) and the third day (the empty tomb, then the hill in Galilee).

The HUD is the series' own (hud.py: objective, counter, radar on real relief and real places, progress bar, subtitles of
literal BLIVRE, key prompts), plus what an open world shows: region banners, a counter of signs, a fast-travel map with the
distance measured from the coordinates. In the final phase the HUD steps back the way a game hands over to a cutscene:
letterbox, no radar, no objective, only the words; it comes back on the third day.

  python3 -I jornada.py                 -> renders/jornada.mp4
  python3 -I jornada.py --still 1,5,30  -> renders/.hud/jornada-<t>.jpg
  python3 -I jornada.py --check         -> every line is literal BLIVRE
  python3 -I jornada.py --legenda       -> the post's caption (LEGENDAS-JORNADA.md)
  add --rascunho to use a stand-in picture for takes not generated yet (stills only)
"""
import json, math, re, subprocess, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))                         # -I leaves the script's folder out of the path
import hud  # noqa: E402
from hud import (W, H, FPS, TAKE, SAFE, CREAM, GOLD, DARK, SKY, R, SS, MX, MY, grot, mono, tw, draw_text, wrap_even, shadowed, layer,  # noqa: E402
                 cropped, faded, ramp, scrims, objective, subtitle, prompt, progress, cut_times, loudness, world, radar_frame,
                 radar_marks, PASS)

ROOT = hud.ROOT
REPO = ROOT.parent.parent
LIVROS = {"Matt": ("MAT", "Mateus"), "Mark": ("MAR", "Marcos"), "Luke": ("LUK", "Lucas"), "John": ("JOH", "João")}
TCARD = 2.2                                                       # the opening card stays this long

# Per mission: take; objetivo (a text, or {"a": .., "b": ..} when the shot b is a new step); acoes [(text, shot)] the key
# prompts; lugar {"shot": passage id} for the place plate and the radar (data/passagens.json: BLIVRE names, OpenBible
# coordinates), or a (name, passage for the coordinates, reference) triple; raio the radar's radius in km; falas
# [(shot, OSIS, literal BLIVRE fragment)] with atraso {"shot": seconds after the shot starts}; contador (label, total,
# {shot: count}); sinais [(shot, fraction of the shot)] each a sign done; banner (shot, title, quote OSIS, quote fragment)
# or (shot, title, text); viagem: the fast-travel map at the cut; cena: the shots shown as a cutscene (letterbox, no HUD).
J = dict(gancho=["A MAIOR MISSÃO DA HISTÓRIA", "EM {s} SEGUNDOS DE GAMEPLAY"],                  # {s}: the reel's length, measured
         titulo="A jornada", ref="Os quatro evangelhos",
         ritmo=1.15, pausa=2.0, fim_s=2.6, missoes=[
    dict(take="jornada-1.mp4", objetivo="Chame os pescadores", objetivo_de="corte", acoes=[("Chamar", "b")], ritmo=[("corte", 1.3), (None, 0.8)],
         lugar={"a": "mc-pescadores"}, raio=12, contador=("Discípulos", 12, {"b": 2}),
         banner=("a", "Galileia", "Matt.4.23", "Jesus rodeava toda a Galileia"),
         falas=[("b", "Matt.4.19", "Vinde após mim, e eu vos farei pescadores de gente.")]),
    dict(take="jornada-2-montado.mp4", objetivo="Faça os primeiros sinais", acoes=[("Encher os vasos", "a"), ("Curar", "b")],
         montagem=[("source/descartados/jornada-2-sosias.mp4", 0, 79), ("source/takes/jornada-2.mp4", 88, 193)], corte=79 / FPS,
         # Caná from the first generation (few jars, nobody in red; it ends before the jar's outside turns red and the camera
         # swings to his face), the house from the second (the healed man is an older bald man, nobody else looks like him)
         lugar={"a": "jo-cana", "b": "mc-paralitico"}, raio=14, sinais=[("a", 0.73), ("b", 0.5)],     # the wine; he stands up
         falas=[("a", "John.2.7", "Enchei estes vasos com água."), ("b", "Mark.2.11", "levanta-te, toma o teu leito")]),
    dict(take="jornada-3.mp4", objetivo="Atravesse o mar", acoes=[("Acalmar", "a"), ("Andar sobre o mar", "b")],
         lugar={"a": ("mar da Galileia", "mc-tempestade", "Marcos 4:35–41"), "b": "mt-aguas"}, raio=8,   # Mc 4 says only "mar"; Mc 1:16 names it
         sinais=[("a", 0.68), ("b", 0.2)],                                                # the sea goes calm; the first step on it
         falas=[("a", "Mark.4.39", "Cala-te, aquieta-te!"), ("b", "Matt.14.27", "Tende coragem! Sou eu, não tenhais medo.")]),
    dict(take="jornada-4-montado.mp4", objetivo={"a": "Alimente a multidão", "b": "Entre em Jerusalém"}, acoes=[("Repartir", "a")],
         montagem=[("source/takes/jornada-4.mp4", 0, 104), ("source/descartados/jornada-4-tres-iguais.mp4", 75, 193)], corte=104 / FPS,
         # the bread from the second generation (camera behind him; it ends where its dissolve to the road starts, 4.33 s), the
         # entry from the first (from its cut at 3.125 s: the longer ride, cloaks spread on the road)
         lugar={"a": "mc-paes", "b": "mt-entrada"}, raio={"a": 8, "b": 2}, sinais=[("a", 0.6)], viagem=True,
         falas=[("a", "Mark.6.42", "Todos comeram e se saciaram."), ("b", "Matt.21.9", "Hosana ao Filho de Davi!")]),
    dict(take="jornada-5-montado.mp4", objetivo={"a": "Celebre a ceia", "b": "Ore no jardim"}, acoes=[("Partir o pão", "a"), ("Orar", "b")],
         montagem=[("source/takes/jornada-5.mp4", 0, 50, 1.6), ("source/descartados/jornada-5-dois-na-ceia.mp4", 78, 193)], corte=50 / FPS,
         # the supper from the second generation, pushed in 1.6x so the far end of the table, where a man dressed like him
         # sits again, stays out; the garden from the first (three asleep under the tree, the torches along the wall)
         ritmo=[("corte", 0.85), (None, 1.15)], tecla={"a": 0.05}, contador_s=1.3,          # the key comes with the bread breaking
         lugar={"a": ("Jerusalém", "lc-ceia", "Lucas 22:14–20"), "b": "mt-getsemani"}, raio=1.5, contador=("Discípulos", 12, {"a": 12}),
         falas=[("a", "Luke.22.19", "Isto é o meu corpo"), ("b", "Luke.22.42", "não se faça minha vontade, mas a tua.")]),
    dict(take="jornada-6.mp4", cena="ab", banner=("a", "Fase final", "Redenção"), atraso={"a": 1.55},
         falas=[("a", "John.19.17", "E levando ele sua cruz"), ("b", "John.19.30", "Está consumado")]),
    dict(take="jornada-7.mp4", cena="a", objetivo="Vá à Galileia", objetivo_de="corte", seguidores=11,   # Mt 28:16: os onze
         lugar={"b": ("Galileia", "mt-sermao", "Mateus 28:16")}, raio=12, atraso={"a": 1.4},
         banner=("a", "Terceiro dia", "Ressurreição"),                                   # Alex: "redenção e crucificação e ressurreição"
         falas=[("a", "Matt.28.6", "Ele não está aqui, pois já ressuscitou"), ("b", "Matt.28.20", "eu estou convosco todos os dias, até o fim dos tempos.")]),
])
FIM_QUOTE = ("Luke.24.23", "ele vive")
POST_QUOTE = ("Luke.24.23", "que disseram que ele vive.")                         # the same, longer, for the post's caption
CREDITOS = ["TEXTO: BÍBLIA LIVRE (CC BY 4.0 BR) · LUGARES: OPENBIBLE.INFO (CC BY 4.0)",
            "RELEVO: SRTM/GMTED2010 (USGS), ETOPO1 (NOAA), MAPZEN · IMAGENS GERADAS POR IA"]

# ------------------------------------------------------------------------------------------------ the BLIVRE
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",").replace(" .", ".").strip()


def blivre():
    t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8"); raw = {}
    for line in t.splitlines():
        m = re.match(r"^(\w+) (\d+):(\d+) (.*)$", line)
        if m: raw[(m[1], int(m[2]), int(m[3]))] = m[4]
    assert len(raw) == 31102, len(raw)
    return raw


def quotes():
    """Every quoted line: the subtitles, the banners' quotes and the end card's."""
    for k, mi in enumerate(J["missoes"]):
        for shot, osis, frag in mi.get("falas", []): yield f"missão {k + 1} plano {shot}", osis, frag
        b = mi.get("banner")
        if b and len(b) == 4: yield f"missão {k + 1} faixa", b[2], b[3]
    yield "cartão final", *FIM_QUOTE
    yield "legenda do post", *POST_QUOTE


def check():
    """Every quoted line is a literal fragment of the BLIVRE verse it cites. Returns {(osis, frag): 'Livro c:v'}."""
    raw = blivre(); refs = {}; bad = []
    for where, osis, frag in quotes():
        bk, c, v = osis.split("."); verse = plain(raw[(LIVROS[bk][0], int(c), int(v))])
        if frag not in verse: bad.append(f"{where}: “{frag}” não é literal de {osis}: {verse}")
        refs[(osis, frag)] = f"{LIVROS[bk][1]} {c}:{v}"
    for b in bad: print("FAIL", b)
    assert not bad, "lines that are not literal BLIVRE"
    return refs


# ------------------------------------------------------------------------------------------------ places
def geo_of(spec):
    """(name, geo, reference) of a place: a passage id, or a (name, passage for the coordinates, reference) triple."""
    if isinstance(spec, tuple):
        name, pid, ref = spec; return name, PASS[pid]["geo"], ref
    p = PASS[spec]; return p["lugar"], p["geo"], p["ref_pt"]


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lon"], b["lat"], b["lon"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(h))


def bearing(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lon"], b["lat"], b["lon"]))
    y = math.sin(lo2 - lo1) * math.cos(la2); x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def plate(name, geo, ref):
    """hud.place_plate with the reference given: the place as the BLIVRE writes it, its coordinates ("≈" when the
    point is the region's, not the spot's), the passage."""
    im = layer(); d = ImageDraw.Draw(im); x = MX + R + 26; y = MY + R - 104
    draw_text(d, (x, y), name.upper(), grot(30, 700), CREAM + (255,), 1)
    lat = f"{abs(geo['lat']):.2f}".replace(".", ","); lon = f"{abs(geo['lon']):.2f}".replace(".", ",")
    draw_text(d, (x, y + 44), ("≈ " if geo.get("nota") else "") + f"{lat}° N · {lon}° L", mono(21), GOLD + (255,), 0, 2)
    draw_text(d, (x, y + 76), ref.upper(), mono(21), CREAM + (235,), 1, 2)
    return shadowed(im, 5, (0, 2))


# ------------------------------------------------------------------------------------------------ interface pieces
def start_card(secs):
    im = layer(); d = ImageDraw.Draw(im); fh = grot(40, 700); f = grot(118, 700); y = 600
    for i, l in enumerate(g.format(s=secs) for g in J["gancho"]): draw_text(d, (540 - tw(l, fh, 2) / 2, 440 + i * 52), l, fh, GOLD + (255,), 2, 3)
    t = J["titulo"].upper(); draw_text(d, (540 - tw(t, f, 4) / 2, y), t, f, CREAM + (255,), 4, 4)
    d.rectangle([540 - 60, y + 150, 540 + 60, y + 156], fill=GOLD + (255,))
    t = J["ref"].upper(); fr = mono(30); draw_text(d, (540 - tw(t, fr, 3) / 2, y + 176), t, fr, GOLD + (255,), 3, 2)
    return shadowed(im, 9, (0, 4))


def banner(title, line, ref=None):
    """A region or chapter banner, the way an open world announces a place: the name large, a gold rule, one line."""
    im = layer(); d = ImageDraw.Draw(im); f = grot(104, 700); fl = grot(36, 500); fr = mono(22); y = 560
    t = title.upper(); draw_text(d, (540 - tw(t, f, 6) / 2, y), t, f, CREAM + (255,), 6, 4)
    d.rectangle([540 - 210, y + 132, 540 - 40, y + 135], fill=GOLD + (255,)); d.rectangle([540 + 40, y + 132, 540 + 210, y + 135], fill=GOLD + (255,))
    d.polygon([(540, y + 122), (552, y + 134), (540, y + 146), (528, y + 134)], fill=GOLD + (255,))
    l = f"“{line}”" if ref else line.upper(); ff = fl if ref else mono(30)
    draw_text(d, (540 - tw(l, ff, 0 if ref else 4) / 2, y + 168), l, ff, CREAM + (250,), 0 if ref else 4, 3)
    if ref: t = ref.upper(); draw_text(d, (540 - tw(t, fr, 2) / 2, y + 222), t, fr, GOLD + (255,), 2, 2)
    return shadowed(im, 9, (0, 4))


def signs(n, pop):
    """The counter of signs: a gold seal with the number, popping when it grows."""
    s = 4; im = Image.new("RGBA", (360 * s, 60 * s), (0, 0, 0, 0)); d = ImageDraw.Draw(im); f = mono(21 * s)
    draw_text(d, (0, 14 * s), "SINAIS", f, CREAM + (240,), 2 * s, 2 * s); cx = tw("SINAIS", f, 2 * s) + 44 * s; cy = 30 * s
    r = 24 * s * (1 + (0.45 * (1 - pop) ** 2 if pop is not None else 0))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD + (255,), outline=(24, 18, 12, 255), width=3 * s)
    fn = grot(32 * s, 700); t = str(n); d.text((cx - fn.getlength(t) / 2, cy - 22 * s), t, font=fn, fill=(24, 18, 12, 255))
    im = im.resize((360, 60), Image.LANCZOS); out = layer(); out.alpha_composite(shadowed(im, 4, (0, 2), 0.7), (SAFE[0] + 2, SAFE[1] + 12 + 40 + 70 + 8))
    return out


def dots(label, total, filled, pop):
    """hud.counter with the last filled dot popping when it is new."""
    if pop is None: return hud.counter(label, total, filled)
    im = hud.counter(label, total, filled - 1); d = ImageDraw.Draw(im); f = mono(21); x, y = SAFE[0] + 2, SAFE[1] + 12 + 40 + 70 + 16
    px = x + tw(label.upper(), f, 2) + 18; i = filled - 1; r = 10 * (1 + 0.6 * (1 - pop) ** 2); cx, cy = px + i * 30 + 10, y + 15
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD + (255,), outline=(24, 18, 12, 255), width=2)
    return im


def with_sea(img, ppk, lake, geo, radius_km):
    """hud.world reads the sea only where the elevation is exactly level, which the wide grid's bathymetry is not; a map
    that reaches the coast also needs the Mediterranean: ground under 1 m joined to the map's western edge (the Jordan rift,
    also below sea level, is closed off from it by higher ground)."""
    cx, cy = hud.merc(geo["lon"], geo["lat"]); mpp = 40075016.686 * math.cos(math.radians(geo["lat"])) / (256 * 2 ** 11)
    half = (R / 2 + hud.PAD) / (R / 2) * radius_km * 1000 / mpp; side = img.size[0]
    x0, y0 = int(round(cx - half)), int(round(cy - half)); n = int(round(2 * half))
    h, _, _ = hud.terrain(x0, y0, n)
    from scipy import ndimage
    lab, _ = ndimage.label(h < 1.0); west = np.unique(lab[:, 0]); west = west[west > 0]
    sea = np.asarray(Image.fromarray((np.isin(lab, west) * 255).astype(np.uint8)).resize((side, side), Image.BILINEAR)) > 127
    a = np.asarray(img, np.float32).copy(); rng = np.random.default_rng(9)                 # hud.world's water, painted afresh: the
    a[sea] = np.array([226, 205, 164], np.float32) * 0.12 + np.array([112, 140, 146], np.float32) * 0.88   # level patch it had found
    a[sea] += rng.normal(0, 3.2, (int(sea.sum()), 1))                                                    # inside the sea leaves no seam
    dist = ndimage.distance_transform_edt(sea)
    ripple = sea & (dist > 3 * SS) & (dist < 34 * SS) & ((dist / SS) % 9 < 1.3)
    a[ripple] = a[ripple] * 0.72 + np.array([70, 96, 104], np.float32) * 0.28
    shore = ndimage.binary_dilation(sea, iterations=SS) & ~sea; a[shore] = np.array(hud.INK, np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB"), ppk, lake | sea


def travel_card(a, b, k_frac):
    """The fast-travel map: the relief between two places, the route between them drawn as far as k_frac, the distance
    measured from their coordinates."""
    ga, gb = PASS[a]["geo"], PASS[b]["geo"]; mid = {"lat": (ga["lat"] + gb["lat"]) / 2, "lon": (ga["lon"] + gb["lon"]) / 2, "id": ""}
    key = "_viagem"; PASS[key] = {"geo": mid}
    if key not in WORLDS: WORLDS[key] = with_sea(*world(key, 0.62 * km(ga, gb)), mid, 0.62 * km(ga, gb))
    img, ppk, _ = WORLDS[key]; side = img.size[0]; c = side / 2
    x0, y0 = hud.merc(mid["lon"], mid["lat"]); kmpp = 40075.016686 * math.cos(math.radians(mid["lat"])) / (256 * 2 ** 11)

    def px(g):                                                                    # canvas px per DEM px = canvas px per km x km per DEM px
        x, y = hud.merc(g["lon"], g["lat"]); s = ppk * SS * kmpp
        return c + (x - x0) * s, c + (y - y0) * s

    m = img.convert("RGBA"); d = ImageDraw.Draw(m); (ax, ay), (bx, by) = px(ga), px(gb)
    ex, ey = ax + (bx - ax) * k_frac, ay + (by - ay) * k_frac
    for t in np.arange(0, 1.0001, 0.02):
        if t > k_frac: break
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t; d.ellipse([x - 4 * SS, y - 4 * SS, x + 4 * SS, y + 4 * SS], fill=GOLD + (255,), outline=(24, 18, 12, 255))
    for (x, y) in ((ax, ay), (bx, by)): d.ellipse([x - 9 * SS, y - 9 * SS, x + 9 * SS, y + 9 * SS], fill=(24, 18, 12, 255), outline=GOLD + (255,), width=3 * SS)
    pts = [(0, -17), (12, 14), (0, 7), (-12, 14)]; a_ = math.atan2(bx - ax, -(by - ay))
    d.polygon([(ex + (u * math.cos(a_) - v * math.sin(a_)) * SS * 1.3, ey + (u * math.sin(a_) + v * math.cos(a_)) * SS * 1.3) for u, v in pts],
              fill=(255, 255, 255, 255), outline=(24, 18, 12, 255))
    S = 640; crop = m.resize((S, S), Image.LANCZOS)
    mk = Image.new("L", (S, S), 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, S - 1, S - 1], radius=18, fill=255)
    out = layer(); dd = ImageDraw.Draw(out); x, y = (W - S) // 2, 520
    dd.rounded_rectangle([x - 10, y - 96, x + S + 10, y + S + 120], radius=24, fill=DARK + (215,))
    t = "VIAGEM RÁPIDA"; f = mono(26); draw_text(dd, (540 - tw(t, f, 4) / 2, y - 70), t, f, GOLD + (255,), 4, 2)
    out.paste(crop, (x, y), mk)
    dd.rounded_rectangle([x, y, x + S, y + S], radius=18, outline=(236, 220, 186, 160), width=2)
    na, nb = PASS[a]["geo"].get("id"), PASS[b]["geo"].get("id")
    names = {g["id"]: g["nome"] for g in hud.DATA["lugares"]}
    t = f"{names.get(na, na).upper()}  →  {names.get(nb, nb).upper()}"; f2 = grot(34, 700)
    draw_text(dd, (540 - tw(t, f2, 1) / 2, y + S + 20), t, f2, CREAM + (255,), 1, 3)
    t = f"{round(km(ga, gb))} KM EM LINHA RETA"; f3 = mono(22); draw_text(dd, (540 - tw(t, f3, 2) / 2, y + S + 70), t, f3, GOLD + (255,), 2, 2)
    return shadowed(out, 8, (0, 4), 0.7)


def end_card(refs):
    im = layer(); d = ImageDraw.Draw(im); y = 560; c = (540, y); r = 54
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=GOLD + (255,), width=6)
    d.line([(c[0] - 24, c[1] + 2), (c[0] - 6, c[1] + 20), (c[0] + 26, c[1] - 18)], fill=GOLD + (255,), width=9, joint="curve")
    f = grot(84, 700); t = "MISSÃO CONCLUÍDA"; draw_text(d, (540 - tw(t, f, 2) / 2, y + 86), t, f, GOLD + (255,), 2, 3)
    f2 = grot(58, 600); t = f"“{FIM_QUOTE[1].upper()}”"; draw_text(d, (540 - tw(t, f2, 2) / 2, y + 204), t, f2, CREAM + (255,), 2, 3)
    t = refs[FIM_QUOTE].upper(); f3 = mono(24); draw_text(d, (540 - tw(t, f3, 2) / 2, y + 282), t, f3, GOLD + (255,), 2, 2)
    t = f"RECRIAÇÃO · {J['titulo'].upper()} · {J['ref'].upper()}"; f3 = mono(22); draw_text(d, (540 - tw(t, f3, 2) / 2, y + 330), t, f3, CREAM + (235,), 2, 2)
    f4 = mono(17, False)
    for i, l in enumerate(CREDITOS): draw_text(d, (540 - tw(l, f4) / 2, 1150 + i * 28), l, f4, CREAM + (225,), 0, 2)
    return shadowed(im, 8, (0, 4))


def key_prompt(text, pressed=False):
    """hud.prompt set higher, so a subtitle of up to three lines fits under it, and with the key lit gold once pressed."""
    im = layer(); d = ImageDraw.Draw(im); f = grot(36, 600); fk = grot(34, 700)
    t = text.upper(); wd = tw(t, f, 1.5); x = 540 - (wd + 84) / 2; y = 940
    d.rounded_rectangle([x - 18, y - 12, x + wd + 102, y + 72], radius=12, fill=DARK + (170,))
    d.rounded_rectangle([x, y, x + 60, y + 60], radius=10, fill=(GOLD if pressed else CREAM) + (250,), outline=(24, 18, 12, 255), width=3)
    d.text((x + 30 - fk.getlength("E") / 2, y + 7), "E", font=fk, fill=(24, 18, 12, 255))
    draw_text(d, (x + 84, y + 8), t, f, CREAM + (255,), 1.5)
    return shadowed(im, 5, (0, 3), 0.6)


def letterbox(o):
    """Cutscene bars, sliding in with o (0..1)."""
    im = layer(); d = ImageDraw.Draw(im); h = int(round(150 * o))
    if h: d.rectangle([0, 0, W, h], fill=(4, 4, 4, 255)); d.rectangle([0, H - h, W, H], fill=(4, 4, 4, 255))
    return im


# ------------------------------------------------------------------------------------------------ sound
def ui_sounds(events, length_s):
    """Our own interface sounds: thumps, ticks, chimes for a step done, a bright two-note pop for a counter, a rising
    sweep for the fast travel, a deep boom for the final phase, three rising notes for the third day, a D major chord at
    the end."""
    sr = 48000; x = np.zeros(int(length_s * sr) + sr, np.float32)

    def add(t, y):
        i = int(t * sr); y = y[:len(x) - i]; x[i:i + len(y)] += y.astype(np.float32)

    def tone(f, dur, amp, decay, attack=0.004):
        tt = np.arange(int(dur * sr)) / sr
        return amp * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt / decay) * np.clip(tt / attack, 0, 1)

    def thump(amp, f0=46, f1=44, dur=0.5, decay=0.16):
        tt = np.arange(int(dur * sr)) / sr; f = f0 + f1 * np.exp(-tt / 0.05)
        return amp * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / decay)

    def sweep():
        tt = np.arange(int(0.9 * sr)) / sr; f = 180 + 1800 * (tt / 0.9) ** 2
        noise = np.random.default_rng(5).standard_normal(len(tt)) * 0.025 * np.clip(tt / 0.9, 0, 1)
        return (0.09 * np.sin(2 * np.pi * np.cumsum(f) / sr) + noise) * np.clip(tt / 0.1, 0, 1) * np.clip((0.9 - tt) / 0.15, 0, 1)

    for kind, t in events:
        if kind == "thump": add(t, thump(0.5))
        elif kind == "mission": add(t + 0.02, thump(0.26))
        elif kind == "tick": add(t, tone(1480, 0.07, 0.10, 0.02))
        elif kind == "sub": add(t, tone(660.0, 0.09, 0.05, 0.03))
        elif kind == "done": add(t, tone(880.0, 0.5, 0.15, 0.16)); add(t + 0.10, tone(1318.5, 0.7, 0.15, 0.22))
        elif kind == "count": add(t, tone(1174.7, 0.25, 0.11, 0.08)); add(t + 0.07, tone(1760.0, 0.35, 0.10, 0.12))
        elif kind == "travel": add(t, sweep())
        elif kind == "boom": add(t, thump(0.7, 34, 30, 2.2, 0.9))
        elif kind == "dawn":
            for i, f in enumerate((587.33, 739.99, 880.0)): add(t + 0.18 * i, tone(f, 1.8, 0.08, 0.7, 0.08))
        elif kind == "end":
            add(t, thump(0.5))
            for i, f in enumerate((293.66, 440.0, 587.33, 739.99)): add(t + 0.05 * i, tone(f, 2.6, 0.12, 0.9, 0.05))     # D major: it is done
    return x[:int(length_s * sr)], sr


# ------------------------------------------------------------------------------------------------ the reel
WORLDS = {}


def frames_of(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return int(r.stdout.strip())


def montar(dst, parts):
    """A mission's take made of shots of different generations: parts = [(file, first frame, end frame[, push-in])],
    frame-exact picture at the reel's size (a push-in crops toward the bottom centre, where the player is), the sound of
    each part with 8 ms fades at the joins (no click, no change of length)."""
    ins = sum((["-i", str(ROOT / pt[0])] for pt in parts), []); fc = ""
    for i, (f, a, b, *z) in enumerate(parts):
        d = (b - a) / FPS; z = z[0] if z else 1.0
        crop = f"crop=iw/{z}:ih/{z}:(iw-iw/{z})/2:ih-ih/{z}," if z != 1.0 else ""
        fc += f"[{i}:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS,{crop}scale={W}:{H}:flags=lanczos,setsar=1[v{i}];"
        fc += f"[{i}:a]atrim={a / FPS:.5f}:{b / FPS:.5f},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st={d - 0.008:.5f}:d=0.008[a{i}];"
    fc += "".join(f"[v{i}][a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[v][a]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "10",
                    "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "320k", str(dst)], check=True)
    n = frames_of(dst); assert n == sum(pt[2] - pt[1] for pt in parts), f"{dst}: {n} frames"
    print("montado", dst.name, n, "quadros")


def build(stills=None, rascunho=False):
    refs = check(); ms = J["missoes"]; n = len(ms); pid = "jornada"
    out_dir = ROOT / "renders/.hud"; out_dir.mkdir(parents=True, exist_ok=True)
    takes = [ROOT / "source/takes" / mi["take"] for mi in ms]
    for k, mi in enumerate(ms):
        if mi.get("montagem") and all((ROOT / pt[0]).exists() for pt in mi["montagem"]) and (not takes[k].exists() or any((ROOT / pt[0]).stat().st_mtime > takes[k].stat().st_mtime for pt in mi["montagem"])):
            montar(takes[k], mi["montagem"])
    if rascunho:                                                                    # stills only: a stand-in for takes not generated yet
        stand = out_dir / "jornada-substituto.mp4"
        if not stand.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"testsrc2=s=720x1280:r=24:d={TAKE}", "-f", "lavfi", "-i", f"anoisesrc=d={TAKE}:a=0.02",
                            "-vf", f"drawbox=x=0:y=636:w=720:h=8:c=white@0.9:t=fill:enable='gte(t,4)'", "-shortest", "-c:v", "libx264", "-c:a", "aac", str(stand)], check=True)
        takes = [t if t.exists() else stand for t in takes]
        assert stills is not None, "--rascunho is for stills only"
    missing = [str(t) for t in takes if not t.exists()]
    assert not missing, f"takes not generated yet: {missing}"
    DUR = [frames_of(t) / FPS for t in takes]                                        # seconds; a mounted take is shorter than 8
    cuts = {}

    def cut_of(k):
        if isinstance(ms[k].get("corte"), (int, float)): return float(ms[k]["corte"])
        if k not in cuts: cuts[k] = cut_times(takes[k]) or [4.0]
        return min(cuts[k], key=lambda c: abs(c - DUR[k] / 2))                       # the prompt asks for the cut at 4 s; a lightning flash also jumps

    def pace(k):
        r = ms[k].get("ritmo") or J.get("ritmo", 1.0)
        if isinstance(r, (int, float)): return [(0.0, DUR[k], float(r))]
        segs, s0 = [], 0.0
        for until, speed in r:
            s1 = DUR[k] if until is None else cut_of(k) if until == "corte" else float(until); segs.append((s0, s1, float(speed))); s0 = s1
        return segs

    SEG = [pace(k) for k in range(n)]
    NB = [int(round(sum((b - a) / v for a, b, v in sg) * FPS)) for sg in SEG]; BEAT = [x / FPS for x in NB]
    F0 = [sum(NB[:k]) for k in range(n)]; starts = [f / FPS for f in F0]
    nh = int(round(J.get("pausa", 0.0) * FPS)); total = sum(NB) + nh; fim = J.get("fim_s", 2.6)
    end_t = starts[-1] + BEAT[-1] + nh / FPS - fim                                   # the end card comes in

    def at(k, s): return sum((min(s, b) - a) / v for a, b, v in SEG[k] if s > a)
    CUT = [at(k, cut_of(k)) for k in range(n)]                                        # the cut of each take, in seconds of its mission

    def shot_span(k, shot):
        """(start, end) of a shot in seconds of its mission."""
        return (0.0, CUT[k]) if shot == "a" else (CUT[k], BEAT[k])

    def cutscene(k, shot): return shot in ms[k].get("cena", "")

    def act_times(k, sh):
        """(shown, pressed) of a key prompt, in seconds of its mission: in a shot b it comes with the cut, in a shot a
        after the objective has landed; the line it triggers comes with the press."""
        st = shot_span(k, sh)[0]; o = ms[k].get("tecla", {}).get(sh)
        s0 = st + (o if o is not None else TCARD + 0.1 if (k == 0 and sh == "a") else 0.05 if sh == "b" else 0.35)
        return s0, s0 + 0.4

    # what happens when, in seconds of the reel
    TRAVEL = {k: (starts[k] + CUT[k] - 0.5, starts[k] + CUT[k] + 0.65) for k, mi in enumerate(ms) if mi.get("viagem")}   # the map hides the cut
    SUBS = []
    for k, mi in enumerate(ms):
        for shot, osis, frag in mi.get("falas", []):
            s0, s1 = shot_span(k, shot); lag = mi.get("atraso", {}).get(shot)
            press = [act_times(k, sh)[1] for _, sh in mi.get("acoes", []) if sh == shot]
            a0 = s0 + lag if lag is not None else (press[0] + 0.02) if press else s0 + (0.6 if shot == "a" else 0.12)
            if k == 0 and shot == "a": a0 = max(a0, TCARD + 0.1)
            a1 = (s1 - 0.08) if shot == "a" else ((end_t - starts[k] - 0.2) if k == n - 1 else BEAT[k] - 0.15)
            if k in TRAVEL and shot == "b": a0 = max(a0, TRAVEL[k][1] - starts[k] + 0.1)
            if k in TRAVEL and shot == "a": a1 = min(a1, TRAVEL[k][0] - starts[k] - 0.05)
            assert a1 - a0 >= 1.6, f"mission {k + 1} shot {shot}: the subtitle stays only {a1 - a0:.2f} s"
            SUBS.append((starts[k] + a0, starts[k] + a1, cropped(subtitle({"texto": frag, "ref": refs[(osis, frag)]})), cutscene(k, shot)))
            print(f"mission {k + 1} shot {shot}: “{frag[:42]}” {starts[k] + a0:.2f}–{starts[k] + a1:.2f} s ({a1 - a0:.2f} s, {len(frag) / (a1 - a0):.0f} chars/s)")
    SIGNS = sorted(starts[k] + shot_span(k, sh)[0] + fr * (shot_span(k, sh)[1] - shot_span(k, sh)[0]) for k, mi in enumerate(ms) for sh, fr in mi.get("sinais", []))
    COUNTS = []                                                                        # (reel second, label, total, count) of the disciples counter
    for k, mi in enumerate(ms):
        if mi.get("contador"):
            lab, tot, by = mi["contador"]
            for sh, c in by.items(): COUNTS.append((starts[k] + shot_span(k, sh)[0] + mi.get("contador_s", 0.6 if sh == "b" else 0.4), lab, tot, c, k))
    BANNERS = []
    for k, mi in enumerate(ms):
        b = mi.get("banner")
        if not b: continue
        s0 = shot_span(k, b[0])[0] + (TCARD + 0.05 if k == 0 else 0.15); s1 = (CUT[k] - 0.05) if k == 0 else s0 + 1.35
        img = banner(b[1], b[3], refs[(b[2], b[3])]) if len(b) == 4 else banner(b[1], b[2])
        BANNERS.append((starts[k] + s0, starts[k] + s1, cropped(img)))
    print(pid, f"{total} frames, {total / FPS:.2f} s; missions at", [f"{s:.2f}" for s in starts], "; cuts at", [f"{starts[k] + CUT[k]:.2f}" for k in range(n)])
    print("signs at", [f"{s:.2f}" for s in SIGNS], "; counters", [(round(t, 2), c) for t, _, _, c, _ in COUNTS])

    CS = []                                                                            # cutscene spans, back-to-back shots merged
    for kk in range(n):
        for sh in "ab":
            if cutscene(kk, sh):
                c0, c1 = starts[kk] + shot_span(kk, sh)[0], starts[kk] + shot_span(kk, sh)[1]
                if CS and abs(CS[-1][1] - c0) < 1e-6: CS[-1] = (CS[-1][0], c1)
                else: CS.append((c0, c1))
    SCRIM, HEAD = scrims(), hud.header()
    mask = Image.new("L", (R * SS, R * SS), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, R * SS - 1, R * SS - 1], radius=9 * SS, fill=255)
    mask = mask.resize((R, R), Image.LANCZOS); FRAME = radar_frame()
    START = cropped(start_card(round(total / FPS))); ENDC = cropped(end_card(refs))
    OBJ, PLATES = {}, {}

    def obj(k, shot, done):
        o = ms[k].get("objetivo")
        if o is None: return None
        text = o.get(shot) if isinstance(o, dict) else o
        if text is None: return None
        key = (k, text, done)
        if key not in OBJ: OBJ[key] = objective(k + 1, n, text, done)
        return OBJ[key]

    def radar_of(k, shot):
        """(world image, px per km, centre geo, heading, km to the next place, plate) of mission k's shot."""
        lug = ms[k].get("lugar", {}); spec = lug.get(shot, lug.get("a"))
        if spec is None: return None
        name, geo, ref = geo_of(spec); rr = ms[k].get("raio", 8); rr = rr.get(shot, rr.get("a")) if isinstance(rr, dict) else rr
        wkey = (spec if isinstance(spec, str) else spec[1], rr)
        if wkey not in WORLDS:
            WORLDS[wkey] = world(spec if isinstance(spec, str) else spec[1], rr)
        nxt = None                                                                    # the next place on the journey
        order = [(kk, sh) for kk in range(n) for sh in "ab"]
        for kk, sh in order[order.index((k, shot)) + 1:]:
            l2 = ms[kk].get("lugar", {}); s2 = l2.get(sh) if sh in l2 else (l2.get("a") if sh == "b" else None)
            if s2 is not None:
                g2 = geo_of(s2)[1]
                if km(geo, g2) > 0.05: nxt = g2; break
        head = bearing(geo, nxt) if nxt else 0.0; dist = km(geo, nxt) if nxt else 0.0
        if spec not in PLATES if isinstance(spec, str) else spec not in PLATES: PLATES[spec] = plate(name, geo, ref)
        return WORLDS[wkey], geo, head, dist, PLATES[spec]

    def counter_at(g):
        cur = None
        for t, lab, tot, c, k in COUNTS:
            if g >= t: cur = (lab, tot, c, k, t)
        return cur

    def frame(k, j, src):
        t = j / FPS; g = starts[k] + t; mi = ms[k]; shot = "b" if t >= CUT[k] else "a"; cs = cutscene(k, shot)
        im = src.convert("RGBA")
        if not cs:
            im.alpha_composite(SCRIM); im.alpha_composite(HEAD)
            od = mi.get("objetivo_de"); show = not (od == "corte" and shot == "a")
            if show:
                isd = isinstance(mi.get("objetivo"), dict)
                done = (g >= end_t) if k == n - 1 else (t >= (CUT[k] - 0.55 if isd and shot == "a" else BEAT[k] - 0.8))
                if k in TRAVEL and shot == "b" and g < TRAVEL[k][1]: done = True       # the first step stays ticked while travelling
                ob = obj(k, "a" if (isd and k in TRAVEL and g < TRAVEL[k][1]) else shot, done)
                if ob is not None: im.alpha_composite(ob)
            rd = radar_of(k, shot)
            if rd is not None:
                (wimg, ppk, _), geo, head, dist, pl = rd
                side = wimg.size[0]; t0 = shot_span(k, shot)[0]; v = hud.SPEED * SS * 1.0
                cx = side / 2 + math.sin(math.radians(head)) * v * (t - t0); cy = side / 2 - math.cos(math.radians(head)) * v * (t - t0)
                bx, by = int(round(cx - R * SS / 2)), int(round(cy - R * SS / 2))
                crop = wimg.crop((bx, by, bx + R * SS, by + R * SS)).resize((R, R), Image.LANCZOS).convert("RGBA")
                cnt = counter_at(g); fol = mi.get("seguidores", cnt[2] if (cnt and cnt[0] == "Discípulos") else 0)
                dest_px = min(R / 2 - 16, dist * ppk) if dist else 0
                crop.alpha_composite(radar_marks(head, dest_px if dist else 13, min(fol, 12), (g * 1.4) % 1.0))
                im.paste(crop, (MX, MY), mask); im.alpha_composite(FRAME, (MX - 8, MY - 8)); im.alpha_composite(pl)
            prog_done = sum(1 for kk in range(n) if starts[kk] + BEAT[kk] - 0.8 <= g) if g < end_t else n
            im.alpha_composite(progress(n, min(prog_done, n), 0.0 if prog_done > k else min(1.0, t / max(0.1, BEAT[k] - 0.8))), (MX, MY + R + 14))
            cnt = counter_at(g)
            if cnt and cnt[3] == k:
                lab, tot, c, _, tc = cnt; pop = (g - tc) / 0.35 if 0 <= g - tc < 0.35 else None
                im.alpha_composite(dots(lab, tot, c, pop))
            elif SIGNS and any(starts[kk] <= g < starts[kk] + BEAT[kk] for kk, m2 in enumerate(ms) if m2.get("sinais")) and k == next((kk for kk in range(n) if starts[kk] <= g < starts[kk] + BEAT[kk]), k):
                ns = sum(1 for s in SIGNS if g >= s)
                if ns:
                    last = max(s for s in SIGNS if g >= s); pop = (g - last) / 0.35 if g - last < 0.35 else None
                    im.alpha_composite(signs(ns, pop))
            for a_txt, sh in mi.get("acoes", []):
                if sh != shot: continue
                s0, pr = act_times(k, sh)
                if s0 <= t < pr + 0.32:
                    down = t >= pr; o = min(1.0, (pr + 0.32 - t) / 0.15) if down else min(1.0, (t - s0) / 0.12)
                    if (a_txt, down) not in PROMPTS: PROMPTS[(a_txt, down)] = cropped(key_prompt(a_txt, down))
                    p = PROMPTS[(a_txt, down)]; im.alpha_composite(faded(p[0], o), p[1])
        # cutscene bars: in with the final phase, out on the third day's cut
        lb = max((ramp(g, c0, c1, 0.35) for c0, c1 in CS), default=0.0)               # no dip where one cutscene shot meets the next
        if lb > 0: im.alpha_composite(letterbox(lb))
        for a0, a1, (img, xy), _ in SUBS:
            o = ramp(g, a0, a1)
            if o > 0: im.alpha_composite(faded(img, o), xy)
        for a0, a1, (img, xy) in BANNERS:
            o = ramp(g, a0, a1, 0.2)
            if o > 0: im.alpha_composite(faded(img, o), xy)
        for k2, (a0, a1) in TRAVEL.items():
            if a0 <= g < a1 + 0.2:
                o = min(1.0, (g - a0) / 0.12, (a1 + 0.2 - g) / 0.2)
                im = Image.blend(im, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.45 * o)
                frac = min(1.0, max(0.0, (g - a0) / (a1 - a0 - 0.2)))
                key = round(frac, 2)
                if key not in TCARDS: TCARDS[key] = cropped(travel_card(ms[k2]["lugar"]["a"], ms[k2]["lugar"]["b"], frac))
                im.alpha_composite(faded(TCARDS[key][0], o), TCARDS[key][1])
        # the final phase ends in black, the third day comes out of it
        for kk in range(n - 1):
            if ms[kk].get("cena") and not ms[kk + 1].get("cena", "") == ms[kk].get("cena"):
                e = starts[kk] + BEAT[kk]
                if e - 0.45 <= g < e + 0.5:
                    o = (g - (e - 0.45)) / 0.45 if g < e else 1 - (g - e) / 0.5
                    im = Image.blend(im, Image.new("RGBA", (W, H), (0, 0, 0, 255)), max(0.0, min(1.0, o)))
        if k == 0:
            o = 1.0 if t < TCARD - 0.25 else ramp(t, -1, TCARD, 0.25)
            if o > 0: im.alpha_composite(faded(START[0], o), START[1])
        if g >= end_t:
            o = min(1.0, (g - end_t) / 0.3)
            im = Image.blend(im, Image.new("RGBA", (W, H), (8, 8, 8, 255)), 0.55 * o); im.alpha_composite(faded(ENDC[0], o), ENDC[1])
        return im.convert("RGB")

    PROMPTS, TCARDS = {}, {}

    def retime(k):
        sg = SEG[k]
        if len(sg) == 1: return f"setpts=PTS/{sg[0][2]}"
        expr, c = "", 0.0
        for i, (a, b, v) in enumerate(sg):
            piece = f"{c:.6f}+(T-{a:.6f})/{v}"; expr += f"if(lt(T,{b:.6f}),{piece}," if i < len(sg) - 1 else piece; c += (b - a) / v
        return f"setpts='({expr}{')' * (len(sg) - 1)})/TB'"

    want = None if stills is None else {int(round(t * FPS)): t for t in stills}
    enc = None; vid = out_dir / f"{pid}-video.mp4"; vid_hq = out_dir / f"{pid}-video-hq.mp4"
    if want is None:                                                                 # near-lossless first; the 29 MB file comes from it in two passes
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                                "-c:v", "libx264", "-preset", "veryfast", "-crf", "10", "-pix_fmt", "yuv420p", str(vid_hq)], stdin=subprocess.PIPE)
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
    kbps = int((28.0e6 * 8 / (total / FPS) - 200e3) / 1000)                        # 50 s in 29 MB (the chat and the app): about 4.3 Mbit/s
    for ps in (1, 2):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(vid_hq), "-c:v", "libx264", "-preset", "slow", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.8)}k",
                        "-bufsize", f"{kbps * 3}k", "-pass", str(ps), "-passlogfile", str(out_dir / f"{pid}-2pass"), "-pix_fmt", "yuv420p", "-an",
                        *(["-f", "null", "/dev/null"] if ps == 1 else ["-movflags", "+faststart", str(vid)])], check=True, cwd=out_dir)
    print(f"video: {kbps} kbit/s, {vid.stat().st_size / 1e6:.2f} MB")
    # sound: each take's ambience at its pace, the held frames carry the last take's ambience backwards, plus ours; -14 LUFS
    import soundfile as sf
    ev = [("thump", 0.04)] + [("mission", starts[k]) for k in range(1, n) if not ms[k].get("cena")]
    ticks = [starts[k] + act_times(k, sh)[1] for k, mi in enumerate(ms) for _, sh in mi.get("acoes", [])]
    ev += [("sub", a0) for a0, _, _, cs in SUBS if not cs and all(abs(a0 - x) > 0.1 for x in ticks)]   # a pressed key already clicks
    ev += [("count", t) for t in SIGNS] + [("count", t) for t, *_ in COUNTS]
    for k, mi in enumerate(ms):
        for a_txt, sh in mi.get("acoes", []): ev.append(("tick", starts[k] + act_times(k, sh)[1]))
        if not mi.get("cena") and k < n - 1: ev.append(("done", starts[k] + BEAT[k] - 0.8))
        if isinstance(mi.get("objetivo"), dict): ev.append(("done", starts[k] + CUT[k] - 0.55))        # its first step
        if mi.get("cena") == "ab": ev.append(("boom", starts[k] + 0.1))
        if mi.get("cena") == "a": ev += [("dawn", starts[k] + 0.3), ("mission", starts[k] + CUT[k])]      # the HUD comes back
    ev += [("travel", a0) for a0, _ in TRAVEL.values()] + [("end", end_t)]
    ui, sr = ui_sounds(ev, total / FPS); uiw = out_dir / f"{pid}-ui.wav"; sf.write(uiw, ui, sr)
    ins = sum((["-i", str(t)] for t in takes), []); fc = ""; ph = nh / FPS
    for i in range(n):
        sg = SEG[i]; beat = BEAT[i]
        if len(sg) == 1: head = f"[{i}:a]atrim=0:{DUR[i]:.4f},asetpts=PTS-STARTPTS,atempo={sg[0][2]}"
        else:
            head = f"[{i}:a]asplit={len(sg)}" + "".join(f"[s{i}_{q}]" for q in range(len(sg))) + ";"
            for q, (a, b, v) in enumerate(sg):
                fd = min(0.008, (b - a) / v / 3)
                head += f"[s{i}_{q}]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,atempo={v},afade=t=in:d={fd:.4f},afade=t=out:st={(b - a) / v - fd:.4f}:d={fd:.4f}[p{i}_{q}];"
            head += "".join(f"[p{i}_{q}]" for q in range(len(sg))) + f"concat=n={len(sg)}:v=0:a=1"
        head += f",apad=whole_dur={beat:.4f},atrim=0:{beat:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.04"
        if i == n - 1 and nh:
            fc += (f"{head},asplit[m{i}][x{i}];[x{i}]atrim=start={beat - ph:.4f}:end={beat:.4f},asetpts=PTS-STARTPTS,areverse,"
                   f"afade=t=out:st=0.15:d={ph - 0.15:.4f}[r{i}];[m{i}][r{i}]concat=n=2:v=0:a=1[a{i}];")
        else: fc += f"{head},afade=t=out:st={beat - 0.06:.4f}:d=0.06[a{i}];"
    fc += "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,aresample=48000,loudnorm=I=-20:TP=-3:LRA=11,aresample=48000[amb];"
    fc += f"[{n}:a]aresample=48000[ui];[amb][ui]amix=inputs=2:normalize=0:duration=longest,afade=t=out:st={total / FPS - 0.1:.4f}:d=0.1[a]"
    mixw = out_dir / f"{pid}-mix.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-i", str(uiw), "-filter_complex", fc, "-map", "[a]", "-t", f"{total / FPS:.3f}", "-ar", "48000", str(mixw)], check=True)
    final = ROOT / f"renders/{pid}.mp4"; gain = -14.0 - loudness(mixw)[0]; lim = 0.78
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
    json.dump({"quadros": total, "duracao_s": total / FPS, "missoes_s": starts, "cortes_s": [starts[k] + CUT[k] for k in range(n)],
               "emendas_som_s": sorted(seams), "sinais_s": SIGNS, "legendas_s": [[a0, a1] for a0, a1, _, _ in SUBS], "cartao_final_s": end_t},
              open(out_dir / f"{pid}-tempos.json", "w", encoding="utf-8"), indent=1)
    print(final, f"{total} frames, {total / FPS:.2f} s, {final.stat().st_size / 1e6:.2f} MB, {lufs:.1f} LUFS, true peak {tp:.1f} dBTP")


def frase(t):
    return re.sub(r"(^|[.!?]\s+)(\w)", lambda m: m.group(1) + m.group(2).upper(), t.lower())


def legenda():
    """The post's caption, from the data: the hook, the journey mission by mission with its literal lines."""
    refs = check(); ms = J["missoes"]
    secs = round(json.load(open(ROOT / "renders/.hud/jornada-tempos.json", encoding="utf-8"))["duracao_s"])   # the render's own length
    out = [frase(" ".join(J["gancho"]).format(s=secs)) + " 🎮", "", "GRAND TESTAMENT ADVENTURE · A JORNADA", "",
           "E se existisse um jogo com as missões da vida de Jesus? Da Galileia ao túmulo vazio, com as palavras dos evangelhos:", ""]
    for k, mi in enumerate(ms):
        o = mi.get("objetivo"); b = mi.get("banner")
        name = b[1] if (mi.get("cena") and b) else (o if isinstance(o, str) else " / ".join(o.values()))      # a cutscene goes by its chapter
        lines = " ".join(f"“{frag}” ({refs[(osis, frag)]})" for _, osis, frag in mi.get("falas", []))
        out.append(f"{k + 1}. {name}: {lines}")
    out += ["", f"“…{POST_QUOTE[1]}” ({refs[POST_QUOTE]})", "",
            "👇 Qual missão você jogaria primeiro? Comenta aí.", "🔁 Manda pra quem tá contando os dias pro dia 19", "",
            "Recriação feita com IA: é um \"e se\", não um jogo que existe · Lugares e relevo reais (OpenBible.info, SRTM) · Texto: Bíblia Livre (CC BY 4.0 BR)", "",
            "#jesus #biblia #gameplay #mundoaberto #galileia #ressurreicao #games #cristao #fe #esefosseumjogo"]
    return "\n".join(out)


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--check" in a: print(len(check()), "linhas conferidas na Bíblia Livre")
    elif "--legenda" in a:
        txt = legenda(); (ROOT / "LEGENDAS-JORNADA.md").write_text("# A jornada: legenda do post\n\n```\n" + txt + "\n```\n", encoding="utf-8"); print(txt)
    elif "--still" in a: build(stills=[float(x) for x in a[a.index("--still") + 1].split(",")], rascunho="--rascunho" in a)
    else: build()
