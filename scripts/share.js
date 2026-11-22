// Renders scripts/share-card.html to share.jpg (1200x630), the image link previews show.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, 'share-card.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, '..', 'share.jpg'), type: 'jpeg', quality: 85 });
  await b.close();
  console.log('share.jpg written');
})();
