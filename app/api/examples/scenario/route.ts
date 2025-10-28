/**
 * Demo Scenario Loader API
 *
 * Loads a predefined demo scenario into the database.
 * Clears existing demo data before loading new scenario.
 *
 * POST /api/examples/scenario
 * Body: { scenarioId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { getScenarioById } from '@/lib/examples/demo-scenarios';
import { logger } from '@/lib/infrastructure/logger';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const { scenarioId } = body;

    logger.info('Loading demo scenario', { requestId, scenarioId });

    // Validate scenario ID
    if (!scenarioId || typeof scenarioId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid scenario ID',
            code: 'INVALID_SCENARIO_ID',
          },
        },
        { status: 400 }
      );
    }

    // Get scenario
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Scenario not found',
            code: 'SCENARIO_NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Clear existing demo data (patients with MRN starting with '00')
    // This is a safe way to clear only demo/test data
    await prisma.patient.deleteMany({
      where: {
        mrn: {
          startsWith: '00',
        },
      },
    });

    logger.info('Cleared existing demo data', { requestId, scenarioId });

    // Clean up orphaned providers (providers with no orders after patient deletion)
    const orphanedProvidersDeleted = await prisma.provider.deleteMany({
      where: {
        orders: {
          none: {},
        },
      },
    });

    logger.info('Cleaned up orphaned providers', {
      requestId,
      scenarioId,
      providersDeleted: orphanedProvidersDeleted.count,
    });

    // Load scenario patients into database
    const createdPatients = [];

    for (const demoPatient of scenario.patientsToLoad) {
      // Create or get providers for this patient's orders
      const providerMap = new Map<string, string>();

      for (const order of demoPatient.orders) {
        if (!providerMap.has(order.providerNpi)) {
          // Create or find provider
          const provider = await prisma.provider.upsert({
            where: { npi: order.providerNpi },
            create: {
              name: order.providerName,
              npi: order.providerNpi,
            },
            update: {}, // Don't update if exists
          });
          providerMap.set(order.providerNpi, provider.id);
        }
      }

      // Create patient with orders
      const patient = await prisma.patient.create({
        data: {
          firstName: demoPatient.firstName,
          lastName: demoPatient.lastName,
          mrn: demoPatient.mrn,
          patientRecords: demoPatient.patientRecords,
          additionalDiagnoses: demoPatient.additionalDiagnoses || [],
          medicationHistory: demoPatient.medicationHistory || [],
          orders: {
            create: demoPatient.orders.map((order) => ({
              medicationName: order.medicationName,
              primaryDiagnosis: order.primaryDiagnosis,
              status: order.status,
              providerId: providerMap.get(order.providerNpi)!,
            })),
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

      createdPatients.push(patient);
    }

    logger.info('Demo scenario loaded successfully', {
      requestId,
      scenarioId,
      patientsCreated: createdPatients.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        scenario: {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          mode: scenario.mode,
        },
        patientsCreated: createdPatients.length,
        patients: createdPatients.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          mrn: p.mrn,
          ordersCount: p.orders.length,
        })),
        prefillData: scenario.prefillData || null,
      },
    });
  } catch (error) {
    logger.error('Failed to load demo scenario', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to load demo scenario',
          code: 'SCENARIO_LOAD_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list all available scenarios
 */
export async function GET() {
  const { DEMO_SCENARIOS } = await import('@/lib/examples/demo-scenarios');

  return NextResponse.json({
    success: true,
    data: {
      scenarios: DEMO_SCENARIOS.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        mode: s.mode,
        patientsCount: s.patientsToLoad.length + (s.prefillData ? 1 : 0),
      })),
    },
  });
}
