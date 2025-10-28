/**
 * POST /api/examples/generate - Generate AI Patient Example
 *
 * Uses Claude AI to generate a realistic patient example for demonstration purposes.
 * Server-side only to protect API key.
 */

import { NextResponse } from 'next/server';
import { generatePatientExampleWithRetry } from '@/lib/examples/generate-patient-example';
import { logger } from '@/lib/infrastructure/logger';

export async function POST(): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  logger.info('AI patient example generation requested', { requestId });

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

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unexpected error generating AI patient example', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate patient example. Please try again.',
      },
      { status: 500 }
    );
  }
}
