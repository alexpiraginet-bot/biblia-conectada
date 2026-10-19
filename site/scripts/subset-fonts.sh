#!/usr/bin/env bash
# Subsets the OFL fonts used by the videos (estudos/*/assets/fonts) to Latin and converts them to WOFF2 for the web.
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
RANGE="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0307-0308,U+0327,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
mkdir -p "$OUT"
# Cormorant roman is not used on the site (design/README.md §4): only the italic is subset.
for f in Cormorant-Italic-VF SpaceGrotesk-VF SpaceMono-Regular SpaceMono-Bold; do
  "$PY" -m fontTools.subset "$SRC/$f.ttf" --unicodes="$RANGE" --layout-features='*' --name-IDs='*' --name-languages='*' \
    --flavor=woff2 --output-file="$OUT/$f.woff2"
done
cp "$SRC"/OFL-*.txt "$OUT/"
# Literata (Bible text) is not from the videos: src/fonts/Literata-wght-latin.woff2 is the latin wght file of
# @fontsource-variable/literata 5.3.0 (files/literata-latin-wght-normal.woff2, already subset by Fontsource),
# SHA-256 9adbeac5b167fe5ad6c49d9e29aa0c76e2f1bb3b46bf4ebf12a9eca7d3525384, licence in OFL-Literata.txt.
ls -l "$OUT"
