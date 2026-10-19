#!/usr/bin/env python3
"""Natural Earth 10m coastline (public domain) clipped to the film region -> data/coast.npz (lon/lat polylines).
  python3 -I tools/coast.py data/ne_10m_coastline.geojson"""
import json, sys
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
g = json.load(open(sys.argv[1]))
lon0, lat0, lon1, lat1 = 28.8, 28.3, 37.3, 34.3
lines = []
for f in g["features"]:
    geo = f["geometry"]
    parts = [geo["coordinates"]] if geo["type"] == "LineString" else geo["coordinates"] if geo["type"] == "MultiLineString" else []
    for ln in parts:
        a = np.asarray(ln, float)
        inside = (a[:, 0] > lon0) & (a[:, 0] < lon1) & (a[:, 1] > lat0) & (a[:, 1] < lat1)
        if not inside.any(): continue
        # keep contiguous inside runs
        idx = np.where(inside)[0]
        runs = np.split(idx, np.where(np.diff(idx) > 1)[0] + 1)
        for r in runs:
            if len(r) > 3: lines.append(a[r])
np.savez_compressed(ROOT / "data/coast.npz", *lines)
print(len(lines), "coast polylines,", sum(len(l) for l in lines), "points")
