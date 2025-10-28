/**
 * Debug Environment Variables Route
 *
 * TEMPORARY: This route checks if environment variables are loaded.
 * DELETE THIS FILE after debugging!
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development/preview - block in production for security
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint disabled in production' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    hasDatabase: !!process.env.DATABASE_URL,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    databasePrefix: process.env.DATABASE_URL?.substring(0, 15) || 'NOT SET',
    anthropicPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 6) || 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
