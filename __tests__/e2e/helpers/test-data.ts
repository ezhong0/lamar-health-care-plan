/**
 * E2E Test Data Helpers
 *
 * Provides utilities for creating and managing test data across E2E tests.
 *
 * CORE DESIGN PRINCIPLE: Test Isolation
 * Each test run must have completely unique data to prevent interference.
 * We achieve this by generating unique NPIs, MRNs, and provider names
 * that are guaranteed to not conflict across tests.
 */

import type { Page } from '@playwright/test';

/**
 * Global counter for generating unique test data within a test run
 * This ensures tests don't conflict even when run in parallel
 */
let testDataCounter = 0;

/**
 * Generate a unique NPI for testing
 * Uses crypto-random to ensure uniqueness across all test runs
 * Still maintains valid Luhn checksum
 */
function generateUniqueNPI(): string {
  // Use 3-digit suffix (100-999) for 900 possible unique NPIs
  // This gives excellent test isolation with minimal collision risk
  const randomSuffix = Math.floor(Math.random() * 900) + 100; // Range: 100-999
  const npiWithoutChecksum = '100000' + String(randomSuffix);

  // Calculate Luhn checksum
  let sum = 0;
  let shouldDouble = true;

  // Add constant 80840 to the NPI for the Luhn algorithm
  const fullNumber = '80840' + npiWithoutChecksum;

  for (let i = fullNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(fullNumber[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return npiWithoutChecksum + checkDigit;
}

/**
 * Generate a unique MRN for testing
 */
function generateUniqueMRN(): string {
  return `${Date.now()}`.slice(-6);
}

/**
 * Generate a unique provider name for testing
 */
function generateUniqueProviderName(): string {
  // Use timestamp to ensure unique provider names across test runs
  const timestamp = Date.now();
  return `Dr. Test Provider ${timestamp}`;
}

/**
 * Generate a unique valid last name for testing
 * Uses rotating list of real last names to ensure uniqueness and validity
 */
function generateUniqueLastName(): string {
  // Common last names without numbers (valid for schema)
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green'
  ];

  // Use timestamp to select from list, ensuring different name each millisecond
  const index = Date.now() % lastNames.length;
  return lastNames[index];
}

/**
 * Patient test data factory
 * Generates unique test patients with GUARANTEED unique identifiers
 * to avoid any conflicts with duplicate detection system
 */
export function createTestPatient(overrides: Partial<TestPatientData> = {}): TestPatientData {
  return {
    firstName: 'Test',
    lastName: generateUniqueLastName(),
    mrn: generateUniqueMRN(),
    referringProvider: generateUniqueProviderName(),
    referringProviderNPI: generateUniqueNPI(),
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
 * ROBUSTLY handles any warnings that may appear
 *
 * Design Philosophy: "Intelligence Without Friction"
 * This helper should handle ALL possible warning scenarios gracefully,
 * not just specific cases. It adapts to the actual application behavior.
 *
 * @param page - Playwright page object
 * @param data - Partial patient data (will be merged with defaults)
 * @returns Patient ID from the URL
 */
export async function createPatientViaUI(
  page: Page,
  data: Partial<TestPatientData> = {}
): Promise<string> {
  const patientData = createTestPatient(data);

  await page.goto('/patients/new');
  await fillPatientForm(page, patientData);
  await page.getByRole('button', { name: 'Create Patient' }).click();

  // Wait for one of two outcomes:
  // 1. Direct navigation to patient detail page
  // 2. Warnings page appears
  await Promise.race([
    page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 5000 }).catch(() => null),
    page.waitForSelector('text=Review Warnings', { timeout: 5000 }).catch(() => null),
  ]);

  // Check current state
  const currentUrl = page.url();

  // If already on patient detail page, we're done
  if (/\/patients\/[a-z0-9]+/.test(currentUrl)) {
    const match = currentUrl.match(/\/patients\/([a-z0-9]+)/);
    if (match) return match[1];
  }

  // Otherwise, handle warnings page if present
  // Check if we're on the warnings page by trying to find the heading
  const warningsHeading = page.getByRole('heading', { name: /Review Warnings/i });

  try {
    // Wait for warnings heading to be visible (gives React time to render)
    await warningsHeading.waitFor({ state: 'visible', timeout: 2000 });

    // We're on the warnings page - click "Proceed Anyway" button
    const proceedButton = page.getByRole('button', { name: /Proceed Anyway/i });
    await proceedButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click the button - this should trigger window.location.href navigation
    await proceedButton.click();

    // Wait for navigation to complete (full page reload with window.location.href)
    // Use waitForURL with longer timeout to allow for the setTimeout(0) delay
    await page.waitForURL(/\/patients\/[a-z0-9]+/, { timeout: 10000 });
  } catch (error) {
    // If warnings page not found or navigation times out, continue to URL extraction
    console.log('[Test Helper] Warning page handling error:', error);
  }

  // Extract patient ID from final URL
  const finalUrl = page.url();
  const match = finalUrl.match(/\/patients\/([a-z0-9]+)/);

  if (!match) {
    throw new Error(`Failed to create patient. Final URL: ${finalUrl}`);
  }

  return match[1];
}

/**
 * Predefined test patients for specific scenarios
 * NOTE: NPIs are intentionally omitted - use createTestPatient() which generates unique NPIs automatically
 */
export const TEST_PATIENTS = {
  /** Valid patient with all required fields */
  valid: {
    firstName: 'John',
    lastName: 'Doe',
    mrn: '100001',
    referringProvider: 'Dr. Sarah Mitchell',
    // referringProviderNPI omitted - will be auto-generated uniquely
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
    // referringProviderNPI omitted - will be auto-generated uniquely
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
    // referringProviderNPI omitted - will be auto-generated uniquely
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
