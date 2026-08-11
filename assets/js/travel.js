/* ==========================================================================
   Sarah & Spencer — Travel & Stay

   Vanilla, no build step — see BUILDGUIDE §B.0 for why. This file grows a
   section at a time as the page does; today it drives the hero countdown
   and the scroll-spy nav. assets/js/calendar.js (loaded alongside this)
   wires every [data-calendar] link on its own; nothing here duplicates it.
   ========================================================================== */

(function () {
  'use strict';

  var TRAVEL = window.TRAVEL || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }


  /* ------------------------------------------------------------------
     Site nav — same component and CSS as the save-the-date's (A3), a
     different link set, gated off this page's own hero rather than the
     save-the-date's. Deliberately does not reference site-nav.js or
     .hero-viewport at all, so nothing here can ever touch the protected
     element that script watches.
     ------------------------------------------------------------------ */
  (function nav() {
    var nav = $('#site-nav');
    var hero = $('#travel-hero');
    if (!nav) return;

    if (!hero || !('IntersectionObserver' in window)) {
      nav.classList.add('is-shown');
    } else {
      var io = new IntersectionObserver(function (entries) {
        var entry = entries[entries.length - 1];
        var cleared = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        nav.classList.toggle('is-shown', cleared);
      }, { threshold: 0 });
      io.observe(hero);
    }

    // Smooth scroll for the in-page nav links, switched off under reduced
    // motion by the sitewide *{scroll-behavior:auto!important} rule in
    // CSS §9 — this class is the only thing that turns it on at all.
    if (!reduced) document.documentElement.classList.add('smooth-scroll');

    /* ---- scroll-spy: which section is "active" -----------------------
       rootMargin shrinks the observed viewport to a thin band at 45-55%
       of the screen, so the active link flips when a section crosses the
       vertical middle rather than merely entering at the bottom edge —
       the difference between highlighting what the guest is *reading*
       versus what has merely started to appear below the fold. */
    var links = $$('#travel-nav-links a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }());


  /* ------------------------------------------------------------------
     Countdown — days / hours / minutes to the wedding. Seconds are
     frantic and burn battery for nothing, so the interval is a minute,
     not a frame.

     The ceremony's exact start time is not confirmed (see config.js
     flags.CEREMONY_TIME_CONFIRMED) — same honesty rule as the calendar
     action: count to local midnight on the day itself until a real time
     exists, rather than guessing an hour that might be wrong.
     ------------------------------------------------------------------ */
  (function countdown() {
    var root = $('#countdown');
    if (!root) return;

    var grid = $('#countdown-grid');
    var passed = $('#countdown-passed');
    var live = $('#countdown-live');
    var daysEl = $('#cd-days'), hoursEl = $('#cd-hours'), minsEl = $('#cd-mins');

    var CFG = window.SAVE_THE_DATE || {};
    var date = CFG.date || {};
    var flags = CFG.flags || {};

    // Local-time + UTC-offset string → a UTC instant, same technique
    // calendar.js uses for the .ics file, kept independent here rather
    // than shared across a file boundary for one nine-line function.
    function localToUtc(local, offset) {
      var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(local || '');
      if (!m) return null;
      var o = /^([+-])(\d{2}):?(\d{2})$/.exec(offset || '+00:00');
      var minutes = o ? (o[1] === '-' ? -1 : 1) * (parseInt(o[2], 10) * 60 + parseInt(o[3], 10)) : 0;
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - minutes * 60000);
    }

    var target = flags.CEREMONY_TIME_CONFIRMED
      ? localToUtc(date.startLocal, date.utcOffset)
      : localToUtc((date.iso || '').replace(/-/g, '') + 'T000000', date.utcOffset);

    if (!target) { root.hidden = true; return; }

    function setCell(el, value) {
      var str = String(value);
      if (!el || el.textContent === str) return;
      el.textContent = str;
      if (reduced) return;
      // Restart the CSS animation by forcing a reflow between removing
      // and re-adding the class — the standard "no-op change won't
      // retrigger a keyframe" workaround.
      el.classList.remove('is-rolling');
      void el.offsetWidth;
      el.classList.add('is-rolling');
    }

    var announced = false;

    function tick() {
      var diff = target.getTime() - Date.now();

      if (diff <= 0) {
        grid.hidden = true;
        passed.hidden = false;
        clearInterval(timer);
        return;
      }

      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);

      setCell(daysEl, days);
      setCell(hoursEl, hours);
      setCell(minsEl, mins);

      // One announcement, not one per minute — a live region that
      // re-announces every 60 seconds is noise, not information.
      if (!announced && live) {
        announced = true;
        live.textContent = days + ' days, ' + hours + ' hours and ' + mins + ' minutes until the wedding.';
      }
    }

    tick();
    var timer = setInterval(tick, 60000);
  }());


  /* ------------------------------------------------------------------
     Getting Here — the flight finder.

     Progressive enhancement over a plain, always-correct static list:
     the three-column fallback in the markup is what a guest with no
     JavaScript sees and what the print stylesheet shows, and it is
     the truth until this function actually runs.
     ------------------------------------------------------------------ */
  (function flightFinder() {
    var finder = $('#flight-finder');
    var fallback = $('#flight-fallback');
    if (!finder) return;

    var origins = ((TRAVEL.flights || {}).origins || []).slice();
    if (!origins.length) return;   // nothing to search — leave the static list as the whole answer

    finder.hidden = false;
    if (fallback) fallback.classList.add('is-superseded');

    var input = $('#flight-search');
    var listbox = $('#flight-listbox');
    var result = $('#flight-result');
    var carNote = $('#flight-car-note');

    // Currently always false in travel-data.js — this only ever fires
    // once Spencer has an actual shuttle arranged, and the schema has no
    // shuttle-detail fields yet, so the replacement text stays generic
    // and points at where the real details will land.
    if (carNote && (TRAVEL.flags || {}).SHUTTLE_CONFIRMED) {
      carNote.textContent = 'A shuttle is arranged for the wedding day — see "The Weekend" below for pickup times. Renting a car is optional.';
    }

    var matches = [];
    var activeIndex = -1;

    function norm(s) { return (s || '').toLowerCase(); }

    function joinAnd(list) {
      list = list || [];
      if (list.length <= 1) return list[0] || '';
      return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
    }

    function copyFor(o) {
      if (o.status === 'nonstop-year-round') {
        return { cls: 'nonstop-year-round', line: 'Nonstop on ' + joinAnd(o.airlines) + ', year-round.' };
      }
      if (o.status === 'nonstop-seasonal') {
        return {
          cls: 'nonstop-seasonal',
          line: 'Nonstop on ' + joinAnd(o.airlines) + ' — seasonal, so confirm the June 2027 schedule when you book.'
        };
      }
      var via = (o.via && o.via.length) ? o.via.join(', ') : 'Seattle, Denver, or Minneapolis';
      return { cls: 'connect', line: 'One stop, usually through ' + via + '.' };
    }

    function closeList() {
      listbox.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    }

    function setActive(i) {
      var opts = $$('.flight-option', listbox);
      opts.forEach(function (o, n) { o.classList.toggle('is-active', n === i); });
      activeIndex = i;
      if (i > -1 && opts[i]) input.setAttribute('aria-activedescendant', opts[i].id);
      else input.removeAttribute('aria-activedescendant');
    }

    function select(o) {
      input.value = o.city;
      closeList();

      var c = copyFor(o);
      result.className = 'flight-result flight-result--' + c.cls;
      result.innerHTML = '';

      var cityEl = document.createElement('p');
      cityEl.className = 'flight-result-city';
      cityEl.textContent = o.city;
      var lineEl = document.createElement('p');
      lineEl.className = 'flight-result-line';
      lineEl.textContent = c.line;
      result.appendChild(cityEl);
      result.appendChild(lineEl);

      if (o.note) {
        var noteEl = document.createElement('p');
        noteEl.className = 'flight-result-note';
        noteEl.textContent = o.note;
        result.appendChild(noteEl);
      }
      result.hidden = false;
    }

    function render(query) {
      var q = norm(query.trim());
      listbox.innerHTML = '';
      activeIndex = -1;

      if (!q) { closeList(); return; }

      matches = origins.filter(function (o) { return norm(o.city).indexOf(q) > -1; }).slice(0, 8);

      if (!matches.length) {
        var empty = document.createElement('li');
        empty.className = 'flight-listbox-empty';
        empty.textContent = 'No matching city — try the nearest major airport.';
        listbox.appendChild(empty);
        listbox.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        return;
      }

      matches.forEach(function (o, i) {
        var li = document.createElement('li');
        li.className = 'flight-option';
        li.id = 'flight-opt-' + i;
        li.setAttribute('role', 'option');
        li.textContent = o.city;
        var code = document.createElement('span');
        code.className = 'flight-option-code';
        code.textContent = o.code;
        li.appendChild(code);
        li.addEventListener('click', function () { select(o); });
        listbox.appendChild(li);
      });
      listbox.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('input', function () { render(input.value); });

    input.addEventListener('keydown', function (e) {
      var opts = $$('.flight-option', listbox);
      if (e.key === 'ArrowDown' && !listbox.hidden) {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, opts.length - 1));
      } else if (e.key === 'ArrowUp' && !listbox.hidden) {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
      } else if (e.key === 'Enter') {
        if (activeIndex > -1 && matches[activeIndex]) { e.preventDefault(); select(matches[activeIndex]); }
      } else if (e.key === 'Escape') {
        closeList();
      }
    });

    document.addEventListener('click', function (e) {
      if (!finder.contains(e.target)) closeList();
    });

    // Same "warn on localhost, never in front of a guest" pattern
    // config.js's baked-artwork check uses: the static fallback's city
    // count per column should match travel-data.js exactly, since that
    // list is what a guest with no JavaScript, and the print stylesheet,
    // actually sees.
    if (fallback && /localhost|127\.0\.0\.1/.test(location.hostname)) {
      ['nonstop-year-round', 'nonstop-seasonal', 'connect'].forEach(function (status) {
        var ul = fallback.querySelector('[data-flight-group="' + status + '"]');
        if (!ul) return;
        var staticCount = $$('li', ul).filter(function (li) {
          return !li.classList.contains('flight-fallback-note');
        }).length;
        var dataCount = origins.filter(function (o) { return o.status === status; }).length;
        if (staticCount !== dataCount) {
          console.warn(
            '[travel] the static flight-fallback list for "' + status + '" has ' + staticCount +
            ' cities but travel-data.js has ' + dataCount + '. Update the static <ul> in travel/index.html to match.'
          );
        }
      });
    }
  }());


  /* ------------------------------------------------------------------
     Where to Stay — filterable, expandable lodging cards.

     Built entirely from travel-data.js so a price, a phone number, or
     the whole recommended order (see the note on Grouse Mountain /
     Hotel Whitefish in travel-data.js) is a data change, never a
     template change.
     ------------------------------------------------------------------ */
  (function lodging() {
    var grid = $('#lodge-grid');
    var filters = $('#lodge-filters');
    var fallback = $('#lodge-fallback');
    if (!grid) return;

    var list = TRAVEL.lodging || [];
    if (!list.length) return;   // leave the static fallback as the whole answer

    var flags = TRAVEL.flags || {};
    var activeTags = [];
    var cardId = 0;

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

    function photoNode(entry) {
      var wrap = document.createElement('div');
      wrap.className = 'lodge-card-photo';
      if (!entry.photo) {
        wrap.classList.add('is-empty');
        wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
        return wrap;
      }
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = entry.name;
      img.addEventListener('error', function () {
        wrap.classList.add('is-empty');
        wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
      }, { once: true });
      img.src = entry.photo;
      wrap.appendChild(img);
      return wrap;
    }

    function todoOrText(value, label) {
      if (value) return { text: value, todo: false };
      return { text: label + ' — details coming.', todo: true };
    }

    function buildCard(entry) {
      var id = 'lodge-detail-' + (cardId++);
      var confirmedBlock = entry.isRoomBlock && flags.ROOM_BLOCK_CONFIRMED;

      var li = document.createElement('li');
      li.className = 'lodge-card' + (confirmedBlock ? ' lodge-card--room-block-confirmed' : '');
      li.dataset.tags = (entry.tags || []).join(' ');

      if (confirmedBlock) {
        var badge = document.createElement('span');
        badge.className = 'lodge-card-badge';
        badge.textContent = 'Our room block';
        li.appendChild(badge);
      }

      li.appendChild(photoNode(entry));

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'lodge-card-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', id);

      var top = document.createElement('div');
      top.className = 'lodge-card-top';
      var name = document.createElement('span');
      name.className = 'lodge-card-name';
      name.textContent = entry.name;
      var price = document.createElement('span');
      price.className = 'lodge-card-price';
      price.textContent = entry.priceTier || '';
      top.appendChild(name);
      if (entry.priceTier) top.appendChild(price);
      toggle.appendChild(top);

      var bestFor = document.createElement('p');
      bestFor.className = 'lodge-card-bestfor';
      bestFor.textContent = entry.bestFor || '';
      toggle.appendChild(bestFor);

      var drive = document.createElement('span');
      if (entry.driveMinutes === 0) {
        drive.className = 'lodge-card-drive';
        drive.textContent = 'At the venue';
      } else if (typeof entry.driveMinutes === 'number') {
        drive.className = 'lodge-card-drive';
        drive.textContent = entry.driveMinutes + ' min to the venue';
      } else {
        drive.className = 'lodge-card-drive is-todo';
        drive.textContent = 'drive time coming';
      }
      toggle.appendChild(drive);

      var chevron = document.createElement('span');
      chevron.className = 'lodge-card-chevron';
      chevron.textContent = 'Details';
      toggle.appendChild(chevron);

      li.appendChild(toggle);

      var wrap = document.createElement('div');
      wrap.className = 'lodge-detail-wrap';
      var detail = document.createElement('div');
      detail.className = 'lodge-detail';
      detail.id = id;
      detail.setAttribute('role', 'region');
      detail.setAttribute('aria-label', entry.name + ' details');

      var inner = document.createElement('div');
      inner.className = 'lodge-detail-inner';

      var blurb = document.createElement('p');
      blurb.className = 'lodge-detail-blurb';
      var blurbInfo = todoOrText(entry.blurb, 'More about ' + entry.name);
      blurb.textContent = blurbInfo.text;
      if (blurbInfo.todo) blurb.classList.add('is-todo');
      inner.appendChild(blurb);

      var meta = document.createElement('p');
      meta.className = 'lodge-detail-meta';
      var metaParts = [];
      if (entry.amenities && entry.amenities.length) metaParts.push(entry.amenities.join(' · '));
      var addr = todoOrText(entry.address, 'Address');
      var phone = todoOrText(entry.phone, 'Phone');
      metaParts.push(addr.todo ? '<span class="is-todo">' + addr.text + '</span>' : addr.text);
      metaParts.push(phone.todo ? '<span class="is-todo">' + phone.text + '</span>' : phone.text);
      meta.innerHTML = metaParts.join('<br>');
      inner.appendChild(meta);

      // Only ever rendered when the block is confirmed AND a code exists —
      // gated on both, since a confirmed block with no code yet should
      // still show the plain card, not a copy button with nothing to copy.
      if (confirmedBlock && TRAVEL.roomBlock && TRAVEL.roomBlock.code) {
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
        inner.appendChild(codeBtn);
        inner.appendChild(toast);
      } else if (entry.isRoomBlock && !flags.ROOM_BLOCK_CONFIRMED) {
        var pending = document.createElement('p');
        pending.className = 'lodge-detail-meta is-todo';
        pending.textContent = 'Room block details coming.';
        inner.appendChild(pending);
      }

      if (entry.bookingUrl) {
        var book = document.createElement('a');
        book.className = 'flow-btn flow-btn--gold lodge-detail-book';
        book.href = entry.bookingUrl;
        book.target = '_blank';
        book.rel = 'noopener noreferrer';
        book.innerHTML =
          '<span class="flow-btn__ink" aria-hidden="true"></span>' +
          '<svg class="flow-btn__arrow flow-btn__arrow--in" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
          '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<span class="flow-btn__label">Book</span>' +
          '<svg class="flow-btn__arrow flow-btn__arrow--out" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
          '<path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        inner.appendChild(book);
      }
      // No bookingUrl: no button at all — a dead link on a card someone
      // is actually trying to book from is worse than no link.

      detail.appendChild(inner);
      wrap.appendChild(detail);
      li.appendChild(wrap);

      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });

      return li;
    }

    list.forEach(function (entry) { grid.appendChild(buildCard(entry)); });

    grid.hidden = false;
    if (filters) filters.hidden = false;
    if (fallback) fallback.classList.add('is-superseded');

    // Multi-select, OR across the selection: a card shows if it carries
    // ANY active tag, or if nothing is selected at all.
    if (filters) {
      filters.addEventListener('click', function (e) {
        var chip = e.target.closest('.lodge-chip');
        if (!chip) return;
        var tag = chip.dataset.tag;
        var i = activeTags.indexOf(tag);
        if (i > -1) { activeTags.splice(i, 1); chip.classList.remove('is-active'); }
        else { activeTags.push(tag); chip.classList.add('is-active'); }
        applyFilter();
      });
    }

    function applyFilter() {
      $$('.lodge-card', grid).forEach(function (card) {
        var tags = (card.dataset.tags || '').split(' ');
        var match = !activeTags.length || activeTags.some(function (t) { return tags.indexOf(t) > -1; });
        card.hidden = !match;
      });
    }

    if (fallback && /localhost|127\.0\.0\.1/.test(location.hostname)) {
      var staticCount = $$('li', fallback).length;
      if (staticCount !== list.length) {
        console.warn(
          '[travel] the static lodge-fallback list has ' + staticCount +
          ' properties but travel-data.js has ' + list.length + '. Update the static <ul> in travel/index.html to match.'
        );
      }
    }
  }());


  /* ------------------------------------------------------------------
     Drive-time strip — renders the real, scaled version only once every
     property in travel-data.js has a checked driveMinutes. Today only
     the venue's own (0, trivially true) is set, so the honest §E
     placeholder in the markup stays showing and this function is a
     no-op beyond that check — nothing here needs to change by hand the
     day the numbers land; it activates on its own.
     ------------------------------------------------------------------ */
  (function driveStrip() {
    var strip = $('#drive-strip');
    var placeholder = $('#drive-placeholder');
    if (!strip) return;

    var list = TRAVEL.lodging || [];
    var flights = TRAVEL.flights || {};
    var points = list.map(function (l) { return { label: l.name, mins: l.driveMinutes }; });
    if (flights.airportName) points.push({ label: flights.airportName, mins: null, isAirport: true });

    var allVerified = points.every(function (p) { return typeof p.mins === 'number'; });
    if (!allVerified) {
      // Every lodging property's own drive-to-venue minutes aren't checked
      // yet, so the scaled strip below can't build honestly — but the key
      // route pairs (airport, depot, park entrance, neighboring towns) ARE
      // checked, so show those in place of the bare "details coming" text.
      var routes = TRAVEL.driveTimes || [];
      if (placeholder && routes.length) {
        var line = placeholder.querySelector('.drive-placeholder-line');
        var sub = placeholder.querySelector('.drive-placeholder-sub');
        if (line) line.textContent = 'The key routes, checked';
        if (sub) sub.textContent = 'Property-to-venue times are still being checked — here are the routes that are.';

        var routeList = document.createElement('ul');
        routeList.className = 'map-address-list';
        routes.forEach(function (r) {
          var li = document.createElement('li');
          var strong = document.createElement('strong');
          strong.textContent = r.from + ' → ' + r.to;
          li.appendChild(strong);
          li.appendChild(document.createTextNode(' — ' + r.distance + ', ' + r.minutes + (r.note ? ' (' + r.note + ')' : '')));
          routeList.appendChild(li);
        });
        placeholder.appendChild(routeList);
      }
      return;   // scaled strip stays off, nothing more to build yet
    }

    var max = Math.max.apply(null, points.map(function (p) { return p.mins; }));
    strip.innerHTML = '';

    var track = document.createElement('div');
    track.className = 'drive-strip-track';

    points
      .slice()
      .sort(function (a, b) { return a.mins - b.mins; })
      .forEach(function (p) {
        var pt = document.createElement('div');
        pt.className = 'drive-point';
        pt.style.left = (max ? (p.mins / max) * 100 : 0) + '%';

        var dot = document.createElement('div');
        dot.className = 'drive-point-dot';
        var label = document.createElement('div');
        label.className = 'drive-point-label';
        label.textContent = p.label;
        var mins = document.createElement('div');
        mins.className = 'drive-point-mins';
        mins.textContent = p.mins === 0 ? 'At the venue' : p.mins + ' min';

        pt.appendChild(dot);
        pt.appendChild(label);
        pt.appendChild(mins);
        track.appendChild(pt);
      });

    strip.appendChild(track);
    strip.hidden = false;
    if (placeholder) placeholder.hidden = true;
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

    schedule.forEach(function (item) {
      var known = item.flag ? !!flags[item.flag] : !!(item.time || item.venue || item.blurb);

      var li = document.createElement('li');
      li.className = 'weekend-card';

      var head = document.createElement('p');
      var day = document.createElement('span');
      day.className = 'weekend-day';
      day.textContent = item.day;
      var date = document.createElement('span');
      date.className = 'weekend-date';
      date.textContent = fmtDate(item.date);
      head.appendChild(day);
      head.appendChild(date);
      li.appendChild(head);

      var title = document.createElement('p');
      title.className = 'weekend-title';
      title.textContent = item.title;
      li.appendChild(title);

      var detail = document.createElement('p');
      detail.className = 'weekend-detail';
      if (known && (item.time || item.venue || item.blurb)) {
        detail.textContent = [item.time, item.venue, item.blurb].filter(Boolean).join(' — ');
      } else {
        detail.classList.add('is-todo');
        detail.textContent = item.day + ' — details coming, but plan to be here.';
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
     Questions — FAQ accordion (native <details>, no JS required for the
     interaction itself) plus the local-contact and couple-contact cards.
     ------------------------------------------------------------------ */
  (function questions() {
    var faq = $('#faq');
    if (faq) {
      var flags = TRAVEL.flags || {};
      (TRAVEL.faq || []).forEach(function (item) {
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

    var localMeta = $('#local-contact-meta');
    if (localMeta) {
      var local = contacts.local || {};
      var bits = [];
      if (local.phone) bits.push(local.phone); else bits.push('<span class="is-todo">phone coming</span>');
      if (local.email) bits.push(local.email); else bits.push('<span class="is-todo">email coming</span>');
      localMeta.innerHTML = bits.join(' &middot; ');

      var line = $('#local-contact-line');
      if (line && local.name) {
        line.textContent = 'Questions before then? ' + local.name + ' (' +
          (local.relation || "Spencer's family") + ') has scouted Whitefish lodging in person and is glad to help.';
      }
    }

    var coupleEl = $('#couple-contact');
    if (coupleEl) {
      var email = (contacts.couple || {}).email || (window.SAVE_THE_DATE || {}).contact && window.SAVE_THE_DATE.contact.email;
      if (email) {
        coupleEl.innerHTML = 'Or email us directly at <a href="mailto:' + email + '">' + email + '</a>.';
      } else {
        coupleEl.innerHTML = '<span class="is-todo">Couple\'s contact email coming.</span>';
      }
    }
  }());


  /* ------------------------------------------------------------------
     The map — B.8's stated fallback while every coordinate in
     travel-data.js is null or unverified: a plain address list, built
     from the same lodging array Where to Stay uses. See the note on
     this section in travel/index.html for why the interactive Leaflet
     map isn't here yet.
     ------------------------------------------------------------------ */
  (function mapFallback() {
    var ul = $('#map-address-list');
    if (!ul) return;

    var list = TRAVEL.lodging || [];
    var flights = TRAVEL.flights || {};
    var extras = TRAVEL.extraMapPoints || [];

    function mapsLink(address) {
      var a = document.createElement('a');
      a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'View on Google Maps';
      return a;
    }

    function addRow(name, address, extraText) {
      var li = document.createElement('li');
      var nameEl = document.createElement('strong');
      nameEl.textContent = name;
      li.appendChild(nameEl);
      li.appendChild(document.createTextNode(' — '));
      if (address) {
        li.appendChild(document.createTextNode(address + ' · '));
        li.appendChild(mapsLink(address));
      } else if (extraText) {
        li.appendChild(document.createTextNode(extraText));
      } else {
        var todo = document.createElement('span');
        todo.className = 'is-todo';
        todo.textContent = 'address coming';
        li.appendChild(todo);
      }
      ul.appendChild(li);
    }

    list.forEach(function (l) {
      if (l.noFixedAddress) return;   // category, not one property — nothing to pin
      addRow(l.name, l.address);
    });

    extras.forEach(function (p) { addRow(p.name, p.address); });

    if (flights.airportName) {
      addRow(flights.airportName + ' (' + flights.airportCode + ')', null, flights.airportToVenue || '');
    }
  }());


  /* ------------------------------------------------------------------
     While You're Here — bento tiles built from travel-data.js. Same
     disclosure pattern as the lodging cards (grid-template-rows 0fr→1fr),
     reused rather than reinvented.
     ------------------------------------------------------------------ */
  (function whileHere() {
    var grid = $('#bento-grid');
    if (!grid) return;

    var list = TRAVEL.whileHere || [];
    var tileId = 0;

    var EMPTY_MARK =
      '<span class="m-empty-mark" aria-hidden="true">' +
      '<svg viewBox="0 0 40 40" focusable="false"><g fill="none" stroke="currentColor" stroke-width=".9" stroke-linecap="round">' +
      '<path d="M20 34V12"/>' +
      '<path d="M20 20c0-4.2 3.4-7.6 7.6-7.6C27.6 16.6 24.2 20 20 20Z"/>' +
      '<path d="M20 27c0-3.6 2.9-6.5 6.5-6.5C26.5 24.1 23.6 27 20 27Z"/>' +
      '<path d="M20 20c0-4.2-3.4-7.6-7.6-7.6C12.4 16.6 15.8 20 20 20Z"/>' +
      '<path d="M20 27c0-3.6-2.9-6.5-6.5-6.5C13.5 24.1 16.4 27 20 27Z"/>' +
      '</g></svg></span>';

    function photoNode(entry) {
      var wrap = document.createElement('div');
      wrap.className = 'bento-tile-photo';
      if (!entry.photo) {
        wrap.classList.add('is-empty');
        wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
        return wrap;
      }
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = entry.name;
      img.addEventListener('error', function () {
        wrap.classList.add('is-empty');
        wrap.innerHTML = EMPTY_MARK + '<span class="m-empty-note">photograph to come</span>';
      }, { once: true });
      img.src = entry.photo;
      wrap.appendChild(img);
      return wrap;
    }

    list.forEach(function (entry) {
      var id = 'bento-detail-' + (tileId++);

      var li = document.createElement('li');
      li.className = 'bento-tile bento-tile--' + (entry.size || 'medium');
      li.appendChild(photoNode(entry));

      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'bento-tile-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', id);

      var name = document.createElement('p');
      name.className = 'bento-tile-name';
      name.textContent = entry.name;
      toggle.appendChild(name);

      var chevron = document.createElement('span');
      chevron.className = 'bento-tile-chevron';
      chevron.textContent = 'Read more';
      toggle.appendChild(chevron);

      li.appendChild(toggle);

      var wrap = document.createElement('div');
      wrap.className = 'bento-detail-wrap';
      var detail = document.createElement('div');
      detail.className = 'bento-detail';
      detail.id = id;
      detail.setAttribute('role', 'region');
      detail.setAttribute('aria-label', entry.name + ' details');

      var inner = document.createElement('div');
      inner.className = 'bento-detail-inner';
      var blurb = document.createElement('p');
      blurb.className = 'bento-detail-blurb';
      if (entry.blurb && entry.blurb !== 'TODO') {
        blurb.textContent = entry.blurb;
      } else {
        blurb.classList.add('is-todo');
        blurb.textContent = 'More about ' + entry.name + ' — details coming.';
      }
      inner.appendChild(blurb);
      detail.appendChild(inner);
      wrap.appendChild(detail);
      li.appendChild(wrap);

      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      });

      grid.appendChild(li);
    });
  }());
}());
