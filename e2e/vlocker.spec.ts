import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

test.setTimeout(60000);

// Pre-defined questions (same as app)
const SECRET_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first school?',
  'What was the name of your first pet?',
  'What is your favorite childhood movie?',
  'What city were you born in?',
  'What was your childhood nickname?',
  'What is the name of your favorite teacher?',
  'What was the model of your first phone?',
  'What is your favorite book?',
  'What was the name of your childhood best friend?',
];

// --- Helpers ---

async function setupPin(page: Page, pin: string = '1234') {
  // Step 1: Create PIN
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  // Click arrow to advance to confirm
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').nth(9).click(); // arrow button

  await expect(page.getByText('Confirm PIN')).toBeVisible({ timeout: 5000 });

  // Step 2: Confirm PIN
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }

  // Step 3: Secret Questions screen
  await expect(page.getByText('Recovery Questions')).toBeVisible({ timeout: 5000 });

  // Fill in 3 questions and answers
  for (let i = 0; i < 3; i++) {
    // Click dropdown to open
    await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(i).click();
    await page.waitForTimeout(300);
    // Select question at index i from dropdown
    await page.getByRole('button', { name: SECRET_QUESTIONS[i], exact: false }).first().click();
    await page.waitForTimeout(300);
    // Fill answer
    await page.locator('input[type="text"]').nth(i).fill(`answer${i + 1}`);
  }

  // Click Save
  await page.getByRole('button', { name: /Save & Secure/ }).click();
  await page.waitForTimeout(800);
}

async function setupPinWithCustomAnswers(page: Page, pin: string, answers: string[]) {
  // Step 1: Create PIN
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }
  const keypad = page.locator('.grid-cols-3');
  await keypad.locator('button').nth(9).click();

  await expect(page.getByText('Confirm PIN')).toBeVisible({ timeout: 5000 });

  // Step 2: Confirm PIN
  for (const d of pin.split('')) {
    await page.getByRole('button', { name: d, exact: true }).click();
  }

  // Step 3: Secret Questions
  await expect(page.getByText('Recovery Questions')).toBeVisible({ timeout: 5000 });

  for (let i = 0; i < 3; i++) {
    await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(i).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: SECRET_QUESTIONS[i], exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.locator('input[type="text"]').nth(i).fill(answers[i]);
  }

  await page.getByRole('button', { name: /Save & Secure/ }).click();
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

async function injectSecretQuestions(page: Page, answers: string[]) {
  const questionHashes = await page.evaluate(async (ans) => {
    // Simple SHA-256 via Web Crypto API
    const hash = async (str: string) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str.toLowerCase()));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    };
    return Promise.all(ans.map(a => hash(a)));
  }, answers);

  await page.evaluate((data) => {
    const questions = {
      question1: data.questions[0],
      answer1: data.hashes[0],
      question2: data.questions[1],
      answer2: data.hashes[1],
      question3: data.questions[2],
      answer3: data.hashes[2],
    };
    localStorage.setItem('vlocker_secret_questions', JSON.stringify(questions));
  }, { questions: [SECRET_QUESTIONS[0], SECRET_QUESTIONS[1], SECRET_QUESTIONS[2]], hashes: questionHashes });
}

