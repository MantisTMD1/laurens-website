// @ts-check
const { test, expect } = require('@playwright/test');

const isMobile = (testInfo) => testInfo.project.name === 'mobile';
const isDesktop = (testInfo) => testInfo.project.name === 'desktop';

test.describe('Fit Lab landing page', () => {
  /** @type {string[]} */
  let errors;

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
  });

  test('loads with the right title and hero text', async ({ page }) => {
    await expect(page).toHaveTitle(/Fit Lab Wisconsin/);
    await expect(page.locator('h1')).toHaveText('Building strong minds and bodies.');
    await expect(page.locator('.hero__lead')).toContainText('takes the guesswork out of fitness');
    await expect(page.locator('.hero .btn--primary')).toHaveAttribute('href', '#start');
  });

  test('has every section, each with one heading', async ({ page }) => {
    for (const id of ['training', 'lauren', 'reviews', 'pricing', 'gyms', 'start']) {
      const section = page.locator(`section#${id}`);
      await expect(section).toHaveCount(1);
      await expect(section.locator('h2')).toHaveCount(1);
    }
    await expect(page.locator('footer#contact')).toBeVisible();
  });

  test('every in-page link points at a section that exists', async ({ page }) => {
    const hrefs = await page.locator('a[href^="#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const href of new Set(hrefs)) {
      await expect(page.locator(href), `target of ${href}`).toHaveCount(1);
    }
  });

  test('every photograph loads', async ({ page }) => {
    // lazy images load once scrolled near, so walk the page first
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    });
    const imgs = page.locator('main img, footer img');
    const count = await imgs.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i++) {
      const img = imgs.nth(i);
      await expect.poll(() => img.evaluate((el) => /** @type {HTMLImageElement} */ (el).complete && /** @type {HTMLImageElement} */ (el).naturalWidth > 0),
        { message: `image ${await img.getAttribute('src')}`, timeout: 15000 }).toBe(true);
    }
  });

  test('every image has alt text', async ({ page }) => {
    const missing = await page.locator('img:not([alt])').count();
    expect(missing).toBe(0);
  });

  test('nothing scrolls sideways', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('Training and About dropdowns open on hover', async ({ page }, testInfo) => {
    test.skip(!isDesktop(testInfo), 'hover menus are a desktop feature');
    for (const [word, card] of [['Training', 'Individual training'], ['About', 'About Lauren']]) {
      const item = page.locator('.nav__item', { has: page.locator('.nav__link', { hasText: word }) });
      await item.locator('.nav__link').hover();
      await expect(item.locator('.nav__menu')).toBeVisible();
      await expect(item.locator('.menu-card', { hasText: card })).toBeVisible();
      await page.mouse.move(700, 600);
      await expect(item.locator('.nav__menu')).toBeHidden();
    }
  });

  test('phone menu opens and closes', async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), 'the menu button shows on phones');
    const toggle = page.locator('.nav__toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav__links .nav__link', { hasText: 'Prices' })).toBeVisible();
    await page.locator('.nav__links .nav__link', { hasText: 'Prices' }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('form shows an error under each empty field', async ({ page }) => {
    await page.locator('#start button[type="submit"]').click();
    for (const id of ['f-name', 'f-email', 'f-gym', 'f-goal']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator(`#${id}-err`)).toBeVisible();
    }
    await expect(page.locator('#f-name')).toBeFocused();
  });

  test('form rejects an email without an @', async ({ page }) => {
    await page.fill('#f-name', 'Test Client');
    await page.fill('#f-email', 'not-an-email');
    await page.selectOption('#f-gym', 'Wales');
    await page.fill('#f-goal', 'Get stronger');
    await page.locator('#start button[type="submit"]').click();
    await expect(page.locator('#f-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#f-name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('prices for both gyms are listed', async ({ page }) => {
    const jc = page.locator('#pricing .card', { hasText: 'Johnson Creek' });
    const wales = page.locator('#pricing .card', { hasText: 'Wales' });
    await expect(jc).toContainText('$20');
    await expect(jc).toContainText('$75');
    await expect(wales).toContainText('$40');
    await expect(wales).toContainText('$80');
  });

  test('both gyms have a Google map', async ({ page }) => {
    const maps = page.locator('#map iframe.map-frame');
    await expect(maps).toHaveCount(2);
    await expect(maps.nth(0)).toHaveAttribute('src', /google\.com\/maps\?q=408\+Midge\+St.*output=embed/);
    await expect(maps.nth(1)).toHaveAttribute('src', /google\.com\/maps\?q=200\+W\+Summit\+Ave.*output=embed/);
    for (let i = 0; i < 2; i++) await expect(maps.nth(i)).toHaveAttribute('title', /Google map of the Fit Lab gym/);
    await page.locator('#map').scrollIntoViewIfNeeded();
    for (let i = 0; i < 2; i++) {
      const box = await maps.nth(i).boundingBox();
      expect(box && box.height).toBeGreaterThan(200);
    }
  });

  test('no script errors on load', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});

test.describe('About page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/about.html'); });

  test('loads with Lauren’s story, approach and credentials', async ({ page }) => {
    await expect(page).toHaveTitle(/About Lauren/);
    await expect(page.locator('h1')).toHaveText('Meet Lauren, your personal trainer');
    for (const id of ['story', 'approach', 'life', 'certifications', 'start']) {
      await expect(page.locator(`section#${id} h2`)).toHaveCount(1);
    }
    await expect(page.locator('#certifications')).toContainText('NASM Certified Personal Trainer');
    await expect(page.locator('#approach')).toContainText('teach a man to fish');
  });

  test('booking buttons lead to the form on the home page', async ({ page }) => {
    await expect(page.locator('.hero .btn--primary')).toHaveAttribute('href', 'index.html#start');
    await page.locator('#start .btn--primary').click();
    await expect(page).toHaveURL(/index\.html#start$/);
    await expect(page.locator('#start form')).toBeVisible();
  });

  test('every link to the home page points at a section that exists', async ({ page }) => {
    const hrefs = await page.locator('a[href^="index.html#"], a[href^="#"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    const home = hrefs.filter((h) => h.startsWith('index.html#')).map((h) => h.slice(10));
    for (const h of hrefs.filter((h) => h.startsWith('#'))) await expect(page.locator(h), `target of ${h}`).toHaveCount(1);
    await page.goto('/');
    for (const h of home) await expect(page.locator(h), `home target of ${h}`).toHaveCount(1);
  });

  test('photos load and nothing scrolls sideways', async ({ page }) => {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    const imgs = page.locator('main img');
    const n = await imgs.count();
    expect(n).toBeGreaterThan(3);
    for (let i = 0; i < n; i++) {
      await expect.poll(() => imgs.nth(i).evaluate((el) => /** @type {HTMLImageElement} */ (el).complete && /** @type {HTMLImageElement} */ (el).naturalWidth > 0), { timeout: 15000 }).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('the home page links to the About page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="about.html"]').first()).toBeAttached();
  });
});

