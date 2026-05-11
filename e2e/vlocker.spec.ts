import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

// Mock Capacitor APIs before page loads
async function mockCapacitor(page: Page) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => 'web',
    };
    // Mock Preferences
    const mockStorage: Record<string, string> = {};
    // @ts-ignore
    window.CapacitorPreferences = {
      get: async ({ key }: { key: string }) => ({ value: mockStorage[key] || null }),
      set: async ({ key, value }: { key: string; value: string }) => { mockStorage[key] = value; },
      remove: async ({ key }: { key: string }) => { delete mockStorage[key]; },
    };
  });
}

async function setupPin(page: Page, pin: string = '1234') {
  // Step 1: Create PIN
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  // Click the arrow button (last button in keypad grid)
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').last().click();
  // Step 2: Confirm PIN
  await expect(page.getByText('Confirm PIN')).toBeVisible({ timeout: 5000 });
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  // After setup, app shows auth screen - login with the PIN
  await page.waitForTimeout(500);
  await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
}

async function loginWithPin(page: Page, pin: string = '1234') {
  await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.waitForTimeout(800); // wait for auto-submit
}

async function addItem(page: Page, opts: {
  name: string;
  category?: string;
  subType?: string;
  description?: string;
  weight?: string;
  unit?: string;
}) {
  await page.getByRole('button', { name: 'Add Item' }).click();
  await page.waitForTimeout(300);
  await page.locator('input[placeholder*="Gold Chain"]').fill(opts.name);

  if (opts.category) {
    await page.getByRole('button', { name: opts.category }).click();
    await page.waitForTimeout(300);
  }
  if (opts.subType) {
    await page.getByRole('button', { name: opts.subType, exact: true }).click();
    await page.waitForTimeout(300);
  }
  if (opts.description) {
    await page.locator('textarea').fill(opts.description);
  }
  if (opts.weight) {
    await page.locator('input[inputmode="decimal"]').fill(opts.weight);
  }
  if (opts.unit) {
    await page.getByRole('button', { name: opts.unit, exact: true }).click();
  }

  await page.getByRole('button', { name: /Save to/ }).click();
  await page.waitForTimeout(800);
}

// Global test timeout
test.setTimeout(120000);

// --- Test Suite ---

test.describe('vlocker - Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-AUTH-01: First launch shows setup screen', async ({ page }) => {
    await expect(page.getByText('Secure Your Locker')).toBeVisible();
    await expect(page.getByText(/Create/)).toBeVisible();
  });

  test('TC-AUTH-02: Setup PIN flow works', async ({ page }) => {
    await setupPin(page, '1234');
    await expect(page.getByText(/Your Locker/)).toBeVisible();
  });

  test('TC-AUTH-03: Login with correct PIN works', async ({ page }) => {
    await setupPin(page, '1234');
    // Auto-navigates to home after PIN confirmation
    await expect(page.getByText(/Your Locker/)).toBeVisible();

    // Logout and relogin
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Log Out').click();
    await expect(page.getByText(/Enter PIN/)).toBeVisible();

    await loginWithPin(page, '1234');
    await expect(page.getByText(/Your Locker/)).toBeVisible();
  });

  test('TC-AUTH-04: Wrong PIN shows error', async ({ page }) => {
    await setupPin(page, '1234');

    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Log Out').click();

    await loginWithPin(page, '9999');
    await expect(page.getByText(/Incorrect/)).toBeVisible();
  });
});

