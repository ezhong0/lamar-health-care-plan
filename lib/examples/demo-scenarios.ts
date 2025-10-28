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
    name: 'Duplicate Detection',
    description: 'Submit form to see "Similar Patient Found" warning. New patient will be created despite similarity.',
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
    name: 'Duplicate Order',
    description: 'Submit form to see duplicate MRN + order warning. Same patient (MRN 007001) with same medication (IVIG).',
    icon: '💊',
    mode: 'prefill',
    patientsToLoad: [
      {
        firstName: 'Alice',
        lastName: 'Bennett',
        mrn: '007001',
        patientRecords: 'Patient with Myasthenia Gravis requiring IVIG therapy. Previous infusion completed successfully.',
        additionalDiagnoses: ['Myasthenia Gravis'],
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
      patientRecords: 'Patient needs refill of IVIG therapy. This should trigger duplicate order warning.',
      additionalDiagnoses: ['Myasthenia Gravis'],
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
    name: 'Provider Conflict',
    description: 'Submit form to see "Provider Name Mismatch" warning. Existing provider will be linked despite name difference.',
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
    name: 'Complex Care',
    description: 'Submit to create patient with multiple medications. Generate comprehensive care plan to test LLM integration.',
    icon: '⚕️',
    mode: 'prefill',
    patientsToLoad: [],
    prefillData: {
      firstName: 'Elizabeth',
      lastName: 'Anderson',
      mrn: '003456',
      patientRecords: 'Complex patient with multiple chronic conditions. Currently managing diabetes, hypertension, and hyperlipidemia. Patient shows good adherence to medication regimen. Recent A1C of 7.2%, BP controlled at 128/82.',
      additionalDiagnoses: ['Type 2 Diabetes', 'Hypertension', 'Hyperlipidemia', 'Chronic Kidney Disease Stage 3'],
      medicationHistory: ['Metformin 1000mg BID', 'Lisinopril 20mg daily', 'Atorvastatin 40mg daily'],
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
    name: 'Data Validation',
    description: 'Submit to test special character handling (hyphens, apostrophes). Patient will be created successfully.',
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
    name: 'Export Ready',
    description: 'Creates 3 patients with fulfilled orders. Navigate to Patients page to test CSV export functionality.',
    icon: '📊',
    mode: 'database',
    patientsToLoad: [
      {
        firstName: 'Robert',
        lastName: 'Taylor',
        mrn: '006789',
        patientRecords: 'Patient with hypertension and Type 2 diabetes. Well-controlled on current medication regimen.',
        additionalDiagnoses: ['Hypertension', 'Type 2 Diabetes'],
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
        additionalDiagnoses: ['COPD'],
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
