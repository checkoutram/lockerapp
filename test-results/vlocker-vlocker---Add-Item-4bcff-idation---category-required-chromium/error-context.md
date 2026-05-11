# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vlocker.spec.ts >> vlocker - Add Items >> TC-ADD-08: Validation - category required
- Location: e2e/vlocker.spec.ts:187:3

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: /Save to/ })
    - locator resolved to <button disabled code-path="src/screens/AddItemScreen.tsx:613:9" class="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] bg-[#111D2E] text-[#8A94A6] border border-[#1A3A5C]">Save to vlocker</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    138 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

```
Error: browserContext.close: Target page, context or browser has been closed
```