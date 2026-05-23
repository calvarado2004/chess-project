import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL || 'http://127.0.0.1:5173/';

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 10_000,
      },
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    channel: 'chrome',
  },
});
