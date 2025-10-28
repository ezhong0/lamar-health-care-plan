/**
 * Debug Utility
 *
 * Environment-based logging for development.
 * Prevents committing console.logs to production.
 *
 * Usage:
 *   import { debug } from '@/lib/utils/debug';
 *
 *   debug('Patient Input', patientData);
 *   debug('Validation Result', validationResult);
 *
 * Enable debugging:
 *   DEBUG=true npm run dev
 *
 * Disable (default):
 *   npm run dev
 */

const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';

/**
 * Debug log with label and structured data
 *
 * Only logs when DEBUG=true environment variable is set.
 * Automatically formats objects as JSON for readability.
 *
 * @param label - Category or identifier for the log
 * @param data - Data to log (will be JSON stringified if object)
 * @param opts - Optional formatting options
 *
 * @example
 * debug('API Request', { method: 'POST', url: '/api/patients' });
 * // Output: 🔍 [API Request] {
 * //   "method": "POST",
 * //   "url": "/api/patients"
 * // }
 */
export function debug(label: string, data?: unknown, opts?: { color?: string; stringify?: boolean }): void {
  if (!DEBUG) return;

  const color = opts?.color || '🔍';
  const stringify = opts?.stringify ?? true;

  if (data === undefined) {
    console.log(`${color} [${label}]`);
    return;
  }

  if (stringify && typeof data === 'object' && data !== null) {
    console.log(`${color} [${label}]`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${color} [${label}]`, data);
  }
}

/**
 * Debug timing utility
 *
 * Measures execution time of a function.
 *
 * @example
 * const result = await debugTime('Database Query', async () => {
 *   return await db.patient.findMany();
 * });
 */
export async function debugTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!DEBUG) return fn();

  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;

  console.log(`⏱️  [${label}] ${duration}ms`);

  return result;
}

/**
 * Debug error with full context
 *
 * Logs error with stack trace (only in debug mode).
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   debugError('Risky Operation Failed', error);
 * }
 */
export function debugError(label: string, error: unknown): void {
  if (!DEBUG) return;

  console.error(`❌ [${label}]`);

  if (error instanceof Error) {
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  } else {
    console.error('Error:', error);
  }
}

/**
 * Debug group (collapsible logs)
 *
 * Groups related logs together.
 *
 * @example
 * debugGroup('Patient Creation', () => {
 *   debug('Input', patientInput);
 *   debug('Validation', validationResult);
 *   debug('Database', dbResult);
 * });
 */
export function debugGroup(label: string, fn: () => void): void {
  if (!DEBUG) return;

  console.group(`📦 [${label}]`);
  fn();
  console.groupEnd();
}

/**
 * Debug table (for arrays of objects)
 *
 * Displays data in table format (works in browser console).
 *
 * @example
 * debugTable('Patients', patients);
 */
export function debugTable(label: string, data: unknown[]): void {
  if (!DEBUG) return;

  console.log(`📊 [${label}]`);
  console.table(data);
}

/**
 * Production-safe assertion
 *
 * Only throws in development, logs error in production.
 *
 * @example
 * debugAssert(patientId, 'Patient ID is required');
 */
export function debugAssert(condition: unknown, message: string): asserts condition {
  if (condition) return;

  if (DEBUG) {
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.error(`⚠️  Assertion failed: ${message}`);
  }
}
