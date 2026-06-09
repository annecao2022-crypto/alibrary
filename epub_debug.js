const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) });
  page.on('pageerror', err => errors.push(err.message));
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://alibrary:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // hover and click preview on an epub book
  await page.hover('.group:first-child');
  await page.waitForTimeout(400);
  const previewBtn = page.locator('button:has-text("预览")').first();
  await previewBtn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'C:/Users/happyelements/library/epub_debug.png' });
  console.log('ERRORS:', JSON.stringify(errors));
  await browser.close();
})();
