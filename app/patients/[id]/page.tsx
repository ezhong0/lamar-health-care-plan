/**
 * Patient Detail Page
 *
 * Displays patient information, orders, and care plans.
 * Supports generating new care plans.
 */

'use client';

import { useParams } from 'next/navigation';
import { usePatient, useGenerateCarePlan } from '@/lib/client/hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CarePlanView } from '@/components/CarePlanView';

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;

  const { data, isLoading, error } = usePatient(patientId);
  const generateCarePlan = useGenerateCarePlan();

  const handleGenerateCarePlan = async () => {
    try {
      await generateCarePlan.mutateAsync({ patientId });
    } catch (error) {
      // Error will be handled by React Query
      console.error('Failed to generate care plan:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white mx-auto"></div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading patient information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data?.success || !data.data) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <Alert variant="destructive">
          <AlertDescription>
            {(error as any)?.message || data?.error?.message || 'Failed to load patient information'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { patient, orders, carePlans } = data.data;
  const patientName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{patientName}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">MRN: {patient.mrn}</p>
        </div>

        {/* Patient Information */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Name</p>
              <p className="text-neutral-900 dark:text-white mt-1">{patientName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Medical Record Number</p>
              <p className="text-neutral-900 dark:text-white mt-1">{patient.mrn}</p>
            </div>
            {patient.additionalDiagnoses && patient.additionalDiagnoses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Additional Diagnoses</p>
                <p className="text-neutral-900 dark:text-white mt-1">{patient.additionalDiagnoses.join(', ')}</p>
              </div>
            )}
            {patient.medicationHistory && patient.medicationHistory.length > 0 && (
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Medication History</p>
                <p className="text-neutral-900 dark:text-white mt-1">{patient.medicationHistory.join(', ')}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Patient Records</p>
              <p className="text-neutral-900 dark:text-white mt-1 whitespace-pre-wrap">{patient.patientRecords}</p>
            </div>
          </div>
        </Card>

        {/* Orders */}
        {orders && orders.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Orders</h2>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-900 dark:text-white">{order.medicationName}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Diagnosis: {order.primaryDiagnosis}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      Created: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'fulfilled'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Care Plans */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Care Plans</h2>
            <Button
              onClick={handleGenerateCarePlan}
              disabled={generateCarePlan.isPending}
              className="flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {generateCarePlan.isPending ? 'Generating...' : 'Generate Care Plan'}
            </Button>
          </div>

          {/* Error generating care plan */}
          {generateCarePlan.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {(generateCarePlan.error as any)?.message || 'Failed to generate care plan. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Care plans list */}
          {carePlans && carePlans.length > 0 ? (
            <div className="space-y-6">
              {carePlans.map((carePlan) => (
                <CarePlanView key={carePlan.id} carePlan={carePlan} patientName={patientName} />
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <svg
                  className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-neutral-600 dark:text-neutral-400">No care plans generated yet</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-500">
                  Click "Generate Care Plan" to create a new care plan for this patient
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
