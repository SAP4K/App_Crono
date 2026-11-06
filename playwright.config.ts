import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8091',
    // Avoid Metro's costly bundle compression on loopback during functional tests.
    extraHTTPHeaders: { 'Accept-Encoding': 'identity' },
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    defaultBrowserType: 'chromium',
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run web -- --port 8091',
    url: 'http://localhost:8091',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
