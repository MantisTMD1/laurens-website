#!/usr/bin/env node
// Copies partials/nav.html and partials/footer.html into every page, between its
// <!-- partial:nav --> / <!-- partial:footer --> markers, so the menu and footer are edited once.
//
//   npm run partials          write the partials into every page
//   npm run partials:check    fail if any page has drifted from the partials (runs before npm test)
//
// Per page it adjusts two things:
//   - on index.html, links to "index.html#x" become "#x" and the logo links to "#top" (no reload)
//   - in the nav, links to the page itself get aria-current="page" (the underline in the menu)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const parts = {
  nav: readFileSync(join(root, 'partials/nav.html'), 'utf8').trim(),
  footer: readFileSync(join(root, 'partials/footer.html'), 'utf8').trim(),
};

function render(name, page) {
  let html = parts[name];
  if (page === 'index.html') {
    html = html.replaceAll('href="index.html#', 'href="#').replace('class="nav__logo" href="index.html"', 'class="nav__logo" href="#top"');
  }
  if (name === 'nav') {
    html = html.replace(new RegExp(`(<a class="(?:nav__link|menu-card[^"]*)" href="${page.replace('.', '\\.')}")`, 'g'), '$1 aria-current="page"');
  }
  return html;
}

const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
let drift = [];
for (const page of pages) {
  const file = join(root, page);
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const name of Object.keys(parts)) {
    const re = new RegExp(`(<!-- partial:${name}\\b[^>]*-->\\n)[\\s\\S]*?(\\n<!-- /partial:${name} -->)`);
    if (!re.test(after)) continue;
    after = after.replace(re, (_, open, close) => open + render(name, page) + close);
  }
  if (after !== before) {
    drift.push(page);
    if (!check) writeFileSync(file, after);
  }
}

if (check && drift.length) {
  console.error(`Nav or footer out of date in: ${drift.join(', ')}. Run: npm run partials`);
  process.exit(1);
}
console.log(check ? 'Nav and footer match the partials on every page.' : drift.length ? `Updated: ${drift.join(', ')}` : 'Every page already up to date.');
