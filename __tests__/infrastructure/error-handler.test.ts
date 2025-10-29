/**
 * Error Handler Tests
 *
 * Tests centralized error handling for API routes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError } from '@/lib/infrastructure/error-handler';
import {
  DuplicatePatientError,
  PatientNotFoundError,
  ProviderConflictError,
  CarePlanGenerationError,
  ValidationError,
} from '@/lib/domain/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/infrastructure/logger';

describe('handleError', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Set logger level to allow all logs during tests
    // @ts-expect-error - accessing private property for testing
    logger.level = 'debug';
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    // Restore logger level
    // @ts-expect-error - accessing private property for testing
    logger.level = 'error';
  });

  describe('Domain errors', () => {
    it('handles DuplicatePatientError with 409 status', async () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });
      const response = handleError(error);

      expect(response.status).toBe(409);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
      expect(body.error.code).toBe('DUPLICATE_PATIENT');
      expect(body.error.details).toHaveProperty('existingPatient');
    });

    it('handles PatientNotFoundError with 404 status', async () => {
      const error = new PatientNotFoundError('patient-123');
      const response = handleError(error);

      expect(response.status).toBe(404);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('not found');
      expect(body.error.code).toBe('PATIENT_NOT_FOUND');
    });

    it('handles ProviderConflictError with 409 status', async () => {
      const error = new ProviderConflictError('1234567893', 'Dr. Smith', 'Dr. John Smith');
      const response = handleError(error);

      expect(response.status).toBe(409);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('NPI');
      expect(body.error.code).toBe('PROVIDER_CONFLICT');
    });

    it('handles CarePlanGenerationError with 500 status', async () => {
      const error = new CarePlanGenerationError('LLM timeout');
      const response = handleError(error);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('LLM timeout');
      expect(body.error.code).toBe('CARE_PLAN_GENERATION_FAILED');
    });

    it('handles ValidationError with 400 status', async () => {
      const error = new ValidationError('Invalid input', { fields: ['field1', 'field2'] });
      const response = handleError(error);

      expect(response.status).toBe(400);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid input');
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toHaveProperty('fields');
    });

    it('logs domain errors as warnings', async () => {
      const error = new DuplicatePatientError({
        mrn: '123456',
        firstName: 'John',
        lastName: 'Doe',
      });
      handleError(error);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('warn');
      // The logger outputs the actual warning message from the error
      expect(logData.message).toBeDefined();
      expect(logData.code).toBe('DUPLICATE_PATIENT');
    });
  });

  describe('Zod validation errors', () => {
    it('handles ZodError with 400 status', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['firstName'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 6,
          type: 'string',
          inclusive: true,
          exact: true,
          path: ['mrn'],
          message: 'MRN must be exactly 6 digits',
        },
      ]);

      const response = handleError(zodError);

      expect(response.status).toBe(400);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toHaveLength(2);
      expect(body.error.details[0]).toEqual({
        path: 'firstName',
        message: 'Expected string, received number',
      });
      expect(body.error.details[1]).toEqual({
        path: 'mrn',
        message: 'MRN must be exactly 6 digits',
      });
    });

    it('handles nested path in ZodError', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['user', 'address', 'city'],
          message: 'City is required',
        },
      ]);

      const response = handleError(zodError);
      const body = await response.json();

      expect(body.error.details[0].path).toBe('user.address.city');
    });

    it('logs validation errors as warnings', async () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['field'],
          message: 'Error',
        },
      ]);

      handleError(zodError);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('warn');
      expect(logData.message).toContain('Validation error');
    });
  });

  describe('Prisma database errors', () => {
    it('handles unique constraint violation (P2002) with 409 status', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );

      const response = handleError(prismaError);

      expect(response.status).toBe(409);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toContain('already exists');
      expect(body.error.code).toBe('DUPLICATE_RECORD');
    });

    it('handles record not found (P2025) with 404 status', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        }
      );

      const response = handleError(prismaError);

      expect(response.status).toBe(404);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Record not found');
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('handles other Prisma errors with 500 status', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        }
      );

      const response = handleError(prismaError);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Database operation failed');
      expect(body.error.code).toBe('DATABASE_ERROR');
    });

    it('logs Prisma errors', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Database error',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        }
      );

      handleError(prismaError);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('error');
      expect(logData.message).toContain('Database error');
    });
  });

  describe('Unexpected errors', () => {
    it('handles generic Error with 500 status', async () => {
      const error = new Error('Something went wrong');
      const response = handleError(error);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('An unexpected error occurred');
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('handles non-Error objects', async () => {
      const error = 'string error';
      const response = handleError(error);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('handles null error', async () => {
      const response = handleError(null);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('An unexpected error occurred');
    });

    it('handles undefined error', async () => {
      const response = handleError(undefined);

      expect(response.status).toBe(500);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.message).toBe('An unexpected error occurred');
    });

    it('logs unexpected errors with stack trace', async () => {
      const error = new Error('Unexpected');
      handleError(error);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('error');
      expect(logData.message).toContain('Unexpected error');
      expect(logData.error).toBe('Unexpected');
      expect(logData.stack).toBeDefined();
    });

    it('logs non-Error objects safely', async () => {
      const error = { custom: 'error' };
      handleError(error);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall);

      expect(logData.level).toBe('error');
      expect(logData.error).toBe('Unknown error');
    });
  });

  describe('response format consistency', () => {
    it('always includes success: false', async () => {
      const errors = [
        new DuplicatePatientError({ mrn: '123', firstName: 'John', lastName: 'Doe' }),
        new ZodError([]),
        new Error('Test'),
      ];

      for (const error of errors) {
        const response = handleError(error);
        const body = await response.json();
        expect(body.success).toBe(false);
      }
    });

    it('always includes error message', async () => {
      const errors = [
        new DuplicatePatientError({ mrn: '123', firstName: 'John', lastName: 'Doe' }),
        new ZodError([]),
        new Error('Test'),
      ];

      for (const error of errors) {
        const response = handleError(error);
        const body = await response.json();
        expect(body.error).toBeDefined();
        expect(typeof body.error).toBe('object');
        expect(body.error.message).toBeDefined();
        expect(typeof body.error.message).toBe('string');
      }
    });

    it('always includes error code', async () => {
      const errors = [
        new DuplicatePatientError({ mrn: '123', firstName: 'John', lastName: 'Doe' }),
        new ZodError([]),
        new Error('Test'),
      ];

      for (const error of errors) {
        const response = handleError(error);
        const body = await response.json();
        expect(body.error.code).toBeDefined();
        expect(typeof body.error.code).toBe('string');
      }
    });
  });
});
