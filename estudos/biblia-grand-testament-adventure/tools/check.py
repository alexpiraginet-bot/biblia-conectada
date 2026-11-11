#!/usr/bin/env python3
"""Every passage of "Grand Testament Adventure" against the open data, and data/passagens.json for the HUD.

1. Each passage exists in the BLIVRE (every verse of the range).
2. The line the HUD shows (fala) and the place name (lugar) are literal BLIVRE fragments of the verses they cite.
3. Each geo is a place of OpenBible Geocoding with coordinates.
4. Ids are unique and every passage belongs to one of the four Gospels.

Text: BLIVRE, CC BY 4.0 BR (fontes/blivre). Places: OpenBible.info Bible Geocoding Data, CC BY 4.0 (fontes/openbible-geo).

  python3 -I tools/check.py   -> data/passagens.json
"""
import json, re, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT))
from passagens import PASSAGENS, EVANGELHOS, NOMES  # noqa: E402
from episodios import EPISODIOS  # noqa: E402

VPL = {"Matt": "MAT", "Mark": "MAR", "Luke": "LUK", "John": "JOH"}
ABBR = {"Matt": "Mt", "Mark": "Mc", "Luke": "Lc", "John": "Jo"}
plain = lambda s: re.sub(r"\s+", " ", s.replace("[", "").replace("]", "")).replace(" ,", ",").replace(" .", ".").strip()
ok = True
NUMEROS = {"dois": 2, "duas": 2, "três": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "dez": 10, "doze": 12}


def need(cond, msg):
    global ok
    if not cond: print("FAIL " + msg)
    ok &= bool(cond)


t = zipfile.ZipFile(REPO / "fontes/blivre/porbr2018_vpl.zip").read("porbr2018_vpl.txt").decode("utf-8")
RAW = {}
for line in t.splitlines():
    m = re.match(r"^(\w+) (\d+):(\d+) (.*)$", line)
    if m: RAW[(m[1], int(m[2]), int(m[3]))] = m[4]
assert len(RAW) == 31102, len(RAW)


def bl(o):
    bk, c, v = o.split("."); return plain(RAW[(VPL[bk], int(c), int(v))])


ANC = {}
for line in open(REPO / "fontes/openbible-geo/ancient.jsonl", encoding="utf-8"):
    j = json.loads(line); ANC[j["id"]] = j
MOD = {}
for line in open(REPO / "fontes/openbible-geo/modern.jsonl", encoding="utf-8"):
    j = json.loads(line); MOD[j["id"]] = j
BYNAME = {a["friendly_id"]: a for a in ANC.values()}


def lonlat(friendly):
    """Best identification of an ancient place -> (lon, lat, name of the modern identification)."""
    a = BYNAME[friendly]
    for _ in range(4):
        first = a["identifications"][0]
        if first["id"] in MOD:
            lon, lat = (float(x) for x in MOD[first["id"]]["lonlat"].split(","))
            return lon, lat, MOD[first["id"]]["friendly_id"]
        a = ANC[first["id"]]
    raise KeyError(friendly)


out, ids = [], set()
for p in PASSAGENS:
    bk, c, vs = p["ref"].split("."); a, _, b = vs.partition("-"); a, b = int(a), int(b or a)
    need(bk in EVANGELHOS, f"{p['id']}: {bk} is a Gospel")
    need(p["id"] not in ids, f"{p['id']}: unique id"); ids.add(p["id"])
    need(all((VPL[bk], int(c), v) in RAW for v in range(a, b + 1)), f"{p['id']}: {p['ref']} exists in the BLIVRE")
    for key in ("fala", "lugar"):
        o, frag = p[key]
        need(frag in bl(o), f"{p['id']}: {key} “{frag}” is literal BLIVRE {o}  |  {bl(o)[:160]}")
    geo = None
    if p["geo"]:
        need(p["geo"] in BYNAME, f"{p['id']}: geo {p['geo']} is in OpenBible Geocoding")
        if p["geo"] in BYNAME:
            lon, lat, modern = lonlat(p["geo"])
            need(29.0 < lat < 34.0 and 34.0 < lon < 36.5, f"{p['id']}: {p['geo']} is in the land ({lon}, {lat})")
            geo = {"id": p["geo"], "lon": lon, "lat": lat, "moderno": modern, "nota": p.get("geo_nota")}
    ref_pt = f"{EVANGELHOS[bk]} {c}:{a}" + (f"–{b}" if b != a else "")
    fo = p["fala"][0].split("."); lo = p["lugar"][0].split(".")
    out.append({"id": p["id"], "evangelho": EVANGELHOS[bk], "ref": p["ref"], "ref_pt": ref_pt, "titulo": p["titulo"],
                "fala": p["fala"][1], "fala_ref": f"{EVANGELHOS[fo[0]]} {fo[1]}:{fo[2]}",
                "lugar": p["lugar"][1], "lugar_ref": f"{ABBR[lo[0]]} {lo[1]}:{lo[2]}", "geo": geo, "feito": p.get("feito")})

