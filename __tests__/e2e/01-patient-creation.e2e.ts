/**
 * E2E Test: Patient Creation Happy Path
 *
 * Tests the complete flow of creating a new patient successfully.
 */

import { test, expect } from '@playwright/test';
import { createTestPatient, fillPatientForm, createPatientViaUI } from './helpers/test-data';
import { setupCommonMocks } from './fixtures/api-mocks';

test.describe('Patient Creation - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks to avoid external dependencies
    await setupCommonMocks(page);
  });

  test('should create a new patient with valid data', async ({ page }) => {
    // Generate unique test patient
    const patient = createTestPatient({
      firstName: 'John',
      lastName: 'Doe',
      clinicalNotes: 'Patient has history of myasthenia gravis. Recent exacerbation requiring IVIG therapy.',
    });

    // Navigate to new patient form and wait for hydration
    await page.goto('/patients/new');
    await page.waitForLoadState('networkidle');

    // Verify form loads
    await expect(page.getByRole('heading', { name: 'Patient Information' })).toBeVisible();

    // Fill in form using helper
    await fillPatientForm(page, patient);

    // Submit form
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Wait for either navigation to patient page OR warnings page
    await Promise.race([
      page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 8000 }),
      page.waitForSelector('text=/Review Warnings/i', { timeout: 8000 })
    ]).catch(() => {}); // One will succeed

    // Check if we're on warnings page
    const currentUrl = page.url();
    if (currentUrl.includes('/patients/new')) {
      // Still on new patient page - must be showing warnings
      const proceedButton = page.getByRole('button', { name: /Proceed Anyway/i });
      await proceedButton.click();
      await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
    }

    // Verify we're on patient detail page
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/);

    // Should show patient name in heading
    await expect(page.getByRole('heading', { name: `${patient.firstName} ${patient.lastName}` })).toBeVisible();

    // Should show MRN
    await expect(page.getByText(`MRN: ${patient.mrn}`)).toBeVisible();
  });

  test('should navigate to patients list and see newly created patient', async ({ page }) => {
    // Create patient using helper - use auto-generated unique NPI to avoid conflicts
    const patient = createTestPatient({
      firstName: 'Alice',
      lastName: 'Smith',
      medicationName: 'Omalizumab',
      primaryDiagnosis: 'J45.50',
      clinicalNotes: 'Severe asthma patient.',
    });

    const patientId = await createPatientViaUI(page, patient);

    // Verify we got a valid patient ID
    expect(patientId).toBeTruthy();
    expect(patientId.length).toBeGreaterThan(0);

    // Navigate to patients list and wait for hydration
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Should see the patient in the list - use link that contains both name and MRN for uniqueness
    await expect(page.getByRole('link', { name: new RegExp(`${patient.firstName} ${patient.lastName}.*${patient.mrn}`) })).toBeVisible();
  });

  test('should show all form fields with correct labels', async ({ page }) => {
    await page.goto('/patients/new');
    await page.waitForLoadState('networkidle');

    // Verify all expected form fields are present
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Medical Record Number (MRN)')).toBeVisible();
    await expect(page.getByLabel('Referring Provider Name')).toBeVisible();
    await expect(page.getByLabel('Provider NPI')).toBeVisible();
    await expect(page.getByLabel('Medication Name')).toBeVisible();
    await expect(page.getByLabel('Primary Diagnosis (ICD-10)')).toBeVisible();
    await expect(page.getByLabel('Clinical Notes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Patient' })).toBeVisible();
  });
});
