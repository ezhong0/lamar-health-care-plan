/**
 * Vitest Global Setup
 *
 * Runs before all tests to configure the test environment.
 */

import { beforeAll } from 'vitest';
import './__tests__/helpers/matchers';

// Set test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lamar_health_test';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-testing';
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
});
