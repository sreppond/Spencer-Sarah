# Sarah & Spencer

Two things live in this repository.

## `/` — the save the date (live)

A concise, mobile-first save-the-date: a tactile envelope opens into the
Whitefish Lake painting, a short guest-information form, a few photographs,
and an end card. It is deliberately **not** the wedding website — no
itinerary, travel, registry, FAQ or RSVP yet.

```
index.html                     the whole public experience
assets/js/config.js            ← names, date, place, asset paths, form endpoint
assets/js/save-the-date.js     envelope, hero, audio, vine, form
assets/css/save-the-date.css
assets/typography/             the hero lettering + vines (see its README)
assets/img/social-preview.jpg  1200×630 iMessage / Open Graph card
assets/photos/                 the photo journey (see its README)
assets/video/                  Higgsfield hero loop goes here (see its README)
assets/audio/                  ambient lake loop goes here (see its README)
images/hero-lake.jpg           the source painting; hero poster + OG source
images/IMG_3091.png            the comp the hero typography was lifted from
tools/                         regenerate the OG card, the vines, the lettering
```

**One exception to config-driven content:** the hero title, divider and
date/place block are vector artwork traced out of `images/IMG_3091.png`, not
live text — the comp's lettering does not resolve to any one font. Changing a
name or the date means re-running `tools/extract-typography.py` and updating
`config.baked`; the page warns on localhost until you do. Full story in
`assets/typography/README.md`.

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
