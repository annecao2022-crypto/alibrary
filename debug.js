const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://alibrary:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.hover('.group:first-child');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'C:/Users/happyelements/library/debug_hover.png' });
  // Click preview
  const previewBtn = page.locator('button:has-text("预览")').first();
  if (await previewBtn.isVisible()) {
    await previewBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'C:/Users/happyelements/library/debug_preview.png' });
  } else {
    console.log('Preview button not visible');
  }
  await browser.close();
})();
