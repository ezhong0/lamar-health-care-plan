/**
 * Test Cleanup API Endpoint
 *
 * ONLY AVAILABLE IN TEST/DEVELOPMENT ENVIRONMENTS
 * Provides endpoints to clean up test data between E2E test runs.
 *
 * Security: Disabled in production via environment check
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';

/**
 * DELETE /api/test/cleanup
 * Deletes all test patients (MRN starting with specific prefixes)
 */
export async function DELETE(request: NextRequest) {
  // SECURITY: Only allow in test/development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Delete patients created by E2E tests
    // E2E tests use MRNs that are timestamps (6 digits)
    // We'll delete all patients created in the last hour with numeric MRNs > 100000
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await prisma.patient.deleteMany({
      where: {
        OR: [
          // Delete recently created patients with high MRN numbers (test data)
          {
            mrn: {
              gte: '100000', // Test MRNs start at 100000
            },
            createdAt: {
              gte: oneHourAgo,
            },
          },
          // Also delete patients with specific test prefixes
          {
            firstName: {
              in: ['Test', 'TestDuplicate', 'CarePlan', 'Duplicate'],
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} test patients`,
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test/cleanup/reset
 * Complete database reset (USE WITH CAUTION)
 */
export async function POST(request: NextRequest) {
  // SECURITY: Only allow in test environment (not even development)
  if (process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'Only available in test environment' }, { status: 403 });
  }

  try {
    // Delete in correct order to respect foreign key constraints
    await prisma.$transaction([
      prisma.order.deleteMany(),
      prisma.carePlan.deleteMany(),
      prisma.patient.deleteMany(),
      prisma.provider.deleteMany(),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Database reset complete',
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: 'Failed to reset database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
