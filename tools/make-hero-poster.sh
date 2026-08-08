#!/usr/bin/env bash
# Re-export the hero poster from the hero loop's first frame.
#
# Run this whenever assets/video/whitefish-hero-loop.mp4 is replaced.
#
# The poster has to be the loop's own frame 0, not images/hero-lake.jpg.
# The loop was generated from that painting but is not a pixel-faithful
# animation of it: the clouds are redrawn and the framing sits slightly
# differently. Using the painting made the whole picture visibly shift the
# moment the video faded in over it. Frame 0 makes the hand-off invisible.
#
# Requires ffmpeg on PATH.

set -euo pipefail
cd "$(dirname "$0")/.."

SRC="assets/video/whitefish-hero-loop.mp4"
OUT="assets/video/whitefish-hero-poster.jpg"

[ -f "$SRC" ] || { echo "missing $SRC" >&2; exit 1; }

# -q:v 5 lands around 190 KB at 1664x1248. This is the LCP image on every
# first visit, so keep it under ~250 KB; raise the number to shrink it.
ffmpeg -v error -y -i "$SRC" -vf "select='eq(n\,0)'" -frames:v 1 -q:v 5 "$OUT"

printf '%s  %s KB\n' "$OUT" "$(( $(wc -c < "$OUT") / 1024 ))"
echo 'Poster updated. It is referenced by config.media.heroPoster, the'
echo '<img class="hero-still"> in index.html, and the <link rel="preload"> in <head>.'
