import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the ported Pynwheel Connect UI.
 *
 * They drive the demo screens directly, without a Rails session: the screens
 * are backed by the demo slice, so everything they exercise — tabs, modals,
 * filters, toggles, plotting — is real application behaviour.
 *
 * Uses the locally installed Chrome so CI does not have to download a browser.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 960 } } }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://127.0.0.1:3001/api/health',
        reuseExistingServer: true,
        timeout: 120_000
      }
});
