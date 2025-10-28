/**
 * Orders API Route
 * GET /api/orders - List all orders with patient and provider info
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { logger } from '@/lib/infrastructure/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status');
    const medication = searchParams.get('medication');

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (medication) {
      where.medicationName = {
        contains: medication,
        mode: 'insensitive',
      };
    }

    // Fetch orders with patient and provider info
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mrn: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              npi: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    logger.info('Orders fetched', {
      count: orders.length,
      total,
      status,
      medication,
    });

    return NextResponse.json({
      orders,
      total,
      limit,
      offset,
      hasMore: offset + orders.length < total,
    });
  } catch (error) {
    logger.error('Failed to fetch orders', { error });

    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
