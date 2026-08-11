# Website audit — 2026-08-11

Full audit of the live save-the-date site, run with three tools: [Impeccable](https://github.com/pbakaus/impeccable)'s deterministic anti-pattern detector, a manual motion/animation review against Emil Kowalski–style craft standards, and 21st.dev's component catalog for micro-interaction reference.

**Scope.** "Live" means what a guest can reach: `index.html`, `save-the-date.html`, `lodging.html`, `travel/index.html`, and their shared `assets/css/save-the-date.css` / `assets/js/*.js`. `archive/full-site/` is explicitly parked per the repo README ("not linked from the save the date and is not part of the public experience yet") and is called out separately below rather than mixed into the live findings.

**Two fixes are already applied on this branch** (see commit): the form's overall progress rail and a copy-to-clipboard toast race. Both are described in detail below. Everything else is a finding for you to decide on — nothing else was changed.

---

## 1. Impeccable automated scan

`npx impeccable detect --json .` (v3.5.0) found 82 issues total: **58 in the parked `archive/full-site/`** (not reviewed in detail here — that page predates the current design language and is a separate future effort) and **24 on the live site**. Of the 24 live findings, several are false positives or intentional choices given this project's own documented conventions; the real ones are called out.

### Real, actionable

| Severity | Finding | Where | Notes |
|---|---|---|---|
| Warning | Interactive text below the 11px legibility floor | `index.html` — `<em class="step-optional">(optional)</em>` in the phone-number step question, `.step-optional { font-size: .62em }` (`save-the-date.css:1811-1816`) | Impeccable measured ~9.9px on narrow viewports. Worth confirming the rendered size in DevTools at 375px width; if it's under 11px, bump `.step-optional` to `.7em`–`.75em` or a fixed `.72rem` so it clears the floor without competing with the question text. |
| Warning | `overflow:hidden`/`clip` wrapping an absolutely-positioned child on `travel/index.html` | `html` and `body.page-sub.travel-page` | Flagged because a clipping ancestor can cut off anything that later needs to escape it (tooltips, dropdowns, position:fixed children misbehaving on iOS). Nothing on the travel page currently needs to escape, so this is a latent risk rather than a live bug — worth a re-check if a tooltip/menu is ever added to that page. |
| Advisory | 29 em-dashes in `travel/index.html` body copy | Travel & Stay page | Impeccable's "AI cadence" heuristic. Your travel copy is dense reference material (flights, shuttles, lodging) where em-dashes are doing real parenthetical work, not filler — read it yourself and trim only the ones that don't earn their place. |

### Flagged but not actionable (context the detector doesn't have)

These are Impeccable's generic "looks like default AI SaaS output" heuristics, and they fire on *any* warm/gold palette on a dark background — which is this site's palette, on purpose, per the README ("a deliberate palette, not the safe warm off-white"):

- **`dark-glow` / `radial-halo`** (index.html, lodging.html, travel/index.html) — the warm gold box-shadow/radial wash behind the hero content on the dark envelope scene. This is bespoke art direction (the Whitefish Lake painting + gold accent language), not a generic purple-gradient tell. No change recommended.
- **`cream-palette`** (save-the-date.html → redirects to index.html) — same story; the cream/paper background is the whole visual identity, chosen deliberately (README: "Cormorant Garamond... EB Garamond").
- **`hero-eyebrow-chip`** (lodging.html "Whitefish, Montana" above "Lodging", travel/index.html "Whitefish, Montana" above "Travel & Stay") — a tracked-caps location label above the page title. This reads as a place kicker on a wedding sub-page, not a SaaS hero pattern. Leave as-is unless you want to fold it into the `<h1>` for other reasons.
- **`flat-type-hierarchy`** ("Sizes: 12.5/15.2/16.3/17.4px, ratio 1.4:1") on all three sub-pages — this is `--t-micro`/`--t-small`/`--t-body`/`--t-lead`, which the README documents as an intentional, restrained editorial type ramp, not an accident.
- **`low-contrast`** on `index.html` (`#c49f6c` on `#f2ebdd`, 2.1:1) — that gold (`--gold`, "ampersand + accents" per its own code comment) is used only on the decorative italic ampersand inside the envelope card, not on body copy. Cosmetic/large-display use; not a legibility issue in context.
- **`broken-image`** ×2 in `save-the-date.css` — false positive. The detector matched the literal string `<img>` inside a CSS *comment* explaining the mosaic's `<picture>` wrapper, not an actual empty `<img>` tag.
- **`cramped-padding`** on `.form-done` / `.lodging-pending` — both are informational panels bounded by a soft, low-contrast rule rather than a hard border; recommend a quick eyeball check in-browser, but this is a borderline call the detector can't make from static CSS alone.

---

## 2. Animation & motion review

The honest headline: **this codebase's motion is unusually careful already.** It has its own easing tokens (`--ease-out`, `--ease-soft`, `--ease-inout`, `--ease-reveal`), a real `prefers-reduced-motion` block that individually re-specifies every animated component rather than just killing durations, passive+rAF-throttled scroll listeners with a `ticking` guard, and inline comments that document *why* a specific property was chosen for performance (e.g. "scale stays on the compositor, width/height would relayout on every frame" for the button's ink-flood). That's a higher bar than most production sites clear. Findings below are the exceptions to that bar, not a wholesale critique.

