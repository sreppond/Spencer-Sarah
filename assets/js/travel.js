/* ==========================================================================
   Sarah & Spencer — Travel & Stay

   Vanilla, no build step — see BUILDGUIDE §B.0 for why. This file grows a
   section at a time as the page does; today it drives the hero location
   map and the hero nav's hamburger toggle. assets/js/calendar.js (loaded
   alongside this) wires every [data-calendar] link on its own; nothing
   here duplicates it.
   ========================================================================== */

(function () {
  'use strict';

  var TRAVEL = window.TRAVEL || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Every root-relative path in config.js/travel-data.js (photos, audio)
     is written for index.html at the site root; this page always lives
     one level down at /travel/, so every one of those strings needs the
     same '../' every hand-written asset reference in this page's own
     markup already gets. An already-relative ('../…') or absolute
     ('https://…') path is left alone. */
  function assetPath(path) {
    if (!path) return path;
    return (/^(\.\.\/|https?:|\/)/).test(path) ? path : '../' + path;
  }

  /* ------------------------------------------------------------------
     Ambient audio — same file and gain as the save the date, read from
     config.js's `media` block, which this page already loads.

     Default on, every time this page loads — autoplay is attempted
     unconditionally, not gated on anything remembered from a prior visit
     or from the save-the-date page. Muting here (the toggle below) is a
     plain in-memory flag scoped to this page view; it is never written
     to storage, so a reload or a trip back from the save-the-date page
     starts the bed fresh rather than carrying a stale "off" over. Nothing
     on this page holds a fresh user gesture the way the envelope tap
     does, so a guest who lands here cold — every direct visit to
     /travel/ — gets a silent autoplay refusal from the browser: it does
     not accept a non-muted play() without a gesture behind it, no matter
     how quiet the bed is. The retry below is what actually starts it: it
     waits for the guest's real first interaction with the page and
     tries again then, which the policy does accept.

     🔒 Gain runs through the Web Audio API (ensureGain() below), never
     `audio.volume` directly — see the matching note in save-the-date.js.
     iOS Safari ignores HTMLMediaElement.volume entirely (reads back 1,
     writes are a no-op), so without this an iPhone plays the file at its
     raw mastered level no matter what config.audio.targetVolume says.
     ------------------------------------------------------------------ */
  (function ambientAudio() {
    var audio = $('#ambient');
    var toggle = $('#audio-toggle');
    var CFG = window.SAVE_THE_DATE || {};
    var media = CFG.media || {};
    var opts = CFG.audio || {};
    if (!audio || !toggle || !media.ambientAudio) return;

    var muted = false;
    var failed = false;
    var fadeTimer = null;
    var audioCtx = null;
    var gainNode = null;
    var gainSupported = true;

    function ensureGain() {
      if (gainNode || !gainSupported) return gainNode;
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
        var source = audioCtx.createMediaElementSource(audio);
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        source.connect(gainNode).connect(audioCtx.destination);
      } catch (e) {
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

    // See the matching, longer note in save-the-date.js: Chrome's Media
    // Engagement Index can let audio.play() through with no gesture at
    // all (this page's direct-load autoplay attempt below relies on
    // exactly that once a guest has played audio on this origin before),
    // but MEI does not extend to AudioContext.resume() — so a play() that
    // succeeds this way still leaves the graph after it silent forever
    // unless something else resumes the context. armAudioResume() is
    // that something: it fires on the guest's next real gesture whether
    // play() succeeded or failed, unlike armRetry() below which only
    // fires on failure.
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
      clearInterval(fadeTimer);
      var from = getGain();
      var t0 = performance.now();
      fadeTimer = setInterval(function () {
        var k = clamp((performance.now() - t0) / ms, 0, 1);
        setGain(clamp(from + (target - from) * k, 0, 1));
        if (k === 1) clearInterval(fadeTimer);
      }, 40);
    }

    function targetVolume() {
      return opts.targetVolume != null ? opts.targetVolume : 0.16;
    }

    function setPressed(on) {
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-label', on ? 'Turn off ambient sound' : 'Turn on ambient sound');
    }

    function revealToggle() {
      if (failed) return;
      toggle.hidden = false;
      requestAnimationFrame(function () { toggle.classList.add('is-shown'); });
    }

    function hideToggle() {
      failed = true;
      toggle.classList.remove('is-shown');
      setTimeout(function () { toggle.hidden = true; }, 400);
    }

    function tryPlay(fadeMs) {
      ensureGain();
      resumeAudioCtx();
      armAudioResume();
      setGain(0);
      var p = audio.play();
      if (p && p.then) {
        p.then(function () {
          fadeTo(targetVolume(), fadeMs);
          setPressed(true);
        }).catch(function () {
          // Autoplay refused without a fresh gesture — leave the toggle
          // showing "off". armRetry() below gets the next real one.
          setPressed(false);
        });
      }
    }

    audio.addEventListener('error', function () { hideToggle(); }, { once: true });
    audio.src = assetPath(media.ambientAudio);
    revealToggle();

    tryPlay(opts.fadeInMs || 1200);

    /* See the comment above this IIFE: a direct load never carries a
       gesture, so the attempt above almost always gets refused. Retry on
       the guest's actual first interaction with the page instead — a tap,
       a key, a scroll — which the browser's policy does accept. Only
       fires if audio isn't already playing and the guest hasn't muted it
       in the meantime; removes its own listeners once it runs. */
    (function armRetry() {
      var events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
      function attempt() {
        events.forEach(function (evt) { document.removeEventListener(evt, attempt, true); });
        if (audio.paused && !muted) tryPlay(opts.fadeInMs || 1200);
      }
      events.forEach(function (evt) {
        document.addEventListener(evt, attempt, { capture: true, once: true, passive: true });
      });
    }());

    toggle.addEventListener('click', function () {
      var on = toggle.getAttribute('aria-pressed') === 'true';
      if (on) {
        fadeTo(0, 500);
        setTimeout(function () { audio.pause(); }, 520);
        setPressed(false);
        muted = true;
      } else {
        muted = false;
        ensureGain();
        resumeAudioCtx();
        armAudioResume();
        setGain(0);
        var p = audio.play();
        if (p && p.then) {
          p.then(function () {
            fadeTo(targetVolume(), 1200);
            setPressed(true);
          }).catch(hideToggle);
        } else {
          setPressed(true);
        }
      }
    });
  }());


  /* ------------------------------------------------------------------
     Hero nav — same component, CSS and behaviour as index.html's: a
     hamburger that opens a small glass menu, an RSVP button that needs no
     script at all. Always visible here (this page has no envelope to wait
     for), so there is nothing to gate — just the open/close wiring.
     ------------------------------------------------------------------ */
  (function heroNav() {
    var toggle = $('#hero-nav-toggle');
    var menu = $('#hero-nav-menu');
    if (!toggle || !menu) return;

    var CLOSE_MS = 260;
    var closeTimer = null;

    function isOpen() { return menu.classList.contains('is-open'); }

    function openMenu() {
      clearTimeout(closeTimer);
      menu.hidden = false;
      void menu.offsetHeight;
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      if (!isOpen()) return;
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { menu.hidden = true; }, CLOSE_MS);
    }

    // Publish this bar's real rendered height as --nav-h — the same token
    // index.html's hero-nav.js publishes for its own bar (see the
    // identical block there) — so anything on this page that needs to
    // clear fixed nav chrome (.travel-section's scroll-margin-top,
    // .page-sub .paper's top padding — CSS §5.5/§11) reads the actual
    // height instead of a constant sized for a different nav.
    var heroNavEl = $('#hero-nav');
    if (heroNavEl) {
      var publishNavH = function () {
        document.documentElement.style.setProperty('--nav-h', heroNavEl.getBoundingClientRect().height + 'px');
      };
      publishNavH();
      if ('ResizeObserver' in window) {
        new ResizeObserver(publishNavH).observe(heroNavEl);
      } else {
        window.addEventListener('resize', publishNavH, { passive: true });
      }
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) { closeMenu(); } else { openMenu(); }
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        closeMenu();
        toggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }());


  /* ------------------------------------------------------------------
     Location map — replaces the old countdown clock. A small card that
     tilts toward the cursor on hover and expands on select into a real
     map centered on the venue, built from real OpenStreetMap-family
     tiles rather than a static screenshot. Collapsed by default; tiles
     are only fetched the first time a guest actually expands it, so a
     guest who never taps it never costs a third-party request.
     ------------------------------------------------------------------ */
  (function locationMap() {
    var mount = $('#location-map');
    if (!mount) return;

    var cfg = TRAVEL.locationMap || {};
    var lat = typeof cfg.lat === 'number' ? cfg.lat : 48.4108;
    var lng = typeof cfg.lng === 'number' ? cfg.lng : -114.3378;
    var zoom = cfg.zoom || 13;
    var provider = cfg.tileProvider || 'carto-light';
    var name = cfg.name || 'Whitefish, Montana';

    // Slippy-map tile math — same formula every XYZ tile provider uses.
    function latLngToTile(la, ln, z) {
      var n = Math.pow(2, z);
      var x = Math.floor((ln + 180) / 360 * n);
      var latRad = la * Math.PI / 180;
      var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
      return { x: x, y: y };
    }

    function tileUrl(x, y, z) {
      if (provider === 'carto-dark') return 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/' + z + '/' + x + '/' + y + '.png';
      if (provider === 'openstreetmap') return 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
      return 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/' + z + '/' + x + '/' + y + '.png';
    }

    function formatCoords(la, ln) {
      var latDir = la >= 0 ? 'N' : 'S';
      var lngDir = ln >= 0 ? 'E' : 'W';
      return Math.abs(la).toFixed(4) + '° ' + latDir + ', ' + Math.abs(ln).toFixed(4) + '° ' + lngDir;
    }

    mount.innerHTML = '';

    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'location-map-card';
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', name + ' — select to expand into a map');

    var grid = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    grid.setAttribute('class', 'location-map-grid');
    grid.setAttribute('aria-hidden', 'true');
    grid.innerHTML =
      '<defs><pattern id="location-map-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">' +
      '<path d="M20 0 0 0 0 20" fill="none" stroke="currentColor" stroke-width=".5"/></pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#location-map-grid-pattern)"/>';
    card.appendChild(grid);

    var tilesWrap = document.createElement('div');
    tilesWrap.className = 'location-map-tiles';
    tilesWrap.setAttribute('aria-hidden', 'true');
    var tilesInner = document.createElement('div');
    tilesInner.className = 'location-map-tiles-inner';
    tilesWrap.appendChild(tilesInner);
    card.appendChild(tilesWrap);

    var fadeTop = document.createElement('span');
    fadeTop.className = 'location-map-fade location-map-fade--top';
    card.appendChild(fadeTop);
    var fadeBottom = document.createElement('span');
    fadeBottom.className = 'location-map-fade location-map-fade--bottom';
    card.appendChild(fadeBottom);

    var marker = document.createElement('span');
    marker.className = 'location-map-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" focusable="false">' +
      '<defs><radialGradient id="location-map-marker-gradient" cx="32%" cy="28%" r="75%">' +
      '<stop offset="0%" stop-color="#d59a63"/><stop offset="55%" stop-color="#b0743f"/><stop offset="100%" stop-color="#70441f"/>' +
      '</radialGradient></defs>' +
      '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="url(#location-map-marker-gradient)"/>' +
      '<circle cx="12" cy="9" r="2.5" class="location-map-marker-hole"/>' +
      '</svg>';
    card.appendChild(marker);

    var content = document.createElement('span');
    content.className = 'location-map-content';

    var icon = document.createElement('span');
    icon.className = 'location-map-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
      '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>' +
      '<line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>';
    content.appendChild(icon);

    var textWrap = document.createElement('span');
    textWrap.className = 'location-map-text';
    var title = document.createElement('span');
    title.className = 'location-map-title';
    title.textContent = name;
    textWrap.appendChild(title);
    var coords = document.createElement('span');
    coords.className = 'location-map-coords';
    coords.textContent = formatCoords(lat, lng);
    textWrap.appendChild(coords);
    var underline = document.createElement('span');
    underline.className = 'location-map-underline';
    underline.setAttribute('aria-hidden', 'true');
    textWrap.appendChild(underline);
    content.appendChild(textWrap);

    card.appendChild(content);
    mount.appendChild(card);

    // Tiles are built once, the first time a guest expands the card —
    // never on page load, so a guest who never taps it never triggers a
    // request to a third-party tile host.
    var tilesBuilt = false;
    function buildTiles() {
      if (tilesBuilt) return;
      tilesBuilt = true;

      var center = latLngToTile(lat, lng, zoom);
      var total = 9;
      var loaded = 0;

      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          var img = document.createElement('img');
          img.className = 'location-map-tile';
          img.alt = '';
          img.loading = 'eager';
          img.decoding = 'async';
          img.style.left = ((dx + 1) * 256) + 'px';
          img.style.top = ((dy + 1) * 256) + 'px';
          img.style.transitionDelay = ((Math.abs(dx) + Math.abs(dy)) * 45) + 'ms';
          (function (img) {
            function onSettled() {
              loaded++;
              img.classList.add('is-loaded');
              if (loaded === total) tilesWrap.classList.add('is-loaded');
            }
            img.addEventListener('load', onSettled, { once: true });
            img.addEventListener('error', onSettled, { once: true });
          }(img));
          img.src = tileUrl(center.x + dx, center.y + dy, zoom);
          tilesInner.appendChild(img);
        }
      }
    }

    var expanded = false;
    function setExpanded(next) {
      if (next === expanded) return;
      expanded = next;
      card.classList.toggle('is-expanded', expanded);
      card.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      if (expanded) buildTiles();
    }

    card.addEventListener('click', function () { setExpanded(!expanded); });

    // Cursor tilt — desktop hover only, and skipped entirely under
    // prefers-reduced-motion. A light rAF lerp toward the target angle
    // reads as a soft spring without pulling in a physics library for it.
    var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (canHover && !reduced) {
      var rx = 0, ry = 0, targetRx = 0, targetRy = 0, raf = null;

      function step() {
        rx += (targetRx - rx) * 0.18;
        ry += (targetRy - ry) * 0.18;
        card.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        if (Math.abs(targetRx - rx) > 0.02 || Math.abs(targetRy - ry) > 0.02) {
          raf = requestAnimationFrame(step);
        } else {
          raf = null;
        }
      }
      function kick() { if (!raf) raf = requestAnimationFrame(step); }

      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var dx = clamp(e.clientX - (rect.left + rect.width / 2), -50, 50);
        var dy = clamp(e.clientY - (rect.top + rect.height / 2), -50, 50);
        targetRy = (dx / 50) * 8;
        targetRx = -(dy / 50) * 8;
        kick();
      });
      card.addEventListener('pointerleave', function () {
        targetRx = 0; targetRy = 0; kick();
      });
    }
  }());


  /* ------------------------------------------------------------------
     Where to Stay — the page's centerpiece: an expand-on-select image
     carousel of the five properties with a lightbox for the full detail
     on each. Built entirely from travel-data.js, so a price, a photo or
     the whole recommended order (see the note on Grouse Mountain / Hotel
     Whitefish in travel-data.js) is a data change, never a template
     change — drop real photos into an entry's `photos` array and flip
     its status and the panel/lightbox pick it up with no code change.

     One panel is "active" at a time (index 0 to start, matching the
     recommended order): its name and tagline fade in over the photo,
     and its neighbors give it most of the row's width. Hover or keyboard
     focus previews a panel without changing that state. Selecting
     (click/tap/Enter) a hover-capable panel opens the lightbox directly,
     since hovering already served as the preview; on touch, where there
     is no hover to preview with, the first select makes a panel active
     and a second select on that same, now-active panel opens the
     lightbox — see canHover below. */
  (function lodgeGallery() {
    var gallery = $('#lodge-gallery');
    var fallback = $('#lodge-fallback');
    if (!gallery) return;

    var list = TRAVEL.lodging || [];
    if (!list.length) return;   // leave the static fallback as the whole answer

    var flags = TRAVEL.flags || {};
    var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var items = [];
    var panels = [];

    var urgency = $('#lodge-urgency');
    if (urgency) urgency.textContent = (TRAVEL.lodgingBookBy || {}).text || '';

    // A bare "$$" means nothing without a scale to read it against — see
    // travel-data.js priceScale. Every price tier renders as "$$ of
    // $$$$" rather than a lone symbol, on the carousel label and in the
    // lightbox alike.
    var priceScale = TRAVEL.priceScale || {};
    var priceLegend = $('#lodge-price-legend');
    if (priceLegend) priceLegend.textContent = priceScale.legend || '';

    function priceText(tier) {
      if (!tier) return '';
      var max = priceScale.max || 4;
      return tier + ' of ' + new Array(max + 1).join('$');
    }

    // The same five-stroke sprig used on the wax seal and the mosaic's
    // empty frame (save-the-date.js `markEmpty`) — duplicated rather than
    // shared across a file boundary for one small inline icon.
    var EMPTY_MARK =
      '<span class="m-empty-mark" aria-hidden="true">' +
      '<svg viewBox="0 0 40 40" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round">' +
      '<path d="M20 34V12"/>' +
      '<path d="M20 20c0-4.2 3.4-7.6 7.6-7.6C27.6 16.6 24.2 20 20 20Z"/>' +
      '<path d="M20 27c0-3.6 2.9-6.5 6.5-6.5C26.5 24.1 23.6 27 20 27Z"/>' +
      '<path d="M20 20c0-4.2-3.4-7.6-7.6-7.6C12.4 16.6 15.8 20 20 20Z"/>' +
      '<path d="M20 27c0-3.6-2.9-6.5-6.5-6.5C13.5 24.1 16.4 27 20 27Z"/>' +
      '</g></svg></span>';

    // Only the two properties on the venue's own grounds have a checked
    // driveMinutes today (0 — trivially true). Every other property's
    // number is still unverified (see travel-data.js), so this returns
    // null rather than guess — an omitted proximity line beats a wrong
    // one, same rule the rest of the page follows.
    function proximityText(entry) {
      if (entry.id === 'lodge-at-whitefish-lake') return 'This is the venue.';
      if (entry.driveMinutes === 0) return 'On the venue’s own grounds — an easy walk to the ceremony.';
      if (typeof entry.driveMinutes === 'number') return entry.driveMinutes + ' minutes from The Lodge at Whitefish Lake.';
      return null;
    }

    function bookingStatus(entry) {
      if (entry.isRoomBlock) return flags.ROOM_BLOCK_CONFIRMED ? 'room-block' : 'details-coming';
      if (entry.bookingUrl) return 'book-now';
      return 'details-coming';
    }

    function badgeFor(entry) {
      if (entry.badge) return entry.badge;
      if (entry.isRoomBlock && flags.ROOM_BLOCK_CONFIRMED) return 'Room Block';
      return null;
    }

    // A room block that hasn't been confirmed by the property yet (see
    // flags.ROOM_BLOCK_CONFIRMED in travel-data.js) still deserves a
    // callout — guests should know Grouse Mountain Lodge is where we're
    // trying to get one, just not the gold "confirmed" treatment
    // badgeFor() reserves for once the property has actually signed off.
    function pendingRoomBlockBadge(entry) {
      return (entry.isRoomBlock && !flags.ROOM_BLOCK_CONFIRMED) ? 'Room Block – Pending' : null;
    }

    function mapsLink(address) {
      return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
    }

    /* ---- carousel panels ---------------------------------------------- */

    function buildMedia(entry) {
      var wrap = document.createElement('span');
      wrap.className = 'lodge-carousel-media';
      var photos = entry.photos || [];

      if (!photos.length) {
        wrap.classList.add('is-empty');
        wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
      } else {
        var img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        img.addEventListener('error', function () {
          wrap.classList.add('is-empty');
          wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
        }, { once: true });
        img.src = assetPath(photos[0]);
        wrap.appendChild(img);
      }

      return wrap;
    }

    // Sets which panel is "active" — the one a touch select will open the
    // lightbox for, and the one whose full label (name + tagline + price)
    // stays shown even without hover/focus. Every other panel falls back
    // to its collapsed name-only spine — see .lodge-carousel-spine in
    // save-the-date.css for how that swap is animated. .is-active lives
    // on the <li>, not the button: that's the flex item the carousel row
    // actually grows, so that's what the CSS expand rules key off.
    function setActive(index) {
      items.forEach(function (item, i) {
        item.classList.toggle('is-active', i === index);
      });
      panels.forEach(function (panel, i) {
        panel.setAttribute('aria-pressed', String(i === index));
      });
    }

    function buildPanel(entry, index) {
      var li = document.createElement('li');
      li.className = 'lodge-carousel-item';

      var panel = document.createElement('button');
      panel.type = 'button';
      panel.className = 'lodge-carousel-panel';
      panel.setAttribute('aria-haspopup', 'dialog');
      panel.setAttribute('aria-pressed', 'false');
      var labelBits = [entry.name];
      if (entry.priceTier) labelBits.push(priceText(entry.priceTier));
      labelBits.push('view details');
      panel.setAttribute('aria-label', labelBits.join(', '));

      panel.appendChild(buildMedia(entry));

      var shadow = document.createElement('span');
      shadow.className = 'lodge-carousel-shadow';
      shadow.setAttribute('aria-hidden', 'true');
      panel.appendChild(shadow);

      var badges = document.createElement('span');
      badges.className = 'lodge-gallery-badges';
      var badgeText = badgeFor(entry);
      if (badgeText) {
        var badge = document.createElement('span');
        badge.className = 'lodge-gallery-badge';
        badge.textContent = badgeText;
        badges.appendChild(badge);
      }
      var pendingBlockText = pendingRoomBlockBadge(entry);
      if (pendingBlockText) {
        var pendingBlock = document.createElement('span');
        pendingBlock.className = 'lodge-gallery-badge lodge-gallery-badge--pending';
        pendingBlock.textContent = pendingBlockText;
        badges.appendChild(pendingBlock);
      }
      if (!(entry.photos || []).length) {
        var pending = document.createElement('span');
        pending.className = 'lodge-gallery-badge lodge-gallery-badge--pending';
        pending.textContent = 'Details coming';
        badges.appendChild(pending);
      }
      panel.appendChild(badges);

      // Always-visible collapsed name — vertical on the desktop row
      // layout, a small horizontal bar on the mobile column layout (see
      // the breakpoint in .lodge-carousel-spine) — so a guest can tell
      // the five properties apart before expanding any of them. Fades out
      // in favor of .lodge-carousel-label the moment this panel is
      // hovered, focused, or made active.
      var spine = document.createElement('span');
      spine.className = 'lodge-carousel-spine';
      spine.setAttribute('aria-hidden', 'true');
      spine.textContent = entry.name;
      panel.appendChild(spine);

      var label = document.createElement('span');
      label.className = 'lodge-carousel-label';

      var text = document.createElement('span');
      text.className = 'lodge-carousel-text';
      var name = document.createElement('span');
      name.className = 'lodge-carousel-name';
      name.textContent = entry.name;
      text.appendChild(name);
      var sub = document.createElement('span');
      sub.className = 'lodge-carousel-sub';
      sub.textContent = entry.tagline || entry.bestFor || '';
      text.appendChild(sub);
      label.appendChild(text);

      if (entry.priceTier) {
        var price = document.createElement('span');
        price.className = 'lodge-carousel-price';
        price.textContent = priceText(entry.priceTier);
        label.appendChild(price);
      }
      panel.appendChild(label);

      li.appendChild(panel);
      items.push(li);
      panels.push(panel);

      // Hover-capable pointers already got their preview from :hover —
      // selecting opens the lightbox straight away, same as the old card
      // grid. Touch has no hover, so the first select previews (makes the
      // panel active) and only a second select, on that same now-active
      // panel, opens the lightbox.
      panel.addEventListener('click', function () {
        if (canHover || li.classList.contains('is-active')) {
          lightbox.open(index, panel);
        } else {
          setActive(index);
        }
      });

      return li;
    }

    list.forEach(function (entry, index) {
      var item = buildPanel(entry, index);
      // A small per-panel stagger on top of the shared reveal transition
      // below — capped low enough that even all five in view at once (a
      // wide desktop viewport) finish inside half a second. Written as
      // an explicit list matching .lodge-carousel-item's transition-
      // property order (opacity, transform, flex-grow) in save-the-
      // date.css — a bare single value would apply to all three,
      // including flex-grow, and every hover-expand after the initial
      // reveal would inherit this same stagger as a startup lag.
      var revealDelay = Math.min(index * 0.06, 0.3) + 's';
      item.style.transitionDelay = revealDelay + ', ' + revealDelay + ', 0s';
      gallery.appendChild(item);
    });

    // One panel reads as active from the first paint — otherwise the row
    // looks like five unlabeled photos until something is hovered or
    // tapped. Index 0 is the recommended property (see travel-data.js).
    setActive(0);

    gallery.hidden = false;
    if (fallback) fallback.classList.add('is-superseded');

    if (fallback && /localhost|127\.0\.0\.1/.test(location.hostname)) {
      var staticCount = $$('li', fallback).length;
      if (staticCount !== list.length) {
        console.warn(
          '[travel] the static lodge-fallback list has ' + staticCount +
          ' properties but travel-data.js has ' + list.length + '. Update the static <ul> in travel/index.html to match.'
        );
      }
    }

    // Same fade + rise the Weekend cards use (see weekend() below) —
    // one motion language for "content arriving on scroll" across the
    // page, not a bespoke one just for this section.
    if (reduced || !('IntersectionObserver' in window)) {
      $$('.lodge-carousel-item', gallery).forEach(function (li) { li.classList.add('is-revealed'); });
    } else {
      var revealIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            revealIo.unobserve(entry.target);
          }
        });
      }, { threshold: .2 });
      $$('.lodge-carousel-item', gallery).forEach(function (li) { revealIo.observe(li); });
    }

    /* ---- lightbox ------------------------------------------------------
       One dialog, reused for all five properties — see the markup note in
       travel/index.html. Built once here rather than per-card: there is
       only ever one open at a time. */
    var lightbox = (function () {
      var root = $('#lodge-lightbox');
      if (!root) return { open: function () {} };

      var backdrop = $('#lodge-lightbox-backdrop');
      var dialog = $('#lodge-lightbox-dialog');
      var closeBtn = $('#lodge-lightbox-close');
      var mediaEl = $('#lodge-lightbox-media');
      var badgesEl = $('#lodge-lightbox-badges');
      var nameEl = $('#lodge-lightbox-name');
      var priceEl = $('#lodge-lightbox-price');
      var blurbEl = $('#lodge-lightbox-blurb');
      var proximityEl = $('#lodge-lightbox-proximity');
      var metaEl = $('#lodge-lightbox-meta');
      var actionsEl = $('#lodge-lightbox-actions');

      var trigger = null;
      var photoIndex = 0;
      var currentPhotos = [];
      var closeTimer = null;

      function todoOrText(value, label) {
        if (value) return { text: value, todo: false };
        return { text: label + ' – details coming.', todo: true };
      }

      function buildMedia(entry) {
        mediaEl.innerHTML = '';
        currentPhotos = entry.photos || [];
        photoIndex = 0;

        if (!currentPhotos.length) {
          var empty = document.createElement('div');
          empty.className = 'lightbox-photo-empty';
          empty.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
          mediaEl.appendChild(empty);
          return;
        }

        var track = document.createElement('div');
        track.className = 'lightbox-photo-track';
        currentPhotos.forEach(function (src) {
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = '';
          img.src = assetPath(src);
          track.appendChild(img);
        });
        mediaEl.appendChild(track);

        if (currentPhotos.length > 1) {
          var prev = document.createElement('button');
          prev.type = 'button';
          prev.className = 'lightbox-photo-nav lightbox-photo-nav--prev';
          prev.setAttribute('aria-label', 'Previous photo');
          prev.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          var next = document.createElement('button');
          next.type = 'button';
          next.className = 'lightbox-photo-nav lightbox-photo-nav--next';
          next.setAttribute('aria-label', 'Next photo');
          next.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          prev.addEventListener('click', function () { showPhoto(photoIndex - 1); });
          next.addEventListener('click', function () { showPhoto(photoIndex + 1); });
          mediaEl.appendChild(prev);
          mediaEl.appendChild(next);

          var dots = document.createElement('div');
          dots.className = 'lightbox-photo-dots';
          dots.setAttribute('role', 'tablist');
          dots.setAttribute('aria-label', 'Photos');
          currentPhotos.forEach(function (_, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'lightbox-photo-dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + currentPhotos.length);
            dot.addEventListener('click', function () { showPhoto(i); });
            dots.appendChild(dot);
          });
          mediaEl.appendChild(dots);

          bindDrag();
        }

        showPhoto(0, 'none');
      }

      /* 1:1 pointer-tracked swipe. What this replaced only read the start
         and end point of a touch — the track never moved until release,
         and always animated the same fixed .35s regardless of how fast or
         slow the gesture was. This tracks the finger live during the drag,
         rubber-bands past the first/last photo instead of a silent no-op,
         and hands the release velocity to the settle so a flick lands
         quicker than a slow drag does (§5/§6 of the fluid-interface note:
         velocity handoff, then project where the gesture was headed).
         The prev/next buttons and dots keep their existing wrap-around —
         only the drag itself treats the ends as real boundaries, since
         there's nothing to reveal sliding in from the far side without
         cloning slides. */
      function bindDrag() {
        var track = $('.lightbox-photo-track', mediaEl);
        if (!track || !('PointerEvent' in window)) return;

        var pointerId = null;
        var dragging = false;
        var startX = 0;
        var baseX = 0;    // track's translateX (px) when the drag began
        var lastX = 0;
        var lastT = 0;
        var velocity = 0; // px/ms, from the most recent move
        var width = 0;

        mediaEl.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          if (currentPhotos.length < 2) return;
          pointerId = e.pointerId;
          startX = lastX = e.clientX;
          lastT = e.timeStamp;
          velocity = 0;
          width = mediaEl.clientWidth || 1;
          baseX = -photoIndex * width;
        });

        mediaEl.addEventListener('pointermove', function (e) {
          if (pointerId === null || e.pointerId !== pointerId) return;
          var dx = e.clientX - startX;

          // A real tap on the prev/next/dot controls moves ~0px — this
          // hysteresis is what keeps a click a click instead of every tap
          // becoming a zero-distance drag.
          if (!dragging) {
            if (Math.abs(dx) < 10) return;
            dragging = true;
            // Guards a real but rare edge case — capture can be refused
            // (e.g. a pointer another handler already captured) — without
            // it, an uncaught throw here would abort this handler mid-way
            // and leave the track not following the finger for the rest
            // of the gesture.
            try { mediaEl.setPointerCapture(pointerId); } catch (err) {}
            track.style.transition = 'none';
          }

          e.preventDefault();
          var dt = e.timeStamp - lastT;
          // Guard against two events landing close enough in time that a
          // tiny dt turns an ordinary move into a spurious huge velocity —
          // clamp to a ceiling well past any real flick (3px/ms = 3000px/s)
          // rather than trusting division by a near-zero denominator.
          if (dt > 0) velocity = clamp((e.clientX - lastX) / dt, -3, 3);
          lastX = e.clientX;
          lastT = e.timeStamp;

          var raw = baseX + dx;
          var min = -(currentPhotos.length - 1) * width;
          var x = raw > 0 ? rubberband(raw, width)
                : raw < min ? min - rubberband(min - raw, width)
                : raw;
          track.style.transform = 'translateX(' + x + 'px)';
        });

        function endDrag(e) {
          if (pointerId === null || (e && e.pointerId !== pointerId)) return;
          var wasDragging = dragging;
          pointerId = null;
          dragging = false;
          if (!wasDragging) return;

          // Project where the gesture was headed rather than snapping to
          // the release point alone — a fast flick that hasn't crossed
          // the halfway mark still advances if it's moving fast enough.
          var dx = lastX - startX;
          var projected = dx + velocity * 120;
          var deltaIndex = Math.round(-projected / width);
          var target = clamp(photoIndex + deltaIndex, 0, currentPhotos.length - 1);

          var remainingPx = Math.abs(target * -width - (baseX + dx));
          var speed = Math.max(Math.abs(velocity), .35); // px/ms floor so a barely-moving release still settles promptly
          var duration = clamp(remainingPx / speed / 1000, .18, .5);
          showPhoto(target, 'transform ' + duration.toFixed(2) + 's var(--ease-out)');
        }

        mediaEl.addEventListener('pointerup', endDrag);
        mediaEl.addEventListener('pointercancel', endDrag);
      }

      // The further past the first/last photo, the less it follows — same
      // resistance curve as a native scroll bounce, so the boundary reads
      // as "there's nothing more here" instead of "frozen".
      function rubberband(overshoot, dimension) {
        var k = .55;
        return (overshoot * dimension * k) / (dimension + k * overshoot);
      }

      function showPhoto(i, transition) {
        if (!currentPhotos.length) return;
        photoIndex = (i + currentPhotos.length) % currentPhotos.length;
        var track = $('.lightbox-photo-track', mediaEl);
        if (track) {
          // Explicit on every call, not just during a drag: without this,
          // a transition value left behind by the last drag's custom
          // settle duration would silently apply to the next plain
          // button/dot tap too. No override falls back to the stylesheet's
          // own .35s var(--ease-out) — reduced-motion clamps either one.
          track.style.transition = transition || '';
          track.style.transform = 'translateX(' + (photoIndex * -100) + '%)';
        }
        $$('.lightbox-photo-dot', mediaEl).forEach(function (dot, n) {
          dot.setAttribute('aria-selected', String(n === photoIndex));
        });
      }

      function buildBadges(entry) {
        badgesEl.innerHTML = '';
        var text = badgeFor(entry);
        if (text) {
          var badge = document.createElement('span');
          badge.className = 'lodge-gallery-badge';
          badge.textContent = text;
          badgesEl.appendChild(badge);
        }
        var pendingBlockText = pendingRoomBlockBadge(entry);
        if (pendingBlockText) {
          var pendingBlock = document.createElement('span');
          pendingBlock.className = 'lodge-gallery-badge lodge-gallery-badge--pending';
          pendingBlock.textContent = pendingBlockText;
          badgesEl.appendChild(pendingBlock);
        }
      }

      // Two visually separate groups rather than one run-on block: what
      // the property has (amenities), then how to find/reach it (address,
      // phone) — a reader scanning the panel is asking two different
      // questions, not one.
      function buildMeta(entry) {
        metaEl.innerHTML = '';

        if (entry.amenities && entry.amenities.length) {
          var amenities = document.createElement('p');
          amenities.className = 'lodge-lightbox-amenities';
          amenities.textContent = entry.amenities.join(' · ');
          metaEl.appendChild(amenities);
        }

        // noFixedAddress (e.g. "Vacation rentals") is a category, not one
        // property — it will never get a single street address or phone
        // number, so "Address – details coming" would be a promise this
        // entry can't keep. Skip the contact block entirely for it.
        if (!entry.noFixedAddress) {
          var contact = document.createElement('p');
          contact.className = 'lodge-lightbox-contact';
          [todoOrText(entry.address, 'Address'), todoOrText(entry.phone, 'Phone')].forEach(function (p, i) {
            if (i > 0) contact.appendChild(document.createElement('br'));
            var span = document.createElement('span');
            if (p.todo) span.className = 'is-todo';
            span.textContent = p.text;
            contact.appendChild(span);
          });
          metaEl.appendChild(contact);
        }
      }

      function buildActions(entry) {
        actionsEl.innerHTML = '';
        var status = bookingStatus(entry);

        if (status === 'room-block' && TRAVEL.roomBlock && TRAVEL.roomBlock.code) {
          var codeBtn = document.createElement('button');
          codeBtn.type = 'button';
          codeBtn.className = 'lodge-detail-code';
          var codeLabelText = 'Copy the group code: ' + TRAVEL.roomBlock.code;
          codeBtn.setAttribute('aria-label', codeLabelText);
          var codeLabel = document.createElement('span');
          codeLabel.className = 'lodge-detail-code-label';
          codeLabel.setAttribute('aria-hidden', 'true');
          codeLabel.textContent = codeLabelText;
          var codeLabelDone = document.createElement('span');
          codeLabelDone.className = 'lodge-detail-code-label lodge-detail-code-label--done';
          codeLabelDone.setAttribute('aria-hidden', 'true');
          codeLabelDone.textContent = 'Copied ✓';
          codeBtn.appendChild(codeLabel);
          codeBtn.appendChild(codeLabelDone);
          var toast = document.createElement('span');
          toast.className = 'lodge-detail-toast';
          toast.setAttribute('role', 'status');
          toast.textContent = 'Copied.';
          var hideTimer = null;
          codeBtn.addEventListener('click', function () {
            var code = TRAVEL.roomBlock.code;
            var done = function () {
              codeBtn.classList.add('is-copied');
              toast.classList.add('is-shown');
              if (hideTimer) clearTimeout(hideTimer);
              hideTimer = setTimeout(function () {
                codeBtn.classList.remove('is-copied');
                toast.classList.remove('is-shown');
              }, 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(code).then(done).catch(done);
            } else {
              done();
            }
          });
          actionsEl.appendChild(codeBtn);
          actionsEl.appendChild(toast);
        } else if (status === 'room-block' && TRAVEL.roomBlock && TRAVEL.roomBlock.groupName) {
          // Our actual room block: a phone call, not a code to copy —
          // see the note on `roomBlock` in travel-data.js.
          var callNote = document.createElement('p');
          callNote.className = 'lodge-detail-meta';
          callNote.textContent = TRAVEL.roomBlock.blurb ||
            ('Call and mention the “' + TRAVEL.roomBlock.groupName + '” block.');
          actionsEl.appendChild(callNote);

          if (TRAVEL.roomBlock.reservationsPhone) {
            var callBtn = document.createElement('a');
            callBtn.className = 'flow-btn flow-btn--gold lodge-detail-book';
            callBtn.href = 'tel:' + TRAVEL.roomBlock.reservationsPhone.replace(/[^\d+]/g, '');
            callBtn.innerHTML =
              '<span class="flow-btn__ink" aria-hidden="true"></span>' +
              '<span class="flow-btn__content">' +
              '<svg class="flow-btn__arrow flow-btn__arrow--in" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
              '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '<span class="flow-btn__label">Call ' + TRAVEL.roomBlock.reservationsPhone + '</span>' +
              '<svg class="flow-btn__arrow flow-btn__arrow--out" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
              '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              '</span>';
            actionsEl.appendChild(callBtn);
          }
        } else if (entry.isRoomBlock && !flags.ROOM_BLOCK_CONFIRMED) {
          var pendingNote = document.createElement('p');
          pendingNote.className = 'lodge-detail-meta is-todo';
          pendingNote.textContent = 'Room block details coming.';
          actionsEl.appendChild(pendingNote);

          // Nothing to book yet, so point at the mechanism the site
          // already has instead of leaving this a dead end: the same
          // guest-info form the save the date collects addresses through.
          var followUp = document.createElement('a');
          followUp.className = 'lodge-detail-directions';
          followUp.href = '../#details';
          followUp.textContent = 'Leave your info and we’ll email you the moment this confirms';
          actionsEl.appendChild(followUp);
        }

        if (entry.bookingUrl) {
          var book = document.createElement('a');
          book.className = 'flow-btn flow-btn--gold lodge-detail-book';
          book.href = entry.bookingUrl;
          book.target = '_blank';
          book.rel = 'noopener noreferrer';
          book.innerHTML =
            '<span class="flow-btn__ink" aria-hidden="true"></span>' +
            '<span class="flow-btn__content">' +
            '<svg class="flow-btn__arrow flow-btn__arrow--in" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
            '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span class="flow-btn__label">Book</span>' +
            '<svg class="flow-btn__arrow flow-btn__arrow--out" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
            '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</span>';
          actionsEl.appendChild(book);
        }
        // No bookingUrl: no button at all — a dead link on a card someone
        // is actually trying to book from is worse than no link.

        if (entry.address) {
          var directions = document.createElement('a');
          directions.className = 'lodge-detail-directions';
          directions.href = mapsLink(entry.address);
          directions.target = '_blank';
          directions.rel = 'noopener noreferrer';
          directions.textContent = 'Get directions';
          actionsEl.appendChild(directions);
        }
      }

      function focusable() {
        return $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', dialog)
          .filter(function (el) { return el.offsetParent !== null; });
      }

      function onKeydown(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'Tab') return;
        var f = focusable();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }

      function open(index, triggerEl) {
        var entry = list[index];
        if (!entry) return;
        trigger = triggerEl || null;
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }

        buildMedia(entry);
        buildBadges(entry);
        nameEl.textContent = entry.name;
        priceEl.textContent = priceText(entry.priceTier);
        var blurbInfo = todoOrText(entry.blurb, 'More about ' + entry.name);
        blurbEl.textContent = blurbInfo.text;
        blurbEl.classList.toggle('is-todo', blurbInfo.todo);
        var prox = proximityText(entry);
        proximityEl.textContent = prox || '';
        proximityEl.hidden = !prox;
        buildMeta(entry);
        buildActions(entry);

        root.hidden = false;
        document.documentElement.classList.add('lodge-lightbox-open');
        // rAF so the browser paints the pre-transition state before the
        // class flips — without this the open transition never runs.
        requestAnimationFrame(function () {
          root.classList.add('is-open');
        });
        dialog.addEventListener('keydown', onKeydown);
        backdrop.addEventListener('click', close);
        (closeBtn.focus ? closeBtn : dialog).focus();
      }

      function close() {
        root.classList.remove('is-open');
        document.documentElement.classList.remove('lodge-lightbox-open');
        dialog.removeEventListener('keydown', onKeydown);
        backdrop.removeEventListener('click', close);
        var delay = reduced ? 0 : 250;
        closeTimer = setTimeout(function () { root.hidden = true; }, delay);
        if (trigger && trigger.focus) trigger.focus();
        trigger = null;
      }

      closeBtn.addEventListener('click', close);

      return { open: open, close: close };
    }());
  }());


  /* ------------------------------------------------------------------
     The Weekend — three cards, revealed one at a time on scroll. Most
     fields are TODO by design (§E items 4, 7); a card that says "details
     coming, but plan to be here" is far more useful than empty space.
     ------------------------------------------------------------------ */
  (function weekend() {
    var list = $('#weekend-list');
    if (!list) return;

    var schedule = TRAVEL.schedule || [];
    var flags = TRAVEL.flags || {};

    function fmtDate(iso) {
      var d = new Date(iso + 'T12:00:00Z');   // noon UTC sidesteps any TZ date-rollback
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
    }

    schedule.forEach(function (item, i) {
      var known = item.flag ? !!flags[item.flag] : !!(item.time || item.venue || item.blurb);

      var li = document.createElement('li');
      li.className = 'weekend-card';

      // Purely decorative — the day name already carries the information;
      // this just gives each card in the desktop 3-up grid (§11.5) a quiet
      // typographic anchor instead of leaving three text-only columns with
      // nothing to tell them apart at a glance. Hidden from assistive tech
      // since it's redundant with weekend-day.
      var headWrap = document.createElement('div');
      headWrap.className = 'weekend-card-head';
      var num = document.createElement('span');
      num.className = 'weekend-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = ('0' + (i + 1)).slice(-2);
      headWrap.appendChild(num);

      var head = document.createElement('p');
      head.className = 'weekend-heading';
      var day = document.createElement('span');
      day.className = 'weekend-day';
      day.textContent = item.day;
      var date = document.createElement('span');
      date.className = 'weekend-date';
      date.textContent = fmtDate(item.date);
      head.appendChild(day);
      head.appendChild(date);
      headWrap.appendChild(head);
      li.appendChild(headWrap);

      var title = document.createElement('p');
      title.className = 'weekend-title';
      title.textContent = item.title;
      li.appendChild(title);

      var detail = document.createElement('p');
      detail.className = 'weekend-detail';
      if (known && (item.time || item.venue || item.blurb)) {
        // Time set off in its own <strong> so the one fact that changes a
        // guest's plans (when to be there) reads first and boldest; venue
        // becomes a real link when a URL is on hand (see the welcome
        // party's Herb & Omni link in travel-data.js) instead of plain text.
        var wroteAny = false;
        if (item.time) {
          var timeEl = document.createElement('strong');
          timeEl.className = 'weekend-time';
          timeEl.textContent = item.time;
          detail.appendChild(timeEl);
          wroteAny = true;
        }
        if (item.venue) {
          if (wroteAny) detail.appendChild(document.createTextNode(' – '));
          if (item.venueUrl) {
            var venueLink = document.createElement('a');
            venueLink.href = item.venueUrl;
            venueLink.target = '_blank';
            venueLink.rel = 'noopener noreferrer';
            venueLink.textContent = item.venue;
            detail.appendChild(venueLink);
          } else {
            detail.appendChild(document.createTextNode(item.venue));
          }
          wroteAny = true;
        }
        if (item.blurb) {
          if (wroteAny) detail.appendChild(document.createTextNode(' – '));
          detail.appendChild(document.createTextNode(item.blurb));
        }
      } else {
        detail.classList.add('is-todo');
        detail.textContent = 'Details coming.';
      }
      li.appendChild(detail);

      list.appendChild(li);
    });

    if (reduced || !('IntersectionObserver' in window)) {
      $$('.weekend-card', list).forEach(function (c) { c.classList.add('is-revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: .3 });

    $$('.weekend-card', list).forEach(function (c) { io.observe(c); });
  }());


  /* ------------------------------------------------------------------
     Questions — one flat FAQ accordion (native <details>, no JS required
     for the interaction itself — see travel-data.js `faq` for why the
     old category tabs are gone) plus the contact card with Sarah and
     Spencer's own numbers.
     ------------------------------------------------------------------ */
  (function questions() {
    var faq = $('#faq');
    var items = TRAVEL.faq || [];

    if (faq && items.length) {
      var flags = TRAVEL.flags || {};

      items.forEach(function (item) {
        var known = item.flag ? !!flags[item.flag] : !!item.a;

        var details = document.createElement('details');
        details.className = 'faq-item';
        var summary = document.createElement('summary');
        summary.textContent = item.q;
        details.appendChild(summary);

        var answer = document.createElement('div');
        answer.className = 'faq-answer';
        if (known && item.a) {
          answer.textContent = item.a;
        } else {
          answer.classList.add('is-todo');
          answer.textContent = 'Answer coming.';
        }
        details.appendChild(answer);
        faq.appendChild(details);
      });
    }

    var contacts = TRAVEL.contacts || {};

    var line = $('#local-contact-line');
    if (line && contacts.intro) line.textContent = 'Questions before then? ' + contacts.intro;

    var localMeta = $('#local-contact-meta');
    if (localMeta) {
      var people = contacts.people || [];
      if (people.length) {
        localMeta.innerHTML = people.map(function (p) {
          return p.name + (p.phone ? ' – ' + p.phone : ' – <span class="is-todo">phone coming</span>');
        }).join('<br>');
      }
    }
  }());


}());
