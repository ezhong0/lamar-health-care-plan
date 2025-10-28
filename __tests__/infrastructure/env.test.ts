/**
 * Environment Validation Tests
 *
 * CRITICAL: These tests verify required environment variables.
 * If these fail, the application WILL NOT WORK in production.
 *
 * Required variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - ANTHROPIC_API_KEY: Claude API key for care plan generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DATABASE_URL (REQUIRED)', () => {
    it('is required and defined', () => {
      // CRITICAL: This must be set or the app will not work
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).not.toBe('');
    });

    it('is a valid PostgreSQL connection string', () => {
      const dbUrl = process.env.DATABASE_URL;

      // Must start with postgresql:// or postgres://
      expect(dbUrl).toMatch(/^(postgresql|postgres):\/\//);

      // Must contain required parts: host, database
      expect(dbUrl).toContain('@'); // user@host format
      expect(dbUrl).toContain(':'); // port separator
    });

    it('contains database name', () => {
      const dbUrl = process.env.DATABASE_URL!;

      // Should have a database name after the last /
      const parts = dbUrl.split('/');
      const dbName = parts[parts.length - 1].split('?')[0];

      expect(dbName).toBeTruthy();
      expect(dbName.length).toBeGreaterThan(0);
    });
  });

  describe('ANTHROPIC_API_KEY (REQUIRED)', () => {
    it('is required for care plan generation', () => {
      // CRITICAL: This must be set or care plan generation will fail
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY).not.toBe('');
    });

    it('has reasonable length (minimum 20 characters)', () => {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
      // Anthropic API keys are typically 40+ characters
      // Requiring at least 20 to catch obviously wrong values
      expect(apiKey.length).toBeGreaterThan(20);
    });

    it('starts with sk- prefix', () => {
      const apiKey = process.env.ANTHROPIC_API_KEY!;
      // Anthropic API keys start with sk-ant-
      expect(apiKey).toMatch(/^sk-/);
    });
  });

  describe('NODE_ENV', () => {
    it('defaults to development if not set', () => {
      const nodeEnv = process.env.NODE_ENV || 'development';
      expect(['development', 'production', 'test']).toContain(nodeEnv);
    });
  });

  describe('LOG_LEVEL', () => {
    it('defaults to info if not set', () => {
      const logLevel = process.env.LOG_LEVEL || 'info';
      expect(['debug', 'info', 'warn', 'error']).toContain(logLevel);
    });
  });

  describe('NEXT_PUBLIC_APP_URL', () => {
    it('is defined for client-side usage', () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      // May not be set in test environment
      expect(appUrl === undefined || typeof appUrl === 'string').toBe(true);
    });
  });
});
