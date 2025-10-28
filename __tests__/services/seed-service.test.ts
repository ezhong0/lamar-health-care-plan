/**
 * Seed Service Tests
 *
 * Tests demo data generation functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SeedService } from '@/lib/services/seed-service';
import { PatientService } from '@/lib/services/patient-service';
import { ProviderService } from '@/lib/services/provider-service';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('SeedService', () => {
  let seedService: SeedService;
  let patientService: PatientService;

  beforeEach(() => {
    const providerService = new ProviderService(prisma);
    const duplicateDetector = new DuplicateDetector(prisma);
    patientService = new PatientService(prisma, providerService, duplicateDetector);
    seedService = new SeedService(prisma, patientService);
  });

  afterEach(async () => {
    // Clean up test data - delete in correct order to avoid FK constraints
    try {
      await prisma.carePlan.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.patient.deleteMany({});
      await prisma.provider.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors - database might already be clean
      console.log('Cleanup warning:', error instanceof Error ? error.message : error);
    }
  });

  describe('seedDemoData', () => {
    it('creates demo patients successfully', async () => {
      const result = await seedService.seedDemoData();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.patientsCreated).toBeGreaterThan(0);
      }
    });

    it('creates expected number of patients', async () => {
      const result = await seedService.seedDemoData();

      expect(result.success).toBe(true);
      if (result.success) {
        // Should create at least 3 demo patients
        expect(result.data.patientsCreated).toBeGreaterThanOrEqual(3);
      }
    });

    it('creates patients with valid data', async () => {
      await seedService.seedDemoData();

      const patients = await prisma.patient.findMany();

      expect(patients.length).toBeGreaterThan(0);

      for (const patient of patients) {
        expect(patient.firstName).toBeTruthy();
        expect(patient.lastName).toBeTruthy();
        expect(patient.mrn).toMatch(/^\d{6}$/); // 6-digit MRN
        expect(patient.patientRecords).toBeTruthy();
      }
    });

    it('creates providers with valid NPIs', async () => {
      await seedService.seedDemoData();

      const providers = await prisma.provider.findMany();

      expect(providers.length).toBeGreaterThan(0);

      for (const provider of providers) {
        expect(provider.name).toBeTruthy();
        expect(provider.npi).toMatch(/^\d{10}$/); // 10-digit NPI
      }
    });

    it('creates orders for patients', async () => {
      await seedService.seedDemoData();

      const orders = await prisma.order.findMany();

      expect(orders.length).toBeGreaterThan(0);

      for (const order of orders) {
        expect(order.medicationName).toBeTruthy();
        expect(order.primaryDiagnosis).toBeTruthy();
        expect(['pending', 'approved', 'rejected']).toContain(order.status);
      }
    });

    it('is idempotent - can run multiple times', async () => {
      const result1 = await seedService.seedDemoData();
      expect(result1.success).toBe(true);

      // Run again without cleaning - should clear and re-seed
      const result2 = await seedService.seedDemoData();
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Should create same number of patients
        expect(result2.data.patientsCreated).toBe(result1.data.patientsCreated);
        // Should have cleared the previous batch
        expect(result2.data.patientsCleared).toBeGreaterThan(0);
      }
    });

    it('clears previous demo data before seeding', async () => {
      // First seed
      const result1 = await seedService.seedDemoData();
      expect(result1.success).toBe(true);

      // Second seed should clear first
      const result2 = await seedService.seedDemoData();
      expect(result2.success).toBe(true);

      if (result2.success) {
        // Should have cleared patients from first seed
        expect(result2.data.patientsCleared).toBeGreaterThan(0);
      }
    });

    it('creates realistic patient records', async () => {
      await seedService.seedDemoData();

      const patients = await prisma.patient.findMany();

      // Check first patient has detailed records
      const firstPatient = patients[0];
      expect(firstPatient.patientRecords.length).toBeGreaterThan(100);
      expect(firstPatient.patientRecords).toContain('PRIMARY DIAGNOSIS');
    });

    it('creates patients with ICD-10 diagnoses', async () => {
      await seedService.seedDemoData();

      const orders = await prisma.order.findMany();

      for (const order of orders) {
        // ICD-10 codes should match format
        expect(order.primaryDiagnosis).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
      }
    });

    it('creates providers that can be reused', async () => {
      await seedService.seedDemoData();

      const providers = await prisma.provider.findMany();
      const orders = await prisma.order.findMany();

      // Each order should reference a provider
      for (const order of orders) {
        const provider = providers.find((p) => p.id === order.providerId);
        expect(provider).toBeDefined();
      }
    });

    it('includes medication history for patients', async () => {
      await seedService.seedDemoData();

      const patients = await prisma.patient.findMany();

      // At least one patient should have medication history
      const patientsWithMeds = patients.filter((p) => p.medicationHistory.length > 0);
      expect(patientsWithMeds.length).toBeGreaterThan(0);
    });

    it('includes additional diagnoses for patients', async () => {
      await seedService.seedDemoData();

      const patients = await prisma.patient.findMany();

      // At least one patient should have additional diagnoses
      const patientsWithAdditionalDx = patients.filter((p) => p.additionalDiagnoses.length > 0);
      expect(patientsWithAdditionalDx.length).toBeGreaterThan(0);
    });

    it('returns summary of created data', async () => {
      const result = await seedService.seedDemoData();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('patientsCreated');
        expect(result.data).toHaveProperty('patientsCleared');
        expect(typeof result.data.patientsCreated).toBe('number');
        expect(typeof result.data.patientsCleared).toBe('number');
      }
    });
  });

  describe('getDemoStats', () => {
    it('returns statistics for demo data', async () => {
      // Seed demo data first
      await seedService.seedDemoData();

      const stats = await seedService.getDemoStats();

      expect(stats).toHaveProperty('patients');
      expect(stats).toHaveProperty('orders');
      expect(stats).toHaveProperty('carePlans');
      expect(typeof stats.patients).toBe('number');
      expect(typeof stats.orders).toBe('number');
      expect(typeof stats.carePlans).toBe('number');
    });

    it('returns zero counts when no demo data exists', async () => {
      const stats = await seedService.getDemoStats();

      expect(stats.patients).toBe(0);
      expect(stats.orders).toBe(0);
      expect(stats.carePlans).toBe(0);
    });
  });
});
