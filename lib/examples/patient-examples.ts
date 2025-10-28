/**
 * Patient Example Data
 *
 * Curated collection of realistic patient examples covering diverse medical scenarios.
 * Each example is medically accurate and demonstrates different aspects of the application.
 *
 * Design principles:
 * - Type-safe with explicit typing
 * - Medically plausible scenarios
 * - Diverse conditions and complexity levels
 * - Clear documentation of use case
 */

import type { PatientInput } from '@/lib/validation/schemas';

/**
 * Example patient metadata for UI display
 */
export interface PatientExample {
  /** Unique identifier for the example */
  id: string;
  /** Display name for selector */
  name: string;
  /** Brief description of the scenario */
  description: string;
  /** Medical complexity level */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Primary condition category */
  category: 'neuromuscular' | 'autoimmune' | 'respiratory' | 'multi-system';
  /** The actual patient data to load */
  data: PatientInput;
}

/**
 * Myasthenia Gravis - Classic presentation requiring IVIG
 * Based on the original project example (A.B.)
 */
const myastheniaGravisExample: PatientExample = {
  id: 'myasthenia-gravis',
  name: 'Myasthenia Gravis (IVIG)',
  description: '46yo female with generalized MG, declining strength, scheduled for thymectomy',
  complexity: 'moderate',
  category: 'neuromuscular',
  data: {
    firstName: 'Alice',
    lastName: 'Bennet',
    mrn: '123456',
    referringProvider: 'Dr. Sarah Chen',
    referringProviderNPI: '1234567893',
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG (Privigen)',
    additionalDiagnoses: ['I10', 'K21.9'], // Hypertension, GERD
    medicationHistory: ['Pyridostigmine', 'Prednisone', 'Lisinopril', 'Omeprazole'],
    patientRecords: `Patient: A.B. (Age 46, Female, 72 kg)
DOB: 1979-06-08
Allergies: None known to medications (no IgA deficiency)

PRIMARY DIAGNOSIS: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
SECONDARY DIAGNOSES: Hypertension (well controlled), GERD

HOME MEDICATIONS:
- Pyridostigmine 60 mg PO q6h PRN (current avg 3-4 doses/day)
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily
- Omeprazole 20 mg PO daily

RECENT HISTORY:
Progressive proximal muscle weakness and ptosis over 2 weeks with worsening speech and swallowing fatigue. Neurology recommends IVIG for rapid symptomatic control (planned course prior to planned thymectomy). Baseline respiratory status: no stridor; baseline FVC 2.8 L (predicted 4.0 L; ~70% predicted). No current myasthenic crisis but declining strength.

BASELINE CLINIC NOTE (Pre-Infusion) - 2025-10-15:
Vitals: BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C
Exam: Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress

LABS:
- CBC WNL
- BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m²
- IgG baseline: 10 g/L

PLAN:
IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center. Premedicate with acetaminophen + diphenhydramine. Monitor vitals and FVC daily. Continue pyridostigmine and prednisone.`,
  },
};

/**
 * Severe Asthma - Biologic therapy indication
 */
