import { test } from '@playwright/test';

test('debug setup complete', async ({ page }) => {
  await page.goto('http://localhost:4173');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(500);
  
  // Enter and confirm PIN
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').last().click();
  await page.waitForTimeout(500);
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '/tmp/setup-complete.png' });
  
  // List all buttons
  const buttons = await page.locator('button').all();
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    console.log(`  Button ${i}: "${text?.trim()}"`);
  }
});
