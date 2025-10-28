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

    // First, find all providers associated with test patients before deleting them
    // Providers are linked through orders, not directly on patients
    const testPatientIds = await prisma.patient.findMany({
      where: {
        OR: [
          // Recently created patients with high MRN numbers (test data)
          {
            mrn: {
              gte: '100000', // Test MRNs start at 100000
            },
            createdAt: {
              gte: oneHourAgo,
            },
          },
          // Patients with specific test prefixes
          {
            firstName: {
              in: ['Test', 'TestDuplicate', 'CarePlan', 'Duplicate'],
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    const patientIds = testPatientIds.map((p) => p.id);

    // Find provider IDs through orders
    const testOrders = await prisma.order.findMany({
      where: {
        patientId: {
          in: patientIds,
        },
      },
      select: {
        providerId: true,
      },
      distinct: ['providerId'],
    });

    const providerIds = testOrders.map((o) => o.providerId);

    // Delete test patients
    const patientResult = await prisma.patient.deleteMany({
      where: {
        OR: [
          {
            mrn: {
              gte: '100000',
            },
            createdAt: {
              gte: oneHourAgo,
            },
          },
          {
            firstName: {
              in: ['Test', 'TestDuplicate', 'CarePlan', 'Duplicate'],
            },
          },
        ],
      },
    });

    // Delete orphaned provider records (providers with no remaining orders)
    let providerResult = { count: 0 };
    if (providerIds.length > 0) {
      providerResult = await prisma.provider.deleteMany({
        where: {
          id: {
            in: providerIds,
          },
          // Only delete if no orders reference this provider
          orders: {
            none: {},
          },
        },
      });
    }

    // Also delete test providers with NPIs starting with "100000" that have no orders
    const testProviderResult = await prisma.provider.deleteMany({
      where: {
        npi: {
          startsWith: '100000',
        },
        orders: {
          none: {},
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: patientResult.count + providerResult.count + testProviderResult.count,
      message: `Deleted ${patientResult.count} test patients and ${providerResult.count + testProviderResult.count} orphaned providers`,
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