const severeAsthmaExample: PatientExample = {
  id: 'severe-asthma',
  name: 'Severe Asthma (Biologic)',
  description: '34yo male with severe eosinophilic asthma despite high-dose ICS/LABA',
  complexity: 'moderate',
  category: 'respiratory',
  data: {
    firstName: 'Marcus',
    lastName: 'Johnson',
    mrn: '234567',
    referringProvider: 'Dr. Emily Rodriguez',
    referringProviderNPI: '1245319599',
    primaryDiagnosis: 'J45.50',
    medicationName: 'Dupilumab (Dupixent)',
    additionalDiagnoses: ['J30.1', 'L20.9', 'K21.9'], // Allergic rhinitis, eczema, GERD
    medicationHistory: ['Fluticasone/Salmeterol', 'Montelukast', 'Albuterol', 'Omeprazole', 'Cetirizine'],
    patientRecords: `Patient: M.J. (Age 34, Male, 82 kg)
DOB: 1991-03-22
Allergies: Penicillin (rash)

PRIMARY DIAGNOSIS: Severe persistent asthma with eosinophilic phenotype
SECONDARY DIAGNOSES: Allergic rhinitis, eczema, GERD

HOME MEDICATIONS:
- Fluticasone/Salmeterol 500/50 mcg 1 puff BID
- Montelukast 10 mg PO daily
- Albuterol HFA 2 puffs q4h PRN (using 4-6x daily)
- Omeprazole 40 mg PO daily
- Cetirizine 10 mg PO daily

RECENT HISTORY:
Despite maximal controller therapy, patient continues to have frequent exacerbations (3 in past year requiring prednisone courses, 1 ED visit). Daily symptoms with exercise limitation. Spirometry shows FEV1 62% predicted with incomplete reversibility. Blood eosinophils 420 cells/µL, IgE 380 IU/mL, FeNO 48 ppb. Pulmonology recommends biologic therapy given eosinophilic phenotype and uncontrolled symptoms.

BASELINE CLINIC NOTE - 2025-10-20:
Vitals: BP 118/72, HR 82, RR 18, SpO2 96% RA, Temp 36.8°C
Exam: Mild expiratory wheezes bilateral, no accessory muscle use, peak flow 380 L/min (personal best 520)

LABS:
- CBC: WBC 8.2 (eosinophils 3.4%, absolute 420), otherwise WNL
- IgE 380 IU/mL
- FeNO 48 ppb

PLAN:
Initiate Dupilumab 600 mg SC loading dose, then 300 mg SC q2 weeks. Continue current controller medications. Follow-up in 4 weeks to assess response. Patient counseled on injection technique and potential side effects.`,
  },
};

/**
 * Rheumatoid Arthritis - Biologic initiation
 */
const rheumatoidArthritisExample: PatientExample = {
  id: 'rheumatoid-arthritis',
  name: 'Rheumatoid Arthritis (Infliximab)',
  description: '52yo female with active RA, inadequate MTX response, starting biologic',
  complexity: 'moderate',
  category: 'autoimmune',
  data: {
    firstName: 'Jennifer',
    lastName: 'Williams',
    mrn: '345678',
    referringProvider: 'Dr. Michael Chang',
    referringProviderNPI: '1679576722',  // Fixed: was duplicate with complexMultiSystemExample
    primaryDiagnosis: 'M05.79',
    medicationName: 'Infliximab (Remicade)',
    additionalDiagnoses: ['M81.0', 'I10'], // Osteoporosis, hypertension
    medicationHistory: ['Methotrexate', 'Folic acid', 'Prednisone', 'Lisinopril', 'Alendronate'],
    patientRecords: `Patient: J.W. (Age 52, Female, 68 kg)
DOB: 1973-08-14
Allergies: Sulfa drugs (Stevens-Johnson syndrome)

PRIMARY DIAGNOSIS: Seropositive rheumatoid arthritis (RF+, anti-CCP+), moderate to severe activity
SECONDARY DIAGNOSES: Osteoporosis (T-score -2.8), hypertension

HOME MEDICATIONS:
- Methotrexate 20 mg PO weekly (Fridays)
- Folic acid 1 mg PO daily
- Prednisone 7.5 mg PO daily
- Lisinopril 20 mg PO daily
- Alendronate 70 mg PO weekly (Sundays)
- Calcium/Vitamin D supplement daily

RECENT HISTORY:
Despite 6 months of methotrexate at therapeutic dose, patient continues with active synovitis affecting hands, wrists, knees. DAS28-CRP score 5.2 (high disease activity). Morning stiffness >2 hours. Unable to perform ADLs without assistance. RF 180 IU/mL, anti-CCP >300 U/mL, CRP 28 mg/L, ESR 42 mm/hr. X-rays show early erosive changes in MCP joints. Rheumatology recommends biologic therapy initiation.

BASELINE CLINIC NOTE - 2025-10-18:
Vitals: BP 132/84, HR 76, RR 14, SpO2 99% RA, Temp 36.6°C
Exam: Synovitis bilateral MCPs, PIPs, wrists, knees; reduced ROM; grip strength 15 mmHg (R), 12 mmHg (L)

LABS:
- CBC WNL
- CMP: Na 140, K 4.2, Cl 102, HCO3 26, BUN 14, SCr 0.82, eGFR >90, ALT 22, AST 24
- RF 180 IU/mL, anti-CCP >300 U/mL
- CRP 28 mg/L, ESR 42 mm/hr
- QuantiFERON-TB Gold: Negative
- Hepatitis B/C: Negative

PLAN:
Initiate Infliximab 3 mg/kg (204 mg) IV at weeks 0, 2, 6, then q8 weeks. Continue methotrexate for synergy. Premedicate with acetaminophen + diphenhydramine. Monitor for infusion reactions. Follow DAS28 and inflammatory markers.`,
  },
};

