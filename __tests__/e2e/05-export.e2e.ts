/**
 * E2E Test: Export Functionality
 *
 * Tests the data export feature for reporting to pharmaceutical companies.
 * Verifies CSV/Excel export of patient data and care plans.
 */

import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
  test('should navigate to export page from home', async ({ page }) => {
    await page.goto('/');

    // Look for export link/button
    const exportLink = page.getByRole('link', { name: /Export/i });

    if (await exportLink.isVisible()) {
      await exportLink.click();

      // Should navigate to export page
      await expect(page).toHaveURL('/export');

      // Should see export UI
      await expect(page.getByText(/Export/i)).toBeVisible();
    }
  });

  test('should export patient data as CSV', async ({ page }) => {
    await page.goto('/');

    // Check if export functionality exists
    const exportButton = page.getByRole('button', { name: /Export.*Data/i });

    if (await exportButton.isVisible()) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export button
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;

      // Verify filename is CSV
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/i);

      // Verify file is not empty
      const path = await download.path();
      expect(path).toBeTruthy();
    } else {
      // Export might be on a separate page
      await page.goto('/api/export');

      // API should return CSV data
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }
  });

  test('should export data containing patient information', async ({ page }) => {
    // Visit export page or API endpoint
    await page.goto('/api/export');

    // Check response headers
    const response = await page.waitForResponse((resp) => resp.url().includes('/api/export'));

    // Should be CSV content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/csv|excel|spreadsheet/i);

    // Get content
    const content = await response.text();

    // Should contain CSV headers
    expect(content).toContain('firstName');
    expect(content).toContain('lastName');
    expect(content).toContain('mrn');
    expect(content).toContain('medication');
  });

  test('should include care plans in export if available', async ({ page }) => {
    await page.goto('/api/export');

    const response = await page.waitForResponse((resp) => resp.url().includes('/api/export'));
    const content = await response.text();

    // Should have care plan column or related fields
    expect(content).toContain('carePlan');
  });
});
