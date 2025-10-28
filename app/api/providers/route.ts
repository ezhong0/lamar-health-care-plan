/**
 * Providers API Route
 * GET /api/providers - List all providers with order counts
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { logger } from '@/lib/infrastructure/logger';
import { handleError } from '@/lib/infrastructure/error-handler';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          npi: {
            contains: search,
          },
        },
      ];
    }

    // Fetch providers with order counts
    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        include: {
          orders: {
            select: {
              id: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.provider.count({ where }),
    ]);

    // Transform to include order count and last order date
    const providersWithStats = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      npi: provider.npi,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      orderCount: provider._count.orders,
      lastOrderDate: provider.orders[0]?.createdAt || null,
    }));

    logger.info('Providers fetched', {
      count: providersWithStats.length,
      total,
      search,
    });

    return NextResponse.json({
      providers: providersWithStats,
      total,
      limit,
      offset,
      hasMore: offset + providersWithStats.length < total,
    });
  } catch (error) {
    logger.error('Failed to fetch providers', { error });
    return handleError(error);
  }
}