test.describe('vlocker - Add Items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
  });

  test('TC-ADD-01: Add Gold item with Chain subtype', async ({ page }) => {
    await addItem(page, { name: 'Gold Chain', category: 'Gold', subType: 'Chain', weight: '15', unit: 'g' });
    await expect(page.getByText('Gold Chain')).toBeVisible();
  });

  test('TC-ADD-02: Add Gold item with Pendant subtype', async ({ page }) => {
    await addItem(page, { name: 'Gold Pendant', category: 'Gold', subType: 'Pendant', weight: '8', unit: 'g' });
    await expect(page.getByText('Gold Pendant')).toBeVisible();
  });

  test('TC-ADD-03: Add Silver item', async ({ page }) => {
    await addItem(page, { name: 'Silver Bangle', category: 'Silver', subType: 'Bangle', weight: '25', unit: 'g' });
    await expect(page.getByText('Silver Bangle')).toBeVisible();
  });

  test('TC-ADD-04: Add Diamond item with carat weight', async ({ page }) => {
    await addItem(page, { name: 'Diamond Ring', category: 'Diamond', subType: 'Ring', weight: '1.5', unit: 'ct' });
    await expect(page.getByText('Diamond Ring')).toBeVisible();
  });

  test('TC-ADD-05: Add Document item', async ({ page }) => {
    await addItem(page, { name: 'Property Papers', category: 'Documents', subType: 'Property' });
    await expect(page.getByText('Property Papers')).toBeVisible();
  });

  test('TC-ADD-06: Add Other category with custom description', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('input[placeholder*="Gold Chain"]').fill('Antique Watch');
    await page.getByRole('button', { name: 'Other' }).click();
    await page.locator('input[placeholder*="Antique"]').fill('Vintage Watch');
    await page.getByRole('button', { name: /Save to/ }).click();
    await expect(page.getByText('Antique Watch')).toBeVisible();
  });

  test('TC-ADD-07: Validation - name required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await page.getByRole('button', { name: 'Gold' }).click();
    await page.getByRole('button', { name: /Save to/ }).click();
    await expect(page.getByText(/required/)).toBeVisible();
  });

  test('TC-ADD-08: Validation - category required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('input[placeholder*="Gold Chain"]').fill('Test Item');
    await page.getByRole('button', { name: /Save to/ }).click();
    await expect(page.getByText(/required/)).toBeVisible();
  });

  test('TC-ADD-09: Validation - subType required for jewellery', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('input[placeholder*="Gold Chain"]').fill('Test Gold');
    await page.getByRole('button', { name: 'Gold' }).click();
    await page.getByRole('button', { name: /Save to/ }).click();
    await expect(page.getByText(/required/)).toBeVisible();
  });
});

test.describe('vlocker - Item Details & Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
    await page.getByRole('button', { name: /Locker|started/i }).click();
    await addItem(page, { name: 'Test Gold Ring', category: 'Gold', subType: 'Ring', description: 'Original desc', weight: '10', unit: 'g' });
  });

  test('TC-EDIT-01: View item details', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await expect(page.getByText('Gold')).toBeVisible();
    await expect(page.getByText('Ring')).toBeVisible();
    await expect(page.getByText('Original desc')).toBeVisible();
  });

  test('TC-EDIT-02: Edit item name', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('input[type="text"]').first().fill('Updated Gold Ring');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Updated Gold Ring')).toBeVisible();
  });

  test('TC-EDIT-03: Edit item category in edit mode', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Silver' }).click();
    await page.getByRole('button', { name: 'Bangle' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('button', { name: 'Back' }).first().click();
    await expect(page.getByText('Silver')).toBeVisible();
  });

  test('TC-EDIT-04: Edit item date', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('input[type="date"]').fill('2024-06-15');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-EDIT-05: Delete item shows confirmation', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText('Delete Item?')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('TC-EDIT-06: Delete item removes it', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: 'Delete', exact: false }).nth(1).click();
    await expect(page.getByText(/Your Locker/)).toBeVisible();
  });

  test('TC-EDIT-07: Edit item description', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('textarea').fill('Updated description 22kt');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Updated description 22kt')).toBeVisible();
  });

  test('TC-EDIT-08: Change to Chain subtype', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Chain' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-EDIT-09: Change to Pendant subtype', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Pendant' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/saved/)).toBeVisible();
  });
});

