/**
 * Environment Variable Validation
 *
 * Validates all required environment variables on application startup.
 * Provides clear error messages if configuration is missing or invalid.
 *
 * This runs ONCE at startup and caches the validated config.
 * Subsequent imports get the validated config object.
 *
 * In test mode, uses test defaults to avoid requiring .env during tests.
 *
 * Usage:
 * import { env } from '@/lib/infrastructure/env';
 * console.log(env.ANTHROPIC_API_KEY);
 */

import { z } from 'zod';

/**
 * Check if we're running in test mode
 */
const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

/**
 * Environment variable schema
 *
 * Required variables will cause startup failure if missing (except in test mode).
 * Optional variables have defaults or are truly optional.
 */
const envSchema = z.object({
  // Required: AI Service (test default provided)
  ANTHROPIC_API_KEY: isTestMode
    ? z.string().default('sk-ant-test-key-for-testing')
    : z
        .string()
        .min(1, 'ANTHROPIC_API_KEY is required')
        .startsWith('sk-ant-', 'ANTHROPIC_API_KEY must start with sk-ant-'),

  // Required: Database (test default provided)
  DATABASE_URL: isTestMode
    ? z
        .string()
        .default('postgresql://postgres:postgres@localhost:5432/lamar_health_test')
    : z
        .string()
        .min(1, 'DATABASE_URL is required')
        .url('DATABASE_URL must be a valid URL')
        .refine(
          (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
          'DATABASE_URL must be a PostgreSQL connection string'
        ),

  // Optional: Environment mode
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Optional: MSW mocking for frontend-only development
  NEXT_PUBLIC_USE_MOCKS: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 *
 * @throws {Error} If validation fails with detailed error messages (except in test mode)
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // In test mode, this should never happen due to defaults
    // But if it does, provide safe fallback values
    if (isTestMode) {
      console.warn('⚠️  Environment validation failed in test mode, using test defaults');
      return {
        ANTHROPIC_API_KEY: 'sk-ant-test-key-for-testing',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/lamar_health_test',
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
        NEXT_PUBLIC_USE_MOCKS: false,
      };
    }

    console.error('❌ Environment validation failed:\n');

    const errors = result.error.flatten().fieldErrors;

    Object.entries(errors).forEach(([field, messages]) => {
      console.error(`  ${field}:`);
      messages?.forEach((message) => console.error(`    - ${message}`));
    });

    console.error('\n📝 To fix this:');
    console.error('  1. Copy .env.example to .env');
    console.error('  2. Fill in all required values');
    console.error('  3. Restart the application\n');

    throw new Error('Environment validation failed. Check logs above for details.');
  }

  return result.data;
}

/**
 * Validated environment configuration
 *
 * This is evaluated once when the module is first imported.
 * All subsequent imports receive the same validated object.
 */
export const env = validateEnv();

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
