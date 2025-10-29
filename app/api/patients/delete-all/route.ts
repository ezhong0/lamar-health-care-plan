/**
 * Delete All Patients API
 *
 * Deletes all patients in the database.
 * Useful for clearing demo data or resetting the system.
 *
 * DELETE /api/patients/delete-all
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { logger } from '@/lib/infrastructure/logger';
import crypto from 'crypto';

export async function DELETE() {
  const requestId = crypto.randomUUID();

  logger.info('Delete all patients request received', { requestId });

  // SECURITY: Only allow in development/test environments
  // This is a destructive operation that should NEVER be exposed in production
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Delete all patients blocked in production', { requestId });
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'This endpoint is not available in production',
          code: 'FORBIDDEN',
        },
      },
      { status: 403 }
    );
  }

  try {
    // Count patients before deletion
    const patientCount = await prisma.patient.count();

    // Delete all patients (cascade will handle orders and care plans)
    await prisma.patient.deleteMany({});

    logger.info('All patients deleted successfully', {
      requestId,
      patientsDeleted: patientCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'All patients deleted successfully',
        deletedCount: patientCount,
      },
    });
  } catch (error) {
    logger.error('Failed to delete all patients', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to delete all patients',
          code: 'DELETE_ALL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
