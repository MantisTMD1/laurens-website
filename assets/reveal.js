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
    '.split-photo:not([data-moment])', '#start .form', '.about-book', '#certifications h2',
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
