/**
 * POST /api/examples/generate - Generate AI Patient Example
 *
 * Uses Claude AI to generate a realistic patient example for demonstration purposes.
 * Server-side only to protect API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePatientExampleWithRetry } from '@/lib/examples/generate-patient-example';
import { logger } from '@/lib/infrastructure/logger';
import { checkRateLimit } from '@/lib/infrastructure/rate-limit';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  logger.info('AI patient example generation requested', { requestId });

  // Check rate limit (5 requests per minute per IP)
  const rateLimitResult = await checkRateLimit(req, 'example');
  if (rateLimitResult) {
    logger.warn('Example generation request rate limited', { requestId });
    return rateLimitResult;
  }

  try {
    const result = await generatePatientExampleWithRetry(2);

    if (result.success) {
      logger.info('AI patient example generated successfully', {
        requestId,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
      });

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      logger.warn('AI patient example generation failed', {
        requestId,
        error: result.error,
      });

      // Use centralized error handler for consistent error format
      return NextResponse.json(
        {
          success: false,
          error: {
            message: result.error || 'Failed to generate patient example',
            code: 'GENERATION_ERROR',
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unexpected error generating AI patient example', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Use centralized error handler
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to generate patient example. Please try again.',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
