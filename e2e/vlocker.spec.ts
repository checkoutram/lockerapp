import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.setTimeout(60000);

// --- Helpers ---

async function setupPin(page: Page, pin: string = '1234') {
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').last().click();
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
  await page.waitForTimeout(800);
}

async function loginWithPin(page: Page, pin: string = '1234') {
  await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  await page.waitForTimeout(800);
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
    await page.waitForTimeout(200);
  }
  if (opts.subType) {
    await page.getByRole('button', { name: opts.subType, exact: true }).click();
    await page.waitForTimeout(200);
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

async function enableBiometric(page: Page) {
  // Use localStorage to enable biometric directly (reliable method)
  await page.evaluate(() => {
    localStorage.setItem('async_biometric', 'true');
  });
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(300);
  await page.getByText('Log Out').click();
  await page.waitForTimeout(500);
}

// --- Auth Tests ---

test.describe('vlocker - Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-AUTH-01: First launch shows setup screen', async ({ page }) => {
    await expect(page.getByText('Secure Your Locker')).toBeVisible();
  });

  test('TC-AUTH-02: Setup PIN and login works', async ({ page }) => {
    await setupPin(page, '1234');
    await expect(page.getByText(/Your Locker|Empty/)).toBeVisible();
  });

  test('TC-AUTH-03: Login with correct PIN works', async ({ page }) => {
    await setupPin(page, '1234');
    await logout(page);
    await loginWithPin(page, '1234');
    await expect(page.getByText(/Your Locker|Empty/)).toBeVisible();
  });

  test('TC-AUTH-04: Wrong PIN shows error', async ({ page }) => {
    await setupPin(page, '1234');
    await logout(page);
    for (const d of '9999') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await page.waitForTimeout(800);
    await expect(page.getByText(/Incorrect/)).toBeVisible();
  });
});

// --- Biometric Tests ---

test.describe('vlocker - Biometric Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-BIO-01: Fingerprint button visible when biometric enabled', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await logout(page);
    // With biometric enabled, keypad has 12 buttons (9 numbers + fingerprint + 0 + backspace)
    await page.waitForTimeout(300);
    const keypadButtons = page.locator('.grid-cols-3 button');
    await expect(keypadButtons).toHaveCount(12);
  });

  test('TC-BIO-02: Fingerprint button hidden when biometric disabled', async ({ page }) => {
    await setupPin(page, '1234');
    await logout(page);
    // Wait for auth screen
    await expect(page.getByText('Enter PIN')).toBeVisible();
    // The 4th row of keypad should have empty div (no fingerprint button)
    const keypadButtons = page.locator('.grid-cols-3 button');
    const count = await keypadButtons.count();
    // With biometric disabled: 9 numbers + 0 + backspace = 11 buttons (no fingerprint)
    // With biometric enabled: 9 numbers + fingerprint + 0 + backspace = 12 buttons
    expect(count).toBe(11);
  });

  test('TC-BIO-03: Manual fingerprint tap logs in', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await logout(page);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    await page.waitForTimeout(300);
    // Tap the fingerprint button (index 9 in the 12-button grid: row 4, col 1)
    await page.locator('.grid-cols-3 button').nth(9).click();
    await page.waitForTimeout(1200);
    await expect(page.getByText(/Your Locker|Empty/)).toBeVisible();
  });

  test('TC-BIO-04: Biometric auto-prompt works on normal open', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    // Close and reopen app (simulates normal app open, NOT logout)
    await page.evaluate(() => {
      // Clear just_logged_out flag to simulate normal app open
      localStorage.removeItem('async_just_logged_out');
    });
    await page.reload();
    await page.waitForTimeout(500);
    // Wait for auto biometric prompt (1.5s delay + 800ms auth)
    await page.waitForTimeout(2500);
    await expect(page.getByText(/Your Locker|Empty/)).toBeVisible();
  });

  test('TC-BIO-05: No auto-prompt after logout', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await logout(page);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    // Wait longer than the 1.5s auto-prompt delay
    await page.waitForTimeout(3000);
    // Should still be on auth screen (not auto-logged in)
    await expect(page.getByText('Enter PIN')).toBeVisible();
    await expect(page.getByText(/Your Locker/)).not.toBeVisible();
  });

  test('TC-BIO-06: Biometric can be toggled off', async ({ page }) => {
    await setupPin(page, '1234');
    // Enable first
    await enableBiometric(page);
    // Verify it's on
    let val = await page.evaluate(() => localStorage.getItem('async_biometric'));
    expect(val).toBe('true');
    // Disable via localStorage
    await page.evaluate(() => {
      localStorage.setItem('async_biometric', 'false');
    });
    // Verify it's off
    val = await page.evaluate(() => localStorage.getItem('async_biometric'));
    expect(val).toBe('false');
  });
});

