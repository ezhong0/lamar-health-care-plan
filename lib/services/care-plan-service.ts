/**
 * Care Plan Service
 *
 * Generates clinical pharmacist care plans using Claude LLM.
 * Implements production-grade patterns for external API calls:
 * - Retry with exponential backoff
 * - Timeout handling
 * - Comprehensive logging
 * - Error categorization
 *
 * Why Claude for care plans:
 * - Excellent at medical text generation
 * - Follows structured prompts well
 * - Lower hallucination rate than alternatives
 *
 * Production considerations:
 * - Prompt engineering is critical (see buildPrompt method)
 * - Token costs can add up (monitor usage)
 * - Response times vary (2-10 seconds typical)
 * - Rate limits (tier-dependent, handle 429 errors)
 *
 * Trade-offs:
 * - ✅ High-quality care plans with medical accuracy
 * - ✅ Resilient to transient failures (retries)
 * - ✅ Observable (comprehensive logging)
 * - ❌ External dependency (LLM downtime affects availability)
 * - ❌ Cost per request (vs rule-based template)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PrismaClient } from '@prisma/client';
import type { Result } from '@/lib/domain/result';
import type { CarePlan, CarePlanId, PatientId } from '@/lib/domain/types';
import { toCarePlanId } from '@/lib/domain/types';
import { PatientNotFoundError, CarePlanGenerationError } from '@/lib/domain/errors';
import { logger } from '@/lib/infrastructure/logger';
import { retry } from '@/lib/infrastructure/retry';

export interface GenerateCarePlanInput {
  patientId: PatientId;
}

/**
 * Care Plan Service
 *
 * Orchestrates care plan generation with resilient LLM calls.
 */
export class CarePlanService {
  private readonly anthropic: Anthropic;
  private readonly model: string = 'claude-3-5-sonnet-20241022';
  private readonly maxTokens: number = 4096;
  private readonly timeout: number = 60000; // 60 seconds

