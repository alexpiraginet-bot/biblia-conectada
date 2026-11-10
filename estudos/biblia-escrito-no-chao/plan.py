#!/usr/bin/env python3
"""The edit of "Escrito no chão" in one place: shots, on-screen text and painted overlays, all timed from the narration
(renders/.film/narr.json) and all numbers read from data/stats.json. Everything downstream reads renders/.film/plan.json:

  paint/render.cjs   p5.brush layers (wash panels behind the text, threads, underlines, the blue wash)
  compose.py         takes + stills + painted layers -> one clip per shot (renders/.film/shots/)
  edit/edit.jsx      the cut, the typography and the sound, in Higgsedit (Higgsfield sandbox)

Short cut (10/11/2026, Alex: "deixe dinâmico e bom de assistir mesmo para os impacientes... nem muito longo"): a cut on
almost every clause, the words on screen as they are said. Close-ups come from the 1520 px key art (sharp), wide shots
from the animated takes (720p, except the 1080p hook).

Second pass (18:10, Alex: "pouco efeito visual" and "algum gancho forte do vídeo para iniciar o vídeo e fazer um
rebobinamento até o começo"): the film opens today (the phone held like a stone, "Hoje a pedra é um comentário."),
rewinds through its own pictures to the dust of John 8, and comes back to the phone for "Solta.". Every shot carries
its effects in "fx" (compose.py): impact shake, zoom punch, flash, dust motes, dust bursts, zoom-through cuts, light
sweep, glints on the water, a bloom of light on the verdict; more is drawn with p5.brush (rings, rays, bursts).

  python3 -I plan.py
"""
import json, math, re, unicodedata
from pathlib import Path
from PIL import ImageFont

ROOT = Path(__file__).resolve().parent
WORK = ROOT / "renders/.film"
FONTS = ROOT.parent / "biblia-referencias/assets/fonts"
W, H, FPS = 1080, 1920, 24                                 # the takes are 24 fps: the film keeps their cadence
N = json.load(open(WORK / "narr.json")); ST = json.load(open(ROOT / "data/stats.json"))
DUR = N["duration"]
LN = {L["i"]: L for L in N["lines"]}
P86, V1 = ST["john_8_6"]["partners"], ST["pairs"][0]["votes"]
assert (P86, V1, ST["john_8_6"]["top"][0][0]) == (30, 55, "Jeremias 17:13")

WHITE, GOLD, SKY, UMBER, SEPIA, BLUE, INK, WATER = "#FFF8EC", "#FFCF73", "#D6EEFF", "#2a180c", "#4a1f0c", "#1f5f96", "#f2b544", "#2a78c8"
FACE = {"grot": ("SpaceGrotesk-VF.ttf", 700), "serif": ("Cormorant-VF.ttf", 600), "mono": ("SpaceGrotesk-VF.ttf", 600)}       # chips: Space Mono's dotted zero reads as 8/9 at 30 px
ADV = {"grot": 1.10, "serif": 1.10, "mono": 1.70}             # line advance, in font sizes
nrm = lambda s: re.sub(r"[^a-z0-9]", "", "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn"))


def wt(line, word, nth=0):
    """film time of a narrated word (as Whisper heard it; accents and case ignored)"""
    k = 0
    for w in LN[line]["words"]:
        if nrm(w["w"]) == nrm(word):
            if k == nth: return round(w["t0"], 3)
            k += 1
    raise KeyError((line, word, nth))


cut = lambda line, word, nth=0, lead=0.08: round(wt(line, word, nth) - lead, 3)   # the picture arrives just before the word
_F = {}


def width(text, face, size):
    name, wght = FACE[face]
    if (face, size) not in _F:
        f = ImageFont.truetype(str(FONTS / name), size)
        if wght: f.set_variation_by_axes([wght])
        _F[(face, size)] = f
    return _F[(face, size)].getlength(text)


