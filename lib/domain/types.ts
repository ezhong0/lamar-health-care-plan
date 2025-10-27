/**
 * Domain types for the care plan generator
 *
 * These types represent business entities independent of database schema.
 * Uses branded types for IDs to prevent mixing different entity IDs.
 */

// ============================================================================
// Branded ID Types
// ============================================================================

/**
 * Branded type for Patient IDs
 * Prevents accidentally passing an Order ID where a Patient ID is expected
 */
export type PatientId = string & { readonly __brand: 'PatientId' };
export type OrderId = string & { readonly __brand: 'OrderId' };
export type ProviderId = string & { readonly __brand: 'ProviderId' };
export type CarePlanId = string & { readonly __brand: 'CarePlanId' };

export function toPatientId(id: string): PatientId {
  return id as PatientId;
}

export function toOrderId(id: string): OrderId {
  return id as OrderId;
}

export function toProviderId(id: string): ProviderId {
  return id as ProviderId;
}

export function toCarePlanId(id: string): CarePlanId {
  return id as CarePlanId;
}

// ============================================================================
// Domain Entities
// ============================================================================

export interface Patient {
  id: PatientId;
  firstName: string;
  lastName: string;
  mrn: string;
  additionalDiagnoses: string[];
  medicationHistory: string[];
  patientRecords: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Order {
  id: OrderId;
  patientId: PatientId;
  providerId: ProviderId;
  medicationName: string;
  primaryDiagnosis: string;
  status: OrderStatus;
  createdAt: Date;
}

export interface Provider {
  id: ProviderId;
  name: string;
  npi: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarePlan {
  id: CarePlanId;
  patientId: PatientId;
  content: string;
  generatedBy: string;
  createdAt: Date;
}
