# Sarah & Spencer

Two things live in this repository.

## `/` — the save the date (live)

A concise, mobile-first save-the-date: a filmed envelope opens on tap into
the Whitefish Lake painting, a short guest-information form, a few
photographs, and an end card. It is deliberately **not** the wedding
website — no itinerary, travel, registry, FAQ or RSVP yet.

```
index.html                     the whole public experience
assets/js/config.js            ← names, date, place, asset paths, form endpoint
assets/js/save-the-date.js     envelope, hero, mosaic, form
assets/css/save-the-date.css
backend/google-sheets-form/    guest-form database (Google Sheet) + setup steps
assets/typography/             the hero lettering (see its README)
assets/img/social-preview.jpg  1200×630 iMessage / Open Graph card — a still
                               of the closed envelope, see assets/video/README.md
assets/photos/                 the photo journey (see its README)
assets/video/                  hero loop + envelope-open clip (see its README)
images/hero-lake.jpg           the source painting; hero poster source
images/envelope-closed.jpg     the OG card's source still (see assets/video/README.md)
images/IMG_3091.png            the comp the hero typography was lifted from
tools/                         regenerate the lettering and the hero poster
                               (make-social-preview.py is unused now — see
                               assets/video/README.md)
```

**One exception to config-driven content:** the hero title, divider and
date/place block are vector artwork traced out of `images/IMG_3091.png`, not
live text — the comp's lettering does not resolve to any one font. Changing a
name or the date means re-running `tools/extract-typography.py` and updating
`config.baked`; the page warns on localhost until you do. Full story in
`assets/typography/README.md`.

**Bump `?v=` in `index.html` whenever the CSS or JS changes.** Both are loaded
with a `?v=<date>` token. GitHub Pages gives every file its own cache entry, so
without it a returning guest can get the new `index.html` while still holding
the old stylesheet — the buttons lose their shape and fall back to blue
underlined links, and the arrow SVGs render as full-size black triangles over
the painting. It looks broken, not stale, which makes it easy to misdiagnose as
a bad deploy.

**Two fonts, and they are not interchangeable.** Cormorant Garamond is a
display cut with a very small x-height — it is the large lines only
(`--font-display`: section titles, step labels, the end card). Every word a
guest actually reads is EB Garamond (`--font-text`: paragraphs, form labels,
inputs, buttons, hints, errors). Setting body copy in Cormorant is what made
the page hard to read; please do not put it back. Minimum sizes live in
`--t-micro` / `--t-small` / `--t-body`, and `--t-micro` (12.5px) is only ever
allowed for tracked uppercase labels of three words or fewer.

**One button component.** `.flow-btn` in CSS §2.4 — an ink circle floods out,
an arrow crosses the button, the pill relaxes into a card. Variants set
`--fb-ink` / `--fb-on-ink` / `--fb-line` and inherit the rest; the markup owes
it three spans. Hover, `:focus-visible` and `:active` all get the full
treatment, because touch and keyboard never hover.

**The page is five beats, in this order:** the envelope, the hero (names,
date, and one instruction — "Scroll for detail"), the invitation line, the
mosaic, then the form. The hero is exactly one screen and scrolls away like
one — there is no sticky runway and no scroll-driven parallax. It had both,
and it read as the page refusing to move; the transition into the paper is
now just the static dissolve the painting carries at its foot. Nothing competes with the invitation on the first
screen; the lodging ask waits until the last screen of the form, where it
lands on someone who has just told us they are coming.

**The mosaic** (CSS §3.6 + `mosaic()` in the script) is the original site's
"Cordially-style scroll-driven hero mosaic", restored from commit `40cc855`:
one photograph fills the screen and shrinks into a framed card while five
more fly in from the edges. JS publishes one number, `--mosaic-p`, and CSS
composes every card from it. Photographs come from `mosaic[]` in
`config.js` — see `assets/photos/README.md` for what goes where.

**The form is four steps, and the stepping is optional.** CSS §4.1 plus the
stepper in `save-the-date.js`. The markup is a plain, complete, natively
submittable form; the script hides three of the four panes only once it is
running. Anything hidden by default and revealed by JavaScript must be scoped
to `html.js` — the hero and photo reveals are, and that is the only reason the
page is not blank without JavaScript.

**Change anything here first:** `assets/js/config.js`. It is the single source
of truth for the couple's names, the date, the location, every asset path and
the form endpoint. The same strings appear once more in `index.html` as a
no-JavaScript / crawler mirror; config wins at runtime and logs a warning on
localhost if the two drift apart. The Open Graph tags in `<head>` are static by
necessity — crawlers do not run JavaScript — so update those by hand.

### Preview locally

```
python3 -m http.server 8000
open http://localhost:8000/
```

Opening `index.html` straight off the filesystem also works, but a server is
closer to how GitHub Pages will serve it.

## `archive/full-site/` — the full wedding site (parked)

The earlier long-form site, kept intact for later: Our Story, the venue,
weekend details, attire, travel, registry, FAQ and the full RSVP flow. It is
not linked from the save the date and is not part of the public experience yet.
Open `archive/full-site/index.html` to see it; its image paths point back at
the shared `images/` directory.
