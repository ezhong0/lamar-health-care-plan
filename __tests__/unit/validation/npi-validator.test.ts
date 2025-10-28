/**
 * Unit Tests: NPI Validator
 *
 * Tests National Provider Identifier (NPI) validation using Luhn algorithm.
 * Includes valid NPIs, invalid checksums, format errors, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { validateNPI, formatNPI } from '@/lib/validation/npi-validator';

describe('NPI Validator', () => {
  describe('validateNPI - Valid NPIs', () => {
    it('should accept valid 10-digit NPI', () => {
      // Real valid NPI (passes Luhn checksum)
      const result = validateNPI('1234567893');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept NPI with dashes', () => {
      const result = validateNPI('123-456-7893');

      expect(result.valid).toBe(true);
    });

    it('should accept NPI with spaces', () => {
      const result = validateNPI('123 456 7893');

      expect(result.valid).toBe(true);
    });

    it('should accept NPI with mixed formatting', () => {
      const result = validateNPI('123-456 7893');

      expect(result.valid).toBe(true);
    });
  });

  describe('validateNPI - Invalid Format', () => {
    it('should reject NPI with less than 10 digits', () => {
      const result = validateNPI('123456789');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });

    it('should reject NPI with more than 10 digits', () => {
      const result = validateNPI('12345678901');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });

    it('should reject NPI with letters', () => {
      const result = validateNPI('123456789A');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });

    it('should reject NPI with special characters (except dash and space)', () => {
      const result = validateNPI('1234567893!');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });

    it('should reject empty string', () => {
      const result = validateNPI('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });

    it('should reject NPI with only spaces', () => {
      const result = validateNPI('          ');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI must be exactly 10 digits');
    });
  });

  describe('validateNPI - Invalid Checksum', () => {
    it('should reject NPI with incorrect check digit', () => {
      // Last digit should be 3, not 0
      const result = validateNPI('1234567890');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('NPI check digit is invalid (failed Luhn algorithm)');
    });

    it('should reject NPI where one digit is wrong', () => {
      // Changed middle digit from valid NPI
      const result = validateNPI('1234567993');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Luhn algorithm');
    });

    it('should reject sequential numbers', () => {
      const result = validateNPI('1234567890');

      expect(result.valid).toBe(false);
    });

    it('should reject all zeros', () => {
      const result = validateNPI('0000000000');

      expect(result.valid).toBe(false);
    });

    it('should reject all nines', () => {
      const result = validateNPI('9999999999');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateNPI - Edge Cases', () => {
    it('should handle NPI with leading zeros', () => {
      // Valid NPI starting with 0
      const result = validateNPI('0123456789');

      // Will fail checksum, but format is accepted
      expect(result.valid).toBe(false);
    });

    it('should normalize whitespace before validation', () => {
      const result = validateNPI('  1234567893  ');

      expect(result.valid).toBe(true);
    });

    it('should handle multiple spaces between digits', () => {
      const result = validateNPI('123  456  7893');

      expect(result.valid).toBe(true);
    });

    it('should handle tabs and newlines', () => {
      const result = validateNPI('123\t456\n7893');

      // \s in regex matches \t and \n, so they get stripped and it validates
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNPI - Real-world NPIs', () => {
    it('should validate known good NPIs from test data', () => {
      const goodNPIs = [
        '1234567893', // Valid NPI with correct checksum
        // Only including NPIs we've verified pass
      ];

      goodNPIs.forEach((npi) => {
        const result = validateNPI(npi);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject known bad NPIs', () => {
      const badNPIs = [
        '1234567890', // Wrong check digit
        '1234567891', // Wrong check digit
        '1234567892', // Wrong check digit
        '1111111111', // Repeating digit
      ];

      badNPIs.forEach((npi) => {
        const result = validateNPI(npi);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('formatNPI', () => {
    it('should format valid NPI with dashes', () => {
      const formatted = formatNPI('1234567893');

      expect(formatted).toBe('123-456-7893');
    });

    it('should handle already formatted NPI', () => {
      const formatted = formatNPI('123-456-7893');

      // Removes dashes then reformats
      expect(formatted).toBe('123-456-7893');
    });

    it('should return original for invalid length', () => {
      const formatted = formatNPI('12345');

      expect(formatted).toBe('12345');
    });

    it('should return original for non-numeric', () => {
      const formatted = formatNPI('ABCDEFGHIJ');

      expect(formatted).toBe('ABCDEFGHIJ');
    });

    it('should handle NPI with spaces', () => {
      const formatted = formatNPI('123 456 7893');

      expect(formatted).toBe('123-456-7893');
    });

    it('should handle empty string', () => {
      const formatted = formatNPI('');

      expect(formatted).toBe('');
    });
  });

  describe('Luhn Algorithm Implementation', () => {
    it('should correctly validate known Luhn-valid numbers', () => {
      // These NPIs have been validated with the Luhn algorithm
      const validNPIs = [
        '1234567893', // Verified valid checksum
      ];

      validNPIs.forEach((npi) => {
        expect(validateNPI(npi).valid).toBe(true);
      });
    });

    it('should reject NPIs with single digit error', () => {
      // Start with valid NPI, change one digit
      const validNPI = '1234567893';
      const invalidNPI = '1234567993'; // Changed 8 to 9

      expect(validateNPI(validNPI).valid).toBe(true);
      expect(validateNPI(invalidNPI).valid).toBe(false);
    });

    it('should reject NPIs with transposed digits', () => {
      // Start with valid NPI, transpose two digits
      const validNPI = '1234567893';
      const invalidNPI = '1234576893'; // Swapped 6 and 7

      expect(validateNPI(validNPI).valid).toBe(true);
      expect(validateNPI(invalidNPI).valid).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should validate quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        validateNPI('1234567893');
      }

      const duration = Date.now() - start;

      // Should complete 1000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
