#!/usr/bin/env python3
"""
Extract the hero lettering out of the painted reference and emit vector SVGs.

The reference (images/IMG_3091.png, 1448x1086) is a rasterised comp: the
lettering is baked into the painting, so there is no font to fall back on and
no layer to lift.  This script recovers the artwork instead.

  1.  Estimate the painted background under each element with a greyscale
      morphological closing, whose radius is wider than any stroke.
  2.  Solve  observed = a*ink + (1-a)*background  per pixel for the coverage
      `a`, giving a true anti-aliased matte rather than a threshold cut-out.
  3.  Supersample the matte 8x, trace it with potrace, and divide the
      coordinates back down -- so the outlines land on sub-pixel positions and
      stay sharp at any display size.

Every box below is measured from the reference and matches the numbers in
assets/typography/README.md.

    pip install numpy pillow potracer
    python3 tools/extract-typography.py
"""

import os
import sys

import numpy as np
from PIL import Image, ImageFilter
import potrace

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFERENCE = os.path.join(ROOT, 'images', 'IMG_3091.png')
OUTDIR = os.path.join(ROOT, 'assets', 'typography')

# ---------------------------------------------------------------- measured --
# Reference canvas 1448 x 1086 (4:3).  Boxes are (x0, y0, x1, y1), x1/y1
# exclusive, in reference pixels.

INK = '#514e4b'          # the two names
GOLD = '#c49f6c'         # the ampersand
LEAF = '#9e9c84'         # the botanical sprig
RULE = '#cdbca6'         # the divider hairlines
DATE = '#8f8981'
PLACE = '#9c9382'

BOX_SPENCER = (223, 407, 707, 473)      # 484 x 66
BOX_SARAH = (886, 407, 1225, 473)       # 339 x 66
BOX_AMPERSAND = (745, 386, 856, 479)    # 111 x 93

BOX_DIVIDER = (561, 510, 883, 540)      # 322 x 30
BOX_SPRIG = (674, 510, 775, 540)        # sprig only, inside the divider box
RULE_Y = 15.2                           # hairline centre, divider-local
RULE_W = 1.08                           # hairline thickness, reference px
RULE_LEFT = (0, 99)                     # divider-local x span
RULE_RIGHT = (227, 322)

BOX_META = (604, 561, 844, 620)         # 240 x 59
BAND_DATE = (561, 583)                  # reference rows owned by the date
BAND_PLACE = (590, 620)                 # reference rows owned by the location

# Reordered title: SARAH, 31px, ampersand, 38px, SPENCER -> 1003 x 93.
GAP_SARAH_AMP = 31
GAP_AMP_SPENCER = 38

SUPERSAMPLE = 8


# ------------------------------------------------------------------ matting --
def load_reference():
    if not os.path.exists(REFERENCE):
        sys.exit(f'reference not found: {REFERENCE}')
    im = Image.open(REFERENCE).convert('RGB')
    if im.size != (1448, 1086):
        sys.exit(f'expected a 1448x1086 reference, got {im.size[0]}x{im.size[1]}')
    return im


def hexrgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


class Matter:
    """Per-pixel ink coverage against an estimated painted background."""

    def __init__(self, image, radius=14):
        self.pixels = np.asarray(image).astype(np.float32)
        closed = image.filter(ImageFilter.MaxFilter(2 * radius + 1)) \
                      .filter(ImageFilter.MinFilter(2 * radius + 1))
        self.background = np.asarray(closed).astype(np.float32)

    def __call__(self, ink, band=None):
        direction = self.background - np.array(hexrgb(ink), dtype=np.float32)
        alpha = ((self.background - self.pixels) * direction).sum(axis=2) \
            / ((direction * direction).sum(axis=2) + 1e-6)
        alpha = np.clip(alpha, 0.0, 1.0)
        if band is not None:
            masked = np.zeros_like(alpha)
            masked[band[0]:band[1]] = alpha[band[0]:band[1]]
            alpha = masked
        return alpha


