# Hero video

`assets/js/config.js` points at these paths — no markup or CSS changes are
needed to swap a file.

| File | Status | Notes |
| --- | --- | --- |
| `whitefish-hero-loop.mp4` | **shipped** | 1664×1248 (4:3), 12.04s, 24fps, H.264 High, no audio track, `+faststart`. 4.3 MB. |
| `whitefish-hero-poster.jpg` | **shipped** | The loop's own frame 0. See below — this is not interchangeable with `images/hero-lake.jpg`. |
| `whitefish-hero-loop-mobile.mp4` | optional, **not cut yet** | Portrait crop of the same loop. Served below 768px once it exists *and* `config.media.heroVideoMobile` names it. Leave that config value empty until then — see below. |

If the video is ever missing the hero falls back to the poster and the page
still looks finished — a missing file, a refused autoplay and an unsupported
codec all land in the same place.

## The poster must come from the loop, not from the painting

The loop was generated from `images/hero-lake.jpg`, but it is **not** a
pixel-faithful animation of it: the clouds are redrawn and the framing sits
slightly differently. Measured mean difference between the painting and the
loop's frame 0 is ~13.6/255 — larger than the clouds move across an entire
half-cycle of the loop — so posting the painting made the whole picture
visibly shift the instant the video faded in over it.

Frame 0 makes that hand-off invisible. Regenerate it whenever the loop
changes:

```
tools/make-hero-poster.sh
```

`images/hero-lake.jpg` stays as the source for the Open Graph card
(`tools/make-social-preview.py`) and as the original artwork.

## Keep it 4:3

Both files are 4:3 and the two must match, because the poster and the video
share one set of `object-position` values. The hero crops with
`object-fit: cover` and the framing per breakpoint (§8 of the stylesheet) is
tuned against that ratio — on a phone roughly two thirds of the width is
cropped away, and those values are what keep the mountain gap, the lodge and
the tent in frame.

The loop must keep the source painting exactly: locked camera, no zoom/pan/tilt,
clouds drifting left to right as the primary motion, restrained water, boats
bobbing in place and returning to their exact original positions, first and last
frame identical.

## Keep it 4:3

The hero crops the artwork with `object-fit: cover`, and the framing per
breakpoint (`object-position` in §8 of the stylesheet) is tuned against a 4:3
source. A loop exported at a different aspect ratio will still play, but the
crops will no longer land where they were composed to — the mountain gap, the
lodge and the tent are held in frame by those values.

## Encoding

This is what the shipped file was made with, from a 28 MB / 19.5 Mbps master:

```
ffmpeg -i master.mp4 -an -c:v libx264 -crf 23 -preset slow \
       -profile:v high -level 4.0 -pix_fmt yuv420p -g 48 \
       -movflags +faststart whitefish-hero-loop.mp4
```

`-pix_fmt yuv420p` is what makes it decodable on iOS; `-an` drops the audio
track so Safari never treats the element as sound-bearing; `+faststart` moves
the index to the front so playback can begin before the file finishes
downloading. Keep it under ~6 MB — this is the first thing a guest loads,
usually on a phone, often on cellular, straight from a text message.

CRF 23 was measured, not guessed. The risk with this artwork is banding: it is
mostly wide, smooth sky gradients, which is exactly what a low bitrate
destroys. Against the master, CRF 23 holds the same number of distinct luma
levels in the sky (72 vs 72) with no new flat plateaus — i.e. no banding
introduced — at a mean error below one luma level. CRF 26 saves another 1.3 MB
but pushes peak error to 15/255, which is visible. CRF 20 costs 2 MB more for
no measurable gain.

## A note on testing this locally

Playwright's bundled Chromium is the open-source build and ships **no H.264
decoder at all** — `canPlayType('video/mp4; codecs="avc1.42E01E"')` returns
empty, and the hero will silently fall back to the poster. That is a property
of that browser, not of the file. Real Chrome, Safari, Firefox and Edge all
play H.264, and iOS requires it, so H.264 remains the right thing to ship. To
exercise the play path in automation, transcode a VP9/WebM stand-in and serve
it at the same URL.

## How the hero uses it

`autoplay muted playsinline loop` in the markup is the iOS autoplay contract;
`save-the-date.js` also calls `play()` explicitly, and if the browser refuses
(low power mode, data saver) it retries once on the first interaction. The
video only fades in on the `playing` event, so a slow or refused start is
invisible — the still simply stays. A missing file is handled the same way.

The sources are a list, tried in order, and `heroVideo` is always the last
entry: below 768px the portrait crop is tried first, and anything that errors
— missing file, unsupported codec — steps to the next source rather than
giving up. That ordering matters because a 404 is still a response, so the
element cannot tell "not cut yet" from "broken"; before the fallback existed,
naming an uncut crop in `config.media.heroVideoMobile` left every guest on a
phone looking at a dead still. Prefer leaving that value empty until the file
actually ships — the fallback is a safety net, not a reason to point at
nothing.
