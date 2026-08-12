/* ==========================================================================
   Sarah & Spencer — Site nav

   One small script, shared by every page. It has exactly one job: decide
   when #site-nav is allowed to be visible.

   🔒 On the save-the-date the nav must never appear over the hero, at any
   opacity, at any breakpoint, on scroll up or down. It is revealed only
   once .hero-viewport has fully left the viewport — not when it starts
   leaving, which would still show the nav crossing the painting.

   Any page with no hero has nothing to gate against, so the nav is simply
   on from the first frame. (travel/index.html has its own hero and its own
   copy of this logic in travel.js, so it doesn't load this file at all.)
   ========================================================================== */

(function () {
  'use strict';

  var nav = document.getElementById('site-nav');
  if (!nav) return;

  // Publish the pill's real rendered height as --nav-h so CSS can size
  // anchor scroll-margin from the actual pill instead of a guessed
  // constant — see the identical block in travel.js, whose 3-link nav is
  // the one that actually wraps at narrow widths. This page's 2-link nav
  // rarely does, but the mechanism should hold regardless of link count.
  var navInner = nav.querySelector('.site-nav-inner');
  if (navInner) {
    var publishNavH = function () {
      document.documentElement.style.setProperty('--nav-h', navInner.getBoundingClientRect().height + 'px');
    };
    publishNavH();
    if ('ResizeObserver' in window) {
      new ResizeObserver(publishNavH).observe(navInner);
    } else {
      window.addEventListener('resize', publishNavH, { passive: true });
    }
  }

  var hero = document.querySelector('.hero-viewport');

  if (!hero || !('IntersectionObserver' in window)) {
    nav.classList.add('is-shown');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    var entry = entries[entries.length - 1];
    // isIntersecting alone goes true→false the moment the hero starts
    // leaving the viewport, while its top edge (and the painting) can
    // still be fully on screen. Only boundingClientRect.bottom <= 0 means
    // the hero has actually scrolled up and out completely.
    var cleared = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
    nav.classList.toggle('is-shown', cleared);
  }, { threshold: 0 });

  io.observe(hero);
}());
