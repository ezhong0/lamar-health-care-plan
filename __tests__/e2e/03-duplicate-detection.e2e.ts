/**
 * E2E Test: Duplicate Detection Warnings
 *
 * Tests all three types of duplicate detection:
 * 1. Duplicate MRN (BLOCKING - prevents creation)
 * 2. Similar patient name (WARNING - allows proceeding)
 * 3. Duplicate order (WARNING - same patient + medication)
 * 4. Provider conflict (WARNING - same NPI with different name)
 */

import { test, expect } from '@playwright/test';
import { createTestPatient, fillPatientForm, createPatientViaUI } from './helpers/test-data';
import { setupCommonMocks } from './fixtures/api-mocks';

test.describe('Duplicate Detection', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
  });

  test('should block duplicate MRN (blocking error)', async ({ page }) => {
    // Create first patient with unique MRN
    const firstPatient = createTestPatient({
      firstName: 'Robert',
      lastName: 'Johnson',
      mrn: '800001', // Use specific MRN for this test
    });

    await createPatientViaUI(page, firstPatient);

    // Try to create second patient with SAME MRN (should fail)
    const secondPatient = createTestPatient({
      firstName: 'Different',
      lastName: 'Person',
      mrn: firstPatient.mrn, // Same MRN - should be blocked!
      medicationName: 'Rituximab',
      primaryDiagnosis: 'M05.79',
      referringProviderNPI: '1245319599',
    });

    await page.goto('/patients/new');
    await fillPatientForm(page, secondPatient);
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show duplicate MRN error (blocking - MRN must be unique)
    await expect(page.getByText(/MRN.*already exists/i)).toBeVisible({ timeout: 5000 });

    // Should NOT redirect (this is a blocking error, not warning)
    await expect(page).toHaveURL('/patients/new');
  });

  test('should warn about similar patient name (fuzzy match)', async ({ page }) => {
    // Create first patient
    const firstPatient = createTestPatient({
      firstName: 'Catherine',
      lastName: 'Martinez',
      mrn: '800002',
    });

    await createPatientViaUI(page, firstPatient);

    // Create patient with similar name but different MRN
    const similarPatient = createTestPatient({
      firstName: 'Katherine', // Similar to Catherine
      lastName: 'Martinez',
      mrn: '800003', // Different MRN
    });

    await page.goto('/patients/new');
    await fillPatientForm(page, similarPatient);
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show warning page
    await expect(page.getByText(/Review Warnings/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Similar Patient Found/i)).toBeVisible();
    await expect(page.getByText(/Catherine.*Martinez/i)).toBeVisible();

    // Should be able to proceed
    await page.getByRole('button', { name: /Proceed Anyway/i }).click();

    // Should redirect to patient detail page
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
  });

  test('should warn about duplicate order (same patient + medication)', async ({ page }) => {
    // This test depends on backend duplicate order detection
    // Create first patient with order
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('TestDuplicate');
    await page.getByLabel('Last Name').fill('OrderPatient');
    await page.getByLabel('Medical Record Number (MRN)').fill('999004');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('First order');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Try to create another patient with very similar name + same medication
    // This should trigger both similar patient and duplicate order warnings
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('TestDuplicate');
    await page.getByLabel('Last Name').fill('OrderPatient');
    await page.getByLabel('Medical Record Number (MRN)').fill('999005'); // Different MRN
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG'); // Same medication
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Second order');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show warnings (might be multiple)
    await expect(page.getByText(/Review Warnings/i)).toBeVisible({ timeout: 5000 });

    // Check for duplicate order or similar patient warning
    const hasWarning =
      (await page.getByText(/Duplicate Order/i).isVisible()) ||
      (await page.getByText(/Similar Patient/i).isVisible());
    expect(hasWarning).toBe(true);

    // Can proceed
    await page.getByRole('button', { name: /Proceed/i }).click();
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
  });

  test('should warn about provider conflict (same NPI, different name)', async ({ page }) => {
    // Create first patient with provider A
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('PatientOne');
    await page.getByLabel('Last Name').fill('ForProviderTest');
    await page.getByLabel('Medical Record Number (MRN)').fill('999006');
    await page.getByLabel('Referring Provider Name').fill('Dr. Shared Provider');
    await page.getByLabel('Provider NPI').fill('1245319599');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Create second patient with SAME NPI but DIFFERENT name
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('PatientTwo');
    await page.getByLabel('Last Name').fill('ForProviderTest');
    await page.getByLabel('Medical Record Number (MRN)').fill('999007');
    await page.getByLabel('Referring Provider Name').fill('Dr. Different Provider'); // Different name!
    await page.getByLabel('Provider NPI').fill('1245319599'); // Same NPI!
    await page.getByLabel('Medication Name').fill('Prednisone');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill('Records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show provider conflict warning
    await expect(page.getByText(/Review Warnings/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Provider.*Mismatch/i)).toBeVisible();
    await expect(page.getByText(/1245319599/)).toBeVisible(); // Should show NPI
    await expect(page.getByText(/Dr. Shared Provider/i)).toBeVisible(); // Expected name
    await expect(page.getByText(/Dr. Different Provider/i)).toBeVisible(); // Actual name

    // Can proceed anyway
    await page.getByRole('button', { name: /Proceed/i }).click();
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
  });

  test('should be able to cancel from warning page', async ({ page }) => {
    // Create a patient that will trigger a warning
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('TestWarning');
    await page.getByLabel('Last Name').fill('CancelTest');
    await page.getByLabel('Medical Record Number (MRN)').fill('999008');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('First');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Create similar patient
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('TestWarning');
    await page.getByLabel('Last Name').fill('CancelTest');
    await page.getByLabel('Medical Record Number (MRN)').fill('999009');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Second');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show warnings
    await expect(page.getByText(/Review Warnings/i)).toBeVisible({ timeout: 5000 });

    // Click cancel - note: cancel now also navigates to patient detail since creation succeeded
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Should navigate to patient detail page (patient was created)
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
  });
});
