/**
 * Client-side API error class
 *
 * Represents errors returned from API endpoints with structured error information.
 * This provides type-safe error handling for client-side API calls.
 *
 * Why this exists:
 * - Type-safe alternative to using `any` for API errors
 * - Structured error information (code, details) accessible via properties
 * - Consistent error handling across all API calls
 * - Better developer experience with autocomplete
 *
 * @example
 * try {
 *   await createPatient(data);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.log(error.code); // Type-safe access
 *     console.log(error.details); // Type-safe access
 *   }
 * }
 */
export class ApiError extends Error {
  /**
   * Machine-readable error code (e.g., 'VALIDATION_ERROR', 'DUPLICATE_PATIENT')
   */
  public readonly code?: string;

  /**
   * Additional error details (field-level errors, context, etc.)
   */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (V8 engines only)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if this is a specific error code
   *
   * @example
   * if (error.isCode('DUPLICATE_PATIENT')) {
   *   // Handle duplicate patient specifically
   * }
   */
  isCode(code: string): boolean {
    return this.code === code;
  }

  /**
   * Get a user-friendly error message
   * Falls back to generic message if code-specific message not found
   */
  getUserMessage(): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      DUPLICATE_PATIENT: 'A patient with this information already exists.',
      PATIENT_NOT_FOUND: 'Patient not found.',
      PROVIDER_CONFLICT: 'Provider information conflict. Please verify NPI and name.',
      CARE_PLAN_GENERATION_FAILED: 'Failed to generate care plan. Please try again.',
      CONFIGURATION_ERROR: 'System configuration error. Please contact support.',
    };

    return messages[this.code || ''] || this.message;
  }
}
