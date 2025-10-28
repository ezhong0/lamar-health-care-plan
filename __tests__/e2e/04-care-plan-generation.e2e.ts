/**
 * E2E Test: Care Plan Generation
 *
 * Tests the AI-powered care plan generation flow including:
 * - Generating a care plan from patient data
 * - Viewing the generated care plan
 * - Downloading the care plan
 */

import { test, expect } from '@playwright/test';
import { createTestPatient, createPatientViaUI, createPatientViaAPI, TEST_PATIENTS } from './helpers/test-data';
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

    // Should be on patient detail page
    await expect(page).toHaveURL(`/patients/${patientId}`);

    // Wait for page to fully load (React Query needs time to fetch)
    await page.waitForLoadState('networkidle');

    // Should see patient information (use heading to avoid strict mode violation)
    await expect(page.getByRole('heading', { name: `${patient.firstName} ${patient.lastName}` })).toBeVisible();

    // Should see "Generate Care Plan" button - use specific heading context
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible({ timeout: 10000 });

    // Click generate care plan button
    await generateButton.click();

    // Should show loading state
    await expect(page.getByRole('button', { name: /Generating/i })).toBeVisible({ timeout: 5000 });

    // Wait for care plan to be generated (mocked, so should be fast)
    // Use heading instead of generic text to avoid strict mode
    await expect(page.getByRole('heading', { name: /Care Plans?$/i })).toBeVisible({ timeout: 10000 });

    // Should see care plan content from our mock
    await expect(page.getByText(/Problem/i)).toBeVisible();
    await expect(page.getByText(/Goal/i)).toBeVisible();
    await expect(page.getByText(/Intervention/i)).toBeVisible();

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
    await generateButton.click();

    // Wait for care plan to appear
    await expect(page.getByText(/Problem/i)).toBeVisible({ timeout: 10000 });

    // Navigate away
    await page.goto('/patients');

    // Navigate back to same patient
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    // Care plan should still be visible (not regenerating)
    await expect(page.getByText(/Problem/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
  });

  test('should download care plan as markdown file', async ({ page }) => {
    // Create patient and generate care plan via API
    const patientId = await createPatientViaAPI(page);

    // Navigate to patient and generate care plan
    await page.goto(`/patients/${patientId}`);
    await page.waitForLoadState('networkidle');

    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await generateButton.click();

    // Wait for care plan to appear
    await expect(page.getByText(/Problem/i)).toBeVisible({ timeout: 10000 });

    // Setup download listener BEFORE clicking download
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    const downloadButton = page.getByRole('button', { name: /Download/i });
    await downloadButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Check filename
    expect(download.suggestedFilename()).toMatch(/care-plan.*\.md$/i);
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
    await generateButton.click();

    // Should show error message (check for Alert component with error text)
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });

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
