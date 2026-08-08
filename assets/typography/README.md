# Hero typography

The hero lettering is **artwork, not live text**. This directory holds it, and
`tools/extract-typography.py` regenerates it from the painted reference.

```
sarah-spencer-exact-title.svg   1003 x 93   the two names + the gold ampersand
botanical-divider-exact.svg      322 x 30   two hairlines + the olive sprig
event-meta-exact.svg             240 x 59   JUNE 12, 2027 / whitefish, montana
vine-wide.svg, vine-narrow.svg              NO LONGER USED — see below
```

**The vines are not on the site.** They ran as one scroll-drawn thread down
`.paper`, but the geometry is a fixed 2400-unit path stretched to the height of
that column, so as the page grew the stem read as a stretched line with its
leaves drifting off it — and it passed behind the mosaic cards, arriving cut.
The files and `tools/make-botanicals.js` are kept here in case they are wanted
again; nothing loads them today.

## Why it is artwork

`images/IMG_3091.png` (1448 × 1086, 4:3) is the comp the hero is built from,
and the lettering is baked into the painting. It does not come from one
unmodified font file — the letter proportions are not internally consistent,
so the two words cannot both be reproduced at their measured widths with a
single font size, tracking value and horizontal scale. The ampersand and the
sprig are custom drawings and are not glyphs at all.

Cormorant Garamond is the closest editable family, and the page still loads it
for everything below the hero. It is not close enough for the title.

## How the assets were made

`tools/extract-typography.py` recovers the artwork rather than redrawing it:

1. Estimate the painted background under each element with a greyscale
   morphological closing whose radius is wider than any stroke.
2. Solve `observed = a·ink + (1−a)·background` per pixel for the coverage `a`.
   That yields a true anti-aliased matte, not a threshold cut-out.
3. Supersample the matte 8×, trace it with potrace, divide the coordinates
   back down. The outlines land on sub-pixel positions and stay sharp at any
   size — which a 1003px raster of the same lettering cannot do, since the
   hero renders at 2× or 3× on most phones and laptops.

```
pip install numpy pillow potracer
python3 tools/extract-typography.py
```

The word order is reversed against the reference — the comp reads
SPENCER & SARAH, the site reads SARAH & SPENCER — but the letterforms are the
reference's own, lifted glyph for glyph. Every letter needed already appears
in the two names.

## Measured geometry

All boxes are in reference pixels on the 1448 × 1086 canvas.

| Element        | Reference bounds        | Size       |
| -------------- | ----------------------- | ---------- |
| Complete title | x 223–1226, y 386–479   | 1003 × 93  |
| “SPENCER”      | x 223–707,  y 407–473   | 484 × 66   |
| Ampersand      | x 745–856,  y 386–479   | 111 × 93   |
| “SARAH”        | x 886–1225, y 407–473   | 339 × 66   |
| Divider        | x 561–883,  y 510–540   | 322 × 30   |
| Date / place   | x 604–844,  y 561–620   | 240 × 59   |

Reordered title spacing, preserved from the reference: SARAH → ampersand 31px,
ampersand → SPENCER 38px, total 1003px. Vertically, 31px from the bottom of
the title to the top of the divider and 21px from the divider to the metadata.

Colours, measured off the comp:

| | |
| --- | --- |
| Names | `#514e4b` |
| Ampersand | `#c49f6c` |
| Sprig | `#9e9c84` |
| Divider hairlines | `#cdbca6` at 78% |
| Date | `#8f8981` |
| Location | `#9c9382` |

## Rules for using them

- **Centre the whole 1003px title as one object.** Not the ampersand — it sits
  off-centre because the names have different widths, exactly as in the comp.
- Scale by width only. Never touch the aspect ratio, at any breakpoint.
- No shadow, glow, blur, outline or CSS filter. The reference has none, and
  `.hero-scrim` already lifts the sky behind the lettering.
- Do not let `fill`, `stroke`, `font-family`, `letter-spacing`,
  `text-transform` or `filter` cascade in. The colours are inside the files.
- Do not swap the sprig for an emoji, an icon-font leaf or a stock SVG, and do
  not re-typeset the metadata.
- Do not rasterise these during a build. They ship as-is.

## Changing the names, date or place

The artwork cannot re-typeset itself. Edit `assets/js/config.js` as usual, then
re-run the extractor (or redraw the assets) and update `config.baked` to match.
Until `config.baked` agrees with the strings above it, the page logs a warning
on localhost — that mismatch is the only thing standing between a renamed
couple and a hero that still shows the old names.

`images/sarah-spencer-exact-title.svg`, `images/botanical-divider-exact.svg`
and `images/event-meta-exact.svg` are the earlier hand-supplied versions of the
same three pieces: identical geometry, but 1:1 rasters wrapped in an SVG. They
are kept for reference and are not used by the page.
