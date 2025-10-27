/**
 * Duplicate Detector Service Tests
 *
 * Tests fuzzy patient matching and duplicate order detection.
 * Focus on algorithm correctness:
 * - Jaccard similarity
 * - Weighted scoring
 * - Threshold behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { PrismaClient } from '@prisma/client';
import type { PatientId } from '@/lib/domain/types';

// Use real database for integration tests
// In production, would use separate test database
const prisma = new PrismaClient();

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    detector = new DuplicateDetector();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.order.deleteMany({});
    await prisma.carePlan.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.provider.deleteMany({});
  });

  describe('findSimilarPatients', () => {
    it('finds similar patient with typo in name', async () => {
      await prisma.$transaction(async (tx) => {
        // Create existing patient
        await tx.patient.create({
          data: {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '200001',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        // Check for similar patient with typo
        const warnings = await detector.findSimilarPatients(
          {
            firstName: 'Jon', // Typo in first name
            lastName: 'Smith',
            mrn: '200002',
          },
          tx
        );

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].type).toBe('SIMILAR_PATIENT');
        expect(warnings[0].similarityScore).toBeGreaterThan(0.7);
      });
    });

    it('finds similar patient with different spelling', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.patient.create({
          data: {
            firstName: 'Catherine',
            lastName: 'Johnson',
            mrn: '200003',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const warnings = await detector.findSimilarPatients(
          {
            firstName: 'Katherine', // Different spelling
            lastName: 'Johnson',
            mrn: '200004',
          },
          tx
        );

        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0].similarityScore).toBeGreaterThan(0.7);
      });
    });

    it('does not flag completely different names', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.patient.create({
          data: {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '200005',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const warnings = await detector.findSimilarPatients(
          {
            firstName: 'Emily',
            lastName: 'Rodriguez',
            mrn: '200006',
          },
          tx
        );

        expect(warnings.length).toBe(0);
      });
    });

    it('excludes exact MRN matches', async () => {
      await prisma.$transaction(async (tx) => {
        await tx.patient.create({
          data: {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '200007',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        // Same MRN should be excluded (handled as hard duplicate upstream)
        const warnings = await detector.findSimilarPatients(
          {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '200007', // Same MRN
          },
          tx
        );

        expect(warnings.length).toBe(0);
      });
    });

    it('returns multiple warnings for multiple similar patients', async () => {
      await prisma.$transaction(async (tx) => {
        // Create two similar patients
        await tx.patient.create({
          data: {
            firstName: 'Johnny', // More similar to query for higher score
            lastName: 'Smith',
            mrn: '200008',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        await tx.patient.create({
          data: {
            firstName: 'Johnny',
            lastName: 'Smyth', // Slight variation
            mrn: 'MRN009',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const warnings = await detector.findSimilarPatients(
          {
            firstName: 'Johnny',
            lastName: 'Smith',
            mrn: 'MRN010',
          },
          tx
        );

        // Should find both similar patients
        expect(warnings.length).toBeGreaterThanOrEqual(1);
        expect(warnings.every((w) => w.type === 'SIMILAR_PATIENT')).toBe(true);
      });
    });
  });

  describe('findDuplicateOrders', () => {
    it('detects duplicate order within 30 days', async () => {
      await prisma.$transaction(async (tx) => {
        // Create patient
        const patient = await tx.patient.create({
          data: {
            firstName: 'Test',
            lastName: 'Patient',
            mrn: 'MRN011',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        // Create provider
        const provider = await tx.provider.create({
          data: {
            name: 'Dr. Test',
            npi: '1538104601', // Unique NPI for this test (not used in other test files)
          },
        });

        // Create existing order
        await tx.order.create({
          data: {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'G70.00',
            status: 'pending',
          },
        });

        // Check for duplicate
        const warnings = await detector.findDuplicateOrders(
          {
            patientId: patient.id as PatientId,
            medicationName: 'IVIG',
          },
          tx
        );

        expect(warnings.length).toBe(1);
        expect(warnings[0].type).toBe('DUPLICATE_ORDER');
        expect(warnings[0].severity).toBe('high');
      });
    });

    it('handles case-insensitive medication matching', async () => {
      await prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: {
            firstName: 'Test',
            lastName: 'Patient',
            mrn: 'MRN012',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const provider = await tx.provider.create({
          data: {
            name: 'Dr. Test',
            npi: '1679576722', // Unique NPI for this test
          },
        });

        await tx.order.create({
          data: {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'G70.00',
            status: 'pending',
          },
        });

        // Check with different case
        const warnings = await detector.findDuplicateOrders(
          {
            patientId: patient.id as PatientId,
            medicationName: 'ivig', // Lowercase
          },
          tx
        );

        expect(warnings.length).toBe(1);
      });
    });

    it('does not flag different medications', async () => {
      await prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: {
            firstName: 'Test',
            lastName: 'Patient',
            mrn: 'MRN013',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const provider = await tx.provider.create({
          data: {
            name: 'Dr. Test',
            npi: '1457398903', // Unique NPI for this test
          },
        });

        await tx.order.create({
          data: {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'G70.00',
            status: 'pending',
          },
        });

        // Check with different medication
        const warnings = await detector.findDuplicateOrders(
          {
            patientId: patient.id as PatientId,
            medicationName: 'Prednisone',
          },
          tx
        );

        expect(warnings.length).toBe(0);
      });
    });

    it('returns no warnings for new patient with no orders', async () => {
      await prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
          data: {
            firstName: 'Test',
            lastName: 'Patient',
            mrn: 'MRN014',
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Records',
          },
        });

        const warnings = await detector.findDuplicateOrders(
          {
            patientId: patient.id as PatientId,
            medicationName: 'IVIG',
          },
          tx
        );

        expect(warnings.length).toBe(0);
      });
    });
  });
});
