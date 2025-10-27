/**
 * API Request/Response Contracts
 *
 * CRITICAL FOR PARALLEL DEVELOPMENT:
 * These types define the interface between frontend and backend.
 * Both tracks must implement against these contracts exactly.
 */

import type { Patient, CarePlan, Order } from '@/lib/domain/types';
import type { Warning } from '@/lib/domain/warnings';

// ============================================================================
// Patient Creation
// ============================================================================

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  mrn: string;
  referringProvider: string;
  referringProviderNPI: string;
  primaryDiagnosis: string;
  medicationName: string;
  additionalDiagnoses?: string[];
  medicationHistory?: string[];
  patientRecords: string;
}

export interface CreatePatientResponse {
  success: boolean;
  data?: {
    patient: Patient;
    warnings: Warning[];
  };
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Care Plan Generation
// ============================================================================

export interface GenerateCarePlanRequest {
  patientId: string;
}

export interface GenerateCarePlanResponse {
  success: boolean;
  data?: {
    carePlan: CarePlan;
  };
  error?: {
    message: string;
    code: string;
  };
}

// ============================================================================
// Get Patient
// ============================================================================

export interface GetPatientResponse {
  success: boolean;
  data?: {
    patient: Patient;
    orders: Order[];
    carePlans: CarePlan[];
  };
  error?: {
    message: string;
    code: string;
  };
}
