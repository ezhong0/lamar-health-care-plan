/**
 * Prisma Client singleton
 *
 * Ensures only one Prisma Client instance exists to avoid connection pool exhaustion.
 * In development, preserves client across hot reloads.
 *
 * If DATABASE_URL is not set, creates a client but operations will fail gracefully
 * with clear error messages rather than crashing the entire server.
 */

import { PrismaClient } from '@prisma/client';
import { isDevelopment, isProduction, env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma Client with proper error handling
 *
 * Even if DATABASE_URL is missing, we create the client to prevent
 * import errors. The actual database operations will fail with clear messages.
 */
function createPrismaClient(): PrismaClient {
  // Check if DATABASE_URL is set
  if (!env.DATABASE_URL || env.DATABASE_URL === '') {
    console.warn(
      '⚠️  DATABASE_URL not configured. Database operations will fail until configured.'
    );
  }

  return new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    // Don't fail immediately on connection issues
    // Let individual queries fail with better error messages
    errorFormat: 'pretty',
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper to check if database is configured
 *
 * Use this in API routes to provide better error messages:
 *
 * if (!isDatabaseConfigured()) {
 *   return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
 * }
 */
export function isDatabaseConfigured(): boolean {
  return !!env.DATABASE_URL && env.DATABASE_URL !== '';
}