/**
 * CIDP - Immunoglobulin therapy for neuropathy
 */
const cidpExample: PatientExample = {
  id: 'cidp',
  name: 'CIDP (Immune Globulin)',
  description: '61yo male with chronic inflammatory demyelinating polyneuropathy, progressive weakness',
  complexity: 'complex',
  category: 'neuromuscular',
  data: {
    firstName: 'Robert',
    lastName: 'Martinez',
    mrn: '456789',
    referringProvider: 'Dr. Lisa Patel',
    referringProviderNPI: '1003000126',
    primaryDiagnosis: 'G61.81',
    medicationName: 'IVIG (Gammagard)',
    additionalDiagnoses: ['E11.9', 'E78.5', 'G47.33'], // Type 2 DM, hyperlipidemia, OSA
    medicationHistory: ['Metformin', 'Atorvastatin', 'Aspirin', 'Gabapentin'],
    patientRecords: `Patient: R.M. (Age 61, Male, 85 kg)
DOB: 1964-02-28
Allergies: None known

PRIMARY DIAGNOSIS: Chronic inflammatory demyelinating polyneuropathy (CIDP), typical form
SECONDARY DIAGNOSES: Type 2 diabetes mellitus (HbA1c 7.1%), hyperlipidemia, OSA on CPAP

HOME MEDICATIONS:
- Metformin 1000 mg PO BID
- Atorvastatin 40 mg PO daily
- Aspirin 81 mg PO daily
- Gabapentin 600 mg PO TID (for neuropathic pain)

RECENT HISTORY:
18-month history of progressive symmetric proximal and distal weakness, areflexia, and sensory loss. EMG/NCS shows demyelinating polyneuropathy with conduction block. CSF: protein 95 mg/dL, glucose 72, WBC 2, no oligoclonal bands. MRI spine: no structural lesions. Failed trial of prednisone 60 mg daily x 8 weeks (minimal response, developed hyperglycemia). Neurology recommends IVIG trial given typical CIDP features.

BASELINE CLINIC NOTE - 2025-10-12:
Vitals: BP 138/82, HR 72, RR 16, SpO2 97% RA, Temp 36.9°C
Exam: Weakness 4-/5 proximal arms, 4/5 proximal legs, 4/5 grip bilateral; stocking-glove sensory loss to mid-calf and wrist; areflexia throughout; gait ataxic, uses cane

FUNCTIONAL STATUS:
- mRS 3 (moderate disability, requires some assistance but walks unassisted)
- INCAT disability score: 3 (moderate disability in legs, mild in arms)

LABS:
- CBC: WBC 7.8, Hgb 13.2, Plt 245
- BMP: Glucose 142, Na 138, K 4.0, Cl 103, HCO3 24, BUN 18, SCr 1.02, eGFR 72
- HbA1c 7.1%
- IgG 9.8 g/L (normal)

EMG/NCS (2025-09-15):
- Prolonged distal latencies, reduced conduction velocities (median 28 m/s, ulnar 32 m/s)
- Conduction block median nerve (wrist to elbow)
- Prolonged F-wave latencies

PLAN:
IVIG 2 g/kg total (170 g for 85 kg) given as 0.4 g/kg/day x 5 days monthly. Monitor for efficacy with strength testing and INCAT score. Premedicate to reduce infusion reactions. Consider maintenance therapy if response seen after 3-6 months.`,
  },
};

/**
 * Complex Multi-System Case - Multiple comorbidities
 */
