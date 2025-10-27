/**
 * Client API Wrapper
 *
 * Type-safe wrapper around fetch for API calls.
 * Uses contracts from lib/api/contracts.ts to ensure type safety.
 */

import type {
  CreatePatientRequest,
  CreatePatientResponse,
  GenerateCarePlanRequest,
  GenerateCarePlanResponse,
  GetPatientResponse,
} from '@/lib/api/contracts';

/**
 * Base fetch wrapper with error handling
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
    const error = new Error(data.error || 'API request failed');
    (error as any).code = data.code;
    (error as any).details = data.details;
    throw error;
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
