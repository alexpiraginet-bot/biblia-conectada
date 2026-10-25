"""Crop only black padding, then resize the supplied animation for the web.

Usage: python prepare.py FRAMES_DIRECTORY OUTPUT_DIRECTORY ASSET_DIRECTORY
       --crop LEFT TOP WIDTH HEIGHT --size WIDTH HEIGHT
Requires already-installed Pillow; never installs a dependency.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, __version__ as pillow_version

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("frames", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("assets", type=Path)
parser.add_argument("--crop", type=int, nargs=4, required=True)
parser.add_argument("--size", type=int, nargs=2, required=True)
args = parser.parse_args()
files = sorted(args.frames.glob("frame-*.png"))
if len(files) != 360:
    raise ValueError(f"Expected 360 frames, received {len(files)}")
left, top, width, height = args.crop
crop = (left, top, left + width, top + height)
size = tuple(args.size)
if width * size[1] != height * size[0]:
    raise ValueError("Resize must preserve the cropped aspect ratio")
args.output.mkdir(parents=True, exist_ok=True)
args.assets.mkdir(parents=True, exist_ok=True)
union = [1080, 1920, 0, 0]
frames = []
posters = {36: "poster.webp", 198: "portal.webp", 342: "network.webp"}
for index, filename in enumerate(files):
    with Image.open(filename) as source:
        image = source.convert("RGB")
        if image.size != (1080, 1920):
            raise ValueError(f"Unexpected dimensions: {filename}")
        bounds = image.getbbox()
        if bounds:
            union = [min(union[0], bounds[0]), min(union[1], bounds[1]), max(union[2], bounds[2]), max(union[3], bounds[3])]
            if bounds[0] < crop[0] or bounds[1] < crop[1] or bounds[2] > crop[2] or bounds[3] > crop[3]:
                raise ValueError(f"Crop would remove non-black pixels: {filename.name}: {bounds}")
        resized = image.crop(crop).resize(size, Image.Resampling.LANCZOS)
        destination = args.output / filename.name
        resized.save(destination, compress_level=4)
        if index in posters:
            resized.save(args.assets / posters[index], "WEBP", quality=90, method=6)
        frames.append({"frame": index, "bounds": bounds, "sourceSha256": hashlib.sha256(filename.read_bytes()).hexdigest()})
    if index % 30 == 0 or index == 359:
        print(json.dumps({"prepared": index + 1, "total": 360}), flush=True)
report = {
    "pillow": pillow_version,
    "sourceSize": [1080, 1920],
    "crop": args.crop,
    "outputSize": args.size,
    "contentUnionExactNonBlack": union,
    "removedNonBlackPixels": 0,
    "resize": "Lanczos, unchanged aspect ratio",
    "frames": frames,
}
(args.output / "prepare-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
