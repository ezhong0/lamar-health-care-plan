/**
 * E2E Test: Patient Creation Happy Path
 *
 * Tests the complete flow of creating a new patient successfully.
 */

import { test, expect } from '@playwright/test';

test.describe('Patient Creation - Happy Path', () => {
  test('should create a new patient with valid data', async ({ page }) => {
    // Navigate to new patient form
    await page.goto('/patients/new');

    // Verify form loads
    await expect(page.getByRole('heading', { name: 'Patient Information' })).toBeVisible();

    // Fill in patient information
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Doe');
    await page.getByLabel('Medical Record Number (MRN)').fill('123456');

    // Fill in provider information
    await page.getByLabel('Referring Provider Name').fill('Dr. Sarah Mitchell');
    await page.getByLabel('Provider NPI').fill('1234567893');

    // Fill in medication & diagnosis
    await page.getByLabel('Medication Name').fill('IVIG');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('G70.00');

    // Fill in patient records
    await page.getByLabel('Clinical Notes').fill(
      'Patient has history of myasthenia gravis. Recent exacerbation requiring IVIG therapy.'
    );

    // Submit form
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Should show loading state
    await expect(page.getByRole('button', { name: 'Creating...' })).toBeVisible();

    // Should redirect to patient detail page
    await expect(page).toHaveURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Should show patient name
    await expect(page.getByText('John Doe')).toBeVisible();

    // Should show MRN
    await expect(page.getByText('123456')).toBeVisible();
  });

  test('should navigate to patients list and see newly created patient', async ({ page }) => {
    // Create a patient first
    await page.goto('/patients/new');
    await page.getByLabel('First Name').fill('Alice');
    await page.getByLabel('Last Name').fill('Smith');
    await page.getByLabel('Medical Record Number (MRN)').fill('654321');
    await page.getByLabel('Referring Provider Name').fill('Dr. James Chen');
    await page.getByLabel('Provider NPI').fill('1245319599');
    await page.getByLabel('Medication Name').fill('Omalizumab');
    await page.getByLabel('Primary Diagnosis (ICD-10)').fill('J45.50');
    await page.getByLabel('Clinical Notes').fill('Severe asthma patient.');
    await page.getByRole('button', { name: 'Create Patient' }).click();

    // Wait for redirect
    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

    // Navigate to patients list
    await page.goto('/patients');

    // Should see the patient in the list
    await expect(page.getByText('Alice Smith')).toBeVisible();
    await expect(page.getByText('654321')).toBeVisible();
  });
});
