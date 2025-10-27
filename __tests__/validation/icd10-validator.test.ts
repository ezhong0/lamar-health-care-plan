/**
 * ICD-10 Validator Tests
 *
 * Tests ICD-10 code structure validation.
 * Covers:
 * - Valid codes from different chapters
 * - Invalid structure
 * - Chapter validation
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { validateICD10, formatICD10 } from '@/lib/validation/icd10-validator';

describe('ICD-10 Validator', () => {
  describe('validateICD10', () => {
    describe('valid codes', () => {
      it('validates common ICD-10 codes', () => {
        const validCodes = [
          'J45.50', // Asthma
          'E11.9', // Type 2 diabetes
          'I10', // Essential hypertension
          'G70.00', // Myasthenia gravis
          'M79.3', // Panniculitis
          'N18.3', // Chronic kidney disease
          'C50.9', // Malignant neoplasm of breast
          'F41.1', // Generalized anxiety disorder
        ];

        for (const code of validCodes) {
          const result = validateICD10(code);
          expect(result.valid).toBe(true, `Expected ${code} to be valid`);
          expect(result.error).toBeUndefined();
        }
      });

      it('validates codes without decimal', () => {
        const result = validateICD10('I10');
        expect(result.valid).toBe(true);
      });

      it('validates codes with multiple decimal digits', () => {
        const result1 = validateICD10('J45.50');
        expect(result1.valid).toBe(true);

        const result2 = validateICD10('G70.001');
        expect(result2.valid).toBe(true);

        const result3 = validateICD10('M79.1234'); // Max 4 digits after decimal
        expect(result3.valid).toBe(true);
      });

      it('handles case-insensitive input', () => {
        const result = validateICD10('j45.50');
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid codes', () => {
      it('rejects codes with invalid structure', () => {
        const result1 = validateICD10('123'); // No letter
        expect(result1.valid).toBe(false);

        const result2 = validateICD10('ABC'); // All letters
        expect(result2.valid).toBe(false);

        const result3 = validateICD10('J4'); // Too short
        expect(result3.valid).toBe(false);

        const result4 = validateICD10('J45'); // Missing decimal for 3-char code
        // This is actually valid (3 chars without decimal is ok)
        expect(result4.valid).toBe(true);
      });

      it('rejects codes with too many decimal digits', () => {
        const result = validateICD10('J45.12345'); // More than 4 after decimal
        expect(result.valid).toBe(false);
      });

      it('rejects reserved chapter U', () => {
        const result = validateICD10('U00.0');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('chapter code: U');
      });

      it('rejects empty code', () => {
        const result = validateICD10('');
        expect(result.valid).toBe(false);
      });

      it('rejects codes with special characters', () => {
        const result1 = validateICD10('J45@50');
        expect(result1.valid).toBe(false);

        const result2 = validateICD10('J45.5!');
        expect(result2.valid).toBe(false);
      });
    });

    describe('chapter validation', () => {
      it('accepts codes from all valid chapters', () => {
        const chapters = [
          'A00.0', // Infectious
          'B00.0', // Infectious
          'C00.0', // Neoplasms
          'D00.0', // Blood
          'E00.0', // Endocrine
          'F00.0', // Mental
          'G00.0', // Nervous
          'H00.0', // Eye/ear
          'I00.0', // Circulatory
          'J00.0', // Respiratory
          'K00.0', // Digestive
          'L00.0', // Skin
          'M00.0', // Musculoskeletal
          'N00.0', // Genitourinary
          'O00.0', // Pregnancy
          'P00.0', // Perinatal
          'Q00.0', // Congenital
          'R00.0', // Symptoms
          'S00.0', // Injury
          'T00.0', // Injury
          'V00.0', // External causes
          'W00.0', // External causes
          'X00.0', // External causes
          'Y00.0', // External causes
          'Z00.0', // Health status
        ];

        for (const code of chapters) {
          const result = validateICD10(code);
          expect(result.valid).toBe(true, `Expected ${code} to be valid`);
        }
      });
    });

    describe('edge cases', () => {
      it('trims whitespace', () => {
        const result = validateICD10('  J45.50  ');
        expect(result.valid).toBe(true);
      });

      it('handles codes at chapter boundaries', () => {
        const result1 = validateICD10('J00.0'); // Start of respiratory
        expect(result1.valid).toBe(true);

        const result2 = validateICD10('J99.0'); // End of respiratory
        expect(result2.valid).toBe(true);
      });
    });
  });

  describe('formatICD10', () => {
    it('adds decimal to code without one', () => {
      expect(formatICD10('J4550')).toBe('J45.50');
      expect(formatICD10('E119')).toBe('E11.9');
    });

    it('preserves already formatted code', () => {
      expect(formatICD10('J45.50')).toBe('J45.50');
    });

    it('returns original for invalid format', () => {
      expect(formatICD10('ABC')).toBe('ABC');
      expect(formatICD10('12')).toBe('12');
    });

    it('handles case conversion', () => {
      expect(formatICD10('j4550')).toBe('J45.50');
    });
  });
});
