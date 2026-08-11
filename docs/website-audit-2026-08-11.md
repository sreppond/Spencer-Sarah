# Website audit — 2026-08-11

Full audit of the live save-the-date site, run with three tools: [Impeccable](https://github.com/pbakaus/impeccable)'s deterministic anti-pattern detector, a manual motion/animation review against Emil Kowalski–style craft standards, and 21st.dev's component catalog for micro-interaction reference.

**Scope.** "Live" means what a guest can reach: `index.html`, `save-the-date.html`, `lodging.html`, `travel/index.html`, and their shared `assets/css/save-the-date.css` / `assets/js/*.js`. `archive/full-site/` is explicitly parked per the repo README ("not linked from the save the date and is not part of the public experience yet") and is called out separately below rather than mixed into the live findings.

**Update (same day, follow-up pass):** every open finding below was individually run down — verified in a real headless browser where the claim was checkable, read in context where it was a judgment call — and either fixed or explicitly left with the reasoning for why. Four fixes are on this branch in total: the form's progress rail, a copy-to-clipboard toast race, a fade-in for form validation errors, and a crossfading label on the lodging copy-code button. Everything else was deliberately left as-is; each item below says why.

---

## 1. Impeccable automated scan

`npx impeccable detect --json .` (v3.5.0) found 82 issues total: **58 in the parked `archive/full-site/`** (not reviewed in detail here — that page predates the current design language and is a separate future effort) and **24 on the live site**. Of the 24 live findings, several are false positives or intentional choices given this project's own documented conventions; the real ones are called out.

### Run down and resolved (no code change needed)

| Finding | Verdict | How it was checked |
|---|---|---|
| Interactive text below the 11px legibility floor — `<em class="step-optional">(optional)</em>`, `.step-optional { font-size: .62em }` | **False positive.** Renders at **14.4px**, well clear of the floor. | Impeccable's static analyzer can't resolve `.step-q`'s `clamp(1.45rem, 5.6vw, 1.75rem)` parent font-size, so it fell back to the UA default of 16px — `.62 × 16 = 9.92px`, exactly the number it reported. Measured the real computed style in a headless Chromium render at 320px and 375px viewports: `14.384px` both times. No change made. |
| `overflow:hidden`/`clip` wrapping a positioned child on `travel/index.html` (`html`, `body.page-sub.travel-page`) | **Necessary, not a bug.** Left as-is. | This is `overflow-x: hidden` on `html` (`save-the-date.css:126-127`), the standard guard against a horizontal scrollbar from full-bleed decorative elements — which this site has (the hero painting, the mosaic's satellites flying in from the edges). Nothing on the travel page currently needs to escape that boundary (no tooltip, no dropdown, no off-canvas panel), so there's no live bug to fix. Removing it defensively would risk *introducing* a real horizontal-scroll bug for no benefit. Re-check only if a popover/tooltip is ever added to that page. |
| 29 em-dashes in `travel/index.html` body copy | **Read in full; kept.** | Every visible-copy em-dash on the page follows one deliberate, consistent pattern — `City — Airline`, `Lodge name — one-line description. $$$$` — used as a scannable label/value separator across two long reference lists (flights, lodging options), not scattered through flowing prose. That's a legitimate structural device, and it matches the voice used throughout the rest of the site (including this repo's own README). Trimming would fight the established voice for no clarity gain, so nothing was cut. |

### Flagged but not actionable (context the detector doesn't have)

These are Impeccable's generic "looks like default AI SaaS output" heuristics, and they fire on *any* warm/gold palette on a dark background — which is this site's palette, on purpose, per the README ("a deliberate palette, not the safe warm off-white"):

- **`dark-glow` / `radial-halo`** (index.html, lodging.html, travel/index.html) — the warm gold box-shadow/radial wash behind the hero content on the dark envelope scene. This is bespoke art direction (the Whitefish Lake painting + gold accent language), not a generic purple-gradient tell. No change recommended.
- **`cream-palette`** (save-the-date.html → redirects to index.html) — same story; the cream/paper background is the whole visual identity, chosen deliberately (README: "Cormorant Garamond... EB Garamond").
- **`hero-eyebrow-chip`** (lodging.html "Whitefish, Montana" above "Lodging", travel/index.html "Whitefish, Montana" above "Travel & Stay") — a tracked-caps location label above the page title. This reads as a place kicker on a wedding sub-page, not a SaaS hero pattern. Leave as-is unless you want to fold it into the `<h1>` for other reasons.
- **`flat-type-hierarchy`** ("Sizes: 12.5/15.2/16.3/17.4px, ratio 1.4:1") on all three sub-pages — this is `--t-micro`/`--t-small`/`--t-body`/`--t-lead`, which the README documents as an intentional, restrained editorial type ramp, not an accident.
- **`low-contrast`** on `index.html` (`#c49f6c` on `#f2ebdd`, 2.1:1) — that gold (`--gold`, "ampersand + accents" per its own code comment) is used only on the decorative italic ampersand inside the envelope card, not on body copy. Cosmetic/large-display use; not a legibility issue in context.
- **`broken-image`** ×2 in `save-the-date.css` — false positive. The detector matched the literal string `<img>` inside a CSS *comment* explaining the mosaic's `<picture>` wrapper, not an actual empty `<img>` tag.
- **`side-tab`** on `.weekend-card` (`save-the-date.css:2883`, `border-left: 3px solid var(--rule)`) — the detector's heuristic is any solid `border-left` on a card, but `--rule` (`#cdbca6`, "hairline rules") is the same muted neutral tone used for all 24 other rules/dividers on the site, not a saturated accent stripe. It's a quiet structural marker, not the loud colored-tab tell the rule is meant to catch.
- **`cramped-padding`** on `.form-done` / `.lodging-pending` — both are informational panels bounded by a soft, low-contrast rule rather than a hard border; recommend a quick eyeball check in-browser, but this is a borderline call the detector can't make from static CSS alone.

*Re-ran the detector after the fixes below: 22 findings remain (down from 24 — the fixed rail's `width` transition no longer triggers `layout-transition`), all in this "not actionable" list.*

---

## 2. Animation & motion review

The honest headline: **this codebase's motion is unusually careful already.** It has its own easing tokens (`--ease-out`, `--ease-soft`, `--ease-inout`, `--ease-reveal`), a real `prefers-reduced-motion` block that individually re-specifies every animated component rather than just killing durations, passive+rAF-throttled scroll listeners with a `ticking` guard, and inline comments that document *why* a specific property was chosen for performance (e.g. "scale stays on the compositor, width/height would relayout on every frame" for the button's ink-flood). That's a higher bar than most production sites clear. Findings below are the exceptions to that bar, not a wholesale critique.

| # | Severity | Category | Location | Finding | Status |
|---|---|---|---|---|---|
| 1 | Medium | Performance / cohesion | `assets/css/save-the-date.css:1766-1772` (`.stepper-rail-fill`), driven by `assets/js/save-the-date.js:987` | The form's overall progress rail animated `width` on every step change — a layout-triggering property — while the *adjacent* `.step-link::after` connector-fill (six lines above, same file) does the identical left-to-right fill with `transform: scaleX()`. The codebase itself states the rule this violated: `.m-hero`'s comment at `save-the-date.css:1417-1427` says outright *"This is the one element on the page that animates width and height... The five satellites stay transform-only."* The rail wasn't meant to be a second exception. | **Fixed on this branch.** `.stepper-rail-fill` now uses `transform: scaleX()` from a fixed `width:100%`, origin `left`; the JS sets `rail.style.transform = 'scaleX(n)'` instead of `.style.width`. Verified with a headless-browser check: renders `scaleX(0.25)` / `scaleX(0.5)` at steps 1/2, pixel-identical to the old `25%`/`50%` widths. |
| 2 | Low | Interruptibility | `assets/js/travel.js` — "Copy the group code" button's toast (`~line 504-515`) | `setTimeout(..., 1800)` to auto-hide the toast wasn't tracked. Clicking "copy" twice within 1.8s queued two independent timers; the first one could fire and hide the toast while the second click's 1.8s window was still supposed to be showing it — a visible flicker on a fast double-click. | **Fixed on this branch.** The timeout handle is now stored and `clearTimeout`'d before a new one is set, so only the most recent click's timer controls the hide. |
| 3 | Low | Easing | `assets/css/save-the-date.css:886-889` — `.flow-btn__arrow` `left`/`right` transition | Uses `cubic-bezier(.34, 1.56, .64, 1)`, a back-out/overshoot curve — the one un-eased curve in an otherwise consistent set of `--ease-*` tokens. **Kept, deliberately.** This is a single overshoot-and-settle on a small icon whose own comment says it's meant to read as "a single arrow passing through the button" — that's a purposeful flight-and-land motion, not the multi-oscillation elastic/bounce that Impeccable's own anti-pattern list (and animation craft standards generally) actually warn against. Changing it to match the button's other restrained curves would make the arrow feel like it's just sliding, losing the one moment of character in an otherwise minimal component. Not changed. |
| 4 | Low | Performance / cohesion | Same block, `.flow-btn__arrow--in`/`--out` animate `left`/`right` rather than `transform: translateX()` | **Kept, deliberately.** The resting positions are percentages of the *button's* own content-driven width (`left: -25%`), which only resolves against a `left`/`right` containing block — `transform`'s percentage syntax resolves against the icon's own tiny box instead, so there's no drop-in CSS equivalent. A real fix means JS measuring each button's rendered width on load and resize and feeding it in as a custom property — genuine added surface area (a resize listener, a new invalidation path) to save a browser from laying out a single 16-20px icon, which is materially different from the rail's case (a full-width bar) or `.m-hero`'s (the mosaic's biggest element). Not worth the complexity for a cost this small. |
| 5 | Low | Missed opportunity → **fixed** | `.field-err` (`save-the-date.css:1621-1633`) | Every other state change in the form eases (border-color, background, box-shadow all have `.3s var(--ease-soft)` transitions); the error message itself popped in/out via a bare `[hidden]` toggle with no motion. **Fixed:** added `@keyframes field-err-in` (opacity + 4px translateY, `.2s var(--ease-out)`) as an `animation` rather than a `transition`, since a `display:none → flex` toggle can't be transitioned — same technique the form already uses for `.gform.is-stepped .step`'s `step-in`. Verified in a headless render: fades in correctly, and `prefers-reduced-motion: reduce` clamps its duration to `.01ms` via the existing blanket rule with no extra CSS needed. |
| — | — | Missed opportunity → **adopted from 21st.dev** | Lodging "copy the group code" button, `assets/js/travel.js` / `assets/css/save-the-date.css:2795-2818` | See §3 below — the button's own label now crossfades to "Copied ✓" instead of relying solely on the adjacent toast. |
| — | — | Already correct | Countdown digit-flip (`@keyframes countdown-flip`, `calendar.js` `setCell()`) | Already does the right thing (only retriggers the flip on cells whose value actually changed, respects `reduced`) — flagging as a *positive* finding, since it's exactly the "animate only what changed" discipline that's often missing elsewhere. No action needed. |

