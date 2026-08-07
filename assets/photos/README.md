# Photos

Three frames, config-driven from `assets/js/config.js` → `photos[]`.

| Slot | File | Status |
| --- | --- | --- |
| 1 | `couple-01.jpg` | **needed** — portrait orientation reads best (4:5) |
| 2 | `couple-02.jpg` | **needed** — portrait orientation reads best (3:4) |
| 3 | `whitefish-lake.jpg` | shipped — watercolour of the venue, desaturated to match the palette |

Any slot whose file is missing renders a designed "a photograph to come" frame
instead of a broken image, so the page is safe to share before the photos exist.

Export around 1600px on the long edge, JPEG quality ~82.
