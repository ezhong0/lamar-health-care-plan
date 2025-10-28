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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WarningList } from './WarningList';
import type { Warning } from '@/lib/domain/warnings';
import { ApiError } from '@/lib/client/errors';
import { PATIENT_EXAMPLES, type PatientExample } from '@/lib/examples/patient-examples';

export function PatientForm() {
  const router = useRouter();
  const createPatient = useCreatePatient();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  const [pendingOrderData, setPendingOrderData] = useState<PatientInput | null>(null); // Store order data for linking
  const [selectedExample, setSelectedExample] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false); // Loading state for linking

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PatientInput>({
    resolver: zodResolver(PatientInputSchema) as Resolver<PatientInput>,
  });

  // Check for demo prefill data from localStorage on mount
  useEffect(() => {
    const prefillDataStr = localStorage.getItem('demo-prefill-data');
    if (prefillDataStr) {
      try {
        const prefillData = JSON.parse(prefillDataStr);

        // Prepare form data object to populate both form and draft
        const formData: Partial<PatientInput> = {
          firstName: prefillData.firstName,
          lastName: prefillData.lastName,
          mrn: prefillData.mrn,
          patientRecords: prefillData.patientRecords,
        };

        // Handle optional fields
        if (prefillData.additionalDiagnoses?.length > 0) {
          formData.additionalDiagnoses = prefillData.additionalDiagnoses.join(', ') as any;
        }
        if (prefillData.medicationHistory?.length > 0) {
          formData.medicationHistory = prefillData.medicationHistory.join(', ') as any;
        }

        // For now, just populate with the first order
        // TODO: Support multiple orders in the form
        if (prefillData.orders && prefillData.orders.length > 0) {
          const firstOrder = prefillData.orders[0];
          formData.medicationName = firstOrder.medicationName;
          formData.primaryDiagnosis = firstOrder.primaryDiagnosis;
          formData.referringProvider = firstOrder.providerName;
          formData.referringProviderNPI = firstOrder.providerNpi;
        }

        // Populate form fields
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            setValue(key as keyof PatientInput, value as any);
          }
        });

        // Save to draft immediately so it persists across navigation
        localStorage.setItem('patient-form-draft', JSON.stringify(formData));

        // Clear the demo prefill data now that it's in the draft
        localStorage.removeItem('demo-prefill-data');

        toast.info('Demo data loaded', {
          description: 'Form pre-filled with demo scenario. Review and submit when ready!',
        });
      } catch (error) {
        console.error('Failed to parse demo prefill data:', error);
        localStorage.removeItem('demo-prefill-data');
      }
    } else {
      // Check for saved draft form data
      const draftDataStr = localStorage.getItem('patient-form-draft');
      if (draftDataStr) {
        try {
          const draftData = JSON.parse(draftDataStr);

          // Only restore if there's meaningful data (not just empty strings)
          const hasData = Object.values(draftData).some((val) =>
            val && (typeof val === 'string' ? val.trim() !== '' : true)
          );

          if (hasData) {
            // Restore all fields
            Object.entries(draftData).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                // Type assertion needed because localStorage data is untyped
                setValue(key as keyof PatientInput, value as any);
              }
            });

            toast.info('Draft restored', {
              description: 'Your previous form data has been restored.',
            });
          }
        } catch (error) {
          console.error('Failed to parse draft data:', error);
          localStorage.removeItem('patient-form-draft');
        }
      }
    }
  }, [setValue]);

  // Save form state to localStorage as user types (debounced)
  useEffect(() => {
    const subscription = watch((formData) => {
      // Only save if there's meaningful data
      const hasData = Object.values(formData).some((val) =>
        val && (typeof val === 'string' ? val.trim() !== '' : true)
      );

      if (hasData) {
        localStorage.setItem('patient-form-draft', JSON.stringify(formData));
      }
    });

    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: PatientInput) => {
    try {
      // Step 1: Validate and check for warnings BEFORE creating
      const validateResponse = await fetch('/api/patients/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const validateResult = await validateResponse.json();

      // Handle validation errors (blocking errors like duplicate MRN)
      if (!validateResponse.ok || !validateResult.success) {
        throw new Error(validateResult.error?.message || 'Validation failed');
      }

      // Step 2: Check if there are warnings
      if (validateResult.data.warnings && validateResult.data.warnings.length > 0) {
        // Store the form data so we can create later if user confirms
        setPendingOrderData(data);
        setWarnings(validateResult.data.warnings);
        setShowWarnings(true);
        return; // Stop here - don't create yet
      }

      // Step 3: No warnings - proceed with creation
      await createPatientNow(data);
    } catch (error) {
      toast.error('Validation failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  const createPatientNow = async (data: PatientInput) => {
    // Actually create the patient (warnings already shown or none exist)
    const result = await createPatient.mutateAsync(data);

    if (result.success && result.data) {
      const patientId = result.data.patient.id;

      // Clear the draft since patient was successfully created
      localStorage.removeItem('patient-form-draft');

      // Store patient ID
      setCreatedPatientId(patientId);

      // Navigate to patient detail immediately (no warnings to show)
      router.push(`/patients/${patientId}`);
    }
  };

  const handleConfirmCreate = async () => {
    // User confirmed they want to create despite warnings
    if (!pendingOrderData) {
      toast.error('Form data not found');
      return;
    }

    setShowWarnings(false); // Close warning modal
    await createPatientNow(pendingOrderData); // Actually create the patient
  };

  const handleCancelCreate = () => {
    // User cancelled - don't create anything, return to form
    setShowWarnings(false);
    setWarnings([]);
    setPendingOrderData(null);
  };

  const handleLinkToExisting = async (existingPatientId: string) => {
    // User chose to link order to existing patient instead of creating new patient
    if (!pendingOrderData) {
      toast.error('Order data not found', {
        description: 'Unable to link order. Please try again.',
      });
      return;
    }

    setIsLinking(true);

    try {
      // Call API to add order to existing patient
      const response = await fetch(`/api/patients/${existingPatientId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicationName: pendingOrderData.medicationName,
          primaryDiagnosis: pendingOrderData.primaryDiagnosis,
          referringProvider: pendingOrderData.referringProvider,
          referringProviderNPI: pendingOrderData.referringProviderNPI,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to add order to existing patient');
      }

      // Clear the draft
      localStorage.removeItem('patient-form-draft');

      // Show success message
      toast.success('Order linked to existing patient', {
        description: `${pendingOrderData.medicationName} added to ${result.data.patient.firstName} ${result.data.patient.lastName}`,
      });

      // Navigate to the existing patient
      router.push(`/patients/${existingPatientId}`);
    } catch (error) {
      toast.error('Failed to link order', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLinking(false);
    }
  };

  /**
   * Load a curated example patient
   */
  const loadCuratedExample = (exampleId: string) => {
    const example = PATIENT_EXAMPLES.find((ex) => ex.id === exampleId);
    if (!example) return;

    // Clear any previous AI generation errors
    setAiGenerationError(null);

    // Load all form fields
    setValue('firstName', example.data.firstName);
    setValue('lastName', example.data.lastName);
    setValue('mrn', example.data.mrn);
    setValue('referringProvider', example.data.referringProvider);
    setValue('referringProviderNPI', example.data.referringProviderNPI);
    setValue('primaryDiagnosis', example.data.primaryDiagnosis);
    setValue('medicationName', example.data.medicationName);
    setValue('patientRecords', example.data.patientRecords);

    // Load optional fields
    if (example.data.additionalDiagnoses && example.data.additionalDiagnoses.length > 0) {
      setValue('additionalDiagnoses', example.data.additionalDiagnoses);
    }
    if (example.data.medicationHistory && example.data.medicationHistory.length > 0) {
      setValue('medicationHistory', example.data.medicationHistory);
    }
  };

  /**
   * Generate a new patient example using AI
   */
  const generateAIExample = async () => {
    setIsGeneratingAI(true);
    setAiGenerationError(null);

    try {
      const response = await fetch('/api/examples/generate', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Load the generated data into the form
        const data = result.data as PatientInput;
        setValue('firstName', data.firstName);
        setValue('lastName', data.lastName);
        setValue('mrn', data.mrn);
        setValue('referringProvider', data.referringProvider);
        setValue('referringProviderNPI', data.referringProviderNPI);
        setValue('primaryDiagnosis', data.primaryDiagnosis);
        setValue('medicationName', data.medicationName);
        setValue('patientRecords', data.patientRecords);

        // Load optional fields
        if (data.additionalDiagnoses && data.additionalDiagnoses.length > 0) {
          setValue('additionalDiagnoses', data.additionalDiagnoses);
        }
        if (data.medicationHistory && data.medicationHistory.length > 0) {
          setValue('medicationHistory', data.medicationHistory);
        }

        // Clear the selector since this is an AI-generated example
        setSelectedExample('');
      } else {
        setAiGenerationError(result.error || 'Failed to generate AI example');
      }
    } catch (error) {
      setAiGenerationError(
        error instanceof Error ? error.message : 'Failed to generate AI example'
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Use conditional rendering instead of early return to maintain React hydration
  // Early returns cause component unmounting/mounting which breaks event handlers in Next.js
  return (
    <>
      {showWarnings && warnings.length > 0 ? (
        <div className="relative">
          {isLinking && (
            <div className="absolute inset-0 bg-white/80 dark:bg-neutral-950/80 z-50 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white mx-auto"></div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Linking order to existing patient...</p>
              </div>
            </div>
          )}
          <WarningList
            warnings={warnings}
            onProceed={handleConfirmCreate}
            onCancel={handleCancelCreate}
            onLinkToExisting={handleLinkToExisting}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Error Alert */}
      {createPatient.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {createPatient.error instanceof ApiError
              ? createPatient.error.message
              : createPatient.error instanceof Error
                ? createPatient.error.message
                : 'Failed to create patient. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Example Data Selector - Sophisticated Multi-Example System */}
      <Card className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900/50 dark:to-neutral-900/30 border-dashed">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
              Try with Example Data
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Load curated patient scenarios or generate a new example with AI to explore the application.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Curated Examples Selector */}
            <div className="flex-1">
              <select
                value={selectedExample}
                onChange={(e) => {
                  setSelectedExample(e.target.value);
                  if (e.target.value) {
                    loadCuratedExample(e.target.value);
                  }
                }}
                className="w-full h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
              >
                <option value="">Select a curated example...</option>
                {PATIENT_EXAMPLES.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.name} • {example.complexity} • {example.description}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Generation Button */}
            <Button
              type="button"
              variant="outline"
              onClick={generateAIExample}
              disabled={isGeneratingAI}
              className="shrink-0 min-w-[160px] font-medium"
            >
              {isGeneratingAI ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          {/* AI Generation Error */}
          {aiGenerationError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription className="text-sm">{aiGenerationError}</AlertDescription>
            </Alert>
          )}

          {/* Example Legend */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Simple</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>Complex</span>
            </div>
          </div>
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
            {errors.mrn ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.mrn.message}</p>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">6 digits only (e.g., 123456)</p>
            )}
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
      )}
    </>
  );
}