**Reduced-motion coverage** was reviewed line-by-line (`save-the-date.css:2271-2349`) and is genuinely thorough — every component gets an explicit, considered reduced-motion rule rather than a blanket duration override, including for state that's re-triggerable (the mosaic bails before even attaching a scroll listener). No gaps found.

---

## 3. 21st.dev — pattern inspiration

This site is hand-written vanilla HTML/CSS/JS, not React, so nothing here is a drop-in install (`npx shadcn add ...` targets a React/Tailwind stack). These are conceptual references worth stealing the *idea* from, adapted by hand into the existing vanilla patterns:

- **[Copy Button](https://21st.dev/@ddoemonn/components/copy-button)** — animates between idle/copied/error states with a crossfading label and an SVG check-draw, plus its own reduced-motion handling. **Adopted:** the "Copy the group code" button now has a second `<span>` layered in the same grid cell as the default label (`grid-area: 1 / 1`, so the box always sizes to the taller of the two — verified zero layout shift between states in a headless render) that crossfades to "Copied ✓" on click, colored with the existing `--olive` token. The separate toast (`role="status"`) stays as the screen-reader announcement; the button's own labels are `aria-hidden` and purely the fast, eye-level visual feedback right where the guest already clicked, rather than a toast half a line away. Shares the same tracked-timeout fix as #2 above.
- **[Animate Digits](https://21st.dev/@unlumen/components/animate-digits)** — blur-slides only the digits that changed. Confirms the countdown's existing "only retrigger what changed" approach (see table above) is the right instinct, not something to import.
- **[Elegant Carousel](https://21st.dev/@dev.yadhakim/components/elegant-carousel)** — editorial split-panel layout with cross-fade + Ken Burns zoom, decorative frame corners. The frame-corner detail is close to the mosaic's existing `.m-frame` border treatment; if the mosaic ever gets a "view full photo" state, this is the reference for how to stage that transition without a jarring full-screen jump-cut.
- **Multi-step form / wizard components** (several results) were consistently *less* considered than what's already built here — accordion-style or generic Framer Motion slide transitions, no equivalent to this form's optional-field callout, live-region step announcements, or the connector-fill idiom. Nothing to adopt; noting it so the form isn't second-guessed against generic examples that are actually behind it.

---

## Summary

Every finding from the initial pass was run to ground. Final tally:

**Fixed (4):**
1. Form progress rail — `width` → `transform: scaleX()`, matching the codebase's own stated rule.
2. Copy-code toast — tracked `setTimeout` so a fast double-click can't hide it early.
3. Form validation errors — added the fade-in the rest of the form already has everywhere else.
4. Lodging copy-code button — label now crossfades to "Copied ✓" (21st.dev-inspired), no layout shift, screen-reader announcement unchanged.

**Verified as false positives, no change (3):** the "(optional)" label's real rendered size (14.4px, not the ~9.9px the static analyzer guessed), the six generic "AI slop" design heuristics (dark-glow, radial-halo, cream-palette, hero-eyebrow-chip, flat-type-hierarchy, low-contrast-on-decorative-glyph) that fire on any warm palette regardless of whether it's deliberate, and the CSS-comment `<img>` string match.

**Deliberately left as-is, with reasoning (4):** the `overflow-x:hidden` on `html` (it's load-bearing, not a bug), the travel page's em-dash density (a consistent, legitimate structural pattern, not filler), the button arrow's overshoot easing (purposeful character, not dated bounce), and the button arrow's `left`/`right` animation (real fix requires more complexity than the tiny performance cost justifies).

**Confirmed already correct (1):** the countdown's digit-flip only re-animates cells that actually changed.

Nothing was changed that the site's own README, code comments, or established visual language argued against.
