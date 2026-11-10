#!/bin/sh
# strip.sh <video> <out.jpg> [columns]: evenly spaced frames of a take side by side, for review
n=${3:-6}; f=$(ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$1")
step=$(( (f - 1) / (n - 1) ))
ffmpeg -v error -y -i "$1" -vf "select='not(mod(n\,$step))',scale=300:-1,tile=${n}x1" -frames:v 1 -q:v 3 "$2"
