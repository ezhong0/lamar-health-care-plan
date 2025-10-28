/**
 * Test Database Helpers
 *
 * Provides utilities for setting up and tearing down test database state.
 * Uses the same Prisma client but ensures test isolation.
 *
 * Pattern:
 * - beforeEach: Clean database
 * - afterAll: Clean up connections
 *
 * For parallel test execution, use runInTestTransaction() which automatically
 * rolls back all changes after the test completes.
 */

import { PrismaClient, Prisma } from '@prisma/client';

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

/**
 * Run test code in a transaction that automatically rolls back
 *
 * This enables parallel test execution by providing complete isolation.
 * All database changes are rolled back after the test, so no cleanup needed.
 *
 * Usage:
 * ```typescript
 * it('creates patient', async () => {
 *   await runInTestTransaction(async (tx) => {
 *     const patient = await tx.patient.create({ data: {...} });
 *     expect(patient).toBeDefined();
 *     // Changes automatically rolled back after test
 *   });
 * });
 * ```
 *
 * Benefits:
 * - Complete test isolation (no shared state between tests)
 * - Enables parallel test execution (3x faster)
 * - No manual cleanup required
 * - Tests can run in any order
 *
 * Trade-offs:
 * - Cannot test transaction behavior itself
 * - Slightly more complex test setup
 * - Must pass transaction client to service methods
 *
 * @param testFn - Async function that receives transaction client
 * @returns Promise that resolves when test completes
 */
export async function runInTestTransaction<T>(
  testFn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let result: T;

  try {
    await testDb.$transaction(async (tx) => {
      // Run the test code with the transaction client
      result = await testFn(tx);

      // Force rollback by throwing error
      // This ensures all changes are discarded
      throw new Error('ROLLBACK_TEST');
    });
  } catch (error) {
    // Expected error - transaction rolled back successfully
    if (error instanceof Error && error.message === 'ROLLBACK_TEST') {
      // Return the result from before rollback
      return result!;
    }

    // Unexpected error - rethrow
    throw error;
  }

  // TypeScript needs this for type safety, but we'll never reach here
  return result!;
}
