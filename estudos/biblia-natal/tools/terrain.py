#!/usr/bin/env python3
"""Download AWS Terrain Tiles (terrarium PNG; SRTM/GMTED2010 via USGS, ETOPO1 via NOAA; Mapzen) for a bbox and zoom and
mosaic them into a float32 height grid in Web-Mercator pixel space.
  python3 tools/terrain.py NAME Z LON0 LAT0 LON1 LAT1   ->  data/terrain/NAME.npz (h [m], z, px0, py0 = mercator px of [0,0])"""
import math, subprocess, sys
from pathlib import Path
import numpy as np, cv2

ROOT = Path(__file__).resolve().parent.parent
TILES = ROOT / "data/terrain/tiles"
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def merc_px(lon, lat, z):
    n = 256 * 2 ** z
    x = (lon + 180) / 360 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


def main(name, z, lon0, lat0, lon1, lat1):
    z = int(z); lon0, lat0, lon1, lat1 = map(float, (lon0, lat0, lon1, lat1))
    x0, y1 = merc_px(lon0, lat0, z); x1, y0 = merc_px(lon1, lat1, z)
    tx0, tx1, ty0, ty1 = int(x0 // 256), int(x1 // 256), int(y0 // 256), int(y1 // 256)
    jobs = []
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            p = TILES / f"{z}/{tx}_{ty}.png"
            if not p.exists() or p.stat().st_size < 100:
                p.parent.mkdir(parents=True, exist_ok=True)
                jobs.append((URL.format(z=z, x=tx, y=ty), p))
    print(f"{name}: z{z} tiles x{tx0}-{tx1} y{ty0}-{ty1} = {(tx1 - tx0 + 1) * (ty1 - ty0 + 1)}; to fetch {len(jobs)}")
    for k in range(0, len(jobs), 8):
        procs = [subprocess.Popen(["curl", "-sS", "--max-time", "60", "--retry", "3", "-o", str(p), u]) for u, p in jobs[k:k + 8]]
        for pr in procs: pr.wait()
    H = np.zeros(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), np.float32)
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            im = cv2.imread(str(TILES / f"{z}/{tx}_{ty}.png"), cv2.IMREAD_UNCHANGED)
            assert im is not None and im.shape[:2] == (256, 256), (tx, ty)
            b, g, r = [im[..., i].astype(np.float32) for i in range(3)]
            H[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = r * 256 + g + b / 256 - 32768
    np.savez_compressed(ROOT / f"data/terrain/{name}.npz", h=H, z=z, px0=tx0 * 256, py0=ty0 * 256)
    print(f"  grid {H.shape}, h min {H.min():.0f} max {H.max():.0f} m")


if __name__ == "__main__":
    main(*sys.argv[1:])
