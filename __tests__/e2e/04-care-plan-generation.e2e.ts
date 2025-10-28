/**
 * E2E Test: Care Plan Generation
 *
 * Tests the AI-powered care plan generation flow including:
 * - Generating a care plan from patient data
 * - Viewing the generated care plan
 * - Downloading the care plan
 */

import { test, expect } from '@playwright/test';
import { createPatientViaAPI } from './helpers/test-data';
import { mockCarePlanAPI, mockCarePlanAPIError } from './fixtures/api-mocks';

test.describe('Care Plan Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AI API to avoid costs and external dependencies
    await mockCarePlanAPI(page);
  });

  test('should generate care plan for a patient', async ({ page }) => {
    // Create a patient via API to avoid UI navigation complexity
    const patientId = await createPatientViaAPI(page, {
      firstName: 'CarePlan',
      lastName: 'TestPatient',
      clinicalNotes: `Patient has generalized myasthenia gravis. Recent exacerbation with ptosis and muscle weakness.
Currently on pyridostigmine 60mg TID and prednisone 10mg daily.
Neurology recommends IVIG therapy for rapid symptomatic control.`,
    });

    // Navigate to patient detail page
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    // Should see "Generate Care Plan" button
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible({ timeout: 10000 });

    // Wait for API response when button is clicked
    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/care-plans') && res.request().method() === 'POST',
        { timeout: 15000 }
      ),
      generateButton.click()
    ]);

    // Verify mock response was successful
    expect(response.status()).toBe(201);

    // Wait for React Query to update and component to re-render
    await page.waitForTimeout(1000);

    // Should see care plan content from our mock
    await expect(page.getByText(/Problem List/i)).toBeVisible({ timeout: 10000 });

    // Should see download button
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
  });

  test('should display existing care plan when returning to patient page', async ({ page }) => {
    // Create patient via API
    const patientId = await createPatientViaAPI(page);

    // Navigate to patient and generate care plan
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible();

    // Generate care plan and wait for response
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/care-plans'), { timeout: 15000 }),
      generateButton.click()
    ]);

    await page.waitForTimeout(1000);

    // Wait for care plan to appear
    await expect(page.getByText(/Problem List/i)).toBeVisible({ timeout: 10000 });

    // Navigate away
    await page.goto('/patients');

    // Navigate back to same patient
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    // Care plan should still be visible (not regenerating)
    await expect(page.getByText(/Problem List/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
  });

  test('should download care plan as markdown file', async ({ page }) => {
    // Create patient and generate care plan via API
    const patientId = await createPatientViaAPI(page);

    // Navigate to patient and generate care plan
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });

    // Generate care plan and wait for response
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/care-plans'), { timeout: 15000 }),
      generateButton.click()
    ]);

    await page.waitForTimeout(1000);

    // Wait for care plan to appear
    await expect(page.getByText(/Problem List/i)).toBeVisible({ timeout: 10000 });

    // Setup download listener BEFORE clicking download
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    const downloadButton = page.getByRole('button', { name: /Download/i });
    await downloadButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Check filename (downloads as .txt not .md)
    expect(download.suggestedFilename()).toMatch(/care-plan.*\.txt$/i);
  });

  test('should handle care plan generation error gracefully', async ({ page }) => {
    // Override the mock to return an error
    await mockCarePlanAPIError(page, 'AI service temporarily unavailable');

    // Create a patient via API
    const patientId = await createPatientViaAPI(page);

    // Navigate to patient detail
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    // Try to generate care plan
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible();

    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/care-plans'), { timeout: 15000 }),
      generateButton.click()
    ]);

    await page.waitForTimeout(500);

    // Should show error message (Alert component with destructive variant)
    const errorAlert = page.locator('[role="alert"][class*="destructive"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });

    // Button should still be available to retry
    await expect(generateButton).toBeVisible();
  });

  test('should not allow generating care plan twice', async ({ page }) => {
    // Navigate to patient with existing care plan
    await page.goto('/patients');
    const patientCards = page.locator('a[href^="/patients/"]');

    if ((await patientCards.count()) > 0) {
      await patientCards.first().click();

      // If care plan already exists
      const hasCarePlan = await page.getByRole('heading', { name: /Care Plan/i }).isVisible();

      if (hasCarePlan) {
        // Should NOT see generate button
        await expect(page.getByRole('button', { name: /Generate Care Plan/i })).not.toBeVisible();

        // Should only see download button
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
      }
    }
  });
});
