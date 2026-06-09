const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Admin dashboard after login
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/Users/happyelements/library/screenshot_dashboard.png' });

  // Preview a book
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Hover over first book card
  await page.hover('.group:first-child');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'C:/Users/happyelements/library/screenshot_hover.png' });

  await browser.close();
  console.log('Done');
})();