test.describe('Benefits page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/benefits.html'); });

  test('lists every benefit from Lauren’s page', async ({ page }) => {
    await expect(page).toHaveTitle(/Benefits of personal training/);
    await expect(page.locator('h1')).toHaveText('Benefits of personal training');
    for (const id of ['coaching', 'why', 'everyday', 'start']) await expect(page.locator(`section#${id} h2`)).toHaveCount(1);
    await expect(page.locator('#coaching h3')).toHaveCount(2);
    await expect(page.locator('#why h3')).toHaveCount(6);
    await expect(page.locator('#everyday .rows li')).toHaveCount(3);
  });

  test('links resolve and photos load', async ({ page }) => {
    const hrefs = await page.locator('a[href^="index.html#"], a[href^="#"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    for (const h of hrefs.filter((h) => h.startsWith('#'))) await expect(page.locator(h)).toHaveCount(1);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    const imgs = page.locator('main img');
    for (let i = 0; i < await imgs.count(); i++) {
      await expect.poll(() => imgs.nth(i).evaluate((el) => /** @type {HTMLImageElement} */ (el).complete && /** @type {HTMLImageElement} */ (el).naturalWidth > 0), { timeout: 15000 }).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.goto('/');
    for (const h of hrefs.filter((h) => h.startsWith('index.html#')).map((h) => h.slice(10))) await expect(page.locator(h)).toHaveCount(1);
  });

  test('every page links to Benefits', async ({ page }) => {
    for (const p of ['/', '/about.html']) {
      await page.goto(p);
      await expect(page.locator('a[href="benefits.html"]').first()).toBeAttached();
    }
  });
});

