#!/usr/bin/env bash
# Subsets the OFL font the site shares with the videos (estudos/*/assets/fonts) to Latin and converts them to WOFF2 for the web.
# Not part of `npm run build`: the outputs in src/fonts/ are committed. Re-run only when a font or the range changes.
#   requirements: python3 with fonttools 4.60.1 + brotli 1.1.0 (e.g. `uv pip install fonttools==4.60.1 brotli==1.1.0`)
#   usage: PYTHON=/path/to/python scripts/subset-fonts.sh
set -euo pipefail
SITE=$(cd "$(dirname "$0")/.." && pwd)
SRC="$SITE/../estudos/biblia-referencias/assets/fonts"
OUT="$SITE/src/fonts"
PY=${PYTHON:-python3}
# Google Fonts "latin" range plus the combining accents of Portuguese (in case a text arrives in NFD): covers every
# letter and the punctuation found in the BLIVRE text (´ – ‘ ’ “ ”).
# U+2190-2195: arrows, including ↔ for "João 1 ↔ Gênesis 1" (only Space Grotesk has it among the site's fonts).
RANGE="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0307-0308,U+0327,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2195,U+2212,U+2215,U+FEFF,U+FFFD"
mkdir -p "$OUT"
# Of the videos' fonts the site uses Space Grotesk only (design/README.md §4, v4): Space Mono and Cormorant stay in
# the videos.
for f in SpaceGrotesk-VF; do
  "$PY" -m fontTools.subset "$SRC/$f.ttf" --unicodes="$RANGE" --layout-features='*' --name-IDs='*' --name-languages='*' \
    --flavor=woff2 --output-file="$OUT/$f.woff2"
done
cp "$SRC/OFL-SpaceGrotesk.txt" "$OUT/"
# Newsreader (titles, design/README.md §4) is not from the videos either: the latin opsz file of
# @fontsource-variable/newsreader 5.3.0 (files/newsreader-latin-opsz-normal.woff2,
# SHA-256 6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101), pinned to one static instance:
# optical size 72 and weight 440 (the width jumps between opsz 16 and 18, so it is never left on auto).
TMP=$(mktemp -d)
(cd "$TMP" && npm pack --silent @fontsource-variable/newsreader@5.3.0 >/dev/null && tar xzf ./*.tgz)
NR="$TMP/package/files/newsreader-latin-opsz-normal.woff2"
echo "6e4f2958c3a7c4a80acde4e5a679abe7e01bc1e30b92be3c7a8b696ef401d101  $NR" | sha256sum -c -
"$PY" -m fontTools.varLib.instancer "$NR" opsz=72 wght=440 -o "$TMP/newsreader-display.ttf"
"$PY" -m fontTools.subset "$TMP/newsreader-display.ttf" --unicodes="$RANGE" --layout-features='*' --name-IDs='*' \
  --name-languages='*' --flavor=woff2 --output-file="$OUT/Newsreader-Display.woff2"
cp "$TMP/package/LICENSE" "$OUT/OFL-Newsreader.txt"
rm -rf "$TMP"
# Literata (Bible text) is not from the videos: src/fonts/Literata-wght-latin.woff2 is the latin wght file of
# @fontsource-variable/literata 5.3.0 (files/literata-latin-wght-normal.woff2, already subset by Fontsource),
# SHA-256 9adbeac5b167fe5ad6c49d9e29aa0c76e2f1bb3b46bf4ebf12a9eca7d3525384, licence in OFL-Literata.txt.
ls -l "$OUT"
