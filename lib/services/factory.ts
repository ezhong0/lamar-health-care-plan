/**
 * Service Factory
 *
 * Central location for creating service instances with proper dependency injection.
 * Eliminates service initialization duplication across API routes.
 *
 * Benefits:
 * - Single source of truth for service construction
 * - Easier to modify service dependencies
 * - Better testability (can mock the factory)
 * - Consistent service initialization
 */

import type { PrismaClient } from '@prisma/client';
import { PatientService } from './patient-service';
import { ProviderService } from './provider-service';
import { DuplicateDetector } from './duplicate-detector';
import { CarePlanService } from './care-plan-service';
import { ExportService } from './export-service';
import { env } from '@/lib/infrastructure/env';

/**
 * Patient Service Stack
 *
 * Creates all services needed for patient operations:
 * - PatientService (main orchestrator)
 * - ProviderService (provider management)
 * - DuplicateDetector (duplicate checking)
 */
export interface PatientServiceStack {
  patientService: PatientService;
  providerService: ProviderService;
  duplicateDetector: DuplicateDetector;
}

/**
 * Create patient service stack with all dependencies
 *
 * @param prisma - Prisma client instance
 * @returns Object with all patient-related services
 *
 * @example
 * const { patientService } = createPatientServices(prisma);
 * const result = await patientService.createPatient(input);
 */
export function createPatientServices(prisma: PrismaClient): PatientServiceStack {
  const providerService = new ProviderService(prisma);
  const duplicateDetector = new DuplicateDetector();
  const patientService = new PatientService(
    prisma,
    providerService,
    duplicateDetector
  );

  return {
    patientService,
    providerService,
    duplicateDetector,
  };
}

/**
 * Create care plan service
 *
 * @param prisma - Prisma client instance
 * @returns CarePlanService instance
 *
 * @example
 * const carePlanService = createCarePlanService(prisma);
 * const result = await carePlanService.generateCarePlan({ patientId });
 */
export function createCarePlanService(prisma: PrismaClient): CarePlanService {
  return new CarePlanService(prisma, env.ANTHROPIC_API_KEY);
}

/**
 * Create export service
 *
 * @param prisma - Prisma client instance
 * @returns ExportService instance
 *
 * @example
 * const exportService = createExportService(prisma);
 * const csv = await exportService.exportPatientsToCSV();
 */
export function createExportService(prisma: PrismaClient): ExportService {
  return new ExportService(prisma);
}

/**
 * Create all services (convenience function)
 *
 * Useful for contexts where you need multiple service types.
 *
 * @param prisma - Prisma client instance
 * @returns Object with all services
 */
export function createAllServices(prisma: PrismaClient) {
  return {
    ...createPatientServices(prisma),
    carePlanService: createCarePlanService(prisma),
    exportService: createExportService(prisma),
  };
}
