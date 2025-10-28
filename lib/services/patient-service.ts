/**
 * Patient Service
 *
 * Orchestrates patient creation with:
 * - Input validation
 * - Provider upsert
 * - Duplicate detection (exact + fuzzy)
 * - Transaction management
 * - Order creation
 *
 * This is the main service layer that ties everything together.
 * Demonstrates production-quality patterns:
 * - Dependency injection
 * - Result types for error handling
 * - Comprehensive logging with context
 * - Database transactions for atomicity
 * - Graceful degradation (warnings vs errors)
 *
 * Transaction boundaries:
 * - Provider upsert + patient create + order create = single transaction
 * - Rollback on any error (maintains consistency)
 * - Duplicate checks run inside transaction (prevent race conditions)
 *
 * Error vs Warning philosophy:
 * - ERROR (blocks creation): Exact duplicate MRN, provider conflict
 * - WARNING (allows creation): Similar patient names, duplicate order
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '@/lib/domain/result';
import type { Patient, PatientId, Order } from '@/lib/domain/types';
import type { Warning } from '@/lib/domain/warnings';
import { toPatientId, toOrderId, toProviderId } from '@/lib/domain/types';
import { DuplicatePatientError } from '@/lib/domain/errors';
import { PAGINATION } from '@/lib/config/constants';
import { logger } from '@/lib/infrastructure/logger';
import { ProviderService } from './provider-service';
import { DuplicateDetector } from './duplicate-detector';

export interface PatientServiceInput {
  firstName: string;
  lastName: string;
  mrn: string;
  referringProvider: string;
  referringProviderNPI: string;
  primaryDiagnosis: string;
  medicationName: string;
  additionalDiagnoses: string[];
  medicationHistory: string[];
  patientRecords: string;
}

export interface PatientServiceResult {
  patient: Patient;
  order: Order;
  warnings: Warning[];
}

/**
 * Patient Service
 *
 * Main orchestration service for patient operations.
 * Uses dependency injection for all collaborators.
 */
export class PatientService {
  constructor(
    private readonly db: PrismaClient,
    private readonly providerService: ProviderService,
    private readonly duplicateDetector: DuplicateDetector
  ) {}

