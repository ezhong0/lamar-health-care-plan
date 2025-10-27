/**
 * Export Service
 *
 * Generates CSV exports of patient data and care plans for pharma reporting.
 * Fulfills the P2 requirement from project requirements (tabulated data export).
 *
 * Design decisions:
 * - CSV format (Excel-compatible, simpler than XLSX)
 * - Proper CSV escaping for fields with commas/quotes
 * - Includes care plan summaries (first 200 chars)
 * - Uses existing services to fetch data (no direct database access)
 *
 * Independence:
 * - Completely optional feature
 * - Reuses existing data fetching (no new queries)
 * - No modifications to existing services
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '@/lib/domain/result';
import { logger } from '@/lib/infrastructure/logger';

/**
 * Export Service
 *
 * Handles data export to CSV format for pharma reporting.
 */
export class ExportService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Export all patients to CSV
   *
   * Generates Excel-compatible CSV with patient data, orders, and care plans.
   * Format designed for pharma company reporting requirements.
   *
   * Columns:
   * - Patient info (MRN, name)
   * - Medication and diagnosis
   * - Provider info (name, NPI)
   * - Care plan status and summary
   * - Dates
   *
   * @returns Result with CSV content as string
   */
  async exportPatientsToCSV(): Promise<Result<string>> {
    const startTime = Date.now();

    logger.info('Starting patient export to CSV');

    try {
      // Fetch all patients with related data
      const patients = await this.db.patient.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            include: {
              provider: true,
            },
          },
          carePlans: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Most recent care plan
          },
        },
      });

      logger.debug('Fetched patients for export', {
        count: patients.length,
      });

      // Build CSV content
      const rows: string[] = [];

      // Header row
      rows.push(
        this.escapeCSVRow([
          'MRN',
          'First Name',
          'Last Name',
          'Medication',
          'Primary Diagnosis',
          'Additional Diagnoses',
          'Referring Provider',
          'Provider NPI',
          'Care Plan Generated',
          'Care Plan Date',
          'Care Plan Summary',
          'Created Date',
        ])
      );

      // Data rows
      for (const patient of patients) {
        // Get latest order (if exists)
        const latestOrder = patient.orders[0];
        const latestCarePlan = patient.carePlans[0];

        // Format additional diagnoses
        const additionalDiagnoses =
          Array.isArray(patient.additionalDiagnoses) &&
          patient.additionalDiagnoses.length > 0
            ? patient.additionalDiagnoses.join('; ')
            : 'None';

        // Format care plan summary (first 200 chars)
        const carePlanSummary = latestCarePlan
          ? this.truncateText(latestCarePlan.content, 200)
          : 'N/A';

        rows.push(
          this.escapeCSVRow([
            patient.mrn,
            patient.firstName,
            patient.lastName,
            latestOrder?.medicationName || 'N/A',
            latestOrder?.primaryDiagnosis || 'N/A',
            additionalDiagnoses,
            latestOrder?.provider.name || 'N/A',
            latestOrder?.provider.npi || 'N/A',
            latestCarePlan ? 'Yes' : 'No',
            latestCarePlan
              ? this.formatDate(latestCarePlan.createdAt)
              : 'N/A',
            carePlanSummary,
            this.formatDate(patient.createdAt),
          ])
        );
      }

      const csv = rows.join('\n');

      const duration = Date.now() - startTime;

      logger.info('Patient export completed', {
        patientCount: patients.length,
        csvLength: csv.length,
        duration,
      });

      return {
        success: true,
        data: csv,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Patient export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to export patients'),
      };
    }
  }

  /**
   * Escape CSV row
   *
   * Properly escapes fields for CSV format:
   * - Wraps fields containing commas, quotes, or newlines in double quotes
   * - Escapes existing quotes by doubling them
   *
   * @param fields - Array of field values
   * @returns Comma-separated string
   */
  private escapeCSVRow(fields: string[]): string {
    return fields
      .map((field) => {
        // Convert to string and handle null/undefined
        const str = field ?? '';

        // Check if field needs quoting
        if (
          str.includes(',') ||
          str.includes('"') ||
          str.includes('\n') ||
          str.includes('\r')
        ) {
          // Escape quotes by doubling them
          const escaped = str.replace(/"/g, '""');
          return `"${escaped}"`;
        }

        return str;
      })
      .join(',');
  }

  /**
   * Truncate text to specified length
   *
   * Adds ellipsis if text is truncated.
   *
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format date for CSV
   *
   * Returns ISO 8601 format (Excel-compatible)
   *
   * @param date - Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}
