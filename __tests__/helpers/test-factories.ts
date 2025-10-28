/**
 * Test Data Factories
 *
 * Generates realistic test data using Faker.js
 * Pattern: Valid by default, override for edge cases
 */

import { faker } from '@faker-js/faker';
import type { PatientInput } from '@/lib/validation/schemas';

/**
 * Pre-validated NPIs (pass Luhn checksum)
 * From generate-patient-example.ts
 */
export const VALID_NPIS = [
  '1234567893',
  '1245319599',
  '1679576722',
  '1982736450',
  '1000000004',
  '1000000012',
  '1000000020',
  '1000000038',
  '1000000046',
  '1200000002',
  '1200000010',
  '1200000028',
  '1200000036',
  '1200000044',
  '1400000000',
  '1400000018',
  '1400000026',
  '1400000034',
  '1400000042',
  '1600000008',
  '1600000016',
  '1600000024',
  '1600000032',
  '1600000040',
  '1800000006',
  '1800000014',
  '1800000022',
  '1800000030',
  '1800000048',
  '2000000002',
  '2000000010',
  '2000000028',
  '2000000036',
  '2000000044',
];

/**
 * Valid ICD-10 codes for common specialty pharmacy conditions
 */
export const VALID_ICD10_CODES = {
  myastheniaGravis: 'G70.00',
  multipleSclerosis: 'G35',
  rheumatoidArthritis: 'M05.79',
  cidp: 'G61.81',
  asthma: 'J45.50',
  immunodeficiency: 'D80.9',
  crohnsDisease: 'K50.90',
  ulcerativeColitis: 'K51.90',
  lupus: 'M32.10',
  psoriaticArthritis: 'L40.50',
  chronicUrticaria: 'L50.1',
  hypertension: 'I10',
  diabetes: 'E11.9',
  ckd: 'N18.3',
};

/**
 * Common specialty medications
 */
export const SPECIALTY_MEDICATIONS = [
  'IVIG (Privigen)',
  'IVIG (Gamunex)',
  'Infliximab',
  'Rituximab',
  'Ocrelizumab',
  'Natalizumab',
  'Omalizumab',
  'Dupilumab',
  'Vedolizumab',
  'Belimumab',
  'Ustekinumab',
];

/**
 * Patient Factory
 *
 * @example Basic usage
 * const patient = PatientFactory.build();
 * expect(patient.firstName).toBeDefined();
 *
 * @example Override specific fields
 * const patient = PatientFactory.build({
 *   firstName: 'Alice',
 *   mrn: '123456',
 * });
 */
