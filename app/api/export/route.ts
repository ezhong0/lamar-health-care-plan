/**
 * GET /api/export - Export Patients to CSV
 *
 * Generates Excel-compatible CSV export of all patients with care plans.
 * Fulfills P2 requirement from project notes (tabulated data export for pharma reporting).
 *
 * Design pattern:
 * - Thin API route (delegates to ExportService)
 * - Returns downloadable CSV file
 * - Proper Content-Type and Content-Disposition headers
 * - Error handling with user-friendly messages
 *
 * Independence:
 * - Completely optional feature
 * - No modifications to existing services
 * - Can be removed without affecting core functionality
 */

import { NextResponse } from 'next/server';
import { ExportService } from '@/lib/services/export-service';
import { prisma } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { isFailure } from '@/lib/domain/result';

/**
 * GET /api/export
 *
 * Exports all patients to CSV file.
 *
 * @returns CSV file download
 *
 * Status codes:
 * - 200: CSV file generated successfully
 * - 500: Internal server error
 */
export async function GET(): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  logger.info('Patient export request received', { requestId });

  try {
    // Initialize export service
    const exportService = new ExportService(prisma);

    // Generate CSV
    const result = await exportService.exportPatientsToCSV();

    // Handle Result type
    if (isFailure(result)) {
      logger.error('Patient export failed', {
        requestId,
        error: result.error.message,
      });

      return handleError(result.error);
    }

    // Return CSV file
    const csv = result.data;
    const filename = `lamar-health-patients-${new Date().toISOString().split('T')[0]}.csv`;

    logger.info('Patient export succeeded', {
      requestId,
      csvLength: csv.length,
      filename,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Patient export request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error);
  }
}
