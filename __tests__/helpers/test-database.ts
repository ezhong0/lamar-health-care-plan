/**
 * Test Database Utilities
 *
 * Provides isolated test database for integration tests
 */

import { PrismaClient } from '@prisma/client';
import type { PatientInput } from '@/lib/validation/schemas';
import { PatientFactory, VALID_NPIS } from './test-factories';
import { faker } from '@faker-js/faker';

/**
 * Database cleanup helpers
 *
 * Order matters: Delete in reverse order of foreign keys
 */
export const DatabaseHelpers = {
  /**
   * Clean all test data
   */
  async cleanup(prisma: PrismaClient) {
    await prisma.carePlan.deleteMany();
    await prisma.order.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.provider.deleteMany();
  },

  /**
   * Seed database with test patients
   *
   * @param count Number of patients to create
   * @returns Array of created patients
   */
  async seedPatients(prisma: PrismaClient, count: number = 10) {
    const patients = [];

    for (let i = 0; i < count; i++) {
      const provider = await prisma.provider.create({
        data: {
          name: `Dr. ${faker.person.fullName()}`,
          npi: faker.helpers.arrayElement(VALID_NPIS),
        },
      });

      const patientData = PatientFactory.build();

      const patient = await prisma.patient.create({
        data: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          mrn: patientData.mrn,
          patientRecords: patientData.patientRecords,
          additionalDiagnoses: patientData.additionalDiagnoses || [],
          medicationHistory: patientData.medicationHistory || [],
          orders: {
            create: {
              medicationName: patientData.medicationName,
              primaryDiagnosis: patientData.primaryDiagnosis,
              providerId: provider.id,
              status: 'pending',
            },
          },
        },
        include: {
          orders: true,
        },
      });

      patients.push(patient);
    }

    return patients;
  },

  /**
   * Create a single patient with order
   */
  async createPatient(prisma: PrismaClient, input?: Partial<PatientInput>) {
    const data = PatientFactory.build(input);

    const provider = await prisma.provider.upsert({
      where: { npi: data.referringProviderNPI },
      create: {
        name: data.referringProvider,
        npi: data.referringProviderNPI,
      },
      update: {},
    });

    return prisma.patient.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        mrn: data.mrn,
        patientRecords: data.patientRecords,
        additionalDiagnoses: data.additionalDiagnoses || [],
        medicationHistory: data.medicationHistory || [],
        orders: {
          create: {
            medicationName: data.medicationName,
            primaryDiagnosis: data.primaryDiagnosis,
            providerId: provider.id,
            status: 'pending',
          },
        },
      },
      include: {
        orders: {
          include: {
            provider: true,
          },
        },
      },
    });
  },
};
