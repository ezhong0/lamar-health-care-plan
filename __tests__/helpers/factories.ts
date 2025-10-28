/**
 * Test Data Factories
 *
 * Provides factory functions to generate test data with sensible defaults.
 * Uses builder pattern for flexibility.
 *
 * Philosophy:
 * - Each factory has minimal required fields
 * - Overrides via partial object
 * - Generates valid data by default
 * - Unique identifiers to prevent collisions
 */

import type { Patient, Provider, Order, CarePlan } from '@/lib/domain/types';
import { toPatientId, toProviderId, toOrderId, toCarePlanId } from '@/lib/domain/types';
import type { SimilarPatientWarning, DuplicateOrderWarning, ProviderConflictWarning } from '@/lib/domain/warnings';

let mrnCounter = 100000;
let npiCounter = 1234567890;

/**
 * Generate unique MRN (6 digits)
 */
export function generateUniqueMRN(): string {
  return String(mrnCounter++).padStart(6, '0');
}

/**
 * Generate valid NPI with correct Luhn checksum
 *
 * Uses incremental NPIs for predictability in tests
 */
export function generateValidNPI(): string {
  const baseNPI = String(npiCounter++);

  // Calculate Luhn checksum
  const prefixed = '80840' + baseNPI.slice(0, 9);
  let sum = 0;
  let shouldDouble = false;

  for (let i = prefixed.length - 1; i >= 0; i--) {
    let digit = parseInt(prefixed[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return baseNPI.slice(0, 9) + checkDigit;
}

/**
 * Patient factory
 */
export function createPatient(overrides?: Partial<Patient>): Patient {
  const id = overrides?.id || toPatientId(`patient_${Date.now()}_${Math.random()}`);

  return {
    id,
    firstName: 'John',
    lastName: 'Doe',
    mrn: generateUniqueMRN(),
    additionalDiagnoses: [],
    medicationHistory: [],
    patientRecords: 'Patient has chronic condition requiring specialty medication.',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Provider factory
 */
export function createProvider(overrides?: Partial<Provider>): Provider {
  const id = overrides?.id || toProviderId(`provider_${Date.now()}_${Math.random()}`);

  return {
    id,
    name: 'Dr. Smith',
    npi: generateValidNPI(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Order factory
 */
export function createOrder(overrides?: Partial<Order>): Order {
  const id = overrides?.id || toOrderId(`order_${Date.now()}_${Math.random()}`);

  return {
    id,
    patientId: toPatientId('patient_123'),
    providerId: toProviderId('provider_123'),
    medicationName: 'IVIG',
    primaryDiagnosis: 'G70.00',
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * CarePlan factory
 */
export function createCarePlan(overrides?: Partial<CarePlan>): CarePlan {
  const id = overrides?.id || toCarePlanId(`careplan_${Date.now()}_${Math.random()}`);

  return {
    id,
    patientId: toPatientId('patient_123'),
    content: `# Care Plan

## Problem List
1. Patient requires IVIG therapy for myasthenia gravis
2. Monitor for infusion reactions

## SMART Goals
- Patient will complete IVIG infusion without adverse reactions
- Patient will demonstrate understanding of medication administration

## Pharmacist Interventions
- Pre-medication with acetaminophen and diphenhydramine
- Monitor vital signs during infusion
- Patient education on side effects

## Deliverable
- Medication guide provided
- Follow-up call scheduled in 48 hours`,
    generatedBy: 'claude-haiku-4-5-20251001',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * SimilarPatientWarning factory
 */
export function createSimilarPatientWarning(overrides?: Partial<SimilarPatientWarning>): SimilarPatientWarning {
  return {
    type: 'SIMILAR_PATIENT',
    severity: 'medium',
    message: 'Similar patient found: John Smith (MRN: 123456) - 85% match',
    similarPatient: {
      id: toPatientId('patient_similar_123'),
      mrn: '123456',
      name: 'John Smith',
    },
    similarityScore: 0.85,
    ...overrides,
  };
}

/**
 * DuplicateOrderWarning factory
 */
export function createDuplicateOrderWarning(overrides?: Partial<DuplicateOrderWarning>): DuplicateOrderWarning {
  return {
    type: 'DUPLICATE_ORDER',
    severity: 'high',
    message: 'Order for IVIG already exists for this patient (created Oct 27, 2024)',
    existingOrder: {
      id: toOrderId('order_duplicate_123'),
      medicationName: 'IVIG',
      createdAt: new Date('2024-10-27'),
    },
    ...overrides,
  };
}

/**
 * ProviderConflictWarning factory
 */
export function createProviderConflictWarning(overrides?: Partial<ProviderConflictWarning>): ProviderConflictWarning {
  const npi = generateValidNPI();

  return {
    type: 'PROVIDER_CONFLICT',
    severity: 'high',
    message: `NPI ${npi} is registered to "Dr. Smith". You entered "Dr. Jones".`,
    npi,
    expectedName: 'Dr. Jones',
    actualName: 'Dr. Smith',
    ...overrides,
  };
}

/**
 * Patient input factory (for API requests)
 */
export function createPatientInput(overrides?: Partial<ReturnType<typeof createPatientInput>>) {
  return {
    firstName: 'John',
    lastName: 'Doe',
    mrn: generateUniqueMRN(),
    referringProvider: 'Dr. Smith',
    referringProviderNPI: generateValidNPI(),
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG',
    additionalDiagnoses: [],
    medicationHistory: [],
    patientRecords: 'Patient has myasthenia gravis requiring IVIG therapy.',
    ...overrides,
  };
}

/**
 * Reset counters (for test isolation)
 */
export function resetFactoryCounters() {
  mrnCounter = 100000;
  npiCounter = 1234567890;
}
