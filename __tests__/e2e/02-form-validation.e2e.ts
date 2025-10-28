/**
 * E2E Test: Form Validation
 *
 * Tests that form validation correctly blocks invalid submissions
 * and shows appropriate error messages.
 */

import { test, expect } from '@playwright/test';
import { createTestPatient, INVALID_NPIS, INVALID_ICD10_CODES } from './helpers/test-data';
import { setupCommonMocks } from './fixtures/api-mocks';

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
    await page.goto('/patients/new');
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show validation errors from Zod/React Hook Form
    // Note: React Hook Form validation happens on submit, not via HTML5 required attribute
    // Wait for error messages to appear
    await expect(page.getByText(/first name.*required/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid MRN (not 6 digits)', async ({ page }) => {
    // Use test patient with invalid MRN
    const patient = createTestPatient({ mrn: '123' }); // Too short

    await page.getByLabel('First Name').fill(patient.firstName);
    await page.getByLabel('Last Name').fill(patient.lastName);
    await page.getByLabel('Medical Record Number (MRN)').fill(patient.mrn);
    await page.getByLabel('Referring Provider Name').fill(patient.referringProvider);
    await page.getByLabel('Provider NPI').fill(patient.referringProviderNPI);
    await page.getByLabel('Medication Name').fill(patient.medicationName);
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill(patient.primaryDiagnosis);
    await page.getByLabel('Clinical Notes').fill(patient.clinicalNotes);

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show MRN validation error
    await expect(page.getByText(/MRN must be exactly 6 digits/i)).toBeVisible();
  });

  test('should show error for invalid NPI (not 10 digits)', async ({ page }) => {
    // Use test patient with invalid NPI
    const patient = createTestPatient({ referringProviderNPI: INVALID_NPIS.tooShort });

    await page.getByLabel('First Name').fill(patient.firstName);
    await page.getByLabel('Last Name').fill(patient.lastName);
    await page.getByLabel('Medical Record Number (MRN)').fill(patient.mrn);
    await page.getByLabel('Referring Provider Name').fill(patient.referringProvider);
    await page.getByLabel('Provider NPI').fill(patient.referringProviderNPI);
    await page.getByLabel('Medication Name').fill(patient.medicationName);
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill(patient.primaryDiagnosis);
    await page.getByLabel('Clinical Notes').fill(patient.clinicalNotes);

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show NPI validation error
    await expect(page.getByText(/NPI must be exactly 10 digits/i)).toBeVisible();
  });

  test('should show error for invalid NPI checksum (Luhn algorithm)', async ({ page }) => {
    // Use test patient with NPI that has invalid Luhn checksum
    const patient = createTestPatient({ referringProviderNPI: INVALID_NPIS.invalidChecksum });

    await page.getByLabel('First Name').fill(patient.firstName);
    await page.getByLabel('Last Name').fill(patient.lastName);
    await page.getByLabel('Medical Record Number (MRN)').fill(patient.mrn);
    await page.getByLabel('Referring Provider Name').fill(patient.referringProvider);
    await page.getByLabel('Provider NPI').fill(patient.referringProviderNPI);
    await page.getByLabel('Medication Name').fill(patient.medicationName);
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill(patient.primaryDiagnosis);
    await page.getByLabel('Clinical Notes').fill(patient.clinicalNotes);

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show NPI validation error
    await expect(page.getByText(/NPI check digit is invalid/i)).toBeVisible();
  });

  test('should show error for invalid ICD-10 format', async ({ page }) => {
    // Use test patient with invalid ICD-10 code
    const patient = createTestPatient({ primaryDiagnosis: INVALID_ICD10_CODES.invalidFormat });

    await page.getByLabel('First Name').fill(patient.firstName);
    await page.getByLabel('Last Name').fill(patient.lastName);
    await page.getByLabel('Medical Record Number (MRN)').fill(patient.mrn);
    await page.getByLabel('Referring Provider Name').fill(patient.referringProvider);
    await page.getByLabel('Provider NPI').fill(patient.referringProviderNPI);
    await page.getByLabel('Medication Name').fill(patient.medicationName);
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill(patient.primaryDiagnosis);
    await page.getByLabel('Clinical Notes').fill(patient.clinicalNotes);

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show ICD-10 validation error
    await expect(page.getByText(/Invalid ICD-10 code format/i)).toBeVisible();
  });

  test('should clear errors when fields are corrected', async ({ page }) => {
    // Enter invalid MRN
    await page.getByLabel('Medical Record Number (MRN)').fill('123');
    await page.getByLabel('First Name').click(); // Blur the field

    // Might show error (depends on implementation)

    // Correct the MRN
    await page.getByLabel('Medical Record Number (MRN)').clear();
    await page.getByLabel('Medical Record Number (MRN)').fill('123456');
    await page.getByLabel('First Name').click(); // Blur the field

    // Error should be cleared or not shown
    await expect(page.getByText(/MRN must be exactly 6 digits/i)).not.toBeVisible();
  });
});
