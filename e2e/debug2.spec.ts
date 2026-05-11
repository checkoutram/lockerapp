import { test, expect } from '@playwright/test';

test('debug setup flow', async ({ page }) => {
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
  
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: '/tmp/setup-final.png', fullPage: true });
  
  // Check what's on screen
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Page text:', text.substring(0, 500));
  console.log('Has "Your":', text.includes('Your'));
  console.log('Has "Locker":', text.includes('Locker'));
  console.log('Has "Empty":', text.includes('Empty'));
  console.log('Has "Enter":', text.includes('Enter'));
  console.log('Has "setup":', text.includes('setup') || text.includes('Setup'));
  console.log('Has "Confirm":', text.includes('Confirm'));
});
