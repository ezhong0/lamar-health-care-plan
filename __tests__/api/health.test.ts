/**
 * API Health Check Tests
 *
 * These tests should catch basic deployment failures:
 * - Database connectivity
 * - API routes returning JSON (not HTML error pages)
 * - Basic endpoint functionality
 *
 * RUN THESE AFTER EVERY DEPLOYMENT!
 */

import { prisma } from '@/lib/infrastructure/db';

describe('API Health Checks', () => {
  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      // This test will fail if DATABASE_URL is not set or invalid
      await expect(prisma.$connect()).resolves.not.toThrow();
    });

    it('should be able to query database', async () => {
      // This will fail if migrations haven't run
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should have patients table', async () => {
      // This will fail if migrations haven't run
      await expect(
        prisma.patient.findMany({ take: 1 })
      ).resolves.not.toThrow();
    });
  });

  describe('API Routes Return JSON', () => {
    it('GET /api/patients should return JSON', async () => {
      const response = await fetch('http://localhost:3000/api/patients');
      const contentType = response.headers.get('content-type');

      // Should return JSON, not HTML error page
      expect(contentType).toContain('application/json');

      // Should be able to parse as JSON
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('GET /api/patients should have success property', async () => {
      const response = await fetch('http://localhost:3000/api/patients');
      const data = await response.json();

      // Should follow our API contract
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
    });
  });

  describe('API Error Responses', () => {
    it('should return JSON error for invalid patient ID', async () => {
      const response = await fetch('http://localhost:3000/api/patients/invalid-id');
      const contentType = response.headers.get('content-type');

      // Even errors should return JSON, not HTML
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
