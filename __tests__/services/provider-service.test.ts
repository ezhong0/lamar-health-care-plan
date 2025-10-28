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
      const provider = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '9999999991',
      });

      expect(provider.name).toBe('Dr. Jane Smith');
      expect(provider.npi).toBe('9999999991');
      expect(provider.id).toBeDefined();
      expect(provider.createdAt).toBeInstanceOf(Date);
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
      expect(second.id).toBe(first.id);
      expect(second.name).toBe(first.name);
      expect(second.npi).toBe(first.npi);
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
      expect(second.id).toBe(first.id);
    });

    it('throws ProviderConflictError when NPI exists with different name', async () => {
      // Create provider
      await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '9999999991',
      });

      // Try to create with same NPI but different name
      await expect(
        service.upsertProvider({
          name: 'Dr. John Doe', // Different name
          npi: '9999999991', // Same NPI
        })
      ).rejects.toThrow(ProviderConflictError);
    });

    it('normalizes provider name to title case', async () => {
      const provider = await service.upsertProvider({
        name: 'DR. JANE SMITH', // All caps
        npi: '1245319599',
      });

      // Should be normalized to title case
      expect(provider.name).toBe('Dr. Jane Smith');
    });

    it('removes formatting from NPI', async () => {
      const provider = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '123-456-7893', // With dashes
      });

      // Should store without formatting
      expect(provider.npi).toBe('9999999991');
    });

    it('handles whitespace in input', async () => {
      const provider = await service.upsertProvider({
        name: '  Dr. Jane Smith  ',
        npi: '  1234567893  ',
      });

      expect(provider.name).toBe('Dr. Jane Smith');
      expect(provider.npi).toBe('9999999991');
    });
  });

  describe('getProviderById', () => {
    it('returns provider when found', async () => {
      const created = await service.upsertProvider({
        name: 'Dr. Test',
        npi: '9999999991',
      });

      const found = await service.getProviderById(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(created.name);
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
