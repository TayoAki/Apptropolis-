#!/usr/bin/env bash
# Pull frames from an encoded video at the given times (seconds), to check that visuals land on their words.
# Usage: frame_pulls.sh VIDEO OUT_DIR t1 [t2 …]
set -euo pipefail
video=${1:?video}; out=${2:?out dir}; shift 2
mkdir -p "$out"
for t in "$@"; do
  name=$(printf '%s/t%07.3f.png' "$out" "$t")
  ffmpeg -loglevel error -y -ss "$t" -i "$video" -frames:v 1 "$name"
  echo "$name"
done
