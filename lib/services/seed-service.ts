/**
 * Seed Service
 *
 * Provides demo data for showcasing the application.
 * Uses realistic patient examples from the project requirements.
 *
 * Design decisions:
 * - Reuses PatientService (no duplicate patient creation logic)
 * - Demo data based on IVIG case from project description
 * - Each patient demonstrates a different scenario (golden path, duplicate detection, warnings)
 * - Idempotent: Safe to run multiple times
 *
 * Independence:
 * - Completely optional feature
 * - Can be removed without affecting core functionality
 * - No modifications to existing services
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '@/lib/domain/result';
import { PatientService } from './patient-service';
import { ProviderService } from './provider-service';
import { DuplicateDetector } from './duplicate-detector';
import { logger } from '@/lib/infrastructure/logger';

/**
 * Demo patient data
 * Based on Example 1 from project description (IVIG for Myasthenia Gravis)
 */
const DEMO_PATIENTS = [
  {
    firstName: 'Alice',
    lastName: 'Bennet',
    mrn: '123456',
    referringProvider: 'Dr. Sarah Chen',
    referringProviderNPI: '1234567893',
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG (Privigen)',
    additionalDiagnoses: ['I10', 'K21.9'], // Hypertension, GERD
    medicationHistory: [
      'Pyridostigmine 60 mg PO q6h PRN',
      'Prednisone 10 mg PO daily',
      'Lisinopril 10 mg PO daily',
      'Omeprazole 20 mg PO daily',
    ],
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
    scenario: 'Golden path - Complete workflow demonstration',
  },
  {
    firstName: 'Jon',
    lastName: 'Smith',
    mrn: '234567',
    referringProvider: 'Dr. James Johnson',
    referringProviderNPI: '9876543210',
    primaryDiagnosis: 'G70.00',
    medicationName: 'IVIG (Privigen)',
    additionalDiagnoses: [],
    medicationHistory: ['Pyridostigmine 60 mg PO TID'],
    patientRecords: `Patient: J.S. (Age 52, Male, 85 kg)
DOB: 1972-11-22

PRIMARY DIAGNOSIS: Myasthenia gravis

Similar presentation to A.B. - demonstrates fuzzy matching duplicate detection (name similarity). Progressive muscle weakness, requiring IVIG therapy. Baseline pyridostigmine therapy with suboptimal control.`,
    scenario: 'Similar name to Alice Bennet - tests fuzzy duplicate detection',
  },
  {
    firstName: 'Maria',
    lastName: 'Rodriguez',
    mrn: '345678',
    referringProvider: 'Dr. Emily Williams',
    referringProviderNPI: '1122334455',
    primaryDiagnosis: 'M05.79',
    medicationName: 'Humira',
    additionalDiagnoses: ['M79.3'], // Panniculitis
    medicationHistory: [
      'Methotrexate 15 mg weekly',
      'Folic acid 1 mg daily',
      'Prednisone 5 mg daily',
    ],
    patientRecords: `Patient: M.R. (Age 38, Female, 62 kg)
DOB: 1987-03-15

PRIMARY DIAGNOSIS: Rheumatoid arthritis with rheumatoid factor, multiple sites
SECONDARY DIAGNOSES: Panniculitis

Active RA despite methotrexate therapy. Starting Humira (adalimumab) 40 mg subcutaneous every 2 weeks. Patient educated on injection technique, infection precautions, and tuberculosis screening completed (negative). Baseline labs normal. Continue methotrexate and low-dose prednisone during Humira initiation.`,
    scenario: 'Different medication type - shows system handles multiple specialty drugs',
  },
  {
    firstName: 'Robert',
    lastName: 'Johnson',
    mrn: '456789',
    referringProvider: 'Dr. S. Chen', // Same NPI as Dr. Sarah Chen but different name format
    referringProviderNPI: '1234567893', // SAME NPI as Patient 1
    primaryDiagnosis: 'G35',
    medicationName: 'Copaxone',
    additionalDiagnoses: [],
    medicationHistory: ['Interferon beta-1a (discontinued due to side effects)'],
    patientRecords: `Patient: R.J. (Age 45, Male, 78 kg)
DOB: 1980-05-10

PRIMARY DIAGNOSIS: Multiple sclerosis

Relapsing-remitting MS with inadequate response to interferon therapy. Switching to Copaxone (glatiramer acetate) 20 mg subcutaneous daily. Patient counseled on injection site rotation, local reactions, and post-injection systemic reactions. No active relapses currently.`,
    scenario:
      'Provider conflict - same NPI as Dr. Sarah Chen but different name format (tests NPI validation)',
  },
  {
    firstName: 'David',
    lastName: 'Lee',
    mrn: '567890',
    referringProvider: 'Dr. Michael Brown',
    referringProviderNPI: '5544332211',
    primaryDiagnosis: 'K50.90',
    medicationName: 'Remicade',
    additionalDiagnoses: ['K52.9'], // Gastroenteritis
    medicationHistory: [
      'Mesalamine 1200 mg PO TID',
      'Azathioprine 100 mg daily (discontinued)',
    ],
    patientRecords: `Patient: D.L. (Age 29, Male, 70 kg)
DOB: 1996-08-20

PRIMARY DIAGNOSIS: Crohn's disease, unspecified

Moderate to severe Crohn's disease with inadequate response to conventional therapy. Starting Remicade (infliximab) 5 mg/kg IV at 0, 2, 6 weeks then every 8 weeks. Infection screening completed (TB negative, hepatitis panel negative). Continue mesalamine. Monitoring for infusion reactions and therapeutic response.`,
    scenario: 'Clean case - no warnings expected, different GI specialty medication',
  },
];

