# Hero video

Drop the Higgsfield loop here. `assets/js/config.js` already points at these paths —
no markup or CSS changes are needed.

| File | Required | Notes |
| --- | --- | --- |
| `whitefish-hero-loop.mp4` | primary | Landscape, ~15s seamless loop generated from `images/hero-lake.jpg`. H.264, `-movflags +faststart`, muted (ambient sound is a separate layer). |
| `whitefish-hero-loop-mobile.mp4` | optional | Portrait crop of the same loop. Served automatically below 768px when present. |

Until a file exists the hero shows `images/hero-lake.jpg` — the same painting the
loop is generated from — so the page never looks unfinished.

The loop must keep the source painting exactly: locked camera, no zoom/pan/tilt,
clouds drifting left to right as the primary motion, restrained water, boats
bobbing in place and returning to their exact original positions, first and last
frame identical.
