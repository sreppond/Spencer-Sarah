// ============================================
// Spencer & Sarah — Cordially-Inspired Scroll Engine
// ============================================

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Utilities ---
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // Emil Kowalski-style easing: cubic-bezier(0.23, 1, 0.32, 1)
  // Approximated as a JS function for scroll-driven use
  function easeOutCustom(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // --- Countdown Timer ---
  const weddingDate = new Date('2027-06-18T16:30:00-06:00');

  function updateCountdown() {
    const now = new Date();
    const diff = weddingDate - now;

    if (diff <= 0) {
      document.getElementById('days').textContent = '0';
      document.getElementById('hours').textContent = '0';
      document.getElementById('minutes').textContent = '0';
      document.getElementById('seconds').textContent = '0';
      return;
    }

    document.getElementById('days').textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
    document.getElementById('hours').textContent = Math.floor((diff / (1000 * 60 * 60)) % 24);
    document.getElementById('minutes').textContent = Math.floor((diff / (1000 * 60)) % 60);
    document.getElementById('seconds').textContent = Math.floor((diff / 1000) % 60);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- Hero scroll choreography ---
  // The stage is pinned while the runway below scrolls past. Scroll
  // position (not a wall-clock loop) drives a slow push-in on the
  // painting, lifts the title away, and dissolves the artwork into the
  // next section's ivory. Distance must match the CSS runway
  // (.hero-video-spacer height, in vh).
  const HERO_RUNWAY_VH = 1.0;

  function initHeroScroll() {
    const section = document.getElementById('hero-video');
    const media = section && section.querySelector('.hero-video-el');
    const content = document.getElementById('hero-content');
    const scrollInd = document.getElementById('scroll-indicator');
    const heroFade = section && section.querySelector('.hero-fade');
    const navbar = document.getElementById('navbar');

    if (!section || !media) return null;

    function updateHero() {
      const runway = window.innerHeight * HERO_RUNWAY_VH;
      const progress = clamp(-section.getBoundingClientRect().top / runway, 0, 1);

      // Slow push-in on the painting.
      media.style.transform = `scale(${lerp(1, 1.14, easeOutCustom(progress))})`;

      // The title drifts up and clears before the ivory arrives.
      if (content) {
        content.style.transform = `translateY(${lerp(0, -56, easeOutCustom(progress))}px)`;
        content.style.opacity = clamp(1 - (progress - 0.42) / 0.33, 0, 1);
      }

      if (scrollInd) {
        scrollInd.style.opacity = lerp(1, 0, clamp(progress * 3, 0, 1));
      }

      // Dissolve into the next section over the tail of the runway, so
      // the painting has fully become ivory by the time the sticky
      // stage unpins and the invitation slides up.
      if (heroFade) {
        heroFade.style.opacity = clamp((progress - 0.45) / 0.45, 0, 1);
      }

      if (navbar) navbar.classList.toggle('pill', progress > 0.08);
    }

    return updateHero;
  }

  // --- Scroll reveal animations with stagger ---
  function createRevealObserver() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
        el.classList.add('visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay;
            if (delay) {
              const ms = parseInt(delay, 10) * 50;
              setTimeout(() => entry.target.classList.add('visible'), ms);
            } else {
              entry.target.classList.add('visible');
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
      observer.observe(el);
    });
  }

  // --- Confetti ---
  function createConfetti() {
    if (prefersReducedMotion) return;

    const container = document.getElementById('confetti');
    if (!container) return;

    const colors = ['#d4b896', '#e8d5c0', '#f0e8dd', '#c4a882', '#dcc8b0', '#f5c6d0', '#e8b4b8'];

    for (let i = 0; i < 35; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 7 + 4;

      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.backgroundColor = color;
      piece.style.left = Math.random() * 100 + '%';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.animationDuration = Math.random() * 8 + 7 + 's';
      piece.style.animationDelay = Math.random() * 12 + 's';
      piece.style.animationIterationCount = 'infinite';

      container.appendChild(piece);
    }
  }

  // --- Mobile nav ---
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
      });
    });
  }

  // --- Scroll-driven text reveal (shared by every [data-text-reveal]) ---
  function initTextReveals() {
    const sections = Array.from(document.querySelectorAll('[data-text-reveal]'));
    if (!sections.length) return null;

    const items = sections.map((section) => {
      const textEl = section.querySelector('.reveal-words');
      const words = textEl.textContent.trim().split(/\s+/);
      textEl.innerHTML = words
        .map((w) => `<span class="reveal-word">${w}</span>`)
        .join(' ');
      return { section, words: Array.from(textEl.querySelectorAll('.reveal-word')) };
    });

    function update() {
      items.forEach(({ section, words }) => {
        const rect = section.getBoundingClientRect();
        const scrollable = section.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const progress = clamp(-rect.top / scrollable, 0, 1);
        const n = words.length;

        // Light the words across the first 85% of the scroll so the full
        // sentence is revealed before the section hands off to the next.
        const span = 0.85;
        words.forEach((el, i) => {
          const start = (i / n) * span;
          const end = ((i + 1) / n) * span;
          const wp = clamp((progress - start) / (end - start), 0, 1);
          el.style.opacity = (0.12 + 0.88 * wp).toFixed(3);
        });
      });
    }

    return update;
  }

  // --- FAQ accordion ---
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach((faq) => faq.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });
  }

  // --- RSVP form ---
  function initRSVP() {
    const form = document.getElementById('rsvp-form');
    const attendingSelect = document.getElementById('attending');
    const guestCountGroup = document.getElementById('guest-count-group');
    const plusOneGroup = document.getElementById('plus-one-group');
    const dietaryGroup = document.getElementById('dietary-group');
    const guestCountSelect = document.getElementById('guest-count');
    if (!form || !attendingSelect) return;

    attendingSelect.addEventListener('change', () => {
      const yes = attendingSelect.value === 'yes';
      guestCountGroup.style.display = yes ? 'block' : 'none';
      dietaryGroup.style.display = yes ? 'block' : 'none';
      plusOneGroup.style.display = yes && guestCountSelect.value === '2' ? 'block' : 'none';
    });

    guestCountSelect.addEventListener('change', () => {
      plusOneGroup.style.display = guestCountSelect.value === '2' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.style.display = 'none';
      document.getElementById('rsvp-success').style.display = 'block';
    });
  }

  // --- Smooth scroll ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        if (prefersReducedMotion) return;
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Main scroll handler (rAF throttled) ---
  function init() {
    const updateHero = prefersReducedMotion ? null : initHeroScroll();
    const updateReveals = prefersReducedMotion ? null : initTextReveals();
    createRevealObserver();
    createConfetti();
    initMobileNav();
    initFAQ();
    initRSVP();
    initSmoothScroll();

    if (prefersReducedMotion) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (updateHero) updateHero();
          if (updateReveals) updateReveals();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    if (updateHero) updateHero();
    if (updateReveals) updateReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
