/**
 * Client API Wrapper
 *
 * Type-safe wrapper around fetch for API calls.
 * Uses contracts from lib/api/contracts.ts to ensure type safety.
 *
 * All API errors are thrown as ApiError instances with structured error information.
 */

import type {
  CreatePatientRequest,
  CreatePatientResponse,
  GenerateCarePlanRequest,
  GenerateCarePlanResponse,
  GetPatientResponse,
  ListPatientsResponse,
} from '@/lib/api/contracts';
import { ApiError } from './errors';

/**
 * Base fetch wrapper with error handling
 *
 * Throws ApiError for failed requests with structured error information.
 * All successful responses return the parsed JSON data.
 *
 * @throws {ApiError} When the API returns an error response
 * @throws {Error} For network errors or JSON parsing failures
 */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // Throw structured ApiError instead of generic Error
    throw new ApiError(
      data.error || 'API request failed',
      data.code,
      data.details
    );
  }

  return data;
}

/**
 * Create a new patient with full validation
 */
export async function createPatient(
  data: CreatePatientRequest
): Promise<CreatePatientResponse> {
  return apiFetch<CreatePatientResponse>('/api/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Generate a care plan for a patient
 */
export async function generateCarePlan(
  data: GenerateCarePlanRequest
): Promise<GenerateCarePlanResponse> {
  return apiFetch<GenerateCarePlanResponse>('/api/care-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get patient details with orders and care plans
 */
export async function getPatient(id: string): Promise<GetPatientResponse> {
  return apiFetch<GetPatientResponse>(`/api/patients/${id}`);
}

/**
 * List all patients
 */
export async function listPatients(): Promise<ListPatientsResponse> {
  return apiFetch<ListPatientsResponse>('/api/patients');
}
