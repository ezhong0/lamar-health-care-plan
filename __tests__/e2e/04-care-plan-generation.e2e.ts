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
    // Navigate to a patient with existing care plan
    // (Assuming from previous test or seed data)
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Click on a patient - use href selector since PatientCard doesn't have data-testid
    const patientCards = page.locator('a[href^="/patients/"]');
    if ((await patientCards.count()) > 0) {
      await patientCards.first().click();

      // Wait for navigation to patient detail page
      await page.waitForURL(/\/patients\/[a-z0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Check if generate button OR care plan heading exists
      const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
      const carePlanHeading = page.getByRole('heading', { name: /Care Plans?$/i });

      // Wait for either to appear (one must be visible)
      await Promise.race([
        generateButton.waitFor({ state: 'visible', timeout: 10000 }),
        carePlanHeading.waitFor({ state: 'visible', timeout: 10000 }),
      ]);

      // Check which one is visible
      const hasCarePlan = await carePlanHeading.isVisible();

      if (hasCarePlan) {
        // Should see care plan section heading
        await expect(carePlanHeading).toBeVisible();

        // Should see download button
        await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
      } else {
        // Should see generate button if no care plan
        await expect(generateButton).toBeVisible();
      }
    }
  });

  test('should download care plan as markdown file', async ({ page }) => {
    // Navigate to patient with care plan
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Find first patient and navigate
    const patientCards = page.locator('a[href^="/patients/"]');
    if ((await patientCards.count()) > 0) {
      await patientCards.first().click();

      // Wait for navigation to complete
      await page.waitForURL(/\/patients\/[a-z0-9-]+/);
      await page.waitForLoadState('networkidle');

      // Check if care plan heading exists (more specific than text search)
      const carePlanHeading = page.getByRole('heading', { name: /Care Plans?$/i });
      const hasCarePlan = await carePlanHeading.isVisible().catch(() => false);

      if (!hasCarePlan) {
        // Generate one first
        const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
        if (await generateButton.isVisible()) {
          await generateButton.click();
          // Wait for care plan to be generated
          await expect(carePlanHeading).toBeVisible({ timeout: 60000 });
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
    await page.waitForLoadState('networkidle');

    // Try to generate care plan
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible({ timeout: 10000 });
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