  constructor(
    private readonly db: PrismaClient,
    apiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate care plan for patient
   *
   * Steps:
   * 1. Fetch patient data (with orders)
   * 2. Build prompt with patient context
   * 3. Call Claude with retry + timeout
   * 4. Parse and validate response
   * 5. Save to database
   *
   * @param input - Patient ID
   * @returns Result with generated care plan
   *
   * @example
   * const result = await service.generateCarePlan({ patientId: 'patient_123' });
   *
   * if (isFailure(result)) {
   *   // Handle error (patient not found, LLM timeout, etc.)
   * }
   *
   * const carePlan = result.data.carePlan;
   */
  async generateCarePlan(
    input: GenerateCarePlanInput
  ): Promise<Result<{ carePlan: CarePlan }>> {
    const startTime = Date.now();

    logger.info('Generating care plan', {
      patientId: input.patientId,
    });

    try {
      // Step 1: Fetch patient with orders
      const patientData = await this.db.patient.findUnique({
        where: { id: input.patientId },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Limit to recent orders
            include: {
              provider: true,
            },
          },
        },
      });

      if (!patientData) {
        throw new PatientNotFoundError(input.patientId);
      }

      // Step 2: Build prompt
      const prompt = this.buildPrompt(patientData);

      logger.debug('Calling LLM', {
        patientId: input.patientId,
        model: this.model,
        promptLength: prompt.length,
      });

      // Step 3: Call Claude with retry + timeout
      const content = await retry(
        () => this.callClaude(prompt),
        {
          attempts: 3,
          delay: 1000,
          backoff: 2,
          onRetry: (error, attempt) => {
            logger.warn('LLM call failed, retrying', {
              patientId: input.patientId,
              attempt,
              error: error.message,
            });
          },
        }
      );

      // Step 4: Validate response (basic check)
      if (!content || content.length < 100) {
        throw new CarePlanGenerationError(
          'LLM response too short or empty',
          new Error(`Response length: ${content.length}`)
        );
      }

      logger.debug('LLM response received', {
        patientId: input.patientId,
        contentLength: content.length,
      });

      // Step 5: Save to database
      const carePlan = await this.db.carePlan.create({
        data: {
          patientId: input.patientId,
          content,
          generatedBy: this.model,
        },
      });

      const duration = Date.now() - startTime;

      logger.info('Care plan generated successfully', {
        patientId: input.patientId,
        carePlanId: carePlan.id,
        contentLength: content.length,
        duration,
      });

      return {
        success: true,
        data: {
          carePlan: this.toDomainCarePlan(carePlan),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Categorize errors for better observability
      if (error instanceof PatientNotFoundError) {
        logger.warn('Care plan generation failed - patient not found', {
          patientId: input.patientId,
          duration,
        });

        return {
          success: false,
          error,
        };
      }

      if (error instanceof CarePlanGenerationError) {
        logger.error('Care plan generation failed - LLM error', {
          patientId: input.patientId,
          error: error.message,
          details: error.details,
          duration,
        });

        return {
          success: false,
          error,
        };
      }

      // Anthropic-specific errors
      if (error instanceof Anthropic.APIError) {
        logger.error('Care plan generation failed - Anthropic API error', {
          patientId: input.patientId,
          status: error.status,
          message: error.message,
          duration,
        });

        return {
          success: false,
          error: new CarePlanGenerationError(
            `Anthropic API error: ${error.message}`,
            error
          ),
        };
      }

      // Unexpected errors
      logger.error('Care plan generation failed - unexpected error', {
        patientId: input.patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      return {
        success: false,
        error: new CarePlanGenerationError(
          'Unexpected error during care plan generation',
          error instanceof Error ? error : undefined
        ),
      };
    }
  }

  /**
   * Get care plans for patient
   *
   * @param patientId - Patient ID
   * @returns Array of care plans, most recent first
   */
  async getCarePlansForPatient(patientId: PatientId): Promise<CarePlan[]> {
    const carePlans = await this.db.carePlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return carePlans.map((cp) => this.toDomainCarePlan(cp));
  }

  /**
   * Call Claude API with timeout
   *
   * Uses AbortController for timeout handling.
   * Anthropic SDK supports signal parameter for cancellation.
   *
   * @param prompt - System prompt for care plan generation
   * @returns Generated care plan content
   * @throws Error if timeout or API error
   */
  private async callClaude(prompt: string): Promise<string> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      const response = await this.anthropic.messages.create(
        {
          model: this.model,
          max_tokens: this.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          signal: controller.signal,
        }
      );

      // Extract text content from response
      const textContent = response.content.find((c) => c.type === 'text');

      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error) {
      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`LLM call timed out after ${this.timeout}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build care plan generation prompt
   *
   * Prompt engineering principles:
   * 1. Clear role definition (clinical pharmacist)
   * 2. Structured output format (markdown sections)
   * 3. Specific task (generate care plan)
   * 4. Relevant context (patient data, orders, medications)
   * 5. Quality guidelines (evidence-based, specific)
   *
   * @param patientData - Patient with orders
   * @returns Formatted prompt for Claude
   */
  private buildPrompt(patientData: {
    firstName: string;
    lastName: string;
    mrn: string;
    additionalDiagnoses: string[];
    medicationHistory: string[];
    patientRecords: string;
    orders: Array<{
      medicationName: string;
      primaryDiagnosis: string;
      createdAt: Date;
      provider: {
        name: string;
        npi: string;
      };
    }>;
  }): string {
    const mostRecentOrder = patientData.orders[0];

    return `You are a clinical pharmacist creating a care plan for a specialty pharmacy patient.

## Patient Information

**Name:** ${patientData.firstName} ${patientData.lastName}
**MRN:** ${patientData.mrn}

**Current Order:**
- Medication: ${mostRecentOrder.medicationName}
- Primary Diagnosis: ${mostRecentOrder.primaryDiagnosis}
- Referring Provider: ${mostRecentOrder.provider.name} (NPI: ${mostRecentOrder.provider.npi})

**Additional Diagnoses:**
${patientData.additionalDiagnoses.length > 0 ? patientData.additionalDiagnoses.map((d) => `- ${d}`).join('\n') : '- None'}

**Medication History:**
${patientData.medicationHistory.length > 0 ? patientData.medicationHistory.map((m) => `- ${m}`).join('\n') : '- None'}

**Patient Records:**
${patientData.patientRecords}

---

## Task

Generate a comprehensive pharmacist care plan for this patient. The care plan should include:

1. **Problem List / Drug Therapy Problems (DTPs)**
   - List relevant DTPs (efficacy, safety, adherence, indication)
   - Be specific to the medication and diagnosis

2. **SMART Goals**
   - Specific, Measurable, Achievable, Relevant, Time-bound
   - Include both efficacy goals and safety goals

3. **Pharmacist Interventions / Plan**
   - Clinical monitoring (labs, vitals, symptoms)
   - Patient education points
   - Medication administration guidance
   - Safety precautions
   - Follow-up schedule

4. **Deliverable**
   - What will be provided to the patient/provider (e.g., medication guide, monitoring plan)

## Guidelines

- Use evidence-based recommendations
- Be specific and actionable (not generic)
- Consider specialty pharmacy context (complex medications, insurance authorization)
- Use professional medical language
- Format in clean markdown

Generate the care plan now:`;
  }

  /**
   * Convert Prisma care plan to domain care plan
   *
   * @param carePlan - Prisma care plan
   * @returns Domain care plan with branded types
   */
  private toDomainCarePlan(carePlan: {
    id: string;
    patientId: string;
    content: string;
    generatedBy: string;
    createdAt: Date;
  }): CarePlan {
    return {
      id: toCarePlanId(carePlan.id),
      patientId: carePlan.patientId as PatientId,
      content: carePlan.content,
      generatedBy: carePlan.generatedBy,
      createdAt: carePlan.createdAt,
    };
  }
}