const complexMultiSystemExample: PatientExample = {
  id: 'complex-multi-system',
  name: 'Complex Multi-System (Rituximab)',
  description: '58yo female with dermatomyositis, ILD, refractory to standard therapy',
  complexity: 'complex',
  category: 'multi-system',
  data: {
    firstName: 'Patricia',
    lastName: 'Anderson',
    mrn: '567890',
    referringProvider: 'Dr. David Kim',
    referringProviderNPI: '1518060555',  // Fixed: was duplicate with severeAsthmaExample
    primaryDiagnosis: 'M33.12',
    medicationName: 'Rituximab (Rituxan)',
    additionalDiagnoses: ['R13.10', 'I73.00', 'F32.9', 'J84.10'], // Dysphagia, Raynaud, depression, ILD
    medicationHistory: ['Prednisone', 'Mycophenolate', 'Hydroxychloroquine', 'Tacrolimus', 'Omeprazole', 'Sertraline'],
    patientRecords: `Patient: P.A. (Age 58, Female, 62 kg)
DOB: 1967-05-19
Allergies: Azathioprine (hepatotoxicity), codeine (nausea)

PRIMARY DIAGNOSIS: Dermatomyositis with anti-MDA5 antibodies, complicated by rapidly progressive interstitial lung disease (ILD)
SECONDARY DIAGNOSES: Dysphagia (requiring soft diet), Raynaud phenomenon, depression

HOME MEDICATIONS:
- Prednisone 40 mg PO daily (attempting taper from 60 mg)
- Mycophenolate mofetil 1500 mg PO BID
- Hydroxychloroquine 200 mg PO BID
- Tacrolimus 3 mg PO BID
- Omeprazole 40 mg PO daily
- Metoclopramide 10 mg PO before meals PRN
- Home oxygen 2L NC continuous
- Sertraline 100 mg PO daily

RECENT HISTORY:
Diagnosed 8 months ago with dermatomyositis after presenting with heliotrope rash, Gottron papules, proximal weakness, and dysphagia. Anti-MDA5 antibody positive. HRCT chest showed ground-glass opacities consistent with ILD. Despite aggressive immunosuppression (prednisone, mycophenolate, tacrolimus), disease progression with worsening dyspnea and declining PFTs. PFTs: FVC 58% predicted (down from 72%), DLCO 48% predicted. CK elevated 2400 U/L. Rheumatology and pulmonology recommend rituximab given refractory course and high-risk anti-MDA5 phenotype.

BASELINE CLINIC NOTE - 2025-10-14:
Vitals: BP 142/88, HR 92, RR 20, SpO2 91% on 2L NC, Temp 36.7°C, Weight 62 kg (lost 8 kg in 3 months)
Exam: Cushingoid features, heliotrope rash faded, Gottron papules on knuckles, proximal weakness 3+/5 bilateral, bibasilar crackles, mild peripheral edema

FUNCTIONAL STATUS:
- Dependent for ADLs, uses walker for short distances
- Dysphagia requiring mechanical soft diet, frequent choking episodes
- Significant fatigue limiting daily activities
- Depression related to functional decline

LABS:
- CBC: WBC 12.8 (on prednisone), Hgb 11.2, Plt 380
- BMP: WNL except glucose 154 (steroid-induced)
- LFTs: ALT 52, AST 68, Alk phos 95, bilirubin WNL
- CK 2400 U/L (elevated)
- Aldolase 18 U/L (elevated)
- ESR 48 mm/hr, CRP 15 mg/L
- Anti-MDA5 antibody: Positive (high titer)

PFTs (2025-10-10):
- FVC 58% predicted
- FEV1 62% predicted
- DLCO 48% predicted

HRCT CHEST (2025-10-05):
Bilateral ground-glass opacities, more pronounced in lower lobes. Some reticular changes suggestive of early fibrosis. Progression compared to prior imaging 3 months ago.

PLAN:
Rituximab 1000 mg IV day 1 and day 15. Continue current immunosuppression. Premedicate with methylprednisolone 100 mg IV, acetaminophen, diphenhydramine. Monitor closely for infusion reactions given severity of illness. Coordinate care with pulmonology for ILD management. Repeat PFTs in 3 months to assess response.`,
  },
};

/**
 * Simple Straightforward Case - For testing and demos
 */
