/**
 * E2E Test: Form Validation
 *
 * Tests that form validation correctly blocks invalid submissions
 * and shows appropriate error messages.
 */

import { test, expect } from '@playwright/test';

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients/new');
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show validation errors (HTML5 validation or Zod errors)
    // First name required
    const firstNameInput = page.getByLabel('First Name');
    await expect(firstNameInput).toHaveAttribute('required');

    // Check if browser validation or custom validation kicks in
    const isValid = await firstNameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should show error for invalid MRN (not 6 digits)', async ({ page }) => {
    // Fill form with invalid MRN
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Patient');
    await page.getByLabel('Medical Record Number (MRN)').fill('123'); // Too short
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill('Test notes');

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show MRN validation error
    await expect(page.getByText(/MRN must be exactly 6 digits/i)).toBeVisible();
  });

  test('should show error for invalid NPI (not 10 digits)', async ({ page }) => {
    // Fill form with invalid NPI
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Patient');
    await page.getByLabel('Medical Record Number (MRN)').fill('123456');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('123'); // Too short
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill('Test notes');

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show NPI validation error
    await expect(page.getByText(/NPI must be exactly 10 digits/i)).toBeVisible();
  });

  test('should show error for invalid NPI checksum (Luhn algorithm)', async ({ page }) => {
    // Fill form with NPI that has invalid Luhn checksum
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Patient');
    await page.getByLabel('Medical Record Number (MRN)').fill('123456');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567890'); // Invalid Luhn checksum
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');
    await page.getByLabel('Clinical Notes').fill('Test notes');

    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show NPI validation error
    await expect(page.getByText(/NPI checksum is invalid/i)).toBeVisible();
  });

  test('should show error for invalid ICD-10 format', async ({ page }) => {
    // Fill form with invalid ICD-10 code
    await page.getByLabel('First Name').fill('Test');
    await page.getByLabel('Last Name').fill('Patient');
    await page.getByLabel('Medical Record Number (MRN)').fill('123456');
    await page.getByLabel('Referring Provider Name').fill('Dr. Test');
    await page.getByLabel('Provider NPI').fill('1234567893');
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('INVALID'); // Invalid format
    await page.getByLabel('Clinical Notes').fill('Test notes');

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
