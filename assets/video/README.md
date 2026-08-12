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

`images/hero-lake.jpg` stays as the original artwork. The Open Graph card
no longer comes from it, or from `tools/make-social-preview.py` — see
"The social card is a still of the closed envelope" under the envelope
section below.

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


## The envelope clip

| File | Status | Notes |
| --- | --- | --- |
| `envelope-open.mp4` | **shipped** | 1126×618, ~4.9s, 48fps, H.264 High, no audio track, `+faststart`. ~910 KB. Cut from a 10s, 24fps, 1280×720 source. Served on anything 768px and wider, and as the fallback everywhere if the portrait file below ever fails. |
| `envelope-open-poster.jpg` | **shipped** | The landscape clip's own frame 0 — see below. |
| `envelope-open-mobile.mp4` | **shipped** | 720×1280 (9:16), ~8.3s, 24fps, H.264 High, no audio track, `+faststart`. ~1.8 MB. Trimmed and re-encoded from a 720×1280, 10s source shot and framed for a phone screen — see "A dedicated portrait cut for phones" below. Served below 768px. |
| `envelope-open-mobile-poster.jpg` | **shipped** | The portrait clip's own frame 0. |

This is what plays when a guest taps the envelope, in place of the old
CSS/SVG 3D fold. `save-the-date.js` plays it on tap and waits for its
`ended` event to hand off to the hero — see the "Envelope" section there —
rather than a fixed timer, so the hand-off can never drift out of sync
with what is actually on screen. `save-the-date.js` picks between the two
files above once, at load (`setEnvelopeSource` in the "Envelope" section
there), the same way `startHeroVideo` picks the hero's own mobile/desktop
source — not on a live resize, so rotating the device after the page has
already decided does not re-trigger the choice.

### A dedicated portrait cut for phones

`envelope-open-mobile.mp4` is not a crop of the landscape clip — it is a
separate take, shot and framed in portrait to begin with, so `object-fit:
cover` needs only a mild vertical crop on a real phone screen (well under
20% on most devices) instead of the landscape clip's ~75% width crop. The
source file supplied for it (also 720×1280, 10s, 24fps, with a −62 dB
noise-floor audio track — the same non-signal the landscape clip's own
source carried) was the full uncut take: envelope opens, card rises and
the last line of text ("Whitefish, MT / 06.12.2027") settles into place
by ~7.7s, then holds on the fully-revealed card with no fade for the
remaining ~2.3s. That hold and the raw audio track needed the same fix
the landscape clip got, done the same way — trim the static tail, add a
fade to a held white frame so `.env-scene`'s own opacity transition (CSS
§1) has a plain field to fade from, and drop the audio:

```
ffmpeg -i master.mp4 \
  -vf "trim=0:8.3,setpts=PTS-STARTPTS,fade=t=out:st=7.8:d=0.5:color=white" \
  -an -c:v libx264 -crf 19 -preset slow -profile:v high -level 4.0 \
  -pix_fmt yuv420p -g 48 -movflags +faststart envelope-open-mobile.mp4
```

Unlike the landscape clip, this pass does not retime the footage —
`setpts=PTS-STARTPTS` only re-zeroes timestamps after the trim, it does
not change their spacing. The source's own pace was left alone rather
than matched to the landscape clip's brisker 1.75×, since retiming is a
creative call on someone else's footage that trimming a dead hold is not.
One consequence: this clip runs longer (~8.3s) than the landscape one
(~4.9s), so the flat safety timeout in `playEnvelopeVideo()` that hands
off to the hero if a browser's `error`/`ended` events never fire had to
move from 6.5s to 9.8s to stay comfortably past *either* clip's own
runtime — see the comment at that `setTimeout` call.

`envelope-open-mobile-poster.jpg` follows the same rule as the landscape
poster below: it is frame 0 of the *processed* file, not the raw upload,
exported the same way —

```
ffmpeg -i envelope-open-mobile.mp4 -frames:v 1 -update 1 -q:v 3 envelope-open-mobile-poster.jpg
```

