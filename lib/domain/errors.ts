/**
 * Domain-specific error classes
 *
 * These errors represent expected business failures (not unexpected exceptions).
 * They include structured error codes and HTTP status codes for API responses.
 */

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DuplicatePatientError extends DomainError {
  constructor(existingPatient: { mrn: string; firstName: string; lastName: string }) {
    super(
      `Patient with MRN ${existingPatient.mrn} already exists: ${existingPatient.firstName} ${existingPatient.lastName}`,
      'DUPLICATE_PATIENT',
      409,
      { existingPatient }
    );
  }
}

export class ProviderConflictError extends DomainError {
  constructor(npi: string, expectedName: string, actualName: string) {
    super(
      `NPI ${npi} is registered to "${actualName}". You entered "${expectedName}".`,
      'PROVIDER_CONFLICT',
      409,
      { npi, expectedName, actualName }
    );
  }
}

export class PatientNotFoundError extends DomainError {
  constructor(patientId: string) {
    super(
      `Patient with ID ${patientId} not found`,
      'PATIENT_NOT_FOUND',
      404,
      { patientId }
    );
  }
}

export class CarePlanGenerationError extends DomainError {
  constructor(reason: string, cause?: Error) {
    super(
      `Failed to generate care plan: ${reason}`,
      'CARE_PLAN_GENERATION_FAILED',
      500,
      { reason, cause: cause?.message }
    );
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}
