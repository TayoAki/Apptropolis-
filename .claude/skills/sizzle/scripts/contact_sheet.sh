#!/usr/bin/env bash
# Tile a folder of styleframes (PNG, in name order) into one contact sheet for the storyboard checkpoint.
# Usage: contact_sheet.sh STYLEFRAME_DIR OUT.png [COLS=3] [TILE_WIDTH=640] [BG=0x052E16]
set -euo pipefail
dir=${1:?styleframe dir}; out=${2:?output png}; cols=${3:-3}; w=${4:-640}; bg=${5:-0x052E16}
n=$(ls "$dir"/*.png | wc -l); rows=$(( (n + cols - 1) / cols ))
h=$(( w * 9 / 16 ))
ffmpeg -loglevel error -y -pattern_type glob -i "$dir/*.png" \
  -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=${bg},tile=${cols}x${rows}:padding=8:color=${bg}" \
  -frames:v 1 "$out"
echo "$out (${n} frames, ${cols}x${rows})"
