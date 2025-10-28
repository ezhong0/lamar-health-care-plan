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
import { createPatientServices } from '@/lib/services/factory';
import { prisma } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { toPatientId, toCarePlanId } from '@/lib/domain/types';
import type { GetPatientResponse } from '@/lib/api/contracts';
import crypto from 'crypto';

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
    // Initialize services using factory
    const { patientService } = createPatientServices(prisma);

    // Fetch patient with related data
    const result = await patientService.getPatientById(toPatientId(patientId));

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

/**
 * DELETE /api/patients/[id]
 *
 * Delete patient and all related data (cascade):
 * - Patient record
 * - All orders
 * - All care plans
 *
 * Returns count of deleted records for transparency.
 *
 * Status codes:
 * - 200: Success
 * - 404: Patient not found
 * - 500: Internal server error
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: patientId } = await context.params;
  const requestId = crypto.randomUUID();

  logger.info('Patient deletion request received', {
    requestId,
    patientId,
  });

  try {
    // Verify patient exists and get related data count
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        orders: true,
        carePlans: true,
      },
    });

    if (!patient) {
      logger.warn('Patient not found for deletion', {
        requestId,
        patientId,
      });

      return NextResponse.json(
        {
          success: false,
          error: { message: 'Patient not found', code: 'PATIENT_NOT_FOUND' },
        },
        { status: 404 }
      );
    }

    // Count related records before deletion
    const orderCount = patient.orders.length;
    const carePlanCount = patient.carePlans.length;

    // Delete patient (cascade will handle orders and care plans via Prisma schema)
    await prisma.patient.delete({
      where: { id: patientId },
    });

    logger.info('Patient deleted successfully', {
      requestId,
      patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      ordersDeleted: orderCount,
      carePlansDeleted: carePlanCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Patient deleted successfully',
        deletedRecords: {
          patient: 1,
          orders: orderCount,
          carePlans: carePlanCount,
        },
      },
    });
  } catch (error) {
    logger.error('Patient deletion failed', {
      requestId,
      patientId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to delete patient',
          code: 'DELETE_ERROR',
          details: error instanceof Error ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }
}