lugares = []
for fid, (o, nome, kind) in NOMES.items():
    need(fid in BYNAME, f"minimap: {fid} is in OpenBible Geocoding")
    need(nome in bl(o), f"minimap: “{nome}” is literal BLIVRE {o}  |  {bl(o)[:120]}")
    if fid in BYNAME:
        lon, lat, _ = lonlat(fid); lugares.append({"id": fid, "nome": nome, "ref": o, "tipo": kind, "lon": lon, "lat": lat})
eps = {}
for eid, e in EPISODIOS.items():
    need(eid in ids, f"episode {eid}: is a passage")
    ms = []
    for k, mi in enumerate(e["missoes"]):
        fala = None
        if mi["fala"]:
            o, frag = mi["fala"]; need(frag in bl(o), f"episode {eid}, mission {k + 1}: “{frag}” is literal BLIVRE {o}  |  {bl(o)[:160]}")
            fo = o.split("."); fala = {"texto": frag, "ref": f"{EVANGELHOS[fo[0]]} {fo[1]}:{fo[2]}"}
        ms.append({"take": mi["take"], "objetivo": mi["objetivo"], "fala": fala, "rumo": mi["rumo"], "acao": mi.get("acao"), "vel": mi.get("vel", 1),
                   "conta": mi.get("conta", 0), "seguidores": mi.get("seguidores", 0), "fala_de": mi.get("fala_de"), "fala_ate": mi.get("fala_ate"), "da_margem": bool(mi.get("da_margem")),
                   "ritmo": [list(x) for x in mi["ritmo"]] if isinstance(mi.get("ritmo"), (list, tuple)) else mi.get("ritmo")})
        r = ms[-1]["ritmo"]; speeds = [x[1] for x in r] if isinstance(r, list) else [r] if r else []
        need(all(0.8 <= v <= 2.0 for v in speeds), f"episode {eid}, mission {k + 1}: paces between 0.8x and 2x")
        need(not isinstance(r, list) or (r[-1][0] is None and all(isinstance(x[0], (int, float)) or re.fullmatch(r"corte\d?", x[0]) for x in r[:-1])),
             f"episode {eid}, mission {k + 1}: a pace list is (second or cut, speed)... and ends with (None, speed)")
        for key in ("fala_de", "fala_ate"):
            need(mi.get(key) is None or isinstance(mi[key], (int, float)) or re.fullmatch(r"corte\d?", mi[key]), f"episode {eid}, mission {k + 1}: {key} is a second, 'corte' or 'corte2'")
        need(k == 0 or not mi.get("da_margem"), f"episode {eid}, mission {k + 1}: only the first mission starts on the shore")
    cnt = None
    if e.get("contador"):
        prova = e["contador"]["prova"]
        for o, frag in prova: need(frag in bl(o), f"episode {eid}: counter proof “{frag}” is literal BLIVRE {o}")
        words = [w for w in NUMEROS if len(prova) == 1 and re.search(rf"\b{w}\b", prova[0][1])]
        total = NUMEROS[words[0]] if words else len(prova)                     # a number word in the verse, or the names it lists
        need(len(prova) > 1 or words, f"episode {eid}: the counter's number comes from the verse")
        need(all(m["conta"] <= total for m in ms) and ms[-1]["conta"] == total, f"episode {eid}: the counter ends at {total}")
        cnt = {"rotulo": e["contador"]["rotulo"], "total": total}
    resumo = None
    if e.get("resumo"):
        resumo = e["resumo"].format(total=cnt["total"] if cnt else "", **{f"fala{i + 1}": (m["fala"]["texto"] if m["fala"] else "") for i, m in enumerate(ms)})
        need(not re.search(r"\d", re.sub(r"\{[^}]*\}", "", e["resumo"])), f"episode {eid}: the caption's numbers come from the data, not typed")
    eps[eid] = {"raio_km": e["raio_km"], "ritmo": e.get("ritmo", 1.0), "contador": cnt, "missoes": ms, "resumo": resumo, "pergunta": e.get("pergunta"), "fim": e.get("fim", 2.6), "pausa": e.get("pausa", 0.0)}
by = {}
for o in out: by.setdefault(o["evangelho"], []).append(o["id"])
if ok:
    (ROOT / "data").mkdir(exist_ok=True)
    json.dump({"fonte_texto": "Bíblia Livre (BLIVRE), CC BY 4.0 BR", "fonte_lugares": "OpenBible.info Bible Geocoding Data, CC BY 4.0",
               "passagens": out, "lugares": lugares, "episodios": eps}, open(ROOT / "data/passagens.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(out)} passagens ({sum(1 for o in out if o['feito'])} já feita antes): " + ", ".join(f"{k} {len(v)}" for k, v in by.items()) + f" | com ponto no mapa: {sum(1 for o in out if o['geo'])}")
print("ALL OK" if ok else "SOME CHECKS FAILED")
sys.exit(0 if ok else 1)
