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

  // --- Hero Video Scroll Scrubbing ---
  // Scroll position drives the video's currentTime directly (no
  // autoplay, no loop) so the clouds only move as the user scrolls.
  // The scrub distance below must match the CSS runway
  // (.hero-video-spacer height, in vh) so progress hits 1 exactly as
  // the spacer runs out.
  const HERO_SCRUB_VH = 1.4;

  function initHeroVideoScroll() {
    const section = document.getElementById('hero-video');
    const video = document.getElementById('hero-video-media');
    const scrollInd = document.getElementById('scroll-indicator');
    const heroFade = section && section.querySelector('.hero-fade');
    const navbar = document.getElementById('navbar');

    if (!section || !video) return null;

    let duration = 0;
    video.addEventListener('loadedmetadata', () => {
      duration = video.duration || 0;
    });

    // iOS Safari won't let a currentTime seek "take" until the video
    // has played at least once. Unlock it silently on first touch.
    function unlock() {
      video.play().then(() => video.pause()).catch(() => {});
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('scroll', unlock);
    }
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('scroll', unlock, { passive: true, once: true });

    function updateHeroVideo() {
      const sectionTop = section.getBoundingClientRect().top;
      const runway = window.innerHeight * HERO_SCRUB_VH;
      const scrolled = -sectionTop;
      const progress = clamp(scrolled / runway, 0, 1);

      if (duration > 0 && video.seeking === false) {
        video.currentTime = progress * duration;
      }

      if (scrollInd) {
        scrollInd.style.opacity = lerp(1, 0, clamp(progress * 3, 0, 1));
      }

      // Dissolve into the next section over the tail of the scrub, so
      // the painting has fully become ivory by the time the sticky
      // stage unpins and the invitation slides up.
      if (heroFade) {
        heroFade.style.opacity = clamp((progress - 0.55) / 0.4, 0, 1);
      }

      // Nav: switch to pill mode when scrolled
      if (progress > 0.1) {
        navbar.classList.add('pill');
      } else {
        navbar.classList.remove('pill');
      }
    }

    return updateHeroVideo;
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

  // --- Card Fan Carousel ---
  function initFanCarousel() {
    const stage = document.getElementById('fan-stage');
    if (!stage) return;

    const cards = Array.from(stage.querySelectorAll('.fan-card'));
    const dotsContainer = document.getElementById('fan-dots');
    const total = cards.length;
    let active = Math.floor(total / 2);

    // Fan layout: rotation and offset per distance from active
    const fanConfig = [
      { rotate: -30, x: -110, y: 24, scale: 0.78, zIndex: 1 },
      { rotate: -15, x: -55,  y: 10, scale: 0.88, zIndex: 2 },
      { rotate:   0, x:   0,  y:  0, scale: 1.00, zIndex: 5 },
      { rotate:  15, x:  55,  y: 10, scale: 0.88, zIndex: 2 },
      { rotate:  30, x: 110,  y: 24, scale: 0.78, zIndex: 1 },
    ];

    // Build dots
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'fan-dot';
      dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
      dot.addEventListener('click', () => setActive(i));
      dotsContainer.appendChild(dot);
    });

    function applyLayout() {
      const dots = dotsContainer.querySelectorAll('.fan-dot');
      cards.forEach((card, i) => {
        const offset = i - active;
        const clampedOffset = Math.max(-2, Math.min(2, offset));
        const cfg = fanConfig[clampedOffset + 2];
        card.style.transform = `translateX(${cfg.x}px) translateY(${cfg.y}px) rotate(${cfg.rotate}deg) scale(${cfg.scale})`;
        card.style.zIndex = cfg.zIndex;
        card.style.boxShadow = offset === 0
          ? '0 16px 48px rgba(0,0,0,0.22)'
          : '0 4px 20px rgba(0,0,0,0.14)';
        card.classList.toggle('fan-active', offset === 0);
      });
      dots.forEach((dot, i) => dot.classList.toggle('active', i === active));
    }

    function setActive(index) {
      active = (index + total) % total;
      applyLayout();
    }

    // Click a card to focus it
    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (i !== active) setActive(i);
      });
    });

    stage.closest('.fan-carousel').querySelector('.fan-prev')
      .addEventListener('click', () => setActive(active - 1));
    stage.closest('.fan-carousel').querySelector('.fan-next')
      .addEventListener('click', () => setActive(active + 1));

    // Keyboard support
    stage.setAttribute('tabindex', '0');
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') setActive(active - 1);
      if (e.key === 'ArrowRight') setActive(active + 1);
    });

    applyLayout();
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
    const updateHeroVideo = prefersReducedMotion ? null : initHeroVideoScroll();
    const updateReveals = prefersReducedMotion ? null : initTextReveals();
    createRevealObserver();
    createConfetti();
    initMobileNav();
    initFanCarousel();
    initFAQ();
    initRSVP();
    initSmoothScroll();

    if (prefersReducedMotion) return;

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (updateHeroVideo) updateHeroVideo();
          if (updateReveals) updateReveals();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    if (updateHeroVideo) updateHeroVideo();
    if (updateReveals) updateReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
