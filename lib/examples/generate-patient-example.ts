/**
 * LLM-Powered Patient Example Generation
 *
 * Generates realistic, medically plausible patient examples using Claude AI.
 * Creates diverse scenarios for demonstration and testing purposes.
 *
 * Design principles:
 * - Type-safe generation with Zod validation
 * - Medically accurate and contextually appropriate
 * - Varied scenarios to prevent repetition
 * - Clear error handling
 */

import Anthropic from '@anthropic-ai/sdk';
import { PatientInputSchema, type PatientInput } from '@/lib/validation/schemas';
import { z } from 'zod';

/**
 * LLM generation result type
 */
export type GenerationResult =
  | { success: true; data: PatientInput }
  | { success: false; error: string };

/**
 * Generate a realistic patient example using Claude AI
 *
 * Creates a medically plausible patient scenario with appropriate details
 * for biologic/specialty medication infusion therapy.
 *
 * @returns Promise resolving to generated patient data or error
 */
export async function generatePatientExample(): Promise<GenerationResult> {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY not configured. Cannot generate AI example.',
    };
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = `Generate a realistic patient example for a specialty medication infusion therapy management system.

Create a patient who requires biologic or immunoglobulin therapy for a legitimate medical condition. The patient should have:

1. Basic demographics (first name, last name, 6-digit MRN)
2. A referring provider (name and VALID 10-digit NPI)
3. A primary diagnosis (VALID ICD-10 code in correct format)
4. A specialty medication (biologics, IVIG, or other infusion therapy)
5. Detailed patient records including:
   - Age, sex, weight
   - Primary and secondary diagnoses
   - Current medications
   - Recent medical history relevant to the infusion therapy
   - Baseline clinic note with vitals and exam
   - Relevant lab results
   - Treatment plan

Make the scenario medically accurate and realistic. Use diverse conditions such as:
- Autoimmune diseases (RA, lupus, MS, myasthenia gravis, CIDP, etc.)
- Severe asthma requiring biologics
- Immunodeficiency disorders
- Inflammatory conditions

Vary the demographic details and clinical complexity.

IMPORTANT VALIDATION REQUIREMENTS:

**NPI (referringProviderNPI):**
- MUST use one of these VALID NPIs (they pass Luhn algorithm):
  - 1234567893
  - 1245319599
  - 1679576722
  - 1982736450
  - 1000000012
  - 1000000020
  - 1000000038
  - 1000000046
- Do NOT make up random 10-digit numbers - they will fail validation!

**ICD-10 Code (primaryDiagnosis):**
- MUST match format: Letter + 2 digits + decimal + 1-4 more digits/chars
- Examples of VALID codes:
  - G70.00 (Myasthenia gravis)
  - J45.50 (Severe persistent asthma)
  - E11.9 (Type 2 diabetes)
  - M05.79 (Rheumatoid arthritis)
  - G35 (Multiple sclerosis)
  - L50.1 (Chronic urticaria)
  - I10 (Essential hypertension)
- The code MUST include a decimal point (e.g., "G70.00" not "G7000")

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "firstName": "string",
  "lastName": "string",
  "mrn": "string (exactly 6 digits)",
  "referringProvider": "string (e.g. Dr. First Last)",
  "referringProviderNPI": "string (use one from the valid list above)",
  "primaryDiagnosis": "string (use format like G70.00, J45.50, etc.)",
  "medicationName": "string (specific medication name)",
  "patientRecords": "string (detailed clinical note)"
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content from response
    const content = response.content[0];
    if (content.type !== 'text') {
      return {
        success: false,
        error: 'Unexpected response format from AI',
      };
    }

    // Parse JSON from response
    let rawData: unknown;
    try {
      // Remove any markdown code blocks if present
      const cleanedText = content.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      rawData = JSON.parse(cleanedText);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      };
    }

    // Validate against schema
    const validationResult = PatientInputSchema.safeParse(rawData);

    if (!validationResult.success) {
      return {
        success: false,
        error: `Generated data failed validation: ${validationResult.error.message}`,
      };
    }

    return {
      success: true,
      data: validationResult.data,
    };
  } catch (error) {
    return {
      success: false,
      error: `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate example with retry logic
 *
 * Attempts generation up to maxRetries times before giving up.
 * Useful for handling transient API errors.
 *
 * @param maxRetries Maximum number of retry attempts
 * @returns Promise resolving to generated patient data or error
 */
export async function generatePatientExampleWithRetry(
  maxRetries = 2
): Promise<GenerationResult> {
  let lastError: string = 'Unknown error';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await generatePatientExample();

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry if it's a configuration error
    if (result.error.includes('ANTHROPIC_API_KEY')) {
      return result;
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  };
}
