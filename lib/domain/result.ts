import type { Warning } from './warnings';

/**
 * Result type for operations that can fail
 *
 * Uses discriminated unions to ensure type-safe error handling.
 * Inspired by Rust's Result<T, E> and functional programming patterns.
 *
 * @example
 * const result = await service.createPatient(input);
 * if (isFailure(result)) {
 *   return handleError(result.error);
 * }
 * const { data: patient, warnings } = result;
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  data: T;
  warnings?: Warning[];
}

export interface Failure<E> {
  success: false;
  error: E;
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is a failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}
