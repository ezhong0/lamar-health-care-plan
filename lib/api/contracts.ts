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
  skipWarnings?: boolean; // Flag to skip duplicate warnings check
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

// ============================================================================
// List Patients
// ============================================================================

/**
 * Patient with related orders and care plans
 * Used for list/dashboard views that need relationship data
 */
export interface PatientWithRelations extends Patient {
  orders?: Array<{
    id: string;
    medicationName: string;
    primaryDiagnosis: string;
    status: string;
    createdAt: Date;
    provider: {
      id: string;
      name: string;
      npi: string;
    };
  }>;
  carePlans?: Array<{
    id: string;
  }>;
}

export interface ListPatientsResponse {
  success: boolean;
  data?: {
    patients: PatientWithRelations[];
  };
  error?: {
    message: string;
    code: string;
  };
}

// ============================================================================
// List Orders
// ============================================================================

export interface ListOrdersResponse {
  success: boolean;
  data?: {
    orders: Array<{
      id: string;
      medicationName: string;
      primaryDiagnosis: string;
      status: string;
      createdAt: string;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        mrn: string;
      };
      provider: {
        id: string;
        name: string;
        npi: string;
      };
    }>;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: {
    message: string;
    code: string;
  };
}

// ============================================================================
// List Providers
// ============================================================================

export interface ListProvidersResponse {
  success: boolean;
  data?: {
    providers: Array<{
      id: string;
      name: string;
      npi: string;
      createdAt: string;
      updatedAt: string;
      orderCount: number;
      lastOrderDate: string | null;
    }>;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: {
    message: string;
    code: string;
  };
}
