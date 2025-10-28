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
2. A referring provider (name and valid 10-digit NPI starting with 1 or 2)
3. A primary diagnosis (valid ICD-10 code)
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

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "firstName": "string",
  "lastName": "string",
  "mrn": "string (exactly 6 digits)",
  "referringProvider": "string (e.g. Dr. First Last)",
  "referringProviderNPI": "string (exactly 10 digits, valid NPI)",
  "primaryDiagnosis": "string (valid ICD-10 code)",
  "medicationName": "string (specific medication name)",
  "patientRecords": "string (detailed clinical note as shown in examples)"
}`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
