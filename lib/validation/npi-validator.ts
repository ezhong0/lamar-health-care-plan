/**
 * NPI (National Provider Identifier) Validator
 *
 * Validates 10-digit NPI numbers using the Luhn algorithm (mod 10 check digit).
 * NPI format: XXXXXXXXXX (10 digits)
 *
 * Algorithm source: CMS NPI standard (https://www.cms.gov/Regulations-and-Guidance/Administrative-Simplification/NationalProvIdentStand)
 *
 * Why this matters:
 * - Healthcare domain validation demonstrates attention to correctness
 * - Catches typos before database insertion
 * - Professional error messages for users
 *
 * Trade-offs:
 * - ✅ Prevents invalid NPIs at input validation layer
 * - ✅ Fast (O(n) where n=10, so O(1))
 * - ❌ Doesn't verify NPI is registered with CMS (would need external API)
 */

export interface NPIValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an NPI using structure check and Luhn algorithm
 *
 * @param npi - The NPI to validate (string, may contain whitespace/dashes)
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateNPI('1234567893') // { valid: true }
 * validateNPI('1234567890') // { valid: false, error: '...' }
 * validateNPI('123-456-789') // { valid: false, error: 'Must be 10 digits' }
 */
export function validateNPI(npi: string): NPIValidationResult {
  // Remove common formatting characters
  const cleaned = npi.replace(/[\s-]/g, '');

  // Check if it's 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'NPI must be exactly 10 digits',
    };
  }

  // Verify using Luhn algorithm (mod 10 check digit)
  if (!luhnCheck(cleaned)) {
    return {
      valid: false,
      error: 'NPI check digit is invalid (failed Luhn algorithm)',
    };
  }

  return { valid: true };
}

/**
 * Luhn algorithm (mod 10 check digit) implementation
 *
 * Used for validating credit cards, NPIs, and other identification numbers.
 *
 * Algorithm:
 * 1. Add constant prefix "80840" to NPI (CMS standard for NPI Type 1)
 * 2. Double every other digit from right to left
 * 3. If doubled digit > 9, subtract 9
 * 4. Sum all digits
 * 5. Check if sum % 10 === 0
 *
 * @param npi - 10-digit NPI string
 * @returns true if check digit is valid
 *
 * @example
 * luhnCheck('1234567893') // true
 * luhnCheck('1234567890') // false
 */
function luhnCheck(npi: string): boolean {
  // NPI Type 1 prefix per CMS standard
  const prefixed = '80840' + npi;

  let sum = 0;
  let shouldDouble = false;

  // Process from right to left
  for (let i = prefixed.length - 1; i >= 0; i--) {
    let digit = parseInt(prefixed[i], 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Formats an NPI for display
 *
 * @param npi - Raw NPI string
 * @returns Formatted NPI (XXX-XXX-XXXX) or original if invalid format
 *
 * @example
 * formatNPI('1234567893') // '123-456-7893'
 */
export function formatNPI(npi: string): string {
  const cleaned = npi.replace(/[\s-]/g, '');

  if (!/^\d{10}$/.test(cleaned)) {
    return npi; // Return original if not valid format
  }

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}