# ---- shots: (id, start, source, in-point, speed, cam [zoom0, zoom1, anchor x, anchor y]) ; a shot ends where the next begins
E6 = round(LN[6]["t1"] + 0.03, 3)                             # the 1.2 s without narration: the stone falls
T05_IN, T05_HIT = 2.30, 2.70                                  # t05: where s10 starts; the stone hits the ground (read on the take)
T11_OPEN, T11_HIT = 2.14, 2.45                                # t11: the grip opens; the phone hits the ground
tSolta = cut(16, "Solta", lead=0.04)
RW0, RW1 = round(LN[160]["t1"] + 0.06, 3), round(LN[1]["t0"] - 0.06, 3)      # the rewind sits between the cold open and the hook
SHOTS = [
    ("c01", 0.0, "t11", 0.20, 1.0, [1.04, 1.16, 0.46, 0.40]),                   # cold open, today: the phone held like a stone
    ("rw", RW0, "rewind", 0.0, 1.0, [1.0, 1.0, 0.5, 0.5]),                      # the film's own pictures, backwards
    ("s01", RW1, "t01b", 0.00, 1.0, [1.00, 1.07, 0.45, 0.62]),                  # the finger in the dust, stones in the shadows
    ("s02", cut(2, "No"), "t01b", 2.70, 1.0, [1.50, 1.64, 0.40, 0.70]),         # "No chão, com o dedo."
    ("s03", cut(2, "E"), "t03", 0.40, 1.0, [1.12, 1.20, 0.50, 0.70]),           # "E a Bíblia não conta o quê."
    ("s04", cut(3, "jogaram"), "t02", 0.30, 1.0, [1.00, 1.08, 0.50, 0.42]),     # the ring, the woman in the middle
    ("s05", cut(3, "Adultério"), "k12", 0.0, 1.0, [2.05, 2.35, 0.47, 0.37]),    # her
    ("s06", cut(3, "A"), "t05", 0.10, 1.0, [1.00, 1.10, 0.50, 0.36]),           # "A lei mandava apedrejar": the fist
    ("s07", cut(6, "Aquele"), "t04", 1.50, 1.0, [1.00, 1.06, 0.55, 0.42]),      # he stands
    ("s08", cut(6, "seja"), "t01b", 4.80, 1.0, [1.50, 1.50, 0.50, 0.47]),       # the shadows holding stones (still: rings are drawn on them)
    ("s09", cut(6, "contra"), "k28", 0.0, 1.0, [1.85, 2.10, 0.27, 0.20]),       # her again, from the other side
    ("s10", E6, "t05", T05_IN, 1.0, [1.06, 1.12, 0.50, 0.42]),                  # the stone falls
    ("s12", cut(9, "Mas"), "k28", 0.0, 1.0, [1.35, 1.35, 0.38, 0.74]),          # the furrows: John 8:6
    ("s13", cut(9, "é"), "k27", 0.0, 1.0, [1.00, 1.10, 0.45, 0.45]),            # Jeremiah
    ("s14", cut(9, "600"), "k27", 0.0, 1.0, [1.45, 1.62, 0.42, 0.50]),          # six hundred years before
    ("s15", cut(10, "Os"), "t06", 3.30, 1.0, [1.00, 1.06, 0.50, 0.50]),         # "os que de mim se afastam": they turn away
    ("s16", cut(10, "serão"), "k28", 0.0, 1.0, [1.70, 1.92, 0.32, 0.86]),       # "escritos no chão": the furrows
    ("s17", cut(10, "pois"), "k13", 0.0, 1.0, [1.00, 1.13, 0.50, 0.45]),        # "abandonaram": the stones left behind
    ("s18", cut(10, "a"), "t09", 0.30, 1.0, [1.10, 1.17, 0.50, 0.42]),          # "a fonte de águas vivas": the only blue
    ("s19", cut(13, "Quem"), "t06", 3.90, 1.0, [1.00, 1.07, 0.50, 0.50]),       # backs turned
    ("s20", cut(13, "fica"), "t01", 1.20, 1.0, [1.00, 1.08, 0.45, 0.70]),       # the name in the dust
    ("s21", cut(13, "Só"), "k28", 0.0, 1.0, [2.15, 2.40, 0.30, 0.88]),          # dust
    ("s22", cut(13, "a", 1), "t09", 2.60, 1.0, [1.12, 1.20, 0.50, 0.42]),       # water
    ("s23", cut(15, "nem"), "t10", 0.30, 1.0, [1.06, 1.10, 0.45, 0.48]),        # the two of them
    ("s24", cut(15, "Vai"), "t10", 2.90, 1.0, [1.30, 1.38, 0.42, 0.44]),        # she goes (closer: s23 is the same take)
    ("s25", round(LN[15]["t1"] + 0.04, 3), "t11", None, 1.0, [1.00, 1.05, 0.50, 0.45]),   # back to today: the hand still holds it
    ("s26", tSolta, "t11", None, 1.0, [1.22, 1.30, 0.50, 0.60]),                # "Solta."
    ("s27", round(LN[17]["t0"], 3), "t01b", 4.60, 1.0, [1.00, 1.06, 0.45, 0.62]),   # the call, on the picture of frame 0 (loop)
]
shots = []
for k, (sid, t0, src, tin, speed, cam) in enumerate(SHOTS):
    t1 = SHOTS[k + 1][1] if k + 1 < len(SHOTS) else DUR
    if sid == "s25": tin = round(T11_OPEN - (tSolta - t0), 3)                  # the hand still holds it until the cut...
    if sid == "s26": tin = T11_OPEN                                            # ...and lets go on "Solta."
    assert t1 - t0 >= 0.55, (sid, t0, t1)
    assert sid not in ("s25", "c01") or tin + (t1 - t0) <= T11_OPEN + 1e-6, (sid, "the phone must still be in the hand")
    shots.append({"id": sid, "t0": t0, "t1": round(t1, 3), "f0": round(t0 * FPS), "frames": round(t1 * FPS) - round(t0 * FPS),
                  "src": src, "in": tin, "speed": speed, "cam": cam})
