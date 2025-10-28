/**
 * E2E Test: Export Functionality
 *
 * Tests the data export feature for reporting to pharmaceutical companies.
 * Verifies CSV/Excel export of patient data and care plans.
 */

import { test, expect } from '@playwright/test';
import { createPatientViaUI, createPatientViaAPI, createTestPatient } from './helpers/test-data';
import { mockExportAPI, setupCommonMocks } from './fixtures/api-mocks';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
  });

  test('should export patient data via API endpoint', async ({ page }) => {
    // Create a test patient first to ensure we have data
    const patient = createTestPatient({ mrn: '700001' });
    await createPatientViaUI(page, patient);

    // Use page.request to fetch the export directly (avoids download dialog)
    const response = await page.request.get('/api/export');

    // Get the response body
    const content = await response.text();

    // Verify CSV headers are present (title case)
    expect(content).toContain('First Name');
    expect(content).toContain('Last Name');
    expect(content).toContain('MRN');

    // Verify content is not empty
    expect(content.length).toBeGreaterThan(50);
  });

  test('should export data with correct CSV format and headers', async ({ page }) => {
    // Use page.request to fetch the export directly
    const response = await page.request.get('/api/export');

    // Should be CSV content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/csv|text/i);

    // Get content
    const content = await response.text();

    // Should contain CSV headers (title case)
    expect(content).toContain('First Name');
    expect(content).toContain('Last Name');
    expect(content).toContain('MRN');

    // Should have at least header row
    const lines = content.split('\n').filter((line) => line.trim());
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  test('should include patient data in export', async ({ page }) => {
    // Create a test patient via API
    const patient = createTestPatient();
    await createPatientViaAPI(page, patient);

    // Use page.request to fetch the export
    const response = await page.request.get('http://localhost:3000/api/export');
    expect(response.ok()).toBeTruthy();
    const content = await response.text();

    // Should contain the patient's MRN in the export
    expect(content).toContain(patient.mrn);
  });

  test('should export multiple patients if they exist', async ({ page }) => {
    // Create multiple test patients via API
    const patient1 = createTestPatient({ firstName: 'Export', lastName: 'Test1' });
    const patient2 = createTestPatient({ firstName: 'Export', lastName: 'Test2' });

    await createPatientViaAPI(page, patient1);
    await createPatientViaAPI(page, patient2);

    // Use page.request to fetch the export
    const response = await page.request.get('http://localhost:3000/api/export');
    expect(response.ok()).toBeTruthy();
    const content = await response.text();

    // Should contain both patients
    expect(content).toContain(patient1.mrn);
    expect(content).toContain(patient2.mrn);
  });
});
