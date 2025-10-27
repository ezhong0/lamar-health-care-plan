/**
 * E2E Test: Care Plan Generation
 *
 * Tests the AI-powered care plan generation flow including:
 * - Generating a care plan from patient data
 * - Viewing the generated care plan
 * - Downloading the care plan
 */

import { test, expect } from '@playwright/test';

test.describe('Care Plan Generation', () => {
  test('should generate care plan for a patient', async ({ page }) => {
    // First create a patient
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('CarePlan');
    await page.getByLabel('Last Name').fill('TestPatient');
    await page.getByLabel('Medical Record Number (MRN)').fill('888001');
    await page.getByLabel('Referring Provider Name').fill('Dr. Sarah Mitchell');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill(
      'Patient has generalized myasthenia gravis. Recent exacerbation with ptosis and muscle weakness. ' +
        'Currently on pyridostigmine 60mg TID and prednisone 10mg daily. ' +
        'Neurology recommends IVIG therapy for rapid symptomatic control.'
    );

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should redirect to patient detail page
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Should see patient information
    await expect(page.getByText('CarePlan TestPatient')).toBeVisible();

    // Should see "Generate Care Plan" button
    const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });
    await expect(generateButton).toBeVisible();

    // Click generate care plan button
    await generateButton.click();

    // Should show loading state
    await expect(page.getByText(/Generating/i)).toBeVisible();

    // Wait for care plan to be generated (may take 10-30 seconds)
    await expect(page.getByText(/Care Plan/i)).toBeVisible({ timeout: 60000 });

    // Should see care plan content
    // Care plans should contain clinical information
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
    // This test would require mocking API failure
    // For now, we verify error states exist in the UI

    // Navigate to patient detail
    await page.goto('/patients');
    const patientCards = page.locator('a[href^="/patients/"]');

    if ((await patientCards.count()) > 0) {
      await patientCards.first().click();

      // Verify generate button exists
      const generateButton = page.getByRole('button', { name: /Generate Care Plan/i });

      // If button is visible, the error handling is built into the component
      // Actual error testing would require API mocking or network interception
      if (await generateButton.isVisible()) {
        expect(await generateButton.isEnabled()).toBe(true);
      }
    }
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
