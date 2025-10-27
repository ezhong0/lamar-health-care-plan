/**
 * New Patient Page
 *
 * Patient intake form for creating new patients.
 * Linear-inspired clean layout with focused form experience.
 */

import { PatientForm } from '@/components/PatientForm';

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">New Patient</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Enter patient information to create a new record and generate a care plan.
          </p>
        </div>

        {/* Patient Form */}
        <PatientForm />
      </div>
    </div>
  );
}
