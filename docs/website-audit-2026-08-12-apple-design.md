# UI/UX audit — Apple Design principles — 2026-08-12

A full pass over the live site (`index.html`, `travel/index.html`, and the
shared `assets/css/save-the-date.css`) against Apple's fluid-interface
design language — response, direct manipulation, spatial consistency,
materials/depth, typography discipline, and spacing craft. Companion to
`website-audit-2026-08-11.md`, which covered Impeccable's automated scan and
a line-by-line animation/easing review; this pass does not re-litigate
anything already fixed or explicitly left there. It focuses on what that
pass didn't check: rendered layout at real viewport widths, and the
non-animation design principles (typography tracking, gesture fidelity,
spacing rhythm).

**Method.** Read every rule in `save-the-date.css` (3,319 lines) and both
page templates, then rendered the site in headless Chromium at six
viewports (320/360/375/390px phones, 768px tablet, 1440px desktop) with
Playwright, screenshotting the hero, the invitation line, the mosaic, all
four form steps, the lodging carousel, the lightbox, the weekend cards and
the FAQ. Every finding below is either a measured pixel value (bounding
boxes read straight from the rendered DOM) or a direct code citation —
nothing here is a guess about what the site "might" look like.

**Headline.** This codebase is unusually disciplined already — a real type
ramp, one button component, documented contrast targets, full
`prefers-reduced-motion`/`prefers-contrast`/`forced-colors` coverage, and
comments that explain *why* nearly every number is what it is. The findings
below are the real exceptions to that bar, not a wholesale critique. Three
of them are genuine collisions between elements that a screenshot makes
obvious but a CSS read alone would not.

---

## 1 · Colliding or crowded elements (spacing — high priority)

### 1.1 Travel page: the floating nav pill overlaps the section eyebrow on phones

`.site-nav-links a` (`save-the-date.css:385‑398`) has no `white-space:
nowrap`, so on the travel page — whose nav carries three links, two of them
two- and three-word phrases ("Where to Stay", "The Weekend") — the labels
wrap to two lines once the pill's `max-width: calc(100% - 2 * var(--gutter))`
(line 344) gets tight. The `@media (max-width: 400px)` rule at line 435
already drops the "Sarah & Spencer" wordmark to relieve horizontal
crowding, but it doesn't stop the link labels themselves from wrapping —
and at 390px CSS width they still do, on every section, not just when a
long label happens to be the active one.

Measured in a real render at 390×844 (iPhone 12/13/14 width):

| | height |
|---|---|
| Nav pill on `index.html` (2 short links, no wrap) | **57px** |
| Nav pill on `travel/index.html` ("Where to Stay" + "The Weekend" both wrapped) | **77px** |

That's a 35% taller pill than the site's other page ever produces. The
sub-page clearance that's supposed to hold content clear of the fixed nav —
`.page-sub .paper { padding-top: calc(3.4rem + var(--safe-t)); }`
(line 2097, 3.4rem = 54.4px) — was sized against the 57px case, not the
77px one. Scrolled to `#questions` at 390×844, the eyebrow ("QUESTIONS")
and the pill are measurably overlapping:

```
nav pill:  top 13.6  bottom 70.8   (height 57 on index.html; 77 on travel/)
eyebrow:   top 71.7  bottom 91.7
overlap (nav.bottom − eyebrow.top): 19px on the Questions section
```

Visually this reads as two stacked, overlapping copies of the section label
sitting under the pill — see the attached screenshot
(`mobile-11-faq-open.png`). The heading itself (`<h2>`) clears the pill by
only 13.7px, so even where the eyebrow survives, the whole page opens
noticeably more cramped under the nav than `index.html` ever does.

**Fix direction:** either give `.site-nav-links a` `white-space: nowrap` and
let the pill's own `max-width` calc shrink font/padding instead (the labels
are short enough that wrapping isn't buying legibility), or size
`.page-sub .paper`'s clearance from the *travel* page's worst case (77px +
some margin) rather than the shorter one, or make the clearance a value the
nav publishes itself (a `--nav-h` custom property set from
`ResizeObserver`/`getBoundingClientRect()` in `site-nav.js`/`travel.js`,
the same "publish one number" pattern the mosaic already uses for
`--mosaic-p`) so it's correct at every width instead of a guessed constant.

### 1.2 Hero: the audio toggle and the scroll cue overlap on phones ≤360px wide

