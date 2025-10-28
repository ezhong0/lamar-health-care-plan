import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Tests the complete user flows end-to-end including:
 * - Patient creation with validation
 * - Duplicate detection warnings
 * - Care plan generation
 * - Export functionality
 */

export default defineConfig({
  testDir: '../__tests__/e2e',
  testMatch: '**/*.e2e.ts',
  testIgnore: ['**/helpers/**', '**/fixtures/**'],
  fullyParallel: false, // Run sequentially to avoid database conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database race conditions
  reporter: [
    ['html', { open: 'on-failure' }], // Auto-open browser on test failures
    ['list'] // Also show progress in terminal
  ],

  // Global setup and teardown
  globalSetup: require.resolve('../__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('../__tests__/e2e/global-teardown.ts'),

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Add extra time for AI operations and database queries
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Don't wait for console logs to be clear (Next.js always has some)
    stderr: 'pipe',
    stdout: 'pipe',
  },
});