const simpleExample: PatientExample = {
  id: 'simple-case',
  name: 'Simple Case (Omalizumab)',
  description: '28yo female with allergic asthma, good candidate for biologic therapy',
  complexity: 'simple',
  category: 'respiratory',
  data: {
    firstName: 'Emma',
    lastName: 'Taylor',
    mrn: '678901',
    referringProvider: 'Dr. James Wilson',
    referringProviderNPI: '1679576722',
    primaryDiagnosis: 'J45.22',
    medicationName: 'Omalizumab (Xolair)',
    additionalDiagnoses: ['J30.2'], // Seasonal allergic rhinitis
    medicationHistory: ['Fluticasone/Salmeterol', 'Albuterol', 'Montelukast'],
    patientRecords: `Patient: E.T. (Age 28, Female, 65 kg)
DOB: 1997-09-12
Allergies: None known

PRIMARY DIAGNOSIS: Moderate persistent allergic asthma
SECONDARY DIAGNOSES: Seasonal allergic rhinitis

HOME MEDICATIONS:
- Fluticasone/Salmeterol 250/50 mcg 1 puff BID
- Albuterol HFA 2 puffs q4h PRN (using 2-3x weekly)
- Montelukast 10 mg PO daily

RECENT HISTORY:
Well-controlled asthma on current regimen but continues to have seasonal exacerbations requiring short prednisone courses (2 in past year). Allergy testing shows sensitivity to multiple environmental allergens (dust mite, pollen, pet dander). IgE level 280 IU/mL. Pulmonology recommends omalizumab to reduce exacerbation frequency and improve quality of life.

BASELINE CLINIC NOTE - 2025-10-22:
Vitals: BP 112/68, HR 68, RR 14, SpO2 99% RA, Temp 36.7°C
Exam: Clear breath sounds bilaterally, no wheezes, good air movement

LABS:
- IgE 280 IU/mL
- Spirometry: FEV1 88% predicted (normal)

PLAN:
Initiate Omalizumab 300 mg SC every 4 weeks based on weight and IgE level. Continue current controller medications. Monitor for improvement in symptom control and reduction in exacerbations. Patient educated on injection administration and potential side effects.`,
  },
};

/**
 * DEMO SCENARIO EXAMPLES
 * These examples demonstrate the duplicate detection warning system
 */

/**
 * Duplicate Patient Demo - Similar Name (Part 1)
 * Demonstrates fuzzy matching - will trigger warning if "Katherine Bennett" is entered
 */
const duplicatePatientDemo1: PatientExample = {
  id: 'duplicate-demo-similar-name',
  name: 'Demo: Similar Name Detection',
  description: 'Catherine Bennett - use with "Katherine Bennett" to see fuzzy matching warning',
  complexity: 'simple',
  category: 'neuromuscular',
  data: {
    firstName: 'Catherine',
    lastName: 'Bennett',
    mrn: '900001',
    referringProvider: 'Dr. Sarah Chen',
    referringProviderNPI: '1234567893',
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG (Privigen)',
    patientRecords: `Patient: C.B. (Age 45, Female, 68 kg)
DOB: 1980-03-15
Allergies: None known

PRIMARY DIAGNOSIS: Myasthenia gravis
HOME MEDICATIONS: Pyridostigmine 60 mg PO q6h

RECENT HISTORY:
Progressive muscle weakness and ptosis over 2 weeks. Neurology recommends IVIG for symptomatic control.

PLAN:
IVIG 2 g/kg total given as 0.4 g/kg/day x 5 days.`,
  },
};

/**
 * Duplicate Patient Demo - Similar Name (Part 2)
 * Enter this AFTER "Catherine Bennett" to trigger fuzzy match warning
 */
const duplicatePatientDemo2: PatientExample = {
  id: 'duplicate-demo-similar-name-2',
  name: 'Demo: Katherine (triggers warning)',
  description: 'Katherine Bennett - similar to Catherine, will trigger fuzzy matching warning',
  complexity: 'simple',
  category: 'respiratory',
  data: {
    firstName: 'Katherine',  // Similar to Catherine - will trigger warning
    lastName: 'Bennett',
    mrn: '900002',  // Different MRN
    referringProvider: 'Dr. Sarah Chen',
    referringProviderNPI: '1234567893',  // Same provider (avoid NPI conflict)
    primaryDiagnosis: 'J45.50',
    medicationName: 'Dupilumab',
    patientRecords: `Patient: K.B. (Age 45, Female, 65 kg)
DOB: 1980-03-15
Allergies: None known

PRIMARY DIAGNOSIS: Severe persistent asthma
HOME MEDICATIONS: Fluticasone/Salmeterol

RECENT HISTORY:
Frequent asthma exacerbations despite maximal therapy. Pulmonology recommends biologic.

PLAN:
Initiate Dupilumab 600 mg SC loading dose.`,
  },
};

