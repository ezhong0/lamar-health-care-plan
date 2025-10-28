/**
 * Warning types for non-blocking issues
 *
 * Uses discriminated unions for type-safe warning handling.
 * Each warning type has a unique 'type' field for exhaustive checking.
 */

import type { PatientId, OrderId } from './types';

export type Warning =
  | DuplicatePatientWarning
  | DuplicateOrderWarning
  | ProviderConflictWarning
  | SimilarPatientWarning;

export interface DuplicatePatientWarning {
  type: 'DUPLICATE_PATIENT';
  severity: 'high';
  message: string;
  existingPatient: {
    id: PatientId;
    mrn: string;
    name: string;
  };
}

export interface DuplicateOrderWarning {
  type: 'DUPLICATE_ORDER';
  severity: 'high';
  message: string;
  existingOrder: {
    id: OrderId;
    medicationName: string;
    createdAt: Date;
  };
}

export interface ProviderConflictWarning {
  type: 'PROVIDER_CONFLICT';
  severity: 'high';
  message: string;
  npi: string;
  expectedName: string;
  actualName: string;
}

export interface SimilarPatientWarning {
  type: 'SIMILAR_PATIENT';
  severity: 'medium';
  message: string;
  similarPatient: {
    id: PatientId;
    mrn: string;
    name: string;
  };
  similarityScore: number;
  // Action options for user
  canLinkToExisting: boolean; // If true, user can add order to existing patient
  hasSameMedication: boolean; // If true, this is essentially a duplicate order
}
