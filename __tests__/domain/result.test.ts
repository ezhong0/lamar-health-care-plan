/**
 * Tests for Result type and utilities
 *
 * The Result type is fundamental to our error handling strategy.
 * These tests ensure type-safe success/failure discrimination.
 */

import { describe, it, expect } from 'vitest';
import { isSuccess, isFailure, type Result } from '@/lib/domain/result';
import type { Warning } from '@/lib/domain/warnings';
import type { PatientId } from '@/lib/domain/types';

describe('Result type utilities', () => {
  describe('isSuccess type guard', () => {
    it('returns true for success results', () => {
      const result: Result<{ id: string }> = {
        success: true,
        data: { id: 'patient-1' },
      };

      expect(isSuccess(result)).toBe(true);
    });

    it('returns false for failure results', () => {
      const result: Result<{ id: string }> = {
        success: false,
        error: new Error('Failed'),
      };

      expect(isSuccess(result)).toBe(false);
    });

    it('narrows type to Success when true', () => {
      const result: Result<{ id: string }> = {
        success: true,
        data: { id: 'patient-1' },
      };

      if (isSuccess(result)) {
        // TypeScript should know result.data exists
        expect(result.data.id).toBe('patient-1');
        // @ts-expect-error - error should not exist on Success type
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe('isFailure type guard', () => {
    it('returns true for failure results', () => {
      const result: Result<{ id: string }> = {
        success: false,
        error: new Error('Failed'),
      };

      expect(isFailure(result)).toBe(true);
    });

    it('returns false for success results', () => {
      const result: Result<{ id: string }> = {
        success: true,
        data: { id: 'patient-1' },
      };

      expect(isFailure(result)).toBe(false);
    });

    it('narrows type to Failure when true', () => {
      const result: Result<{ id: string }> = {
        success: false,
        error: new Error('Failed'),
      };

      if (isFailure(result)) {
        // TypeScript should know result.error exists
        expect(result.error.message).toBe('Failed');
        // @ts-expect-error - data should not exist on Failure type
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('Result with warnings', () => {
    it('success result can include warnings', () => {
      const warnings: Warning[] = [
        {
          type: 'SIMILAR_PATIENT',
          severity: 'medium',
          message: 'Similar patient found',
          similarPatient: {
            id: 'existing-1' as PatientId,
            mrn: '000123',
            name: 'John Smith',
          },
          similarityScore: 0.85,
        },
      ];

      const result: Result<{ id: string }> = {
        success: true,
        data: { id: 'patient-1' },
        warnings,
      };

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings![0].type).toBe('SIMILAR_PATIENT');
      }
    });
  });

  describe('Result with custom error types', () => {
    class CustomError extends Error {
      constructor(
        message: string,
        public code: string
      ) {
        super(message);
      }
    }

    it('works with custom error types', () => {
      const result: Result<{ id: string }, CustomError> = {
        success: false,
        error: new CustomError('Custom failure', 'CUSTOM_ERROR'),
      };

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.code).toBe('CUSTOM_ERROR');
      }
    });
  });
});
