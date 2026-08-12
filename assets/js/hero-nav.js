/* ==========================================================================
   Sarah & Spencer — Hero nav

   index.html only. Powers the hamburger button in #hero-nav: opens and
   closes #hero-nav-menu, and closes it again on a link tap, an outside
   click, or Escape. The RSVP button next to it is a plain anchor to
   #details and needs no script at all.

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
