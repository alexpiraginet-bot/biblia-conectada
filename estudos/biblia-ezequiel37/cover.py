#!/usr/bin/env python3
"""Cover of "Cada osso a seu osso": a frame of the film in the middle of the assembly (the letters flying into the verse),
with the question on top. Rendered by Remotion through a prop (motion/src/Cover.tsx), so it is the same material.
  python3 cover.py  -> renders/capa-cada-osso-a-seu-osso.jpg
"""
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
subprocess.run(["node", "render.mjs", "--cover"], cwd=ROOT / "motion", check=True, capture_output=True)
Image.open(ROOT / "renders/.stills/cover.png").convert("RGB").save(ROOT / "renders/capa-cada-osso-a-seu-osso.jpg", quality=92)
print("cover ok")
