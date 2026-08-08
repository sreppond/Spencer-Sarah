# Photos

Six frames, config-driven from `assets/js/config.js` → `mosaic[]`.

These feed the mosaic: the first photograph fills the screen, then shrinks
into a framed card as you scroll while the other five fly in around it.

| Index | File | Position | Reads best as |
| --- | --- | --- | --- |
| 0 | `mosaic-centre.jpg` | centre | **landscape, 3:2 or 16:9** — the only one ever seen full width, so give it the strongest photograph |
| 1 | `mosaic-1.jpg` | top left | portrait (2:3) |
| 2 | `mosaic-2.jpg` | bottom left | portrait (3:4) |
| 3 | `mosaic-3.jpg` | top right | portrait (3:4) |
| 4 | `mosaic-4.jpg` | bottom right | portrait (2:3) |
| 5 | `mosaic-5.jpg` | middle right | square-ish — hidden on phones, where six cards is a crowd |

Every frame is `object-fit: cover`, so nothing is letterboxed — but the crop
is centred, so keep your subject away from the edges on the satellites.

Any file that is missing renders a designed "a photograph to come" frame
instead of a broken image, so the page is safe to share before the photos
exist. Drop files in with these names and they appear on their own — no code
change.

Export around 2000px on the long edge for index 0 (it goes full-bleed) and
around 1200px for the satellites. JPEG quality ~82.

## Not in use

`whitefish-lake.jpg` — a watercolour of the venue. It was taken out of the
photo journey deliberately: the same painting is already the hero, so running
it again read as a repeat rather than a photograph. Still here if you want it
back; add it to `mosaic[]` in `assets/js/config.js`.
