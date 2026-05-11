# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vlocker.spec.ts >> vlocker - Settings >> TC-SET-02: Logout works
- Location: e2e/vlocker.spec.ts:301:3

# Error details

```
Error: Channel closed
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: /Locker|started/i })

```

```
Error: browserContext.close: Target page, context or browser has been closed
```