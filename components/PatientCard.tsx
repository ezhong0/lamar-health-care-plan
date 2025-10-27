/**
 * Patient Card Component
 *
 * Displays patient information in a card format for the patient list page.
 * Linear-inspired design with clean typography and subtle interactions.
 *
 * Shows:
 * - Patient name and MRN
 * - Primary medication and diagnosis
 * - Referring provider
 * - Care plan status (count)
 * - Click to navigate to patient detail
 */

'use client';

import Link from 'next/link';
import type { PatientWithRelations } from '@/lib/api/contracts';
import { Card } from '@/components/ui/card';

interface PatientCardProps {
  patient: PatientWithRelations;
}

export function PatientCard({ patient }: PatientCardProps) {
  const latestOrder = patient.orders?.[0];
  const carePlanCount = patient.carePlans?.length || 0;

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card className="p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer">
        <div className="space-y-3">
          {/* Patient Name and MRN */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              MRN: {patient.mrn}
            </p>
          </div>

          {/* Order Information */}
          {latestOrder && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 dark:text-neutral-500">Medication:</span>
                <span className="font-medium">{latestOrder.medicationName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500 dark:text-neutral-500">Diagnosis:</span>
                <span className="font-mono text-xs">{latestOrder.primaryDiagnosis}</span>
              </div>
            </div>
          )}

          {/* Provider */}
          {latestOrder && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Provider: {latestOrder.provider.name}
            </p>
          )}

          {/* Care Plans Status */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            {carePlanCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {carePlanCount} care {carePlanCount === 1 ? 'plan' : 'plans'}
              </span>
            ) : (
              <span className="text-sm text-neutral-500 dark:text-neutral-500">
                No care plans yet
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
