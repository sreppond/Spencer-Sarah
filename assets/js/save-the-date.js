/* ==========================================================================
   Sarah & Spencer — Save the Date

   Everything editable lives in assets/js/config.js. This file only
   knows how to animate, validate and submit.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.SAVE_THE_DATE || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Resolve a dotted path such as 'date.displayUpper' against the config. */
  function pick(path) {
    return path.split('.').reduce(function (o, k) {
      return (o == null) ? undefined : o[k];
    }, CFG);
  }


  /* ------------------------------------------------------------------
     Storage

     Three things about browser storage bite in practice, and all three
     bite on this page:

       · Safari in private mode *throws* on access rather than returning
         null, so every call has to be wrapped or the script dies on a
         line that was only trying to remember a preference;
       · a flag with no expiry outlives its meaning — "you have seen the
         envelope" is true for a week, not for three years;
       · a value written by an older version of this file may be a bare
         string rather than a record, and must not crash the read.

     So every value is stored as {v, t} and read back through a max age
     in days. A missing, expired, unparseable or inaccessible value all
     resolve to the same thing: null.
     ------------------------------------------------------------------ */
  var store = (function () {
    var ls = (function () {
      try {
        var area = window.localStorage;
        area.setItem('std:probe', '1');
        area.removeItem('std:probe');
        return area;
      } catch (e) { return null; }
    }());

    function clear(key) {
      if (!ls) return;
      try { ls.removeItem(key); } catch (e) {}
    }

    return {
      clear: clear,

      get: function (key, maxAgeDays) {
        if (!ls) return null;
        var raw;
        try { raw = ls.getItem(key); } catch (e) { return null; }
        if (!raw) return null;

        var rec;
        try { rec = JSON.parse(raw); } catch (e) { clear(key); return null; }
        if (!rec || typeof rec.t !== 'number') { clear(key); return null; }

        if (maxAgeDays && Date.now() - rec.t > maxAgeDays * 864e5) {
          clear(key);
          return null;
        }
        return rec.v;
      },

      set: function (key, value) {
        if (!ls) return;
        try { ls.setItem(key, JSON.stringify({ v: value, t: Date.now() })); } catch (e) {}
      }
    };
  }());


  /* ------------------------------------------------------------------
     Elements — every lookup shared across the sections below happens
     here, at the top, and nowhere else.

     This is not tidiness, it is the fix for a real bug. `var` hoists the
     declaration but not the lookup, so a section that ran its own
     `var el = $('#el')` beside its handlers handed `undefined` to
     anything the envelope called earlier in the file — and the envelope
     calls into the hero, the loop and the audio toggle synchronously on
     a repeat visit. The hero stayed hidden and the loop never started.
     The script is `defer`red, so the document is fully parsed by now.
     ------------------------------------------------------------------ */
  var scene = $('#envelope-scene');
  var envelope = $('#envelope');
  var envVideo = $('#envelope-video');
  var page = $('#page');
  var heroEl = $('#hero');
  var video = $('#hero-video');
  var audio = $('#ambient');
  var toggle = $('#audio-toggle');


  /* ------------------------------------------------------------------
     Content — config.js is authoritative; the HTML carries the same
     strings only so the page still reads without JavaScript.
     ------------------------------------------------------------------ */
  function applyConfig() {
    $$('[data-config]').forEach(function (el) {
      var value = pick(el.getAttribute('data-config'));
      if (typeof value !== 'string' || !value) return;
      var current = el.textContent.trim();
      if (current && current !== value && /localhost|127\.0\.0\.1/.test(location.hostname)) {
        console.warn(
          '[save-the-date] index.html says "' + current + '" but config.js says "' +
          value + '" for ' + el.getAttribute('data-config') +
          '. config.js wins — update the HTML mirror so crawlers agree.'
        );
      }
      el.textContent = value;
    });

    /* The hero lettering is baked artwork, so its alt text is the only
       readable copy there is. Keep it driven by config all the same. */
    $$('[data-config-alt]').forEach(function (el) {
      var value = pick(el.getAttribute('data-config-alt'));
      if (typeof value === 'string' && value) el.alt = value;
    });

    var metaArt = $('[data-hero-meta-alt]');
    if (metaArt && CFG.date && CFG.location) {
      metaArt.alt = CFG.date.display + ' — ' + CFG.location.display;
    }

    warnIfArtworkIsStale();
  }


  /* The hero title, divider and metadata were traced out of the painted
     reference and cannot re-typeset themselves. config.baked records what
     that artwork actually says, so changing a name in config.js without
     re-running tools/extract-typography.py is loud rather than silent. */
  function warnIfArtworkIsStale() {
    if (!/localhost|127\.0\.0\.1/.test(location.hostname)) return;
    var baked = CFG.baked;
    if (!baked) return;
    [
      ['couple', CFG.couple],
      ['date', CFG.date && CFG.date.display],
      ['location', CFG.location && CFG.location.display]
    ].forEach(function (pair) {
      if (baked[pair[0]] && pair[1] && baked[pair[0]] !== pair[1]) {
        console.warn(
          '[save-the-date] the hero artwork still reads "' + baked[pair[0]] +
          '" but config.js now says "' + pair[1] + '". Re-run ' +
          'tools/extract-typography.py (or redraw the assets) and update ' +
          'config.baked.' + pair[0] + '.'
        );
      }
    });
  }


  /* ------------------------------------------------------------------
     Envelope
     ------------------------------------------------------------------ */
  var opened = false;

  /* The ceremony is worth one viewing, not one per session. A guest who
     opened it in August and comes back in March to check the hotels
     should land straight on the page, not replay a 3-second animation a
     fourth time while they are trying to find something. 30 days is long
     enough to cover a real return visit and short enough that a genuinely
     new visit — someone the link gets forwarded to next spring — still
     gets the full thing. */
  var SEEN_KEY = 'std:opened';
  var SEEN_TTL_DAYS = 30;

  function alreadyOpened() {
    return store.get(SEEN_KEY, SEEN_TTL_DAYS) === true;
  }
  function rememberOpened() {
    store.set(SEEN_KEY, true);
  }

  /* Drop straight to the page with no envelope at all. Used for a repeat
     view in the same session, and for the skip control. */
  function bypassEnvelope() {
    if (opened) return;
    opened = true;
    root.classList.remove('is-sealed');
    if ('inert' in HTMLElement.prototype) page.inert = false;
    else page.removeAttribute('aria-hidden');
    if (scene) {
      scene.classList.add('is-gone');
      scene.setAttribute('aria-hidden', 'true');
      scene.style.display = 'none';
    }
    startHeroVideo();
    revealHero();
    revealAudioToggle();
  }

  function seal() {
    if (!scene || !envelope) return;
    root.classList.add('is-sealed');
    if ('inert' in HTMLElement.prototype) page.inert = true;
    else page.setAttribute('aria-hidden', 'true');
  }

  /* The hand-off used to run on a fixed clock tuned to a CSS transform
     sequence. Now the sequence is baked into the footage — the clip is
     cut to end on a held white frame — so the hand-off waits for the
     video's own `ended` event instead of guessing its length. That is
     also what keeps it seamless: nothing here can drift out of sync
     with what is actually on screen. */
  var envelopeFinished = false;

  function finishEnvelope() {
    if (envelopeFinished) return;
    envelopeFinished = true;

    root.classList.remove('is-sealed');
    if ('inert' in HTMLElement.prototype) page.inert = false;
    else page.removeAttribute('aria-hidden');
    scene.classList.add('is-gone');
    scene.setAttribute('aria-hidden', 'true');
    startHeroVideo();
    revealHero();
    revealAudioToggle();

    // Matches .env-scene's own .85s opacity fade (CSS §1) — by the time
    // this fires the scene is already fully transparent, so pulling it
    // out of the flow is invisible rather than an event of its own.
    setTimeout(function () {
      scene.style.display = 'none';
      page.setAttribute('tabindex', '-1');
      page.focus({ preventScroll: true });
      page.removeAttribute('tabindex');
    }, 900);
  }

  function playEnvelopeVideo() {
    // No video element, or nothing for it to play: there is nothing left
    // to show, so hand off immediately rather than strand the guest on a
    // frame that never moves.
    if (!envVideo || !envVideo.querySelector('source[src]')) { finishEnvelope(); return; }

    envVideo.addEventListener('ended', finishEnvelope, { once: true });
    // A codec this browser cannot decode, a failed fetch — same outcome
    // as no video at all.
    envVideo.addEventListener('error', finishEnvelope, { once: true });

    // Belt and braces: a codec this browser cannot decode sometimes fails
    // silently rather than telling us — no `error` event, no rejected
    // play(), `readyState` stuck at HAVE_NOTHING forever (confirmed against
    // Playwright's own decoder-less Chromium — see assets/video/README.md).
    // This flat deadline, comfortably past the clip's own ~5s runtime, is
    // what stops a guest on a browser like that from being stranded on a
    // frame that will never move. finishEnvelope() is idempotent, so this
    // is a silent no-op on every run where `ended` already fired first.
    setTimeout(finishEnvelope, 6500);

    // muted must be true as a property, not just an attribute, for iOS to
    // treat play() as allowed. The source track was stripped of audio at
    // export anyway (see assets/video/README.md), so nothing is lost.
    envVideo.muted = true;
    envVideo.defaultMuted = true;
    envVideo.currentTime = 0;
    var p = envVideo.play();
    // A refused play() (a policy this tap should already satisfy, but
    // belt and braces) is the same dead end as a missing file.
    if (p && p.catch) p.catch(finishEnvelope);
  }

  function openEnvelope() {
    if (opened || !envelope) return;
    opened = true;
    rememberOpened();

    envelope.classList.add('is-open');
    envelope.setAttribute('aria-disabled', 'true');
    scene.classList.add('is-opening');

    // Audio defaults on (see A6 below): this tap is the one gesture
    // available to satisfy the browser's autoplay policy, so it is now or
    // never for starting the ambient bed. A guest who has explicitly
    // turned it off before — on this visit or a remembered one — is the
    // one case that stays silent; everyone else gets it, with the toggle
    // at the hand-off below as the way to turn it back off.
    if (audioPreference() !== 'off') startAmbient();

    playEnvelopeVideo();
  }

  // config.js is authoritative for every asset path on the page; the HTML
  // carries the same two strings only as a static mirror (see the note at
  // the top of index.html). Applied unconditionally, before the reduced
  // motion and repeat-visit branches below, because it costs nothing even
  // on a run where the video never plays.
  if (envVideo) {
    var envMedia = CFG.media || {};
    if (envMedia.envelopePoster) envVideo.poster = envMedia.envelopePoster;
    var envSource = envVideo.querySelector('source');
    if (envSource && envMedia.envelopeVideo) envSource.src = envMedia.envelopeVideo;
  }

  if (scene && envelope) {
    // A guest who asked for less motion gets nothing from a full-screen 3D
    // ceremony and no stated way to skip it faster than 2.8s of waiting —
    // the gate does not appear for them at all, per §3.5's non-negotiables.
    if (reduced) {
      rememberOpened();
      scene.style.display = 'none';
      scene.setAttribute('aria-hidden', 'true');
      opened = true;
      revealHero();
      startHeroVideo();
      revealAudioToggle();
    // Seen it already inside the last 30 days? Never seal the page at all.
    } else if (alreadyOpened()) {
      scene.style.display = 'none';
      scene.setAttribute('aria-hidden', 'true');
      opened = true;
      revealHero();
      startHeroVideo();
      revealAudioToggle();
    } else {
      seal();

      // A full-screen gate with exactly one accepted interaction is the
      // page's largest liability if that interaction is missed entirely —
      // so if nothing has happened in 2.8s, open it for them. Anyone who
      // has already acted (tap, Enter/Space, Escape, skip) has flipped
      // `opened` to true by then, at which point this is a no-op.
      setTimeout(openEnvelope, 2800);

      var skip = $('#env-skip');
      if (skip) {
        skip.addEventListener('click', function () {
          rememberOpened();
          bypassEnvelope();
          page.setAttribute('tabindex', '-1');
          page.focus({ preventScroll: true });
          page.removeAttribute('tabindex');
        });
      }

      // Escape is what people press when a full-screen overlay has them.
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !opened) { rememberOpened(); bypassEnvelope(); }
      });

      envelope.addEventListener('pointerdown', function () {
        if (!opened) envelope.classList.add('is-pressed');
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
        envelope.addEventListener(evt, function () { envelope.classList.remove('is-pressed'); });
      });
      envelope.addEventListener('click', openEnvelope);
      // Space/Enter already fire click on a <button>; this only covers the
      // press affordance so keyboard use feels the same as touch.
      envelope.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && !opened) envelope.classList.add('is-pressed');
      });
      envelope.addEventListener('keyup', function () { envelope.classList.remove('is-pressed'); });

      // Anyone arriving mid-page (a #details link, a restored scroll position)
      // should not be trapped behind a ceremony they did not ask for.
      if (location.hash && location.hash !== '#top') {
        requestAnimationFrame(bypassEnvelope);
      }
    }
  }


  /* ------------------------------------------------------------------
     Hero reveal — the staged entrance, armed the moment the hero is
     actually on screen: after the envelope hands off, or immediately for
     anyone who skipped the envelope (deep link, no-JS-envelope, reduced
     motion). Everything it triggers is opacity and transform in CSS.
     ------------------------------------------------------------------ */
  var heroRevealed = false;

  function revealHero() {
    if (heroRevealed || !heroEl) return;
    heroRevealed = true;
    // Two frames: one for the initial (hidden) state to be committed,
    // one for the class change to transition from it rather than snap.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { heroEl.classList.add('is-revealed'); });
    });
  }


  /* ------------------------------------------------------------------
     Hero video — the still is the hero until the loop is actually ready.

     Autoplay contract: the element carries muted + playsinline + autoplay
     in the markup, which is what iOS actually checks, and we still call
     play() by hand so we can catch a rejection and keep the painting up
     instead of showing a dead frame. The video only fades in on `playing`,
     so a slow or refused start is invisible — the still never blinks.

     The portrait crop is optional and may not be in the repo. A source
     that 404s is still a source, so the element cannot tell the
     difference between "not shipped yet" and "broken" — it just errors
     and the hero sits on a dead still for every guest on a phone, which
     is most of them. So the sources are a list, tried in order, and the
     landscape loop is always the last entry.
     ------------------------------------------------------------------ */
  var videoArmed = false;

  function startHeroVideo() {
    if (videoArmed || !video || reduced) return;
    videoArmed = true;

    var media = CFG.media || {};
    var mobile = window.matchMedia('(max-width: 767px)').matches;

    // Preferred first, the loop that definitely ships last. De-duplicated
    // so a config with one video does not try the same file twice.
    var sources = [mobile ? media.heroVideoMobile : null, media.heroVideo]
      .filter(function (src, i, all) { return src && all.indexOf(src) === i; });
    if (!sources.length) return;

    // Same painting as the still beneath it, so there is never a black frame.
    if (media.heroPoster) video.poster = media.heroPoster;

    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
    }, { once: true });

    // muted must be true as a property, not just an attribute, for iOS to
    // treat play() as allowed without a gesture.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';

    var at = 0;

    // Missing file, or a codec this browser has no decoder for: step to the
    // next source. Once the list runs out, fail silently — the poster stays.
    // Clearing src is itself a change to src, so the handler has to retire
    // itself first or the giving-up path re-enters as another error.
    function onError() {
      video.classList.remove('is-playing');
      if (at < sources.length) { attempt(); return; }
      video.removeEventListener('error', onError);
      video.removeAttribute('src');
    }
    video.addEventListener('error', onError);

    function attempt() {
      video.src = sources[at++];
      video.load();
      play();
    }

    var retryArmed = false;

    function play() {
      var p = video.play();
      if (!p || !p.catch) return;
      p.catch(function () {
        // Refused (low power mode, data saver, a policy we do not control).
        // The still carries the hero; try once more on the first real
        // interaction, which browsers always accept. Armed once, however
        // many sources we work through.
        if (retryArmed) return;
        retryArmed = true;
        var retry = function () {
          ['pointerdown', 'keydown'].forEach(function (evt) {
            removeEventListener(evt, retry);
          });
          video.play().catch(function () {});
        };
        addEventListener('pointerdown', retry, { passive: true });
        addEventListener('keydown', retry);
      });
    }

    attempt();
  }


  /* ------------------------------------------------------------------
     Lodging action — config drives the label, the note and the link.
     An empty href means the block is not open yet, so the button is
     removed rather than shipped as a dead end.
     ------------------------------------------------------------------ */
  (function lodging() {
    var link = $('#lodging-link');
    var cfg = CFG.lodging || {};

    var deadline = $('[data-lodging-deadline]');
    var blurb = $('[data-lodging-blurb]');
    if (deadline && cfg.deadline) deadline.textContent = cfg.deadline;
    if (blurb) {
      if (cfg.blurb) blurb.textContent = cfg.blurb;
      else blurb.remove();
    }

    if (!link) return;
    // No destination yet: drop the button, keep the deadline. A dead link
    // on the last screen of the form is worse than no link at all.
    if (!cfg.href) { link.remove(); return; }

    link.href = cfg.href;
    var label = link.querySelector('[data-lodging-label]');
    if (label && cfg.label) label.textContent = cfg.label;

    // An off-site href leaves the site, and nothing about the button says
    // so. A same-site page (lodging.html) does not need the warning.
    if (/^https?:/i.test(cfg.href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', (cfg.label || 'Lodging details') + ' (opens in a new tab)');
    }
  }());


  /* The envelope is optional markup. Without it nothing ever hands off to
     the hero, so the hero reveals itself and the loop starts immediately.
     Function declarations hoist, and the elements they touch are all
     looked up at the top of this file, so this is safe wherever it sits. */
  if (!scene || !envelope) {
    revealHero();
    startHeroVideo();
  }


  /* ------------------------------------------------------------------
     Ambient audio

     Default on. The bed is genuinely quiet — mastered to -18 LUFS, played
     at 0.16 gain, around -34 LUFS in the room — and it starts the moment
     the envelope tap gives the page a gesture to start it with, same as
     the video itself. The toggle at the hand-off is how a guest turns it
     back off, and that choice — off only, never on, since on is already
     the default — is what gets remembered for a returning visit.
     ------------------------------------------------------------------ */
  var audioFailed = false;
  var fadeTimer = null;

  var AUDIO_KEY = 'std:audio';
  var AUDIO_TTL_DAYS = 400;

  function audioPreference() { return store.get(AUDIO_KEY, AUDIO_TTL_DAYS); }
  function setAudioPreference(on) { store.set(AUDIO_KEY, on ? 'on' : 'off'); }

  function fadeTo(target, ms) {
    if (!audio) return;
    clearInterval(fadeTimer);
    var from = audio.volume;
    var t0 = performance.now();
    fadeTimer = setInterval(function () {
      var k = clamp((performance.now() - t0) / ms, 0, 1);
      audio.volume = clamp(from + (target - from) * k, 0, 1);
      if (k === 1) clearInterval(fadeTimer);
    }, 40);
  }

  function startAmbient() {
    var media = CFG.media || {};
    var opts = CFG.audio || {};
    if (!audio || !media.ambientAudio) return;

    audio.addEventListener('error', function () { audioFailed = true; hideAudioToggle(); }, { once: true });

    audio.src = media.ambientAudio;
    audio.volume = 0;
    var p = audio.play();

    if (p && p.then) {
      p.then(function () {
        fadeTo(opts.targetVolume != null ? opts.targetVolume : 0.16, opts.fadeInMs || 4000);
        setPressed(true);
      }).catch(function () {
        // Autoplay refused: keep offering it. File missing: the 'error'
        // listener above has already retired the control.
        setPressed(false);
      });
    }
  }

  function setPressed(on) {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggle.setAttribute('aria-label', on ? 'Turn off ambient sound' : 'Turn on ambient sound');
  }

  function revealAudioToggle() {
    if (!toggle || audioFailed || !(CFG.media || {}).ambientAudio) return;
    toggle.hidden = false;
    requestAnimationFrame(function () { toggle.classList.add('is-shown'); });
  }

  function hideAudioToggle() {
    if (!toggle) return;
    audioFailed = true;
    toggle.classList.remove('is-shown');
    setTimeout(function () { toggle.hidden = true; }, 400);
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var on = toggle.getAttribute('aria-pressed') === 'true';
      if (on) {
        fadeTo(0, 500);
        setTimeout(function () { audio.pause(); }, 520);
        setPressed(false);
        setAudioPreference(false);
      } else {
        setAudioPreference(true);
        var opts = CFG.audio || {};
        // A guest who never had a stored "on" preference never went
        // through startAmbient() on envelope open, so audio.src is still
        // empty at this point — this is the first tap that needs it set.
        if (!audio.src) audio.src = (CFG.media || {}).ambientAudio || '';
        audio.volume = 0;
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            fadeTo(opts.targetVolume != null ? opts.targetVolume : 0.16, 1200);
            setPressed(true);
          }).catch(hideAudioToggle);
        } else {
          setPressed(true);
        }
      }
    });
  }


  /* ------------------------------------------------------------------
     The invitation line rises as it arrives, one word after another.

     The words are wrapped here rather than written into index.html so the
     markup stays a sentence a human can edit. Two things this must not
     break, both of them CSS §3.5:

       · the <em> is display:block and carries the second line, so we walk
         the child nodes and wrap in place rather than flattening
         textContent, which would throw the element away;
       · the words are rejoined with ordinary spaces, never non-breaking
         ones — .celebrate is a 20ch measure that has to wrap to three
         lines on a phone, and nbsp would make it one unbreakable run.

     Each span carries --word-i, its place in the line; the stagger is the
     stylesheet's business, not ours.
     ------------------------------------------------------------------ */
  (function celebrate() {
    var el = $('.celebrate');
    if (!el) return;

    var count = 0;
    (function wrapWords(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { wrapWords(child); return; }   /* the em */
        if (child.nodeType !== 3 || !child.nodeValue.trim()) return;

        var frag = document.createDocumentFragment();
        child.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var span = document.createElement('span');
          span.className = 'word';
          span.style.setProperty('--word-i', String(count++));
          span.textContent = part;
          frag.appendChild(span);
        });
        node.replaceChild(frag, child);
      });
    }(el));

    el.style.setProperty('--word-n', String(count));

    // Reduced motion: the line is set, not assembling. CSS pins the
    // progress at 1 as well, so there is nothing to drive.
    if (reduced) return;

    /* The line is tied to the scroll rather than fired once on arrival,
       which is the whole point: run the scroll backwards and the sentence
       comes apart again, last word first, at the rate you scroll.

       Progress is measured from the section's own position, not from a
       runway, so nothing has to be pinned for it to work — the section
       scrolls like any other and only the words read the number.

         p = 0   the top edge is at the bottom of the viewport
         p = 1   the top edge has risen to 38% of the viewport
       Above that it stays 1, so scrolling past and coming back finds the
       line where you left it. */
    var ticking = false;
    var last = -1;

    function frame() {
      ticking = false;
      var vh = window.innerHeight;
      var top = el.getBoundingClientRect().top;
      var span = vh * 0.62;                 // vh → 38% of vh
      var p = (vh - top) / span;
      p = p < 0 ? 0 : p > 1 ? 1 : p;

      // Two decimals is finer than the eye can follow on a 22px rise and
      // keeps us off the property setter on every sub-pixel of scroll.
      p = Math.round(p * 100) / 100;
      if (p === last) return;
      last = p;
      el.style.setProperty('--celebrate-p', p);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    frame();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { last = -1; onScroll(); }, { passive: true });
    addEventListener('orientationchange', function () {
      setTimeout(function () { last = -1; onScroll(); }, 250);
    });
  }());


  /* ------------------------------------------------------------------
     The mosaic — one photograph that shrinks into a framed card while
     five more fly in around it.

     Restored from the original site's "Cordially-style scroll-driven hero
     mosaic" and rebuilt on this file's scroll idiom: the original wrote
     six elements' worth of inline width/height/transform every frame,
     which is a layout-and-paint per card per frame. This publishes one
     number — --mosaic-p, 0 to 1 across the runway — and CSS composes
     every card from it on the compositor.
     ------------------------------------------------------------------ */
  (function mosaic() {
    var section = $('#mosaic');
    if (!section) return;

    var frames = $$('[data-mosaic]');
    var list = CFG.mosaic || [];

    frames.forEach(function (fig, i) {
      var data = list[i];
      if (!data || !data.src) { markEmpty(fig); return; }

      var img = document.createElement('img');
      // The centre card is the one thing on screen at full size when the
      // section arrives, so it is not a lazy load; the satellites are.
      img.loading = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = data.alt || '';
      img.addEventListener('error', function () { markEmpty(fig); }, { once: true });
      img.src = data.src;

      // A WebP source is offered first when config supplies one, with the
      // JPEG in `src` as the <picture> fallback for a browser or codec that
      // cannot decode it — the <img> above still carries the error handler,
      // src and alt, so nothing about the empty-frame fallback changes.
      if (data.webp) {
        var picture = document.createElement('picture');
        var source = document.createElement('source');
        source.type = 'image/webp';
        source.srcset = data.webp;
        picture.appendChild(source);
        picture.appendChild(img);
        fig.insertBefore(picture, fig.firstChild);
      } else {
        fig.insertBefore(img, fig.firstChild);
      }
    });

    function markEmpty(fig) {
      if (fig.classList.contains('is-empty')) return;
      fig.classList.add('is-empty');
      var inner = document.createElement('span');
      inner.className = 'm-inner';
      inner.innerHTML =
        '<span class="m-empty-mark" aria-hidden="true">' +
        '<svg viewBox="0 0 40 40" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round">' +
        '<path d="M20 34V12"/>' +
        '<path d="M20 20c0-4.2 3.4-7.6 7.6-7.6C27.6 16.6 24.2 20 20 20Z"/>' +
        '<path d="M20 27c0-3.6 2.9-6.5 6.5-6.5C26.5 24.1 23.6 27 20 27Z"/>' +
        '<path d="M20 20c0-4.2-3.4-7.6-7.6-7.6C12.4 16.6 15.8 20 20 20Z"/>' +
        '<path d="M20 27c0-3.6-2.9-6.5-6.5-6.5C13.5 24.1 16.4 27 20 27Z"/>' +
        '</g></svg></span>' +
        '<span class="m-empty-note">photograph to come</span>';
      fig.insertBefore(inner, fig.querySelector('.m-frame'));
    }

    // Reduced motion: CSS pins --mosaic-p at 1, so the arrangement is
    // simply there, assembled, the moment it scrolls into view.
    if (reduced) return;

    var runway = 0;
    var last = -1;
    var ticking = false;

    function measure() {
      var r = section.offsetHeight - window.innerHeight;
      runway = r > 40 ? r : 0;
    }

    function frame() {
      ticking = false;
      if (!runway) { section.style.setProperty('--mosaic-p', 1); return; }

      var top = section.getBoundingClientRect().top;
      var p = clamp(-top / runway, 0, 1);
      p = Math.round(p * 100) / 100;
      if (p === last) return;
      last = p;
      section.style.setProperty('--mosaic-p', p);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    measure();
    frame();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { measure(); last = -1; onScroll(); }, { passive: true });
    addEventListener('orientationchange', function () {
      setTimeout(function () { measure(); last = -1; onScroll(); }, 250);
    });
  }());

  /* ------------------------------------------------------------------
     Hero scroll state

     There is no hand-off left to drive. This used to publish --hero-p
     (0 → 1 across a 118svh runway) so CSS could lift and fade the copy,
     climb an ivory wash over a pinned painting, and slide three depth
     planes against each other. The hero is one ordinary screen now and
     simply scrolls away.

     All that survives is one class. The cue has said its piece the moment
     you start scrolling, so it gets out of the way — a plain opacity
     transition in CSS, not a scrub.
     ------------------------------------------------------------------ */
  (function heroScroll() {
    var hero = $('#hero');
    if (!hero) return;

    var ticking = false;
    var last = null;

    function frame() {
      ticking = false;
      var on = window.scrollY > 40;
      if (on === last) return;      // one class write per crossing, not per frame
      last = on;
      hero.classList.toggle('is-scrolled', on);
    }

    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });

    frame();
  }());


  /* ------------------------------------------------------------------
     Guest information form
     ------------------------------------------------------------------ */
  (function guestForm() {
    var form = $('#guest-form');
    if (!form) return;

    var status = $('#form-status');
    var submit = $('#guest-submit');
    var done = $('#form-done');


    /* ---- "you already sent this" ------------------------------------
       A guest who sends their address in August and comes back in March
       to look up the hotel currently gets a blank four-step form, which
       reads as "that never went through" and produces a duplicate row.
       On success we remember it, and a later visit lands on the done
       screen with a quiet way back to the form for anyone who has moved.

       Deliberately not a lock: the key is one click from being cleared,
       and clearing it is the whole affordance. A guest who has genuinely
       moved house must be able to tell us.                              */
    var SENT_KEY = 'std:sent';
    var rememberDays = (CFG.form || {}).rememberSentDays;

    function showDone(remembered) {
      if (!done) return;
      form.hidden = true;
      done.hidden = false;

      var lede = $('.sheet-lede', form.parentNode);
      if (lede) lede.hidden = true;

      if (!remembered || $('.done-again', done)) return;

      var again = document.createElement('p');
      again.className = 'done-again';
      again.textContent = 'Sent something already? ';

      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'done-again-link';
      link.textContent = 'Update it';
      link.addEventListener('click', function () {
        store.clear(SENT_KEY);
        again.remove();
        done.hidden = true;
        form.hidden = false;
        if (lede) lede.hidden = false;
        if (stepped) go(0, true);
      });

      again.appendChild(link);
      done.appendChild(again);
    }

    // Set when the guest uses the "don't have it handy" link below rather
    // than just leaving the address blank — sent with the payload so
    // Spencer can tell "hasn't gotten to it" from "moving, follow up."
    var addressPending = false;

    var rules = {
      name: {
        test: function (v) { return v.trim().length >= 2; },
        message: 'Please tell us your name.'
      },
      email: {
        test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
        message: 'That email address does not look quite right.'
      },
      // Phone and address are both optional now — asking for a phone
      // number at save-the-date stage reads as data collection, and some
      // guests are genuinely mid-move and do not have an address yet (see
      // the "send the rest" link below). Neither is `required` in the
      // markup any more; the test here only fires once something has been
      // typed, so a filled-in field still has to look like the real thing.
      phone: {
        test: function (v) { return !v.trim() || v.replace(/\D/g, '').length >= 7; },
        message: 'That doesn’t look like a full number — or leave it blank.'
      },
      address: {
        test: function (v) { return !v.trim() || v.trim().length >= 8; },
        message: 'That looks a little short for a full address — or leave it blank.'
      }
    };

    /* ---- the stepper ------------------------------------------------
       Four questions asked one at a time. Everything below is layered on
       top of a form that already works: the panes only start hiding once
       this runs, so with JavaScript off the same markup is one ordinary
       form with a native submit. The order of the panes in the DOM is the
       order of the steps — there is no separate list to keep in sync.  */
    var panes = $$('.step', form);
    var stepper = $('#form-stepper');
    var dotList = $('#stepper-dots');
    var rail = $('#stepper-rail-fill');
    var live = $('#step-live');
    var back = $('#step-back');
    var sendLabel = $('.btn-send-label', submit);
    var stepped = panes.length > 1 && !!dotList;
    var at = 0;
    var dots = [];
    var sending = false;

    function inputOf(pane) { return $('input, textarea', pane); }
    function labelOf(pane) {
      var l = $('.step-q', pane);
      return l ? l.textContent.trim() : '';
    }

    function buildStepper() {
      form.classList.add('is-stepped');
      stepper.hidden = false;

      panes.forEach(function (pane, i) {
        var li = document.createElement('li');

        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'step-dot';
        dot.innerHTML = '<span class="step-dot-num">' + (i + 1) + '</span>';
        // A step you have not reached is not a destination, so it is not a
        // button you can land on — disabled keeps it out of the tab order.
        dot.disabled = true;
        dot.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + labelOf(pane));
        dot.addEventListener('click', function () {
          // Backwards only: jumping ahead would skip validation.
          if (i < at) go(i);
        });
        li.appendChild(dot);
        dots.push(dot);

        if (i < panes.length - 1) {
          var link = document.createElement('span');
          link.className = 'step-link';
          link.setAttribute('aria-hidden', 'true');
          li.appendChild(link);
        }
        dotList.appendChild(li);
      });

      // Every pane keeps its own "n of m" so the end is always in sight.
      $$('.step-count', form).forEach(function (el, i) {
        el.textContent = (i + 1) + ' of ' + panes.length;
      });
    }

    /* Move to step i. `focus` is false for the first paint — yanking focus
       into a form the guest has not scrolled to yet would hijack the page. */
    function go(i, focus) {
      at = clamp(i, 0, panes.length - 1);
      panes.forEach(function (pane, n) { pane.hidden = (n !== at); });

      dots.forEach(function (dot, n) {
        dot.classList.toggle('is-current', n === at);
        dot.classList.toggle('is-done', n < at);
        dot.disabled = n >= at;
        if (n === at) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
      $$('.step-link', dotList).forEach(function (link, n) {
        link.classList.toggle('is-filled', n < at);
      });

      if (rail) rail.style.width = ((at + 1) / panes.length * 100) + '%';

      var last = at === panes.length - 1;
      if (sendLabel) sendLabel.textContent = last ? 'Send our details' : 'Continue';
      if (back) back.hidden = at === 0;

      setStatus('', false);

      if (live) live.textContent = 'Step ' + (at + 1) + ' of ' + panes.length + ': ' + labelOf(panes[at]);

      if (focus) {
        var input = inputOf(panes[at]);
        if (input) input.focus({ preventScroll: true });
      }
    }

    function fieldOf(input) { return input.closest('.field'); }

    function showError(input, message) {
      var field = fieldOf(input);
      var err = $('.field-err', field);
      field.classList.add('has-error');
      input.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = message; err.hidden = false; }
    }

    function clearError(input) {
      var field = fieldOf(input);
      var err = $('.field-err', field);
      field.classList.remove('has-error');
      input.removeAttribute('aria-invalid');
      if (err) { err.hidden = true; err.textContent = ''; }
    }

    function validate(input) {
      var rule = rules[input.name];
      if (!rule) return true;
      if (rule.test(input.value)) { clearError(input); return true; }
      showError(input, rule.message);
      return false;
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', function () {
        if (input.value.trim()) validate(input);
      });
      input.addEventListener('input', function () {
        if (fieldOf(input).classList.contains('has-error')) validate(input);
      });
    });

    /* A status message is usually a sentence, but the failure case has to
       offer a way out, and a tappable mailto: is worth far more on a phone
       than an address a guest has to select by hand. `link` is optional and
       built as a real node, so nothing here ever interpolates into HTML. */
    function setStatus(text, isError, link) {
      if (!status) return;
      status.textContent = text || '';
      status.classList.toggle('is-error', !!isError);
      if (link && link.href && link.label) {
        status.appendChild(document.createTextNode(' '));
        var a = document.createElement('a');
        a.className = 'form-status-link';
        a.href = link.href;
        a.textContent = link.label;
        status.appendChild(a);
      }
    }

    /* The only address a guest can fall back on. Empty in config means the
       sentence is dropped rather than a dead mailto: being shipped. */
    function contactLink() {
      var email = (CFG.contact || {}).email;
      return email ? { href: 'mailto:' + email, label: email } : null;
    }

    if (stepped) {
      buildStepper();
      go(0, false);
      if (back) {
        back.addEventListener('click', function () { go(at - 1, true); });
      }
    }

    // "Don't have it handy? Send the rest and we'll follow up." Address is
    // optional already (see rules.address above), so this link's real job
    // is reassurance plus an explicit flag — a blank address a guest chose
    // to skip past reads differently to Spencer than one nobody got to.
    var addressSkip = $('#g-address-skip');
    if (addressSkip) {
      addressSkip.addEventListener('click', function () {
        var addrInput = form.elements.address;
        if (addrInput) { addrInput.value = ''; clearError(addrInput); }
        addressPending = true;
        submit.click();
      });
    }

    // Ran after the stepper is built, so the form underneath the done
    // screen is in a sane state if the guest asks to update it.
    if (rememberDays && store.get(SENT_KEY, rememberDays)) showDone(true);

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // aria-disabled does not stop a click or an Enter the way disabled
      // does, so the guard against a double send is explicit.
      if (sending) return;

      // Honeypot: a real guest never sees either of these. `company` is
      // ours; `_gotcha` is the name Formspree filters on, so a bot that
      // fills every field is caught on our side and on theirs.
      if (form.elements.company && form.elements.company.value) return;
      if (form.elements._gotcha && form.elements._gotcha.value) return;

      // Mid-flow, "submit" means "next": check this one answer and move on.
      // Enter in the field does the same thing, because the button never
      // stops being type=submit.
      if (stepped && at < panes.length - 1) {
        var current = inputOf(panes[at]);
        if (current && !validate(current)) { current.focus(); return; }
        go(at + 1, true);
        return;
      }

      var bad = [];
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (input && !validate(input)) bad.push(input);
      });
      if (bad.length) {
        // The old version focused the first bad field and cleared the
        // status, so a failed submit on a long form said nothing at all
        // about why. Say how many, and go to the one that needs fixing.
        if (stepped) {
          var idx = panes.indexOf(bad[0].closest('.step'));
          if (idx > -1 && idx !== at) go(idx, false);
        }
        setStatus(bad.length === 1
          ? 'One detail needs a look before we can send this.'
          : bad.length + ' details need a look before we can send this.', true);
        bad[0].focus();
        return;
      }

      var email = form.elements.email.value.trim();

      var address = form.elements.address.value.trim();

      var payload = {
        name: form.elements.name.value.trim(),
        email: email,
        phone: form.elements.phone.value.trim(),
        address: address,
        // Only meaningful when address is blank: distinguishes "used the
        // 'send the rest' link" from "just didn't fill this in."
        addressStatus: !address ? (addressPending ? 'pending' : 'blank') : 'given',
        submittedAt: new Date().toISOString(),
        source: 'save-the-date',
        // So a reply to the notification email reaches the guest rather
        // than the form service. Formspree reads this name; anything else
        // records it as one more column.
        _replyto: email
      };

      var opts = CFG.form || {};
      Object.keys(opts.extraFields || {}).forEach(function (k) {
        if (!(k in payload)) payload[k] = opts.extraFields[k];
      });

      var endpoint = CFG.FORM_ENDPOINT;

      if (!endpoint) {
        // No backend configured. Say so plainly — never claim success.
        setStatus(
          'This form is not connected yet, so nothing was sent. ' +
          'Add FORM_ENDPOINT in assets/js/config.js to start collecting replies.',
          true
        );
        console.info('[save-the-date] FORM_ENDPOINT is empty. Would have sent:', payload);
        return;
      }

      // aria-disabled rather than disabled: a disabled button drops out of
      // the accessibility tree mid-action, so a screen reader loses the
      // element it was on at the exact moment there is news to report.
      sending = true;
      submit.setAttribute('aria-disabled', 'true');
      submit.classList.add('is-sending');
      form.setAttribute('aria-busy', 'true');
      if (sendLabel) sendLabel.textContent = 'Sending…';
      setStatus('', false);

      var init = { method: opts.method || 'POST', headers: { Accept: 'application/json' } };

      if (opts.encoding === 'formdata') {
        var fd = new FormData();
        Object.keys(payload).forEach(function (k) { fd.append(k, payload[k]); });
        init.body = fd;
      } else {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(payload);
      }

      fetch(endpoint, init)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.removeAttribute('aria-busy');
          store.set(SENT_KEY, payload.name || true);
          showDone(false);
          done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
          // The form the guest was standing in has just been removed from
          // the page. Without this, focus falls back to <body> and a screen
          // reader is told nothing about what replaced it.
          done.focus({ preventScroll: true });
        })
        .catch(function () {
          sending = false;
          submit.removeAttribute('aria-disabled');
          submit.classList.remove('is-sending');
          form.removeAttribute('aria-busy');
          if (sendLabel) sendLabel.textContent = 'Send our details';
          // An error tells you what happened and what to do about it. The
          // old copy did neither, and read the same as the not-connected
          // state above — which is a different problem with a different fix.
          setStatus(
            'That didn\'t send — it\'s on our end, not yours.' +
            (contactLink() ? ' Try again, or email us at' : ' Try again in a moment.'),
            true,
            contactLink()
          );
        });
    });
  }());


  /* ------------------------------------------------------------------ */
  applyConfig();
}());