export const PatientFactory = {
  /**
   * Build valid patient input data
   */
  build(overrides?: Partial<PatientInput>): PatientInput {
    const age = faker.number.int({ min: 18, max: 85 });
    const weight = faker.number.int({ min: 50, max: 120 });

    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      mrn: faker.string.numeric(6),
      referringProvider: `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,
      referringProviderNPI: faker.helpers.arrayElement(VALID_NPIS),
      primaryDiagnosis: faker.helpers.arrayElement(Object.values(VALID_ICD10_CODES)),
      medicationName: faker.helpers.arrayElement(SPECIALTY_MEDICATIONS),
      additionalDiagnoses: [],
      medicationHistory: [],
      patientRecords: this.generatePatientRecords(age, weight),
      ...overrides,
    };
  },

  /**
   * Build patient with similar name (for fuzzy match testing)
   */
  buildSimilar(existingPatient: PatientInput): PatientInput {
    return this.build({
      firstName: existingPatient.firstName,
      lastName: existingPatient.lastName.slice(0, -1), // Remove last char (typo)
      mrn: faker.string.numeric(6), // Different MRN
    });
  },

  /**
   * Build exact duplicate (same MRN)
   */
  buildDuplicate(existingPatient: PatientInput): PatientInput {
    return this.build({
      mrn: existingPatient.mrn, // Same MRN
      medicationName: faker.helpers.arrayElement(SPECIALTY_MEDICATIONS),
    });
  },

  /**
   * Build duplicate order (same patient + medication)
   */
  buildDuplicateOrder(existingPatient: PatientInput): PatientInput {
    return this.build({
      mrn: existingPatient.mrn, // Same patient
      medicationName: existingPatient.medicationName, // Same medication
    });
  },

  /**
   * Generate realistic patient records
   */
  generatePatientRecords(age: number, weight: number): string {
    const initials = `${faker.person.firstName().charAt(0)}.${faker.person.lastName().charAt(0)}.`;
    const mrn = faker.string.numeric(6);
    const dob = faker.date.past({ years: age });
    const sex = faker.person.sex() === 'male' ? 'Male' : 'Female';

    return `
Name: ${initials} (Fictional)
MRN: ${mrn} (fictional)
DOB: ${dob.toISOString().split('T')[0]} (Age ${age})
Sex: ${sex}
Weight: ${weight} kg
Allergies: None known

Primary diagnosis: ${faker.helpers.arrayElement([
  'Myasthenia gravis (G70.00)',
  'Multiple sclerosis (G35)',
  'Rheumatoid arthritis (M05.79)',
  'CIDP (G61.81)',
  'Severe persistent asthma (J45.50)',
])}

Recent history:
${faker.lorem.sentences(3)}

Baseline clinic note:
Date: ${faker.date.recent({ days: 30 }).toISOString().split('T')[0]}

Vitals: BP ${faker.number.int({ min: 110, max: 140 })}/${faker.number.int({ min: 60, max: 90 })},
        HR ${faker.number.int({ min: 60, max: 100 })},
        RR ${faker.number.int({ min: 12, max: 20 })},
        SpO2 ${faker.number.int({ min: 95, max: 100 })}% RA,
        Temp ${faker.number.float({ min: 36.0, max: 37.5, fractionDigits: 1 })}°C

Exam: ${faker.lorem.sentence()}

Labs: ${faker.lorem.sentence()}

Plan: ${faker.lorem.sentence()}
    `.trim();
  },
};

/**
 * Mock Anthropic API responses
 */
export const AnthropicMocks = {
  successResponse: {
    id: 'msg_test_' + faker.string.alphanumeric(10),
    type: 'message' as const,
    role: 'assistant' as const,
    content: [
      {
        type: 'text' as const,
        text: `### 1. Problem list / Drug therapy problems (DTPs)
• Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy).
• Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis).
• Risk of renal dysfunction or volume overload in susceptible patients.

### 2. Goals (SMART)
• Primary: Achieve clinically meaningful improvement in muscle strength and reduce fatigability within 2 weeks of completing IVIG course.
• Safety goal: No severe infusion reaction, no acute kidney injury.

### 3. Pharmacist interventions / plan
• Dosing: Verify total dose: 2.0 g/kg total (calculate using actual body weight).
• Premedication: Recommend acetaminophen 650 mg PO and diphenhydramine 25–50 mg PO 30–60 minutes prior to infusion.
• Infusion rates: Start at a low rate per product label, increase in stepwise fashion.
• Hydration: Ensure adequate hydration prior to infusion.
• Monitoring: BP, HR, RR, SpO₂, Temp q15 min for first hour, then q30–60 min.

### 4. Monitoring plan & lab schedule
• Before first infusion: CBC, BMP (including SCr, BUN), baseline vitals.
• During each infusion: Vitals q15–30 min; infusion log.
• Post-course (3–7 days): BMP to check renal function.`,
      },
    ],
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'end_turn' as const,
    usage: { input_tokens: 500, output_tokens: 800 },
  },

  timeoutError: new Error('Request timeout after 60s'),

  rateLimitError: {
    status: 429,
    error: {
      type: 'rate_limit_error',
      message: 'Rate limit exceeded',
    },
  },
};
