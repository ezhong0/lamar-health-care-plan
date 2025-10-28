/**
 * Export Service Tests
 *
 * Tests CSV generation for pharma reporting.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExportService } from '@/lib/services/export-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('ExportService', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService(prisma);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.carePlan.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.provider.deleteMany({});
  });

  describe('exportPatientsToCSV', () => {
    it('generates CSV with correct headers', async () => {
      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split('\n');
        const headers = lines[0];

        expect(headers).toContain('MRN');
        expect(headers).toContain('First Name');
        expect(headers).toContain('Last Name');
        expect(headers).toContain('Medication');
        expect(headers).toContain('Primary Diagnosis');
        expect(headers).toContain('Provider NPI');
        expect(headers).toContain('Care Plan Generated');
      }
    });

    it('exports patient data correctly', async () => {
      // Create test data
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: ['E11.9'],
          medicationHistory: ['Metformin'],
          patientRecords: 'Test records',
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        const csv = result.data;

        expect(csv).toContain('123456');
        expect(csv).toContain('John');
        expect(csv).toContain('Doe');
        expect(csv).toContain('IVIG');
        expect(csv).toContain('J45.50');
        expect(csv).toContain('Dr. Test');
        expect(csv).toContain('1234567893');
      }
    });

    it('handles empty database', async () => {
      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split('\n');
        // Should have header row only
        expect(lines.length).toBe(1);
      }
    });

    it('escapes CSV special characters correctly', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Smith, MD',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'O\'Brien',
          lastName: 'Smith, Jr.',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Records with "quotes" and, commas',
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        // Check that fields with commas are quoted
        expect(result.data).toContain('"Dr. Smith, MD"');
        expect(result.data).toContain('"Smith, Jr."');
      }
    });

    it('handles multiple patients', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      // Create multiple patients
      for (let i = 1; i <= 3; i++) {
        const patient = await prisma.patient.create({
          data: {
            firstName: `Patient${i}`,
            lastName: `Test${i}`,
            mrn: `12345${i}`,
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Test',
          },
        });

        await prisma.order.create({
          data: {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'J45.50',
            status: 'pending',
          },
        });
      }

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        const lines = result.data.split('\n');
        // Header + 3 patients
        expect(lines.length).toBe(4);

        expect(result.data).toContain('Patient1');
        expect(result.data).toContain('Patient2');
        expect(result.data).toContain('Patient3');
      }
    });

    it('includes care plan status', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      await prisma.carePlan.create({
        data: {
          patientId: patient.id,
          content: '# Care Plan\n\nTest content',
          generatedBy: 'Claude AI',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain('Yes'); // Care Plan Generated column
      }
    });

    it('handles patients with no orders', async () => {
      await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toContain('N/A'); // For missing order fields
      }
    });

    it('formats dates correctly', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
          createdAt: new Date('2024-01-15T10:30:00Z'),
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        // Should contain YYYY-MM-DD format
        expect(result.data).toMatch(/2024-01-15/);
      }
    });

    it('handles additional diagnoses array', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: ['E11.9', 'I10', 'G70.00'],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        // Should be semicolon-separated
        expect(result.data).toContain('E11.9; I10; G70.00');
      }
    });

    it('truncates long care plan summaries', async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Dr. Test',
          npi: '1234567893',
        },
      });

      const patient = await prisma.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      await prisma.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'J45.50',
          status: 'pending',
        },
      });

      // Create very long care plan
      const longContent = 'a'.repeat(500);
      await prisma.carePlan.create({
        data: {
          patientId: patient.id,
          content: longContent,
          generatedBy: 'Claude AI',
        },
      });

      const result = await exportService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      if (result.success) {
        // Should be truncated to 200 chars + ellipsis
        const lines = result.data.split('\n');
        const dataRow = lines[1];
        expect(dataRow.length).toBeLessThan(longContent.length);
        expect(result.data).toContain('...');
      }
    });
  });
});
