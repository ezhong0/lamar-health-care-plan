/**
 * Database Connection Test Endpoint
 *
 * Use this to debug production database connection issues.
 * Visit: https://your-app.vercel.app/api/debug/db-test
 *
 * Returns:
 * - Success: Database connection working
 * - Error: Specific error message for debugging
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';

export async function GET() {
  const startTime = Date.now();

  try {
    // Test basic query
    const result = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;
    const queryTime = Date.now() - startTime;

    // Test table access
    const patientCount = await prisma.patient.count();
    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      details: {
        queryResult: result,
        patientCount,
        queryTime: `${queryTime}ms`,
        totalTime: `${totalTime}ms`,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'not set',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorTime: `${errorTime}ms`,
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 'set (check format)' : 'NOT SET',
        databaseHost: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'not set',
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
