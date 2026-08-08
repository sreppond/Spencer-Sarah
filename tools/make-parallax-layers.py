"""Cut the hero poster into the depth planes the scroll hand-off parallaxes.

    pip install Pillow numpy
    python3 tools/make-parallax-layers.py

Writes assets/video/whitefish-hero-layer-{1,2,3}.webp.

WHY THERE IS NO SKY LAYER
-------------------------
The video is the back plane. It stays exactly where it is, untransformed, and
it is never covered above the waterline — the clouds drifting left to right are
the loop's primary motion (assets/video/README.md) and the whole point of
keeping it. Cutting a sky layer would freeze the one thing that is alive.

So the planes here are only the lower half of the picture, which the loop holds
nearly still anyway: far mountains, the mid shore, and the marina in front. They
fade in over the video once the guest starts scrolling and then drift down at
increasing rates, near plane fastest, which is what reads as depth.

WHY THE BANDS OVERLAP
---------------------
There is no art behind these planes — they are cut from a flat painting, so
whatever a plane uncovers as it slides is whatever was already underneath: its
neighbour, and below that the video, both holding the original position. That
doubling is the honest cost of parallaxing a flat image, and the way it is kept
soft is to never let a plane travel further than its own feathered edge is
wide. Each band therefore ramps into the next across ~10% of the frame, and the
travel distances in the stylesheet are tuned to stay inside those ramps. Below
the ramp width it reads as the haze this painting already has at every depth
transition; above it, it reads as two copies of a mountain.

Replacing these with properly separated art — planes with real painted-in
backing — is a drop-in: same filenames, same 4:3 frame, same object-position.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/video/whitefish-hero-poster.jpg"
OUT_DIR = ROOT / "assets/video"

# Output width. The hero covers a 4:3 source, so a 1280x900 window drives the
# picture to ~1200px wide; 1400 keeps a little margin without paying for a
# retina copy of something that spends its whole life under the ivory wash.
OUT_W = 1400
QUALITY = 82

# (name, opaque-from, opaque-to, feather-up, feather-down) as fractions of
# frame height. Read against the painting: the far ridge and treeline sit
# 46-70%, the lodge/tent/far shore 64-88%, the marina and near water 80-100%.
PLANES = [
    ("whitefish-hero-layer-1.webp", 0.46, 0.70, 0.09, 0.09),  # far mountains
    ("whitefish-hero-layer-2.webp", 0.64, 0.88, 0.09, 0.08),  # mid shore
    ("whitefish-hero-layer-3.webp", 0.80, 1.00, 0.12, 0.00),  # marina, near water
]


def ramp(h, opaque_from, opaque_to, feather_up, feather_down):
    """A vertical 0..255 alpha column: transparent, ramp up, solid, ramp down."""
    y = np.arange(h, dtype=np.float64) / h
    a = np.ones(h, dtype=np.float64)

    if feather_up > 0:
        top = (y - (opaque_from - feather_up)) / feather_up
        a = np.minimum(a, np.clip(top, 0.0, 1.0))
    else:
        a = np.where(y >= opaque_from, a, 0.0)

    if feather_down > 0:
        bottom = ((opaque_to + feather_down) - y) / feather_down
        a = np.minimum(a, np.clip(bottom, 0.0, 1.0))
    else:
        a = np.where(y <= opaque_to, a, 0.0)

    # Smoothstep: a linear alpha ramp across a soft painting shows its own
    # start and end as faint horizontal lines. This has zero derivative at
    # both ends, so the band has no edge of its own to see.
    a = a * a * (3.0 - 2.0 * a)
    return (a * 255.0).round().astype(np.uint8)


def main():
    im = Image.open(str(SRC)).convert("RGB")
    out_h = int(round(OUT_W * im.height / im.width))
    im = im.resize((OUT_W, out_h), Image.LANCZOS)
    rgb = np.asarray(im)

    for name, o_from, o_to, f_up, f_down in PLANES:
        alpha = ramp(out_h, o_from, o_to, f_up, f_down)
        rgba = np.dstack([rgb, np.repeat(alpha[:, None], OUT_W, axis=1)])
        path = OUT_DIR / name
        Image.fromarray(rgba, "RGBA").save(
            str(path), "WEBP", quality=QUALITY, method=6, exact=False
        )
        kb = path.stat().st_size / 1024
        print(f"{name}  {OUT_W}x{out_h}  {kb:6.1f} KB   "
              f"solid {o_from:.0%}-{o_to:.0%}  feather {f_up:.0%}/{f_down:.0%}")


if __name__ == "__main__":
    main()
