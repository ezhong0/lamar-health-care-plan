/**
 * Unit Tests: Result Type
 *
 * Tests the Result<T, E> discriminated union and type guards.
 * This is the foundation of error handling in the application.
 */

import { describe, it, expect } from 'vitest';
import type { Result } from '@/lib/domain/result';
import { isSuccess, isFailure } from '@/lib/domain/result';
import '../../../__tests__/helpers/matchers';

describe('Result Type', () => {
  describe('isSuccess', () => {
    it('should return true for success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(isSuccess(result)).toBe(true);
    });

    it('should return false for failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Failed'),
      };

      expect(isSuccess(result)).toBe(false);
    });

    it('should narrow type to Success in if block', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      if (isSuccess(result)) {
        // TypeScript should allow access to data
        expect(result.data).toBe(42);
        // @ts-expect-error - error should not exist on Success
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe('isFailure', () => {
    it('should return true for failure result', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Failed'),
      };

      expect(isFailure(result)).toBe(true);
    });

    it('should return false for success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(isFailure(result)).toBe(false);
    });

    it('should narrow type to Failure in if block', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Failed'),
      };

      if (isFailure(result)) {
        // TypeScript should allow access to error
        expect(result.error.message).toBe('Failed');
        // @ts-expect-error - data should not exist on Failure
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('Success with warnings', () => {
    it('should allow warnings on success result', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Similar patient found',
            similarPatient: {
              id: 'patient_123' as any,
              mrn: '123456',
              name: 'John Doe',
            },
            similarityScore: 0.85,
          },
        ],
      };

      expect(isSuccess(result)).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0].type).toBe('SIMILAR_PATIENT');
    });

    it('should allow empty warnings array', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
        warnings: [],
      };

      expect(isSuccess(result)).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should allow undefined warnings', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(isSuccess(result)).toBe(true);
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('Type parameter customization', () => {
    it('should work with different data types', () => {
      const stringResult: Result<string> = {
        success: true,
        data: 'hello',
      };

      const objectResult: Result<{ name: string }> = {
        success: true,
        data: { name: 'John' },
      };

      const arrayResult: Result<number[]> = {
        success: true,
        data: [1, 2, 3],
      };

      expect(isSuccess(stringResult)).toBe(true);
      expect(isSuccess(objectResult)).toBe(true);
      expect(isSuccess(arrayResult)).toBe(true);
    });

    it('should work with custom error types', () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string
        ) {
          super(message);
        }
      }

      const result: Result<number, CustomError> = {
        success: false,
        error: new CustomError('Failed', 'CUSTOM_ERROR'),
      };

      if (isFailure(result)) {
        expect(result.error.code).toBe('CUSTOM_ERROR');
      }
    });
  });

  describe('Custom matchers', () => {
    it('should work with toBeSuccess matcher', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
      };

      expect(result).toBeSuccess();
    });

    it('should work with toBeFailure matcher', () => {
      const result: Result<number> = {
        success: false,
        error: new Error('Failed'),
      };

      expect(result).toBeFailure();
    });

    it('should work with toHaveWarnings matcher', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Test warning',
            similarPatient: {
              id: 'patient_123' as any,
              mrn: '123456',
              name: 'John Doe',
            },
            similarityScore: 0.85,
          },
        ],
      };

      expect(result).toHaveWarnings();
    });

    it('should work with toHaveWarningType matcher', () => {
      const result: Result<number> = {
        success: true,
        data: 42,
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Test warning',
            similarPatient: {
              id: 'patient_123' as any,
              mrn: '123456',
              name: 'John Doe',
            },
            similarityScore: 0.85,
          },
        ],
      };

      expect(result).toHaveWarningType('SIMILAR_PATIENT');
    });
  });
});