`.audio-toggle` sits fixed at `left: calc(1rem + var(--safe-l))`
(line 2185) and `.hero-cue` centers itself at `left: 50%` with
`transform: translateX(-50%)` (line 934‑944) — two independently-positioned
elements that were never checked against each other's actual footprint.
Both are anchored to nearly the same bottom band (`.audio-toggle` at
`bottom: 1rem`, `.hero-cue` at `bottom: 1.4rem`), and the cue's tap target
is deliberately generous — "the whole label-plus-arrow column" per its own
comment at line 930‑932, ~230px wide.

Measured at real phone widths:

| Viewport | Gap between audio-toggle's right edge and hero-cue's left edge |
|---|---|
| 320px (iPhone SE 1st gen / smallest still-supported width) | **−17px — the two hit targets physically overlap** |
| 360px (the most common Android CSS width) | **3px — visually touching** |
| 390px (iPhone 12/13/14) | 18px — comfortable |

Below ~375px, a tap meant for the scroll cue can land on the audio toggle
(or vice versa) — two controls with different, unrelated jobs sharing the
same touch zone. This directly cuts against the "predictable, unambiguous
hit target" half of the response/direct-manipulation principles, and at
320px it's not a near-miss, it's a real overlap.

**Fix direction:** the cue is centered and doesn't need to be — nudge its
`left`/`transform` a few px right of dead-center below ~400px, or drop the
audio toggle's `left` inset slightly and cap the cue's tap-target width on
narrow viewports so the two boxes provably never intersect (check with the
same kind of `getBoundingClientRect()` measurement used above, not by eye).

### 1.3 Mosaic: the nav pill has only ~7px of clearance above the top-left photo

Once the site nav reveals itself (`.hero-viewport` has cleared) and a
guest scrolls into the mosaic, the sticky nav pill and the mosaic's
top-left satellite card (`.m-tl`) occupy the same region of the screen for
the final ~30% of the mosaic's scroll runway (satellites finish arriving at
`--mosaic-p` = .88, line 1375). Measured at 390×844 with the mosaic
assembled:

```
nav pill bottom: 70.75px
m-tl top:        77.89px
gap: 7.14px
```

The nav's own §1.5 comment is explicit that it must "never appear over the
hero — not at low opacity, not as a scrim" — that discipline was applied to
the hero, but the mosaic (which the nav is gated to appear *during*, since
it only shows once the hero has scrolled past) wasn't checked against the
same standard. 7px is not an overlap, but it's tight enough that the
photo's rounded corner and the pill's drop shadow visually crowd each
other — there's no room for the pill's own shadow to read as separate from
the card underneath it.

**Fix direction:** either add a small top offset/margin to `.m-tl` at
narrow widths, or give the nav pill a subtle backdrop scrim in this region
specifically, matching the intent already applied to the hero.

---

## 2 · Typography — tracking is not size-specific across the three display headings

The Apple typographic discipline this site otherwise follows closely
(§15: negative tracking as display text gets large, positive tracking only
for small tracked caps) is inconsistently applied across the site's three
largest headings, all set in the same display face (Cormorant Garamond) at
comparable optical sizes:

| Selector | Size (clamp) | Letter-spacing | Location |
|---|---|---|---|
| `.celebrate` | 2.6rem → **5.5rem** | **−0.012em** (documented, correct direction) | `save-the-date.css:1175‑1178` |
| `.sheet-title` | 2.2rem → 3.1rem | **+0.012em** (positive, on a display heading) | `save-the-date.css:1133‑1136` |
| `.travel-hero-title` | 2.4rem → 3.6rem | *(none set — inherits `normal`/0)* | `save-the-date.css:2506‑2513` |

`.celebrate` is the one place in the file with a comment explaining the
tracking choice ("large display text wants negative tracking" is exactly
the apple-design rule). `.sheet-title` — which reaches a comparable size
range on desktop (3.1rem ≈ 50px) — gets *positive* tracking with no
comment justifying the reversal, and `.travel-hero-title`, larger still on
desktop (3.6rem ≈ 58px, bigger than `.sheet-title` ever gets), gets no
tracking adjustment at all. Three headings of similar visual weight
currently read with three different amounts of letter openness, which is
the kind of inconsistency the file's own commenting discipline elsewhere
would normally have caught and explained.

