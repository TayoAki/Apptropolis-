#!/usr/bin/env bash
# Integrated loudness (LUFS), loudness range and true peak of each file, measured with ffmpeg's ebur128 filter.
# Targets for social and web: about -14 LUFS integrated, true peak at or below -1 dBTP.
# Usage: loudness.sh FILE [FILE…]
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: $0 FILE [FILE…]" >&2; exit 2; }
for f in "$@"; do
  if ! ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" | grep -q .; then
    printf '%s: no audio stream\n' "$f"; continue
  fi
  ffmpeg -hide_banner -nostats -i "$f" -map 0:a:0 -af ebur128=peak=true:framelog=quiet -f null - 2>&1 \
    | awk -v f="$f" '/I:/ {i=$2} /LRA:/ {l=$2} /Peak:/ {p=$2} END {printf "%s: integrated %s LUFS, LRA %s LU, true peak %s dBTP\n", f, i, l, p}'
done
