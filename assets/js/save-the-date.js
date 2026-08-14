/* ==========================================================================
   Sarah & Spencer — Save the Date

   Everything editable lives in assets/js/config.js. This file only
   knows how to animate, validate and submit.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.SAVE_THE_DATE || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Used by the envelope's source selection below (phone gets its own
  // portrait clip) — width alone can't tell a phone from a narrow or
  // zoomed desktop window, hence the pointer check alongside it. A
  // snapshot at load, not tracked live across a resize, same as
  // `reduced` above.
  var isPhone = window.matchMedia('(max-width: 767px)').matches &&
    window.matchMedia('(pointer: coarse)').matches;
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

  /* Wrap every word of `el` in its own <span class="word" style="--word-i:n">,
     in place, so a per-word CSS effect (the invitation line's assembly, a
     step question's entrance) has something to hang a stagger off of.
     Walks the child nodes rather than flattening textContent, so a nested
     element — the <em> that carries the invitation's second line, the <em>
     that flags a step as optional — keeps its own markup instead of being
     thrown away. Words are rejoined with ordinary spaces, never non-breaking
     ones, so the wrapped text still wraps like plain text. Returns the word
     count, for callers (like the invitation line) that need it. */
  function wrapWords(el) {
    var count = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { walk(child); return; }
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
    return count;
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
      metaArt.alt = CFG.date.display + ' – ' + CFG.location.display;
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

  /* Hoisted up from the ambient-audio block below (§ "Ambient audio") so
     that it is false, not the pre-assignment `undefined` a `var` carries
     until its own line runs, when the envelope init below reads it
     synchronously — before that block would otherwise have executed.
     Deliberately a plain in-memory flag, not a stored preference: audio
     defaults on for every visit to every page, and muting it is only
     ever a choice about the page currently open, not a record that
     should follow a guest to the next page or the next visit — see the
     "Ambient audio" comment below. */
  var audioMuted = false;

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
    if (!audioMuted) startAmbient();
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

    // Audio defaults on (see the "Ambient audio" section below), but only
    // from here — the moment the envelope has actually finished opening
    // and the hero is what's on screen. The envelope itself is silent by
    // design (its own video carries no audio track); starting the ambient
    // bed any earlier, mid-animation, would make it sound like the
    // envelope was making noise. A guest who has already muted it once
    // during this same page view is the one case that stays silent.
    if (!audioMuted) startAmbient();

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
    if (!envVideo || !envVideo.src) { finishEnvelope(); return; }

    envVideo.addEventListener('ended', finishEnvelope, { once: true });

    // A source that fails — wrong codec, a bad fetch — steps to the next
    // entry in envSources exactly once. The landscape clip is always the
    // last entry and always ships, so a phone whose portrait take 404s
    // still gets an envelope instead of a dead frame; only that last
    // source's own failure hands off to the hero. Same shape as the hero
    // loop's own source list above, sized down for one tap instead of an
    // autoplaying loop.
    function onError() {
      if (setEnvelopeSource(envSourceAt + 1)) {
        envVideo.addEventListener('error', onError, { once: true });
        attemptPlay();
      } else {
        finishEnvelope();
      }
    }
    envVideo.addEventListener('error', onError, { once: true });

    // Belt and braces: a codec this browser cannot decode sometimes fails
    // silently rather than telling us — no `error` event, no rejected
    // play(), `readyState` stuck at HAVE_NOTHING forever (confirmed against
    // Playwright's own decoder-less Chromium — see assets/video/README.md).
    // This flat deadline, comfortably past either source's own ~4.9s
    // runtime (both clips are cut and retimed to match — see
    // assets/video/README.md), is what stops a guest on a browser like
    // that from being stranded on a frame that will never move.
    // finishEnvelope() is idempotent, so this is a silent no-op on every
    // run where `ended` already fired first.
    setTimeout(finishEnvelope, 6500);

    function attemptPlay() {
      // muted must be true as a property, not just an attribute, for iOS to
      // treat play() as allowed. Both sources ship with no meaningful audio
      // track (see assets/video/README.md), so nothing is lost.
      envVideo.muted = true;
      envVideo.defaultMuted = true;
      envVideo.currentTime = 0;
      var p = envVideo.play();
      // A refused play() (a policy this tap should already satisfy, but
      // belt and braces) is the same dead end as a missing file.
      if (p && p.catch) p.catch(finishEnvelope);
    }
    attemptPlay();
  }

  function openEnvelope() {
    if (opened || !envelope) return;
    opened = true;
    rememberOpened();

    envelope.classList.add('is-open');
    envelope.setAttribute('aria-disabled', 'true');
    scene.classList.add('is-opening');

    // The ambient bed starts in finishEnvelope() instead, once the
    // envelope has actually finished opening — see the comment there.
    // This tap is still what supplies the user gesture the browser wants;
    // it just isn't spent until playback actually begins a few seconds
    // later, on the same page's "sticky" activation.
    playEnvelopeVideo();
  }

  // Two sources: a portrait take shot for a phone screen, and the
  // landscape clip everywhere else — same "mobile first, always-shipped
  // clip as the fallback" shape as the hero loop's own sources list
  // above (see startHeroVideo). "Mobile" is decided once here, same as
  // the hero, rather than tracked live across a resize.
  var envSources = [];
  var envSourceAt = 0;

  function setEnvelopeSource(i) {
    if (!envVideo || !envSources[i]) return false;
    envSourceAt = i;
    if (envSources[i].poster) envVideo.poster = envSources[i].poster;
    envVideo.src = envSources[i].video;
    envVideo.load();
    // CSS §1 uses this to tell the two clips' framing apart: the portrait
    // take is already cut for a phone's own aspect ratio and wants a plain
    // `cover`, where the landscape clip needs `contain` below ~4:3 so it
    // is not cropped to a sliver. Set on the scene, not just the video, so
    // the hint/skip legibility rules that live beside it in the markup can
    // key off it too. Toggled rather than assumed from screen width alone,
    // so a fallback to the landscape clip (see onError in playEnvelopeVideo
    // below) also flips the framing back correctly.
    if (scene) scene.classList.toggle('is-mobile-cut', !!envSources[i].mobileCut);
    return true;
  }

  // config.js is authoritative for every asset path on the page; the HTML
  // carries no source of its own to pick between (see the note at the top
  // of index.html) — a static mirror here would eagerly fetch whichever
  // file it named before this code ever ran, on every device, which is
  // exactly the wasted-bandwidth bug a phone-specific source exists to
  // avoid. Applied unconditionally, before the reduced motion and
  // repeat-visit branches below, because it costs nothing even on a run
  // where the video never plays.
  if (envVideo) {
    var envMedia = CFG.media || {};
    // isPhone (top of file) is the same width-plus-pointer test this used
    // to compute locally — width alone misreads a desktop browser that
    // isn't maximised or is zoomed in for readability as a phone, since
    // both still report `pointer: fine`.
    var envMobileSrc = isPhone ? envMedia.envelopeVideoMobile : '';
    if (envMobileSrc) {
      envSources.push({ video: envMobileSrc, poster: envMedia.envelopePosterMobile || envMedia.envelopePoster, mobileCut: true });
    }
    if (envMedia.envelopeVideo && envMedia.envelopeVideo !== envMobileSrc) {
      envSources.push({ video: envMedia.envelopeVideo, poster: envMedia.envelopePoster });
    }
    setEnvelopeSource(0);
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
      if (!audioMuted) startAmbient();
    // Seen it already inside the last 30 days? Never seal the page at all.
    } else if (alreadyOpened()) {
      scene.style.display = 'none';
      scene.setAttribute('aria-hidden', 'true');
      opened = true;
      revealHero();
      startHeroVideo();
      revealAudioToggle();
      if (!audioMuted) startAmbient();
    } else {
      seal();

      // A full-screen gate with exactly one accepted interaction is the
      // page's largest liability if that interaction is missed entirely —
      // so if nothing has happened in 2.8s, open it for them. Anyone who
      // has already acted (tap, Enter/Space, Escape) has flipped `opened`
      // to true by then, at which point this is a no-op.
      setTimeout(openEnvelope, 2800);

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

    // A dropped connection or a cellular handoff mid-fetch — exactly the
    // moment a guest is most likely to be opening this link — reports the
    // *identical* error code as a genuinely missing or unsupported file
    // (MEDIA_ERR_SRC_NOT_SUPPORTED either way; confirmed against a real
    // aborted request, not assumed). The element cannot tell "broken" from
    // "unlucky," so a failure gets two short-backoff retries on the same
    // source before we treat it as broken and step to the next one. Once
    // every source is out of retries, fail silently — the poster stays.
    // Clearing src is itself a change to src, so the handler has to retire
    // itself first or the giving-up path re-enters as another error.
    var retryDelays = [600, 1800];

    function onError() {
      video.classList.remove('is-playing');
      if (retryDelays.length) {
        setTimeout(retry, retryDelays.shift());
        return;
      }
      if (at < sources.length) { retryDelays = [600, 1800]; attempt(); return; }
      video.removeEventListener('error', onError);
      video.removeAttribute('src');
      armReconnectRetry();
    }
    video.addEventListener('error', onError);

    // Six retries in under three seconds still loses to a genuinely bad
    // stretch of cellular signal — exactly the first moment a guest opens
    // this link, before the connection has settled. Rather than staying
    // parked on the poster for the rest of the visit, take one more swing
    // the moment there is an actual signal that conditions changed: the
    // browser reports the connection back, or the tab was backgrounded
    // during the failed fetch (a hidden tab throttles/suspends loads the
    // same way a dropped connection does) and has now come back to the
    // front. Armed once, however many sources were tried the first time.
    var reconnectArmed = false;
    function armReconnectRetry() {
      if (reconnectArmed) return;
      reconnectArmed = true;

      function tryAgain() {
        window.removeEventListener('online', tryAgain);
        document.removeEventListener('visibilitychange', onVisible);
        at = 0;
        retryDelays = [600, 1800];
        video.addEventListener('error', onError);
        attempt();
      }
      function onVisible() {
        if (document.visibilityState === 'visible') tryAgain();
      }
      window.addEventListener('online', tryAgain);
      document.addEventListener('visibilitychange', onVisible);
    }

    function retry() {
      video.src = sources[at - 1];
      video.load();
      play();
    }

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

     Default on, every time, on every page — see audioMuted above. The bed
     is genuinely quiet — mastered to -18 LUFS, played at
     config.audio.targetVolume gain. The envelope itself is always silent
     (its clip carries no audio track) — the ambient bed starts only once
     the hero is actually on screen, in finishEnvelope() below, never
     mid-animation. It is at least attempted on every path that lands
     there (the envelope tap, a remembered return visit, the skip link,
     reduced-motion, the 2.8s auto-open) — see the `!audioMuted` checks in
     finishEnvelope(), bypassEnvelope() and the reduced/alreadyOpened
     branches. The toggle at the hand-off is how a guest turns it back
     off, but that choice is scoped to the page currently open: it is a
     plain in-memory flag, never written to storage, so it does not
     survive a reload or follow the guest to another page — landing on
     /travel/ after muting here starts that page's own bed fresh, and
     coming back here later does too. If a persistent "stay off" choice
     is ever wanted, that is a deliberate product decision to revisit,
     not an accidental side effect of how the toggle happens to work.

     The paths with no gesture are not a corner case: a guest inside the
     30-day "already opened" window (i.e. almost every reload while this
     site is being worked on) lands on bypassEnvelope() every single time,
     and the browser refuses a non-muted play() call that isn't backed by
     one — silently, so "default on" looked like it was doing nothing.
     armAmbientRetry() below is the actual fix: it waits for the guest's
     real first interaction with the page, whatever it is, and retries
     startAmbient() then. That interaction is a gesture the policy
     accepts, so audio reliably starts within one tap/key/scroll of
     landing on the page even when nothing here could supply one itself.

     🔒 Gain runs through the Web Audio API (ensureGain() below), never
     `audio.volume` directly. iOS Safari's HTMLMediaElement.volume is a
     documented no-op — reads back 1, writes are silently ignored — so an
     <audio> element there always plays at the file's raw mastered level
     no matter what this code sets. A GainNode sitting after the element
     in a Web Audio graph is the one thing iOS actually honours, and it
     is what makes config.audio.targetVolume mean the same thing on a
     phone as it does on a laptop — which is also why there is no longer
     a separate targetVolumeMobile: the old split was tuned by ear against
     a setting that never reached an iPhone in the first place. Do not
     reintroduce `audio.volume = …`.
     ------------------------------------------------------------------ */
  var audioFailed = false;
  var fadeTimer = null;
  var audioCtx = null;
  var gainNode = null;
  var gainSupported = true;

  function ensureGain() {
    if (gainNode || !gainSupported || !audio) return gainNode;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      var source = audioCtx.createMediaElementSource(audio);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      source.connect(gainNode).connect(audioCtx.destination);
    } catch (e) {
      // No Web Audio API (very old browser): fall back to audio.volume,
      // which at least works everywhere it exists except iOS.
      gainSupported = false;
      gainNode = null;
    }
    return gainNode;
  }

  function getGain() {
    return ensureGain() ? gainNode.gain.value : audio.volume;
  }

  function setGain(v) {
    if (ensureGain()) gainNode.gain.value = v;
    else audio.volume = v;
  }

  // Autoplay policy suspends a freshly created AudioContext until a
  // user gesture resumes it — the same rule that gates audio.play()
  // itself, just one layer further down the graph, and a stricter one:
  // Chrome's Media Engagement Index can let audio.play() through with no
  // gesture at all once this origin has been played enough (exactly what
  // happens on a repeat visit, or arriving via the RSVP link's `#details`
  // hash below, which hands off straight to bypassEnvelope() with none) —
  // but MEI does not extend to AudioContext.resume(), which Chrome never
  // waives. That combination is silent in a specific way: audio.play()
  // resolves, the element genuinely plays, the toggle shows "on" — but
  // the suspended context means the GainNode graph after it never
  // processes a sample. armAudioResume() below is what actually recovers
  // from that: it waits for the guest's real next tap/key/scroll,
  // whatever it turns out to be, and resumes the context then, same
  // shape as armAmbientRetry() but not conditioned on play() having
  // failed — this fires whether it did or not, since play() succeeding
  // is exactly the case that otherwise leaves nothing else to catch it.
  function resumeAudioCtx() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
  }

  var audioResumeArmed = false;
  function armAudioResume() {
    if (audioResumeArmed) return;
    audioResumeArmed = true;
    var events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    function attempt() {
      events.forEach(function (evt) { document.removeEventListener(evt, attempt, true); });
      resumeAudioCtx();
    }
    events.forEach(function (evt) {
      document.addEventListener(evt, attempt, { capture: true, once: true, passive: true });
    });
  }

  function fadeTo(target, ms) {
    if (!audio) return;
    clearInterval(fadeTimer);
    var from = getGain();
    var t0 = performance.now();
    fadeTimer = setInterval(function () {
      var k = clamp((performance.now() - t0) / ms, 0, 1);
      setGain(clamp(from + (target - from) * k, 0, 1));
      if (k === 1) clearInterval(fadeTimer);
    }, 40);
  }

  function targetVolume(opts) {
    return opts.targetVolume != null ? opts.targetVolume : 0.16;
  }

  function startAmbient() {
    var media = CFG.media || {};
    var opts = CFG.audio || {};
    if (!audio || !media.ambientAudio) return;

    audio.addEventListener('error', function () { audioFailed = true; hideAudioToggle(); }, { once: true });

    ensureGain();
    resumeAudioCtx();
    armAudioResume();
    audio.src = media.ambientAudio;
    setGain(0);
    var p = audio.play();

    if (p && p.then) {
      p.then(function () {
        fadeTo(targetVolume(opts), opts.fadeInMs || 4000);
        setPressed(true);
      }).catch(function () {
        // Autoplay refused: keep offering it, and arm the gesture retry
        // below so the guest's next real tap/key/scroll picks it up
        // without them having to find and press the toggle themselves.
        // File missing: the 'error' listener above has already retired
        // the control, so this still runs but armAmbientRetry() no-ops.
        setPressed(false);
        armAmbientRetry();
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
        audioMuted = true;
      } else {
        audioMuted = false;
        var opts = CFG.audio || {};
        // A guest who never had audio start on envelope open (muted it
        // immediately, or startAmbient()'s own gesture-less attempt was
        // refused) never went through startAmbient() at all, so audio.src
        // is still empty at this point — this is the first tap that needs
        // it set.
        if (!audio.src) audio.src = (CFG.media || {}).ambientAudio || '';
        ensureGain();
        resumeAudioCtx();
        armAudioResume();
        setGain(0);
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            fadeTo(targetVolume(opts), 1200);
            setPressed(true);
          }).catch(hideAudioToggle);
        } else {
          setPressed(true);
        }
      }
    });
  }

  /* Browsers only grant a non-muted play() when it is backed by a fresh
     user gesture. bypassEnvelope() and the reduced-motion/alreadyOpened
     branches call startAmbient() with none, immediately on load, and get
     silently refused — startAmbient()'s own .catch() above is what arms
     this. (The envelope-tap path calls startAmbient() later, from
     finishEnvelope() once the hero is revealed, on the same page's
     "sticky" activation from that earlier tap — it does not need this.)
     Deliberately not armed at load: a pointerdown fires on the envelope
     tap itself, which would otherwise start the bed mid-animation, before
     the guest has actually seen the reveal. Arming only after a real,
     gesture-less attempt has already failed keeps it out of that window
     entirely. Listens once for whatever the guest's actual next touch of
     the page turns out to be — pointer, key or scroll all count — and
     retries then; removes its own listeners the moment it runs. */
  var retryArmed = false;
  function armAmbientRetry() {
    if (retryArmed) return;
    retryArmed = true;
    var events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    function attempt() {
      retryArmed = false;
      events.forEach(function (evt) { document.removeEventListener(evt, attempt, true); });
      if (audio && audio.paused && !audioMuted) startAmbient();
    }
    events.forEach(function (evt) {
      document.addEventListener(evt, attempt, { capture: true, once: true, passive: true });
    });
  }


  /* ------------------------------------------------------------------
     The invitation line arrives a word at a time — each one lifting out
     of a soft blur as its own window of scroll passes — and dissolves
     back the same way if you scroll away, last word first.

     wrapWords() (shared with the stepper's question entrance, above)
     wraps every word in its own <span class="word">, including the ones
     inside the <em> that carries the sentence's second line — it walks
     into child elements rather than flattening the text, so the cascade
     numbers continuously across the line break instead of resetting at
     it. See that function's comment for why whitespace is left alone.

     --word-dur and --word-off are published once, from the word count,
     so every word gets an evenly spaced slice of the scroll and the
     last one finishes exactly as --celebrate-p reaches 1 — however long
     the sentence is. CSS §3.5 turns those into each word's own local
     progress, eased and applied as opacity/blur/lift. */
  (function celebrate() {
    var el = $('.celebrate');
    if (!el) return;

    var n = wrapWords(el);
    var wordDur = 0.4;
    el.style.setProperty('--word-dur', wordDur);
    el.style.setProperty('--word-off', n > 1 ? (1 - wordDur) / (n - 1) : 0);

    // Reduced motion: the line is set, not assembling. CSS pins the
    // progress at 1 as well, so there is nothing to drive.
    if (reduced) return;

    /* The line is tied to the scroll rather than fired once on arrival,
       which is the whole point: run the scroll backwards and the sentence
       dissolves again, last word home first, at the rate you scroll.

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

      // Two decimals is finer than the eye can follow on this much travel
      // and keeps us off the property setter on every sub-pixel of scroll.
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

    /* ---- booking nudge popup ------------------------------------------
       The one deliberately-timed, unmissable moment on the page: it opens
       itself right after a fresh "send our details," on top of the done
       screen, because the booking-deadline note used to live as a
       footnote under the hand-off button and was too easy to skim past.
       Never triggered on a remembered return visit — only from the fetch
       success handler below. Same open/close/focus-trap shape as the
       lodging lightbox in travel.js, minus the media panel. */
    var nudge = $('#book-nudge');
    var openNudge = function () {};
    if (nudge) {
      var nudgeBackdrop = $('#book-nudge-backdrop', nudge);
      var nudgeDialog = $('#book-nudge-dialog', nudge);
      var nudgeClose = $('#book-nudge-close', nudge);
      var nudgeDismiss = $('#book-nudge-dismiss', nudge);
      var nudgeTrigger = null;

      var nudgeFocusable = function () {
        return $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', nudgeDialog)
          .filter(function (el) { return el.offsetParent !== null; });
      };

      var closeNudge = function () {
        nudge.classList.remove('is-open');
        root.classList.remove('book-nudge-open');
        nudgeDialog.removeEventListener('keydown', onNudgeKeydown);
        nudgeBackdrop.removeEventListener('click', closeNudge);
        var delay = reduced ? 0 : 250;
        setTimeout(function () { nudge.hidden = true; }, delay);
        if (nudgeTrigger && nudgeTrigger.focus) nudgeTrigger.focus();
        nudgeTrigger = null;
      };

      var onNudgeKeydown = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); closeNudge(); return; }
        if (e.key !== 'Tab') return;
        var f = nudgeFocusable();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      };

      openNudge = function () {
        nudgeTrigger = document.activeElement;
        nudge.hidden = false;
        root.classList.add('book-nudge-open');
        // rAF so the browser paints the pre-transition state before the
        // class flips — without this the open transition never runs.
        requestAnimationFrame(function () { nudge.classList.add('is-open'); });
        nudgeDialog.addEventListener('keydown', onNudgeKeydown);
        nudgeBackdrop.addEventListener('click', closeNudge);
        nudgeDialog.focus();
      };

      nudgeClose.addEventListener('click', closeNudge);
      nudgeDismiss.addEventListener('click', closeNudge);
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
        message: 'That doesn’t look like a full number – or leave it blank.'
      },
      address: {
        test: function (v) { return !v.trim() || v.trim().length >= 8; },
        message: 'That looks a little short for a full address – or leave it blank.'
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
        // The question itself arrives a word at a time whenever this pane
        // is unhidden — see CSS §4.1's step-q-word-in. Wrapping is a one-time
        // setup; the entrance replays on its own every time go() flips
        // [hidden], because that is what starts a CSS animation on a
        // newly-displayed element. Only done here, under `stepped`, because
        // that is the only mode where a pane is ever hidden and re-shown.
        var q = $('.step-q', pane);
        if (q) wrapWords(q);

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

      if (rail) rail.style.transform = 'scaleX(' + ((at + 1) / panes.length) + ')';

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

    /* iOS Safari drops the synthetic click that is supposed to follow a tap
       on these buttons when the on-screen keyboard is open: touchstart fires
       while the field still has focus, the keyboard then starts closing and
       the page reflows before touchend, and WebKit finds nothing at the
       original touch point to click. The tap just dismisses the keyboard and
       Continue/Go back silently does nothing — a second, now-keyboardless
       tap is what actually works. Blurring on touchstart forces that reflow
       to happen before the tap is hit-tested, so the first tap is the one
       that lands. */
    function blurActive() {
      var el = document.activeElement;
      if (el && el !== document.body && el.blur) el.blur();
    }
    submit.addEventListener('touchstart', blurActive, { passive: true });
    if (back) back.addEventListener('touchstart', blurActive, { passive: true });

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

          // Give "you're all set" a beat to register before the booking
          // nudge takes focus, rather than popping the two at once.
          setTimeout(openNudge, reduced ? 250 : 900);
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
            'That didn\'t send – it\'s on our end, not yours.' +
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
