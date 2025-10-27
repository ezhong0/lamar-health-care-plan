/**
 * Zod Schema Tests
 *
 * Tests integrated validation schemas that combine:
 * - Structural validation (Zod)
 * - Domain validation (NPI, ICD-10)
 *
 * Focus on ensuring schema correctly rejects/accepts based on domain rules.
 */

import { describe, it, expect } from 'vitest';
import { PatientInputSchema, ProviderInputSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('PatientInputSchema', () => {
    const validInput = {
      firstName: 'John',
      lastName: 'Smith',
      mrn: 'MRN12345',
      referringProvider: 'Dr. Jane Doe',
      referringProviderNPI: '1234567893', // Valid NPI
      primaryDiagnosis: 'J45.50', // Valid ICD-10
      medicationName: 'IVIG',
      additionalDiagnoses: ['E11.9'], // Valid ICD-10
      medicationHistory: ['Prednisone', 'Metformin'],
      patientRecords: 'Patient has history of asthma...',
    };

    describe('valid inputs', () => {
      it('accepts valid patient input', () => {
        const result = PatientInputSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });

      it('accepts minimal required fields', () => {
        const minimal = {
          firstName: 'John',
          lastName: 'Smith',
          mrn: 'MRN001',
          referringProvider: 'Dr. Doe',
          referringProviderNPI: '1234567893',
          primaryDiagnosis: 'J45.50',
          medicationName: 'IVIG',
          patientRecords: 'Patient records here.',
        };

        const result = PatientInputSchema.safeParse(minimal);
        expect(result.success).toBe(true);

        if (result.success) {
          // Arrays should default to empty
          expect(result.data.additionalDiagnoses).toEqual([]);
          expect(result.data.medicationHistory).toEqual([]);
        }
      });

      it('trims whitespace from string fields', () => {
        const input = {
          ...validInput,
          firstName: '  John  ',
          lastName: '  Smith  ',
        };

        const result = PatientInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.firstName).toBe('John');
          expect(result.data.lastName).toBe('Smith');
        }
      });
    });

    describe('invalid inputs - structural', () => {
      it('rejects missing required fields', () => {
        const result = PatientInputSchema.safeParse({});
        expect(result.success).toBe(false);

        if (!result.success) {
          const errors = result.error.issues;
          expect(errors.some((e: any) => e.path.includes('firstName'))).toBe(true);
          expect(errors.some((e: any) => e.path.includes('lastName'))).toBe(true);
          expect(errors.some((e: any) => e.path.includes('mrn'))).toBe(true);
        }
      });

      it('rejects invalid name characters', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          firstName: 'John123', // Numbers not allowed
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('letters');
        }
      });

      it('rejects names that are too long', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          firstName: 'A'.repeat(101), // Max 100 characters
        });

        expect(result.success).toBe(false);
      });

      it('rejects invalid MRN format', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          mrn: 'MRN!@#$', // Special characters not allowed
        });

        expect(result.success).toBe(false);
      });

      it('rejects too many additional diagnoses', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          additionalDiagnoses: Array(11).fill('J45.50'), // Max 10
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('Maximum 10');
        }
      });

      it('rejects too many medications in history', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          medicationHistory: Array(21).fill('Medication'), // Max 20
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('Maximum 20');
        }
      });
    });

    describe('invalid inputs - domain validation', () => {
      it('rejects invalid NPI checksum', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          referringProviderNPI: '1234567890', // Invalid checksum
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('NPI');
        }
      });

      it('rejects invalid ICD-10 code', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          primaryDiagnosis: 'INVALID', // Not ICD-10 format
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('ICD-10');
        }
      });

      it('rejects invalid ICD-10 in additional diagnoses', () => {
        const result = PatientInputSchema.safeParse({
          ...validInput,
          additionalDiagnoses: ['J45.50', 'INVALID'], // Second one invalid
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const errorMessages = result.error.issues.map((e: any) => e.message).join(' ');
          expect(errorMessages).toContain('ICD-10');
        }
      });
    });
  });

  describe('ProviderInputSchema', () => {
    it('accepts valid provider input', () => {
      const result = ProviderInputSchema.safeParse({
        name: 'Dr. Jane Doe',
        npi: '1234567893',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid NPI', () => {
      const result = ProviderInputSchema.safeParse({
        name: 'Dr. Jane Doe',
        npi: '1234567890', // Invalid checksum
      });

      expect(result.success).toBe(false);
    });

    it('trims whitespace from fields', () => {
      const result = ProviderInputSchema.safeParse({
        name: '  Dr. Jane Doe  ',
        npi: '  1234567893  ',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Dr. Jane Doe');
        expect(result.data.npi).toBe('1234567893');
      }
    });

    it('rejects empty name', () => {
      const result = ProviderInputSchema.safeParse({
        name: '',
        npi: '1234567893',
      });

      expect(result.success).toBe(false);
    });

    it('rejects name that is too long', () => {
      const result = ProviderInputSchema.safeParse({
        name: 'Dr. ' + 'A'.repeat(200),
        npi: '1234567893',
      });

      expect(result.success).toBe(false);
    });
  });
});
