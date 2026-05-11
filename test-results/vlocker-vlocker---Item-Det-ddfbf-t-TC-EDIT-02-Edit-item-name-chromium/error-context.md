# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vlocker.spec.ts >> vlocker - Item Details & Edit >> TC-EDIT-02: Edit item name
- Location: e2e/vlocker.spec.ts:220:3

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
  171 |   test('TC-ADD-06: Add Other category with custom description', async ({ page }) => {
  172 |     await page.getByRole('button', { name: 'Add' }).click();
  173 |     await page.locator('input[placeholder*="Gold Chain"]').fill('Antique Watch');
  174 |     await page.getByRole('button', { name: 'Other' }).click();
  175 |     await page.locator('input[placeholder*="Antique"]').fill('Vintage Watch');
  176 |     await page.getByRole('button', { name: /Save to/ }).click();
  177 |     await expect(page.getByText('Antique Watch')).toBeVisible();
  178 |   });
  179 | 
  180 |   test('TC-ADD-07: Validation - name required', async ({ page }) => {
  181 |     await page.getByRole('button', { name: 'Add' }).click();
  182 |     await page.getByRole('button', { name: 'Gold' }).click();
  183 |     await page.getByRole('button', { name: /Save to/ }).click();
  184 |     await expect(page.getByText(/required/)).toBeVisible();
  185 |   });
  186 | 
  187 |   test('TC-ADD-08: Validation - category required', async ({ page }) => {
  188 |     await page.getByRole('button', { name: 'Add' }).click();
  189 |     await page.locator('input[placeholder*="Gold Chain"]').fill('Test Item');
  190 |     await page.getByRole('button', { name: /Save to/ }).click();
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
> 209 |     await page.getByRole('button', { name: /Locker|started/i }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 120000ms exceeded.
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
  291 |     await page.getByRole('button', { name: /Locker|started/i }).click();
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
```