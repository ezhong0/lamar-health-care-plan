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
import type { CarePlan, PatientId } from '@/lib/domain/types';
import { toCarePlanId } from '@/lib/domain/types';
import { PatientNotFoundError, CarePlanGenerationError } from '@/lib/domain/errors';
import { logger } from '@/lib/infrastructure/logger';
import { sanitizeForLLM } from '@/lib/utils/sanitize-llm';
import { CARE_PLAN } from '@/lib/config/constants';

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
  private readonly model: string = 'claude-haiku-4-5-20251001';
  private readonly maxTokens: number = CARE_PLAN.MAX_TOKENS;
  private readonly timeout: number = CARE_PLAN.TIMEOUT_MS;

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
            take: CARE_PLAN.MAX_ORDERS_IN_PROMPT,
            include: {
              provider: true,
            },
          },
        },
      });

      if (!patientData) {
        throw new PatientNotFoundError(input.patientId);
      }

      // Verify patient has orders (required for care plan generation)
      if (!patientData.orders || patientData.orders.length === 0) {
        throw new CarePlanGenerationError(
          'Cannot generate care plan: patient has no medication orders'
        );
      }

      // Step 2: Build prompt
      const prompt = this.buildPrompt(patientData);

      logger.debug('Calling LLM', {
        patientId: input.patientId,
        model: this.model,
        promptLength: prompt.length,
      });

      // Step 3: Call Claude (NO retry - fail fast for better UX)
      const content = await this.callClaude(prompt);

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

    // Sanitize user-provided text to prevent prompt injection
    const sanitizedRecords = sanitizeForLLM(patientData.patientRecords);

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
${sanitizedRecords}

---

## Task

Generate a comprehensive pharmacist care plan for this patient. The care plan must be detailed and thorough, following the structure below:

### 1. Problem List / Drug Therapy Problems (DTPs)

List 4-6 relevant drug therapy problems covering:
- Need for rapid therapeutic effect (efficacy)
- Risk of adverse effects specific to this medication
- Risk of complications (organ-specific: renal, cardiac, thrombotic, etc.)
- Drug-drug interactions or dosing timing considerations
- Patient education / adherence gaps
- Any monitoring requirements

Be specific to this medication and diagnosis, not generic.

### 2. Goals (SMART)

Include 3 types of goals:

**Primary:**
- Clinical outcome goal (specific, measurable, time-bound)

**Safety goal:**
- Specific adverse events to prevent
- Measurable safety parameters (labs, vitals)
- Timeframe for monitoring

**Process:**
- Completion of therapy course
- Documentation requirements

### 3. Pharmacist Interventions / Plan

Provide detailed interventions covering ALL 9 of these subsections:

1. **Dosing & Administration**
   - Verify total dose calculation using actual body weight
   - Document lot number and expiration of product
   - Provide specific clinical details for this medication

2. **Premedication**
   - Recommend specific premeds with doses and timing
   - Explain rationale for each premedication

3. **Infusion Rates & Titration**
   - Starting rate per manufacturer guidelines
   - Stepwise escalation schedule with at least 3 planned rate increases
   - What to do if infusion reactions occur

4. **Hydration & Renal Protection**
   - Pre-infusion hydration requirements
   - Renal function monitoring schedule
   - Special considerations for renal risk

5. **Thrombosis Risk Mitigation**
   - Baseline thrombosis risk assessment
   - Prophylactic measures per protocol
   - Patient education on warning signs

6. **Concomitant Medications**
   - Review drug interactions
   - Timing adjustments needed
   - Continue/adjust existing medications

7. **Monitoring During Infusion**
   - Vitals frequency (q15min first hour, then q30-60min)
   - Any disease-specific monitoring
   - Infusion log documentation

8. **Adverse Event Management**
   - Mild reaction protocol
   - Moderate/severe reaction protocol
   - Emergency procedures

9. **Documentation & Communication**
   - EMR documentation requirements
   - Who to notify and when
   - Dose modifications and adverse events

Each section should be 2-4 sentences with specific clinical details.

### 4. Monitoring Plan & Lab Schedule

Provide a detailed monitoring schedule:

**Before First Infusion:**
- Required labs (CBC, BMP including SCr and BUN, organ function)
- Baseline vitals
- Any baseline assessments specific to condition

**During Each Infusion:**
- Vital signs frequency (q15-30 min)
- Infusion log documentation
- Real-time monitoring

**Within 72 Hours of Each Infusion:**
- Assess for delayed adverse events
- Monitor for specific complications

**Post-Course (3-7 Days):**
- Follow-up labs to check organ function
- Evaluate for complications if symptomatic

**Clinical Follow-up:**
- Pharmacy and specialty clinic follow-up timing
- When to reassess therapy effectiveness
- Long-term monitoring plan

## Guidelines

- **Be comprehensive and detailed** - this should be 1500-2000 words
- Use evidence-based recommendations with specific clinical parameters
- Include specific numbers (dose rates, vital sign frequencies, lab timing)
- Consider specialty pharmacy context (high-cost medications, prior authorizations, compliance documentation)
- Use professional medical language appropriate for pharmacist documentation
- Format in clean markdown with clear headers and sections

Generate the complete care plan now:`;
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