assert sum(s["frames"] for s in shots) == round(DUR * FPS)
SH = {s["id"]: s for s in shots}
# what is seen landing (film times): the stone, the phone. The sound and the effects hang on them.
tStone, tPhone = round(SH["s10"]["t0"] + T05_HIT - T05_IN, 3), round(SH["s26"]["t0"] + T11_HIT - T11_OPEN, 3)

# ---- text blocks. A line is (text, face, size, color, time it appears). slot: where the block sits in the safe zone
B = []
TOP, BOTTOM, LOW = 300, 1540, 1590


def block(bid, on, lines, slot="top", panel="umber", t1=None, pad=(46, 30)):
    fxs = [l[5] if len(l) > 5 else "" for l in lines]; lines = [l[:5] for l in lines]
    hs = [l[2] * ADV[l[1]] for l in lines]; total = sum(hs) - (lines[-1][2] * (ADV[lines[-1][1]] - 1.0))
    y = TOP if slot == "top" else (BOTTOM if slot == "bottom" else LOW if slot == "low" else slot) - total
    ws = [width(l[0], l[1], l[2]) for l in lines]; out = []
    assert max(ws) <= 900, (bid, [round(w) for w in ws])        # inside the central 900 px of the Reels safe zone
    for (tx, fc, sz, col, t), w, fx_ in zip(lines, ws, fxs):
        out.append({"text": tx, "face": fc, "size": sz, "color": col, "x": round(540 - w / 2), "y": round(y), "w": round(w), "t0": round(t, 3), "fx": fx_})
        y += sz * ADV[fc]
    x0, x1 = 540 - max(ws) / 2 - pad[0], 540 + max(ws) / 2 + pad[0]
    y0, y1 = out[0]["y"] - pad[1], out[-1]["y"] + out[-1]["size"] * 1.08 + pad[1]
    assert y0 >= 240 and y1 <= 1670, (bid, y0, y1)
    s0, s1 = SH[on[0]], SH[on[-1]]
    t0 = min(l["t0"] for l in out); t1 = s1["t1"] if t1 is None else t1
    assert s0["t0"] - 1e-6 <= t0 < t1 <= s1["t1"] + 1e-6, (bid, t0, t1, s0["t0"], s1["t1"])
    B.append({"id": bid, "shots": on, "t0": round(t0, 3), "t1": round(t1, 3), "panel": panel,
              "rect": [round(x0), round(y0), round(x1 - x0), round(y1 - y0)], "lines": out})


