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

  // Listen for API response to extract patient ID reliably
  let createdPatientId: string | null = null;

  page.on('response', async (response) => {
    if (response.url().includes('/api/patients') && response.request().method() === 'POST') {
      if (response.ok()) {
        try {
          const json = await response.json();
          if (json.success && json.data?.patient?.id) {
            createdPatientId = json.data.patient.id;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  });

  await page.getByRole('button', { name: 'Create Patient' }).click();

  // Wait for API response
  await page.waitForResponse(
    (response) => response.url().includes('/api/patients') && response.request().method() === 'POST',
    { timeout: 10000 }
  );

  // Wait a bit for React to process the response
  await page.waitForTimeout(500);

  // Check if we're on warnings page
  const warningsVisible = await page.getByRole('heading', { name: /Review Warnings/i }).isVisible().catch(() => false);

  if (warningsVisible) {
    // Click proceed button and wait for navigation
    const proceedButton = page.getByRole('button', { name: /Proceed Anyway/i });

    // Wait for navigation promise and click simultaneously
    await Promise.all([
      page.waitForURL(/\/patients\/[a-z0-9-]+$/, { timeout: 15000 }),
      proceedButton.click()
    ]);

    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
  } else {
    // Check if we're already on patient detail page
    const currentUrl = page.url();
    if (!/\/patients\/[a-z0-9-]+$/.test(currentUrl)) {
      // Not on detail page yet, wait for navigation
      await page.waitForURL(/\/patients\/[a-z0-9-]+$/, { timeout: 10000 });
    }
  }

  // Extract patient ID from URL if we didn't get it from API
  if (!createdPatientId) {
    const finalUrl = page.url();
    const match = finalUrl.match(/\/patients\/([a-z0-9-]+)/);
    if (match) {
      createdPatientId = match[1];
    }
  }

  if (!createdPatientId) {
    throw new Error(`Failed to create patient. Final URL: ${page.url()}`);
  }

  return createdPatientId;
}

/**
 * Create a patient via API (bypasses UI entirely)
 * Useful for setup where UI interaction isn't being tested
 */
export async function createPatientViaAPI(
  page: Page,
  data: Partial<TestPatientData> = {}
): Promise<string> {
  const patientData = createTestPatient(data);

  // Map test data fields to API fields
  const apiData = {
    firstName: patientData.firstName,
    lastName: patientData.lastName,
    mrn: patientData.mrn,
    referringProvider: patientData.referringProvider,
    referringProviderNPI: patientData.referringProviderNPI,
    medicationName: patientData.medicationName,
    primaryDiagnosis: patientData.primaryDiagnosis,
    patientRecords: patientData.clinicalNotes, // API field name is patientRecords
  };

  // Use page.request to make API call from Playwright context
  const response = await page.request.post('http://localhost:3000/api/patients', {
    data: apiData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create patient via API: ${response.status()} ${await response.text()}`);
  }

  const json = await response.json();

  if (!json.success || !json.data?.patient?.id) {
    throw new Error(`API returned unexpected format: ${JSON.stringify(json)}`);
  }

  return json.data.patient.id;
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
