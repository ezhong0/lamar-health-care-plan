/**
 * Provider Service Tests
 *
 * Tests provider upsert logic and conflict detection.
 * Focus on business rules:
 * - Create new providers
 * - Return existing providers (same NPI + name)
 * - Throw on conflicts (same NPI, different name)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderService } from '@/lib/services/provider-service';
import { ProviderConflictError } from '@/lib/domain/errors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('ProviderService', () => {
  let service: ProviderService;

  beforeEach(() => {
    service = new ProviderService(prisma);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.order.deleteMany({});
      await prisma.provider.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
      console.log('Cleanup warning:', error instanceof Error ? error.message : error);
    }
  });

  describe('upsertProvider', () => {
    it('creates new provider when NPI does not exist', async () => {
      const result = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '9999999991',
      });

      expect(result.provider.name).toBe('Dr. Jane Smith');
      expect(result.provider.npi).toBe('9999999991');
      expect(result.provider.id).toBeDefined();
      expect(result.provider.createdAt).toBeInstanceOf(Date);
      expect(result.warnings).toEqual([]);
    });

    it('returns existing provider when NPI and name match', async () => {
      // Create provider first time
      const first = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '1245319599',
      });

      // Upsert again with same data
      const second = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '1245319599',
      });

      // Should return same provider
      expect(second.provider.id).toBe(first.provider.id);
      expect(second.provider.name).toBe(first.provider.name);
      expect(second.provider.npi).toBe(first.provider.npi);
    });

    it('returns existing provider with case-insensitive name match', async () => {
      const first = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '1679576722',
      });

      // Different case
      const second = await service.upsertProvider({
        name: 'dr. jane smith', // All lowercase
        npi: '1679576722',
      });

      // Should return same provider
      expect(second.provider.id).toBe(first.provider.id);
    });

    it('returns warning when NPI exists with different name', async () => {
      // Create provider
      await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '9999999991',
      });

      // Try to create with same NPI but different name
      const result = await service.upsertProvider({
        name: 'Dr. John Doe', // Different name
        npi: '9999999991', // Same NPI
      });

      // Should return existing provider with warning
      expect(result.provider.name).toBe('Dr. Jane Smith'); // Original name
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('PROVIDER_CONFLICT');
    });

    it('normalizes provider name to title case', async () => {
      const result = await service.upsertProvider({
        name: 'DR. JANE SMITH', // All caps
        npi: '1245319599',
      });

      // Should be normalized to title case
      expect(result.provider.name).toBe('Dr. Jane Smith');
    });

    it('removes formatting from NPI', async () => {
      const result = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '123-456-7893', // With dashes
      });

      // Should store without formatting
      expect(result.provider.npi).toBe('1234567893');
    });

    it('handles whitespace in input', async () => {
      const result = await service.upsertProvider({
        name: '  Dr. Jane Smith  ',
        npi: '  1234567893  ',
      });

      expect(result.provider.name).toBe('Dr. Jane Smith');
      expect(result.provider.npi).toBe('1234567893');
    });
  });

  describe('getProviderById', () => {
    it('returns provider when found', async () => {
      const result = await service.upsertProvider({
        name: 'Dr. Test',
        npi: '9999999991',
      });

      const found = await service.getProviderById(result.provider.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(result.provider.id);
      expect(found?.name).toBe(result.provider.name);
    });

    it('returns null when provider not found', async () => {
      const found = await service.getProviderById('nonexistent' as any);
      expect(found).toBeNull();
    });
  });

  describe('getProviderByNPI', () => {
    it('returns provider when found', async () => {
      await service.upsertProvider({
        name: 'Dr. Test',
        npi: '9999999991',
      });

      const found = await service.getProviderByNPI('9999999991');

      expect(found).not.toBeNull();
      expect(found?.npi).toBe('9999999991');
    });

    it('handles formatted NPI input', async () => {
      await service.upsertProvider({
        name: 'Dr. Test',
        npi: '9999999991',
      });

      // Search with formatted NPI (should strip dashes)
      const found = await service.getProviderByNPI('999-999-9991');

      expect(found).not.toBeNull();
      expect(found?.npi).toBe('9999999991');
    });

    it('returns null when provider not found', async () => {
      const found = await service.getProviderByNPI('9999999999');
      expect(found).toBeNull();
    });
  });
});
