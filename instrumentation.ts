/**
 * Next.js Instrumentation
 *
 * This file runs ONCE when the server starts, before any routes are loaded.
 * Perfect for startup validation and initialization.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Validate environment variables
  // This will throw an error and prevent startup if validation fails
  await import('./lib/infrastructure/env');

  console.log('✅ Environment validation passed');
  console.log('✅ Application startup checks complete\n');
}