**Fix direction:** bring `.sheet-title` to ~0 or a small negative value
(it's Cormorant at display size, the same case `.celebrate` already makes),
and give `.travel-hero-title` the same small negative tracking `.celebrate`
uses, scaled to taste. Not a rewrite — a one-line change on two selectors.

---

## 3 · Gesture fidelity — the lightbox photo swipe doesn't track the finger

`travel.js:598‑606` implements the lodging lightbox's photo swipe as a pure
final-state gesture:

```js
var startX = null;
mediaEl.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
mediaEl.addEventListener('touchend', function (e) {
  if (startX === null) return;
  var dx = e.changedTouches[0].clientX - startX;
  startX = null;
  if (Math.abs(dx) < 40) return;
  showPhoto(photoIndex + (dx < 0 ? 1 : -1));
}, { passive: true });
```

Nothing reads `touchmove`. The photo track (`.lightbox-photo-track`) is a
plain CSS `transition: transform .35s var(--ease-out)` (line 3016‑3019)
between two fixed states — it never moves while the finger is actually
down, only jumps a fixed 100% after release, on a fixed-duration curve
regardless of how fast or slow the swipe was. This is close to the exact
anti-pattern called out in the apple-design skill's §2 (direct
manipulation — "touch and content should move together") and §10 ("avoid
recognizers that only report a final state — they throw away the
continuous tracking you need for feedback"): a guest's finger and the photo
never move together, there's no rubber-band at the first/last photo (a
swipe past either end just does nothing, silently), and a fast flick and a
slow drag animate identically.

This is the one clearly gesture-driven surface on the site (the rest —
button taps, hover-expand carousel panels, `<details>` accordions — are
discrete, not drag-based, so §2/§5/§6's velocity-handoff rules don't apply
to them). It's a good, contained candidate if the site ever wants a single
example of the fuller apple-design gesture treatment: 1:1 `pointermove`
tracking of the track's `translateX`, a rubber-band at the first/last
photo instead of a silent no-op, and a velocity-aware settle instead of the
fixed `.35s` on release.

**Fix direction:** not a small patch like §§1‑2 — this is a real rewrite of
the swipe handler (Pointer Events + `setPointerCapture`, position/velocity
history, a spring or velocity-scaled transition on release). Flagging it as
a "if you want the site's one true gesture surface to earn that
treatment" item, not a quick fix.

---

## 4 · Spacing craft — no formal scale, only `--gutter`

The file defines exactly one spacing token (`--gutter`, line 103) and one
gutter-adjacent set of safe-area insets. Every other margin, padding and
gap on the site is a one-off `rem` or `clamp()` value chosen per component
— `.field { margin-bottom: 1.6rem }`, `.stepper { margin-bottom: 2.4rem }`,
`.weekend-card { padding: 1.5rem 1.6rem 1.6rem; margin-bottom: 1.2rem }`,
`.faq-item summary { padding: 1.1rem 1.7rem }`, `.local-contact { padding:
1.6rem 1.5rem }`, and so on. None of these individually looks wrong in the
rendered screenshots — the file's habit of leaving a comment on every
non-obvious number (visible throughout §§1‑11) has clearly kept this from
drifting into visible inconsistency so far. But there's no shared scale
(no `--space-1`/`--space-2`/etc.) underneath that discipline, which is
exactly the situation §16's "nothing is random — every spacing value is a
deliberate choice you can defend" warns tends to erode quietly as a
codebase grows past one author. Two components asking for conceptually the
same gap today land on 1.5rem, 1.6rem or 1.7rem depending on which
component and which day it was written — none is wrong, but nothing forces
them to agree either.

**Fix direction:** not urgent, and not something to retrofit everywhere at
once. Worth introducing a small scale (e.g. `--space-2xs` through
`--space-xl`, ~6-8 steps) the next time a component's spacing is touched
anyway, rather than a repo-wide find/replace that risks nudging pixels
nobody asked to change.

---

## What's already right (context for the above)

Worth stating plainly so the four sections above don't read as more
critical than they are: touch targets are audited to the 44px floor
site-wide with comments citing WCAG 2.5.5, focus rings are a real 2.5px
ring rather than a rumor, every animated surface has a considered
`prefers-reduced-motion` fallback (not just a duration clamp),
`forced-colors`/`prefers-contrast` are handled, the two-font system and its
minimum sizes are documented and enforced, materials use real
`backdrop-filter` with vibrancy-appropriate ink colors rather than flat
translucent panels, and — per the 08-11 audit — the motion timing itself
(easing tokens, interruptibility of the flow-button, `--mosaic-p`
compositor-only animation) is already close to the standard this skill
describes. The four issues above are specific and fixable, not signs of a
system that needs rethinking.
