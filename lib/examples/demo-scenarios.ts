/**
 * Demo Scenarios
 *
 * Curated patient data scenarios for demonstrating key features.
 * Each scenario aligns with E2E test cases and showcases specific functionality.
 *
 * Two modes:
 * - "database": Load all patients into the database
 * - "prefill": Load some patients to DB, then navigate to form with pre-filled data
 */

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  mode: 'database' | 'prefill';
  patientsToLoad: DemoPatient[]; // Patients to insert into database
  prefillData?: DemoPatient; // Patient data to pre-fill in the form
}

export interface DemoPatient {
  firstName: string;
  lastName: string;
  mrn: string;
  patientRecords: string;
  additionalDiagnoses?: string[];
  medicationHistory?: string[];
  orders: DemoOrder[];
}

export interface DemoOrder {
  medicationName: string;
  primaryDiagnosis: string;
  providerName: string;
  providerNpi: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
}

/**
 * Demo Scenarios
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'duplicate-detection',
    name: 'Similar Patient Warning',
    description: 'Demonstrates fuzzy matching. Submit to see warning about patient "Michael Smith" being similar to "Mikey Smith".',
    icon: '🔍',
    mode: 'prefill',
    patientsToLoad: [
      {
        firstName: 'Michael',
        lastName: 'Smith',
        mrn: '002345',
        patientRecords: 'Patient with chronic back pain. Prescribed Gabapentin for neuropathic pain management.',
        orders: [
          {
            medicationName: 'Gabapentin 300mg',
            primaryDiagnosis: 'M54.5',
            providerName: 'Dr. Robert Martinez',
            providerNpi: '2345678900',
            status: 'pending',
          },
        ],
      },
    ],
    prefillData: {
      firstName: 'Mikey',
      lastName: 'Smith',
      mrn: '002346',
      patientRecords: 'Similar name patient for testing duplicate detection.',
      orders: [
        {
          medicationName: 'Ibuprofen 800mg',
          primaryDiagnosis: 'M79.3',
          providerName: 'Dr. Sarah Williams',
          providerNpi: '3456789015',
          status: 'pending',
        },
      ],
    },
  },
  {
    id: 'duplicate-order',
    name: 'Duplicate Medication Alert',
    description: 'Shows duplicate order detection. Alice Bennett already has IVIG - submit to see warning about ordering same medication twice.',
    icon: '💊',
    mode: 'prefill',
    patientsToLoad: [
      {
        firstName: 'Alice',
        lastName: 'Bennett',
        mrn: '007001',
        patientRecords: `Name: A.B. (Fictional)
MRN: 007001 (fictional)
DOB: 1979-06-08 (Age 46)
Sex: Female
Weight: 72 kg
Allergies: None known to medications (no IgA deficiency)

Primary diagnosis: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
Secondary diagnoses: Hypertension (well controlled), GERD

Home meds:
- Pyridostigmine 60 mg PO q6h PRN (current avg 3–4 doses/day)
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily
- Omeprazole 20 mg PO daily

Recent history:
Progressive proximal muscle weakness and ptosis over 2 weeks with worsening speech and swallowing fatigue.
Neurology recommends IVIG for rapid symptomatic control (planned course prior to planned thymectomy).
Baseline respiratory status: no stridor; baseline FVC 2.8 L (predicted 4.0 L; ~70% predicted). No current myasthenic crisis but declining strength.

A. Baseline clinic note (pre-infusion)
Date: 2025-10-15

Vitals: BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C

Exam: Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress.

Labs: CBC WNL; BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m².

IgG baseline: 10 g/L (for replacement context; note IVIG for immunomodulation here).

Plan: IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center. Premedicate with acetaminophen + diphenhydramine; monitor vitals and FVC daily; continue pyridostigmine and prednisone.

B. Infusion visit note — Day 1
Date: 2025-10-16

IVIG product: Privigen (10% IVIG) — lot #P12345 (fictional)

Dose given: 28.8 g (0.4 g/kg × 72 kg) diluted per manufacturer instructions.

Premeds: Acetaminophen 650 mg PO + Diphenhydramine 25 mg PO 30 minutes pre-infusion.

Infusion start rate: 0.5 mL/kg/hr for first 30 minutes (per institution titration) then increased per tolerance to max manufacturer rate.

Vitals: q15 minutes first hour then q30 minutes; no fever, transient mild headache at 2 hours (resolved after slowing infusion).

Respiratory: FVC 2.7 L (stable).

Disposition: Completed infusion; observed 60 minutes post-infusion; discharged with plan for days 2–5.

C. Follow-up — 2 weeks post-course
Date: 2025-10-30

Clinical status: Subjective improvement in speech and proximal strength; fewer fatigability episodes. No thrombotic events or renal issues reported. Next neurology follow-up in 4 weeks to consider repeat course vs. thymectomy timing.`,
        additionalDiagnoses: ['I10', 'K21.9'],
        orders: [
          {
            medicationName: 'IVIG (Privigen)',
            primaryDiagnosis: 'G70.00',
            providerName: 'Dr. Sarah Chen',
            providerNpi: '1234567893',
            status: 'pending',
          },
        ],
      },
    ],
    prefillData: {
      firstName: 'Alice',
      lastName: 'Bennett',
      mrn: '007001',
      patientRecords: `Name: A.B. (Fictional)
MRN: 007001 (fictional)
DOB: 1979-06-08 (Age 46)
Sex: Female
Weight: 72 kg
Allergies: None known to medications (no IgA deficiency)

Primary diagnosis: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
Secondary diagnoses: Hypertension (well controlled), GERD

Home meds:
- Pyridostigmine 60 mg PO q6h PRN (current avg 3–4 doses/day)
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily
- Omeprazole 20 mg PO daily

Recent history:
Initial IVIG course completed 2 weeks ago with good symptomatic improvement.
Patient now requesting refill of IVIG therapy.
Continued muscle weakness management.

A. Baseline clinic note (pre-infusion)
Date: 2025-10-15

Vitals: BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C

Exam: Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress.

Labs: CBC WNL; BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m².

IgG baseline: 10 g/L (for replacement context; note IVIG for immunomodulation here).

Plan: IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center. Premedicate with acetaminophen + diphenhydramine; monitor vitals and FVC daily; continue pyridostigmine and prednisone.

B. Infusion visit note — Day 1 (Previous Course)
Date: 2025-10-16

IVIG product: Privigen (10% IVIG) — lot #P12345 (fictional)

Dose given: 28.8 g (0.4 g/kg × 72 kg) diluted per manufacturer instructions.

Premeds: Acetaminophen 650 mg PO + Diphenhydramine 25 mg PO 30 minutes pre-infusion.

Infusion start rate: 0.5 mL/kg/hr for first 30 minutes then increased per tolerance to max manufacturer rate.

Vitals: q15 minutes first hour then q30 minutes; no fever, transient mild headache at 2 hours (resolved after slowing infusion).

Respiratory: FVC 2.7 L (stable).

Disposition: Completed infusion; observed 60 minutes post-infusion; discharged with plan for days 2–5.

C. Follow-up — 2 weeks post-course
Date: 2025-10-30

Clinical status: Subjective improvement in speech and proximal strength; fewer fatigability episodes. No thrombotic events or renal issues reported. Patient is now requesting repeat course due to symptoms returning.`,
      additionalDiagnoses: ['I10', 'K21.9'],
      orders: [
        {
          medicationName: 'IVIG (Privigen)',
          primaryDiagnosis: 'G70.00',
          providerName: 'Dr. Sarah Chen',
          providerNpi: '1234567893',
          status: 'pending',
        },
      ],
    },
  },
  {
    id: 'provider-conflict',
    name: 'Provider Name Mismatch',
    description: 'Demonstrates NPI validation. NPI 1234567893 belongs to "Dr. Sarah Chen" but form shows "Dr. S. Chen" - see name conflict warning.',
    icon: '⚠️',
    mode: 'prefill',
    patientsToLoad: [
      {
        firstName: 'Thomas',
        lastName: 'Richards',
        mrn: '007002',
        patientRecords: 'Patient with asthma, prescribed Omalizumab by Dr. Sarah Chen.',
        orders: [
          {
            medicationName: 'Omalizumab',
            primaryDiagnosis: 'J45.50',
            providerName: 'Dr. Sarah Chen',
            providerNpi: '1234567893',
            status: 'pending',
          },
        ],
      },
    ],
    prefillData: {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      mrn: '007003',
      patientRecords: 'Patient with chronic urticaria, prescribed Omalizumab. Provider name variation should trigger warning.',
      orders: [
        {
          medicationName: 'Omalizumab',
          primaryDiagnosis: 'L50.1',
          providerName: 'Dr. S. Chen',
          providerNpi: '1234567893',
          status: 'pending',
        },
      ],
    },
  },
  {
    id: 'complex-care',
    name: 'Comprehensive Care Plan',
    description: 'Complex diabetic patient with CKD and multiple medications. Submit to create, then generate AI care plan to see LLM in action.',
    icon: '⚕️',
    mode: 'prefill',
    patientsToLoad: [],
    prefillData: {
      firstName: 'Elizabeth',
      lastName: 'Anderson',
      mrn: '003456',
      patientRecords: `Name: E.A. (Fictional)
MRN: 003456 (fictional)
DOB: 1965-08-22 (Age 60)
Sex: Female
Weight: 85 kg
Allergies: Sulfa antibiotics (rash)

Primary diagnosis: Type 2 Diabetes Mellitus, uncontrolled (E11.65)
Secondary diagnoses: Essential Hypertension (I10), Hyperlipidemia (E78.5), Chronic Kidney Disease Stage 3a (N18.31)

Home meds:
- Metformin 1000 mg PO BID with meals
- Lisinopril 20 mg PO daily
- Atorvastatin 40 mg PO daily at bedtime
- Aspirin 81 mg PO daily

Recent history:
Type 2 diabetes for 15 years, progressively difficult to control despite oral medications.
Recent A1C 9.1% (previous 8.5% six months ago, 8.8% one year ago) - trending upward.
Experiencing polyuria, polydipsia, and fatigue.
No history of DKA or severe hypoglycemia.
Hypertension well-controlled on current regimen (home BP averaging 130/80).
CKD Stage 3a stable (eGFR 52 mL/min/1.73m² for past year, no proteinuria).
No diabetic retinopathy on recent eye exam.
Mild peripheral neuropathy (symmetric stocking distribution).
Excellent medication adherence, follows dietary recommendations.

A. Baseline clinic note
Date: 2025-10-20

Vitals: BP 132/82, HR 76, RR 14, SpO2 98% RA, Temp 36.9°C, BMI 32.1 (obese), Weight 85 kg (stable)

Exam: Alert and oriented, no acute distress. Cardiovascular: Regular rate and rhythm, no murmurs, no edema. Respiratory: Clear to auscultation bilaterally. Extremities: Decreased sensation to monofilament testing bilaterally, pedal pulses 2+ bilaterally.

Labs: A1C 9.1% (goal <7.5% for this patient); Fasting glucose 198 mg/dL; Random glucose 245 mg/dL; BMP: Na 139, K 4.0, Cl 103, HCO3 24, BUN 22, SCr 1.28, eGFR 52 mL/min/1.73m² (CKD 3a); Lipid panel: Total cholesterol 178, LDL 92, HDL 48, Triglycerides 188; Urine albumin/creatinine ratio 28 mg/g (normal); CBC WNL; TSH 2.1 mIU/L (normal).

Plan: Metformin at maximum tolerated dose (2000 mg/day total). Add GLP-1 agonist or basal insulin - endocrinology recommends adding second-line agent. Patient education on hypoglycemia recognition and management. Continue Lisinopril for renal protection and BP control. Continue Atorvastatin for cardiovascular risk reduction. Nephrology follow-up in 6 months for CKD management. Endocrinology referral for diabetes optimization. Podiatry referral for neuropathy management.`,
      additionalDiagnoses: ['I10', 'E78.5', 'N18.31', 'G62.9'],
      medicationHistory: ['Metformin 1000mg BID', 'Lisinopril 20mg daily', 'Atorvastatin 40mg daily', 'Aspirin 81mg daily'],
      orders: [
        {
          medicationName: 'Metformin 1000mg',
          primaryDiagnosis: 'E11.9',
          providerName: 'Dr. James Thompson',
          providerNpi: '4567890122',
          status: 'pending',
        },
        {
          medicationName: 'Lisinopril 20mg',
          primaryDiagnosis: 'I10',
          providerName: 'Dr. James Thompson',
          providerNpi: '4567890122',
          status: 'pending',
        },
        {
          medicationName: 'Atorvastatin 40mg',
          primaryDiagnosis: 'E78.5',
          providerName: 'Dr. James Thompson',
          providerNpi: '4567890122',
          status: 'pending',
        },
      ],
    },
  },
  {
    id: 'validation-test',
    name: 'Special Characters Test',
    description: 'Tests name validation with hyphens and apostrophes. Patient "Mary-Anne O\'Brien" with provider "Dr. Patrick O\'Connor" will be created successfully.',
    icon: '✅',
    mode: 'prefill',
    patientsToLoad: [],
    prefillData: {
      firstName: "Mary-Anne",
      lastName: "O'Brien",
      mrn: '004567',
      patientRecords: 'Patient with hyphenated first name and apostrophe in last name. Tests special character handling in the system.',
      orders: [
        {
          medicationName: 'Vitamin D3 1000 IU',
          primaryDiagnosis: 'E55.9',
          providerName: "Dr. Patrick O'Connor",
          providerNpi: '5678901237',
          status: 'pending',
        },
      ],
    },
  },
  {
    id: 'export-ready',
    name: 'CSV Export Sample Data',
    description: 'Loads 3 patients with fulfilled orders into database. After loading, navigate to Patients page and click "Export to CSV" to test export feature.',
    icon: '📊',
    mode: 'database',
    patientsToLoad: [
      {
        firstName: 'Robert',
        lastName: 'Taylor',
        mrn: '006789',
        patientRecords: 'Patient with hypertension and Type 2 diabetes. Well-controlled on current medication regimen.',
        additionalDiagnoses: ['I10', 'E11.9'],
        orders: [
          {
            medicationName: 'Amlodipine 10mg',
            primaryDiagnosis: 'I10',
            providerName: 'Dr. Lisa Anderson',
            providerNpi: '7890123459',
            status: 'fulfilled',
          },
          {
            medicationName: 'Glipizide 5mg',
            primaryDiagnosis: 'E11.9',
            providerName: 'Dr. Lisa Anderson',
            providerNpi: '7890123459',
            status: 'fulfilled',
          },
        ],
      },
      {
        firstName: 'Linda',
        lastName: 'Martinez',
        mrn: '006790',
        patientRecords: 'Patient with COPD, currently stable on bronchodilator therapy.',
        additionalDiagnoses: ['J44.9'],
        orders: [
          {
            medicationName: 'Albuterol Inhaler',
            primaryDiagnosis: 'J44.9',
            providerName: 'Dr. Michael Brown',
            providerNpi: '8901234566',
            status: 'fulfilled',
          },
        ],
      },
      {
        firstName: 'William',
        lastName: 'Garcia',
        mrn: '006791',
        patientRecords: 'Patient with depression, responding well to SSRI therapy.',
        orders: [
          {
            medicationName: 'Sertraline 50mg',
            primaryDiagnosis: 'F32.9',
            providerName: 'Dr. Jennifer Lee',
            providerNpi: '9012345671',
            status: 'fulfilled',
          },
        ],
      },
    ],
  },
];

/**
 * Get a scenario by ID
 */
export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}

/**
 * Get all scenario IDs
 */
export function getScenarioIds(): string[] {
  return DEMO_SCENARIOS.map((scenario) => scenario.id);
}
