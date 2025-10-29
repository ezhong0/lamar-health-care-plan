/**
 * Rate Limiting Infrastructure
 *
 * Protects API endpoints from abuse using Upstash Redis-backed rate limiting.
 * Prevents:
 * - Malicious spam attacks
 * - Accidental infinite loops
 * - LLM cost explosions
 * - DDoS attacks
 *
 * Why this is critical:
 * - Without rate limiting, a simple script can generate $1,000+ in LLM costs
 * - Healthcare apps are attractive targets for attackers
 * - Vercel will suspend accounts for abuse
 *
 * Implementation:
 * - Uses Upstash Redis (free tier: 10K commands/day)
 * - Sliding window algorithm (smooth traffic distribution)
 * - IP-based identification (works with Vercel's proxy headers)
 * - Graceful degradation if Redis is unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Rate limit tier definitions
 *
 * Each tier has different limits based on endpoint cost/sensitivity:
 * - STRICT: Expensive LLM operations (care plan generation)
 * - MODERATE: Medium-cost LLM operations (example generation)
 * - STANDARD: Database mutations (patient creation)
 * - RELAXED: Read operations (list endpoints)
 */
export const RATE_LIMITS = {
  /** Care plan generation: 3/min, most expensive endpoint */
  CARE_PLAN_GENERATION: {
    requests: 3,
    window: '60 s',
    description: 'Care plan generation (LLM-powered)',
  },

  /** Example generation: 5/min, moderate LLM cost */
  EXAMPLE_GENERATION: {
    requests: 5,
    window: '60 s',
    description: 'AI example generation',
  },

  /** Patient creation: 10/min, prevents spam */
  PATIENT_CREATION: {
    requests: 10,
    window: '60 s',
    description: 'Patient creation',
  },

  /** General mutations: 20/min */
  GENERAL_MUTATION: {
    requests: 20,
    window: '60 s',
    description: 'General mutations',
  },

  /** Read operations: 100/min */
  READ_OPERATIONS: {
    requests: 100,
    window: '60 s',
    description: 'Read operations',
  },
} as const;

/**
 * Rate limiter instances (lazy initialization)
 */
let rateLimiters: Record<string, Ratelimit> | null = null;

/**
 * Initialize rate limiters
 *
 * Uses lazy initialization to avoid errors in test environments
 * where UPSTASH_REDIS_REST_URL might not be set.
 */
function getRateLimiters(): Record<string, Ratelimit> | null {
  // Return cached instances if available
  if (rateLimiters) {
    return rateLimiters;
  }

  // Check if Redis is configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    logger.warn('Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // Initialize rate limiters for each tier
    rateLimiters = {
      carePlan: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.CARE_PLAN_GENERATION.requests,
          RATE_LIMITS.CARE_PLAN_GENERATION.window
        ),
        analytics: true,
        prefix: 'ratelimit:care-plan',
      }),

      example: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.EXAMPLE_GENERATION.requests,
          RATE_LIMITS.EXAMPLE_GENERATION.window
        ),
        analytics: true,
        prefix: 'ratelimit:example',
      }),

      patientCreate: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.PATIENT_CREATION.requests,
          RATE_LIMITS.PATIENT_CREATION.window
        ),
        analytics: true,
        prefix: 'ratelimit:patient-create',
      }),

      mutation: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.GENERAL_MUTATION.requests,
          RATE_LIMITS.GENERAL_MUTATION.window
        ),
        analytics: true,
        prefix: 'ratelimit:mutation',
      }),

      read: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          RATE_LIMITS.READ_OPERATIONS.requests,
          RATE_LIMITS.READ_OPERATIONS.window
        ),
        analytics: true,
        prefix: 'ratelimit:read',
      }),
    };

    logger.info('Rate limiting initialized successfully');
    return rateLimiters;
  } catch (error) {
    logger.error('Failed to initialize rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get client identifier from request
 *
 * Uses IP address as identifier. In production with Vercel,
 * x-forwarded-for header contains the real client IP.
 *
 * Fallback chain:
 * 1. x-forwarded-for (Vercel proxy)
 * 2. x-real-ip (other proxies)
 * 3. 'anonymous' (testing/development)
 */
function getClientIdentifier(req: NextRequest): string {
  // Try Vercel's forwarded IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Try x-real-ip
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for development/testing
  return 'anonymous';
}

/**
 * Apply rate limiting to an API route
 *
 * Returns null if rate limit passed, or NextResponse with 429 error if exceeded.
 *
 * @param req - Next.js request object
 * @param limiterKey - Which rate limiter to use ('carePlan', 'example', etc.)
 * @returns null if allowed, NextResponse with 429 if rate limited
 *
 * @example
 * const rateLimitResult = await checkRateLimit(req, 'carePlan');
 * if (rateLimitResult) {
 *   return rateLimitResult; // Return 429 error
 * }
 * // Continue with normal logic...
 */
export async function checkRateLimit(
  req: NextRequest,
  limiterKey: 'carePlan' | 'example' | 'patientCreate' | 'mutation' | 'read'
): Promise<NextResponse | null> {
  const limiters = getRateLimiters();

  // If rate limiting not configured, allow the request (graceful degradation)
  if (!limiters) {
    logger.debug('Rate limiting check skipped (not configured)', { limiterKey });
    return null;
  }

  const limiter = limiters[limiterKey];
  const identifier = getClientIdentifier(req);

  try {
    const { success, limit, reset, remaining, pending } = await limiter.limit(identifier);

    logger.debug('Rate limit check', {
      limiterKey,
      identifier,
      success,
      limit,
      remaining,
      reset: new Date(reset).toISOString(),
    });

    // Wait for pending operations to complete
    await pending;

    if (!success) {
      logger.warn('Rate limit exceeded', {
        limiterKey,
        identifier,
        limit,
        reset: new Date(reset).toISOString(),
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              limit,
              reset: new Date(reset).toISOString(),
              retryAfter: Math.ceil((reset - Date.now()) / 1000),
            },
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Rate limit passed
    return null;
  } catch (error) {
    // If rate limiting fails, allow the request (graceful degradation)
    logger.error('Rate limit check failed, allowing request', {
      limiterKey,
      identifier,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Higher-order function to wrap API routes with rate limiting
 *
 * @example
 * export const POST = withRateLimit('carePlan', async (req) => {
 *   // Your normal route handler logic
 *   return NextResponse.json({ success: true });
 * });
 */
export function withRateLimit(
  limiterKey: 'carePlan' | 'example' | 'patientCreate' | 'mutation' | 'read',
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(req, limiterKey);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Call original handler
    return handler(req, ...args);
  };
}
