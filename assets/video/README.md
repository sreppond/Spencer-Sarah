# Hero video

Drop the Higgsfield loop here. `assets/js/config.js` already points at these paths —
no markup or CSS changes are needed.

| File | Required | Notes |
| --- | --- | --- |
| `whitefish-hero-loop.mp4` | primary | Landscape 4:3, ~12s seamless loop generated from `images/hero-lake.jpg`. H.264, `-movflags +faststart`, no audio track (the ambient lake sound is a separate layer). |
| `whitefish-hero-loop-mobile.mp4` | optional | Portrait crop of the same loop. Served automatically below 768px when present. |

Until a file exists the hero shows `images/hero-lake.jpg` — the same painting the
loop is generated from — so the page never looks unfinished. The still is also
the video's `poster`, which is why there is never a black frame before playback.

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

```
ffmpeg -i loop.mp4 -c:v libx264 -crf 20 -preset slow \
       -pix_fmt yuv420p -an -movflags +faststart \
       whitefish-hero-loop.mp4
```

`-pix_fmt yuv420p` is what makes it decodable on iOS; `-an` drops the audio
track so Safari never treats the element as sound-bearing; `+faststart` moves
the index to the front so playback can begin before the file has finished
downloading. Aim to stay under ~6 MB — this is the first thing a guest loads,
usually on a phone, often on cellular.

## How the hero uses it

`autoplay muted playsinline loop` in the markup is the iOS autoplay contract;
`save-the-date.js` also calls `play()` explicitly, and if the browser refuses
(low power mode, data saver) it retries once on the first interaction. The
video only fades in on the `playing` event, so a slow or refused start is
invisible — the still simply stays. A missing file is handled the same way.
