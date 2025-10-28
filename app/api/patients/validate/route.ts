/**
 * POST /api/patients/validate
 *
 * Validates patient data and checks for warnings WITHOUT creating anything.
 * This allows warnings to be shown BEFORE creation.
 *
 * Returns warnings only - no database changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { PatientInputSchema } from '@/lib/validation/schemas';
import { createPatientServices } from '@/lib/services/factory';
import { logger } from '@/lib/infrastructure/logger';
import type { Warning } from '@/lib/domain/warnings';
import { toPatientId } from '@/lib/domain/types';

export async function POST(req: NextRequest) {
  try {
    // Parse and validate input
    const body = await req.json();
    const validationResult = PatientInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationResult.error.issues.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    logger.info('Validating patient data', {
      mrn: input.mrn,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    // Initialize services
    const { duplicateDetector } = createPatientServices(prisma);

    // Run all validation checks WITHOUT creating anything
    const warnings: Warning[] = [];

    // Check 1: Exact MRN duplicate (warning, not blocking)
    const existingPatient = await prisma.patient.findFirst({
      where: { mrn: input.mrn },
      include: {
        orders: {
          select: {
            medicationName: true,
          },
        },
      },
    });

    if (existingPatient) {
      // Check if the existing patient has the same medication
      const hasSameMedication = existingPatient.orders.some(
        (order) => order.medicationName.toLowerCase().trim() === input.medicationName.toLowerCase().trim()
      );

      warnings.push({
        type: 'DUPLICATE_PATIENT',
        severity: 'high',
        message: hasSameMedication
          ? `Patient with MRN ${input.mrn} already exists and has an order for ${input.medicationName}.`
          : `Patient with MRN ${input.mrn} already exists. You can add this order to the existing patient.`,
        existingPatient: {
          id: toPatientId(existingPatient.id),
          mrn: existingPatient.mrn,
          name: `${existingPatient.firstName} ${existingPatient.lastName}`,
        },
        canLinkToExisting: true,
        hasSameMedication,
      });
    }

    // Check 2: Similar patients (fuzzy match)
    const similarPatientWarnings = await duplicateDetector.findSimilarPatients(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        mrn: input.mrn,
        medicationName: input.medicationName,
      },
      prisma
    );
    warnings.push(...similarPatientWarnings);

    // Check 3: Provider conflict (NPI exists with different name)
    const existingProvider = await prisma.provider.findUnique({
      where: { npi: input.referringProviderNPI },
    });

    if (existingProvider && existingProvider.name !== input.referringProvider) {
      warnings.push({
        type: 'PROVIDER_CONFLICT',
        severity: 'high',
        message: `NPI ${input.referringProviderNPI} is registered to "${existingProvider.name}". You entered "${input.referringProvider}".`,
        npi: input.referringProviderNPI,
        expectedName: existingProvider.name,
        actualName: input.referringProvider,
      });
    }

    logger.info('Validation complete', {
      warningCount: warnings.length,
      hasBlockingErrors: false,
    });

    // Return warnings (no database changes made)
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        warnings,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
