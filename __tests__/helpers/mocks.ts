/**
 * Mock Helpers
 *
 * Provides mock implementations for external dependencies.
 * Used in unit tests to isolate the system under test.
 */

import { vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';

/**
 * Mock Anthropic client
 *
 * Returns a mock care plan response for testing CarePlanService
 */
export function createMockAnthropicClient(overrides?: {
  response?: string;
  shouldFail?: boolean;
  delay?: number;
}): Anthropic {
  const mockResponse = overrides?.response ?? `# Care Plan

## Problem List / Drug Therapy Problems (DTPs)
1. Patient requires IVIG therapy for myasthenia gravis
2. Potential for infusion-related reactions

## SMART Goals
- Patient will complete IVIG infusion without moderate to severe adverse reactions within 4 hours
- Patient will verbalize understanding of medication administration within 1 hour

## Pharmacist Interventions / Plan
### Clinical Monitoring
- Vital signs: baseline and q30min during infusion
- Monitor for signs of infusion reaction (headache, fever, chills)
- Assess for improvement in muscle strength post-infusion

### Patient Education
- Explain expected duration of infusion (3-4 hours)
- Discuss potential side effects and when to notify healthcare provider
- Review importance of adequate hydration before/after infusion

### Medication Administration
- Pre-medicate with acetaminophen 650mg and diphenhydramine 25mg
- Start infusion at slow rate, increase per protocol if tolerated
- Have emergency medications available (epinephrine, methylprednisolone)

### Safety Precautions
- Verify product lot number and expiration date
- Ensure IV access is patent before starting
- Keep patient under observation for 30 minutes post-infusion

### Follow-up Schedule
- Phone call within 48 hours to assess tolerance
- Next infusion scheduled per protocol (typically q3-4 weeks)
- Monitor IgG levels every 3 months

## Deliverable
- IVIG medication guide
- Infusion reaction symptom card
- 24/7 pharmacy contact information`;

  const mockClient = {
    messages: {
      create: vi.fn().mockImplementation(async ({ signal }: { signal?: AbortSignal }) => {
        // Simulate delay with abort support
        if (overrides?.delay) {
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, overrides.delay);

            // If signal is already aborted, reject immediately
            if (signal?.aborted) {
              clearTimeout(timeoutId);
              const error = new Error('Request aborted');
              error.name = 'AbortError';
              reject(error);
              return;
            }

            // Listen for abort during the delay
            if (signal) {
              signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                const error = new Error('Request aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }

        // Check if aborted (in case no delay)
        if (signal?.aborted) {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          throw error;
        }

        // Simulate failure
        if (overrides?.shouldFail) {
          throw new Error('Anthropic API error');
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: mockResponse,
            },
          ],
        };
      }),
    },
  } as unknown as Anthropic;

  return mockClient;
}

/**
 * Mock Prisma transaction client
 *
 * Returns a mock transaction that delegates to the real Prisma client
 * Useful for testing transaction behavior
 */
export function createMockPrismaTransaction(realClient: any) {
  return new Proxy(realClient, {
    get(target, prop) {
      // All Prisma operations go through
      return target[prop];
    },
  });
}

/**
 * Mock logger
 *
 * Silent logger for tests (doesn't pollute test output)
 */
export const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/**
 * Create spy logger that tracks calls but doesn't output
 */
export function createSpyLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}
