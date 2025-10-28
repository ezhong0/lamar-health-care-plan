/**
 * POST /api/care-plans - Generate Care Plan
 *
 * Generates an AI-powered pharmacist care plan for a patient.
 * This is a longer-running operation (2-10 seconds) due to LLM processing.
 *
 * Pattern:
 * 1. Validate input (patient ID)
 * 2. Initialize service with Anthropic API key
 * 3. Call service (handles retry, timeout, logging)
 * 4. Return result
 *
 * Production considerations:
 * - Consider background job queue for async processing
 * - Consider caching (same patient, recent request = return cached)
 * - Monitor LLM costs and rate limits
 * - Consider streaming response for better UX
 */

// Next.js Route Segment Config - set timeout for this endpoint
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { GenerateCarePlanInputSchema } from '@/lib/validation/schemas';
import { CarePlanService } from '@/lib/services/care-plan-service';
import { prisma } from '@/lib/infrastructure/db';
import { env } from '@/lib/infrastructure/env';
import { handleError } from '@/lib/infrastructure/error-handler';
import { logger } from '@/lib/infrastructure/logger';
import { isFailure } from '@/lib/domain/result';
import { toPatientId } from '@/lib/domain/types';
import type { GenerateCarePlanResponse } from '@/lib/api/contracts';
import crypto from 'crypto';

/**
 * POST /api/care-plans
 *
 * Generate care plan for a patient using Claude LLM.
 *
 * Request body: { patientId: string }
 * Response: GenerateCarePlanResponse matching API contract
 *
 * Status codes:
 * - 201: Care plan generated successfully
 * - 400: Validation error (missing/invalid patient ID)
 * - 404: Patient not found
 * - 500: Internal server error (LLM timeout, API error)
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateCarePlanResponse>> {
  const requestId = crypto.randomUUID();

  logger.info('Care plan generation request received', { requestId });

  try {
    // Step 1: Parse and validate input
    const body = await req.json();
    const validatedInput = GenerateCarePlanInputSchema.parse(body);

    logger.debug('Input validated', {
      requestId,
      patientId: validatedInput.patientId,
    });

    // Step 2: Initialize service with validated API key
    // env.ANTHROPIC_API_KEY is guaranteed to exist and be valid due to startup validation
    const carePlanService = new CarePlanService(prisma, env.ANTHROPIC_API_KEY);

    // Step 3: Generate care plan
    // This handles retry logic, timeout, and comprehensive logging internally
    const result = await carePlanService.generateCarePlan({
      patientId: toPatientId(validatedInput.patientId),
    });

    // Step 4: Handle Result type
    if (isFailure(result)) {
      // Service returned error (patient not found, LLM failure, etc.)
      return handleError(result.error) as NextResponse<GenerateCarePlanResponse>;
    }

    // Step 5: Return success response
    const { carePlan } = result.data;

    logger.info('Care plan generated successfully via API', {
      requestId,
      patientId: validatedInput.patientId,
      carePlanId: carePlan.id,
      contentLength: carePlan.content.length,
    });

    return NextResponse.json<GenerateCarePlanResponse>(
      {
        success: true,
        data: { carePlan },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Care plan generation request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error) as NextResponse<GenerateCarePlanResponse>;
  }
}

/**
 * GET /api/care-plans?patientId=xxx
 *
 * List care plans for a patient.
 * Optional: for fetching all care plans for a patient.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'patientId query parameter is required',
          code: 'VALIDATION_ERROR',
        },
      },
      { status: 400 }
    );
  }

  logger.info('List care plans request received', { patientId });

  try {
    // Use validated environment configuration
    const carePlanService = new CarePlanService(prisma, env.ANTHROPIC_API_KEY);
    const carePlans = await carePlanService.getCarePlansForPatient(
      toPatientId(patientId)
    );

    return NextResponse.json({
      success: true,
      data: { carePlans },
    });
  } catch (error) {
    logger.error('List care plans failed', {
      patientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return handleError(error);
  }
}
