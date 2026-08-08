#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Build assets/audio/whitefish-ambience-loop.mp3 from a raw ambience recording.
#
#   tools/make-ambient-loop.sh path/to/source.mp3
#
# The shipped file was built from the clip attached to issue #10
# ("Mountain_landscape_with_clouds_a._202608040900.mp3") — 10.0s of steady
# mountain air, generated alongside the hero loop. Three things have to happen
# before a clip like that can sit under a web page on repeat:
#
#   1. Drop the fade-in.   The clip opens from silence over ~1.25s. Looped,
#                          that reads as a hole every time round.
#   2. Close the seam.     The tail is folded back over the head with an
#                          equal-power crossfade, so the last sample runs into
#                          the first one. Equal-power (qsin), not linear — the
#                          two sides are uncorrelated air, and a linear fade
#                          would dip ~3dB in the middle of the join.
#   3. Fix the level.      The source lands at -37 LUFS. Played at the page's
#                          0.16 gain that is inaudible. It is normalised to
#                          -18 LUFS, which puts the bed near -34 LUFS in the
#                          room — present, ignorable. `linear=true` applies one
#                          constant gain rather than riding the level.
#
# The loop is then tiled to ~35s. It would loop just as seamlessly at 7s, but
# browsers restart an <audio loop> MP3 through the decoder's padding, and that
# join is the one thing this script cannot smooth. Tiling makes it rare.
#
# Requires ffmpeg (no ffprobe: the durations are handled with areverse).
# ---------------------------------------------------------------------------
set -euo pipefail

SRC="${1:-}"
OUT="${OUT:-assets/audio/whitefish-ambience-loop.mp3}"
FFMPEG="${FFMPEG:-ffmpeg}"

TRIM="${TRIM:-1.4}"      # seconds of fade-in discarded from the head
XFADE="${XFADE:-1.5}"    # crossfade that closes the loop
TILES="${TILES:-5}"      # copies of the loop in the shipped file
LUFS="${LUFS:--18}"      # integrated loudness target
TP="${TP:--1.5}"         # true-peak ceiling

if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "usage: tools/make-ambient-loop.sh <source-audio>" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1 · trim the fade-in, work at 48k stereo float until the last step
"$FFMPEG" -v error -y -ss "$TRIM" -i "$SRC" -ar 48000 -ac 2 -c:a pcm_s24le "$TMP/trimmed.wav"

# 2 · fold the tail back over the head.
#     head + tail overlap to become the loop's first XFADE seconds; the body is
#     everything between. areverse lets both ends be addressed without knowing
#     the duration.
"$FFMPEG" -v error -y -i "$TMP/trimmed.wav" -filter_complex "
  [0:a]asplit=3[a][b][c];
  [a]atrim=end=${XFADE},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${XFADE}:curve=qsin[head];
  [b]areverse,atrim=end=${XFADE},asetpts=PTS-STARTPTS,areverse,afade=t=out:st=0:d=${XFADE}:curve=qsin[tail];
  [head][tail]amix=inputs=2:normalize=0[seam];
  [c]atrim=start=${XFADE},asetpts=PTS-STARTPTS,areverse,atrim=start=${XFADE},asetpts=PTS-STARTPTS,areverse[body];
  [seam][body]concat=n=2:v=0:a=1[out]" \
  -map "[out]" -c:a pcm_s24le "$TMP/loop.wav"

# 3 · tile
"$FFMPEG" -v error -y -stream_loop "$((TILES - 1))" -i "$TMP/loop.wav" -c:a pcm_s24le "$TMP/tiled.wav"

# 4 · loudness, measured then applied as a single constant gain
# (loudnorm prints its measurements to stderr at info level, so this pass
#  cannot be quietened the way the others are.)
MEASURED="$("$FFMPEG" -hide_banner -nostats -i "$TMP/tiled.wav" \
  -af "loudnorm=I=${LUFS}:TP=${TP}:LRA=7:print_format=json" -f null - 2>&1 | tr -d '\n')"

read -r I_IN TP_IN LRA_IN THRESH_IN OFFSET <<EOF
$(python3 - "$MEASURED" <<'PY'
import json, re, sys
m = re.search(r'\{[^{}]*"input_i".*?\}', sys.argv[1], re.S)
d = json.loads(m.group(0))
print(d["input_i"], d["input_tp"], d["input_lra"], d["input_thresh"], d["target_offset"])
PY
)
EOF

"$FFMPEG" -v error -y -i "$TMP/tiled.wav" \
  -af "loudnorm=I=${LUFS}:TP=${TP}:LRA=7:linear=true:measured_I=${I_IN}:measured_TP=${TP_IN}:measured_LRA=${LRA_IN}:measured_thresh=${THRESH_IN}:offset=${OFFSET},aresample=44100" \
  -c:a libmp3lame -q:a 7 -map_metadata -1 -write_xing 1 "$OUT"

echo "wrote $OUT"
ls -lh "$OUT"
