/**
 * NPI Validator Tests
 *
 * Tests NPI validation using Luhn algorithm.
 * Test cases include:
 * - Valid NPIs (real-world examples)
 * - Invalid check digits
 * - Invalid formats
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { validateNPI, formatNPI } from '@/lib/validation/npi-validator';

describe('NPI Validator', () => {
  describe('validateNPI', () => {
    describe('valid NPIs', () => {
      it('validates correct NPI with valid checksum', () => {
        // Real NPI examples with valid Luhn checksums
        const validNPIs = [
          '1234567893', // Valid checksum
          '1245319599', // Valid checksum
          '1679576722', // Valid checksum
        ];

        for (const npi of validNPIs) {
          const result = validateNPI(npi);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      });

      it('validates NPI with formatting (dashes, spaces)', () => {
        const result1 = validateNPI('123-456-7893');
        expect(result1.valid).toBe(true);

        const result2 = validateNPI('123 456 7893');
        expect(result2.valid).toBe(true);

        const result3 = validateNPI('  1234567893  ');
        expect(result3.valid).toBe(true);
      });
    });

    describe('invalid NPIs', () => {
      it('rejects NPI with invalid checksum', () => {
        const result = validateNPI('1234567890'); // Invalid checksum
        expect(result.valid).toBe(false);
        expect(result.error).toContain('check digit is invalid');
      });

      it('rejects NPI with wrong length', () => {
        const result1 = validateNPI('123456789'); // Too short
        expect(result1.valid).toBe(false);
        expect(result1.error).toContain('exactly 10 digits');

        const result2 = validateNPI('12345678901'); // Too long
        expect(result2.valid).toBe(false);
        expect(result2.error).toContain('exactly 10 digits');
      });

      it('rejects NPI with non-digit characters', () => {
        const result1 = validateNPI('123456789A');
        expect(result1.valid).toBe(false);
        expect(result1.error).toContain('exactly 10 digits');

        const result2 = validateNPI('12345678!@');
        expect(result2.valid).toBe(false);
      });

      it('rejects empty string', () => {
        const result = validateNPI('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exactly 10 digits');
      });

      it('rejects NPI with letters', () => {
        const result = validateNPI('ABCDEFGHIJ');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exactly 10 digits');
      });
    });

    describe('edge cases', () => {
      it('handles all zeros', () => {
        const result = validateNPI('0000000000');
        // Will fail Luhn check
        expect(result.valid).toBe(false);
      });

      it('handles all nines', () => {
        const result = validateNPI('9999999999');
        // Will fail Luhn check
        expect(result.valid).toBe(false);
      });

      it('trims whitespace correctly', () => {
        const result = validateNPI('  1234567893  ');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('formatNPI', () => {
    it('formats valid NPI with dashes', () => {
      expect(formatNPI('1234567893')).toBe('123-456-7893');
    });

    it('preserves already formatted NPI', () => {
      expect(formatNPI('123-456-7893')).toBe('123-456-7893');
    });

    it('returns original for invalid format', () => {
      expect(formatNPI('123')).toBe('123');
      expect(formatNPI('ABCDEFGHIJ')).toBe('ABCDEFGHIJ');
    });

    it('formats NPI with existing formatting', () => {
      // Removes old formatting, adds new
      expect(formatNPI('123 456 7893')).toBe('123-456-7893');
    });
  });
});
