/**
 * POST /api/seed - Load Demo Data
 *
 * Seeds the database with realistic demo patients for showcasing the application.
 * Useful for demos, testing, and development.
 *
 * Design pattern:
 * - Thin API route (delegates to SeedService)
 * - Uses existing services (PatientService via SeedService)
 * - Proper error handling and logging
 * - Returns count of patients created
 *
 * Independence:
 * - Completely optional feature
 * - No modifications to existing services
 * - Can be removed without affecting core functionality
 */

import { NextResponse } from 'next/server';
import { SeedService } from '@/lib/services/seed-service';
import { PatientService } from '@/lib/services/patient-service';
import { ProviderService } from '@/lib/services/provider-service';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { prisma, isDatabaseConfigured } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { isFailure } from '@/lib/domain/result';

export interface SeedResponse {
  success: boolean;
  data?: {
    patientsCreated: number;
    patientsCleared: number;
    message: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * POST /api/seed
 *
 * Seeds demo data for application showcase.
 *
 * @returns SeedResponse with count of patients created
 *
 * Status codes:
 * - 201: Demo data seeded successfully
 * - 500: Internal server error
 */
export async function POST(): Promise<NextResponse<SeedResponse>> {
  const requestId = crypto.randomUUID();

  logger.info('Seed demo data request received', { requestId });

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    logger.error('Database not configured', { requestId });
    return NextResponse.json<SeedResponse>(
      {
        success: false,
        error: {
          message: 'Database not configured. Please set DATABASE_URL environment variable.',
          code: 'DATABASE_NOT_CONFIGURED',
        },
      },
      { status: 503 }
    );
  }

  try {
    // Initialize services with dependency injection
    const providerService = new ProviderService(prisma);
    const duplicateDetector = new DuplicateDetector();
    const patientService = new PatientService(
      prisma,
      providerService,
      duplicateDetector
    );
    const seedService = new SeedService(prisma, patientService);

    // Seed demo data
    const result = await seedService.seedDemoData();

    // Handle Result type
    if (isFailure(result)) {
      logger.error('Seed demo data failed', {
        requestId,
        error: result.error.message,
      });

      return handleError(result.error) as NextResponse<SeedResponse>;
    }

    // Return success response
    const { patientsCreated, patientsCleared } = result.data;

    logger.info('Seed demo data succeeded', {
      requestId,
      patientsCreated,
      patientsCleared,
    });

    return NextResponse.json<SeedResponse>(
      {
        success: true,
        data: {
          patientsCreated,
          patientsCleared,
          message: `Successfully loaded ${patientsCreated} demo patients`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Seed demo data request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error) as NextResponse<SeedResponse>;
  }
}

/**
 * GET /api/seed
 *
 * Get demo data statistics (for verification).
 *
 * @returns Count of demo patients, orders, care plans
 */
export async function GET(): Promise<NextResponse> {
  logger.info('Get seed stats request received');

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    logger.error('Database not configured');
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Database not configured. Please set DATABASE_URL environment variable.',
          code: 'DATABASE_NOT_CONFIGURED',
        },
      },
      { status: 503 }
    );
  }

  try {
    const providerService = new ProviderService(prisma);
    const duplicateDetector = new DuplicateDetector();
    const patientService = new PatientService(
      prisma,
      providerService,
      duplicateDetector
    );
    const seedService = new SeedService(prisma, patientService);

    const stats = await seedService.getDemoStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get seed stats failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error);
  }
}
