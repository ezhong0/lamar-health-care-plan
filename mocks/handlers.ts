/**
 * MSW (Mock Service Worker) Handlers
 *
 * These mocks enable frontend development without a working backend.
 * They simulate realistic API responses matching the API contracts exactly.
 */

import { http, HttpResponse } from 'msw';
import type { CreatePatientResponse, GenerateCarePlanResponse } from '@/lib/api/contracts';
import type { PatientId, CarePlanId } from '@/lib/domain/types';

export const handlers = [
  // Mock patient creation
  http.post('/api/patients', async ({ request }) => {
    const body = (await request.json()) as {
      firstName: string;
      lastName: string;
      mrn: string;
      additionalDiagnoses?: string[];
      medicationHistory?: string[];
      patientRecords: string;
    };

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return realistic mock response matching contract
    return HttpResponse.json<CreatePatientResponse>({
      success: true,
      data: {
        patient: {
          id: ('mock-patient-' + Date.now()) as PatientId,
          firstName: body.firstName,
          lastName: body.lastName,
          mrn: body.mrn,
          additionalDiagnoses: body.additionalDiagnoses || [],
          medicationHistory: body.medicationHistory || [],
          patientRecords: body.patientRecords,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Similar patient found: John Smith (MRN: 000123)',
            similarPatient: {
              id: 'existing-patient-1' as PatientId,
              mrn: '000123',
              name: 'John Smith',
            },
            similarityScore: 0.85,
          },
        ],
      },
    });
  }),

  // Mock care plan generation
  http.post('/api/care-plans', async () => {
    // Simulate longer network delay for AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return HttpResponse.json<GenerateCarePlanResponse>({
      success: true,
      data: {
        carePlan: {
          id: ('mock-careplan-' + Date.now()) as CarePlanId,
          patientId: 'mock-patient-123' as PatientId,
          content: `## Problem List / Drug Therapy Problems (DTPs)

1. Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy)
2. Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis)
3. Risk of renal dysfunction or volume overload in susceptible patients

## SMART Goals

**Primary Goal:**
- Achieve clinically meaningful improvement in muscle strength and reduce fatigability within 2 weeks of completing IVIG course

**Safety Goal:**
- No severe infusion reaction
- No acute kidney injury (no increase in SCr >0.3 mg/dL within 7 days post-infusion)
- No thromboembolic events

## Pharmacist Interventions / Plan

### 1. Dosing & Administration
Verify total dose: 2.0 g/kg total (calculate using actual body weight unless otherwise specified).

### 2. Premedication
Recommend acetaminophen 650 mg PO and diphenhydramine 25–50 mg PO 30–60 minutes prior to infusion.

### 3. Monitoring During Infusion
**Vitals:** BP, HR, RR, SpO₂, Temp q15 min for first hour, then q30–60 min per protocol

**Deliverable:** Complete monitoring plan with safety protocols`,
          generatedBy: 'claude-3-5-sonnet-20241022',
          createdAt: new Date(),
        },
      },
    });
  }),
];
