#!/bin/bash
# The edit, inside the Higgsfield sandbox (Higgsedit native CLI v0.14.0): build the timeline from edit.jsx, put the mix
# on its own lane, render the master. Inputs in $ENC_ROOT: shots/*.mp4, fonts/*.ttf, mix.wav, edit.jsx.
#   bash run.sh build [t1,t2,...]   -> the project + PNG stills at those times
#   bash run.sh render              -> film/renders/escrito-no-chao-master.mp4
set -euo pipefail
export ENC_ROOT="${ENC_ROOT:-/home/user/enc}"; cd "$ENC_ROOT"
case "${1:-build}" in
  build)
    rm -rf film; STILLS="${2:-}" higgsedit build edit.jsx
    ID=$(higgsedit import film "$ENC_ROOT/mix.wav" | python3 -c "import json,sys; print(json.load(sys.stdin)['imported'][0]['id'])")
    higgsedit do film place --assetId "$ID" --at 0 --duration 38.7500      # whole frames: the film ends with its last shot
    higgsedit check film;;
  render)
    higgsedit render film --out renders/escrito-no-chao-master.mp4 --bitrate 20M
    ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration,bit_rate -of json film/renders/escrito-no-chao-master.mp4;;
esac
