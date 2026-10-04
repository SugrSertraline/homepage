/* Quiet, input-driven motion for the illustrated study. No idle animation. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
  const smallScreen = window.matchMedia('(max-width: 760px)');
  const hero = document.querySelector('.hero');
  let pointerFrame = 0;
  let pointerPosition = null;

  function resetPointer() {
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pointerPosition = null;
    if (!hero) return;
    hero.classList.remove('is-following');
    ['--study-x', '--study-y', '--study-turn', '--card-x', '--card-y'].forEach(name => hero.style.removeProperty(name));
  }

  function updatePointerMode() {
    resetPointer();
    if (hero) hero.classList.toggle('has-pointer-depth', finePointer.matches && !reducedMotion.matches);
  }

  function moveStudy(event) {
    if (!hero || !finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointerPosition) return;
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const clamp = value => Math.max(-1, Math.min(1, value));
      const x = clamp((pointerPosition.x - bounds.left) / bounds.width * 2 - 1);
      const y = clamp((pointerPosition.y - bounds.top) / bounds.height * 2 - 1);
      hero.classList.add('is-following');
      hero.style.setProperty('--study-x', `${(x * 9).toFixed(2)}px`);
      hero.style.setProperty('--study-y', `${(y * 6).toFixed(2)}px`);
      hero.style.setProperty('--study-turn', `${(x * 0.65).toFixed(2)}deg`);
      hero.style.setProperty('--card-x', `${(-y * 1.1).toFixed(2)}deg`);
      hero.style.setProperty('--card-y', `${(x * 1.5).toFixed(2)}deg`);
    });
  }

  if (hero) {
    hero.addEventListener('pointerenter', moveStudy, { passive: true });
    hero.addEventListener('pointermove', moveStudy, { passive: true });
    hero.addEventListener('pointerleave', resetPointer, { passive: true });
    hero.addEventListener('pointercancel', resetPointer, { passive: true });
  }
  finePointer.addEventListener('change', updatePointerMode);
  window.addEventListener('blur', resetPointer);
  window.addEventListener('resize', resetPointer, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetPointer(); });
  updatePointerMode();

  // HTML stays visible: only intersecting elements receive a temporary entrance.
  // Missing JS, unsupported APIs and printing must never leave hidden content.
  const entranceTargets = Array.from(document.querySelectorAll([
    '.hero-copy', '.hero-art', '.hero-foot', '.section-heading',
    '.about-layout > *', '.research-intro', '.coronelli-heading', '.coronelli-intro > *',
    '.coronelli-main-shot', '.coronelli-detail-shots > figure', '.research-process > div',
    '.project-copy', '.project-preview', '.gallery-thumbnails > figure',
    '.interests-heading', '.interests-grid > div', '.journey-layout .column-heading',
    '.timeline-item', '.illustration-books', '.practice-feature', '.volunteering', '.service-story-heading',
    '.service-story-copy', '.service-places > div', '.service-invitation', '.service-public-record',
    '.experience-details', '.honors-note', '.selected-honors > article', '.honors-archive > details',
    '.contact-layout > *', '.site-footer'
  ].join(',')));
  const seen = new WeakSet();
  const playing = new Map();
  let entranceObserver;

  function finishEntrance(element) {
    seen.add(element);
    if (entranceObserver) entranceObserver.unobserve(element);
    const animation = playing.get(element);
    if (animation) animation.cancel();
    playing.delete(element);
  }

  function revealRegion(region) {
    if (!region) return;
    entranceTargets.forEach(element => {
      if (element === region || region.contains(element) || element.contains(region)) finishEntrance(element);
    });
  }

  function revealHash(hash) {
    if (!hash || hash === '#') return;
    try { revealRegion(document.getElementById(decodeURIComponent(hash.slice(1)))); } catch (_) { /* Invalid fragment. */ }
  }

  function observeEntrances() {
    if (entranceObserver) entranceObserver.disconnect();
    playing.forEach(animation => animation.cancel());
    playing.clear();
    if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

    entranceObserver = new IntersectionObserver(entries => {
      const groupOrder = new Map();
      entries.forEach(entry => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        const element = entry.target;
        seen.add(element);
        entranceObserver.unobserve(element);
        if (entry.boundingClientRect.bottom <= 0 || element.contains(document.activeElement)) return;
        const group = element.parentElement;
        const order = groupOrder.get(group) || 0;
        groupOrder.set(group, order + 1);
        const compact = smallScreen.matches;
        const animation = element.animate([
          { opacity: 0, translate: `0 ${compact ? 14 : 24}px` },
          { opacity: 1, translate: '0 0' }
        ], {
          duration: compact ? 440 : 640,
          delay: Math.min(order * (compact ? 55 : 75), compact ? 110 : 225),
          easing: 'cubic-bezier(.2,.7,.2,1)',
          fill: 'backwards'
        });
        playing.set(element, animation);
        animation.onfinish = () => {
          animation.cancel();
          playing.delete(element);
        };
      });
    }, { threshold: 0, rootMargin: '0px 0px 24px 0px' });
    entranceTargets.forEach(element => { if (!seen.has(element)) entranceObserver.observe(element); });
  }

  // Anchor navigation and keyboard focus should never wait for an entrance.
  document.addEventListener('focusin', event => { revealRegion(event.target); resetPointer(); });
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) revealHash(anchor.getAttribute('href'));
  });
  window.addEventListener('hashchange', () => revealHash(window.location.hash));
  window.addEventListener('beforeprint', () => {
    resetPointer();
    entranceTargets.forEach(finishEntrance);
  });
  reducedMotion.addEventListener('change', () => { updatePointerMode(); observeEntrances(); });
  revealHash(window.location.hash);
  observeEntrances();
})();
