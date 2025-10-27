/**
 * GET /api/patients/[id] - Get Patient Details
 *
 * Returns patient with related data:
 * - Patient information
 * - Orders
 * - Care plans
 *
 * Pattern:
 * 1. Extract patient ID from route params
 * 2. Call service
 * 3. Return 404 if not found
 * 4. Return patient data
 */

import { NextRequest, NextResponse } from 'next/server';
import { PatientService } from '@/lib/services/patient-service';
import { ProviderService } from '@/lib/services/provider-service';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { prisma } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import type { PatientId } from '@/lib/domain/types';
import { toCarePlanId } from '@/lib/domain/types';
import type { GetPatientResponse } from '@/lib/api/contracts';

/**
 * GET /api/patients/[id]
 *
 * Retrieve patient details with orders and care plans.
 *
 * @param req - Next.js request
 * @param context - Route params containing patient ID
 * @returns GetPatientResponse matching API contract
 *
 * Status codes:
 * - 200: Success
 * - 404: Patient not found
 * - 500: Internal server error
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetPatientResponse>> {
  // Await params as required by Next.js 15
  const { id: patientId } = await context.params;

  logger.info('Get patient request received', { patientId });

  try {
    // Initialize services
    const providerService = new ProviderService(prisma);
    const duplicateDetector = new DuplicateDetector();
    const patientService = new PatientService(
      prisma,
      providerService,
      duplicateDetector
    );

    // Fetch patient with related data
    const result = await patientService.getPatientById(patientId as PatientId);

    if (!result) {
      logger.warn('Patient not found', { patientId });

      return NextResponse.json<GetPatientResponse>(
        {
          success: false,
          error: {
            message: 'Patient not found',
            code: 'PATIENT_NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    logger.info('Patient retrieved successfully', {
      patientId,
      orderCount: result.orders.length,
      carePlanCount: result.carePlans.length,
    });

    return NextResponse.json<GetPatientResponse>({
      success: true,
      data: {
        patient: result.patient,
        orders: result.orders,
        carePlans: result.carePlans.map((cp) => ({
          id: toCarePlanId(cp.id),
          patientId: result.patient.id,
          content: cp.content,
          generatedBy: cp.generatedBy,
          createdAt: cp.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get patient request failed', {
      patientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error) as NextResponse<GetPatientResponse>;
  }
}