test.describe('Testimonials page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/testimonials.html'); });

  test('shows all nine client reviews', async ({ page }) => {
    await expect(page).toHaveTitle(/Client reviews/);
    await expect(page.locator('h1')).toHaveText('What clients say about training with Lauren');
    await expect(page.locator('#featured')).toContainText('Kayti');
    await expect(page.locator('#reviews .quote-card')).toHaveCount(8);
    for (const name of ['Christi', 'Jimmy', 'Cheryl', 'Tracy', 'Jim & Colleen', 'Dawn', 'Lauren, a client', 'Bill']) {
      await expect(page.locator('#reviews figcaption', { hasText: name })).toHaveCount(1);
    }
  });

  test('links resolve and nothing scrolls sideways', async ({ page }) => {
    const hrefs = await page.locator('a[href^="#"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
    for (const h of hrefs) await expect(page.locator(h)).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('every page links to the reviews', async ({ page }) => {
    for (const p of ['/', '/about.html', '/benefits.html']) {
      await page.goto(p);
      await expect(page.locator('a[href="testimonials.html"]').first()).toBeAttached();
    }
  });
});

test.describe('Pricing page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/pricing.html'); });

  test('shows Johnson Creek first, with every package', async ({ page }) => {
    await expect(page).toHaveTitle(/Prices/);
    await expect(page.locator('#johnson-creek')).toBeVisible();
    await expect(page.locator('#wales')).toBeHidden();
    const jc = page.locator('#johnson-creek');
    for (const p of ['$20', '$75', '$350', '$650', '$900', '$1,100', '$15', '$660', '$360 a month', '$480 a month']) await expect(jc).toContainText(p);
    await expect(jc).toContainText('$55 a session');
  });

  test('the switch shows Wales prices and updates the address', async ({ page }) => {
    await page.click('#tab-wales');
    await expect(page.locator('#wales')).toBeVisible();
    await expect(page.locator('#johnson-creek')).toBeHidden();
    await expect(page.locator('#tab-wales')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/#wales$/);
    for (const p of ['$40', '$80', '$1,420', '$852', '$720 a month']) await expect(page.locator('#wales')).toContainText(p);
  });

  test('a link to #wales opens on Wales', async ({ page }) => {
    await page.goto('/pricing.html#wales');
    await expect(page.locator('#wales')).toBeVisible();
    await expect(page.locator('#johnson-creek')).toBeHidden();
  });

  test('lists the additional services and nothing scrolls sideways', async ({ page }) => {
    await expect(page.locator('#services h3')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('every page’s Prices link opens this page', async ({ page }) => {
    for (const p of ['/', '/about.html', '/benefits.html', '/testimonials.html']) {
      await page.goto(p);
      await expect(page.locator('.nav__links a[href="pricing.html"]')).toHaveCount(1);
    }
  });
});

test.describe('Client login page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/login.html'); });

  test('has log in and sign up buttons that go to PT Minder', async ({ page }) => {
    await expect(page).toHaveTitle(/Client login/);
    await expect(page.locator('h1')).toHaveText('Client login');
    await expect(page.getByRole('link', { name: /Log in to PT Minder/ })).toHaveAttribute('href', 'https://fitlabwi.ptminder.com/');
    await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toHaveAttribute('href', 'https://fitlabwi.ptminder.com/#signup');
    await expect(page.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', /#restorepassword$/);
  });

  test('never asks for a password on this site', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test('every page’s Client login link opens this page', async ({ page }, testInfo) => {
    for (const p of ['/', '/about.html', '/benefits.html', '/testimonials.html', '/pricing.html']) {
      await page.goto(p);
      await expect(page.locator('footer a[href="login.html"]')).toHaveCount(1);
      await expect(page.locator('a[href*="fitlabwi.com/login"]')).toHaveCount(0);
    }
  });
});

