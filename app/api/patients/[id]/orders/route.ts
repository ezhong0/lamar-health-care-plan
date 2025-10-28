/**
 * Patient Orders API
 *
 * POST /api/patients/{id}/orders
 * Add a new order to an existing patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';
import { handleError } from '@/lib/infrastructure/error-handler';
import { z } from 'zod';
import { validateNPI } from '@/lib/validation/npi-validator';
import { validateICD10 } from '@/lib/validation/icd10-validator';
import { logger } from '@/lib/infrastructure/logger';

// Schema for creating an order for existing patient
const CreateOrderSchema = z.object({
  medicationName: z.string().min(1, 'Medication name is required').max(200).trim(),
  primaryDiagnosis: z
    .string()
    .trim()
    .superRefine((code, ctx) => {
      const result = validateICD10(code);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid ICD-10 diagnosis code',
        });
      }
    }),
  referringProvider: z.string().min(1, 'Referring provider name is required').max(200).trim(),
  referringProviderNPI: z
    .string()
    .trim()
    .superRefine((npi, ctx) => {
      const result = validateNPI(npi);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.error || 'Invalid NPI',
        });
      }
    }),
});

type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;

    // Validate request body
    const body = await req.json();
    const validationResult = CreateOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationResult.error.issues.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
        },
        { status: 400 }
      );
    }

    const input: CreateOrderInput = validationResult.data;

    logger.info('Adding order to existing patient', {
      patientId,
      medicationName: input.medicationName,
    });

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        orders: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Patient not found',
            code: 'PATIENT_NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Check for duplicate order
    const duplicateOrder = existingPatient.orders.find(
      (order) =>
        order.medicationName.toLowerCase().trim() ===
        input.medicationName.toLowerCase().trim()
    );

    if (duplicateOrder) {
      logger.warn('Duplicate order detected', {
        patientId,
        medicationName: input.medicationName,
        existingOrderId: duplicateOrder.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            message: `This patient already has an order for ${input.medicationName}`,
            code: 'DUPLICATE_ORDER',
            details: {
              existingOrder: {
                id: duplicateOrder.id,
                medicationName: duplicateOrder.medicationName,
                createdAt: duplicateOrder.createdAt,
              },
            },
          },
        },
        { status: 409 }
      );
    }

    // Upsert provider (same logic as patient creation)
    const provider = await prisma.provider.upsert({
      where: { npi: input.referringProviderNPI },
      create: {
        name: input.referringProvider,
        npi: input.referringProviderNPI,
      },
      update: {
        // Don't update name if provider exists with this NPI
        // This maintains referential integrity
      },
    });

    // Create the order
    const order = await prisma.order.create({
      data: {
        patientId,
        providerId: provider.id,
        medicationName: input.medicationName,
        primaryDiagnosis: input.primaryDiagnosis,
        status: 'pending',
      },
      include: {
        provider: true,
      },
    });

    logger.info('Order added to existing patient successfully', {
      patientId,
      orderId: order.id,
      medicationName: order.medicationName,
    });

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          medicationName: order.medicationName,
          primaryDiagnosis: order.primaryDiagnosis,
          status: order.status,
          provider: {
            id: provider.id,
            name: provider.name,
            npi: provider.npi,
          },
          createdAt: order.createdAt,
        },
        patient: {
          id: existingPatient.id,
          firstName: existingPatient.firstName,
          lastName: existingPatient.lastName,
          mrn: existingPatient.mrn,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