  /**
   * Create patient with full orchestration
   *
   * Steps:
   * 1. Check for exact MRN duplicate (error if exists)
   * 2. Check for similar patients (warnings)
   * 3. Upsert referring provider
   * 4. Create patient
   * 5. Create order
   * 6. Check for duplicate orders (warnings)
   *
   * All wrapped in transaction for atomicity.
   *
   * @param input - Patient creation input
   * @returns Result with patient, order, and warnings
   *
   * @example
   * const result = await patientService.createPatient({
   *   firstName: 'John',
   *   lastName: 'Smith',
   *   mrn: 'MRN12345',
   *   // ... other fields
   * });
   *
   * if (isFailure(result)) {
   *   // Handle error (duplicate MRN, provider conflict)
   * }
   *
   * const { patient, order, warnings } = result.data;
   * // Show warnings to user (similar patients, duplicate orders)
   */
  async createPatient(
    input: PatientServiceInput
  ): Promise<Result<PatientServiceResult>> {
    const startTime = Date.now();

    logger.info('Creating patient', {
      mrn: input.mrn,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    try {
      const result = await this.db.$transaction(async (tx) => {
        // Step 1: Check for exact MRN duplicate (hard error)
        const existingPatient = await tx.patient.findUnique({
          where: { mrn: input.mrn },
        });

        if (existingPatient) {
          logger.warn('Duplicate patient detected', {
            mrn: input.mrn,
            existingPatientId: existingPatient.id,
          });

          throw new DuplicatePatientError({
            mrn: existingPatient.mrn,
            firstName: existingPatient.firstName,
            lastName: existingPatient.lastName,
          });
        }

        // Step 2: Check for similar patients (warnings, not errors)
        const similarPatientWarnings = await this.duplicateDetector.findSimilarPatients(
          {
            firstName: input.firstName,
            lastName: input.lastName,
            mrn: input.mrn,
          },
          tx
        );

        // Step 3: Upsert referring provider
        // This may return ProviderConflictWarning (same NPI, different name)
        const { provider, warnings: providerWarnings } = await this.providerService.upsertProvider(
          {
            name: input.referringProvider,
            npi: input.referringProviderNPI,
          },
          tx
        );

        logger.debug('Provider resolved', {
          providerId: provider.id,
          providerName: provider.name,
          npi: provider.npi,
          warningCount: providerWarnings.length,
        });

        // Step 4: Create patient
        const createdPatient = await tx.patient.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            mrn: input.mrn,
            additionalDiagnoses: input.additionalDiagnoses,
            medicationHistory: input.medicationHistory,
            patientRecords: input.patientRecords,
          },
        });

        logger.debug('Patient created', {
          patientId: createdPatient.id,
          mrn: createdPatient.mrn,
        });

        // Step 5: Create order
        const createdOrder = await tx.order.create({
          data: {
            patientId: createdPatient.id,
            providerId: provider.id,
            medicationName: input.medicationName,
            primaryDiagnosis: input.primaryDiagnosis,
            status: 'pending',
          },
        });

        logger.debug('Order created', {
          orderId: createdOrder.id,
          medicationName: createdOrder.medicationName,
        });

        // Step 6: Check for duplicate orders (warnings)
        const duplicateOrderWarnings = await this.duplicateDetector.findDuplicateOrders(
          {
            patientId: createdPatient.id as PatientId,
            medicationName: input.medicationName,
          },
          tx
        );

        // Combine all warnings
        const allWarnings: Warning[] = [
          ...similarPatientWarnings,
          ...providerWarnings,
          ...duplicateOrderWarnings,
        ];

        return {
          patient: this.toDomainPatient(createdPatient),
          order: this.toDomainOrder(createdOrder),
          warnings: allWarnings,
        };
      });

      const duration = Date.now() - startTime;
      logger.info('Patient created successfully', {
        patientId: result.patient.id,
        orderId: result.order.id,
        mrn: result.patient.mrn,
        warningCount: result.warnings.length,
        duration,
      });

      return {
        success: true,
        data: result,
        warnings: result.warnings,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Domain errors (duplicate patient, provider conflict) - expected
      if (
        error instanceof DuplicatePatientError ||
        error instanceof Error
      ) {
        logger.warn('Patient creation failed', {
          error: error.message,
          duration,
        });

        return {
          success: false,
          error: error as Error,
        };
      }

      // Unexpected errors
      logger.error('Unexpected error creating patient', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get patient by ID with related data
   *
   * @param patientId - Patient ID
   * @returns Patient with orders and care plans, or null if not found
   *
   * @example
   * const patient = await patientService.getPatientById('patient_123');
   */
  async getPatientById(patientId: PatientId): Promise<{
    patient: Patient;
    orders: Order[];
    carePlans: Array<{ id: string; content: string; generatedBy: string; createdAt: Date }>;
  } | null> {
    logger.debug('Fetching patient', { patientId });

    const patient = await this.db.patient.findUnique({
      where: { id: patientId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
        },
        carePlans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      logger.warn('Patient not found', { patientId });
      return null;
    }

    return {
      patient: this.toDomainPatient(patient),
      orders: patient.orders.map((o) => this.toDomainOrder(o)),
      carePlans: patient.carePlans.map((cp) => ({
        id: cp.id,
        content: cp.content,
        generatedBy: cp.generatedBy,
        createdAt: cp.createdAt,
      })),
    };
  }

  /**
   * Get patient by MRN
   *
   * @param mrn - Medical Record Number
   * @returns Patient or null if not found
   */
  async getPatientByMRN(mrn: string): Promise<Patient | null> {
    const patient = await this.db.patient.findUnique({
      where: { mrn },
    });

    if (!patient) {
      return null;
    }

    return this.toDomainPatient(patient);
  }

  /**
   * List recent patients
   *
   * @param limit - Maximum number of patients to return
   * @returns Array of patients, most recent first
   */
  async listRecentPatients(limit: number = PAGINATION.DEFAULT_PATIENT_LIMIT): Promise<Patient[]> {
    const patients = await this.db.patient.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p) => this.toDomainPatient(p));
  }

  /**
   * Convert Prisma patient to domain patient
   *
   * @param patient - Prisma patient
   * @returns Domain patient with branded types
   */
  private toDomainPatient(patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    additionalDiagnoses: string[];
    medicationHistory: string[];
    patientRecords: string;
    createdAt: Date;
    updatedAt: Date;
  }): Patient {
    return {
      id: toPatientId(patient.id),
      firstName: patient.firstName,
      lastName: patient.lastName,
      mrn: patient.mrn,
      additionalDiagnoses: patient.additionalDiagnoses,
      medicationHistory: patient.medicationHistory,
      patientRecords: patient.patientRecords,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  /**
   * Convert Prisma order to domain order
   *
   * @param order - Prisma order
   * @returns Domain order with branded types
   */
  private toDomainOrder(order: {
    id: string;
    patientId: string;
    providerId: string;
    medicationName: string;
    primaryDiagnosis: string;
    status: string;
    createdAt: Date;
  }): Order {
    return {
      id: toOrderId(order.id),
      patientId: toPatientId(order.patientId),
      providerId: toProviderId(order.providerId),
      medicationName: order.medicationName,
      primaryDiagnosis: order.primaryDiagnosis,
      status: order.status as 'pending' | 'fulfilled' | 'cancelled',
      createdAt: order.createdAt,
    };
  }
}
