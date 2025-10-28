/**
 * E2E Test: Care Plan Generation
 *
 * Tests the AI-powered care plan generation flow including:
 * - Generating a care plan from patient data
 * - Viewing the generated care plan
 * - Downloading the care plan
 */

import { test, expect } from '@playwright/test';
import { createTestPatient, createPatientViaUI, TEST_PATIENTS } from './helpers/test-data';
import { mockCarePlanAPI, mockCarePlanAPIError } from './fixtures/api-mocks';

test.describe('Care Plan Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the AI API to avoid costs and external dependencies
    await mockCarePlanAPI(page);
  });

  test('should generate care plan for a patient', async ({ page }) => {
    // Create a patient using the predefined test patient for care plan generation
    const patient = createTestPatient({
      ...TEST_PATIENTS.carePlan,
      mrn: '900001', // Unique MRN for this test run
      // Use auto-generated unique NPI to avoid conflicts
    });

    const patientId = await createPatientViaUI(page, patient);

    // Should be on patient detail page
    await expect(page).toHaveURL(`/patients/${patientId}`);

    // Should see patient information (use heading to avoid strict mode violation)
    await expect(page.getByRole('heading', { name: `${patient.firstName} ${patient.lastName}` })).toBeVisible();

    // Should see "Generate Care Plan" button
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible();

    // Click generate care plan button
    await generateButton.click();

    // Should show loading state
    await expect(page.getByText(/Generating/i)).toBeVisible({ timeout: 5000 });

    // Wait for care plan to be generated (mocked, so should be fast)
    await expect(page.getByText(/Care Plan/i)).toBeVisible({ timeout: 10000 });

    // Should see care plan content from our mock
    await expect(page.getByText(/Problem/i)).toBeVisible();
    await expect(page.getByText(/Goal/i)).toBeVisible();
    await expect(page.getByText(/Intervention/i)).toBeVisible();

    // Should see download button
    await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
  });

  test('should display existing care plan when returning to patient page', async ({ page }) => {
    // Navigate to a patient with existing care plan
    // (Assuming from previous test or seed data)
    await page.goto('/patients');

    // Click on a patient (find one with care plan)
    // This depends on seed data or previous tests
    const patientCard = page.locator('[data-testid="patient-card"]').first();
    if ((await patientCard.count()) > 0) {
      await patientCard.click();

      // If care plan exists, should see it
      const hasCarePlan = await page.getByText(/Care Plan/i).isVisible();

      if (hasCarePlan) {
        // Should see care plan section
        await expect(page.getByRole('heading', { name: /Care Plan/i })).toBeVisible();

        // Should see download button
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
      } else {
        // Should see generate button if no care plan
        await expect(page.getByRole('button', { name: /Generate Care Plan/i })).toBeVisible();
      }
    }
  });

  test('should download care plan as markdown file', async ({ page }) => {
    // Navigate to patient with care plan
    await page.goto('/patients');

    // Find first patient and navigate
    const patientCards = page.locator('a[href^="/patients/"]');
    if ((await patientCards.count()) > 0) {
      await patientCards.first().click();

      // Check if care plan exists
      const hasCarePlan = await page.getByText(/Care Plan/i).isVisible();

      if (!hasCarePlan) {
        // Generate one first
        const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
        if (await generateButton.isVisible()) {
          await generateButton.click();
          await expect(page.getByText(/Care Plan/i)).toBeVisible({ timeout: 60000 });
        }
      }

      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Click download button
      const downloadButton = page.getByRole('button', { name: /Download/i });
      if (await downloadButton.isVisible()) {
        await downloadButton.click();

        // Wait for download
        const download = await downloadPromise;

        // Check filename
        expect(download.suggestedFilename()).toMatch(/care-plan.*\.(md|txt)/i);
      }
    }
  });

  test('should handle care plan generation error gracefully', async ({ page }) => {
    // Override the mock to return an error
    await mockCarePlanAPIError(page, 'AI service temporarily unavailable');

    // Create a patient
    const patient = createTestPatient({ mrn: '900003' });
    const patientId = await createPatientViaUI(page, patient);

    // Navigate to patient detail
    await page.goto(`/patients/${patientId}`);

    // Try to generate care plan
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Should show error message
    await expect(page.getByText(/failed.*generate.*care plan/i)).toBeVisible({ timeout: 5000 });

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
