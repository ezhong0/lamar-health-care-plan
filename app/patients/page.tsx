/**
 * Patients List Page
 *
 * Displays all patients in the system with their basic information and care plan status.
 * Provides navigation to individual patient details and export functionality.
 *
 * Features:
 * - Patient cards with key information
 * - Real-time search across name, MRN, medication, and diagnosis
 * - Export all patients to CSV
 * - Loading and empty states
 * - Linear-inspired design
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { usePatients } from '@/lib/client/hooks';
import { PatientCard } from '@/components/PatientCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PatientWithRelations } from '@/lib/api/contracts';

export default function PatientsPage() {
  const { data, isLoading, error } = usePatients();
  const [searchQuery, setSearchQuery] = useState('');

  const handleExport = () => {
    // Trigger download of CSV export
    window.location.href = '/api/export';
  };

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!data?.success || !data.data) return [];

    const patients = data.data.patients;

    if (!searchQuery.trim()) {
      return patients;
    }

    const query = searchQuery.toLowerCase().trim();

    return patients.filter((patient: PatientWithRelations) => {
      // Search in patient name
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      if (fullName.includes(query)) return true;

      // Search in MRN
      if (patient.mrn.toLowerCase().includes(query)) return true;

      // Search in medications
      if (patient.orders && patient.orders.length > 0) {
        const hasMedication = patient.orders.some((order) =>
          order.medicationName.toLowerCase().includes(query)
        );
        if (hasMedication) return true;
      }

      // Search in diagnoses
      if (patient.orders && patient.orders.length > 0) {
        const hasDiagnosis = patient.orders.some((order) =>
          order.primaryDiagnosis.toLowerCase().includes(query)
        );
        if (hasDiagnosis) return true;
      }

      return false;
    });
  }, [data, searchQuery]);

  const totalPatients = data?.success && data.data ? data.data.patients.length : 0;
  const showingCount = filteredPatients.length;

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

        {/* Search Bar */}
        {data?.success && data.data && data.data.patients.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, MRN, medication, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent transition-all"
              />
            </div>
            {/* Search Results Count */}
            {searchQuery && (
              <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Showing {showingCount} of {totalPatients} patients
                {showingCount === 0 && (
                  <span className="ml-2 text-amber-600 dark:text-amber-500">
                    - No matches found. Try a different search term.
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {data?.success && data.data && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {searchQuery ? 'Filtered' : 'Total'} Patients
              </p>
              <p className="text-3xl font-semibold text-neutral-900 dark:text-white mt-1">
                {filteredPatients.length}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                With Care Plans
              </p>
              <p className="text-3xl font-semibold text-neutral-900 dark:text-white mt-1">
                {
                  filteredPatients.filter(
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
                  filteredPatients.filter(
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

        {/* Empty State - No Patients */}
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

        {/* Empty State - No Search Results */}
        {data?.success && data.data && data.data.patients.length > 0 && filteredPatients.length === 0 && searchQuery && (
          <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
            <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 mb-2">
              No patients match &quot;{searchQuery}&quot;
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              Try adjusting your search or{' '}
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-900 dark:text-white underline hover:no-underline"
              >
                clear the search
              </button>
            </p>
          </div>
        )}

        {/* Patient List */}
        {data?.success && data.data && filteredPatients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredPatients.map((patient: PatientWithRelations) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
