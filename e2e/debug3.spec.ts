import { test } from '@playwright/test';

test('debug pin storage', async ({ page }) => {
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
  
  // Check localStorage
  const pinHash = await page.evaluate(() => localStorage.getItem('secure_pin'));
  console.log('PIN hash stored:', !!pinHash);
  console.log('PIN hash length:', pinHash?.length);
  
  const session = await page.evaluate(() => localStorage.getItem('vlocker_session'));
  console.log('Session:', session);
  
  // Wait and check again
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  console.log('Has "Your":', html.includes('Your'));
  console.log('Has "auth":', html.includes('auth') || html.includes('Auth'));
  console.log('Has "Enter":', html.includes('Enter PIN'));
});