test.describe('vlocker - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
    await page.getByRole('button', { name: /Locker|started/i }).click();
  });

  test('TC-SET-01: Navigate to settings', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await expect(page.getByText('Security')).toBeVisible();
    await expect(page.getByText('Data')).toBeVisible();
    await expect(page.getByText('Warning')).toBeVisible();
  });

  test('TC-SET-02: Logout works', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Log Out').click();
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
  });

  test('TC-SET-03: Logout requires PIN to re-enter', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Log Out').click();
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
  });

  test('TC-SET-04: Export button is present', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await expect(page.getByText('Export Data')).toBeVisible();
  });

  test('TC-SET-05: Wipe data confirmation dialog', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Wipe All Data').click();
    await expect(page.getByText('Wipe All Data?')).toBeVisible();
  });

  test('TC-SET-06: Change PIN flow', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Change PIN').click();
    await page.locator('input[type="password"]').nth(0).fill('1234');
    await page.locator('input[type="password"]').nth(1).fill('5678');
    await page.locator('input[type="password"]').nth(2).fill('5678');
    await page.getByRole('button', { name: 'Update PIN' }).click();
    await expect(page.getByText(/success/)).toBeVisible();
  });

  test('TC-SET-07: Biometric toggle works', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    const toggle = page.locator('button').filter({ has: page.locator('div[class*="translate-x"]') }).first();
    await toggle.click();
    await expect(page.getByText(/enabled|disabled/)).toBeVisible();
  });

  test('TC-SET-08: Wipe cancels properly', async ({ page }) => {
    await addItem(page, { name: 'Keep Item', category: 'Gold', subType: 'Chain' });
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Wipe All Data').click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Back' }).first().click();
    await expect(page.getByText('Keep Item')).toBeVisible();
  });
});

test.describe('vlocker - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
    await page.getByRole('button', { name: /Locker|started/i }).click();
  });

  test('TC-EDGE-01: Special characters in name', async ({ page }) => {
    await addItem(page, { name: 'Gold Chain #123', category: 'Gold', subType: 'Chain' });
    await expect(page.getByText('Gold Chain #123')).toBeVisible();
  });

  test('TC-EDGE-02: Zero weight value', async ({ page }) => {
    await addItem(page, { name: 'Zero Weight', category: 'Gold', subType: 'Chain', weight: '0', unit: 'g' });
    await expect(page.getByText('Zero Weight')).toBeVisible();
  });

  test('TC-EDGE-03: Decimal weight value', async ({ page }) => {
    await addItem(page, { name: 'Decimal Weight', category: 'Gold', subType: 'Chain', weight: '15.75', unit: 'g' });
    await expect(page.getByText('Decimal Weight')).toBeVisible();
  });

  test('TC-EDGE-04: Multiple items', async ({ page }) => {
    for (let i = 1; i <= 5; i++) {
      await addItem(page, { name: `Item ${i}`, category: 'Gold', subType: 'Chain' });
    }
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Item ${i}`)).toBeVisible();
    }
  });

  test('TC-EDGE-05: Empty description is valid', async ({ page }) => {
    await addItem(page, { name: 'No Desc', category: 'Gold', subType: 'Chain' });
    await expect(page.getByText('No Desc')).toBeVisible();
  });

  test('TC-EDGE-06: All category types', async ({ page }) => {
    const categories = [
      { cat: 'Gold', sub: 'Pendant' },
      { cat: 'Silver', sub: 'Chain' },
      { cat: 'Platinum', sub: 'Ring' },
      { cat: 'Diamond', sub: 'Earring' },
      { cat: 'Documents', sub: 'Property' },
    ];
    for (const { cat, sub } of categories) {
      await addItem(page, { name: `Test ${cat}`, category: cat, subType: sub });
      await expect(page.getByText(`Test ${cat}`)).toBeVisible();
    }
  });
});

test.describe('vlocker - Confirmation Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
    await page.getByRole('button', { name: /Locker|started/i }).click();
  });

  test('TC-CONF-01: Save shows confirmation', async ({ page }) => {
    await addItem(page, { name: 'Toast Test', category: 'Gold', subType: 'Chain' });
    await expect(page.getByText(/Your Locker/)).toBeVisible();
  });

  test('TC-CONF-02: Delete shows confirmation dialog', async ({ page }) => {
    await addItem(page, { name: 'Delete Test', category: 'Gold', subType: 'Chain' });
    await page.getByText('Delete Test').click();
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText('Delete Item?')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('TC-CONF-03: Edit shows saved toast', async ({ page }) => {
    await addItem(page, { name: 'Edit Test', category: 'Gold', subType: 'Chain' });
    await page.getByText('Edit Test').click();
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('input[type="text"]').first().fill('Edit Test Updated');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-CONF-04: Logout shows success', async ({ page }) => {
    await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
    await page.getByText('Log Out').click();
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
  });
});
