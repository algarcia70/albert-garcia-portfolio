(function () {
  'use strict';

  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const yearEl = document.getElementById('year');
  const sections = document.querySelectorAll('section[id], header[id]');
  const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
  const reveals = document.querySelectorAll('.reveal');

  yearEl.textContent = new Date().getFullYear();

  /* Scroll: nav shadow */
  function onScroll() {
    nav.classList.toggle('nav--scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav toggle */
  navToggle.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* Active nav link on scroll */
  function setActiveLink() {
    const scrollPos = window.scrollY + 120;
    let current = '';

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute('id');
      }
    });

    navAnchors.forEach(function (anchor) {
      anchor.classList.toggle('active', anchor.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', setActiveLink, { passive: true });
  setActiveLink();

  /* Reveal on scroll */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* Smooth scroll offset for fixed nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const offset = nav.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();
