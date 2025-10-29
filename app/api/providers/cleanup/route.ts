/**
 * Provider Cleanup API Route
 * DELETE /api/providers/cleanup - Delete orphaned providers (providers with no orders)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { logger } from '@/lib/infrastructure/logger';
import { handleError } from '@/lib/infrastructure/error-handler';

export async function DELETE() {
  // SECURITY: Only allow in development/test environments
  // While this only deletes orphaned providers, it's still a maintenance endpoint
  // that should not be publicly accessible in production
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Provider cleanup blocked in production');
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'This endpoint is not available in production',
          code: 'FORBIDDEN',
        },
      },
      { status: 403 }
    );
  }

  try {
    logger.info('Starting provider cleanup');

    // Find all providers with no orders
    const orphanedProviders = await prisma.provider.findMany({
      where: {
        orders: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        npi: true,
      },
    });

    if (orphanedProviders.length === 0) {
      logger.info('No orphaned providers found');
      return NextResponse.json({
        success: true,
        data: {
          deletedCount: 0,
          message: 'No orphaned providers to delete',
        },
      });
    }

    // Delete orphaned providers
    const deleteResult = await prisma.provider.deleteMany({
      where: {
        orders: {
          none: {},
        },
      },
    });

    logger.info('Orphaned providers deleted', {
      count: deleteResult.count,
      providers: orphanedProviders.map((p) => ({ name: p.name, npi: p.npi })),
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleteResult.count,
        deletedProviders: orphanedProviders.map((p) => ({
          name: p.name,
          npi: p.npi,
        })),
        message: `Successfully deleted ${deleteResult.count} orphaned provider${
          deleteResult.count === 1 ? '' : 's'
        }`,
      },
    });
  } catch (error) {
    logger.error('Failed to cleanup providers', { error });
    return handleError(error);
  }
}