export interface SeedResult {
  patientsCreated: number;
  patientsCleared: number;
}

/**
 * Seed Service
 *
 * Loads demo data for application showcase.
 */
export class SeedService {
  constructor(
    private readonly db: PrismaClient,
    private readonly patientService: PatientService
  ) {}

  /**
   * Seed demo patients
   *
   * Creates 5 realistic demo patients that showcase:
   * 1. Complete workflow (IVIG case from project docs)
   * 2. Fuzzy duplicate detection (similar names)
   * 3. Provider conflict detection (same NPI, different name)
   * 4. Multiple medication types
   * 5. Clean cases without warnings
   *
   * @returns Result with count of patients created and cleared
   */
  async seedDemoData(): Promise<Result<SeedResult>> {
    const startTime = Date.now();

    logger.info('Starting demo data seed');

    try {
      // Step 1: Clear existing demo data (based on known MRNs)
      const demoMRNs = DEMO_PATIENTS.map((p) => p.mrn);

      const deleteResult = await this.db.$transaction(async (tx) => {
        // Delete care plans first (foreign key constraint)
        await tx.carePlan.deleteMany({
          where: {
            patient: {
              mrn: {
                in: demoMRNs,
              },
            },
          },
        });

        // Delete orders
        await tx.order.deleteMany({
          where: {
            patient: {
              mrn: {
                in: demoMRNs,
              },
            },
          },
        });

        // Delete patients
        const deleted = await tx.patient.deleteMany({
          where: {
            mrn: {
              in: demoMRNs,
            },
          },
        });

        return deleted.count;
      });

      logger.info('Cleared existing demo data', {
        patientsDeleted: deleteResult,
      });

      // Step 2: Create demo patients using PatientService
      // This ensures we go through the same validation/duplicate detection logic
      let successCount = 0;

      for (const demoPatient of DEMO_PATIENTS) {
        try {
          const result = await this.patientService.createPatient({
            firstName: demoPatient.firstName,
            lastName: demoPatient.lastName,
            mrn: demoPatient.mrn,
            referringProvider: demoPatient.referringProvider,
            referringProviderNPI: demoPatient.referringProviderNPI,
            primaryDiagnosis: demoPatient.primaryDiagnosis,
            medicationName: demoPatient.medicationName,
            additionalDiagnoses: demoPatient.additionalDiagnoses,
            medicationHistory: demoPatient.medicationHistory,
            patientRecords: demoPatient.patientRecords,
          });

          if (result.success) {
            successCount++;
            logger.info('Created demo patient', {
              mrn: demoPatient.mrn,
              name: `${demoPatient.firstName} ${demoPatient.lastName}`,
              scenario: demoPatient.scenario,
              warnings: result.data.warnings.length,
            });
          } else {
            logger.warn('Failed to create demo patient', {
              mrn: demoPatient.mrn,
              error: result.error.message,
            });
          }
        } catch (error) {
          logger.error('Error creating demo patient', {
            mrn: demoPatient.mrn,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Demo data seed completed', {
        patientsCreated: successCount,
        patientsCleared: deleteResult,
        duration,
      });

      return {
        success: true,
        data: {
          patientsCreated: successCount,
          patientsCleared: deleteResult,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Demo data seed failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to seed demo data'),
      };
    }
  }

  /**
   * Get demo data statistics
   *
   * Returns count of patients, orders, and care plans for demo MRNs.
   * Useful for verifying seed was successful.
   */
  async getDemoStats(): Promise<{
    patients: number;
    orders: number;
    carePlans: number;
  }> {
    const demoMRNs = DEMO_PATIENTS.map((p) => p.mrn);

    const [patients, orders, carePlans] = await Promise.all([
      this.db.patient.count({
        where: {
          mrn: {
            in: demoMRNs,
          },
        },
      }),
      this.db.order.count({
        where: {
          patient: {
            mrn: {
              in: demoMRNs,
            },
          },
        },
      }),
      this.db.carePlan.count({
        where: {
          patient: {
            mrn: {
              in: demoMRNs,
            },
          },
        },
      }),
    ]);

    return { patients, orders, carePlans };
  }
}
