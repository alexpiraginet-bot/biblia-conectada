#!/usr/bin/env python3
"""Rasterize Natural Earth (public domain) land, lakes and rivers onto each terrain grid.
  python3 -I tools/masks.py data/ne_10m_land.geojson data/ne_10m_lakes.geojson data/ne_10m_rivers_lake_centerlines.geojson
  -> data/terrain/<name>_mask.npz  (m: uint8 HxWx3 = land, lake, river; names of lakes/rivers drawn printed)"""
import json, math, sys
from pathlib import Path
import numpy as np, cv2

ROOT = Path(__file__).resolve().parent.parent
LAND, LAKES, RIVERS = sys.argv[1:4]
GRIDS = ["wide", "corridor", "judea12", "nazare12", "ultra"]
# 20th-century reservoirs: not on a map of the first century
MODERN = {"Ataturk Barajt", "Buhayrat al-Assad", "Buhayrat ath Tharthar", "Keban Baraji", "Lake Nasser", "Mingevir Reservoir",
          "Saksak Dagi", "Lake Habbaniyah", "Lake Razazah"}


def to_px(coords, z, px0, py0):
    a = np.asarray(coords, np.float64)
    n = 256 * 2 ** z
    x = (a[:, 0] + 180) / 360 * n - px0
    s = np.sin(np.radians(np.clip(a[:, 1], -85, 85)))
    y = (0.5 - np.log((1 + s) / (1 - s)) / (4 * math.pi)) * n - py0
    return np.stack([x, y], 1)


def rings(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon": return [c]
    if t == "MultiPolygon": return c
    return []


def lines(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "LineString": return [c]
    if t == "MultiLineString": return c
    return []


def bbox_hit(coords, lon0, lat0, lon1, lat1):
    a = np.asarray(coords)
    return not (a[:, 0].max() < lon0 or a[:, 0].min() > lon1 or a[:, 1].max() < lat0 or a[:, 1].min() > lat1)


land = json.load(open(LAND)); lakes = json.load(open(LAKES)); rivers = json.load(open(RIVERS))
for g in GRIDS:
    d = np.load(ROOT / f"data/terrain/{g}.npz")
    H = d["h"]; z = int(d["z"]); px0, py0 = int(d["px0"]), int(d["py0"])
    h, w = H.shape
    n = 256 * 2 ** z
    lon0 = px0 / n * 360 - 180; lon1 = (px0 + w) / n * 360 - 180
    lat1 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py0 / n))))
    lat0 = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (py0 + h) / n))))
    M = [np.zeros((h, w), np.uint8) for _ in range(3)]  # land, lake, river (contiguous for cv2)
    SH = 4
    for f in land["features"]:
        for poly in rings(f["geometry"]):
            if not bbox_hit(poly[0], lon0, lat0, lon1, lat1): continue
            for k, ring in enumerate(poly):
                p = np.round(to_px(ring, z, px0, py0) * (1 << SH)).astype(np.int32)
                cv2.fillPoly(M[0], [p], 255 if k == 0 else 0, lineType=cv2.LINE_AA, shift=SH)
    names = set()
    for f in lakes["features"]:
        if (f["properties"].get("name") or "?") in MODERN: continue
        for poly in rings(f["geometry"]):
            if not bbox_hit(poly[0], lon0, lat0, lon1, lat1): continue
            names.add(f["properties"].get("name") or "?")
            for k, ring in enumerate(poly):
                p = np.round(to_px(ring, z, px0, py0) * (1 << SH)).astype(np.int32)
                cv2.fillPoly(M[1], [p], 255 if k == 0 else 0, lineType=cv2.LINE_AA, shift=SH)
    rnames = set()
    for f in rivers["features"]:
        pr = f["properties"]
        if pr.get("name") not in ("Nile", "Damietta Branch", "Rosetta Branch", "Jordan"): continue  # no modern canals
        for ln in lines(f["geometry"]):
            if len(ln) < 2 or not bbox_hit(ln, lon0, lat0, lon1, lat1): continue
            rnames.add(f"{pr.get('name')}({pr.get('scalerank')},{pr.get('featurecla')})")
            p = np.round(to_px(ln, z, px0, py0) * (1 << SH)).astype(np.int32)
            th = {7: 1, 9: 2, 11: 2, 12: 2}.get(z, 1)
            cv2.polylines(M[2], [p], False, 255, thickness=th, lineType=cv2.LINE_AA, shift=SH)
    M = np.dstack(M)
    np.savez_compressed(ROOT / f"data/terrain/{g}_mask.npz", m=M)
    print(g, (h, w), f"lon {lon0:.3f}..{lon1:.3f} lat {lat0:.3f}..{lat1:.3f}", "land%", round(M[..., 0].mean() / 2.55, 1),
          "lakes:", sorted(names), "rivers:", sorted(rnames)[:12])
