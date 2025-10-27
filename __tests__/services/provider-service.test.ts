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
    await prisma.order.deleteMany({});
    await prisma.provider.deleteMany({});
  });

  describe('upsertProvider', () => {
    it('creates new provider when NPI does not exist', async () => {
      const provider = await service.upsertProvider({
        name: 'Dr. Jane Smith',
        npi: '1234567893',
      });

      expect(provider.name).toBe('Dr. Jane Smith');
      expect(provider.npi).toBe('1234567893');
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
        npi: '1234567893',
      });

      // Try to create with same NPI but different name
      await expect(
        service.upsertProvider({
          name: 'Dr. John Doe', // Different name
          npi: '1234567893', // Same NPI
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
      expect(provider.npi).toBe('1234567893');
    });

    it('handles whitespace in input', async () => {
      const provider = await service.upsertProvider({
        name: '  Dr. Jane Smith  ',
        npi: '  1234567893  ',
      });

      expect(provider.name).toBe('Dr. Jane Smith');
      expect(provider.npi).toBe('1234567893');
    });
  });

  describe('getProviderById', () => {
    it('returns provider when found', async () => {
      const created = await service.upsertProvider({
        name: 'Dr. Test',
        npi: '1234567893',
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
        npi: '1234567893',
      });

      const found = await service.getProviderByNPI('1234567893');

      expect(found).not.toBeNull();
      expect(found?.npi).toBe('1234567893');
    });

    it('handles formatted NPI input', async () => {
      await service.upsertProvider({
        name: 'Dr. Test',
        npi: '1234567893',
      });

      // Search with formatted NPI
      const found = await service.getProviderByNPI('123-456-7893');

      expect(found).not.toBeNull();
      expect(found?.npi).toBe('1234567893');
    });

    it('returns null when provider not found', async () => {
      const found = await service.getProviderByNPI('9999999999');
      expect(found).toBeNull();
    });
  });
});
