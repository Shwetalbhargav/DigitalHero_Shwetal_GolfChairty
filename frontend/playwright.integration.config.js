import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './integration',
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    headless: true,
  },
  globalSetup: './integration/setup.js',
  outputDir: './test-results/integration',
});
