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
  }


  /* ------------------------------------------------------------------
     Envelope
     ------------------------------------------------------------------ */
  var scene = $('#envelope-scene');
  var envelope = $('#envelope');
  var page = $('#page');
  var opened = false;

  function seal() {
    if (!scene || !envelope) return;
    root.classList.add('is-sealed');
    if ('inert' in HTMLElement.prototype) page.inert = true;
    else page.setAttribute('aria-hidden', 'true');
  }

  function openEnvelope() {
    if (opened || !envelope) return;
    opened = true;

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
    seal();

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
      requestAnimationFrame(openEnvelope);
    }
  }


  /* ------------------------------------------------------------------
     Hero video — the still is the hero until the loop is actually ready.
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

    video.addEventListener('playing', function () {
      video.classList.add('is-playing');
    }, { once: true });

    // If the file is not in the repo yet, fail silently — the poster stays.
    video.addEventListener('error', function () {
      video.classList.remove('is-playing');
      video.removeAttribute('src');
    }, { once: true });

    video.src = src;
    video.preload = 'auto';
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* still image carries the hero */ });
  }


  /* ------------------------------------------------------------------
     Ambient lake audio
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
    toggle.setAttribute('aria-label', on ? 'Turn off ambient lake sound' : 'Turn on ambient lake sound');
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
     Add to calendar (.ics generated in the browser, no backend)
     ------------------------------------------------------------------ */
  (function calendar() {
    var btn = $('#add-to-calendar');
    if (!btn) return;

    var d = CFG.date || {}, loc = CFG.location || {};

    function toUtc(local, offset) {
      // '20270612T163000' + '-06:00'  ->  '20270612T223000Z'
      var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(local || '');
      if (!m) return null;
      var iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6] + (offset || 'Z');
      var date = new Date(iso);
      if (isNaN(date)) return null;
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    var start = toUtc(d.startLocal, d.utcOffset);
    var end = toUtc(d.endLocal, d.utcOffset);
    if (!start || !end) { btn.hidden = true; return; }

    function esc(s) { return String(s || '').replace(/([,;\\])/g, '\\$1'); }

    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      'PRODID:-//' + esc(CFG.couple) + '//Save the Date//EN',
      'BEGIN:VEVENT',
      'UID:' + (d.iso || 'wedding') + '-sarah-spencer@savethedate',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'DTSTART:' + start,
      'DTEND:' + end,
      'SUMMARY:' + esc(CFG.couple + '’s Wedding'),
      'DESCRIPTION:Save the date. Formal invitation and weekend details to follow.\\n' + (CFG.siteUrl || ''),
      'LOCATION:' + esc(loc.icsLocation || loc.display),
      'URL:' + (CFG.siteUrl || ''),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    btn.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    btn.setAttribute('download', 'sarah-and-spencer-save-the-date.ics');
  }());


  /* ------------------------------------------------------------------
     Photo journey — paths come from config; a missing file renders a
     designed placeholder rather than a broken image.
     ------------------------------------------------------------------ */
  (function photos() {
    var frames = $$('[data-photo]');
    var list = CFG.photos || [];

    frames.forEach(function (fig, i) {
      var data = list[i];
      if (!data || !data.src) { markEmpty(fig); return; }

      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = data.alt || '';
      img.addEventListener('error', function () { markEmpty(fig); }, { once: true });
      img.src = data.src;
      fig.insertBefore(img, fig.firstChild);

      if (data.caption) {
        var cap = document.createElement('figcaption');
        cap.className = 'ph-caption';
        cap.textContent = data.caption;
        fig.appendChild(cap);
      }
    });

    function markEmpty(fig) {
      if (fig.classList.contains('is-empty')) return;
      fig.classList.add('is-empty');
      var inner = document.createElement('span');
      inner.className = 'ph-inner';
      inner.innerHTML =
        '<span class="ph-empty-mark" aria-hidden="true">' +
        '<svg viewBox="0 0 40 40" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round">' +
        '<path d="M20 34V12"/>' +
        '<path d="M20 20c0-4.2 3.4-7.6 7.6-7.6C27.6 16.6 24.2 20 20 20Z"/>' +
        '<path d="M20 27c0-3.6 2.9-6.5 6.5-6.5C26.5 24.1 23.6 27 20 27Z"/>' +
        '<path d="M20 20c0-4.2-3.4-7.6-7.6-7.6C12.4 16.6 15.8 20 20 20Z"/>' +
        '<path d="M20 27c0-3.6-2.9-6.5-6.5-6.5C13.5 24.1 16.4 27 20 27Z"/>' +
        '</g></svg></span>' +
        '<span class="ph-empty-note">photograph to come</span>';
      fig.insertBefore(inner, fig.querySelector('.ph-frame'));
    }
  }());


  /* ------------------------------------------------------------------
     Reveals — photos fading up as they arrive
     ------------------------------------------------------------------ */
  (function reveals() {
    var items = $$('.ph');
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }());


  /* ------------------------------------------------------------------
     The vine — scroll-linked stroke, smoothed so it never twitches
     ------------------------------------------------------------------ */
  (function vines() {
    var track = $('.vine-track');
    if (!track) return;

    // Both path variants are driven by one scroll progress, measured from the
    // track. Only one is visible at a time, but neither is display:none, so
    // both stay measurable when the breakpoint flips mid-session.
    var vines = $$('.vine', track).map(function (svg) {
      var stem = $('.vine-stem', svg);
      return { stem: stem, len: 0, leaves: $$('.vine-leaves > g', svg) };
    });

    function measureStems() {
      vines.forEach(function (v) {
        if (!v.stem) return;
        var len = v.stem.getTotalLength();
        if (!len) return;
        v.len = len;
        v.stem.style.strokeDasharray = len;
        if (reduced) v.stem.style.strokeDashoffset = 0;
      });
    }
    measureStems();

    if (reduced) {
      vines.forEach(function (v) {
        v.leaves.forEach(function (l) { l.classList.add('is-out'); });
      });
      return;
    }
    vines.forEach(function (v) {
      if (v.stem) v.stem.style.strokeDashoffset = v.len;
    });

    var progress = 0, target = 0, visible = false, running = false, pending = false;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }, { rootMargin: '25% 0px 25% 0px' }).observe(track);
    } else {
      visible = true;
    }

    function measure() {
      var vh = window.innerHeight;
      var r = track.getBoundingClientRect();
      // Drawing starts as the vine's head crosses 88% of the viewport and
      // finishes as its tail crosses 72%.
      var head = vh * 0.88, tail = vh * 0.72;
      target = clamp((head - r.top) / (r.height + head - tail), 0, 1);
      // A short page can run out of scroll before the tail gets there, and a
      // vine that never finishes drawing looks broken. Standing at the bottom
      // of the document always means done.
      var doc = document.documentElement;
      if (window.scrollY + vh >= doc.scrollHeight - 4) target = 1;
    }

    function frame() {
      progress += (target - progress) * 0.11;
      var moving = Math.abs(target - progress) > 0.0008;
      if (!moving) progress = target;

      vines.forEach(function (v) {
        if (v.stem && v.len) v.stem.style.strokeDashoffset = v.len * (1 - progress);
        v.leaves.forEach(function (leaf) {
          leaf.classList.toggle('is-out', progress >= parseFloat(leaf.getAttribute('data-at') || '0'));
        });
      });

      if (moving || pending) { pending = false; requestAnimationFrame(frame); }
      else running = false;
    }

    function kick() {
      if (!visible) return;
      measure();
      pending = true;
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', function () { measureStems(); kick(); }, { passive: true });
    kick();
  }());


  /* ------------------------------------------------------------------
     Scroll cue retires once the guest has started scrolling
     ------------------------------------------------------------------ */
  (function cue() {
    var hero = $('#hero');
    if (!hero) return;
    addEventListener('scroll', function () {
      hero.classList.toggle('is-scrolled', window.scrollY > 40);
    }, { passive: true });
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

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Honeypot: a real guest never sees this field.
      if (form.elements.company && form.elements.company.value) return;

      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (input && !validate(input) && !firstBad) firstBad = input;
      });
      if (firstBad) {
        setStatus('', false);
        firstBad.focus();
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

      submit.disabled = true;
      $('.btn-send-label', submit).textContent = 'Sending…';
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
          form.hidden = true;
          done.hidden = false;
          $('.sheet-lede', form.parentNode).hidden = true;
          done.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        })
        .catch(function () {
          submit.disabled = false;
          $('.btn-send-label', submit).textContent = 'Send our details';
          setStatus('Something went wrong sending that. Please try again, or text it to us directly.', true);
        });
    });
  }());


  /* ------------------------------------------------------------------ */
  applyConfig();
}());