If this clip is ever re-shot or re-cut, re-check where the text settles
(sample frames every ~0.1s through the back third of the clip — a static
contact sheet is the fastest way to see it) rather than assuming ~7.8s
still holds, and re-export the poster from whatever the new file's own
frame 0 actually is.

### The source ran long and needed cropping in

The original 10s take is a locked-off studio shot: a cream envelope on a
warm grey backdrop with generous headroom on all four sides, the flap
opening in the first ~3s and the card creeping out over the next ~5s before
holding on the fully-revealed card for the last ~2s. Two problems for a
tap-triggered intro: the hold at the end shows nothing new, and the
headroom reads as empty space rather than a full-bleed reveal once the clip
fills a phone screen.

Both are fixed in one `ffmpeg` pass — trim off the static hold, crop in
toward the envelope, then speed the remainder up so the whole thing reads
as brisk rather than slow:

```
ffmpeg -i master.mp4 \
  -vf "trim=0:8.6,setpts=(PTS-STARTPTS)/1.75,fps=48,crop=iw*0.88:ih*0.86,fade=t=out:st=4.4:d=0.5:color=white" \
  -an -c:v libx264 -crf 19 -preset slow -profile:v high -level 4.0 \
  -pix_fmt yuv420p -g 96 -movflags +faststart envelope-open.mp4
```

The crop factors (0.88 × 0.86) were checked frame-by-frame against the
widest moment in the shot (the closed envelope, before the camera pushes
in at all) so nothing is ever clipped at any point in the clip — see the
frame checks that produced these numbers if the source is ever re-cut.

### `setpts` alone judders — it needs `fps` right after it

The first cut of this file left `fps` out and let the encoder's default
24fps CFR output stand. That is a silent trap with any `setpts` speed-up:
retiming to 1.75× packs the source's 24fps frames to an effective ~42fps
of motion, and an encoder asked for 24fps CFR does not slow the clip back
down to compensate — it keeps the new (shorter) duration and *drops*
roughly four in every ten frames to hit the frame count that duration
allows at 24fps. The clip still played, at the right length, and still
looked right frame-by-frame — it just moved unevenly, because the frames
being kept were not evenly spaced in the original motion. `ffprobe -show_entries
frame=pts_time` on that first export showed it directly: a perfectly
regular 1/24s grid, which is only possible if frames were discarded to
fit it.

`fps=48` placed after `setpts` fixes this because 48fps is comfortably
above the ~42fps the retime actually produced — the filter still lands on
a clean, standard, CFR-compatible number, but now every original frame's
motion survives (some get shown for two output frames instead of one,
which duplicates, not drops), so the card's rise reads as smooth. It cost
almost nothing: near-duplicate frames are nearly free for H.264 to encode
as skip blocks, so the shipped file is about the same size as the
juddery one. `-g 96` doubles the keyframe interval to match the doubled
frame rate, keeping roughly one keyframe per second either way.

