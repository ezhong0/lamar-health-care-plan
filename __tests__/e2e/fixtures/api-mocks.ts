/**
 * API Mock Responses for E2E Tests
 *
 * Provides mock responses for API calls to avoid external dependencies
 * and speed up test execution.
 */

import type { Page, Route } from '@playwright/test';

/**
 * Mock care plan response
 */
export const mockCarePlan = {
  content: `# Care Plan for Test Patient

## Problem List

### 1. Generalized Myasthenia Gravis (G70.00)
- **Status**: Active, requiring treatment
- **Severity**: Moderate with recent exacerbation
- **Impact**: Muscle weakness, ptosis, difficulty swallowing

## Goals

### Short-term (1-2 weeks)
1. Rapid symptom control with IVIG therapy
2. Monitor for myasthenic crisis
3. Assess response to treatment

### Long-term (3-6 months)
1. Achieve stable disease control
2. Minimize corticosteroid dosage
3. Prepare for potential thymectomy

## Interventions

### Medication Management
- **IVIG (Intravenous Immunoglobulin)**: 2g/kg over 5 days
  - Dose: 0.4 g/kg/day
  - Monitor for adverse reactions
  - Premedicate with acetaminophen and diphenhydramine

- **Continue Current Medications**:
  - Pyridostigmine 60mg PO TID
  - Prednisone 10mg PO daily

### Monitoring
- Daily vital signs during infusion
- FVC (Forced Vital Capacity) monitoring
- Watch for signs of myasthenic crisis
- Monitor IgG levels

### Patient Education
- Signs of myasthenic crisis
- Medication adherence importance
- Activity modifications during treatment

## Follow-up Plan
- Neurology follow-up in 2 weeks post-IVIG
- Re-assessment of strength and symptoms
- Discuss thymectomy timing with neurology team

## Expected Outcomes
- Improved muscle strength within 1-2 weeks
- Reduction in ptosis and dysphagia
- Stable respiratory function
- No adverse reactions to IVIG

---
*Generated for test purposes*`,
};

/**
 * Setup API route mocking for care plan generation
 */
export async function mockCarePlanAPI(page: Page) {
  await page.route('**/api/care-plans', async (route: Route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      // Simulate slight delay for realism
      await new Promise((resolve) => setTimeout(resolve, 500));

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            carePlan: {
              id: 'mock-care-plan-id',
              patientId: 'mock-patient-id',
              content: mockCarePlan.content,
              generatedBy: 'claude-3-5-sonnet-20241022',
              createdAt: new Date().toISOString(),
            },
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock care plan generation error
 */
export async function mockCarePlanAPIError(page: Page, errorMessage = 'AI service unavailable') {
  await page.route('**/api/care-plans', async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          message: errorMessage,
          code: 'AI_SERVICE_ERROR',
        },
      }),
    });
  });
}

/**
 * Mock export API to return predictable CSV data
 */
export async function mockExportAPI(page: Page, csvData?: string) {
  const defaultCsv = `firstName,lastName,mrn,medication,diagnosis,referringProvider,providerNPI,carePlan
John,Doe,123456,IVIG,G70.00,Dr. Smith,1234567893,Yes
Jane,Smith,654321,Rituximab,M05.79,Dr. Jones,1245319599,No`;

  await page.route('**/api/export', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: {
        'Content-Disposition': 'attachment; filename="patients-export.csv"',
      },
      body: csvData || defaultCsv,
    });
  });
}

/**
 * Mock patient creation with warnings
 */
export async function mockPatientCreationWithWarnings(
  page: Page,
  warnings: Array<{ type: string; severity: string; message: string }>
) {
  await page.route('**/api/patients', async (route: Route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      const postData = request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            patient: {
              id: 'test-patient-id-123',
              firstName: postData.firstName,
              lastName: postData.lastName,
              mrn: postData.mrn,
              createdAt: new Date().toISOString(),
            },
            warnings,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock patient creation error (e.g., duplicate MRN)
 */
export async function mockPatientCreationError(page: Page, errorCode = 'DUPLICATE_MRN') {
  await page.route('**/api/patients', async (route: Route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Failed to create patient. Please try again.',
            code: errorCode,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup all common API mocks for E2E tests
 * By default, only mocks the AI care plan API to avoid costs
 * Does NOT mock patient creation or export - those use real APIs
 */
export async function setupCommonMocks(page: Page) {
  // Mock care plan API by default to avoid hitting real AI service
  await mockCarePlanAPI(page);

  // Log all API calls for debugging
  if (process.env.DEBUG_E2E) {
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`→ ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        console.log(`← ${response.status()} ${response.url()}`);
      }
    });
  }
}
