/**
 * Test Database Helpers
 *
 * Provides utilities for setting up and tearing down test database state.
 * Uses the same Prisma client but ensures test isolation.
 *
 * Pattern:
 * - beforeEach: Clean database
 * - afterAll: Clean up connections
 */

import { PrismaClient } from '@prisma/client';

// Use separate database client for tests
export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lamar_health_test',
    },
  },
});

/**
 * Clean all tables in the database
 *
 * Deletes in correct order to respect foreign key constraints.
 * Faster than truncate for small datasets.
 */
export async function cleanDatabase() {
  // Delete in order: child tables first, parent tables last
  await testDb.carePlan.deleteMany();
  await testDb.order.deleteMany();
  await testDb.patient.deleteMany();
  await testDb.provider.deleteMany();
}

/**
 * Seed test database with minimal data
 *
 * Useful for tests that need existing data.
 */
export async function seedTestData() {
  const provider = await testDb.provider.create({
    data: {
      name: 'Dr. Test Provider',
      npi: '1234567893',
    },
  });

  const patient = await testDb.patient.create({
    data: {
      firstName: 'Test',
      lastName: 'Patient',
      mrn: '999999',
      additionalDiagnoses: [],
      medicationHistory: [],
      patientRecords: 'Test patient records',
    },
  });

  const order = await testDb.order.create({
    data: {
      patientId: patient.id,
      providerId: provider.id,
      medicationName: 'Test Medication',
      primaryDiagnosis: 'Z00.00',
      status: 'pending',
    },
  });

  return { provider, patient, order };
}

/**
 * Disconnect from test database
 *
 * Call in afterAll() to prevent hanging connections
 */
export async function disconnectTestDb() {
  await testDb.$disconnect();
}

/**
 * Setup function for integration tests
 *
 * Usage:
 * beforeEach(async () => {
 *   await setupTestDb();
 * });
 */
export async function setupTestDb() {
  await cleanDatabase();
}

/**
 * Teardown function for integration tests
 *
 * Usage:
 * afterAll(async () => {
 *   await teardownTestDb();
 * });
 */
export async function teardownTestDb() {
  await cleanDatabase();
  await disconnectTestDb();
}