| # | Severity | Category | Location | Finding | Status |
|---|---|---|---|---|---|
| 1 | Medium | Performance / cohesion | `assets/css/save-the-date.css:1766-1772` (`.stepper-rail-fill`), driven by `assets/js/save-the-date.js:987` | The form's overall progress rail animated `width` on every step change — a layout-triggering property — while the *adjacent* `.step-link::after` connector-fill (six lines above, same file) does the identical left-to-right fill with `transform: scaleX()`. The codebase itself states the rule this violated: `.m-hero`'s comment at `save-the-date.css:1417-1427` says outright *"This is the one element on the page that animates width and height... The five satellites stay transform-only."* The rail wasn't meant to be a second exception. | **Fixed on this branch.** `.stepper-rail-fill` now uses `transform: scaleX()` from a fixed `width:100%`, origin `left`; the JS sets `rail.style.transform = 'scaleX(n)'` instead of `.style.width`. Verified with a headless-browser check: renders `scaleX(0.25)` / `scaleX(0.5)` at steps 1/2, pixel-identical to the old `25%`/`50%` widths. |
| 2 | Low | Interruptibility | `assets/js/travel.js` — "Copy the group code" button's toast (`~line 504-515`) | `setTimeout(..., 1800)` to auto-hide the toast wasn't tracked. Clicking "copy" twice within 1.8s queued two independent timers; the first one could fire and hide the toast while the second click's 1.8s window was still supposed to be showing it — a visible flicker on a fast double-click. | **Fixed on this branch.** The timeout handle is now stored and `clearTimeout`'d before a new one is set, so only the most recent click's timer controls the hide. |
| 3 | Low (feel-check, not applied) | Easing | `assets/css/save-the-date.css:886-889` — `.flow-btn__arrow` `left`/`right` transition | Uses `cubic-bezier(.34, 1.56, .64, 1)`, a back-out/overshoot curve — the one un-eased curve in an otherwise consistent set of `--ease-*` tokens. It may well be a deliberate "the arrow flies past and settles" choice (the button's other three transitions are all restrained `ease`-family curves), so this isn't a confident "fix it" — it's a "play it on a real device and decide if the overshoot reads as playful or as the dated bounce/elastic tell Impeccable's own anti-pattern list warns against." If it reads as bouncy, swap to `var(--ease-out)` to match the rest of `.flow-btn`. |
| 4 | Low (documented tradeoff, not applied) | Performance / cohesion | Same block, `.flow-btn__arrow--in`/`--out` animate `left`/`right` rather than `transform: translateX()` | Technically the same "layout property" pattern as #1, and the *ink* flood two rules below explicitly avoids this for performance. In practice the box being animated is a single 1em×1em icon inside its own button — not full-width, no sibling reflow — so the real-world cost is closer to `.m-hero`'s justified exception than to the rail's. Converting cleanly is non-trivial: the resting positions are percentages of the button's own (variable, content-driven) width, so a transform-based equivalent needs per-button pixel measurement in JS, not a pure CSS swap. Flagging for awareness; not worth the added complexity unless profiling ever shows it costing real frames. |
| — | — | Missed opportunity | `.field-err` (`save-the-date.css:1621-1633`) | Every other state change in the form eases (border-color, background, box-shadow all have `.3s var(--ease-soft)` transitions); the error message itself pops in/out via a bare `[hidden]` toggle with no transition at all. A ~160ms opacity+4px-translateY fade using the form's own `--ease-out` token (matching the existing `step-in`/`done-in` keyframe idiom) would close that one gap without inventing new motion language. |
| — | — | Missed opportunity | Countdown digit-flip (`@keyframes countdown-flip`, `calendar.js` `setCell()`) | Already does the right thing (only retriggers the flip on cells whose value actually changed, respects `reduced`) — flagging as a *positive* finding, since it's exactly the "animate only what changed" discipline that's often missing elsewhere. No action needed. |

**Reduced-motion coverage** was reviewed line-by-line (`save-the-date.css:2271-2349`) and is genuinely thorough — every component gets an explicit, considered reduced-motion rule rather than a blanket duration override, including for state that's re-triggerable (the mosaic bails before even attaching a scroll listener). No gaps found.

---

## 3. 21st.dev — pattern inspiration

This site is hand-written vanilla HTML/CSS/JS, not React, so nothing here is a drop-in install (`npx shadcn add ...` targets a React/Tailwind stack). These are conceptual references worth stealing the *idea* from, adapted by hand into the existing vanilla patterns:

- **[Copy Button](https://21st.dev/@ddoemonn/components/copy-button)** — animates between idle/copied/error states with a crossfading label and an SVG check-draw, plus its own reduced-motion handling. Directly relevant to finding #2 above: once the timer race is fixed, the next-level version of that same toast would crossfade the button's own label text ("Copy the code" → "Copied ✓") instead of (or alongside) the separate toast span, which reads faster than a toast the eye has to travel to.
- **[Animate Digits](https://21st.dev/@unlumen/components/animate-digits)** — blur-slides only the digits that changed. Confirms the countdown's existing "only retrigger what changed" approach (see table above) is the right instinct, not something to import.
- **[Elegant Carousel](https://21st.dev/@dev.yadhakim/components/elegant-carousel)** — editorial split-panel layout with cross-fade + Ken Burns zoom, decorative frame corners. The frame-corner detail is close to the mosaic's existing `.m-frame` border treatment; if the mosaic ever gets a "view full photo" state, this is the reference for how to stage that transition without a jarring full-screen jump-cut.
- **Multi-step form / wizard components** (several results) were consistently *less* considered than what's already built here — accordion-style or generic Framer Motion slide transitions, no equivalent to this form's optional-field callout, live-region step announcements, or the connector-fill idiom. Nothing to adopt; noting it so the form isn't second-guessed against generic examples that are actually behind it.

---

## Summary

- **Design (Impeccable):** 3 real, worth-fixing items (undersized optional-field label, a latent overflow-clip risk on the travel page, an em-dash density worth a copy pass) out of 24 live-site findings; the rest are the detector's generic AI-slop heuristics misfiring against this site's deliberate, documented warm palette and restrained type ramp.
- **Animation:** the motion system is well above the median bar already. Two real inconsistencies against the codebase's own stated rules were found and fixed (progress rail, copy-toast race). Two more are flagged for a judgment call/feel-check rather than fixed outright, plus one small missed-opportunity (error message transition) and one thing that's already being done right (countdown digit discipline).
- **21st.dev:** confirmed direction rather than new work — the form and countdown patterns already used here hold up well against the catalog; the one adoptable idea is crossfading the copy-button's own label instead of relying solely on a side toast.
