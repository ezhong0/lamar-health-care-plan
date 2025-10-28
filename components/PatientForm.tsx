/**
 * Patient Form Component
 *
 * Comprehensive patient intake form with real-time validation.
 * Linear-inspired design with clean, focused UI.
 */

'use client';

import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientInputSchema, type PatientInput } from '@/lib/validation/schemas';
import { useCreatePatient } from '@/lib/client/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WarningList } from './WarningList';
import type { Warning } from '@/lib/domain/warnings';
import { ApiError } from '@/lib/client/errors';

export function PatientForm() {
  const router = useRouter();
  const createPatient = useCreatePatient();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PatientInput>({
    resolver: zodResolver(PatientInputSchema) as Resolver<PatientInput>,
  });

  const onSubmit = async (data: PatientInput) => {
    try {
      const result = await createPatient.mutateAsync(data);

      if (result.success && result.data) {
        const patientId = result.data.patient.id;

        // Store patient ID for navigation after warnings are dismissed
        setCreatedPatientId(patientId);

        // Check if there are warnings
        if (result.data.warnings && result.data.warnings.length > 0) {
          setWarnings(result.data.warnings);
          setShowWarnings(true);
        } else {
          // No warnings, navigate to patient detail immediately
          router.push(`/patients/${patientId}`);
        }
      }
    } catch (error: unknown) {
      // Type-safe error handling
      if (error instanceof ApiError) {
        console.error('API error creating patient:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
      } else if (error instanceof Error) {
        console.error('Error creating patient:', error.message);
      } else {
        console.error('Unknown error creating patient:', error);
      }
      // Error state will be handled by React Query (createPatient.isError)
    }
  };

  const handleDismissWarnings = () => {
    // Patient was successfully created, navigate to detail page
    // Both "Proceed" and "Cancel" navigate since creation succeeded
    if (createdPatientId) {
      router.push(`/patients/${createdPatientId}`);
    } else {
      // Fallback: return to form (shouldn't happen in normal flow)
      setShowWarnings(false);
    }
  };

  const loadExampleData = () => {
    // Example patient from project description (A.B. - IVIG for Myasthenia Gravis)
    const examplePatientRecords = `Patient: A.B. (Age 46, Female, 72 kg)
DOB: 1979-06-08
Allergies: None known to medications (no IgA deficiency)

PRIMARY DIAGNOSIS: Generalized myasthenia gravis (AChR antibody positive), MGFA class IIb
SECONDARY DIAGNOSES: Hypertension (well controlled), GERD

HOME MEDICATIONS:
- Pyridostigmine 60 mg PO q6h PRN (current avg 3-4 doses/day)
- Prednisone 10 mg PO daily
- Lisinopril 10 mg PO daily
- Omeprazole 20 mg PO daily

RECENT HISTORY:
Progressive proximal muscle weakness and ptosis over 2 weeks with worsening speech and swallowing fatigue. Neurology recommends IVIG for rapid symptomatic control (planned course prior to planned thymectomy). Baseline respiratory status: no stridor; baseline FVC 2.8 L (predicted 4.0 L; ~70% predicted). No current myasthenic crisis but declining strength.

BASELINE CLINIC NOTE (Pre-Infusion) - 2025-10-15:
Vitals: BP 128/78, HR 78, RR 16, SpO2 98% RA, Temp 36.7°C
Exam: Ptosis bilateral, fatigable proximal weakness (4/5), speech slurred after repeated counting, no respiratory distress

LABS:
- CBC WNL
- BMP: Na 138, K 4.1, Cl 101, HCO3 24, BUN 12, SCr 0.78, eGFR >90 mL/min/1.73m²
- IgG baseline: 10 g/L

PLAN:
IVIG 2 g/kg total (144 g for 72 kg) given as 0.4 g/kg/day x 5 days in outpatient infusion center. Premedicate with acetaminophen + diphenhydramine. Monitor vitals and FVC daily. Continue pyridostigmine and prednisone.`;

    setValue('firstName', 'Alice');
    setValue('lastName', 'Bennet');
    setValue('mrn', '123456');
    setValue('referringProvider', 'Dr. Sarah Chen');
    setValue('referringProviderNPI', '1234567893');
    setValue('primaryDiagnosis', 'G70.00');
    setValue('medicationName', 'IVIG (Privigen)');
    setValue('patientRecords', examplePatientRecords);
  };

  if (showWarnings && warnings.length > 0) {
    return (
      <WarningList
        warnings={warnings}
        onProceed={handleDismissWarnings}
        onCancel={handleDismissWarnings}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Error Alert */}
      {createPatient.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {createPatient.error instanceof ApiError
              ? createPatient.error.getUserMessage()
              : createPatient.error instanceof Error
                ? createPatient.error.message
                : 'Failed to create patient. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Example Data Helper */}
      <Card className="p-6 bg-neutral-50 dark:bg-neutral-900/50 border-dashed">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
              Try with Example Data
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Load a sample patient (A.B. - IVIG for Myasthenia Gravis) from the project documentation to explore the application features.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadExampleData}
            className="shrink-0"
          >
            Load Example
          </Button>
        </div>
      </Card>

      {/* Patient Information */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Patient Information</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Enter the patient&apos;s basic information
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" {...register('firstName')} placeholder="John" />
            {errors.firstName && <p className="text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" {...register('lastName')} placeholder="Doe" />
            {errors.lastName && <p className="text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mrn">Medical Record Number (MRN) *</Label>
            <Input
              id="mrn"
              {...register('mrn')}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              pattern="\d*"
            />
            {errors.mrn && <p className="text-sm text-red-600 dark:text-red-400">{errors.mrn.message}</p>}
          </div>
        </div>
      </Card>

      {/* Provider Information */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Provider Information</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Referring provider details
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="referringProvider">Referring Provider Name *</Label>
            <Input id="referringProvider" {...register('referringProvider')} placeholder="Dr. Smith" />
            {errors.referringProvider && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.referringProvider.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referringProviderNPI">Provider NPI *</Label>
            <Input
              id="referringProviderNPI"
              {...register('referringProviderNPI')}
              placeholder="1234567893"
              maxLength={10}
            />
            {errors.referringProviderNPI && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.referringProviderNPI.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Medication & Diagnosis */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Medication & Diagnosis</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Current medication and diagnoses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="medicationName">Medication Name *</Label>
            <Input id="medicationName" {...register('medicationName')} placeholder="IVIG" />
            {errors.medicationName && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.medicationName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryDiagnosis">Primary Diagnosis (ICD-10) *</Label>
            <Input id="primaryDiagnosis" {...register('primaryDiagnosis')} placeholder="G70.00" />
            {errors.primaryDiagnosis && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.primaryDiagnosis.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Patient Records */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Patient Records</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Clinical notes and relevant medical history
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patientRecords">Clinical Notes *</Label>
          <textarea
            id="patientRecords"
            {...register('patientRecords')}
            className="flex min-h-[120px] w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter relevant clinical information, lab results, symptoms, etc."
          />
          {errors.patientRecords && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.patientRecords.message}</p>
          )}
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={createPatient.isPending}>
          {createPatient.isPending ? 'Creating...' : 'Create Patient'}
        </Button>
      </div>
    </form>
  );
}
