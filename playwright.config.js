import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:5187',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Build inside the test environment so Vite does not reuse a dist bundle
    // produced with a developer's local Supabase credentials.
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: !process.env.CI,
    env: {
      // Browser smoke tests must not reuse personal Supabase credentials or mutate hosted auth state.
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    },
    timeout: 180_000,
  },
});
