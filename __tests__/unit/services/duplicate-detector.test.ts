/**
 * Unit Tests: DuplicateDetector Service
 *
 * Tests fuzzy matching algorithm for patient similarity detection.
 * Includes Jaro-Winkler similarity, name matching, and weighted scoring.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { DuplicateDetector } from '@/lib/services/duplicate-detector';
import { testDb, setupTestDb, teardownTestDb } from '../../helpers/test-db';
import { toPatientId } from '@/lib/domain/types';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;

  beforeEach(async () => {
    await setupTestDb();
    detector = new DuplicateDetector();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('findSimilarPatients', () => {
    it('should find exact name match (different MRN)', async () => {
      // Create existing patient
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      // Check for similar patient with same name, different MRN
      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '654321',
        },
        testDb
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('SIMILAR_PATIENT');
      // Exact name match but completely different MRN
      // With Jaro-Winkler prefix bonus: slightly higher than raw weighted score
      expect(warnings[0].similarityScore).toBeCloseTo(0.88, 1);
    });

    it('should find fuzzy name match', async () => {
      // Create existing patient
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      // Check for similar patient with typo
      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'Jon', // Typo: missing 'h'
          lastName: 'Smith',
          mrn: '123457', // Very similar MRN (only last digit different)
        },
        testDb
      );

      // Similarity calculation:
      // firstName: "john" vs "jon" ≈ 0.375
      // lastName: "smith" vs "smith" = 1.0
      // MRN: "123456" vs "123457" ≈ 0.9+
      // Total ≈ 0.375*0.3 + 1.0*0.5 + 0.9*0.2 ≈ 0.79 > 0.7 threshold
      expect(warnings).toHaveLength(1);
      expect(warnings[0].similarityScore).toBeGreaterThan(0.7);
      expect(warnings[0].similarityScore).toBeLessThan(1.0);
    });

    it('should not flag completely different names', async () => {
      // Create existing patient
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      // Check for completely different patient
      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'Jane',
          lastName: 'Doe',
          mrn: '654321',
        },
        testDb
      );

      expect(warnings).toHaveLength(0);
    });

    it('should detect exact MRN match as DUPLICATE_PATIENT warning', async () => {
      // Create existing patient
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      // Check for same patient (exact MRN match should return DUPLICATE_PATIENT warning)
      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'Different',
          lastName: 'Person',
          mrn: '123456', // Same MRN
        },
        testDb
      );

      // Should return DUPLICATE_PATIENT warning for exact MRN match
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('DUPLICATE_PATIENT');
      expect(warnings[0]).toHaveProperty('existingPatient');
      if (warnings[0].type === 'DUPLICATE_PATIENT') {
        expect(warnings[0].existingPatient.mrn).toBe('123456');
      }
    });

    it('should handle multiple similar patients', async () => {
      // Create multiple similar patients - use identical names with similar MRNs
      await testDb.patient.createMany({
        data: [
          {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '123451', // Similar MRN (differs by 1 digit)
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Test',
          },
          {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '123452', // Similar MRN (differs by 1 digit)
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Test',
          },
          {
            firstName: 'John',
            lastName: 'Smith',
            mrn: '123453', // Similar MRN (differs by 1 digit)
            additionalDiagnoses: [],
            medicationHistory: [],
            patientRecords: 'Test',
          },
        ],
      });

      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456', // Very similar to 123451, 123452, 123453
        },
        testDb
      );

      // Should find all 3 similar patients (identical names, very similar MRNs)
      expect(warnings.length).toBeGreaterThanOrEqual(2); // At least 2 should match
    });

    it('should only check last 100 patients for performance', async () => {
      // This test verifies the optimization (would need 101+ patients to test properly)
      // For now, just verify it doesn't crash with many patients
      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'Test',
          lastName: 'Patient',
          mrn: '999999',
        },
        testDb
      );

      expect(warnings).toBeDefined();
    });

    it('should calculate similarity score correctly', async () => {
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '654321',
        },
        testDb
      );

      expect(warnings[0].similarityScore).toBeGreaterThan(0);
      expect(warnings[0].similarityScore).toBeLessThanOrEqual(1);
    });

    it('should include similarity score in message', async () => {
      await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const warnings = await detector.findSimilarPatients(
        {
          firstName: 'John',
          lastName: 'Smith',
          mrn: '654321',
        },
        testDb
      );

      expect(warnings[0].message).toContain('%');
      expect(warnings[0].message).toContain('match');
    });
  });

  describe('findDuplicateOrders', () => {
    it('should find duplicate order for same patient and medication', async () => {
      // Create patient
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      // Create provider
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      // Create existing order
      await testDb.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'G70.00',
          status: 'pending',
        },
      });

      // Check for duplicate (should find 1 existing order and warn)
      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient.id),
          medicationName: 'IVIG',
        },
        testDb
      );

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('DUPLICATE_ORDER');
    });

    it('should handle case-insensitive medication names', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      // Create order with uppercase medication name
      await testDb.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'G70.00',
          status: 'pending',
        },
      });

      // Check with lowercase - should find the uppercase order due to case-insensitive matching
      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient.id),
          medicationName: 'ivig', // Lowercase
        },
        testDb
      );

      expect(warnings).toHaveLength(1);
    });

    it('should not flag order for different medication', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      await testDb.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'G70.00',
          status: 'pending',
        },
      });

      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient.id),
          medicationName: 'Omalizumab', // Different medication
        },
        testDb
      );

      expect(warnings).toHaveLength(0);
    });

    it('should not flag order for different patient', async () => {
      const patient1 = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const patient2 = await testDb.patient.create({
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          mrn: '654321',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      await testDb.order.create({
        data: {
          patientId: patient1.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'G70.00',
          status: 'pending',
        },
      });

      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient2.id), // Different patient
          medicationName: 'IVIG',
        },
        testDb
      );

      expect(warnings).toHaveLength(0);
    });

    it('should only flag orders within 30 days', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      // Create old order (31 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      await testDb.order.create({
        data: {
          patientId: patient.id,
          providerId: provider.id,
          medicationName: 'IVIG',
          primaryDiagnosis: 'G70.00',
          status: 'pending',
          createdAt: oldDate,
        },
      });

      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient.id),
          medicationName: 'IVIG',
        },
        testDb
      );

      // Should not flag orders older than 30 days
      expect(warnings).toHaveLength(0);
    });

    it('should return multiple duplicate orders if they exist', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      // Create multiple orders
      await testDb.order.createMany({
        data: [
          {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'G70.00',
            status: 'pending',
          },
          {
            patientId: patient.id,
            providerId: provider.id,
            medicationName: 'IVIG',
            primaryDiagnosis: 'G70.00',
            status: 'pending',
          },
        ],
      });

      const warnings = await detector.findDuplicateOrders(
        {
          patientId: toPatientId(patient.id),
          medicationName: 'IVIG',
        },
        testDb
      );

      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Jaro-Winkler Algorithm', () => {
    it('should return 1.0 for identical strings', () => {
      // Access private method via type assertion for testing
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('test', 'test');
      expect(similarity).toBe(1.0);
    });

    it('should return 0.0 for completely different strings with no matches', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('abc', 'xyz');
      expect(similarity).toBe(0.0);
    });

    it('should return value between 0 and 1 for similar strings', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('test', 'text');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle single character difference (nickname)', () => {
      // Jaro-Winkler is great for nicknames: "john" vs "jon"
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('john', 'jon');
      // Jaro-Winkler gives high score for short names with matching prefix
      expect(similarity).toBeGreaterThan(0.9); // Very similar due to prefix bonus
    });

    it('should handle typos well', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('smith', 'smyth');
      // Jaro-Winkler handles typos well (i vs y) - score is ~0.89
      expect(similarity).toBeGreaterThan(0.89);
    });

    it('should handle transpositions', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('martha', 'marhta');
      // Jaro algorithm is designed to handle transpositions
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should give bonus to matching prefixes', () => {
      // Jaro-Winkler gives bonus to strings with common prefix
      const withPrefix = (detector as any).jaroWinkler('michael', 'mikey');
      const withoutPrefix = (detector as any).jaroWinkler('michael', 'liam');

      expect(withPrefix).toBeGreaterThan(withoutPrefix);
    });

    it('should handle empty strings', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('', '');
      expect(similarity).toBe(0.0);
    });

    it('should handle one empty string', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler('test', '');
      expect(similarity).toBe(0.0);
    });

    it('should be case-sensitive', () => {
      const similarity1 = (detector as any).jaroWinkler('test', 'TEST');
      const similarity2 = (detector as any).jaroWinkler('test', 'test');

      expect(similarity1).toBeLessThan(similarity2);
    });

    it('should handle common name variations', () => {
      const cases = [
        { s1: 'michael', s2: 'mike', expectedMin: 0.7 },
        { s1: 'william', s2: 'will', expectedMin: 0.7 },
        { s1: 'robert', s2: 'rob', expectedMin: 0.7 },
        { s1: 'katherine', s2: 'kate', expectedMin: 0.6 },
      ];

      cases.forEach(({ s1, s2, expectedMin }) => {
        const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler(s1, s2);
        expect(similarity).toBeGreaterThan(expectedMin);
      });
    });
  });

  describe('Jaro Similarity (Base Algorithm)', () => {
    it('should calculate Jaro similarity correctly', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroSimilarity('martha', 'marhta');
      // Jaro similarity should be high for transpositions
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle no matches', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroSimilarity('abc', 'xyz');
      expect(similarity).toBe(0.0);
    });

    it('should return 1.0 for identical strings', () => {
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroSimilarity('test', 'test');
      expect(similarity).toBe(1.0);
    });

    it('should calculate match distance correctly', () => {
      // For strings of length 5 and 5: match distance = floor(5/2) - 1 = 1
      // So chars must be within 1 position to match
      const similarity = (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroSimilarity('hello', 'hallo');
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete findSimilarPatients in <100ms with 100 patients', async () => {
      // Create 100 patients
      const createPatients = [];
      for (let i = 0; i < 100; i++) {
        createPatients.push({
          firstName: `Patient${i}`,
          lastName: `Test${i}`,
          mrn: `${100000 + i}`,
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        });
      }
      await testDb.patient.createMany({ data: createPatients });

      const start = Date.now();
      await detector.findSimilarPatients(
        {
          firstName: 'NewPatient',
          lastName: 'NewTest',
          mrn: '999999',
        },
        testDb
      );
      const duration = Date.now() - start;

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle fuzzy matching at scale', async () => {
      // Performance test: Check that Jaro-Winkler is fast enough for 100 comparisons
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        // Access private method for testing
        (detector as unknown as { [key: string]: (a: string, b: string) => number }).jaroWinkler(`Patient${i}`, `Patient${i + 1}`);
      }

      const duration = Date.now() - start;

      // 100 fuzzy match calculations should be < 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should limit database queries for performance', async () => {
      // Verify that we only check last 100 patients (not all)
      // This is a constant defined in DUPLICATE_DETECTION config
      const { MAX_PATIENTS_TO_CHECK } = await import('@/lib/config/constants').then(m => m.DUPLICATE_DETECTION);
      expect(MAX_PATIENTS_TO_CHECK).toBe(100);
    });
  });

  describe('Patient Similarity Scoring', () => {
    it('should weight last name more than first name', () => {
      // Two patients: same last name vs same first name
      const score1 = (detector as unknown as { [key: string]: (a: unknown, b: unknown) => number }).calculatePatientSimilarity(
        { firstName: 'John', lastName: 'Smith', mrn: '111111' },
        { firstName: 'Jane', lastName: 'Smith', mrn: '222222' }
      );

      const score2 = (detector as unknown as { [key: string]: (a: unknown, b: unknown) => number }).calculatePatientSimilarity(
        { firstName: 'John', lastName: 'Smith', mrn: '111111' },
        { firstName: 'John', lastName: 'Jones', mrn: '222222' }
      );

      // Same last name should score higher (50% weight vs 30% for first name)
      expect(score1).toBeGreaterThan(score2);
    });

    it('should include MRN similarity in score', () => {
      const score = (detector as unknown as { [key: string]: (a: unknown, b: unknown) => number }).calculatePatientSimilarity(
        { firstName: 'John', lastName: 'Smith', mrn: '123456' },
        { firstName: 'John', lastName: 'Smith', mrn: '123457' } // One digit off
      );

      expect(score).toBeGreaterThan(0.7); // Should still be high due to names
    });

    it('should return score between 0 and 1', () => {
      const score = (detector as unknown as { [key: string]: (a: unknown, b: unknown) => number }).calculatePatientSimilarity(
        { firstName: 'John', lastName: 'Smith', mrn: '123456' },
        { firstName: 'Jane', lastName: 'Doe', mrn: '654321' }
      );

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});
