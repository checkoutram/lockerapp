# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vlocker.spec.ts >> vlocker - Add Items >> TC-ADD-05: Add Document item
- Location: e2e/vlocker.spec.ts:166:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Property', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - button [ref=e7] [cursor=pointer]:
      - img [ref=e8]
    - heading "Add Item" [level=1] [ref=e10]
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]: Item Name *
      - textbox "e.g., Gold Chain with Pendant" [ref=e14]: Property Papers
    - generic [ref=e15]:
      - generic [ref=e16]: Category *
      - generic [ref=e17]:
        - button "🥇Gold" [ref=e18] [cursor=pointer]
        - button "🥈Silver" [ref=e19] [cursor=pointer]
        - button "💎Platinum" [ref=e20] [cursor=pointer]
        - button "💍Diamond" [ref=e21] [cursor=pointer]
        - button "📄Documents" [active] [ref=e22] [cursor=pointer]
        - button "📦Other" [ref=e23] [cursor=pointer]
    - generic [ref=e24]:
      - generic [ref=e25]: Document Type *
      - generic [ref=e26]:
        - button "Property Document" [ref=e27] [cursor=pointer]
        - button "Will / Testament" [ref=e28] [cursor=pointer]
        - button "Insurance Policy" [ref=e29] [cursor=pointer]
        - button "Fixed Deposit" [ref=e30] [cursor=pointer]
        - button "Bond / Certificate" [ref=e31] [cursor=pointer]
        - button "Passport" [ref=e32] [cursor=pointer]
        - button "Agreement / Deed" [ref=e33] [cursor=pointer]
        - button "Other (document)" [ref=e34] [cursor=pointer]
    - generic [ref=e35]:
      - generic [ref=e36]: Description
      - textbox "e.g., 22kt gold chain with pendant, 15g" [ref=e37]
    - generic [ref=e38]:
      - generic [ref=e39]: Date Added
      - generic [ref=e40]:
        - textbox [ref=e41]: 2026-05-11
        - img
    - generic [ref=e42]:
      - generic [ref=e44]: Photos (0/5)
      - generic [ref=e45]:
        - button "Take Photo" [ref=e46] [cursor=pointer]:
          - img [ref=e47]
          - generic [ref=e50]: Take Photo
        - button "Gallery" [ref=e51] [cursor=pointer]:
          - img [ref=e52]
          - generic [ref=e56]: Gallery
    - button "Bill / Certificate Photo Optional — tap to expand" [ref=e58] [cursor=pointer]:
      - img [ref=e60]
      - generic [ref=e63]:
        - paragraph [ref=e64]: Bill / Certificate Photo
        - paragraph [ref=e65]: Optional — tap to expand
      - img [ref=e66]
  - button "Save to vlocker" [disabled] [ref=e69]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | const BASE_URL = 'http://localhost:4173';
  4   | 
  5   | // Mock Capacitor APIs before page loads
  6   | async function mockCapacitor(page: Page) {
  7   |   await page.addInitScript(() => {
  8   |     // @ts-ignore
  9   |     window.Capacitor = {
  10  |       isNativePlatform: () => false,
  11  |       getPlatform: () => 'web',
  12  |     };
  13  |     // Mock Preferences
  14  |     const mockStorage: Record<string, string> = {};
  15  |     // @ts-ignore
  16  |     window.CapacitorPreferences = {
  17  |       get: async ({ key }: { key: string }) => ({ value: mockStorage[key] || null }),
  18  |       set: async ({ key, value }: { key: string; value: string }) => { mockStorage[key] = value; },
  19  |       remove: async ({ key }: { key: string }) => { delete mockStorage[key]; },
  20  |     };
  21  |   });
  22  | }
  23  | 
  24  | async function setupPin(page: Page, pin: string = '1234') {
  25  |   // Step 1: Create PIN
  26  |   for (const d of pin.split('')) {
  27  |     await page.getByRole('button', { name: d, exact: true }).click();
  28  |   }
  29  |   // Click the arrow button (last button in keypad grid)
  30  |   const keypad = page.locator('.grid-cols-3');
  31  |   await keypad.locator('button').last().click();
  32  |   // Step 2: Confirm PIN
  33  |   await expect(page.getByText('Confirm PIN')).toBeVisible({ timeout: 5000 });
  34  |   for (const d of pin.split('')) {
  35  |     await page.getByRole('button', { name: d, exact: true }).click();
  36  |   }
  37  |   // After setup, app shows auth screen - login with the PIN
  38  |   await page.waitForTimeout(500);
  39  |   await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  40  |   for (const d of pin.split('')) {
  41  |     await page.getByRole('button', { name: d, exact: true }).click();
  42  |   }
  43  | }
  44  | 
  45  | async function loginWithPin(page: Page, pin: string = '1234') {
  46  |   await expect(page.getByText('Enter PIN')).toBeVisible({ timeout: 5000 });
  47  |   for (const d of pin.split('')) {
  48  |     await page.getByRole('button', { name: d, exact: true }).click();
  49  |   }
  50  |   await page.waitForTimeout(800); // wait for auto-submit
  51  | }
  52  | 
  53  | async function addItem(page: Page, opts: {
  54  |   name: string;
  55  |   category?: string;
  56  |   subType?: string;
  57  |   description?: string;
  58  |   weight?: string;
  59  |   unit?: string;
  60  | }) {
  61  |   await page.getByRole('button', { name: 'Add Item' }).click();
  62  |   await page.waitForTimeout(300);
  63  |   await page.locator('input[placeholder*="Gold Chain"]').fill(opts.name);
  64  | 
  65  |   if (opts.category) {
  66  |     await page.getByRole('button', { name: opts.category }).click();
  67  |     await page.waitForTimeout(300);
  68  |   }
  69  |   if (opts.subType) {
> 70  |     await page.getByRole('button', { name: opts.subType, exact: true }).click();
      |                                                                         ^ Error: locator.click: Test timeout of 120000ms exceeded.
  71  |     await page.waitForTimeout(300);
  72  |   }
  73  |   if (opts.description) {
  74  |     await page.locator('textarea').fill(opts.description);
  75  |   }
  76  |   if (opts.weight) {
  77  |     await page.locator('input[inputmode="decimal"]').fill(opts.weight);
  78  |   }
  79  |   if (opts.unit) {
  80  |     await page.getByRole('button', { name: opts.unit, exact: true }).click();
  81  |   }
  82  | 
  83  |   await page.getByRole('button', { name: /Save to/ }).click();
  84  |   await page.waitForTimeout(800);
  85  | }
  86  | 
  87  | // Global test timeout
  88  | test.setTimeout(120000);
  89  | 
  90  | // --- Test Suite ---
  91  | 
  92  | test.describe('vlocker - Authentication', () => {
  93  |   test.beforeEach(async ({ page }) => {
  94  |     await page.goto(BASE_URL);
  95  |     await page.evaluate(() => {
  96  |       localStorage.clear();
  97  |       sessionStorage.clear();
  98  |     });
  99  |     await page.reload();
  100 |     await page.waitForTimeout(500);
  101 |   });
  102 | 
  103 |   test('TC-AUTH-01: First launch shows setup screen', async ({ page }) => {
  104 |     await expect(page.getByText('Secure Your Locker')).toBeVisible();
  105 |     await expect(page.getByText(/Create/)).toBeVisible();
  106 |   });
  107 | 
  108 |   test('TC-AUTH-02: Setup PIN flow works', async ({ page }) => {
  109 |     await setupPin(page, '1234');
  110 |     await expect(page.getByText(/Your Locker/)).toBeVisible();
  111 |   });
  112 | 
  113 |   test('TC-AUTH-03: Login with correct PIN works', async ({ page }) => {
  114 |     await setupPin(page, '1234');
  115 |     // Auto-navigates to home after PIN confirmation
  116 |     await expect(page.getByText(/Your Locker/)).toBeVisible();
  117 | 
  118 |     // Logout and relogin
  119 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  120 |     await page.getByText('Log Out').click();
  121 |     await expect(page.getByText(/Enter PIN/)).toBeVisible();
  122 | 
  123 |     await loginWithPin(page, '1234');
  124 |     await expect(page.getByText(/Your Locker/)).toBeVisible();
  125 |   });
  126 | 
  127 |   test('TC-AUTH-04: Wrong PIN shows error', async ({ page }) => {
  128 |     await setupPin(page, '1234');
  129 | 
  130 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  131 |     await page.getByText('Log Out').click();
  132 | 
  133 |     await loginWithPin(page, '9999');
  134 |     await expect(page.getByText(/Incorrect/)).toBeVisible();
  135 |   });
  136 | });
  137 | 
  138 | test.describe('vlocker - Add Items', () => {
  139 |   test.beforeEach(async ({ page }) => {
  140 |     await page.goto(BASE_URL);
  141 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  142 |     await page.reload();
  143 |     await setupPin(page, '1234');
  144 |   });
  145 | 
  146 |   test('TC-ADD-01: Add Gold item with Chain subtype', async ({ page }) => {
  147 |     await addItem(page, { name: 'Gold Chain', category: 'Gold', subType: 'Chain', weight: '15', unit: 'g' });
  148 |     await expect(page.getByText('Gold Chain')).toBeVisible();
  149 |   });
  150 | 
  151 |   test('TC-ADD-02: Add Gold item with Pendant subtype', async ({ page }) => {
  152 |     await addItem(page, { name: 'Gold Pendant', category: 'Gold', subType: 'Pendant', weight: '8', unit: 'g' });
  153 |     await expect(page.getByText('Gold Pendant')).toBeVisible();
  154 |   });
  155 | 
  156 |   test('TC-ADD-03: Add Silver item', async ({ page }) => {
  157 |     await addItem(page, { name: 'Silver Bangle', category: 'Silver', subType: 'Bangle', weight: '25', unit: 'g' });
  158 |     await expect(page.getByText('Silver Bangle')).toBeVisible();
  159 |   });
  160 | 
  161 |   test('TC-ADD-04: Add Diamond item with carat weight', async ({ page }) => {
  162 |     await addItem(page, { name: 'Diamond Ring', category: 'Diamond', subType: 'Ring', weight: '1.5', unit: 'ct' });
  163 |     await expect(page.getByText('Diamond Ring')).toBeVisible();
  164 |   });
  165 | 
  166 |   test('TC-ADD-05: Add Document item', async ({ page }) => {
  167 |     await addItem(page, { name: 'Property Papers', category: 'Documents', subType: 'Property' });
  168 |     await expect(page.getByText('Property Papers')).toBeVisible();
  169 |   });
  170 | 
```