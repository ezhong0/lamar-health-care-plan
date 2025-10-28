/**
 * Unit Tests: CarePlanService
 *
 * Tests care plan generation with mocked Anthropic client.
 * Includes timeout handling, error cases, and prompt construction.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarePlanService } from '@/lib/services/care-plan-service';
import { testDb, setupTestDb, teardownTestDb } from '../../helpers/test-db';
import { createMockAnthropicClient } from '../../helpers/mocks';
import { PatientNotFoundError, CarePlanGenerationError } from '@/lib/domain/errors';
import type { PatientId } from '@/lib/domain/types';
import '../../helpers/matchers';

describe('CarePlanService', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('generateCarePlan', () => {
    it('should generate care plan for valid patient', async () => {
      // Create patient with order
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: ['E11.9'],
          medicationHistory: ['Metformin'],
          patientRecords: 'Patient has myasthenia gravis requiring IVIG therapy.',
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

      // Create service with mock client
      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      // Generate care plan
      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeSuccess();
      if (result.success) {
        expect(result.data.carePlan.content).toBeDefined();
        expect(result.data.carePlan.content.length).toBeGreaterThan(100);
        expect(result.data.carePlan.patientId).toBe(patient.id);
      }
    });

    it('should return error for non-existent patient', async () => {
      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: 'non_existent_id' as PatientId,
      });

      expect(result).toBeFailure();
      if (!result.success) {
        expect(result.error).toBeInstanceOf(PatientNotFoundError);
      }
    });

    it('should return error if patient has no orders', async () => {
      // Create patient without orders
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeFailure();
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CarePlanGenerationError);
        expect(result.error.message).toContain('no medication orders');
      }
    });

    it('should handle LLM timeout', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
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

      // Mock client with long delay
      const mockClient = createMockAnthropicClient({
        delay: 30000, // 30 seconds (will timeout)
      });

      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeFailure();
    }, 30000); // Increase test timeout

    it('should handle LLM API error', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
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

      // Mock client that fails
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
      });

      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeFailure();
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CarePlanGenerationError);
      }
    });

    it('should save care plan to database', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
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

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeSuccess();

      // Verify saved to database
      const savedCarePlans = await testDb.carePlan.findMany({
        where: { patientId: patient.id },
      });

      expect(savedCarePlans).toHaveLength(1);
      expect(savedCarePlans[0].content).toBeDefined();
    });

    it('should include model name in care plan', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
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

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      if (result.success) {
        expect(result.data.carePlan.generatedBy).toContain('claude');
      }
    });

    it('should validate response is not empty', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
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

      // Mock client with empty response
      const mockClient = createMockAnthropicClient({
        response: '', // Empty response
      });

      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const result = await service.generateCarePlan({
        patientId: patient.id as PatientId,
      });

      expect(result).toBeFailure();
      if (!result.success) {
        expect(result.error.message).toContain('too short');
      }
    });
  });

  describe('getCarePlansForPatient', () => {
    it('should return care plans for patient', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      await testDb.carePlan.create({
        data: {
          patientId: patient.id,
          content: 'Test care plan',
          generatedBy: 'test-model',
        },
      });

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const carePlans = await service.getCarePlansForPatient(patient.id as PatientId);

      expect(carePlans).toHaveLength(1);
      expect(carePlans[0].content).toBe('Test care plan');
    });

    it('should return empty array for patient with no care plans', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const carePlans = await service.getCarePlansForPatient(patient.id as PatientId);

      expect(carePlans).toHaveLength(0);
    });

    it('should return care plans in descending order by creation date', async () => {
      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test records',
        },
      });

      // Create multiple care plans
      await testDb.carePlan.create({
        data: {
          patientId: patient.id,
          content: 'Old care plan',
          generatedBy: 'test-model',
          createdAt: new Date('2024-01-01'),
        },
      });

      await testDb.carePlan.create({
        data: {
          patientId: patient.id,
          content: 'New care plan',
          generatedBy: 'test-model',
          createdAt: new Date('2024-12-01'),
        },
      });

      const mockClient = createMockAnthropicClient();
      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      const carePlans = await service.getCarePlansForPatient(patient.id as PatientId);

      expect(carePlans).toHaveLength(2);
      expect(carePlans[0].content).toBe('New care plan'); // Most recent first
    });
  });

  describe('Prompt Construction', () => {
    it('should build prompt with patient information', async () => {
      const provider = await testDb.provider.create({
        data: {
          name: 'Dr. Smith',
          npi: '1234567893',
        },
      });

      const patient = await testDb.patient.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          mrn: '123456',
          additionalDiagnoses: ['E11.9'],
          medicationHistory: ['Metformin'],
          patientRecords: 'Patient has diabetes.',
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

      const mockClient = createMockAnthropicClient();
      let capturedPrompt = '';

      // Spy on the create method to capture prompt
      vi.spyOn(mockClient.messages, 'create').mockImplementation(async ({ messages }: any) => {
        capturedPrompt = messages[0].content;
        return {
          content: [{ type: 'text' as const, text: 'Test response' }],
        };
      });

      const service = new CarePlanService(testDb, 'test-key');
      (service as any).anthropic = mockClient;

      await service.generateCarePlan({ patientId: patient.id as PatientId });

      // Verify prompt contains patient data
      expect(capturedPrompt).toContain('John Doe');
      expect(capturedPrompt).toContain('123456');
      expect(capturedPrompt).toContain('IVIG');
      expect(capturedPrompt).toContain('G70.00');
      expect(capturedPrompt).toContain('Dr. Smith');
      expect(capturedPrompt).toContain('E11.9');
      expect(capturedPrompt).toContain('Metformin');
    });
  });
});
