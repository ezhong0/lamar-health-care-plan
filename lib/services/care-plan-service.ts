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

      // Step 2: Build prompt (separate instructions from data for security)
      const { systemPrompt, userData } = this.buildPrompt(patientData);

      logger.debug('Calling LLM', {
        patientId: input.patientId,
        model: this.model,
        systemPromptLength: systemPrompt.length,
        userDataLength: userData.length,
      });

      // Step 3: Call Claude with retry and fallback logic
      const content = await this.callClaudeWithRetry(systemPrompt, userData);

      // Step 4: Validate response (enhanced validation)
      if (!content || content.length < 100) {
        throw new CarePlanGenerationError(
          'LLM response too short or empty',
          new Error(`Response length: ${content.length}`)
        );
      }

      // Additional output validation to detect malformed or suspicious responses
      const validation = this.validateCarePlanContent(content);
      if (!validation.valid) {
        logger.warn('Care plan content failed validation', {
          patientId: input.patientId,
          reason: validation.reason,
        });
        throw new CarePlanGenerationError(
          `Generated care plan failed validation: ${validation.reason}`,
          new Error(validation.reason)
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
   * Call Claude API with timeout and proper prompt isolation
   *
   * Uses AbortController for timeout handling.
   * Anthropic SDK supports signal parameter for cancellation.
   *
   * Security: Uses system prompt for instructions and user message for data
   * to provide better isolation against prompt injection attacks.
   *
   * @param systemPrompt - Instructions for the model (isolated from user data)
   * @param userData - Patient data (user-provided content)
   * @returns Generated care plan content
   * @throws Error if timeout or API error
   */
  private async callClaude(systemPrompt: string, userData: string): Promise<string> {
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
          // System prompt contains instructions (isolated from user data)
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              // User message contains only patient data (no instructions)
              content: userData,
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
   * Build care plan generation prompt with proper isolation
   *
   * Prompt engineering principles:
   * 1. Clear role definition (clinical pharmacist)
   * 2. Structured output format (markdown sections)
   * 3. Specific task (generate care plan)
   * 4. Relevant context (patient data, orders, medications)
   * 5. Quality guidelines (evidence-based, specific)
   *
   * Security: Separates instructions (system prompt) from user data (user message)
   * to provide better protection against prompt injection attacks.
   *
   * @param patientData - Patient with orders
   * @returns Object with systemPrompt (instructions) and userData (patient info)
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
  }): { systemPrompt: string; userData: string } {
    const mostRecentOrder = patientData.orders[0];

    // Sanitize user-provided text to prevent prompt injection
    const sanitizedRecords = sanitizeForLLM(patientData.patientRecords);

    // System prompt contains only instructions (no patient data)
    const systemPrompt = `You are a clinical pharmacist creating a care plan for a specialty pharmacy patient.

## Task

Generate a comprehensive pharmacist care plan for the patient whose information will be provided in the next message. The care plan should be detailed but concise, following the exact structure and formatting style below.

IMPORTANT FORMATTING REQUIREMENTS:
- Total length: 1500-2000 words
- Use bullet points for each item, not long paragraphs
- Each bullet point should be 1-3 sentences maximum
- Match the concise style of the example below

### 1. Problem list / Drug therapy problems (DTPs)

List 4-6 relevant drug therapy problems as concise bullet points. Each DTP should be 1-2 sentences.

Examples of appropriate DTP format:
- Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy).
- Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis).
- Risk of renal dysfunction or volume overload in susceptible patients (sucrose-stabilized products, older age, pre-existing renal disease).

Cover these areas (be specific to this medication and diagnosis):
- Efficacy / need for therapeutic effect
- Adverse effect risks specific to this medication
- Organ-specific complications (renal, cardiac, thrombotic, etc.)
- Drug-drug interactions or dosing timing considerations
- Patient education / adherence gaps
- Monitoring requirements

### 2. Goals (SMART)

Include 3 goals, each as a single paragraph (1-2 sentences each). Use this exact format:

**Primary:** [1-2 sentences describing clinical outcome goal with timeframe]

**Safety goal:** [1-2 sentences describing adverse events to prevent with specific parameters]

**Process:** [1-2 sentences describing therapy completion and documentation]

Example format:
**Primary:** Achieve clinically meaningful improvement in muscle strength and reduce fatigability within 2 weeks of completing IVIG course.

**Safety goal:** No severe infusion reaction, no acute kidney injury (no increase in SCr >0.3 mg/dL within 7 days post-infusion), and no thromboembolic events.

**Process:** Complete full 2 g/kg course (0.4 g/kg/day × 5 days) with documented vital sign monitoring and infusion logs.

### 3. Pharmacist interventions / plan

Provide ALL 9 subsections below. Each subsection should be 2-4 sentences with specific clinical details. Use concise bullet points, not long paragraphs.

**1. Dosing & Administration**

Verify total dose calculation (specify actual numbers for this patient). Document lot number and expiration of product. Include specific administration instructions.

Example: "Verify total dose: 2.0 g/kg total (calculate using actual body weight unless otherwise specified). For 72 kg → 144 g total = 28.8 g/day × 5 days. Document lot number and expiration of product."

**2. Premedication**

Recommend specific premeds with doses and timing. Provide rationale.

Example: "Recommend acetaminophen 650 mg PO and diphenhydramine 25–50 mg PO 30–60 minutes prior to infusion; consider low-dose corticosteroid premed if prior reactions or severe symptoms (institutional practice varies). Premeds can reduce minor infusion reactions but are not foolproof."

**3. Infusion rates & titration**

Describe starting rate and escalation. What to do if reactions occur. (For oral medications, discuss dosing schedule and any titration if applicable)

Example: "Start at a low rate (per product label/manufacturer) — example: 0.5 mL/kg/hr for first 15–30 min, then increase in stepwise fashion with at least three planned rate escalations up to manufacturer maximum as tolerated. If any infusion reactions occur, slow or stop and treat per reaction algorithm."

**4. Hydration & renal protection**

Hydration requirements and renal monitoring schedule. Special considerations.

Example: "Ensure adequate hydration prior to infusion (e.g., 250–500 mL normal saline if not fluid-overloaded) especially in patients with risk factors for renal dysfunction. Avoid sucrose-containing IVIG products in patients with uncontrolled diabetes or high renal risk. Monitor renal function (SCr, BUN, eGFR) pre-course and within 3–7 days post-completion."

**5. Thrombosis risk mitigation**

Assess baseline risk, prophylactic measures, patient education.

Example: "Assess baseline thrombosis risk. For high-risk patients consider prophylactic measures per institutional protocol (early ambulation, hydration, consider hematology consult if prothrombotic). Educate patient to report chest pain, sudden dyspnea, or unilateral limb swelling immediately."

**6. Concomitant medications**

Drug interactions, timing adjustments, medication continuations.

Example: "Continue pyridostigmine and prednisone; counsel re: timing of pyridostigmine (may cause increased secretions during infusion — evaluate symptoms). Adjustments to immunosuppression determined by neurology."

**7. Monitoring during infusion**

Vitals frequency, disease-specific monitoring, documentation. (For oral medications, discuss monitoring during therapy)

Example: "Vitals: BP, HR, RR, SpO₂, Temp q15 min for first hour, then q30–60 min per protocol. Respiratory: baseline FVC or NIF daily during hospitalization or before each infusion to detect early respiratory compromise. Document infusion rate changes, premeds, and any adverse events in the infusion log."

**8. Adverse event management**

Mild and moderate/severe reaction protocols.

Example: "Mild reaction (headache, chills, myalgia): slow infusion, give acetaminophen / antihistamine, observe. Moderate/severe (wheezing, hypotension, chest pain, anaphylaxis): stop infusion, follow emergency protocol (epinephrine for anaphylaxis, airway support), send labs, notify neurology and ordering prescriber."

**9. Documentation & communication**

EMR documentation, who to notify, when to communicate.

Example: "Enter all interventions, patient education, and monitoring in the EMR. Communicate any dose modifications or adverse events to neurology and the infusion nursing team immediately."

### 4. Monitoring plan & lab schedule

Provide a monitoring schedule using brief bullet points. Keep each bullet point to 1 sentence.

Example format:

**Before first infusion:** CBC, BMP (including SCr, BUN), baseline vitals, baseline FVC.

**During each infusion:** Vitals q15–30 min; infusion log.

**Within 72 hours of each infusion day:** Assess for delayed adverse events (headache, rash, aseptic meningitis).

**Post-course (3–7 days):** BMP to check renal function; evaluate for thrombotic events if symptomatic.

**Clinical follow-up:** Neurology & pharmacy clinic at 2 weeks and 6–8 weeks to assess clinical response and need for further therapy.

(Adapt timeframes based on medication - use "before first dose" and "during therapy" for oral medications)

## Guidelines

CRITICAL FORMATTING RULES:
- **Total length: 1500-2000 words maximum** (not per section, but total!)
- **Each DTP bullet: 1-2 sentences maximum**
- **Each Goal: 1-2 sentences maximum**
- **Each Pharmacist Intervention subsection: 2-4 sentences maximum**
- **Each Monitoring bullet: 1 sentence maximum**
- Use bullet points and concise paragraphs, NOT long blocks of text
- Match the concise style shown in the examples above
- Be comprehensive but concise - include all required sections but keep each brief
- Use evidence-based recommendations with specific clinical parameters
- Include specific numbers (dose rates, vital sign frequencies, lab timing)
- Consider specialty pharmacy context when relevant
- Use professional medical language
- Format in clean markdown

Generate the complete care plan now based on the patient information provided.`;

    // User data contains only patient information (no instructions)
    const userData = `## Patient Information

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

Please generate the care plan following the structure and guidelines provided in your system instructions.`;

    return { systemPrompt, userData };
  }

  /**
   * Validate care plan content for quality and safety
   *
   * Checks for:
   * - Presence of required sections
   * - Reasonable length
   * - No suspicious patterns (prompt injection attempts)
   * - Medical content (not generic responses)
   *
   * @param content - Generated care plan text
   * @returns Validation result with reason if invalid
   */
  private validateCarePlanContent(content: string): { valid: boolean; reason?: string } {
    // Check minimum length (comprehensive care plans should be substantial)
    if (content.length < 500) {
      return { valid: false, reason: 'Content too short (less than 500 characters)' };
    }

    // Check maximum length (prevent token exhaustion responses)
    if (content.length > 20000) {
      return { valid: false, reason: 'Content too long (over 20,000 characters)' };
    }

    // Check for required sections (basic structure validation)
    const requiredSections = [
      'Problem list',
      'Goals',
      'interventions',
      'Monitoring',
    ];

    for (const section of requiredSections) {
      if (!content.toLowerCase().includes(section.toLowerCase())) {
        return { valid: false, reason: `Missing required section: ${section}` };
      }
    }

    // Check for suspicious patterns that might indicate prompt injection worked
    const suspiciousPatterns = [
      /ignore (all )?previous instructions/i,
      /you are (now )?a different/i,
      /disregard (all )?previous/i,
      /system:\s*override/i,
      /\[INST\]/i, // Llama-style instruction markers
      /<\|im_start\|>/i, // ChatML markers
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return { valid: false, reason: 'Suspicious pattern detected in output' };
      }
    }

    // Check that content appears to be medical/clinical (contains relevant terminology)
    const medicalTermCount = (content.match(/\b(patient|medication|diagnosis|treatment|therapy|dose|adverse|monitoring|clinical|pharmacist)\b/gi) || []).length;
    if (medicalTermCount < 10) {
      return { valid: false, reason: 'Content lacks sufficient medical terminology' };
    }

    return { valid: true };
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
