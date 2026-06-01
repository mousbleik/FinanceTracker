// One-off helper to render preview/render-offline.html and capture a PNG.
// Run: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules node screenshot.js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
  const url = 'file://' + path.resolve(__dirname, 'render-offline.html');
  page.on('console', m => console.log('[page]', m.type(), m.text()));
  await page.goto(url, { waitUntil: 'load' });
  // runBadge() renders the badge on a 4s setTimeout; wait it out.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.resolve(__dirname, 'screenshot.png'), fullPage: true });
  await browser.close();
  console.log('screenshot written');
})().catch(e => { console.error(e); process.exit(1); });
