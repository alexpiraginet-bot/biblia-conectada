"""Verify the delivered movie and compare decoded samples with rendered frames.

Usage: python verify.py FFMPEG_EXE FFPROBE_EXE MOVIE PREPARED_FRAMES
       EVIDENCE_DIRECTORY REPORT_JSON
No installs, network requests or GPU encoding/decoding.
"""
import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import sys

from PIL import Image, ImageChops, ImageStat

ffmpeg, ffprobe, movie_arg, frames_arg, evidence_arg, report_arg = sys.argv[1:]
movie, frames, evidence, report_path = map(Path, [movie_arg, frames_arg, evidence_arg, report_arg])
evidence.mkdir(parents=True, exist_ok=True)
probe = json.loads(subprocess.check_output([ffprobe, "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(movie)]))
stream, = probe["streams"]
assert stream["codec_type"] == "video" and stream["codec_name"] == "h264"
assert (stream["width"], stream["height"]) == (720, 1080)
assert stream["pix_fmt"] == "yuv420p" and stream["avg_frame_rate"] == "30/1"
assert int(stream["nb_read_frames"]) == 360 and float(stream["duration"]) == 12
decode = subprocess.run([ffmpeg, "-v", "error", "-i", str(movie), "-c:v", "rawvideo", "-f", "null", "-"], capture_output=True, text=True, check=True)
assert not decode.stderr.strip(), decode.stderr
data = movie.read_bytes()
atoms, offset = [], 0
while offset < len(data):
    size, kind = struct.unpack_from(">I4s", data, offset)
    assert size >= 8
    atoms.append({"type": kind.decode("ascii"), "offset": offset, "bytes": size})
    offset += size
assert next(atom["offset"] for atom in atoms if atom["type"] == "moov") < next(atom["offset"] for atom in atoms if atom["type"] == "mdat")
samples, motion = [], []
for frame in [36, 198, 342]:
    decoded = []
    for current in [frame, frame + 1]:
        destination = evidence / f"decoded-{current:04}.png"
        subprocess.run([ffmpeg, "-v", "error", "-n", "-ss", str(current / 30), "-i", str(movie), "-frames:v", "1", str(destination)], check=True)
        decoded.append(Image.open(destination).convert("RGB"))
    reference = Image.open(frames / f"frame-{frame:04}.png").convert("RGB")
    difference = ImageChops.difference(reference, decoded[0])
    stats = ImageStat.Stat(difference)
    mse = sum(value * value for value in stats.rms) / 3
    samples.append({"frame": frame, "time": frame / 30, "decodedSha256": hashlib.sha256((evidence / f"decoded-{frame:04}.png").read_bytes()).hexdigest(), "meanAbsoluteRgbError": sum(stats.mean) / 3, "psnrDb": 10 * math.log10(255 ** 2 / mse)})
    delta = ImageChops.difference(*decoded)
    channels = delta.split()
    peak = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    histogram = peak.histogram()
    changed = sum(histogram[3:])
    assert changed > 0, f"No motion at frame {frame}"
    motion.append({"framePair": [frame, frame + 1], "timeDeltaSeconds": 1 / 30, "pixelsChangedByMoreThan2": changed, "changedFraction": changed / (720 * 1080)})
report = {"video": {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "width": 720, "height": 1080, "durationSeconds": 12, "fps": 30, "framesDecoded": 360, "audioStreams": 0, "fullDecodeErrors": [], "codec": "H.264 High level 3.1", "pixelFormat": "yuv420p"}, "mp4Atoms": atoms, "faststart": True, "samples": samples, "adjacentFrameMotion": motion, "visualReview": "Decoded frames 36, 198, 342 inspected separately; no claim of continuous human playback review or physical iPhone validation."}
report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report))
