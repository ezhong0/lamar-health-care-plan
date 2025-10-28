/**
 * Custom Vitest Matchers
 *
 * Extends Vitest with domain-specific assertions for better test readability.
 */

import { expect } from 'vitest';
import type { Result } from '@/lib/domain/result';
import { isSuccess, isFailure } from '@/lib/domain/result';

interface CustomMatchers<R = unknown> {
  toBeSuccess(): R;
  toBeFailure(): R;
  toHaveWarnings(): R;
  toHaveWarningType(type: string): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

/**
 * Matcher: toBeSuccess
 *
 * Asserts that a Result is a Success
 */
expect.extend({
  toBeSuccess(received: Result<any, any>) {
    const pass = isSuccess(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected result to be failure, but it was success`
          : `Expected result to be success, but it was failure with error: ${
              isFailure(received) ? received.error.message : 'unknown'
            }`,
    };
  },
});

/**
 * Matcher: toBeFailure
 *
 * Asserts that a Result is a Failure
 */
expect.extend({
  toBeFailure(received: Result<any, any>) {
    const pass = isFailure(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected result to be success, but it was failure`
          : `Expected result to be failure, but it was success`,
    };
  },
});

/**
 * Matcher: toHaveWarnings
 *
 * Asserts that a Success result has warnings
 */
expect.extend({
  toHaveWarnings(received: Result<any, any>) {
    if (isFailure(received)) {
      return {
        pass: false,
        message: () => `Expected success result with warnings, but got failure`,
      };
    }

    const pass = received.warnings && received.warnings.length > 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected result to have no warnings, but found ${received.warnings?.length}`
          : `Expected result to have warnings, but found none`,
    };
  },
});

/**
 * Matcher: toHaveWarningType
 *
 * Asserts that a Success result has a warning of specific type
 */
expect.extend({
  toHaveWarningType(received: Result<any, any>, expectedType: string) {
    if (isFailure(received)) {
      return {
        pass: false,
        message: () => `Expected success result with warnings, but got failure`,
      };
    }

    const warnings = received.warnings || [];
    const pass = warnings.some((w) => w.type === expectedType);

    return {
      pass,
      message: () =>
        pass
          ? `Expected result not to have warning type "${expectedType}", but it does`
          : `Expected result to have warning type "${expectedType}", but found: ${warnings.map((w) => w.type).join(', ')}`,
    };
  },
});
