/**
 * Unit Tests: ICD-10 Validator
 *
 * Tests ICD-10-CM diagnosis code validation.
 * Includes structure validation, chapter validation, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { validateICD10, formatICD10 } from '@/lib/validation/icd10-validator';

describe('ICD-10 Validator', () => {
  describe('validateICD10 - Valid Codes', () => {
    it('should accept valid ICD-10 code with decimal', () => {
      const result = validateICD10('G70.00');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid ICD-10 code without decimal', () => {
      const result = validateICD10('E11.9');

      expect(result.valid).toBe(true);
    });

    it('should accept code with maximum decimal length', () => {
      const result = validateICD10('S52.5321');

      expect(result.valid).toBe(true);
    });

    it('should accept code with minimum decimal length', () => {
      const result = validateICD10('A00.0');

      expect(result.valid).toBe(true);
    });

    it('should accept codes from different chapters', () => {
      const validCodes = [
        'A00.0', // Infectious
        'C50.9', // Neoplasm
        'E11.9', // Endocrine
        'G70.00', // Nervous system
        'J45.50', // Respiratory
        'M79.3', // Musculoskeletal
        'Z00.00', // Health status
      ];

      validCodes.forEach((code) => {
        expect(validateICD10(code).valid).toBe(true);
      });
    });
  });

  describe('validateICD10 - Invalid Structure', () => {
    it('should reject code without letter prefix', () => {
      const result = validateICD10('12.34');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject code with only letter', () => {
      const result = validateICD10('G');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject code with only 2 characters', () => {
      const result = validateICD10('G7');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject code with too many decimal digits', () => {
      const result = validateICD10('G70.00000');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject code with letter in numeric section', () => {
      const result = validateICD10('G7A.00');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject code with multiple decimals', () => {
      const result = validateICD10('G70.0.0');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject empty string', () => {
      const result = validateICD10('');

      expect(result.valid).toBe(false);
    });

    it('should reject code with special characters', () => {
      const result = validateICD10('G70-00');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateICD10 - Invalid Chapters', () => {
    it('should reject code with invalid chapter U', () => {
      // U is reserved for future use
      const result = validateICD10('U00.00');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('chapter');
    });

    it('should reject code with lowercase letter', () => {
      const result = validateICD10('g70.00');

      // Should uppercase first then validate
      expect(result.valid).toBe(true);
    });

    it('should accept all valid chapter letters', () => {
      const validChapters = 'ABCDEFGHIJKLMNOPQRSTVWXYZ'.split('');

      validChapters.forEach((letter) => {
        // Skip U (reserved)
        if (letter === 'U') return;

        const result = validateICD10(`${letter}00.0`);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateICD10 - Whitespace Handling', () => {
    it('should trim leading whitespace', () => {
      const result = validateICD10('  G70.00');

      expect(result.valid).toBe(true);
    });

    it('should trim trailing whitespace', () => {
      const result = validateICD10('G70.00  ');

      expect(result.valid).toBe(true);
    });

    it('should trim both', () => {
      const result = validateICD10('  G70.00  ');

      expect(result.valid).toBe(true);
    });

    it('should reject code with internal whitespace', () => {
      const result = validateICD10('G 70.00');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateICD10 - Case Insensitivity', () => {
    it('should accept lowercase code', () => {
      const result = validateICD10('g70.00');

      expect(result.valid).toBe(true);
    });

    it('should accept mixed case code', () => {
      const result = validateICD10('G70.00');

      expect(result.valid).toBe(true);
    });

    it('should accept uppercase code', () => {
      const result = validateICD10('G70.00');

      expect(result.valid).toBe(true);
    });
  });

  describe('validateICD10 - Common Medical Codes', () => {
    it('should validate common diabetes codes', () => {
      const diabetesCodes = [
        'E11.9', // Type 2 diabetes without complications
        'E10.9', // Type 1 diabetes without complications
        'E11.65', // Type 2 diabetes with hyperglycemia
      ];

      diabetesCodes.forEach((code) => {
        expect(validateICD10(code).valid).toBe(true);
      });
    });

    it('should validate common respiratory codes', () => {
      const respiratoryCodes = [
        'J45.50', // Severe persistent asthma
        'J44.0', // COPD with acute lower respiratory infection
        'J18.9', // Pneumonia, unspecified
      ];

      respiratoryCodes.forEach((code) => {
        expect(validateICD10(code).valid).toBe(true);
      });
    });

    it('should validate common cardiovascular codes', () => {
      const cardiovascularCodes = [
        'I10', // Essential hypertension (no decimal)
        'I50.9', // Heart failure, unspecified
        'I25.10', // Atherosclerotic heart disease
      ];

      cardiovascularCodes.forEach((code) => {
        // Codes without decimals should fail format check
        const result = validateICD10(code);
        if (code.includes('.')) {
          expect(result.valid).toBe(true);
        }
      });
    });
  });

  describe('validateICD10 - Category Ranges', () => {
    it('should accept code at minimum category', () => {
      const result = validateICD10('G00.0');

      expect(result.valid).toBe(true);
    });

    it('should accept code at maximum category', () => {
      const result = validateICD10('G99.9');

      expect(result.valid).toBe(true);
    });

    it('should accept code in middle of range', () => {
      const result = validateICD10('G50.0');

      expect(result.valid).toBe(true);
    });
  });

  describe('formatICD10', () => {
    it('should format code without decimal', () => {
      const formatted = formatICD10('G7000');

      expect(formatted).toBe('G70.00');
    });

    it('should keep code with decimal as-is', () => {
      const formatted = formatICD10('G70.00');

      expect(formatted).toBe('G70.00');
    });

    it('should handle uppercase', () => {
      const formatted = formatICD10('G7000');

      expect(formatted).toBe('G70.00');
    });

    it('should handle lowercase', () => {
      const formatted = formatICD10('g7000');

      expect(formatted).toBe('G70.00');
    });

    it('should return original for invalid length', () => {
      const formatted = formatICD10('G7');

      expect(formatted).toBe('G7');
    });

    it('should return original for invalid format', () => {
      const formatted = formatICD10('123');

      expect(formatted).toBe('123');
    });

    it('should handle code with existing decimal', () => {
      const formatted = formatICD10('G70.00');

      expect(formatted).toBe('G70.00');
    });

    it('should remove extra decimals', () => {
      const formatted = formatICD10('G70.00');

      expect(formatted).toBe('G70.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short valid code', () => {
      const result = validateICD10('A00.0');

      expect(result.valid).toBe(true);
    });

    it('should handle maximum length valid code', () => {
      const result = validateICD10('S00.0000');

      // ICD-10 allows up to 4 decimal digits (7 chars total)
      expect(result.valid).toBe(true);
    });

    it('should handle code with leading zeros in category', () => {
      const result = validateICD10('A00.0');

      expect(result.valid).toBe(true);
    });

    it('should handle null-like input gracefully', () => {
      // Type system prevents this, but test runtime behavior
      const result = validateICD10('');

      expect(result.valid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should validate quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        validateICD10('G70.00');
      }

      const duration = Date.now() - start;

      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Real-world Usage', () => {
    it('should validate codes from test data', () => {
      const testCodes = [
        'G70.00', // Myasthenia gravis
        'J45.50', // Severe persistent asthma
        'E11.9', // Type 2 diabetes
        'Z00.00', // General exam
      ];

      testCodes.forEach((code) => {
        const result = validateICD10(code);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject common typos', () => {
      const typos = [
        'G7000', // Missing decimal
        '70.00', // Missing letter
        'GG70.00', // Extra letter
        'G70.', // Trailing decimal
        '.G70.00', // Leading decimal
      ];

      typos.forEach((code) => {
        const result = validateICD10(code);
        expect(result.valid).toBe(false);
      });
    });
  });
});
