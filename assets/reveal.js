// Scroll reveals for the Fit Lab page: each block fades and rises once as it comes on screen,
// siblings one after another, photographs settling from a slight zoom. The page reads fully
// without it: nothing is hidden until this script runs, and reduced motion skips it entirely.
const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduced && 'IntersectionObserver' in window) {
  // groups whose children come in one after another
  const groups = [
    'main > section:not(.hero) .section-head',
    'main > section:not(.hero) .rows',
    '#pricing .grid', '#gyms .grid', '#map .maps', '#lauren .trio',
    '#start .span-5',
    '.about-copy', '.about-cols', '.quote-wall', '.plan-grid',
  ];
  // single blocks
  const singles = [
    '.split-photo:not([data-moment])', '.about-book', '#certifications h2',
  ];

  const items = [];
  for (const sel of groups) {
    for (const g of document.querySelectorAll(sel)) {
      [...g.children].forEach((el, i) => { if (!el.closest('[data-moment]') && !el.matches('.rows, [data-moment]')) items.push([el, Math.min(i, 5)]); });
    }
  }
  for (const sel of singles) for (const el of document.querySelectorAll(sel)) items.push([el, 1]);

  // anything already above the fold at load stays put
  const fold = innerHeight;
  const todo = items.filter(([el]) => el.getBoundingClientRect().top > fold * 0.9);

  for (const [el, i] of todo) { el.setAttribute('data-reveal', ''); el.style.setProperty('--i', i); }
  html.classList.add('js-reveal');

  const done = (el) => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); el.style.removeProperty('--i'); };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      io.unobserve(el);
      el.classList.add('is-in');
      // hand the element back to the hover layer once it has arrived
      const ms = 900 + (Number(el.style.getPropertyValue('--i')) || 0) * 90;
      setTimeout(() => done(el), ms);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  for (const [el] of todo) io.observe(el);

  // never leave anything hidden: printing or a jump link shows everything at once
  addEventListener('beforeprint', () => todo.forEach(([el]) => done(el)));
}

// "Back to top" in the footer: the arrow lifts off and the page glides up, slow at both ends (0.7 to 1.4s by
// distance). A wheel, touch, key or press stops it. Reduced motion jumps. Focus moves to the top once there.
// Without script it is a plain #top link.
for (const a of document.querySelectorAll('[data-to-top]')) {
  let stop = null;
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    stop?.();
    const land = () => {
      const top = document.getElementById('top');
      if (top) { if (!top.hasAttribute('tabindex')) top.setAttribute('tabindex', '-1'); top.focus({ preventScroll: true }); }
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { scrollTo(0, 0); land(); return; }
    const from = scrollY, ms = Math.min(1400, Math.max(700, from * 0.35));
    const ease = (t) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    let raf = 0, t0 = 0;
    stop = () => { cancelAnimationFrame(raf); events.forEach((n) => removeEventListener(n, stop)); a.classList.remove('is-going'); stop = null; };
    events.forEach((n) => addEventListener(n, stop, { passive: true }));
    a.classList.add('is-going');
    const step = (now) => {
      t0 ||= now;
      const t = Math.min(1, (now - t0) / ms);
      scrollTo({ top: from * (1 - ease(t)), behavior: 'instant' });
      if (t < 1) raf = requestAnimationFrame(step);
      else { stop(); land(); }
    };
    raf = requestAnimationFrame(step);
  });
}