# ----------------------------------------------------------------- tracing --
def trace(alpha, box, scale=SUPERSAMPLE, alphamax=1.0, opttolerance=0.2,
          turdsize=3, precision=2):
    """Trace `box` out of `alpha` into path data local to that box."""
    x0, y0, x1, y1 = box
    crop = alpha[y0:y1, x0:x1]
    big = Image.fromarray((crop * 255).astype(np.uint8)) \
               .resize(((x1 - x0) * scale, (y1 - y0) * scale), Image.BICUBIC)

    # potracer reads FALSE / dark as foreground, so the ink mask goes in
    # inverted.  Thresholding the supersampled matte at 50% coverage puts the
    # outline on the true edge of each stroke.
    bitmap = potrace.Bitmap(np.asarray(big) <= 127)
    traced = bitmap.trace(turdsize=turdsize * scale * scale,
                          alphamax=alphamax, opticurve=True,
                          opttolerance=opttolerance)

    def n(value):
        return f'{round(value / scale, precision):g}'

    out = []
    for curve in traced:
        data = [f'M{n(curve.start_point.x)} {n(curve.start_point.y)}']
        for seg in curve:
            end = seg.end_point
            if seg.is_corner:
                data.append(f'L{n(seg.c.x)} {n(seg.c.y)}L{n(end.x)} {n(end.y)}')
            else:
                data.append(f'C{n(seg.c1.x)} {n(seg.c1.y)} '
                            f'{n(seg.c2.x)} {n(seg.c2.y)} {n(end.x)} {n(end.y)}')
        data.append('Z')
        out.append(''.join(data))
    return ' '.join(out)


def write(name, body):
    os.makedirs(OUTDIR, exist_ok=True)
    path = os.path.join(OUTDIR, name)
    with open(path, 'w') as fh:
        fh.write(body)
    print(f'  {os.path.relpath(path, ROOT):<52}{len(body):>8,} bytes')


# ------------------------------------------------------------------ assets --
def build_title(matte):
    ink = matte(INK)
    gold = matte(GOLD)

    sarah = trace(ink, BOX_SARAH)
    ampersand = trace(gold, BOX_AMPERSAND)
    spencer = trace(ink, BOX_SPENCER)

    sarah_w = BOX_SARAH[2] - BOX_SARAH[0]
    amp_w = BOX_AMPERSAND[2] - BOX_AMPERSAND[0]
    spencer_w = BOX_SPENCER[2] - BOX_SPENCER[0]
    amp_x = sarah_w + GAP_SARAH_AMP
    spencer_x = amp_x + amp_w + GAP_AMP_SPENCER
    width = spencer_x + spencer_w
    height = BOX_AMPERSAND[3] - BOX_AMPERSAND[1]
    names_y = BOX_SARAH[1] - BOX_AMPERSAND[1]

    write('sarah-spencer-exact-title.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-labelledby="hero-title-label">
<title id="hero-title-label">Sarah &amp; Spencer</title>
<g fill="{INK}" fill-rule="evenodd">
<path transform="translate(0 {names_y})" d="{sarah}"/>
<path transform="translate({spencer_x} {names_y})" d="{spencer}"/>
</g>
<path fill="{GOLD}" fill-rule="evenodd" transform="translate({amp_x} 0)" d="{ampersand}"/>
</svg>
''')
    return width, height


def build_divider(matte):
    sprig = trace(matte(LEAF), BOX_SPRIG)
    sprig_x = BOX_SPRIG[0] - BOX_DIVIDER[0]
    sprig_y = BOX_SPRIG[1] - BOX_DIVIDER[1]
    width = BOX_DIVIDER[2] - BOX_DIVIDER[0]
    height = BOX_DIVIDER[3] - BOX_DIVIDER[1]

    write('botanical-divider-exact.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="presentation" aria-hidden="true" focusable="false">
<g fill="none" stroke="{RULE}" stroke-opacity=".78" stroke-width="{RULE_W}" stroke-linecap="round">
<path d="M{RULE_LEFT[0]} {RULE_Y}H{RULE_LEFT[1]}"/>
<path d="M{RULE_RIGHT[0]} {RULE_Y}H{RULE_RIGHT[1]}"/>
</g>
<path fill="{LEAF}" fill-rule="evenodd" transform="translate({sprig_x} {sprig_y})" d="{sprig}"/>
</svg>
''')
    return width, height


def build_meta(matte):
    date = trace(matte(DATE, band=BAND_DATE), BOX_META)
    place = trace(matte(PLACE, band=BAND_PLACE), BOX_META)
    width = BOX_META[2] - BOX_META[0]
    height = BOX_META[3] - BOX_META[1]

    write('event-meta-exact.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-labelledby="hero-meta-label">
<title id="hero-meta-label">June 12, 2027 — Whitefish, Montana</title>
<path fill="{DATE}" fill-rule="evenodd" d="{date}"/>
<path fill="{PLACE}" fill-rule="evenodd" d="{place}"/>
</svg>
''')
    return width, height


def main():
    image = load_reference()
    matte = Matter(image)
    print(f'reference {REFERENCE}  {image.size[0]}x{image.size[1]}')
    print(f'tracing at {SUPERSAMPLE}x supersample')
    build_title(matte)
    build_divider(matte)
    build_meta(matte)


if __name__ == '__main__':
    main()
