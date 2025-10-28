/**
 * Centralized error handler for API routes
 *
 * Converts various error types (Domain errors, Zod errors, Prisma errors, unexpected errors)
 * into consistent HTTP responses with appropriate status codes and error messages.
 */

import { NextResponse } from 'next/server';
import { DomainError } from '@/lib/domain/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export function handleError(error: unknown): NextResponse {
  // Domain errors (expected business failures)
  if (error instanceof DomainError) {
    logger.warn('Domain error occurred', {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Validation errors (Zod)
  if (error instanceof ZodError) {
    logger.warn('Validation error', { errors: error.issues });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Database errors (Prisma)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Database error', { code: error.code, message: error.message });

    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      // Extract the field name from the error meta
      const target = (error.meta?.target as string[]) || [];
      const fieldName = target[0] || 'identifier';

      // Create user-friendly field names
      const fieldLabel = fieldName === 'mrn' ? 'MRN' : fieldName;

      return NextResponse.json(
        {
          success: false,
          error: {
            message: `${fieldLabel} already exists. Please use a different ${fieldLabel}.`,
            code: 'DUPLICATE_RECORD',
          },
        },
        { status: 409 }
      );
    }

    // P2025: Record not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Record not found',
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }

  // Unexpected errors (log with full details)
  logger.error('Unexpected error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
    },
    { status: 500 }
  );
}