c = lambda sid: SH[sid]["t0"]                                 # a line that is on screen from the first frame of its shot
block("b00", ["c01"], [("HOJE A PEDRA", "grot", 86, WHITE, 0.0), ("É UM COMENTÁRIO.", "grot", 86, GOLD, 0.0)], "low")       # whole on frame 0
block("brw", ["rw"], [("DO COMEÇO", "mono", 46, WHITE, c("rw"))], 1190, panel=None)                # under the rewind sign (edit.jsx draws it)
block("b01", ["s01"], [("NOS EVANGELHOS", "mono", 34, GOLD, c("s01")), ("JESUS SÓ ESCREVEU", "grot", 88, WHITE, c("s01"), "slam"),
                       ("UMA VEZ.", "grot", 88, GOLD, wt(1, "uma"), "slam")])
block("b02", ["s02"], [("NO CHÃO.", "grot", 116, WHITE, c("s02")), ("COM O DEDO.", "grot", 116, GOLD, wt(2, "com"))])
block("b03", ["s03"], [("E A BÍBLIA", "grot", 88, WHITE, c("s03")), ("NÃO CONTA O QUÊ.", "grot", 88, GOLD, wt(2, "não")),
                       ("JOÃO 8:6", "mono", 34, WHITE, c("s03"))], pad=(46, 34))
block("b04", ["s04"], [("JOÃO 8:3–4", "mono", 32, GOLD, c("s04")), ("JOGARAM UMA MULHER", "grot", 76, WHITE, c("s04")),
                       ("NO MEIO DE TODOS.", "grot", 76, WHITE, wt(3, "no"))], "bottom")
block("b05", ["s05"], [("ADULTÉRIO.", "grot", 132, GOLD, c("s05"), "slam")], "bottom")
block("b06", ["s06"], [("A LEI MANDAVA", "grot", 84, WHITE, c("s06")), ("APEDREJAR.", "grot", 128, GOLD, wt(3, "apedrejar"), "slam")], "bottom")
block("b07", ["s07"], [("JOÃO 8:7", "mono", 32, GOLD, c("s07")), ("“Aquele de vós", "serif", 92, WHITE, c("s07")),
                       ("que está sem pecado,", "serif", 92, WHITE, wt(6, "que"))], "bottom")
block("b08", ["s08"], [("JOÃO 8:7", "mono", 32, GOLD, c("s08")), ("seja o primeiro", "serif", 92, WHITE, c("s08")),
                       ("que atire pedra", "serif", 92, GOLD, wt(6, "que", 1))], "bottom")
block("b09", ["s09"], [("JOÃO 8:7", "mono", 32, GOLD, c("s09")), ("contra ela.”", "serif", 112, WHITE, c("s09"))], "bottom")
block("b10", ["s10"], [("JOÃO 8:9", "mono", 32, GOLD, c("s10")), ("“saíram", "serif", 112, WHITE, c("s10") + 0.05),
                       ("um a um”", "serif", 112, GOLD, c("s10") + 0.40)], "bottom")
block("b12", ["s12"], [(f"JOÃO 8:6 · {P86} LIGAÇÕES", "mono", 34, GOLD, c("s12")), ("A LIGAÇÃO", "grot", 100, WHITE, c("s12")),
                       ("MAIS VOTADA", "grot", 100, GOLD, wt(9, "mais"))])
block("b13", ["s13"], [(f"A MAIS VOTADA · {V1} VOTOS", "mono", 34, GOLD, c("s13")), ("JEREMIAS 17:13", "grot", 104, WHITE, c("s13"), "slam")], "bottom")
block("b14", ["s14"], [(f"JEREMIAS 17:13 · {V1} VOTOS", "mono", 34, GOLD, c("s14")), ("≈ 600 ANOS", "grot", 128, WHITE, c("s14"), "slam"),
                       ("ANTES", "grot", 128, GOLD, wt(9, "antes"))], "bottom")
block("b15", ["s15"], [("JEREMIAS 17:13", "mono", 32, GOLD, c("s15")), ("“os que de mim", "serif", 96, WHITE, c("s15")),
                       ("se afastam", "serif", 96, WHITE, wt(10, "se"))])
