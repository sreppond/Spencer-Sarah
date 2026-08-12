/* ==========================================================================
   Sarah & Spencer — Hero nav

   index.html only — travel/index.html has its own copy of this same
   handful of lines in the "Hero nav" block of travel.js, since neither
   page's script loads on the other. Powers the hamburger button in
   #hero-nav: opens and closes #hero-nav-menu, and closes it again on a
   link tap, an outside click, or Escape. The RSVP button next to it is a
   plain anchor to #details and needs no script at all.

   Superseded assets/js/site-nav.js (deleted), which existed only to keep
   the old pill nav off the hero until it had scrolled away — see the
   retired 🔒 note that used to sit above it. This nav is meant to be seen
   over the painting from the first frame, so there is nothing left to gate.
   ========================================================================== */

(function () {
  'use strict';

  var toggle = document.getElementById('hero-nav-toggle');
  var menu = document.getElementById('hero-nav-menu');
  if (!toggle || !menu) return;

  // Publish this bar's real rendered height as --nav-h — the same token
  // travel.js publishes for its own nav pill (see the identical block
  // there) — so anything that needs to clear fixed nav chrome (the
  // #celebrate/#details scroll-margin-top in CSS §3.5/§4) reads the
  // actual height instead of a constant sized for a different nav.
  var heroNav = document.getElementById('hero-nav');
  if (heroNav) {
    var publishNavH = function () {
      document.documentElement.style.setProperty('--nav-h', heroNav.getBoundingClientRect().height + 'px');
    };
    publishNavH();
    if ('ResizeObserver' in window) {
      new ResizeObserver(publishNavH).observe(heroNav);
    } else {
      window.addEventListener('resize', publishNavH, { passive: true });
    }
  }

  var CLOSE_MS = 260;
  var closeTimer = null;

  function isOpen() {
    return menu.classList.contains('is-open');
  }

  function openMenu() {
    clearTimeout(closeTimer);
    menu.hidden = false;
    // Force layout so the hidden -> visible swap lands before is-open
    // starts the transition, or the fade/rise plays with no visible start.
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
    if (isOpen() && !menu.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });
}());