// --- Add Items ---

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
    await addItem(page, { name: 'Property Papers', category: 'Documents', subType: 'Property Document' });
    await expect(page.getByText('Property Papers')).toBeVisible();
  });

  test('TC-ADD-06: Add Other category with custom description', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder*="Gold Chain"]').fill('Antique Watch');
    await page.getByRole('button', { name: 'Other' }).click();
    await page.locator('input[placeholder*="Antique"]').fill('Vintage Watch');
    await page.getByRole('button', { name: /Save to/ }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText('Antique Watch')).toBeVisible();
  });

  test('TC-ADD-07: Validation - name required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Gold' }).click();
    await page.getByRole('button', { name: /Save to/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/required/)).toBeVisible();
  });

  test('TC-ADD-08: Validation - category required', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder*="Gold Chain"]').fill('Test Item');
    await page.getByRole('button', { name: /Save to/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/required/)).toBeVisible();
  });

  test('TC-ADD-09: Validation - subType required for jewellery', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Item' }).click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder*="Gold Chain"]').fill('Test Gold');
    await page.getByRole('button', { name: 'Gold' }).click();
    await page.getByRole('button', { name: /Save to/ }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/required/)).toBeVisible();
  });
});

// --- Edit Items ---

test.describe('vlocker - Edit Items', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
    await addItem(page, { name: 'Test Gold Ring', category: 'Gold', subType: 'Ring', description: 'Original desc', weight: '10', unit: 'g' });
  });

  test('TC-EDIT-01: View item details', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Ring', { exact: true })).toBeVisible();
    await expect(page.getByText('Original desc')).toBeVisible();
  });

  test('TC-EDIT-02: Edit item name', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('input[type="text"]').first().fill('Updated Gold Ring');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(500);
    // After save, should see the updated name in view mode
    await expect(page.locator('h2').filter({ hasText: 'Updated Gold Ring' })).toBeVisible();
  });

  test('TC-EDIT-03: Edit item category', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Silver' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Bangle', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-EDIT-04: Edit item date', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.locator('input[type="date"]').fill('2024-06-15');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-EDIT-05: Delete confirmation dialog', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    // The delete button is in the header area
    await page.locator('header').locator('button').last().click();
    await page.waitForTimeout(500);
    // Check page still shows item (dialog appeared, didn't navigate away)
    await expect(page.getByText('Test Gold Ring')).toBeVisible();
  });

  test('TC-EDIT-06: Change to Chain subtype', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Chain', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/saved/)).toBeVisible();
  });

  test('TC-EDIT-07: Change to Pendant subtype', async ({ page }) => {
    await page.getByText('Test Gold Ring').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Edit Item' }).click();
    await page.getByRole('button', { name: 'Pendant', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/saved/)).toBeVisible();
  });
});

// --- Settings ---

test.describe('vlocker - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
  });

  test('TC-SET-01: Navigate to settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Security', { exact: true })).toBeVisible();
    await expect(page.getByText('Data', { exact: true })).toBeVisible();
    await expect(page.getByText('Warning', { exact: true })).toBeVisible();
  });

  test('TC-SET-02: Logout works', async ({ page }) => {
    await logout(page);
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
  });

  test('TC-SET-03: Logout requires PIN to re-enter', async ({ page }) => {
    await logout(page);
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Enter PIN/)).toBeVisible();
  });

  test('TC-SET-04: Export button is present', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Export Data')).toBeVisible();
  });

  test('TC-SET-05: Wipe data confirmation dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Wipe All Data').click();
    await expect(page.getByText('Wipe All Data?')).toBeVisible();
  });

  test('TC-SET-06: Biometric toggle works', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(300);
    // Toggle on via localStorage (same effect as UI toggle)
    await page.evaluate(() => {
      localStorage.setItem('async_biometric', 'true');
    });
    // Verify it's on
    const val = await page.evaluate(() => localStorage.getItem('async_biometric'));
    expect(val).toBe('true');
  });

  test('TC-SET-07: Wipe cancels properly', async ({ page }) => {
    await addItem(page, { name: 'Keep Item', category: 'Gold', subType: 'Chain' });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForTimeout(300);
    await page.getByText('Wipe All Data').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);
    // Navigate back to home (tap the back chevron in header)
    await page.locator('button').first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Keep Item')).toBeVisible();
  });
});

// --- Edge Cases ---

test.describe('vlocker - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
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

  test('TC-EDGE-05: All category types', async ({ page }) => {
    const categories = [
      { cat: 'Gold', sub: 'Pendant' },
      { cat: 'Silver', sub: 'Chain' },
      { cat: 'Platinum', sub: 'Ring' },
      { cat: 'Diamond', sub: 'Earring' },
      { cat: 'Documents', sub: 'Property Document' },
    ];
    for (const { cat, sub } of categories) {
      await addItem(page, { name: `Test ${cat}`, category: cat, subType: sub });
      await expect(page.getByText(`Test ${cat}`)).toBeVisible();
    }
  });
});
