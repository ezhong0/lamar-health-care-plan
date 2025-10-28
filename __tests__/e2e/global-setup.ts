/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment.
 */

import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 Starting E2E test environment setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server...');
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        const response = await page.goto(baseURL, { timeout: 5000 });
        if (response && response.ok()) {
          console.log('✅ Dev server is ready');
          break;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Dev server did not start in time');
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Clean up any existing test data
    if (process.env.CLEANUP_BEFORE_TESTS !== 'false') {
      console.log('🧹 Cleaning up test data...');
      try {
        const response = await page.request.delete(`${baseURL}/api/test/cleanup`);
        if (response.ok()) {
          const data = await response.json();
          console.log(`✅ Cleaned up ${data.deletedCount || 0} test patients`);
        }
      } catch (error) {
        console.warn('⚠️  Could not cleanup test data (this is okay for first run)');
      }
    }

    console.log('✅ E2E test environment ready');
  } finally {
    await page.close();
    await browser.close();
  }
}

export default globalSetup;
