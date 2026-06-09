const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Home page
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'C:/Users/happyelements/library/screenshot_home.png', fullPage: false });

  // Admin login page
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'C:/Users/happyelements/library/screenshot_admin.png', fullPage: false });

  await browser.close();
  console.log('Screenshots saved');
})();
