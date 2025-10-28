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

    // Generate a random seed to force different outputs each time
    const randomSeed = Math.random().toString(36).substring(7);
    const timestamp = Date.now();

    // Pick a random condition index to encourage variety
    const conditionSeed = timestamp % 11;

    const prompt = `You are generating a demo patient case for a specialty pharmacy management system.

UNIQUENESS SEED: ${timestamp}-${randomSeed}-${conditionSeed}

## Your Task
Create ONE realistic patient scenario for a specialty biologic/infusion therapy. This will be used to demonstrate the system's capabilities.

## Requirements for Demo Quality

**Patient Demographics:**
- Age: ${20 + (timestamp % 60)} years old (use this specific age)
- Gender: ${timestamp % 2 === 0 ? 'Male' : 'Female'}
- Use a memorable, professional name (diverse cultural backgrounds)
- Avoid overused names: Skip "Marcus", "Chen", "Sarah", "Johnson", "Smith"
- Good examples: "Amir Patel", "Rosa Martinez", "James O'Connor", "Yuki Tanaka"

**Clinical Scenario:**
Pick ONE condition from this list (rotate to #${conditionSeed}):
0. Rheumatoid arthritis → Medication: Infliximab or Rituximab
1. Multiple sclerosis → Medication: Ocrelizumab or Natalizumab
2. Myasthenia gravis → Medication: IVIG (Privigen or Gamunex)
3. CIDP (chronic neuropathy) → Medication: IVIG
4. Severe persistent asthma → Medication: Omalizumab or Dupilumab
5. Immunodeficiency (CVID) → Medication: IVIG (replacement therapy)
6. Crohn's disease → Medication: Infliximab or Vedolizumab
7. Ulcerative colitis → Medication: Infliximab or Vedolizumab
8. Systemic lupus erythematosus → Medication: Belimumab or Rituximab
9. Psoriatic arthritis → Medication: Infliximab or Ustekinumab
10. Chronic urticaria → Medication: Omalizumab

**Provider:**
- Use specialty-appropriate provider (e.g., Neurologist for MS, Rheumatologist for RA)
- Vary provider names (different backgrounds, both genders)

## Clinical Notes Format (Keep it concise and scannable)

Use this structure:
\`\`\`
Name: [Initials]. (Fictional)
MRN: [6 digits] (fictional)
DOB: [Date] (Age [age])
Sex: [M/F]
Weight: [weight] kg
Allergies: [List or "None known"]

Primary diagnosis: [Condition name] ([ICD-10 code])
Secondary diagnoses: [If applicable]

Home meds:
- [Medication 1]
- [Medication 2]
(Keep to 2-4 relevant medications)

Recent history:
[2-3 sentences about current status, symptoms, treatment rationale]

A. Baseline clinic note
Date: 2025-10-[random day 15-28]

Vitals: BP [realistic], HR [realistic], RR [realistic], SpO2 [realistic]% RA, Temp [realistic]°C

Exam: [2-3 key findings relevant to condition]

Labs: [3-5 relevant labs with realistic values for the condition]

Plan: [Treatment plan in 2-3 sentences - mention the biologic therapy]
\`\`\`

## Quality Guidelines
✅ Medically accurate and realistic
✅ Concise but complete (aim for 200-300 words total)
✅ Professional tone appropriate for specialty pharmacy
✅ Clean formatting (easy to scan)
✅ Realistic lab values and vitals for the condition
✅ Appropriate complexity (not too simple, not overwhelming)
❌ Don't make up fake drug names or invalid codes
❌ Don't include unnecessary detail or long paragraphs
❌ Don't use the same names/scenarios repeatedly

## CRITICAL Validation Requirements

**NPI Number (referringProviderNPI):**
You MUST pick ONE from this list (these are pre-validated):
  - 1234567893
  - 1245319599
  - 1679576722
  - 1982736450
  - 1000000004
  - 1000000012
  - 1000000020
  - 1000000038
  - 1000000046
  - 1200000002
  - 1200000010
  - 1200000028
  - 1200000036
  - 1200000044
  - 1400000000
  - 1400000018
  - 1400000026
  - 1400000034
  - 1400000042
  - 1600000008
  - 1600000016
  - 1600000024
  - 1600000032
  - 1600000040
  - 1800000006
  - 1800000014
  - 1800000022
  - 1800000030
  - 1800000048
  - 2000000002
  - 2000000010
  - 2000000028
  - 2000000036
  - 2000000044
  (Randomly pick ONE - don't always use the same NPI)

**ICD-10 Code (primaryDiagnosis):**
Pick the code that matches your chosen condition:
  - M05.79 = Rheumatoid arthritis
  - G35 = Multiple sclerosis
  - G70.00 = Myasthenia gravis
  - G61.81 = CIDP
  - J45.50 = Severe persistent asthma
  - D80.9 = Immunodeficiency (CVID)
  - K50.90 = Crohn's disease
  - K51.90 = Ulcerative colitis
  - M32.10 = Systemic lupus
  - L40.50 = Psoriatic arthritis
  - L50.1 = Chronic urticaria

Secondary diagnoses (if you include them) can use:
  - I10 = Essential hypertension
  - E11.9 = Type 2 diabetes
  - N18.3 = Chronic kidney disease stage 3

IMPORTANT: Code MUST include decimal point (e.g., "G70.00" not "G7000")

## Output Format

Return ONLY a valid JSON object (no markdown code blocks, no explanations):
{
  "firstName": "string (memorable, diverse)",
  "lastName": "string (memorable, diverse)",
  "mrn": "string (exactly 6 digits)",
  "referringProvider": "string (format: Dr. FirstName LastName with specialty-appropriate name)",
  "referringProviderNPI": "string (pick ONE from the NPI list above)",
  "primaryDiagnosis": "string (ICD-10 code with decimal, matching your chosen condition)",
  "medicationName": "string (specific brand/generic name matching condition)",
  "patientRecords": "string (use the concise clinical notes format shown above)"
}

Example output structure:
{
  "firstName": "Amir",
  "lastName": "Patel",
  "mrn": "123456",
  "referringProvider": "Dr. Jennifer Wu",
  "referringProviderNPI": "1234567893",
  "primaryDiagnosis": "M05.79",
  "medicationName": "Infliximab",
  "patientRecords": "Name: A.P. (Fictional)\\nMRN: 123456\\n..."
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 1.0, // Max randomness for varied examples
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
