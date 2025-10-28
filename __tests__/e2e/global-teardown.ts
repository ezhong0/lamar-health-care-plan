/**
 * Playwright Global Teardown
 *
 * Runs once after all tests to clean up the test environment.
 */

import { chromium, type FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after E2E tests...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Clean up test data after tests complete
    if (process.env.CLEANUP_AFTER_TESTS !== 'false') {
      try {
        const response = await page.request.delete(`${baseURL}/api/test/cleanup`);
        if (response.ok()) {
          const data = await response.json();
          console.log(`✅ Cleaned up ${data.deletedCount || 0} test patients`);
        }
      } catch (error) {
        console.warn('⚠️  Could not cleanup test data');
      }
    }

    console.log('✅ E2E test cleanup complete');
  } finally {
    await page.close();
    await browser.close();
  }
}

export default globalTeardown;