test.describe('Launch readiness', () => {
  const pages = ['/', '/about.html', '/benefits.html', '/testimonials.html', '/pricing.html', '/login.html', '/book-a-session.html'];

  test('no page loads images from the old WordPress site', async ({ page }) => {
    for (const p of pages) {
      await page.goto(p);
      const old = await page.evaluate(() => [...document.querySelectorAll('img, link[rel~="icon"]')].map((e) => e.getAttribute('src') || e.getAttribute('href')).filter((s) => s && s.includes('fitlabwi.com/wp-content')));
      expect(old, `old-site images on ${p}`).toEqual([]);
    }
  });

  test('every page has a canonical address and a share image', async ({ page, request }) => {
    for (const p of pages) {
      await page.goto(p);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/fitlabwi\.com\//);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://fitlabwi.com/share.jpg');
    }
    expect((await request.get('/share.jpg')).ok()).toBe(true);
    expect((await request.get('/sitemap.xml')).ok()).toBe(true);
    expect((await request.get('/robots.txt')).ok()).toBe(true);
  });

  test('the home page describes both gyms for search engines', async ({ page }) => {
    await page.goto('/');
    const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
    const gyms = data['@graph'].filter((x) => x['@type'] === 'ExerciseGym');
    expect(gyms.map((g) => g.address.addressLocality).sort()).toEqual(['Johnson Creek', 'Wales']);
  });
});

test.describe('Jump links', () => {
  for (const from of ['index', 'about', 'pricing']) {
    test(`Book a trial session from ${from} lands below the nav bar`, async ({ page }) => {
      await page.goto(`/${from}.html`);
      await page.locator('.nav__actions .btn--primary').click();
      await expect(page).toHaveURL(/#start$/);
      await page.waitForTimeout(800);
      const { heading, nav } = await page.evaluate(() => ({
        heading: document.querySelector('#start h2').getBoundingClientRect().top,
        nav: document.querySelector('.nav').getBoundingClientRect().bottom,
      }));
      expect(heading).toBeGreaterThan(nav + 8);
      expect(heading).toBeLessThan(nav + 120);
    });
  }
});

test.describe('Book A Session page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/book-a-session.html'); });

  test('shows one h1 and never scrolls sideways', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Book A Session');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('asks for every required field and leaves the optional ones alone', async ({ page }) => {
    await page.locator('.book-form [type=submit]').click();
    await expect(page.locator('.book-form .field__error:visible')).toHaveCount(6);
    await expect(page.locator('[data-form-status]')).toHaveText('6 fields to fix.');
    await expect(page.locator('#b-phone')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('turns down a date in the past', async ({ page }) => {
    await page.locator('#b-date').fill('2020-01-01');
    await page.locator('.book-form [type=submit]').click();
    await expect(page.locator('#b-date-err')).toBeVisible();
  });

  test('a filled form passes the checks and is sent', async ({ page }) => {
    await page.route('**/test-endpoint', (r) => r.fulfill({ status: 200, body: '{}' }));
    await page.locator('.book-form').evaluate((f) => { f.dataset.endpoint = '/test-endpoint'; });
    await page.fill('#b-name', 'Test Person'); await page.fill('#b-email', 'test@example.com');
    await page.selectOption('#b-gym', 'Wales'); await page.selectOption('#b-type', 'Duo');
    await page.fill('#b-date', '2099-01-05'); await page.selectOption('#b-time', 'Morning');
    await page.locator('.book-form [type=submit]').click();
    await expect(page.locator('[data-form-status]')).toContainText('Your session request is in');
  });

  test('every page links here from the menu and the footer', async ({ page }) => {
    for (const p of ['/', '/about.html', '/benefits.html', '/testimonials.html', '/pricing.html', '/login.html']) {
      await page.goto(p);
      await expect(page.locator('.nav__links a[href="book-a-session.html"]')).toHaveCount(1);
      await expect(page.locator('.footer a[href="book-a-session.html"]')).toHaveCount(1);
    }
  });
});
