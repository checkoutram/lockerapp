import { test, expect } from '@playwright/test';
const BASE_URL = 'http://localhost:4173';

async function setupPin(page) {
  for (const d of '1234'.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').nth(9).click();
  await expect(page.getByText('Confirm PIN')).toBeVisible({ timeout: 5000 });
  for (const d of '1234'.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await expect(page.getByText('Recovery Questions')).toBeVisible({ timeout: 5000 });
  for (let i = 0; i < 3; i++) {
    await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(i).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /What was|What is|What was the name/ }).first().click();
    await page.waitForTimeout(300);
    await page.locator('input[type="password"]').nth(i).fill(`answer${i + 1}`);
  }
  await page.getByRole('button', { name: /Save & Secure/ }).click();
  await page.waitForTimeout(800);
}

async function loginWithPin(page, pin) {
  await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').nth(9).click();
  await page.waitForTimeout(500);
}

async function goToHome(page) {
  let attempts = 0;
  while (attempts < 5) {
    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    if (await settingsBtn.isVisible().catch(() => false)) return;
    const backBtn = page.getByRole('button', { name: 'Back' });
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(400);
    } else {
      break;
    }
    attempts++;
  }
  // Fallback: if not on home, navigate directly
  await page.goto(BASE_URL);
  await page.waitForTimeout(500);
}

async function addLocker(page: any, opts: { name: string; bankName?: string }) {
  // Click + on home screen (now adds a locker) — navigate to Manage Lockers
  await page.getByRole('button', { name: 'Add Locker' }).click();
  await page.waitForTimeout(500);

  // On Manage Lockers screen, click the "Add Locker" header button to open the form
  await page.getByRole('button', { name: 'Add Locker' }).click();
  await page.waitForTimeout(300);

  // Fill the locker form
  await page.locator('input[placeholder="e.g., Locker 1"]').fill(opts.name);
  if (opts.bankName) {
    await page.locator('input[placeholder="e.g., HDFC Bank"]').fill(opts.bankName);
  }
  await page.getByRole('button', { name: 'Save Locker' }).click();
  await page.waitForTimeout(500);

  // Navigate back to home (Back → Settings → Home)
  await goToHome(page);
}