block("b16", ["s16"], [("JEREMIAS 17:13", "mono", 32, GOLD, c("s16")), ("serão escritos", "serif", 104, GOLD, c("s16")),
                       ("no chão;", "serif", 104, GOLD, wt(10, "no"), "slam")])
block("b17", ["s17"], [("JEREMIAS 17:13", "mono", 32, GOLD, c("s17")), ("pois abandonaram", "serif", 96, WHITE, c("s17")),
                       ("ao SENHOR,", "serif", 96, WHITE, wt(10, "ao"))])
block("b18", ["s18"], [("JEREMIAS 17:13", "mono", 32, WHITE, c("s18")), ("a fonte de", "serif", 108, WHITE, c("s18")),
                       ("águas vivas.”", "serif", 108, SKY, wt(10, "águas"))], panel="blue")
block("b19", ["s19"], [("QUEM DÁ AS COSTAS", "grot", 82, WHITE, c("s19")), ("PRA FONTE", "grot", 110, SKY, wt(13, "para"))])
block("b20", ["s20"], [("FICA COM O NOME", "grot", 84, WHITE, c("s20")), ("NO PÓ.", "grot", 132, GOLD, wt(13, "no"), "slam")])
block("b21", ["s21"], [("SÓ QUE PÓ…", "grot", 116, WHITE, c("s21"))])
block("b22", ["s22"], [("A ÁGUA", "grot", 136, SKY, c("s22"), "slam"), ("APAGA.", "grot", 136, WHITE, wt(13, "apaga"), "slam")], panel="blue")
block("b23", ["s23"], [("JOÃO 8:11", "mono", 32, GOLD, c("s23")), ("“Nem eu também", "serif", 96, WHITE, c("s23")),
                       ("te condeno;", "serif", 96, GOLD, wt(15, "te"))], "bottom")
block("b24", ["s24"], [("JOÃO 8:11", "mono", 32, GOLD, c("s24")), ("vai, e não", "serif", 96, WHITE, c("s24")),
                       ("peques mais.”", "serif", 96, WHITE, wt(15, "peques"))], "bottom")
block("b25", ["s25"], [("HOJE A PEDRA", "grot", 86, WHITE, c("s25")), ("É UM COMENTÁRIO.", "grot", 86, GOLD, c("s25"))], "low")
block("b26", ["s26"], [("SOLTA.", "grot", 196, GOLD, c("s26"), "slam")], "low")
block("b27", ["s27"], [("O QUE VOCÊ ACHA", "grot", 86, WHITE, c("s27")), ("QUE ELE ESCREVEU?", "grot", 86, GOLD, wt(17, "que", 1), "slam"),
                       ("COMENTA AQUI", "mono", 40, WHITE, round(LN[17]["t1"] + 0.05, 3))], pad=(46, 34))
block("b28", ["s27"], [("TEXTO BÍBLICO: BÍBLIA LIVRE (CC BY 4.0 BR)", "mono", 23, WHITE, c("s27")),
                       ("LIGAÇÕES: OPENBIBLE.INFO (CC BY) · ILUSTRAÇÕES: IA + P5.BRUSH", "mono", 23, WHITE, c("s27"))], 1640, pad=(30, 20))
BL = {b["id"]: b for b in B}

# ---- painted elements (p5.brush). layer "M" multiplies (umber panels, ink); layer "P" paints over (blue, gold strokes)
EL = []
for b in B:
    if not b["panel"]: continue
    s0 = SH[b["shots"][0]]; late = b["t0"] - s0["t0"] > 0.2
    EL.append({"id": "p_" + b["id"], "type": "panel" if b["panel"] == "umber" else "wash", "layer": "M" if b["panel"] == "umber" else "P",
               "shots": b["shots"], "rect": b["rect"], "color": UMBER if b["panel"] == "umber" else BLUE,
               "opacity": (150 if b["id"] == "b28" else 205) if b["panel"] == "umber" else 215,
               "t0": round(b["t0"] - 0.08, 3) if late else s0["t0"], "dur": 0.18 if late else 0.0, "t1": b["t1"]})


