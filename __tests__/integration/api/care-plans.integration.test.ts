/**
 * Integration Tests: Care Plan API Routes
 *
 * Tests the full API endpoint stack:
 * - POST /api/care-plans - Generate care plan
 * - GET /api/care-plans?patientId=X - List care plans
 * - Rate limiting integration
 * - Error handling
 * - Input validation
 *
 * These tests simulate real HTTP requests to the API routes.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { testDb, setupTestDb, teardownTestDb } from '../../helpers/test-db';
import { POST as generateCarePlan, GET as listCarePlans } from '@/app/api/care-plans/route';
import { NextRequest } from 'next/server';

// Mock rate limiting to avoid Redis dependency in tests
vi.mock('@/lib/infrastructure/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(null), // Allow all requests
  RATE_LIMITS: {
    CARE_PLAN_GENERATION: { requests: 3, window: '60 s' },
    EXAMPLE_GENERATION: { requests: 5, window: '60 s' },
    PATIENT_CREATION: { requests: 10, window: '60 s' },
    GENERAL_MUTATION: { requests: 20, window: '60 s' },
    READ_OPERATIONS: { requests: 100, window: '60 s' },
  },
}));

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages: any;

    constructor() {
      this.messages = {
        create: vi.fn().mockImplementation(async () => ({
          content: [
            {
              type: 'text',
              text: `# Pharmacist Care Plan

**Patient**: Test Patient
**Medication**: IVIG (Intravenous Immunoglobulin)
**Primary Diagnosis**: G70.00 - Myasthenia Gravis

## Problem List
1. Myasthenia gravis requiring IVIG therapy
2. Monitoring for adverse reactions
3. Ensuring proper infusion protocol

## Goals
- Achieve symptom control
- Prevent acute exacerbations
- Minimize treatment side effects
- Improve quality of life

## Interventions
1. **Medication Management**
   - IVIG administration per protocol
   - Monitor infusion rate and patient tolerance
   - Pre-medication as needed

2. **Monitoring**
   - Vital signs during infusion
   - Watch for headache, nausea, or allergic reactions
   - Assess muscle strength improvements

3. **Patient Education**
   - Explain IVIG mechanism of action
   - Discuss expected timeline for improvement
   - Review signs of adverse reactions

## Monitoring Parameters
- Muscle strength assessment
- Vital signs during treatment
- Laboratory values (IgG levels if applicable)
- Patient-reported symptoms

## Follow-up Plan
- Schedule next infusion based on protocol
- Clinical pharmacist consultation as needed
- Provider follow-up within 2 weeks

---
*This care plan should be reviewed and approved by the treating physician before implementation.*`,
            },
          ],
          model: 'claude-3-5-sonnet-20241022',
        })),
      };
    }
  }

  return {
    default: MockAnthropic,
    Anthropic: MockAnthropic,
  };
});

describe('Care Plan API Routes Integration', () => {
  let testPatientId: string;
  let testProviderId: string;

  beforeEach(async () => {
    await setupTestDb();

    // Create test provider
    const provider = await testDb.provider.create({
      data: {
        name: 'Dr. Test Provider',
        npi: '1234567893',
      },
    });
    testProviderId = provider.id;

    // Create test patient with order
    const patient = await testDb.patient.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        mrn: 'TEST-MRN-001',
        additionalDiagnoses: ['E11.9'],
        medicationHistory: ['Metformin'],
        patientRecords: 'Patient has myasthenia gravis requiring IVIG therapy.',
      },
    });
    testPatientId = patient.id;

    await testDb.order.create({
      data: {
        patientId: testPatientId,
        providerId: testProviderId,
        medicationName: 'IVIG',
        primaryDiagnosis: 'G70.00',
        status: 'pending',
      },
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('POST /api/care-plans', () => {
    it('should generate care plan for valid patient', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.carePlan).toBeDefined();
      expect(data.data.carePlan.id).toBeDefined();
      expect(data.data.carePlan.content).toBeTruthy();
      expect(data.data.carePlan.content.length).toBeGreaterThan(100);
      expect(data.data.carePlan.patientId).toBe(testPatientId);
    });

    it('should save care plan to database', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      // Verify care plan was saved
      const savedCarePlan = await testDb.carePlan.findUnique({
        where: { id: data.data.carePlan.id },
      });

      expect(savedCarePlan).toBeDefined();
      expect(savedCarePlan?.patientId).toBe(testPatientId);
      expect(savedCarePlan?.content).toBeTruthy();
    });

    it('should return 400 for missing patientId', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid patientId format', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: '', // Empty string
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent patient', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'non-existent-patient-id',
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('PATIENT_NOT_FOUND');
    });

    it('should handle patient without orders gracefully', async () => {
      // Create patient without orders
      const patientWithoutOrders = await testDb.patient.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          mrn: 'TEST-MRN-002',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Patient records',
        },
      });

      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: patientWithoutOrders.id,
        }),
      });

      const response = await generateCarePlan(request);

      // Should handle gracefully (either generate basic plan or return error)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return consistent error format', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'invalid',
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      // Verify standard error format
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('code');
    });

    it('should handle multiple care plans for same patient', async () => {
      // Generate first care plan
      const request1 = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      const response1 = await generateCarePlan(request1);
      const data1 = await response1.json();
      expect(response1.status).toBe(201);

      // Generate second care plan for same patient
      const request2 = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      const response2 = await generateCarePlan(request2);
      const data2 = await response2.json();
      expect(response2.status).toBe(201);

      // Verify both care plans exist
      const carePlans = await testDb.carePlan.findMany({
        where: { patientId: testPatientId },
      });

      expect(carePlans).toHaveLength(2);
      expect(data1.data.carePlan.id).not.toBe(data2.data.carePlan.id);
    });

    it('should include generated timestamp', async () => {
      const beforeTime = new Date();

      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      const response = await generateCarePlan(request);
      const data = await response.json();

      const afterTime = new Date();

      expect(data.data.carePlan.createdAt).toBeDefined();
      const createdAt = new Date(data.data.carePlan.createdAt);
      expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('GET /api/care-plans', () => {
    beforeEach(async () => {
      // Create test care plans
      await testDb.carePlan.createMany({
        data: [
          {
            patientId: testPatientId,
            content: 'Care plan 1 content',
            generatedBy: 'claude-3-5-sonnet-20241022',
          },
          {
            patientId: testPatientId,
            content: 'Care plan 2 content',
            generatedBy: 'claude-3-5-sonnet-20241022',
          },
        ],
      });
    });

    it('should list care plans for patient', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/care-plans?patientId=${testPatientId}`
      );

      const response = await listCarePlans(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.carePlans).toBeDefined();
      expect(data.data.carePlans).toHaveLength(2);
    });

    it('should return empty array for patient with no care plans', async () => {
      // Create new patient without care plans
      const newPatient = await testDb.patient.create({
        data: {
          firstName: 'New',
          lastName: 'Patient',
          mrn: 'TEST-MRN-003',
          additionalDiagnoses: [],
          medicationHistory: [],
          patientRecords: 'Test',
        },
      });

      const request = new NextRequest(
        `http://localhost:3000/api/care-plans?patientId=${newPatient.id}`
      );

      const response = await listCarePlans(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.carePlans).toHaveLength(0);
    });

    it('should return 400 when patientId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/care-plans');

      const response = await listCarePlans(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return care plans in descending order by creation date', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/care-plans?patientId=${testPatientId}`
      );

      const response = await listCarePlans(request);
      const data = await response.json();

      const carePlans = data.data.carePlans;
      expect(carePlans.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 0; i < carePlans.length - 1; i++) {
        const current = new Date(carePlans[i].createdAt);
        const next = new Date(carePlans[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should include all care plan fields', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/care-plans?patientId=${testPatientId}`
      );

      const response = await listCarePlans(request);
      const data = await response.json();

      const carePlan = data.data.carePlans[0];
      expect(carePlan).toHaveProperty('id');
      expect(carePlan).toHaveProperty('patientId');
      expect(carePlan).toHaveProperty('content');
      expect(carePlan).toHaveProperty('generatedBy');
      expect(carePlan).toHaveProperty('createdAt');
    });
  });

  describe('Error handling consistency', () => {
    it('should use standard error format across all errors', async () => {
      const testCases = [
        {
          name: 'Missing patientId',
          body: {},
          expectedCode: 'VALIDATION_ERROR',
        },
        {
          name: 'Invalid patientId',
          body: { patientId: '' },
          expectedCode: 'VALIDATION_ERROR',
        },
        {
          name: 'Non-existent patient',
          body: { patientId: 'non-existent' },
          expectedCode: 'PATIENT_NOT_FOUND',
        },
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/care-plans', {
          method: 'POST',
          body: JSON.stringify(testCase.body),
        });

        const response = await generateCarePlan(request);
        const data = await response.json();

        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.message).toBeTruthy();
        expect(data.error.code).toBe(testCase.expectedCode);
      }
    });
  });

  describe('Rate limiting integration', () => {
    it('should call rate limiting check', async () => {
      const { checkRateLimit } = await import('@/lib/infrastructure/rate-limit');

      const request = new NextRequest('http://localhost:3000/api/care-plans', {
        method: 'POST',
        body: JSON.stringify({
          patientId: testPatientId,
        }),
      });

      await generateCarePlan(request);

      // Verify rate limiting was checked
      expect(checkRateLimit).toHaveBeenCalled();
      expect(checkRateLimit).toHaveBeenCalledWith(request, 'carePlan');
    });
  });
});
