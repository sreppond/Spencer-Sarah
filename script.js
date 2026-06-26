// ============================================
// Spencer & Sarah — Wedding Website Scripts
// ============================================

(function () {
  'use strict';

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

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = hours;
    document.getElementById('minutes').textContent = minutes;
    document.getElementById('seconds').textContent = seconds;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- Navigation scroll behavior ---
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = scrollY;
  }

  // --- Parallax effects ---
  function handleParallax() {
    const scrollY = window.scrollY;
    const heroFactor = 0.4;

    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
      heroBg.style.transform = `translateY(${scrollY * heroFactor}px) scale(1.05)`;
    }

    document.querySelectorAll('.parallax-bg').forEach((el) => {
      const rect = el.parentElement.getBoundingClientRect();
      const speed = 0.15;
      const offset = rect.top * speed;
      el.style.transform = `translateY(${offset}px)`;
    });

    document.querySelectorAll('.parallax-item').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const speed = parseFloat(el.dataset.speed) || 0.3;
      const center = window.innerHeight / 2;
      const offset = (rect.top - center) * speed * 0.3;
      el.style.transform = `translateY(${offset}px)`;
    });
  }

  // --- Scroll reveal animations ---
  function createRevealObserver() {
    const options = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, options);

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
      observer.observe(el);
    });
  }

  // --- Confetti in countdown section ---
  function createConfetti() {
    const container = document.getElementById('confetti');
    if (!container) return;

    const colors = ['#d4b896', '#e8d5c0', '#f0e8dd', '#c4a882', '#dcc8b0', '#f5c6d0', '#e8b4b8'];
    const shapes = ['circle', 'square'];

    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';

      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;

      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.backgroundColor = color;
      piece.style.left = Math.random() * 100 + '%';
      piece.style.borderRadius = shape === 'circle' ? '50%' : '2px';
      piece.style.animationDuration = Math.random() * 8 + 6 + 's';
      piece.style.animationDelay = Math.random() * 10 + 's';
      piece.style.animationIterationCount = 'infinite';

      container.appendChild(piece);
    }
  }

  // --- Mobile navigation ---
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.mobile-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
      toggle.classList.toggle('active');
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  // --- FAQ accordion ---
  function initFAQ() {
    document.querySelectorAll('.faq-question').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isOpen = item.classList.contains('open');

        document.querySelectorAll('.faq-item').forEach((faq) => {
          faq.classList.remove('open');
        });

        if (!isOpen) {
          item.classList.add('open');
        }
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
      const attending = attendingSelect.value === 'yes';
      guestCountGroup.style.display = attending ? 'block' : 'none';
      dietaryGroup.style.display = attending ? 'block' : 'none';

      if (attending && guestCountSelect.value === '2') {
        plusOneGroup.style.display = 'block';
      } else {
        plusOneGroup.style.display = 'none';
      }
    });

    guestCountSelect.addEventListener('change', () => {
      plusOneGroup.style.display = guestCountSelect.value === '2' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      console.log('RSVP Submission:', data);

      form.style.display = 'none';
      document.getElementById('rsvp-success').style.display = 'block';
    });
  }

  // --- Smooth scroll for nav links ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Scroll event handler (debounced with rAF) ---
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        handleNavScroll();
        handleParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  // --- Initialize everything ---
  function init() {
    createRevealObserver();
    createConfetti();
    initMobileNav();
    initFAQ();
    initRSVP();
    initSmoothScroll();

    window.addEventListener('scroll', onScroll, { passive: true });

    handleNavScroll();
    handleParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
