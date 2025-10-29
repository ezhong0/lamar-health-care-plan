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
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { WarningList } from './WarningList';
import type { Warning } from '@/lib/domain/warnings';
import { ApiError } from '@/lib/client/errors';
import { PATIENT_EXAMPLES, type PatientExample } from '@/lib/examples/patient-examples';
import { logger } from '@/lib/infrastructure/logger';
import { PdfUpload } from './PdfUpload';

// Type guard helpers for runtime validation
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const PATIENT_INPUT_KEYS = [
  'firstName', 'lastName', 'dateOfBirth', 'mrn', 'gender',
  'address', 'phoneNumber', 'email', 'emergencyContact',
  'insuranceProvider', 'policyNumber', 'groupNumber',
  'primaryDiagnosis', 'additionalDiagnoses', 'allergies',
  'medicationHistory', 'orderingProviderId', 'medicationName',
  'referringProvider', 'referringProviderNPI', 'patientRecords'
] as const;

function isValidPatientInputKey(key: string): key is keyof PatientInput {
  return PATIENT_INPUT_KEYS.includes(key as any);
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Watch patientRecords for auto-expanding textarea
  const patientRecordsValue = watch('patientRecords');

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

        // Handle optional fields with type validation
        if (isStringArray(prefillData.additionalDiagnoses)) {
          formData.additionalDiagnoses = prefillData.additionalDiagnoses;
        }
        if (isStringArray(prefillData.medicationHistory)) {
          formData.medicationHistory = prefillData.medicationHistory;
        }

        // Populate with the first order
        if (prefillData.orders && prefillData.orders.length > 0) {
          const firstOrder = prefillData.orders[0];
          formData.medicationName = firstOrder.medicationName;
          formData.primaryDiagnosis = firstOrder.primaryDiagnosis;
          formData.referringProvider = firstOrder.providerName;
          formData.referringProviderNPI = firstOrder.providerNpi;
        }

        // Populate form fields with type validation
        Object.entries(formData).forEach(([key, value]) => {
          if (value !== undefined && value !== null && isValidPatientInputKey(key)) {
            setValue(key, value as PatientInput[typeof key]);
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
        logger.error('Failed to parse demo prefill data', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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
            // Restore all fields with type validation
            Object.entries(draftData).forEach(([key, value]) => {
              if (value !== undefined && value !== null && isValidPatientInputKey(key)) {
                setValue(key, value as PatientInput[typeof key]);
              }
            });

            toast.info('Draft restored', {
              description: 'Your previous form data has been restored.',
            });
          }
        } catch (error) {
          logger.error('Failed to parse draft data', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
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

  // Auto-resize textarea when content changes
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [patientRecordsValue]);

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

      // Check if response has content before parsing JSON
      let validateResult;
      try {
        const text = await validateResponse.text();
        if (!text || text.trim() === '') {
          throw new Error('Empty response from validation endpoint. The server may be unavailable.');
        }

        try {
          validateResult = JSON.parse(text);
        } catch (jsonError) {
          logger.error('Failed to parse validation JSON', {
            error: jsonError instanceof Error ? jsonError.message : 'Unknown error',
            status: validateResponse.status,
            responsePreview: text.substring(0, 100),
          });
          throw new Error('Invalid server response. Please check that all services are running.');
        }
      } catch (parseError) {
        logger.error('Failed to read validation response', {
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          status: validateResponse.status,
        });

        // Provide helpful error message based on status
        if (validateResponse.status === 503) {
          throw new Error('Database is unavailable. Please ensure PostgreSQL is running.');
        } else if (validateResponse.status >= 500) {
          throw new Error('Server error. Please try again or contact support.');
        } else {
          throw new Error(parseError instanceof Error ? parseError.message : 'Validation failed');
        }
      }

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
    // Pass skipWarnings flag to tell API we've already validated
    const dataWithFlag: PatientInput & { skipWarnings: boolean } = {
      ...data,
      skipWarnings: true,
    };
    const result = await createPatient.mutateAsync(dataWithFlag);

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
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6 py-8 px-4">
      {/* Error Alert */}
      {createPatient.isError && (
        <Alert variant="destructive" className="rounded-xl border-red-200 dark:border-red-900/50">
          <AlertDescription>
            {createPatient.error instanceof ApiError
              ? createPatient.error.message
              : createPatient.error instanceof Error
                ? createPatient.error.message
                : 'Failed to create patient. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Example Data Generator */}
      <Card className="p-6 bg-gradient-to-br from-violet-50/50 to-blue-50/50 dark:from-violet-950/10 dark:to-blue-950/10 border-dashed border-violet-200 dark:border-violet-900/30">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
              Try with Example Data
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Generate a realistic patient scenario with AI to explore the application.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={generateAIExample}
              disabled={isGeneratingAI}
              className="min-w-[200px] h-10 font-medium"
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
        </div>
      </Card>

      {/* Patient Information */}
      <Card className="p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">Patient Information</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
      <Card className="p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">Provider Information</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
      <Card className="p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">Medication & Diagnosis</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
      <Card className="p-8 space-y-6">
        <div className="space-y-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">Patient Records</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Clinical notes and relevant medical history
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="patientRecords">Clinical Notes *</Label>
            <PdfUpload
              onTextExtracted={(text) => {
                setValue('patientRecords', text, { shouldValidate: true });
                // Trigger resize
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
                toast.success('PDF processed', {
                  description: 'Text extracted and added to clinical notes. You can edit it if needed.',
                });
              }}
            />
          </div>
          <textarea
            id="patientRecords"
            {...(() => {
              const { ref, ...rest } = register('patientRecords', {
                onChange: () => {
                  // Trigger resize on input
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                  }
                },
              });
              return {
                ...rest,
                ref: (e: HTMLTextAreaElement | null) => {
                  // Call both refs
                  ref(e);
                  textareaRef.current = e;
                },
              };
            })()}
            className="flex min-h-[120px] w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden"
            placeholder="Enter relevant clinical information, lab results, symptoms, etc."
          />
          {errors.patientRecords && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.patientRecords.message}</p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tip: Upload a PDF to auto-populate this field, or type/paste text directly.
          </p>
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={createPatient.isPending}
          className="min-w-[180px] shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {createPatient.isPending ? 'Creating...' : 'Create Patient'}
        </Button>
      </div>
        </form>
      )}
    </>
  );
}
