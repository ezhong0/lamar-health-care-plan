/**
 * Patients List Page
 *
 * Displays all patients in the system with their basic information and care plan status.
 * Provides navigation to individual patient details and export functionality.
 *
 * Features:
 * - Patient cards with key information
 * - Export all patients to CSV
 * - Loading and empty states
 * - Linear-inspired design
 */

'use client';

import Link from 'next/link';
import { usePatients } from '@/lib/client/hooks';
import { PatientCard } from '@/components/PatientCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PatientWithRelations } from '@/lib/api/contracts';

export default function PatientsPage() {
  const { data, isLoading, error } = usePatients();

  const handleExport = () => {
    // Trigger download of CSV export
    window.location.href = '/api/export';
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-neutral-900 dark:text-white mb-2">
              Patients
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              View and manage patient records and care plans
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport}>
              Export All
            </Button>
            <Link href="/patients/new">
              <Button>New Patient</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {data?.success && data.data && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Patients
              </p>
              <p className="text-3xl font-semibold text-neutral-900 dark:text-white mt-1">
                {data.data.patients.length}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                With Care Plans
              </p>
              <p className="text-3xl font-semibold text-neutral-900 dark:text-white mt-1">
                {
                  data.data.patients.filter(
                    (p: PatientWithRelations) => p.carePlans && p.carePlans.length > 0
                  ).length
                }
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Active Orders
              </p>
              <p className="text-3xl font-semibold text-neutral-900 dark:text-white mt-1">
                {
                  data.data.patients.filter(
                    (p: PatientWithRelations) => p.orders && p.orders.length > 0
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 dark:border-neutral-100"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">
              Loading patients...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load patients'}
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {data?.success && data.data && data.data.patients.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              No patients yet. Create your first patient or load demo data.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/patients/new">
                <Button>Create Patient</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Load Demo Data</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Patient List */}
        {data?.success && data.data && data.data.patients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.data.patients.map((patient: PatientWithRelations) => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
