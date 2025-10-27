/**
 * Zod Validation Schemas
 *
 * Combines structural validation (Zod) with domain validation (NPI, ICD-10).
 * Provides compile-time types + runtime validation in a single source of truth.
 *
 * Why Zod:
 * - Type inference (don't repeat yourself)
 * - Composable refinements (domain-specific validation)
 * - Great error messages out of the box
 * - Runtime safety at API boundaries
 *
 * Pattern:
 * 1. Basic structure (Zod primitives)
 * 2. Domain refinements (.refine() with custom validators)
 * 3. Transform for normalization (.transform())
 */

import { z } from 'zod';
import { validateNPI } from './npi-validator';
import { validateICD10 } from './icd10-validator';

// ============================================================================
// Provider Schema
// ============================================================================

export const ProviderInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Provider name is required')
    .max(200, 'Provider name must be less than 200 characters')
    .trim(),
  npi: z
    .string()
    .trim()
    .superRefine((npi, ctx) => {
      const result = validateNPI(npi);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid NPI',
        });
      }
    }),
});

export type ProviderInput = z.infer<typeof ProviderInputSchema>;

// ============================================================================
// Patient Schema
// ============================================================================

export const PatientInputSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'First name must contain only letters, spaces, hyphens, and apostrophes'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name must contain only letters, spaces, hyphens, and apostrophes'),

  mrn: z
    .string()
    .min(1, 'MRN is required')
    .max(50, 'MRN must be less than 50 characters')
    .trim()
    .regex(/^[A-Za-z0-9-]+$/, 'MRN must contain only letters, numbers, and hyphens'),

  // Provider Information
  referringProvider: z
    .string()
    .min(1, 'Referring provider name is required')
    .max(200, 'Provider name must be less than 200 characters')
    .trim(),

  referringProviderNPI: z
    .string()
    .trim()
    .superRefine((npi, ctx) => {
      const result = validateNPI(npi);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid NPI',
        });
      }
    }),

  // Medical Information
  primaryDiagnosis: z
    .string()
    .trim()
    .superRefine((code, ctx) => {
      const result = validateICD10(code);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid ICD-10 diagnosis code',
        });
      }
    }),

  medicationName: z
    .string()
    .min(1, 'Medication name is required')
    .max(200, 'Medication name must be less than 200 characters')
    .trim(),

  additionalDiagnoses: z
    .array(
      z
        .string()
        .trim()
        .superRefine((code, ctx) => {
          const result = validateICD10(code);
          if (!result.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: result.error || 'Invalid ICD-10 diagnosis code',
            });
          }
        })
    )
    .refine((arr) => arr.length <= 10, {
      message: 'Maximum 10 additional diagnoses allowed',
    })
    .optional()
    .default([]),

  medicationHistory: z
    .array(z.string().trim().min(1, 'Medication name cannot be empty'))
    .refine((arr) => arr.length <= 20, {
      message: 'Maximum 20 medications in history allowed',
    })
    .optional()
    .default([]),

  patientRecords: z
    .string()
    .min(1, 'Patient records are required for care plan generation')
    .max(50000, 'Patient records must be less than 50,000 characters')
    .trim(),
});

export type PatientInput = z.infer<typeof PatientInputSchema>;

// ============================================================================
// Care Plan Generation Schema
// ============================================================================

export const GenerateCarePlanInputSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required').trim(),
});

export type GenerateCarePlanInput = z.infer<typeof GenerateCarePlanInputSchema>;

// ============================================================================
// Order Schema (for potential future use)
// ============================================================================

export const OrderInputSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  providerId: z.string().min(1, 'Provider ID is required'),
  medicationName: z.string().min(1, 'Medication name is required').max(200).trim(),
  primaryDiagnosis: z
    .string()
    .trim()
    .superRefine((code, ctx) => {
      const result = validateICD10(code);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid ICD-10 diagnosis code',
        });
      }
    }),
  status: z.enum(['pending', 'fulfilled', 'cancelled']).default('pending'),
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

// ============================================================================
// Helper: Format Zod Errors for User Display
// ============================================================================

/**
 * Formats Zod validation errors into user-friendly messages
 *
 * Zod errors are verbose and include full paths. This formats them
 * for display in UI (field name + error message).
 *
 * @param error - ZodError from schema.parse()
 * @returns Array of formatted error messages
 *
 * @example
 * try {
 *   PatientInputSchema.parse(input);
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     const messages = formatZodErrors(error);
 *     // ['First name: Must contain only letters', 'NPI: Invalid check digit']
 *   }
 * }
 */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((err) => {
    const field = err.path.join('.');
    return field ? `${field}: ${err.message}` : err.message;
  });
}

/**
 * Formats Zod errors into field-specific error object
 *
 * Useful for form validation where you need errors keyed by field name.
 *
 * @param error - ZodError from schema.parse()
 * @returns Object mapping field paths to error messages
 *
 * @example
 * {
 *   firstName: 'Must contain only letters',
 *   'additionalDiagnoses.0': 'Invalid ICD-10 code'
 * }
 */
export function formatZodErrorsAsObject(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const err of error.issues) {
    const path = err.path.join('.');
    result[path] = err.message;
  }

  return result;
}
