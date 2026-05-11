# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vlocker.spec.ts >> vlocker - Settings >> TC-SET-01: Navigate to settings
- Location: e2e/vlocker.spec.ts:294:3

# Error details

```
Test timeout of 120000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Locker|started/i })

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e7]:
      - img [ref=e9]
      - generic [ref=e12]: vlocker
    - button "Settings" [ref=e13] [cursor=pointer]:
      - img [ref=e14]
  - generic [ref=e18]:
    - generic [ref=e19]:
      - paragraph [ref=e20]: Items in Locker
      - paragraph [ref=e21]: "0"
    - img [ref=e23]
  - generic [ref=e27]:
    - generic [ref=e28]:
      - img [ref=e29]
      - img [ref=e33]
    - heading "Your Locker is Empty" [level=3] [ref=e37]
    - paragraph [ref=e38]: Tap the + button to start adding items to your secure vlocker.
  - button "Add Item" [ref=e39] [cursor=pointer]:
    - img [ref=e40]
```

# Test source

```ts
  191 |     await expect(page.getByText(/required/)).toBeVisible();
  192 |   });
  193 | 
  194 |   test('TC-ADD-09: Validation - subType required for jewellery', async ({ page }) => {
  195 |     await page.getByRole('button', { name: 'Add' }).click();
  196 |     await page.locator('input[placeholder*="Gold Chain"]').fill('Test Gold');
  197 |     await page.getByRole('button', { name: 'Gold' }).click();
  198 |     await page.getByRole('button', { name: /Save to/ }).click();
  199 |     await expect(page.getByText(/required/)).toBeVisible();
  200 |   });
  201 | });
  202 | 
  203 | test.describe('vlocker - Item Details & Edit', () => {
  204 |   test.beforeEach(async ({ page }) => {
  205 |     await page.goto(BASE_URL);
  206 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  207 |     await page.reload();
  208 |     await setupPin(page, '1234');
  209 |     await page.getByRole('button', { name: /Locker|started/i }).click();
  210 |     await addItem(page, { name: 'Test Gold Ring', category: 'Gold', subType: 'Ring', description: 'Original desc', weight: '10', unit: 'g' });
  211 |   });
  212 | 
  213 |   test('TC-EDIT-01: View item details', async ({ page }) => {
  214 |     await page.getByText('Test Gold Ring').click();
  215 |     await expect(page.getByText('Gold')).toBeVisible();
  216 |     await expect(page.getByText('Ring')).toBeVisible();
  217 |     await expect(page.getByText('Original desc')).toBeVisible();
  218 |   });
  219 | 
  220 |   test('TC-EDIT-02: Edit item name', async ({ page }) => {
  221 |     await page.getByText('Test Gold Ring').click();
  222 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  223 |     await page.locator('input[type="text"]').first().fill('Updated Gold Ring');
  224 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  225 |     await expect(page.getByText('Updated Gold Ring')).toBeVisible();
  226 |   });
  227 | 
  228 |   test('TC-EDIT-03: Edit item category in edit mode', async ({ page }) => {
  229 |     await page.getByText('Test Gold Ring').click();
  230 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  231 |     await page.getByRole('button', { name: 'Silver' }).click();
  232 |     await page.getByRole('button', { name: 'Bangle' }).click();
  233 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  234 |     await page.getByRole('button', { name: 'Back' }).first().click();
  235 |     await expect(page.getByText('Silver')).toBeVisible();
  236 |   });
  237 | 
  238 |   test('TC-EDIT-04: Edit item date', async ({ page }) => {
  239 |     await page.getByText('Test Gold Ring').click();
  240 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  241 |     await page.locator('input[type="date"]').fill('2024-06-15');
  242 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  243 |     await expect(page.getByText(/saved/)).toBeVisible();
  244 |   });
  245 | 
  246 |   test('TC-EDIT-05: Delete item shows confirmation', async ({ page }) => {
  247 |     await page.getByText('Test Gold Ring').click();
  248 |     await page.getByRole('button', { name: 'Delete' }).first().click();
  249 |     await expect(page.getByText('Delete Item?')).toBeVisible();
  250 |     await page.getByRole('button', { name: 'Cancel' }).click();
  251 |   });
  252 | 
  253 |   test('TC-EDIT-06: Delete item removes it', async ({ page }) => {
  254 |     await page.getByText('Test Gold Ring').click();
  255 |     await page.getByRole('button', { name: 'Delete' }).first().click();
  256 |     await page.getByRole('button', { name: 'Delete', exact: false }).nth(1).click();
  257 |     await expect(page.getByText(/Your Locker/)).toBeVisible();
  258 |   });
  259 | 
  260 |   test('TC-EDIT-07: Edit item description', async ({ page }) => {
  261 |     await page.getByText('Test Gold Ring').click();
  262 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  263 |     await page.locator('textarea').fill('Updated description 22kt');
  264 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  265 |     await expect(page.getByText('Updated description 22kt')).toBeVisible();
  266 |   });
  267 | 
  268 |   test('TC-EDIT-08: Change to Chain subtype', async ({ page }) => {
  269 |     await page.getByText('Test Gold Ring').click();
  270 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  271 |     await page.getByRole('button', { name: 'Chain' }).click();
  272 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  273 |     await expect(page.getByText(/saved/)).toBeVisible();
  274 |   });
  275 | 
  276 |   test('TC-EDIT-09: Change to Pendant subtype', async ({ page }) => {
  277 |     await page.getByText('Test Gold Ring').click();
  278 |     await page.getByRole('button', { name: 'Edit Item' }).click();
  279 |     await page.getByRole('button', { name: 'Pendant' }).click();
  280 |     await page.getByRole('button', { name: 'Save Changes' }).click();
  281 |     await expect(page.getByText(/saved/)).toBeVisible();
  282 |   });
  283 | });
  284 | 
  285 | test.describe('vlocker - Settings', () => {
  286 |   test.beforeEach(async ({ page }) => {
  287 |     await page.goto(BASE_URL);
  288 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  289 |     await page.reload();
  290 |     await setupPin(page, '1234');
> 291 |     await page.getByRole('button', { name: /Locker|started/i }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 120000ms exceeded.
  292 |   });
  293 | 
  294 |   test('TC-SET-01: Navigate to settings', async ({ page }) => {
  295 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  296 |     await expect(page.getByText('Security')).toBeVisible();
  297 |     await expect(page.getByText('Data')).toBeVisible();
  298 |     await expect(page.getByText('Warning')).toBeVisible();
  299 |   });
  300 | 
  301 |   test('TC-SET-02: Logout works', async ({ page }) => {
  302 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  303 |     await page.getByText('Log Out').click();
  304 |     await expect(page.getByText(/Enter PIN/)).toBeVisible();
  305 |   });
  306 | 
  307 |   test('TC-SET-03: Logout requires PIN to re-enter', async ({ page }) => {
  308 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  309 |     await page.getByText('Log Out').click();
  310 |     await expect(page.getByText(/Enter PIN/)).toBeVisible();
  311 |     await page.waitForTimeout(2000);
  312 |     await expect(page.getByText(/Enter PIN/)).toBeVisible();
  313 |   });
  314 | 
  315 |   test('TC-SET-04: Export button is present', async ({ page }) => {
  316 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  317 |     await expect(page.getByText('Export Data')).toBeVisible();
  318 |   });
  319 | 
  320 |   test('TC-SET-05: Wipe data confirmation dialog', async ({ page }) => {
  321 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  322 |     await page.getByText('Wipe All Data').click();
  323 |     await expect(page.getByText('Wipe All Data?')).toBeVisible();
  324 |   });
  325 | 
  326 |   test('TC-SET-06: Change PIN flow', async ({ page }) => {
  327 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  328 |     await page.getByText('Change PIN').click();
  329 |     await page.locator('input[type="password"]').nth(0).fill('1234');
  330 |     await page.locator('input[type="password"]').nth(1).fill('5678');
  331 |     await page.locator('input[type="password"]').nth(2).fill('5678');
  332 |     await page.getByRole('button', { name: 'Update PIN' }).click();
  333 |     await expect(page.getByText(/success/)).toBeVisible();
  334 |   });
  335 | 
  336 |   test('TC-SET-07: Biometric toggle works', async ({ page }) => {
  337 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  338 |     const toggle = page.locator('button').filter({ has: page.locator('div[class*="translate-x"]') }).first();
  339 |     await toggle.click();
  340 |     await expect(page.getByText(/enabled|disabled/)).toBeVisible();
  341 |   });
  342 | 
  343 |   test('TC-SET-08: Wipe cancels properly', async ({ page }) => {
  344 |     await addItem(page, { name: 'Keep Item', category: 'Gold', subType: 'Chain' });
  345 |     await page.locator('header button, [class*="rounded-full"] button, button[class*="C9A84C"]').first().click();
  346 |     await page.getByText('Wipe All Data').click();
  347 |     await page.getByRole('button', { name: 'Cancel' }).click();
  348 |     await page.getByRole('button', { name: 'Back' }).first().click();
  349 |     await expect(page.getByText('Keep Item')).toBeVisible();
  350 |   });
  351 | });
  352 | 
  353 | test.describe('vlocker - Edge Cases', () => {
  354 |   test.beforeEach(async ({ page }) => {
  355 |     await page.goto(BASE_URL);
  356 |     await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  357 |     await page.reload();
  358 |     await setupPin(page, '1234');
  359 |     await page.getByRole('button', { name: /Locker|started/i }).click();
  360 |   });
  361 | 
  362 |   test('TC-EDGE-01: Special characters in name', async ({ page }) => {
  363 |     await addItem(page, { name: 'Gold Chain #123', category: 'Gold', subType: 'Chain' });
  364 |     await expect(page.getByText('Gold Chain #123')).toBeVisible();
  365 |   });
  366 | 
  367 |   test('TC-EDGE-02: Zero weight value', async ({ page }) => {
  368 |     await addItem(page, { name: 'Zero Weight', category: 'Gold', subType: 'Chain', weight: '0', unit: 'g' });
  369 |     await expect(page.getByText('Zero Weight')).toBeVisible();
  370 |   });
  371 | 
  372 |   test('TC-EDGE-03: Decimal weight value', async ({ page }) => {
  373 |     await addItem(page, { name: 'Decimal Weight', category: 'Gold', subType: 'Chain', weight: '15.75', unit: 'g' });
  374 |     await expect(page.getByText('Decimal Weight')).toBeVisible();
  375 |   });
  376 | 
  377 |   test('TC-EDGE-04: Multiple items', async ({ page }) => {
  378 |     for (let i = 1; i <= 5; i++) {
  379 |       await addItem(page, { name: `Item ${i}`, category: 'Gold', subType: 'Chain' });
  380 |     }
  381 |     for (let i = 1; i <= 5; i++) {
  382 |       await expect(page.getByText(`Item ${i}`)).toBeVisible();
  383 |     }
  384 |   });
  385 | 
  386 |   test('TC-EDGE-05: Empty description is valid', async ({ page }) => {
  387 |     await addItem(page, { name: 'No Desc', category: 'Gold', subType: 'Chain' });
  388 |     await expect(page.getByText('No Desc')).toBeVisible();
  389 |   });
  390 | 
  391 |   test('TC-EDGE-06: All category types', async ({ page }) => {
```