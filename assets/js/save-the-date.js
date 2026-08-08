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
  var scene = $('#envelope-scene');
  var envelope = $('#envelope');
  var page = $('#page');
  var opened = false;

  /* The ceremony is worth one viewing, not one per page load. A guest who
     reloads, or comes back from the lodging tab, or restores the tab from
     memory, has already opened this envelope and should land on the page.
     sessionStorage, not localStorage, so a genuinely new visit still gets
     the full thing. Private-mode Safari throws on access, hence the try. */
  var SEEN_KEY = 'std:opened';

  function alreadyOpened() {
    try { return sessionStorage.getItem(SEEN_KEY) === '1'; }
    catch (e) { return false; }
  }
  function rememberOpened() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
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

  function openEnvelope() {
    if (opened || !envelope) return;
    opened = true;
    rememberOpened();

    envelope.classList.add('is-open');
    envelope.setAttribute('aria-disabled', 'true');
    scene.classList.add('is-opening');

    // Audio has to start inside the gesture that opened the envelope,
    // or mobile browsers will refuse it.
    startAmbient();

    var lift = reduced ? 120 : 1900;   // card begins opening into the hero
    var hand = reduced ? 420 : 2500;   // scene starts dissolving
    var done = reduced ? 900 : 3350;   // scene removed from the flow

    setTimeout(function () { envelope.classList.add('is-lifting'); }, lift);

    setTimeout(function () {
      root.classList.remove('is-sealed');
      if ('inert' in HTMLElement.prototype) page.inert = false;
      else page.removeAttribute('aria-hidden');
      scene.classList.add('is-gone');
      scene.setAttribute('aria-hidden', 'true');
      startHeroVideo();
      revealHero();
      revealAudioToggle();
    }, hand);

    setTimeout(function () {
      scene.style.display = 'none';
      page.setAttribute('tabindex', '-1');
      page.focus({ preventScroll: true });
      page.removeAttribute('tabindex');
    }, done);
  }

  if (scene && envelope) {
    // Seen it already this session? Never seal the page in the first place.
    if (alreadyOpened()) {
      scene.style.display = 'none';
      scene.setAttribute('aria-hidden', 'true');
      opened = true;
      revealHero();
      startHeroVideo();
      revealAudioToggle();
    } else {
      seal();

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
  var heroEl = $('#hero');
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
     ------------------------------------------------------------------ */
  var video = $('#hero-video');
  var videoArmed = false;

  function startHeroVideo() {
    if (videoArmed || !video || reduced) return;
    videoArmed = true;

    var media = CFG.media || {};
    var mobile = window.matchMedia('(max-width: 767px)').matches;
    var src = (mobile && media.heroVideoMobile) || media.heroVideo;
    if (!src) return;

    // Same painting as the still beneath it, so there is never a black frame.
    if (media.heroPoster) video.poster = media.heroPoster;

    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
    }, { once: true });

    // If the file is not in the repo yet, fail silently — the poster stays.
    video.addEventListener('error', function () {
      video.classList.remove('is-playing');
      video.removeAttribute('src');
    }, { once: true });

    // muted must be true as a property, not just an attribute, for iOS to
    // treat play() as allowed without a gesture.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    video.src = src;
    video.preload = 'auto';
    video.load();

    var p = video.play();
    if (p && p.catch) {
      p.catch(function () {
        // Refused (low power mode, data saver, a policy we do not control).
        // The still carries the hero; try once more on the first real
        // interaction, which browsers always accept.
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
     This lives here, below the definitions above, because `var` hoists the
     declarations but not the element lookups they depend on. */
  if (!scene || !envelope) {
    revealHero();
    startHeroVideo();
  }


  /* ------------------------------------------------------------------
     Ambient audio
     ------------------------------------------------------------------ */
  var audio = $('#ambient');
  var toggle = $('#audio-toggle');
  var audioFailed = false;
  var fadeTimer = null;

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
      } else {
        var opts = CFG.audio || {};
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
     The invitation line rises as it arrives.
     ------------------------------------------------------------------ */
  (function celebrate() {
    var el = $('.celebrate');
    if (!el) return;
    if (reduced || !('IntersectionObserver' in window)) { el.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.1 });
    io.observe(el);
  }());


  /* ------------------------------------------------------------------
     The silk — a slow moiré weave drifting under everything below the
     painting. What it is and why it is this quiet is written up in CSS
     §3.1; this is only how it gets drawn.

     The short version of the performance story: the reference
     implementation ran a per-pixel loop over every second pixel of the
     full viewport, every frame. Measured at 1440x900 that is ~49ms a
     frame — a pinned core and a 20fps ceiling — on a page already
     running a video loop, three parallax planes and two scroll-driven
     sequences. Three changes make it free, and none of them are visible:
     the field is drawn into a ~300px buffer and scaled up by the browser
     (it is smooth and low-frequency, so the interpolation costs nothing);
     it redraws a dozen times a second rather than sixty; and it only runs
     while the paper is actually on screen and the tab is actually in
     front of someone.
     ------------------------------------------------------------------ */
  (function paperSilk() {
    var host = $('.paper-silk');
    var cv = $('#paper-silk');
    if (!host || !cv || !cv.getContext) return;

    var ctx = cv.getContext('2d');
    if (!ctx) return;

    /* Tuning lives in CSS §3.1, so that stays the one place to change how
       this looks. Only the two values a canvas cannot read for itself
       come across; the strength is plain CSS opacity on the element. */
    var css = getComputedStyle(root);
    var ink = (css.getPropertyValue('--silk-ink') || '').split(',');
    var inkR = parseInt(ink[0], 10) || 156;
    var inkG = parseInt(ink[1], 10) || 147;
    var inkB = parseInt(ink[2], 10) || 130;
    var scale = parseFloat(css.getPropertyValue('--silk-scale')) || 1.15;

    var BUFFER = 300;          // longest edge of the backing store
    var FRAME_MS = 1000 / 12;  // redraw rate
    /* The reference drifts at 1.2 radians of phase a second. Halved: this
       page's motion language is slow and eased, and a sheen at 7% should
       be something a guest notices on the second look, not the first. */
    var DRIFT = 0.01;

    var time = 0;
    var last = 0;
    var raf = 0;
    var onScreen = true;
    var awake = !document.hidden;

    function measure() {
      var w = Math.max(1, host.clientWidth || window.innerWidth);
      var h = Math.max(1, window.innerHeight);
      var k = BUFFER / Math.max(w, h);
      cv.width = Math.max(2, Math.round(w * k));
      cv.height = Math.max(2, Math.round(h * k));
    }

    /* One frame, drawn as ink at a per-pixel alpha and nothing else — no
       fill, no vignette — so every part of the paper this does not darken
       stays exactly the paper underneath it.

       The reference also mixed in a per-pixel "noise" term. It is dropped
       on purpose: it is not noise but a second periodic function, and
       sampled into a buffer this size it aliases into banding rather than
       grain. The paper's own tooth (CSS §3) already supplies grain, at
       full resolution, over the top, which is where it belongs. */
    function draw() {
      var w = cv.width;
      var h = cv.height;
      var img = ctx.createImageData(w, h);
      var d = img.data;
      var t = DRIFT * time;
      var i = 0;
      var x, y, u, v, wy, band;

      /* One pattern unit, in buffer pixels. The reference normalised x by
         the width and y by the height, which stretches the weave by the
         aspect ratio of whatever window it lands in — the same page reads
         as fine ripples on a phone and vague smears on a desktop. Both
         axes here share the width's unit, so the weave is isotropic and
         --silk-scale means one honest thing: how many wave periods cross
         the viewport, on any screen. */
      var per = scale / w;

      for (y = 0; y < h; y++) {
        v = y * per;
        for (x = 0; x < w; x++) {
          u = x * per;
          wy = v + 0.03 * Math.sin(8 * u - t);
          band = 0.6 + 0.4 * Math.sin(
            5 * (u + wy + Math.cos(3 * u + 5 * wy) + 0.02 * t) +
            Math.sin(20 * (u + wy - 0.1 * t))
          );
          d[i] = inkR;
          d[i + 1] = inkG;
          d[i + 2] = inkB;
          d[i + 3] = (255 * clamp(1 - band, 0, 1)) | 0;
          i += 4;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      // Advance on wall-clock, so the weave drifts at one speed whatever
      // frame rate the device actually gives us.
      time += (now - last) / 16.667;
      last = now;
      draw();
    }

    function start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    function stop() {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    function sync() { if (onScreen && awake) start(); else stop(); }

    measure();
    draw();

    /* Stays wired under reduced motion too: the buffer is cut to the shape
       of the window, so a rotated phone that never re-measures shows the
       weave stretched. Redrawing on resize is not motion, it is staying
       the same. */
    var resizeTimer = 0;
    addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { measure(); draw(); }, 160);
    }, { passive: true });

    /* "Reduce" asks for less motion, not for a blank page. The weave is
       drawn once, the paper keeps its drape, and nothing ever moves. */
    if (reduced) return;

    document.addEventListener('visibilitychange', function () {
      awake = !document.hidden;
      sync();
    });

    // Nothing to draw while the guest is still standing on the painting.
    if ('IntersectionObserver' in window) {
      onScreen = false;
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }).observe(host);
    }

    sync();
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
      fig.insertBefore(img, fig.firstChild);
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
     Hero parallax planes

     The three depth slices are ~260 KB that only ever matter to someone
     who scrolls with motion enabled, so their src is held in data-src and
     swapped in after load — behind the video, the poster and everything
     else that is actually on screen first. Reduced motion never fetches
     them at all: CSS pins --hero-p at 0 there, so they would download and
     then sit at opacity 0 forever.

     If this never runs the hero is exactly what it was before the planes
     existed. That is the intended failure mode.
     ------------------------------------------------------------------ */
  (function heroLayers() {
    if (reduced) return;

    var layers = $$('.hero-layer[data-src]');
    if (!layers.length) return;

    function load() {
      layers.forEach(function (img) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
      });
    }

    if (document.readyState === 'complete') load();
    else addEventListener('load', load, { once: true });
  }());


  /* ------------------------------------------------------------------
     Hero scroll hand-off

     Publishes one number — --hero-p, 0 to 1 across the hero's runway —
     and lets CSS decide what every layer does with it. Nothing here reads
     layout inside the scroll event: the runway length is measured once up
     front and re-measured only on resize, so a scroll frame is a single
     scrollY read and one custom-property write. The painting itself is
     never transformed; the copy, the ivory wash and the depth planes
     respond, and the video underneath them never moves at all.
     ------------------------------------------------------------------ */
  (function heroScroll() {
    var hero = $('#hero');
    if (!hero) return;

    // Under reduced motion the hero is one static screen; CSS pins
    // --hero-p at 0 and there is nothing to drive.
    if (reduced) {
      addEventListener('scroll', function () {
        hero.classList.toggle('is-scrolled', window.scrollY > 40);
      }, { passive: true });
      return;
    }

    var runway = 0;
    var last = -1;
    var ticking = false;

    function measure() {
      // How far you can scroll before the sticky pane lets go. On engines
      // without the sticky runway this is ~0, and dividing by it would snap
      // the copy to invisible on the first pixel of scroll — so below a
      // sensible floor we simply do not run the hand-off at all.
      var r = hero.offsetHeight - window.innerHeight;
      runway = r > 40 ? r : 0;
    }

    function frame() {
      ticking = false;
      var p = runway ? window.scrollY / runway : 0;
      p = p < 0 ? 0 : p > 1 ? 1 : p;

      // Two decimals is well under one rendered pixel of difference and
      // keeps us from writing a new value on every sub-pixel scroll.
      p = Math.round(p * 100) / 100;
      if (p === last) return;
      last = p;

      hero.style.setProperty('--hero-p', p);
      hero.classList.toggle('is-scrolling', p > 0);
      hero.classList.toggle('is-scrolled', window.scrollY > 40);
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    measure();
    frame();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { measure(); last = -1; onScroll(); }, { passive: true });
    // iOS fires orientationchange before the new viewport height is settled.
    addEventListener('orientationchange', function () {
      setTimeout(function () { measure(); last = -1; onScroll(); }, 250);
    });
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

    var rules = {
      name: {
        test: function (v) { return v.trim().length >= 2; },
        message: 'Please tell us your name.'
      },
      email: {
        test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
        message: 'That email address does not look quite right.'
      },
      phone: {
        test: function (v) { return (v.replace(/\D/g, '').length >= 7); },
        message: 'Please add a number we can text.'
      },
      address: {
        test: function (v) { return v.trim().length >= 8; },
        message: 'Please add the address the invitation should go to.'
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

    function setStatus(text, isError) {
      if (!status) return;
      status.textContent = text || '';
      status.classList.toggle('is-error', !!isError);
    }

    if (stepped) {
      buildStepper();
      go(0, false);
      if (back) {
        back.addEventListener('click', function () { go(at - 1, true); });
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // aria-disabled does not stop a click or an Enter the way disabled
      // does, so the guard against a double send is explicit.
      if (sending) return;

      // Honeypot: a real guest never sees this field.
      if (form.elements.company && form.elements.company.value) return;

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

      var payload = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        address: form.elements.address.value.trim(),
        submittedAt: new Date().toISOString(),
        source: 'save-the-date'
      };

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

      var opts = CFG.form || {};
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
          form.hidden = true;
          done.hidden = false;
          var lede = $('.sheet-lede', form.parentNode);
          if (lede) lede.hidden = true;
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
          setStatus('Something went wrong sending that. Please try again, or text it to us directly.', true);
        });
    });
  }());


  /* ------------------------------------------------------------------ */
  applyConfig();
}());