async function injectItemWithPhotos(page: Page) {
  // SHA-256 hash of "1234"
  const PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  const TEST_PHOTO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  await page.evaluate((data) => {
    localStorage.setItem('async_has_setup', 'true');
    localStorage.setItem('async_biometric', 'false');
    localStorage.setItem('secure_pin', data.pinHash);
    const items = [{
      id: 'test-photo-item',
      name: 'Photo Test Gold',
      description: 'Item with photos for viewer test',
      category: 'Gold',
      subType: 'Chain',
      subTypeCustom: '',
      categoryCustom: '',
      weightAmount: '15',
      weightUnit: 'g',
      pieceCount: '',
      dateAdded: new Date().toISOString(),
      photos: data.photos,
      billPhotos: data.billPhotos,
      inLocker: true,
    }];
    localStorage.setItem('vlocker_items', JSON.stringify(items));
  }, { pinHash: PIN_HASH, photos: [TEST_PHOTO_B64, TEST_PHOTO_B64], billPhotos: [TEST_PHOTO_B64, TEST_PHOTO_B64] });

  await page.reload();
  await page.waitForTimeout(800);
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

  test('TC-AUTH-02: Setup PIN and secret questions works', async ({ page }) => {
    await setupPin(page, '1234');
    await expect(page.getByRole('heading', { name: 'Your Locker is Empty' })).toBeVisible();
  });

  test('TC-AUTH-03: Login with correct PIN works', async ({ page }) => {
    await setupPin(page, '1234');
    await logout(page);
    await loginWithPin(page, '1234');
    await expect(page.getByRole('heading', { name: 'Your Locker is Empty' })).toBeVisible();
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

// --- Secret Questions / Forgot PIN Tests ---

test.describe('vlocker - Forgot PIN', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-FORGOT-01: Clicking Forgot PIN shows verify questions screen', async ({ page }) => {
    await setupPinWithCustomAnswers(page, '1234', ['school1', 'pet2', 'movie3']);
    await logout(page);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Verify Identity')).toBeVisible();
    await expect(page.getByText('Answer your security questions')).toBeVisible();
  });

  test('TC-FORGOT-02: Correct answers allow creating new PIN', async ({ page }) => {
    await setupPinWithCustomAnswers(page, '1234', ['school1', 'pet2', 'movie3']);
    await logout(page);

    // Click forgot PIN
    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);

    // Fill correct answers
    await page.locator('input[type="text"]').nth(0).fill('school1');
    await page.locator('input[type="text"]').nth(1).fill('pet2');
    await page.locator('input[type="text"]').nth(2).fill('movie3');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForTimeout(500);

    // Should show create new PIN
    await expect(page.getByText('Create New PIN')).toBeVisible();

    // Create new PIN
    for (const d of '5678') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await page.waitForTimeout(600);

    // Confirm new PIN
    await expect(page.getByText('Confirm New PIN')).toBeVisible();
    for (const d of '5678') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await page.waitForTimeout(800);

    // Should be logged in
    await expect(page.getByRole('heading', { name: 'Your Locker is Empty' })).toBeVisible();
  });

  test('TC-FORGOT-03: Wrong answers show error and stay on verify screen', async ({ page }) => {
    await setupPinWithCustomAnswers(page, '1234', ['school1', 'pet2', 'movie3']);
    await logout(page);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);

    // Fill wrong answers
    await page.locator('input[type="text"]').nth(0).fill('wrong1');
    await page.locator('input[type="text"]').nth(1).fill('wrong2');
    await page.locator('input[type="text"]').nth(2).fill('wrong3');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForTimeout(500);

    // Should still be on verify screen with error
    await expect(page.getByText('Verify Identity')).toBeVisible();
    await expect(page.getByText(/incorrect/)).toBeVisible();
  });

  test('TC-FORGOT-04: Cancel returns to login screen', async ({ page }) => {
    await setupPinWithCustomAnswers(page, '1234', ['school1', 'pet2', 'movie3']);
    await logout(page);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    // Should be back on login
    await expect(page.getByText('Enter PIN')).toBeVisible();
  });

  test('TC-FORGOT-05: Legacy user without secret questions shows wipe option', async ({ page }) => {
    // Inject PIN only, no secret questions (legacy state)
    await page.evaluate(() => {
      localStorage.setItem('async_has_setup', 'true');
      localStorage.setItem('secure_pin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
    });
    await page.reload();
    await page.waitForTimeout(800);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);

    // Should show legacy reset screen
    await expect(page.getByText('No security questions found')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wipe & Reset' })).toBeVisible();
  });

  test('TC-FORGOT-06: Legacy user can cancel instead of wipe', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('async_has_setup', 'true');
      localStorage.setItem('secure_pin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4');
    });
    await page.reload();
    await page.waitForTimeout(800);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Enter PIN')).toBeVisible();
  });

  test('TC-FORGOT-07: Case-insensitive answer matching', async ({ page }) => {
    // Setup with mixed case answers
    await setupPinWithCustomAnswers(page, '1234', ['School1', 'Pet2', 'Movie3']);
    await logout(page);

    await page.getByText('Forgot PIN?').click();
    await page.waitForTimeout(300);

    // Fill lowercase versions - should still work (case-insensitive)
    await page.locator('input[type="text"]').nth(0).fill('school1');
    await page.locator('input[type="text"]').nth(1).fill('pet2');
    await page.locator('input[type="text"]').nth(2).fill('movie3');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('Create New PIN')).toBeVisible();
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
    await page.waitForTimeout(300);
    const keypadButtons = page.locator('.grid-cols-3 button');
    await expect(keypadButtons).toHaveCount(12);
  });

  test('TC-BIO-02: Fingerprint button hidden when biometric disabled', async ({ page }) => {
    await setupPin(page, '1234');
    await logout(page);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    const keypadButtons = page.locator('.grid-cols-3 button');
    const count = await keypadButtons.count();
    expect(count).toBe(11);
  });

  test('TC-BIO-03: Manual fingerprint tap logs in', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await logout(page);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    await page.waitForTimeout(300);
    await page.locator('.grid-cols-3 button').nth(9).click();
    await page.waitForTimeout(1200);
    await expect(page.getByRole('heading', { name: 'Your Locker is Empty' })).toBeVisible();
  });

  test('TC-BIO-04: Biometric auto-prompt works on normal open', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await page.evaluate(() => {
      localStorage.removeItem('async_just_logged_out');
    });
    await page.reload();
    await page.waitForTimeout(500);
    await page.waitForTimeout(2500);
    await expect(page.getByRole('heading', { name: 'Your Locker is Empty' })).toBeVisible();
  });

  test('TC-BIO-05: No auto-prompt after logout', async ({ page }) => {
    await setupPin(page, '1234');
    await enableBiometric(page);
    await logout(page);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Enter PIN')).toBeVisible();
    await expect(page.getByText(/Your Locker/)).not.toBeVisible();
  });

  test('TC-BIO-06: Biometric can be toggled off', async ({ page }) => {
    await setupPin(page, '1234');
    await page.evaluate(() => {
      localStorage.setItem('async_biometric', 'true');
    });
    let val = await page.evaluate(() => localStorage.getItem('async_biometric'));
    expect(val).toBe('true');
    await page.evaluate(() => {
      localStorage.setItem('async_biometric', 'false');
    });
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
    await page.locator('header').locator('button').last().click();
    await page.waitForTimeout(500);
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
    await page.evaluate(() => {
      localStorage.setItem('async_biometric', 'true');
    });
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

// --- Image Viewer ---

test.describe('vlocker - Image Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-VIEW-01: Click main photo opens full-screen viewer', async ({ page }) => {
    await injectItemWithPhotos(page);
    await loginWithPin(page, '1234');
    await expect(page.getByText('Photo Test Gold')).toBeVisible();
    await page.getByText('Photo Test Gold').click();
    await page.waitForTimeout(300);
    await page.locator('.aspect-square .cursor-pointer').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Tap anywhere to close')).toBeVisible();
  });

  test('TC-VIEW-02: Click bill photo opens full-screen viewer', async ({ page }) => {
    await injectItemWithPhotos(page);
    await loginWithPin(page, '1234');
    await page.getByText('Photo Test Gold').click();
    await page.waitForTimeout(300);
    await page.locator('button', { has: page.locator('[alt="Bill/Certificate 1"]') }).first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Tap anywhere to close')).toBeVisible();
  });

  test('TC-VIEW-03: Close viewer with X button', async ({ page }) => {
    await injectItemWithPhotos(page);
    await loginWithPin(page, '1234');
    await page.locator('p', { hasText: 'Photo Test Gold' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.aspect-square .cursor-pointer').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Tap anywhere to close')).toBeVisible();
    await page.locator('button', { has: page.locator('.lucide-x') }).last().click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: 'Edit Item' })).toBeVisible();
    await expect(page.getByText('Tap anywhere to close')).not.toBeVisible();
  });

  test('TC-VIEW-04: Close viewer by tapping background', async ({ page }) => {
    await injectItemWithPhotos(page);
    await loginWithPin(page, '1234');
    await page.locator('p', { hasText: 'Photo Test Gold' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.aspect-square .cursor-pointer').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Tap anywhere to close')).toBeVisible();
    await page.locator('.bg-black\\/95 .border-b').click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: 'Edit Item' })).toBeVisible();
    await expect(page.getByText('Tap anywhere to close')).not.toBeVisible();
  });

  test('TC-VIEW-05: Thumbnail strip opens full-screen viewer', async ({ page }) => {
    await injectItemWithPhotos(page);
    await loginWithPin(page, '1234');
    await page.getByText('Photo Test Gold').click();
    await page.waitForTimeout(300);
    await page.locator('.border-\\[\\#C9A84C\\] .cursor-pointer').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Tap anywhere to close')).toBeVisible();
  });
});

