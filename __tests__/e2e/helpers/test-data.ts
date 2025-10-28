/**
 * E2E Test Data Helpers
 *
 * Provides utilities for creating and managing test data across E2E tests.
 */

import type { Page } from '@playwright/test';

/**
 * Patient test data factory
 * Generates unique test patients to avoid MRN collisions
 */
export function createTestPatient(overrides: Partial<TestPatientData> = {}): TestPatientData {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const uniqueId = `${timestamp}${random}`.slice(-6); // Last 6 digits for MRN

  return {
    firstName: 'Test',
    lastName: `Patient${random}`,
    mrn: uniqueId,
    referringProvider: 'Dr. Test Provider',
    referringProviderNPI: '1234567893', // Valid NPI with Luhn checksum
    medicationName: 'IVIG',
    primaryDiagnosis: 'G70.00', // Myasthenia gravis
    clinicalNotes: 'E2E test patient - auto-generated for testing purposes.',
    ...overrides,
  };
}

export interface TestPatientData {
  firstName: string;
  lastName: string;
  mrn: string;
  referringProvider: string;
  referringProviderNPI: string;
  medicationName: string;
  primaryDiagnosis: string;
  clinicalNotes: string;
}

/**
 * Fill patient form with test data
 */
export async function fillPatientForm(page: Page, data: TestPatientData) {
  await page.getByLabel('First Name').fill(data.firstName);
  await page.getByLabel('Last Name').fill(data.lastName);
  await page.getByLabel('Medical Record Number (MRN)').fill(data.mrn);
  await page.getByLabel('Referring Provider Name').fill(data.referringProvider);
  await page.getByLabel('Provider NPI').fill(data.referringProviderNPI);
  await page.getByLabel('Medication Name').fill(data.medicationName);
  await page.getByLabel('Primary Diagnosis (ICD-10)').fill(data.primaryDiagnosis);
  await page.getByLabel('Clinical Notes').fill(data.clinicalNotes);
}

/**
 * Create a patient via the UI and return the patient ID
 * Handles warnings page if it appears
 */
export async function createPatientViaUI(
  page: Page,
  data: Partial<TestPatientData> = {}
): Promise<string> {
  const patientData = createTestPatient(data);

  await page.goto('/patients/new');
  await fillPatientForm(page, patientData);
  await page.getByRole('button', { name: 'Create Patient' }).click();

  // Check if warnings page appears
  const warningsVisible = await page.getByText(/Review Warnings/i).isVisible().catch(() => false);

  if (warningsVisible) {
    // Click "Proceed Anyway" to dismiss warnings
    const proceedButton = page.getByRole('button', { name: /Proceed Anyway/i });
    if (await proceedButton.isVisible()) {
      await proceedButton.click();
    }
  }

  // Wait for redirect to patient detail page
  await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });

  // Extract patient ID from URL
  const url = page.url();
  const match = url.match(/\/patients\/([a-z0-9]+)/);
  if (!match) {
    throw new Error('Failed to extract patient ID from URL');
  }

  return match[1];
}

/**
 * Predefined test patients for specific scenarios
 */
export const TEST_PATIENTS = {
  /** Valid patient with all required fields */
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    mrn: '100001',
    referringProvider: 'Dr. Sarah Mitchell',
    referringProviderNPI: '1234567893',
    medicationName: 'IVIG',
    primaryDiagnosis: 'G70.00',
    clinicalNotes: 'Patient has generalized myasthenia gravis.',
  },

  /** Patient for duplicate detection tests */
  duplicateTest: {
    firstName: 'Duplicate',
    lastName: 'TestPatient',
    mrn: '200001',
    referringProvider: 'Dr. Test',
    referringProviderNPI: '1234567893',
    medicationName: 'IVIG',
    primaryDiagnosis: 'G70.00',
    clinicalNotes: 'Test patient for duplicate detection.',
  },

  /** Patient for care plan generation */
  carePlan: {
    firstName: 'CarePlan',
    lastName: 'TestPatient',
    mrn: '300001',
    referringProvider: 'Dr. Sarah Mitchell',
    referringProviderNPI: '1234567893',
    medicationName: 'IVIG',
    primaryDiagnosis: 'G70.00',
    clinicalNotes: `Patient has generalized myasthenia gravis. Recent exacerbation with ptosis and muscle weakness.
Currently on pyridostigmine 60mg TID and prednisone 10mg daily.
Neurology recommends IVIG therapy for rapid symptomatic control.`,
  },
} as const;

/**
 * Valid NPIs for testing (these have correct Luhn checksums)
 */
export const VALID_NPIS = {
  npi1: '1234567893',
  npi2: '1245319599',
  npi3: '1679576722',
  npi4: '1003000126',
} as const;

/**
 * Invalid NPIs for validation testing
 */
export const INVALID_NPIS = {
  tooShort: '123',
  tooLong: '12345678901',
  invalidChecksum: '1234567890', // Fails Luhn check
  nonNumeric: 'ABCDEFGHIJ',
} as const;

/**
 * Valid ICD-10 codes for testing
 */
export const VALID_ICD10_CODES = {
  myastheniaGravis: 'G70.00',
  asthma: 'J45.50',
  rheumatoidArthritis: 'M05.79',
  diabetesType2: 'E11.9',
} as const;

/**
 * Invalid ICD-10 codes for validation testing
 */
export const INVALID_ICD10_CODES = {
  invalidFormat: 'INVALID',
  tooShort: 'A',
  wrongPattern: '12345',
} as const;