def stroke(eid, sid, pts, t0, dur, color=INK, brush="marker", weight=1.4, layer="P", t1=None):
    EL.append({"id": eid, "type": "stroke", "layer": layer, "shots": [sid], "brush": brush, "color": color, "weight": weight,
               "pts": [[round(x, 1), round(y, 1), p] for x, y, p in pts], "t0": round(t0, 3), "dur": dur, "t1": SH[sid]["t1"] if t1 is None else t1})


def underline(eid, bid, k, t0, dur=0.35, **kw):
    l = BL[bid]["lines"][k]; x, y, w = l["x"], l["y"] + l["size"] * 1.04, l["w"]
    stroke(eid, BL[bid]["shots"][0], [(x - 6, y + 2, 0.6), (x + w * 0.35, y + 9, 1.1), (x + w * 0.7, y + 3, 1.0), (x + w + 10, y + 7, 0.5)], t0, dur, **kw)


underline("u_hook", "b01", 2, wt(1, "vez") + 0.05, 0.3)
underline("u_apedrejar", "b06", 1, wt(3, "apedrejar") + 0.15, 0.3)
underline("u_chao", "b16", 2, wt(10, "no") + 0.1, 0.3)
underline("u_po", "b20", 1, wt(13, "no") + 0.12, 0.3)
underline("u_solta", "b26", 0, c("s26") + 0.12, 0.3, weight=1.8)
# s12: a hand-drawn ring around the furrows (John 8:6) and the thread that leaves it; s13: the thread arrives at Jeremiah
ring = [(422 + 345 * math.cos(a), 1452 + 158 * math.sin(a), 0.7 + 0.4 * math.sin(a * 1.3) ** 2) for a in [math.radians(-100 + 25 * i) for i in range(16)]]
stroke("ring", "s12", ring, c("s12") + 0.10, 0.45, color=UMBER, layer="M", brush="charcoal", weight=1.6)
py = BL["b12"]["rect"][1] + BL["b12"]["rect"][3]
stroke("th_a", "s12", [(250, 1330, 0.7), (150, 1180, 1.0), (110, 960, 1.1), (140, 760, 1.0), (250, 640, 0.9), (400, py + 14, 0.7)],
       wt(9, "mais") - 0.05, 0.5, color=UMBER, layer="M", brush="charcoal", weight=1.4)      # up the empty ground on the left
qy = BL["b13"]["rect"][1]
stroke("th_b", "s13", [(520, -30, 0.8), (470, 180, 1.0), (560, 420, 1.1), (640, 700, 1.0), (600, 960, 1.0), (540, qy - 14, 0.7)],
       c("s13"), 0.45, color=UMBER, layer="M", brush="charcoal", weight=1.4)
# drawn on the picture, as an editor would with charcoal: a ring around what the line is about, ticks where something lands
def ring_(eid, sid, cx, cy, rx, ry, t0, dur=0.3, start=-100, weight=1.5):
    pts = [(cx + rx * math.cos(a), cy + ry * math.sin(a), 0.7 + 0.4 * math.sin(a * 1.3) ** 2) for a in [math.radians(start + 25 * i) for i in range(16)]]
    stroke(eid, sid, pts, t0, dur, color=UMBER, layer="M", brush="charcoal", weight=weight)


def ticks(eid, sid, cx, cy, r0, r1, angles, t0, weight=1.6):
    for k, a in enumerate(angles):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        stroke(f"{eid}{k}", sid, [(cx + r0 * ca, cy + r0 * sa, 1.1), (cx + (r0 + r1) / 2 * ca + 6, cy + (r0 + r1) / 2 * sa - 4, 1.0), (cx + r1 * ca, cy + r1 * sa, 0.6)],
               t0 + 0.02 * k, 0.10, color=UMBER, layer="M", brush="charcoal", weight=weight)