If this clip is ever re-cut at a different speed factor, check the result
the same way rather than trusting it by eye — a moderate judder is easy
to miss watching a 5-second clip once, and very easy to feel wrong on a
guest's phone: `ffprobe -select_streams v:0 -show_entries frame=pts_time
-of csv=p=0 envelope-open.mp4` should print one single, repeating gap
value end to end.

### It ends on a held white frame, on purpose

The `fade=t=out:...:color=white` at the tail is not a UI fade — it is
baked into the pixels. The clip's last ~0.5s dissolve to solid white and
hold there through its final frame, so `.env-scene`'s own CSS opacity
transition (§1 of `save-the-date.css`) has a plain white field to fade
*from* on both the video and the scene's background colour
(`--paper-deep`, warm and close to white already). That is what makes the
hand-off into the hero read as one continuous fade instead of a video
frame cutting to a differently-coloured overlay.

### Confirmed silent, and on purpose

`volumedetect` on the source measures a −61.9 dB mean / −39.9 dB peak — a
noise floor, not sound design — so the track is dropped entirely with
`-an`, same as the hero loop. The element still ships `muted` in markup
and as a property set in JS (iOS requires the latter for autoplay-adjacent
`play()` calls to be treated as allowed), even though there is nothing on
the track to hear.

### The poster must come from the clip, not be regenerated separately

Same reasoning as the hero poster above: `envelope-open-poster.jpg` is
frame 0 of `envelope-open.mp4` exactly, exported with `ffmpeg -i
envelope-open.mp4 -frames:v 1 -update 1 -q:v 3 envelope-open-poster.jpg`
after the crop above, not a separate re-export from the master. A guest
sees the poster before they tap and the video's first frame the instant
they do — if the two ever diverge, even slightly, that hand-off shows.

### The social card is a still of the closed envelope

`assets/img/social-preview.jpg` — the 1200×630 image iMessage, SMS and
every other link-preview surface show when a guest texts the site's URL —
is no longer a `tools/make-social-preview.py` render of `images/hero-lake.jpg`,
and (v2) no longer a frame pulled from `envelope-open.mp4` either. It is a
separately supplied still of the closed envelope, `images/envelope-closed.jpg`
(1842×1208), fit to the Open Graph 1200×630 spec.

The envelope is the first thing a guest sees on the page itself and the
first frame the video plays from, so a *closed* envelope is what a text
preview should show — it reads as "here is an invitation to open," which
is exactly the page's own first move, rather than giving away the card
inside before the guest has tapped anything.

`images/envelope-closed.jpg` is 1.525:1, noticeably taller than Open
Graph's 1.905:1, and — unlike the mid-reveal frame this card used in
v1 — its margins around the envelope are tight (≈6% top, ≈7% bottom).
A straight center-crop to 1.905:1 needs to remove 20% of the height,
which clips into the envelope's own corners; there is no crop of this
source that hits the target aspect without cutting the subject. So this
one is fit, not cropped: scaled to fill the full 630px height with
nothing lost, then centered over a softly blurred, slightly darkened
copy of the same image stretched to fill the remaining width — the
common "blurred letterbox" treatment, chosen over a flat-color pad
because the source's background is a soft gradient, not a flat tone, and
a solid fill would show a seam a blur does not.

```
ffmpeg -i images/envelope-closed.jpg -filter_complex "
  [0:v]scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630,gblur=sigma=45,eq=brightness=-0.03[bg];
  [0:v]scale=-2:630[fg];
  [bg][fg]overlay=(W-w)/2:(H-h)/2[out]" \
  -map "[out]" -frames:v 1 -update 1 -q:v 3 assets/img/social-preview.jpg
```

`tools/make-social-preview.py`, `images/hero-lake.jpg` and the v1 approach
of pulling a frame from `envelope-open.mp4` (crop-to-fill, no padding) are
all unused for this file now but left in place — the crop-to-fill approach
is still the right one for any future source image whose margins are
generous enough to survive it uncut; check that before reusing it blind.

### `save-the-date.js` has to assume playback can fail silently

Playwright's bundled Chromium — the same open-source build noted above for
the hero loop — doesn't just fall back quietly here: calling `.play()` on
an undecodable source leaves the element's `readyState` at `HAVE_NOTHING`
forever, with no `error` event and no rejected promise. A guest on a real
but similarly decoder-less browser would be stuck on a frame that never
moves, watching a screen with no stated way past it. `playEnvelopeVideo()`
in `save-the-date.js` covers this with a flat timeout — comfortably past
either clip's own runtime — that hands off to the hero the same way a
missing file or a genuine decode error would, on top of the `error` and
rejected-`play()` handlers that catch the failures a browser actually
reports.

An `error` a browser *does* report gets one more chance before that
hand-off: `onError` inside `playEnvelopeVideo()` steps to the next entry
in `envSources` — on a phone that means falling from the portrait clip to
the landscape one — and tries again, so a guest whose portrait file 404s
or fails to decode still sees an envelope instead of a dead frame. Only
the last source's own failure reaches the hero. CSS §1 of
`save-the-date.css` keys its `object-fit` off the same fallback (the
`is-mobile-cut` class `setEnvelopeSource` toggles on `#envelope-scene`),
so a guest who falls back this way gets the landscape clip letterboxed
rather than cropped to a sliver, not the raw crop the desktop-only version
of this page once shipped.
