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
import { createPatientServices } from '@/lib/services/factory';
import { prisma, isDatabaseConfigured } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { checkRateLimit } from '@/lib/infrastructure/rate-limit';
import { isFailure } from '@/lib/domain/result';
import { sanitizePatientInput, containsXSSPatterns } from '@/lib/utils/sanitize-html';
import type { CreatePatientResponse } from '@/lib/api/contracts';
import crypto from 'crypto';

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

  // Check rate limit (10 requests per minute per IP - prevents spam)
  const rateLimitResult = await checkRateLimit(req, 'patientCreate');
  if (rateLimitResult) {
    logger.warn('Patient creation request rate limited', { requestId });
    return rateLimitResult as NextResponse<CreatePatientResponse>;
  }

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

    // Check if warnings were already validated (two-step flow)
    const skipWarnings = body.skipWarnings === true;

    // Step 2: Validate with Zod
    // This throws ZodError if validation fails (caught by error handler)
    const validatedInput = PatientInputSchema.parse(body);

    // Step 2.5: Sanitize input to prevent XSS
    // Log potential XSS attempts for security monitoring
    if (containsXSSPatterns(JSON.stringify(body))) {
      logger.warn('Potential XSS attempt detected in patient input', {
        requestId,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      });
    }

    const sanitizedInput = sanitizePatientInput(validatedInput);

    logger.debug('Input validated and sanitized', {
      requestId,
      mrn: sanitizedInput.mrn,
    });

    // Step 3: Initialize services using factory (ensures consistent DI)
    const { patientService } = createPatientServices(prisma);

    // Step 4: Call service (skip warnings if already validated)
    const result = await patientService.createPatient(sanitizedInput, skipWarnings);

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
    // OPTIMIZATION: Using aggregated subqueries to avoid N+1 problem
    // Instead of loading 50 patients + 50 orders + 50 providers (151 queries),
    // we use a single optimized query with aggregations
    const patientsData = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      mrn: string;
      additionalDiagnoses: string;
      medicationHistory: string;
      patientRecords: string;
      createdAt: Date;
      updatedAt: Date;
      latestOrderId: string | null;
      latestOrderMedicationName: string | null;
      latestOrderPrimaryDiagnosis: string | null;
      latestOrderStatus: string | null;
      latestOrderCreatedAt: Date | null;
      latestOrderProviderId: string | null;
      latestOrderProviderName: string | null;
      latestOrderProviderNpi: string | null;
      carePlanCount: number;
    }>>`
      SELECT
        p.id,
        p.first_name AS "firstName",
        p.last_name AS "lastName",
        p.mrn,
        p.additional_diagnoses AS "additionalDiagnoses",
        p.medication_history AS "medicationHistory",
        p.patient_records AS "patientRecords",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        latest_order.id AS "latestOrderId",
        latest_order.medication_name AS "latestOrderMedicationName",
        latest_order.primary_diagnosis AS "latestOrderPrimaryDiagnosis",
        latest_order.status AS "latestOrderStatus",
        latest_order.created_at AS "latestOrderCreatedAt",
        latest_order.provider_id AS "latestOrderProviderId",
        provider.name AS "latestOrderProviderName",
        provider.npi AS "latestOrderProviderNpi",
        COALESCE(care_plan_counts.count, 0)::int AS "carePlanCount"
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT id, medication_name, primary_diagnosis, status, created_at, provider_id
        FROM orders
        WHERE patient_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest_order ON true
      LEFT JOIN providers provider ON provider.id = latest_order.provider_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count
        FROM care_plans
        WHERE patient_id = p.id
      ) care_plan_counts ON true
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    // Transform to match expected format
    const patients = patientsData.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      mrn: p.mrn,
      // Parse JSON arrays from PostgreSQL
      additionalDiagnoses: (typeof p.additionalDiagnoses === 'string'
        ? JSON.parse(p.additionalDiagnoses)
        : p.additionalDiagnoses) as string[],
      medicationHistory: (typeof p.medicationHistory === 'string'
        ? JSON.parse(p.medicationHistory)
        : p.medicationHistory) as string[],
      patientRecords: p.patientRecords,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // Reconstruct orders array from flattened data
      orders: p.latestOrderId ? [{
        id: p.latestOrderId,
        medicationName: p.latestOrderMedicationName!,
        primaryDiagnosis: p.latestOrderPrimaryDiagnosis!,
        status: p.latestOrderStatus!,
        createdAt: p.latestOrderCreatedAt!,
        provider: {
          id: p.latestOrderProviderId!,
          name: p.latestOrderProviderName!,
          npi: p.latestOrderProviderNpi!,
        },
      }] : [],
      // Reconstruct care plans array with just IDs
      carePlans: Array.from({ length: p.carePlanCount }, (_, i) => ({ id: `placeholder-${i}` })),
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
