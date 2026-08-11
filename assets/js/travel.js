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
}());
