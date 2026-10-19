#!/usr/bin/env python3
"""Place coordinates from the OpenBible.info Bible Geocoding KMLs (CC BY 4.0) + great-circle distances.
  python3 -I tools/places.py data/ob-matt.kml data/ob-luke.kml ...  ->  data/places.json"""
import json, math, sys, re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NS = {"k": "http://www.opengis.net/kml/2.2"}
WANT = ["Bethlehem", "Nazareth", "Jerusalem", "Egypt", "Ramah", "Galilee", "Judea", "Ephrathah", "Jordan River", "Sea of Galilee",
        "Dead Sea", "Mediterranean Sea", "Nile River"]
found = {}
for p in sys.argv[1:]:
    root = ET.parse(p).getroot()
    for pm in root.iter("{http://www.opengis.net/kml/2.2}Placemark"):
        nm = (pm.findtext("k:name", default="", namespaces=NS) or "").strip()
        desc = (pm.findtext("k:description", default="", namespaces=NS) or "")
        pt = pm.find(".//k:Point/k:coordinates", NS)
        style = (pm.findtext("k:styleUrl", default="", namespaces=NS) or "")
        if pt is None: continue
        lon, lat = [float(x) for x in pt.text.strip().split(",")[:2]]
        found.setdefault(nm, []).append({"lat": lat, "lon": lon, "file": Path(p).name, "style": style,
                                         "desc": re.sub(r"<[^>]+>", " ", desc)[:400]})
out = {}
for w in WANT:
    hits = [k for k in found if k == w or k.startswith(w + " ")]
    for k in hits:
        uniq = {(round(h["lat"], 5), round(h["lon"], 5), h["style"]) for h in found[k]}
        out[k] = [{"lat": a, "lon": b, "style": s} for a, b, s in sorted(uniq)]
        out[k + "__desc"] = found[k][0]["desc"]


def hav(a, b):
    R = 6371.0088
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


ALIAS = {"Bethlehem 1": "Bethlehem", "Ramah 1 / Al Ram": "Ramah", "Galilee 1": "Galilee"}  # Ramah: er-Ram, the usual identification
pts = {ALIAS.get(k, k): (v[0]["lat"], v[0]["lon"]) for k, v in out.items() if not k.endswith("__desc") and v}
out["_points"] = {k: pts[k] for k in ("Nazareth", "Bethlehem", "Jerusalem", "Ramah", "Egypt", "Sea of Galilee") if k in pts}
d = {}
for a, b in [("Nazareth", "Bethlehem"), ("Bethlehem", "Jerusalem"), ("Ramah", "Bethlehem"), ("Bethlehem", "Egypt"),
             ("Egypt", "Nazareth"), ("Nazareth", "Jerusalem")]:
    if a in pts and b in pts: d[f"{a}-{b}"] = round(hav(pts[a], pts[b]), 2)
out["_distances_km"] = d
(ROOT / "data/places.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(json.dumps({k: out[k] for k in ("_points", "_distances_km")}, ensure_ascii=False, indent=1))
print("names containing Rama/Egypt/Beth:", sorted(k for k in found if re.search(r"Rama|Egypt|Bethle|Nazar|Ephrat", k)))
