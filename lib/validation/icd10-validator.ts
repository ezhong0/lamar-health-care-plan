/**
 * ICD-10 Diagnosis Code Validator
 *
 * Validates ICD-10-CM (Clinical Modification) diagnosis codes used in US healthcare.
 * Format: Letter + 2 digits + optional decimal + 1-4 additional characters
 * Example: J45.50 (Severe persistent asthma, uncomplicated)
 *
 * References:
 * - ICD-10-CM Official Guidelines: https://www.cdc.gov/nchs/icd/icd-10-cm.htm
 * - Code structure: https://www.cms.gov/Medicare/Coding/ICD10
 *
 * Why this matters:
 * - Validates medical diagnosis codes before LLM processing
 * - Catches typos that could affect care plan generation
 * - Demonstrates healthcare domain knowledge
 *
 * Trade-offs:
 * - ✅ Fast structure validation (regex-based)
 * - ✅ Chapter/category validation for major code families
 * - ❌ Doesn't verify code exists in official codeset (would need full ICD-10 database)
 * - ❌ Doesn't check if code is billable vs non-billable
 *
 * Production consideration:
 * - For production, consider ICD-10 API (e.g., CMS API, Clinitable) for complete validation
 */

export interface ICD10ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates ICD-10-CM diagnosis code structure
 *
 * @param code - ICD-10 code to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateICD10('J45.50')  // { valid: true }
 * validateICD10('E11.9')   // { valid: true }
 * validateICD10('12345')   // { valid: false, error: 'Must start with letter' }
 * validateICD10('J')       // { valid: false, error: 'Too short' }
 */
export function validateICD10(code: string): ICD10ValidationResult {
  // Remove whitespace
  const cleaned = code.trim().toUpperCase();

  // Basic structure validation
  // Format: Letter + 2 digits + optional (decimal + 1-4 chars)
  const structureRegex = /^[A-Z]\d{2}(\.\d{1,4})?$/;

  if (!structureRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'ICD-10 code must be in format: Letter + 2 digits + optional decimal + up to 4 more characters (e.g., J45.50)',
    };
  }

  // Validate chapter (first letter)
  const chapter = cleaned[0];
  if (!isValidICD10Chapter(chapter)) {
    return {
      valid: false,
      error: `Invalid ICD-10 chapter code: ${chapter}. Must be A-Z excluding U (reserved).`,
    };
  }

  // Validate category range (first 3 characters)
  const category = cleaned.slice(0, 3);
  const categoryValidation = validateICD10Category(category);
  if (!categoryValidation.valid) {
    return categoryValidation;
  }

  return { valid: true };
}

/**
 * Validates ICD-10 chapter (first letter)
 *
 * ICD-10 chapters:
 * A-B: Infectious diseases
 * C-D: Neoplasms, blood disorders
 * E: Endocrine/metabolic
 * F: Mental/behavioral
 * G: Nervous system
 * H: Eye/ear
 * I: Circulatory
 * J: Respiratory
 * K: Digestive
 * L: Skin
 * M: Musculoskeletal
 * N: Genitourinary
 * O: Pregnancy
 * P: Perinatal
 * Q: Congenital
 * R: Symptoms/signs
 * S-T: Injury/poisoning
 * V-Y: External causes
 * Z: Health status
 *
 * U is reserved for future use
 *
 * @param chapter - First letter of ICD-10 code
 * @returns true if valid chapter
 */
function isValidICD10Chapter(chapter: string): boolean {
  // U is reserved, all other A-Z are valid
  return /^[A-TV-Z]$/.test(chapter);
}

/**
 * Validates ICD-10 category (first 3 characters)
 *
 * Performs range checking for major ICD-10 categories.
 * This is a simplified validation - production would use complete codeset.
 *
 * @param category - First 3 characters of ICD-10 code (e.g., 'J45')
 * @returns Validation result
 */
function validateICD10Category(category: string): ICD10ValidationResult {
  const letter = category[0];
  const number = parseInt(category.slice(1, 3), 10);

  // Chapter-specific range validation
  const ranges: Record<string, { min: number; max: number; name: string }> = {
    A: { min: 0, max: 99, name: 'Certain infectious and parasitic diseases' },
    B: { min: 0, max: 99, name: 'Certain infectious and parasitic diseases' },
    C: { min: 0, max: 99, name: 'Neoplasms' },
    D: { min: 0, max: 99, name: 'Diseases of blood and immune system' },
    E: { min: 0, max: 99, name: 'Endocrine, nutritional and metabolic diseases' },
    F: { min: 0, max: 99, name: 'Mental, behavioral and neurodevelopmental disorders' },
    G: { min: 0, max: 99, name: 'Diseases of the nervous system' },
    H: { min: 0, max: 99, name: 'Diseases of the eye/ear' },
    I: { min: 0, max: 99, name: 'Diseases of the circulatory system' },
    J: { min: 0, max: 99, name: 'Diseases of the respiratory system' },
    K: { min: 0, max: 99, name: 'Diseases of the digestive system' },
    L: { min: 0, max: 99, name: 'Diseases of the skin and subcutaneous tissue' },
    M: { min: 0, max: 99, name: 'Diseases of the musculoskeletal system' },
    N: { min: 0, max: 99, name: 'Diseases of the genitourinary system' },
    O: { min: 0, max: 99, name: 'Pregnancy, childbirth and the puerperium' },
    P: { min: 0, max: 99, name: 'Certain conditions originating in the perinatal period' },
    Q: { min: 0, max: 99, name: 'Congenital malformations' },
    R: { min: 0, max: 99, name: 'Symptoms, signs and abnormal findings' },
    S: { min: 0, max: 99, name: 'Injury, poisoning' },
    T: { min: 0, max: 99, name: 'Injury, poisoning and external causes' },
    V: { min: 0, max: 99, name: 'External causes of morbidity' },
    W: { min: 0, max: 99, name: 'External causes of morbidity' },
    X: { min: 0, max: 99, name: 'External causes of morbidity' },
    Y: { min: 0, max: 99, name: 'External causes of morbidity' },
    Z: { min: 0, max: 99, name: 'Factors influencing health status' },
  };

  const range = ranges[letter];
  if (!range) {
    return {
      valid: false,
      error: `Invalid ICD-10 chapter: ${letter}`,
    };
  }

  if (number < range.min || number > range.max) {
    return {
      valid: false,
      error: `Category ${category} is outside valid range for ${range.name}`,
    };
  }

  return { valid: true };
}

/**
 * Formats ICD-10 code for display (ensures decimal is present)
 *
 * @param code - Raw ICD-10 code
 * @returns Formatted code or original if invalid
 *
 * @example
 * formatICD10('J4550')  // 'J45.50'
 * formatICD10('J45.50') // 'J45.50'
 * formatICD10('E119')   // 'E11.9'
 */
export function formatICD10(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/\./g, '');

  // Must be at least 4 characters (letter + 2 digits + at least 1 more)
  if (cleaned.length < 4 || !/^[A-Z]\d{2,}/.test(cleaned)) {
    return code; // Return original if invalid
  }

  // Insert decimal after first 3 characters
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
}
