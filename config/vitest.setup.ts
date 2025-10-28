/**
 * Vitest Setup File
 *
 * Global test setup configuration for component testing
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Import custom matchers
import '../__tests__/helpers/matchers';

// Set test environment variables
// @ts-ignore - Setting environment variables in test setup
process.env.NODE_ENV = 'test';
// @ts-ignore - Setting environment variables in test setup
process.env.VITEST = 'true';
// @ts-ignore - Setting environment variables in test setup
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lamar_health_test';
// @ts-ignore - Setting environment variables in test setup
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-testing';
// @ts-ignore - Setting environment variables in test setup
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
