/**
 * Provider Detail API Route
 * GET /api/providers/[id] - Get provider details with all orders
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { logger } from '@/lib/infrastructure/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    logger.info('Provider fetched', {
      providerId: provider.id,
      orderCount: provider._count.orders,
    });

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        npi: provider.npi,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        orderCount: provider._count.orders,
        orders: provider.orders,
      },
    });
  } catch (error) {
    const { id } = await params;
    logger.error('Failed to fetch provider', { error, providerId: id });

    return NextResponse.json(
      {
        error: 'Failed to fetch provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