async function addItem(page: any, opts: { name: string; category?: string; subType?: string; lockerName?: string }) {
  await goToHome(page);
  const targetLocker = opts.lockerName || 'Locker 1';
  await page.getByRole('button', { name: `Locker ${targetLocker}` }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Add Item' }).click();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="Gold Chain"]').fill(opts.name);
  if (opts.category) {
    await page.getByRole('button', { name: opts.category }).click();
    await page.waitForTimeout(200);
  }
  if (opts.subType) {
    await page.getByRole('button', { name: opts.subType, exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole('button', { name: /Save to/ }).click();
  await page.waitForTimeout(800);
}

test.describe('Comprehensive Multi-Locker QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
    await setupPin(page);
  });

  test('QA-01: Add multiple lockers and verify on home', async ({ page }) => {
    // Add Locker 2 (Home Safe)
    await addLocker(page, { name: 'Home Safe', bankName: 'Home Vault' });
    // Add Locker 3 (Bank Locker A)
    await addLocker(page, { name: 'Bank Locker A', bankName: 'SBI Bank' });

    // Verify all 3 lockers visible on home
    await expect(page.getByRole('button', { name: 'Locker Locker 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locker Home Safe' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locker Bank Locker A' })).toBeVisible();

    // Verify stats: 3 lockers
    await expect(page.getByText('3').first()).toBeVisible(); // Lockers count
  });

  test('QA-02: Add items to different lockers and verify isolation', async ({ page }) => {
    // Add 2 more lockers
    await addLocker(page, { name: 'Home Safe' });
    await addLocker(page, { name: 'Bank Locker A' });

    // Add Gold Chain to Locker 1
    await addItem(page, { name: 'Gold Chain A', category: 'Gold', subType: 'Chain' });
    // Add Silver Ring to Home Safe
    await addItem(page, { name: 'Silver Ring', category: 'Silver', subType: 'Ring', lockerName: 'Home Safe' });
    // Add Diamond Earrings to Bank Locker A
    await addItem(page, { name: 'Diamond Earrings', category: 'Diamond', subType: 'Earring', lockerName: 'Bank Locker A' });

    // Go home and verify stats
    await goToHome(page);
    await expect(page.getByText('3').first()).toBeVisible(); // Total Items

    // Open Locker 1 - should only see Gold Chain A
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Gold Chain A')).toBeVisible();
    await expect(page.getByText('Silver Ring')).not.toBeVisible();
    await expect(page.getByText('Diamond Earrings')).not.toBeVisible();

    // Go to Home Safe - should only see Silver Ring
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Home Safe' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Silver Ring')).toBeVisible();
    await expect(page.getByText('Gold Chain A')).not.toBeVisible();
    await expect(page.getByText('Diamond Earrings')).not.toBeVisible();

    // Go to Bank Locker A - should only see Diamond Earrings
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Bank Locker A' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Diamond Earrings')).toBeVisible();
    await expect(page.getByText('Gold Chain A')).not.toBeVisible();
    await expect(page.getByText('Silver Ring')).not.toBeVisible();
  });

  test('QA-03: Add item from inside locker goes to that locker', async ({ page }) => {
    await addLocker(page, { name: 'Home Safe' });

    // Add item from inside Home Safe
    await page.getByRole('button', { name: 'Locker Home Safe' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder*="Gold Chain"]').fill('Inside Home Safe');
    await page.getByRole('button', { name: 'Gold' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Chain', exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Save to/ }).click();
    await page.waitForTimeout(800);

    // Verify item is in Home Safe, not Locker 1
    await expect(page.getByText('Inside Home Safe')).toBeVisible();
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Inside Home Safe')).not.toBeVisible();
  });

  test('QA-04: Delete locker moves items to default locker', async ({ page }) => {
    await addLocker(page, { name: 'Temp Locker' });
    await addItem(page, { name: 'Temp Item', category: 'Gold', subType: 'Chain', lockerName: 'Temp Locker' });

    // Delete Temp Locker from Manage Lockers
    await goToHome(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(300);
    await page.getByText('Manage Lockers').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Delete Temp Locker' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(500);

    // Go back to home
    await goToHome(page);
    // Temp Locker should be gone
    await expect(page.getByText('Temp Locker')).not.toBeVisible();
    // Item should be in Locker 1
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Temp Item')).toBeVisible();
  });

  test('QA-05: + button on home adds a locker, + inside locker adds an item', async ({ page }) => {
    // Click + on home
    await page.getByRole('button', { name: 'Add Locker' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Manage Lockers')).toBeVisible();
    await page.locator('button', { has: page.locator('.lucide-arrow-left') }).first().click();
    await page.waitForTimeout(300);

    // Open Locker 1 and click + inside - should add item
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('input[placeholder*="Gold Chain"]')).toBeVisible();
  });

  test('QA-06: Stats show correct totals across all lockers', async ({ page }) => {
    await addLocker(page, { name: 'Locker B' });
    await addItem(page, { name: 'Item A', category: 'Gold', subType: 'Chain' });
    await addItem(page, { name: 'Item B', category: 'Silver', subType: 'Ring', lockerName: 'Locker B' });
    await addItem(page, { name: 'Item C', category: 'Gold', subType: 'Pendant', lockerName: 'Locker B' });

    await goToHome(page);
    // Total Items = 3
    await expect(page.getByText('3').first()).toBeVisible();
    // In Locker = 3 (all are in locker by default)
    // Lockers = 2
  });

  test('QA-07: Search lockers filters correctly', async ({ page }) => {
    await addLocker(page, { name: 'Home Safe' });
    await addLocker(page, { name: 'Bank Locker A' });

    await goToHome(page);
    await page.locator('input[placeholder="Search lockers..."]').fill('Bank');
    await page.waitForTimeout(300);
    await expect(page.getByText('Bank Locker A')).toBeVisible();
    await expect(page.getByText('Home Safe')).not.toBeVisible();
    await expect(page.getByText('Locker 1')).not.toBeVisible();
  });

  test('QA-08: Rename locker updates on home and inside', async ({ page }) => {
    await addItem(page, { name: 'Test Item', category: 'Gold', subType: 'Chain' });
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);

    // Click Edit Locker
    await page.getByRole('button', { name: 'Edit Locker' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="e.g., Locker 1"]').fill('My Vault');
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(1000);

    await goToHome(page);
    await expect(page.getByText('My Vault')).toBeVisible();
    await expect(page.getByText('Locker 1')).not.toBeVisible();
  });

  test('QA-09: Cannot delete last locker', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(300);
    await page.getByText('Manage Lockers').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Delete Locker 1' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Cannot delete the last locker|At least one locker is required/)).toBeVisible();
  });

  test('QA-10: Move item between lockers via edit screen', async ({ page }) => {
    await addLocker(page, { name: 'Locker B' });
    await addItem(page, { name: 'Move Me', category: 'Gold', subType: 'Chain' });

    // Open Locker 1, click on item, edit, change locker
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await page.getByText('Move Me').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.waitForTimeout(300);

    // Change locker
    await page.locator('button').filter({ has: page.locator('svg.lucide-building-2') }).first().click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Locker B' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(800);

    // Go to Locker B, verify item is there
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Locker B' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Move Me')).toBeVisible();

    // Go to Locker 1, verify item is gone
    await goToHome(page);
    await page.getByRole('button', { name: 'Locker Locker 1' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Move Me')).not.toBeVisible();
  });
});
