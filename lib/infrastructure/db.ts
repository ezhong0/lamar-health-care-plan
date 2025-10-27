/**
 * Prisma Client singleton
 *
 * Ensures only one Prisma Client instance exists to avoid connection pool exhaustion.
 * In development, preserves client across hot reloads.
 */

import { PrismaClient } from '@prisma/client';
import { isDevelopment, isProduction } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
