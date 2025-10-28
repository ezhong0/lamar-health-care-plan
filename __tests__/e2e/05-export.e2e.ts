/**
 * E2E Test: Export Functionality
 *
 * Tests the data export feature for reporting to pharmaceutical companies.
 * Verifies CSV/Excel export of patient data and care plans.
 */

import { test, expect } from '@playwright/test';
import { createPatientViaUI, createTestPatient } from './helpers/test-data';
import { mockExportAPI, setupCommonMocks } from './fixtures/api-mocks';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
  });

  test('should export patient data via API endpoint', async ({ page }) => {
    // Create a test patient first to ensure we have data
    const patient = createTestPatient({ mrn: '700001' });
    await createPatientViaUI(page, patient);

    // Navigate to the export API endpoint and capture response
    const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/export'));
    await page.goto('/api/export');
    const response = await responsePromise;

    // Get the response body
    const content = await response.text();

    // Verify CSV headers are present
    expect(content).toContain('firstName');
    expect(content).toContain('lastName');
    expect(content).toContain('mrn');

    // Verify content is not empty
    expect(content.length).toBeGreaterThan(50);
  });

  test('should export data with correct CSV format and headers', async ({ page }) => {
    // Navigate and capture the response
    const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/export'));
    await page.goto('/api/export');
    const response = await responsePromise;

    // Should be CSV content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/csv|text/i);

    // Get content
    const content = await response.text();

    // Should contain CSV headers
    expect(content).toContain('firstName');
    expect(content).toContain('lastName');
    expect(content).toContain('mrn');

    // Should have at least header row
    const lines = content.split('\n').filter((line) => line.trim());
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });

  test('should include patient data in export', async ({ page }) => {
    // Create a test patient
    const patient = createTestPatient({ mrn: '700004' });
    await createPatientViaUI(page, patient);

    const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/export'));
    await page.goto('/api/export');
    const response = await responsePromise;

    const content = await response.text();

    // Should contain the patient's MRN in the export
    expect(content).toContain(patient.mrn);
  });

  test('should export multiple patients if they exist', async ({ page }) => {
    // Create multiple test patients
    const patient1 = createTestPatient({ mrn: '700002', firstName: 'Export', lastName: 'Test1' });
    const patient2 = createTestPatient({ mrn: '700003', firstName: 'Export', lastName: 'Test2' });

    await createPatientViaUI(page, patient1);
    await createPatientViaUI(page, patient2);

    const responsePromise = page.waitForResponse((resp) => resp.url().includes('/api/export'));
    await page.goto('/api/export');
    const response = await responsePromise;

    const content = await response.text();

    // Should contain both patients
    expect(content).toContain(patient1.mrn);
    expect(content).toContain(patient2.mrn);
  });
});
