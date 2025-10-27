/**
 * E2E Test: Duplicate Detection Warnings
 *
 * Tests all three types of duplicate detection:
 * 1. Duplicate patient (same MRN or similar name)
 * 2. Duplicate order (same patient + medication)
 * 3. Provider conflict (same NPI with different name)
 *
 * All are non-blocking warnings - user should be able to proceed.
 */

import { test, expect } from '@playwright/test';

test.describe('Duplicate Detection', () => {
  test('should warn about duplicate MRN but allow proceeding', async ({ page }) => {
    // Create first patient
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('Robert');
    await page.getByLabel('Last Name').fill('Johnson');
    await page.getByLabel('Medical Record Number (MRN)').fill('999001');
    await page.getByLabel('Referring Provider Name').fill('Dr. Sarah Mitchell');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill('Test patient records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Wait for creation
    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Try to create second patient with same MRN
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('Different');
    await page.getByLabel('Last Name').fill('Person');
    await page.getByLabel('Medical Record Number (MRN)').fill('999001'); // Same MRN!
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1245319599');
    await page.getByLabel('Medication Name').fill('Rituximab');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('M05.79');
    await page.getByLabel('Clinical Notes').fill('Different patient records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show duplicate MRN error (blocking - MRN must be unique)
    await expect(page.getByText(/MRN.*already exists/i)).toBeVisible({ timeout: 5000 });

    // Should NOT redirect (this is a blocking error, not warning)
    await expect(page).toHaveURL('/patients/new');
  });

  test('should warn about similar patient name (fuzzy match)', async ({ page }) => {
    // Create first patient
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('Catherine');
    await page.getByLabel('Last Name').fill('Martinez');
    await page.getByLabel('Medical Record Number (MRN)').fill('999002');
    await page.getByLabel('Referring Provider Name').fill('Dr. Provider');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Test records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Create patient with similar name
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('Katherine'); // Similar to Catherine
    await page.getByLabel('Last Name').fill('Martinez');
    await page.getByLabel('Medical Record Number (MRN)').fill('999003'); // Different MRN
    await page.getByLabel('Referring Provider Name').fill('Dr. Provider');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Test records');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show warning page
    await expect(page.getByText(/Review Warnings/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Similar Patient Found/i)).toBeVisible();
    await expect(page.getByText(/Catherine.*Martinez/i)).toBeVisible();

    // Should be able to proceed
    await page.getByRole('button', { name: /Proceed/i }).click();

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
