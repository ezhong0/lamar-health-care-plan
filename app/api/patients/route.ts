/**
 * POST /api/patients - Create Patient
 *
 * API route for patient creation with full orchestration:
 * - Input validation (Zod)
 * - Service layer orchestration
 * - Error handling with user-friendly messages
 * - Comprehensive logging
 *
 * Design pattern:
 * 1. Parse request body
 * 2. Validate with Zod schema
 * 3. Initialize services (dependency injection)
 * 4. Call service
 * 5. Handle Result type
 * 6. Return API contract response
 *
 * This demonstrates the layered architecture:
 * - Interface layer (this file) - thin, delegates to service
 * - Service layer - business logic, transactions
 * - Domain layer - types, errors
 * - Infrastructure layer - database, logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { PatientInputSchema } from '@/lib/validation/schemas';
import { PatientService } from '@/lib/services/patient-service';
import { ProviderService } from '@/lib/services/provider-service';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { prisma, isDatabaseConfigured } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { isFailure } from '@/lib/domain/result';
import type { CreatePatientResponse } from '@/lib/api/contracts';

/**
 * POST /api/patients
 *
 * Creates a new patient with order and referring provider.
 *
 * @returns CreatePatientResponse matching API contract
 *
 * Success: { success: true, data: { patient, warnings } }
 * Error: { success: false, error: { message, code, details } }
 *
 * Status codes:
 * - 201: Created successfully
 * - 400: Validation error (invalid input)
 * - 409: Conflict (duplicate MRN, provider conflict)
 * - 500: Internal server error
 */
export async function POST(req: NextRequest): Promise<NextResponse<CreatePatientResponse>> {
  const requestId = crypto.randomUUID();

  logger.info('Patient creation request received', { requestId });

  // Check if database is configured
  if (!isDatabaseConfigured()) {
    logger.error('Database not configured', { requestId });
    return NextResponse.json<CreatePatientResponse>(
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
    // Step 1: Parse request body
    const body = await req.json();

    // Step 2: Validate with Zod
    // This throws ZodError if validation fails (caught by error handler)
    const validatedInput = PatientInputSchema.parse(body);

    logger.debug('Input validated', {
      requestId,
      mrn: validatedInput.mrn,
    });

    // Step 3: Initialize services with dependency injection
    const providerService = new ProviderService(prisma);
    const duplicateDetector = new DuplicateDetector();
    const patientService = new PatientService(
      prisma,
      providerService,
      duplicateDetector
    );

    // Step 4: Call service
    const result = await patientService.createPatient(validatedInput);

    // Step 5: Handle Result type
    if (isFailure(result)) {
      // Service returned business logic error (duplicate MRN, provider conflict)
      // Let error handler format the response
      return handleError(result.error) as NextResponse<CreatePatientResponse>;
    }

    // Step 6: Return success response matching API contract
    const { patient, order, warnings } = result.data;

    logger.info('Patient created successfully via API', {
      requestId,
      patientId: patient.id,
      orderId: order.id,
      warningCount: warnings.length,
    });

    return NextResponse.json<CreatePatientResponse>(
      {
        success: true,
        data: {
          patient,
          warnings,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Catch-all for unexpected errors (Zod validation, JSON parse, etc.)
    logger.error('Patient creation request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error) as NextResponse<CreatePatientResponse>;
  }
}

/**
 * GET /api/patients
 *
 * List recent patients with orders and care plan counts.
 * Enhanced to include relationship data for patient list display.
 * Simple implementation - production would add pagination, filtering, search.
 */
export async function GET(): Promise<NextResponse> {
  logger.info('List patients request received');

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
    // Fetch patients with orders and care plans for rich list display
    // Note: Direct Prisma query here instead of service to include relations
    // This is acceptable for API-specific data shaping
    const patientsData = await prisma.patient.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        orders: {
          take: 1, // Only latest order for card display
          orderBy: { createdAt: 'desc' },
          include: {
            provider: true,
          },
        },
        carePlans: {
          select: {
            id: true, // Only need count
          },
        },
      },
    });

    // Transform to match expected format
    const patients = patientsData.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.mrn,
      additionalDiagnoses: p.additionalDiagnoses as string[],
      medicationHistory: p.medicationHistory as string[],
      patientRecords: p.patientRecords,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      orders: p.orders,
      carePlans: p.carePlans,
    }));

    return NextResponse.json({
      success: true,
      data: { patients },
    });
  } catch (error) {
    logger.error('List patients failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error);
  }
}
