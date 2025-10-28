/**
 * Unit Tests: Domain Errors
 *
 * Tests the DomainError hierarchy and specific error types.
 * Ensures errors have correct codes, status codes, and messages.
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
  describe('DomainError base class', () => {
    it('should be instanceof Error', () => {
      class TestError extends DomainError {
        constructor() {
          super('Test error', 'TEST_ERROR', 400);
        }
      }

      const error = new TestError();
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DomainError);
    });

    it('should have correct properties', () => {
      class TestError extends DomainError {
        constructor() {
          super('Test error', 'TEST_ERROR', 400, { field: 'value' });
        }
      }

      const error = new TestError();
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should have correct name property', () => {
      class TestError extends DomainError {
        constructor() {
          super('Test error', 'TEST_ERROR', 400);
        }
      }

      const error = new TestError();
      expect(error.name).toBe('TestError');
    });

    it('should capture stack trace', () => {
      class TestError extends DomainError {
        constructor() {
          super('Test error', 'TEST_ERROR', 400);
        }
      }

      const error = new TestError();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestError');
    });
  });

  describe('DuplicatePatientError', () => {
    it('should create error with patient details', () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toContain('123456');
      expect(error.message).toContain('John Doe');
      expect(error.code).toBe('DUPLICATE_PATIENT');
      expect(error.statusCode).toBe(409);
    });

    it('should include existing patient in details', () => {
      const existingPatient = {
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      };

      const error = new DuplicatePatientError(existingPatient);

      expect(error.details).toEqual({ existingPatient });
    });
  });

  describe('ProviderConflictError', () => {
    it('should create error with NPI and names', () => {
      const error = new ProviderConflictError('1234567893', 'Dr. Smith', 'Dr. Jones');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toContain('1234567893');
      expect(error.message).toContain('Dr. Smith');
      expect(error.message).toContain('Dr. Jones');
      expect(error.code).toBe('PROVIDER_CONFLICT');
      expect(error.statusCode).toBe(409);
    });

    it('should include conflict details', () => {
      const error = new ProviderConflictError('1234567893', 'Dr. Smith', 'Dr. Jones');

      expect(error.details).toEqual({
        npi: '1234567893',
        expectedName: 'Dr. Smith',
        actualName: 'Dr. Jones',
      });
    });

    it('should format message correctly', () => {
      const error = new ProviderConflictError('1234567893', 'Dr. Smith', 'Dr. Jones');

      expect(error.message).toBe(
        'NPI 1234567893 is registered to "Dr. Jones". You entered "Dr. Smith".'
      );
    });
  });

  describe('PatientNotFoundError', () => {
    it('should create error with patient ID', () => {
      const error = new PatientNotFoundError('patient_123');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toContain('patient_123');
      expect(error.code).toBe('PATIENT_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should include patient ID in details', () => {
      const error = new PatientNotFoundError('patient_123');

      expect(error.details).toEqual({ patientId: 'patient_123' });
    });
  });

  describe('CarePlanGenerationError', () => {
    it('should create error with reason', () => {
      const error = new CarePlanGenerationError('LLM timeout');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toContain('LLM timeout');
      expect(error.code).toBe('CARE_PLAN_GENERATION_FAILED');
      expect(error.statusCode).toBe(500);
    });

    it('should include cause error in details', () => {
      const cause = new Error('Timeout');
      const error = new CarePlanGenerationError('LLM timeout', cause);

      expect(error.details).toEqual({
        reason: 'LLM timeout',
        cause: 'Timeout',
      });
    });

    it('should work without cause', () => {
      const error = new CarePlanGenerationError('Patient has no orders');

      expect(error.details).toEqual({
        reason: 'Patient has no orders',
        cause: undefined,
      });
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should include validation details', () => {
      const details = {
        field: 'email',
        reason: 'Invalid format',
      };

      const error = new ValidationError('Invalid input', details);

      expect(error.details).toEqual(details);
    });

    it('should work without details', () => {
      const error = new ValidationError('Invalid input');

      expect(error.details).toBeUndefined();
    });
  });

  describe('Error serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      const serialized = {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      };

      expect(serialized).toEqual({
        message: expect.stringContaining('123456'),
        code: 'DUPLICATE_PATIENT',
        statusCode: 409,
        details: {
          existingPatient: {
            mrn: '123456',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      });
    });
  });

  describe('Error instanceof checks', () => {
    it('should work with instanceof', () => {
      const duplicateError = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });

      const notFoundError = new PatientNotFoundError('patient_123');

      expect(duplicateError instanceof DuplicatePatientError).toBe(true);
      expect(duplicateError instanceof DomainError).toBe(true);
      expect(duplicateError instanceof Error).toBe(true);

      expect(notFoundError instanceof PatientNotFoundError).toBe(true);
      expect(notFoundError instanceof DuplicatePatientError).toBe(false);
    });
  });
});