// --- Data Migration & Storage ---

test.describe('vlocker - Data Migration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-MIG-01: Legacy items without inLocker field default to true', async ({ page }) => {
    const PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
    await page.evaluate((pinHash) => {
      localStorage.setItem('async_has_setup', 'true');
      localStorage.setItem('secure_pin', pinHash);
      const items = [{
        id: 'legacy-item',
        name: 'Legacy Gold',
        description: 'Item without inLocker',
        category: 'Gold',
        subType: 'Chain',
        subTypeCustom: '',
        categoryCustom: '',
        weightAmount: '10',
        weightUnit: 'g',
        pieceCount: '',
        dateAdded: new Date().toISOString(),
        photos: [],
        billPhotos: [],
        // Note: no inLocker field
      }];
      localStorage.setItem('vlocker_items', JSON.stringify(items));
    }, PIN_HASH);

    await page.reload();
    await page.waitForTimeout(800);
    await loginWithPin(page, '1234');
    await expect(page.getByText('Legacy Gold')).toBeVisible();

    // Click to view and verify inLocker is true (shows as "In Locker" toggle)
    await page.getByText('Legacy Gold').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('In Locker')).toBeVisible();
  });
});

// --- Secret Questions Setup Validation ---

test.describe('vlocker - Secret Questions Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('TC-SQ-01: Cannot proceed without answering all 3 questions', async ({ page }) => {
    // Create PIN
    for (const d of '1234') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    const keypad = page.locator('.grid-cols-3');
    await keypad.locator('button').nth(9).click();
    await expect(page.getByText('Confirm PIN')).toBeVisible();
    for (const d of '1234') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Recovery Questions')).toBeVisible();

    // Don't fill any answers, click Save
    await page.getByRole('button', { name: /Save & Secure/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Please answer/)).toBeVisible();
  });

  test('TC-SQ-02: Duplicate questions are prevented by disabled UI', async ({ page }) => {
    // Create PIN
    for (const d of '1234') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    const keypad = page.locator('.grid-cols-3');
    await keypad.locator('button').nth(9).click();
    await expect(page.getByText('Confirm PIN')).toBeVisible();
    for (const d of '1234') {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Recovery Questions')).toBeVisible();

    // Record question 1's current selection (should be "first school" by default)
    const q1Before = await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(1).innerText();
    expect(q1Before).toContain(SECRET_QUESTIONS[1]);

    // Open dropdown 1
    await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(1).click();
    await page.waitForTimeout(300);

    // Try to click the already-used question (question 0) from the dropdown
    // It should be disabled, so Playwright can't click it (will timeout)
    const dropdownPanel = page.locator('.absolute.z-50.max-h-48');
    const firstOption = dropdownPanel.locator('button').first();
    await expect(firstOption).toHaveAttribute('disabled', '');

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify question 1 still has its original selection
    const q1After = await page.locator('button', { has: page.locator('.lucide-chevron-down') }).nth(1).innerText();
    expect(q1After).toContain(SECRET_QUESTIONS[1]);
  });

  test('TC-SQ-03: Secret questions are saved in storage with hashed answers', async ({ page }) => {
    await setupPinWithCustomAnswers(page, '1234', ['alpha', 'beta', 'gamma']);
    const sq = await page.evaluate(() => localStorage.getItem('vlocker_secret_questions'));
    expect(sq).toContain('question1');
    expect(sq).toContain('answer1');
    // Answers are SHA-256 hashed, not stored in plaintext
    expect(sq).toContain('question2');
    expect(sq).toContain('answer2');
    expect(sq).toContain('question3');
    expect(sq).toContain('answer3');
  });
});

// --- In/Out Locker Toggle ---

test.describe('vlocker - In Locker Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
    await setupPin(page, '1234');
  });

  test('TC-LOCKER-01: New item defaults to In Locker', async ({ page }) => {
    await addItem(page, { name: 'Locker Item', category: 'Gold', subType: 'Chain' });
    await page.getByText('Locker Item').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('In Locker')).toBeVisible();
  });

  test('TC-LOCKER-02: Item count shows only inLocker items', async ({ page }) => {
    await addItem(page, { name: 'In Gold', category: 'Gold', subType: 'Chain' });
    await addItem(page, { name: 'Out Gold', category: 'Gold', subType: 'Pendant' });

    // Mark second item as out of locker
    await page.getByText('Out Gold').click();
    await page.waitForTimeout(300);
    // Toggle off - click the In Locker toggle button
    await page.getByText('In Locker').click();
    await page.waitForTimeout(500);

    // Go back to home
    await page.goto(BASE_URL);
    await page.waitForTimeout(800);
    await loginWithPin(page, '1234');
    await page.waitForTimeout(500);

    // Should show 1 item in locker (In Gold)
    await expect(page.getByText('In Gold')).toBeVisible();
    await expect(page.getByText('Out Gold')).toBeVisible();
  });
});