ring_("r_phone", "c01", 432, 800, 330, 215, 0.42, 0.35)
ring_("r_finger", "s02", 705, 892, 270, 135, wt(2, "com") - 0.02, 0.28)
ring_("r_woman", "s04", 562, 735, 165, 165, wt(3, "mulher") - 0.02, 0.3)
ring_("r_stone1", "s08", 184, 1008, 100, 92, wt(6, "atire") - 0.04, 0.22, weight=1.3)
ring_("r_stone2", "s08", 778, 1114, 100, 92, wt(6, "atire") + 0.16, 0.22, weight=1.3)
for k, (a, b) in enumerate([((1050, 540), (720, 730)), ((830, 290), (570, 560)), ((1065, 930), (730, 890))]):      # fingers pointed at her
    stroke(f"ray{k}", "s09", [(a[0], a[1], 0.7), ((a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 - 6, 1.0), (b[0], b[1], 1.2)], c("s09") + 0.05 + 0.07 * k, 0.14,
           color=UMBER, layer="M", brush="charcoal", weight=1.5)
ticks("hit_s", "s10", 610, 880, 170, 250, [200, 235, 300, 335, 20, 60, 120, 160], tStone + 0.02)
ticks("hit_p", "s26", 454, 810, 350, 440, [15, 50, 90, 130, 165], tPhone + 0.02, weight=1.8)
# the water arrives: a blue wash runs down over the dust (layer "T" tints: the hue becomes the water's blue, the
# paper and the furrows stay visible), and clears over the first frames of the water
EL.append({"id": "w_wipe", "type": "wash", "layer": "T", "shots": ["s21"], "rect": [-60, -60, W + 120, H + 120], "color": WATER, "opacity": 235,
           "dir": "down", "t0": round(c("s22") - 0.30, 3), "dur": 0.30, "t1": c("s22")})
EL.append({"id": "w_wipe2", "type": "wash", "layer": "T", "shots": ["s22"], "rect": [-60, -60, W + 120, H + 120], "color": WATER, "opacity": 235,
           "same_as": "w_wipe", "fade": 0.35, "t0": c("s22"), "dur": 0.0, "t1": round(c("s22") + 0.35, 3)})
ay = BL["b27"]["rect"][1] + BL["b27"]["rect"][3]; ta = round(LN[17]["t1"] + 0.10, 3)
kw = dict(color=UMBER, layer="M", brush="charcoal", weight=2.2)
stroke("arrow", "s27", [(540, ay + 40, 0.8), (528, ay + 130, 1.1), (550, ay + 230, 1.1), (540, ay + 330, 1.0)], ta, 0.3, **kw)
stroke("arrow_l", "s27", [(468, ay + 236, 0.9), (502, ay + 286, 1.0), (540, ay + 336, 1.1)], ta + 0.28, 0.14, **kw)
stroke("arrow_r", "s27", [(614, ay + 232, 0.9), (578, ay + 284, 1.0), (540, ay + 336, 1.1)], ta + 0.40, 0.14, **kw)
for e in EL:
    assert SH[e["shots"][0]]["t0"] - 1e-6 <= e["t0"] and e["t1"] <= SH[e["shots"][-1]]["t1"] + 1e-6, e["id"]

# ---- effects per shot (compose.py). Times are film times; x, y are screen pixels.
#   shake [t, px]  punch [t, zoom]  flash [t, strength]  zin / zout: frames of zoom-through at the head / tail of the shot
#   dust: density of motes in the light  burst [t, x, y, n]: dust thrown by an impact  leak [t, dur]: a sweep of light
#   glints: sparks on the blue  glow [t0, x, y, radius, strength]: light that opens (the verdict; God only as light)
#   rot [deg0, deg1]: the paper turns a little under the camera (key art only)
FX = {s["id"]: {"dust": 0.6} for s in shots}
def fx(sid, **kw): FX[sid].update(kw)
fx("c01", punch=[[0.0, 0.05]], zout=3)
fx("s01", zin=5, leak=[c("s01"), 0.7], shake=[[c("s01") + 0.04, 10], [wt(1, "uma") + 0.04, 14]], flash=[[c("s01"), 0.35]])
fx("s02", zin=2, punch=[[c("s02"), 0.04]])
fx("s04", zin=3)
fx("s05", shake=[[c("s05") + 0.04, 20]], flash=[[c("s05"), 0.22]], punch=[[c("s05"), 0.05]], rot=[-0.5, 0.4])
fx("s06", shake=[[wt(3, "apedrejar") + 0.03, 24]], flash=[[wt(3, "apedrejar"), 0.18]], punch=[[wt(3, "apedrejar"), 0.06]])
fx("s09", punch=[[c("s09"), 0.05]], rot=[0.5, -0.4], zout=2)
fx("s10", shake=[[tStone, 30]], flash=[[tStone, 0.30]], burst=[[tStone, 610, 890, 60]], punch=[[tStone, 0.05]])
fx("s12", zin=3, dust=0.4)
fx("s13", zin=5, leak=[c("s13"), 0.6], shake=[[c("s13") + 0.04, 12]], flash=[[c("s13"), 0.25]], rot=[-0.6, 0.3])
fx("s14", punch=[[c("s14"), 0.06]], shake=[[c("s14") + 0.04, 10]], rot=[0.3, -0.5])
fx("s16", punch=[[wt(10, "no"), 0.04]], rot=[-0.4, 0.4])
fx("s17", rot=[0.5, -0.5], zout=3)
fx("s18", zin=4, dust=0.0, glints=1.0, flash=[[c("s18"), 0.30]])
fx("s20", punch=[[wt(13, "no"), 0.04]], shake=[[wt(13, "no") + 0.04, 10]])
fx("s21", rot=[-0.3, 0.5], dust=0.3)
fx("s22", dust=0.0, glints=1.0, shake=[[wt(13, "apaga") + 0.03, 18]], punch=[[wt(13, "apaga"), 0.05]], flash=[[c("s22"), 0.25]])
fx("s23", glow=[c("s23"), 470, 900, 760, 0.42], dust=0.8)
fx("s24", glow=[c("s23"), 470, 880, 900, 0.42], dust=0.8, zout=3)
fx("s25", zin=4)
fx("s26", shake=[[tPhone, 30]], flash=[[tPhone, 0.30]], burst=[[tPhone, 470, 840, 60]], punch=[[tPhone, 0.06]])
fx("s27", zin=3, leak=[c("s27"), 0.7])
for s in shots: s["fx"] = FX[s["id"]]
# the rewind: stations of the film, last to first (shot, seconds into it); compose.py scrubs through them
REWIND = [("c01", 0.9), ("s24", 1.2), ("s22", 0.9), ("s17", 0.6), ("s14", 0.6), ("s10", 0.55), ("s06", 0.5), ("s04", 0.9), ("s03", 0.8), ("s01", 0.0)]

plan = {"W": W, "H": H, "fps": FPS, "dur": DUR, "rewind": REWIND, "frames": round(DUR * FPS), "shots": shots, "blocks": B, "elements": EL,
        "colors": {"white": WHITE, "gold": GOLD, "sky": SKY, "umber": UMBER, "sepia": SEPIA, "blue": BLUE, "ink": INK},
        "faces": {k: {"file": v[0], "wght": v[1]} for k, v in FACE.items()},
        "numbers": {"john_8_6_partners": P86, "votes_jo86_jr1713": V1},
        # what is seen landing, for the sound (score.py): film times
        "cues": {"stone": tStone, "phone": tPhone, "rewind": [RW0, RW1]},
        # rule of the series: the mark "ILUSTRAÇÃO" on every illustrated scene (here, the whole film), top right as in videos 5 and 6
        "tag": {"text": "ILUSTRAÇÃO", "right": 1010, "y": 92, "size": 22, "file": "SpaceMono-Bold.ttf", "color": "#FFF8EC", "opacity": 0.8}}
json.dump(plan, open(WORK / "plan.json", "w"), ensure_ascii=False, indent=1)
if __name__ == "__main__":
    print(f"{len(shots)} shots, {len(B)} text blocks, {len(EL)} painted elements, {plan['frames']} frames ({DUR} s), "
          f"mean shot {DUR / len(shots):.2f} s, longest {max(s['t1'] - s['t0'] for s in shots):.2f} s")
    for s in shots:
        bs = " | ".join(" / ".join(l["text"] for l in b["lines"]) for b in B if s["id"] in b["shots"])
        print(f"  {s['id']:4s} {s['t0']:6.2f}-{s['t1']:6.2f} ({s['frames']:3d} f) {s['src']:5s} in {s['in']:<5} {bs}")
