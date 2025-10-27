/**
 * Tests for domain-specific error classes
 *
 * These errors represent expected business failures.
 * Tests verify error structure, codes, and messages.
 */

import { describe, it, expect } from 'vitest';
import {
  DomainError,
  DuplicatePatientError,
  ProviderConflictError,
  PatientNotFoundError,
  CarePlanGenerationError,
  ValidationError,
} from '@/lib/domain/errors';

describe('Domain Errors', () => {
  describe('DuplicatePatientError', () => {
    it('creates error with correct structure', () => {
      const existingPatient = {
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      };

      const error = new DuplicatePatientError(existingPatient);

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('DUPLICATE_PATIENT');
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('123456');
      expect(error.message).toContain('John Doe');
      expect(error.details).toEqual({ existingPatient });
    });

    it('has correct name', () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(error.name).toBe('DuplicatePatientError');
    });

    it('captures stack trace', () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DuplicatePatientError');
    });
  });

  describe('ProviderConflictError', () => {
    it('creates error with clear conflict message', () => {
      const error = new ProviderConflictError('1234567893', 'Dr. Jones', 'Dr. Smith');

      expect(error.code).toBe('PROVIDER_CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.message).toContain('1234567893');
      expect(error.message).toContain('Dr. Smith'); // actual name
      expect(error.message).toContain('Dr. Jones'); // expected name
      expect(error.details).toEqual({
        npi: '1234567893',
        expectedName: 'Dr. Jones',
        actualName: 'Dr. Smith',
      });
    });
  });

  describe('PatientNotFoundError', () => {
    it('creates error with patient ID', () => {
      const error = new PatientNotFoundError('patient-123');

      expect(error.code).toBe('PATIENT_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('patient-123');
      expect(error.details).toEqual({ patientId: 'patient-123' });
    });
  });

  describe('CarePlanGenerationError', () => {
    it('creates error with reason', () => {
      const error = new CarePlanGenerationError('API timeout');

      expect(error.code).toBe('CARE_PLAN_GENERATION_FAILED');
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('API timeout');
      expect(error.details?.reason).toBe('API timeout');
    });

    it('includes cause error if provided', () => {
      const cause = new Error('Network error');
      const error = new CarePlanGenerationError('API failed', cause);

      expect(error.details?.cause).toBe('Network error');
    });
  });

  describe('ValidationError', () => {
    it('creates error with validation details', () => {
      const details = {
        field: 'mrn',
        value: '12345', // Wrong length
        expected: '6 digits',
      };

      const error = new ValidationError('Invalid MRN format', details);

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid MRN format');
      expect(error.details).toEqual(details);
    });
  });

  describe('DomainError base class', () => {
    class CustomDomainError extends DomainError {
      constructor(message: string) {
        super(message, 'CUSTOM_ERROR', 418, { custom: true });
      }
    }

    it('allows custom error types', () => {
      const error = new CustomDomainError('Custom error');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.statusCode).toBe(418);
      expect(error.details).toEqual({ custom: true });
    });

    it('is catchable as Error', () => {
      const error = new CustomDomainError('Test');

      try {
        throw error;
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(DomainError);
      }
    });
  });

  describe('error type guards', () => {
    it('can distinguish between error types', () => {
      const duplicateError = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      const notFoundError = new PatientNotFoundError('patient-123');

      expect(duplicateError.code).not.toBe(notFoundError.code);
      expect(duplicateError.statusCode).toBe(409);
      expect(notFoundError.statusCode).toBe(404);
    });
  });
});
