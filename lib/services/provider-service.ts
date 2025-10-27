/**
 * Provider Service
 *
 * Handles provider-related business logic:
 * - Upsert providers (create if new, return existing if found)
 * - Detect NPI conflicts (same NPI, different name)
 * - Transaction-safe operations
 *
 * Design decisions:
 * - Upsert pattern: Providers are de-duplicated by NPI (unique identifier)
 * - Conflict detection: If NPI exists with different name, raise warning
 * - Transaction support: Accepts Prisma transaction client for atomic operations
 *
 * Trade-offs:
 * - ✅ Prevents duplicate providers in database
 * - ✅ Catches data entry errors (wrong NPI for provider name)
 * - ❌ Doesn't verify against external NPI registry (would need API integration)
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { Result } from '@/lib/domain/result';
import type { Provider, ProviderId } from '@/lib/domain/types';
import type { ProviderConflictWarning } from '@/lib/domain/warnings';
import { toProviderId } from '@/lib/domain/types';
import { ProviderConflictError } from '@/lib/domain/errors';
import { logger } from '@/lib/infrastructure/logger';

export interface ProviderInput {
  name: string;
  npi: string;
}

export interface ProviderServiceResult {
  provider: Provider;
  warnings: ProviderConflictWarning[];
}

/**
 * Provider Service
 *
 * Uses dependency injection for testability.
 * All methods return Result types for explicit error handling.
 */
export class ProviderService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Upsert provider: create if new, return existing if found
   *
   * Behavior:
   * - If NPI doesn't exist: create new provider
   * - If NPI exists with SAME name: return existing (case-insensitive match)
   * - If NPI exists with DIFFERENT name: throw ProviderConflictError
   *
   * Why throw on conflict:
   * This is likely a data entry error. User entered wrong NPI for provider,
   * or wrong provider name for NPI. This should block patient creation until resolved.
   *
   * @param input - Provider name and NPI
   * @param tx - Optional Prisma transaction client
   * @returns Provider (existing or newly created)
   * @throws ProviderConflictError if NPI exists with different name
   *
   * @example
   * // New provider - creates
   * const provider = await service.upsertProvider({ name: 'Dr. Smith', npi: '1234567893' });
   *
   * // Existing provider with same name - returns existing
   * const provider = await service.upsertProvider({ name: 'Dr. Smith', npi: '1234567893' });
   *
   * // Existing NPI with different name - throws
   * await service.upsertProvider({ name: 'Dr. Jones', npi: '1234567893' }); // Error!
   */
  async upsertProvider(
    input: ProviderInput,
    tx?: Prisma.TransactionClient
  ): Promise<Provider> {
    const client = tx || this.db;
    const normalizedInput = this.normalizeProviderInput(input);

    logger.debug('Upserting provider', {
      npi: normalizedInput.npi,
      name: normalizedInput.name,
    });

    // Check for existing provider by NPI
    const existing = await client.provider.findUnique({
      where: { npi: normalizedInput.npi },
    });

    if (existing) {
      // Name match (case-insensitive) - return existing
      if (this.namesMatch(existing.name, normalizedInput.name)) {
        logger.debug('Provider already exists with same name', {
          providerId: existing.id,
          npi: existing.npi,
        });

        return this.toDomainProvider(existing);
      }

      // Name mismatch - conflict error
      logger.warn('Provider NPI conflict detected', {
        npi: normalizedInput.npi,
        existingName: existing.name,
        inputName: normalizedInput.name,
      });

      throw new ProviderConflictError(
        normalizedInput.npi,
        normalizedInput.name,
        existing.name
      );
    }

    // Create new provider
    logger.info('Creating new provider', {
      npi: normalizedInput.npi,
      name: normalizedInput.name,
    });

    const created = await client.provider.create({
      data: {
        name: normalizedInput.name,
        npi: normalizedInput.npi,
      },
    });

    logger.info('Provider created', {
      providerId: created.id,
      npi: created.npi,
    });

    return this.toDomainProvider(created);
  }

  /**
   * Get provider by ID
   *
   * @param providerId - Provider ID
   * @returns Provider or null if not found
   */
  async getProviderById(providerId: ProviderId): Promise<Provider | null> {
    const provider = await this.db.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return null;
    }

    return this.toDomainProvider(provider);
  }

  /**
   * Get provider by NPI
   *
   * @param npi - NPI number
   * @returns Provider or null if not found
   */
  async getProviderByNPI(npi: string): Promise<Provider | null> {
    const normalized = npi.replace(/[\s-]/g, '');

    const provider = await this.db.provider.findUnique({
      where: { npi: normalized },
    });

    if (!provider) {
      return null;
    }

    return this.toDomainProvider(provider);
  }

  /**
   * Normalize provider input
   *
   * - Trim whitespace
   * - Remove NPI formatting (dashes, spaces)
   * - Normalize name capitalization
   *
   * @param input - Raw provider input
   * @returns Normalized input
   */
  private normalizeProviderInput(input: ProviderInput): ProviderInput {
    return {
      name: this.normalizeName(input.name),
      npi: input.npi.replace(/[\s-]/g, ''),
    };
  }

  /**
   * Normalize provider name
   *
   * Converts to title case for consistency.
   * "john smith" → "John Smith"
   * "JOHN SMITH" → "John Smith"
   *
   * @param name - Raw name
   * @returns Title-cased name
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if two provider names match (case-insensitive, whitespace-insensitive)
   *
   * @param name1 - First name
   * @param name2 - Second name
   * @returns true if names match
   */
  private namesMatch(name1: string, name2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    return normalize(name1) === normalize(name2);
  }

  /**
   * Convert Prisma provider to domain provider
   *
   * Maps database types to domain types (Date objects, branded IDs).
   *
   * @param provider - Prisma provider
   * @returns Domain provider
   */
  private toDomainProvider(provider: {
    id: string;
    name: string;
    npi: string;
    createdAt: Date;
    updatedAt: Date;
  }): Provider {
    return {
      id: toProviderId(provider.id),
      name: provider.name,
      npi: provider.npi,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
