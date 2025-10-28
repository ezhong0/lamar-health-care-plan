/**
 * Demo Scenarios
 *
 * Curated patient data scenarios for demonstrating key features.
 * Each scenario aligns with E2E test cases and showcases specific functionality.
 */

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  patients: DemoPatient[];
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
    id: 'basic-workflow',
    name: 'Basic Workflow',
    description: 'Simple patient with one medication order, perfect for testing care plan generation.',
    icon: '📋',
    patients: [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        mrn: 'MRN001234',
        patientRecords: 'Patient presents with Type 2 Diabetes. Metformin initiated for glycemic control. Patient reports good medication adherence. No adverse effects reported.',
        additionalDiagnoses: ['Hypertension'],
        medicationHistory: ['Lisinopril 10mg daily'],
        orders: [
          {
            medicationName: 'Metformin 500mg',
            primaryDiagnosis: 'E11.9',
            providerName: 'Dr. Emily Chen',
            providerNpi: '1234567890',
            status: 'pending',
          },
        ],
      },
    ],
  },
  {
    id: 'duplicate-detection',
    name: 'Duplicate Detection',
    description: 'Test fuzzy name matching and duplicate order warnings.',
    icon: '🔍',
    patients: [
      {
        firstName: 'Michael',
        lastName: 'Smith',
        mrn: 'MRN002345',
        patientRecords: 'Patient with chronic back pain. Prescribed Gabapentin for neuropathic pain management.',
        orders: [
          {
            medicationName: 'Gabapentin 300mg',
            primaryDiagnosis: 'M54.5',
            providerName: 'Dr. Robert Martinez',
            providerNpi: '2345678901',
            status: 'pending',
          },
        ],
      },
      {
        firstName: 'Mikey',
        lastName: 'Smith',
        mrn: 'MRN002346',
        patientRecords: 'Similar name patient for testing duplicate detection.',
        orders: [
          {
            medicationName: 'Ibuprofen 800mg',
            primaryDiagnosis: 'M79.3',
            providerName: 'Dr. Sarah Williams',
            providerNpi: '3456789012',
            status: 'pending',
          },
        ],
      },
    ],
  },
  {
    id: 'complex-care',
    name: 'Complex Care',
    description: 'Patient with multiple medications and diagnoses for comprehensive care plans.',
    icon: '⚕️',
    patients: [
      {
        firstName: 'Elizabeth',
        lastName: 'Anderson',
        mrn: 'MRN003456',
        patientRecords: 'Complex patient with multiple chronic conditions. Currently managing diabetes, hypertension, and hyperlipidemia. Patient shows good adherence to medication regimen. Recent A1C of 7.2%, BP controlled at 128/82.',
        additionalDiagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Chronic Kidney Disease Stage 3'],
        medicationHistory: ['Metformin 1000mg BID', 'Lisinopril 20mg daily', 'Atorvastatin 40mg daily'],
        orders: [
          {
            medicationName: 'Metformin 1000mg',
            primaryDiagnosis: 'E11.9',
            providerName: 'Dr. James Thompson',
            providerNpi: '4567890123',
            status: 'pending',
          },
          {
            medicationName: 'Lisinopril 20mg',
            primaryDiagnosis: 'I10',
            providerName: 'Dr. James Thompson',
            providerNpi: '4567890123',
            status: 'pending',
          },
          {
            medicationName: 'Atorvastatin 40mg',
            primaryDiagnosis: 'E78.5',
            providerName: 'Dr. James Thompson',
            providerNpi: '4567890123',
            status: 'pending',
          },
        ],
      },
    ],
  },
  {
    id: 'validation-test',
    name: 'Data Validation',
    description: 'Test form validation with edge cases and special characters.',
    icon: '✅',
    patients: [
      {
        firstName: "Mary-Anne",
        lastName: "O'Brien",
        mrn: 'MRN-004567',
        patientRecords: 'Patient with hyphenated first name and apostrophe in last name. Tests special character handling in the system.',
        orders: [
          {
            medicationName: 'Vitamin D3 1000 IU',
            primaryDiagnosis: 'E55.9',
            providerName: "Dr. Patrick O'Connor",
            providerNpi: '5678901234',
            status: 'pending',
          },
        ],
      },
    ],
  },
  {
    id: 'provider-variations',
    name: 'Provider Variations',
    description: 'Same NPI with different name formats, tests provider deduplication.',
    icon: '👥',
    patients: [
      {
        firstName: 'David',
        lastName: 'Wilson',
        mrn: 'MRN005678',
        patientRecords: 'First patient order from Dr. Smith.',
        orders: [
          {
            medicationName: 'Levothyroxine 50mcg',
            primaryDiagnosis: 'E03.9',
            providerName: 'Dr. John Smith',
            providerNpi: '6789012345',
            status: 'pending',
          },
        ],
      },
      {
        firstName: 'Jennifer',
        lastName: 'Davis',
        mrn: 'MRN005679',
        patientRecords: 'Second patient order from same provider, different name format.',
        orders: [
          {
            medicationName: 'Synthroid 75mcg',
            primaryDiagnosis: 'E03.9',
            providerName: 'John Smith, MD',
            providerNpi: '6789012345',
            status: 'pending',
          },
        ],
      },
    ],
  },
  {
    id: 'export-ready',
    name: 'Export Ready',
    description: 'Multiple patients with complete data for testing export functionality.',
    icon: '📊',
    patients: [
      {
        firstName: 'Robert',
        lastName: 'Taylor',
        mrn: 'MRN006789',
        patientRecords: 'Patient with hypertension and Type 2 diabetes. Well-controlled on current medication regimen.',
        additionalDiagnoses: ['Hypertension', 'Type 2 Diabetes'],
        orders: [
          {
            medicationName: 'Amlodipine 10mg',
            primaryDiagnosis: 'I10',
            providerName: 'Dr. Lisa Anderson',
            providerNpi: '7890123456',
            status: 'fulfilled',
          },
          {
            medicationName: 'Glipizide 5mg',
            primaryDiagnosis: 'E11.9',
            providerName: 'Dr. Lisa Anderson',
            providerNpi: '7890123456',
            status: 'fulfilled',
          },
        ],
      },
      {
        firstName: 'Linda',
        lastName: 'Martinez',
        mrn: 'MRN006790',
        patientRecords: 'Patient with COPD, currently stable on bronchodilator therapy.',
        additionalDiagnoses: ['COPD'],
        orders: [
          {
            medicationName: 'Albuterol Inhaler',
            primaryDiagnosis: 'J44.9',
            providerName: 'Dr. Michael Brown',
            providerNpi: '8901234567',
            status: 'fulfilled',
          },
        ],
      },
      {
        firstName: 'William',
        lastName: 'Garcia',
        mrn: 'MRN006791',
        patientRecords: 'Patient with depression, responding well to SSRI therapy.',
        orders: [
          {
            medicationName: 'Sertraline 50mg',
            primaryDiagnosis: 'F32.9',
            providerName: 'Dr. Jennifer Lee',
            providerNpi: '9012345678',
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