/**
 * Duplicate Order Demo - Second Order for Same Patient
 * Demonstrates duplicate order warning - same patient + same medication
 */
const duplicateOrderDemo: PatientExample = {
  id: 'duplicate-demo-order',
  name: 'Demo: Duplicate Order',
  description: 'Alice Bennet + IVIG (second order) - will trigger duplicate order warning',
  complexity: 'simple',
  category: 'neuromuscular',
  data: {
    firstName: 'Alice',  // Same as myastheniaGravisExample
    lastName: 'Bennet',
    mrn: '900003',  // Different MRN (same person, new encounter)
    referringProvider: 'Dr. Sarah Chen',
    referringProviderNPI: '1234567893',
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG (Privigen)',  // Same medication - will trigger warning
    patientRecords: `Patient: A.B. (Age 46, Female, 72 kg)
DOB: 1979-06-08
Allergies: None known

PRIMARY DIAGNOSIS: Myasthenia gravis - follow-up treatment

RECENT HISTORY:
Patient previously received IVIG with good response. Symptoms recurring. Neurology recommends repeat course.

PLAN:
IVIG 2 g/kg total given as 0.4 g/kg/day x 5 days (repeat course).`,
  },
};

/**
 * Provider Conflict Demo
 * Demonstrates provider NPI conflict warning - same NPI with different name
 */
const providerConflictDemo: PatientExample = {
  id: 'duplicate-demo-provider-conflict',
  name: 'Demo: Provider Conflict',
  description: 'Uses Dr. Sarah Chen\'s NPI with different name - triggers provider warning',
  complexity: 'simple',
  category: 'respiratory',
  data: {
    firstName: 'Michael',
    lastName: 'Thompson',
    mrn: '900004',
    referringProvider: 'Dr. S. Chen',  // Different name variation - will trigger warning
    referringProviderNPI: '1234567893',  // Same NPI as Dr. Sarah Chen above
    primaryDiagnosis: 'J45.50',
    medicationName: 'Omalizumab',
    patientRecords: `Patient: M.T. (Age 32, Male, 78 kg)
DOB: 1993-05-20
Allergies: None known

PRIMARY DIAGNOSIS: Severe persistent asthma
HOME MEDICATIONS: Fluticasone/Salmeterol

RECENT HISTORY:
Uncontrolled asthma despite maximal therapy. Recommend biologic therapy.

PLAN:
Initiate Omalizumab based on weight and IgE level.`,
  },
};

/**
 * All available patient examples in a structured collection
 */
export const PATIENT_EXAMPLES: ReadonlyArray<PatientExample> = [
  // Standard clinical examples
  myastheniaGravisExample,
  severeAsthmaExample,
  rheumatoidArthritisExample,
  cidpExample,
  complexMultiSystemExample,
  simpleExample,

  // Demo scenarios for duplicate detection warnings
  duplicatePatientDemo1,
  duplicatePatientDemo2,
  duplicateOrderDemo,
  providerConflictDemo,
] as const;

/**
 * Get example by ID
 */
export function getExampleById(id: string): PatientExample | undefined {
  return PATIENT_EXAMPLES.find((example) => example.id === id);
}

/**
 * Get examples by complexity level
 */
export function getExamplesByComplexity(
  complexity: PatientExample['complexity']
): ReadonlyArray<PatientExample> {
  return PATIENT_EXAMPLES.filter((example) => example.complexity === complexity);
}

/**
 * Get examples by category
 */
export function getExamplesByCategory(
  category: PatientExample['category']
): ReadonlyArray<PatientExample> {
  return PATIENT_EXAMPLES.filter((example) => example.category === category);
}
