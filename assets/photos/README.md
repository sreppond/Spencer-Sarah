# Photos

Three frames, config-driven from `assets/js/config.js` → `photos[]`.

| Slot | File | Status |
| --- | --- | --- |
| 1 | `couple-01.jpg` | **needed** — portrait orientation reads best (4:5) |
| 2 | `couple-02.jpg` | **needed** — portrait orientation reads best (3:4) |
| 3 | — | **needed** — landscape reads best here (16:9 on desktop, 3:2 on phones) |

Slot 3 used to hold `whitefish-lake.jpg`, a watercolour of the venue. It was
taken out of `photos[]` deliberately: the same painting is already the hero, so
running it again here read as a repeat rather than a third photograph. The file
is still in this directory if you want it back — re-add it to `photos[]`.

Any slot whose file is missing renders a designed "a photograph to come" frame
instead of a broken image, so the page is safe to share before the photos exist.

Export around 1600px on the long edge, JPEG quality ~82.
