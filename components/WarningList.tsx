/**
 * Warning List Component
 *
 * Displays validation warnings with type-safe discriminated union handling.
 * Linear-inspired design with amber colors for non-blocking warnings.
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Warning } from '@/lib/domain/warnings';

interface WarningListProps {
  warnings: Warning[];
  onProceed: () => void;
  onCancel: () => void;
  onLinkToExisting?: (patientId: string) => void; // Optional: Link order to existing patient
}

/**
 * Renders individual warning with type-specific details
 */
function WarningItem({ warning }: { warning: Warning }) {
  // Type-safe exhaustive switch on discriminated union
  switch (warning.type) {
    case 'DUPLICATE_PATIENT':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Duplicate Patient</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{warning.message}</p>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                <span className="font-medium">Existing Patient:</span> {warning.existingPatient.name} (MRN:{' '}
                {warning.existingPatient.mrn})
              </div>
            </div>
          </div>
        </div>
      );

    case 'DUPLICATE_ORDER':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Duplicate Order</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{warning.message}</p>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                <span className="font-medium">Existing Order:</span> {warning.existingOrder.medicationName}
                {' ('}
                {new Date(warning.existingOrder.createdAt).toLocaleDateString()}
                {')'}
              </div>
            </div>
          </div>
        </div>
      );

    case 'PROVIDER_CONFLICT':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Provider Name Mismatch</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{warning.message}</p>
              <div className="mt-2 space-y-1 text-xs text-neutral-500 dark:text-neutral-500">
                <div>
                  <span className="font-medium">NPI:</span> {warning.npi}
                </div>
                <div>
                  <span className="font-medium">Expected:</span> {warning.expectedName}
                </div>
                <div>
                  <span className="font-medium">Provided:</span> {warning.actualName}
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'SIMILAR_PATIENT':
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-600 dark:text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {warning.hasSameMedication ? 'Duplicate Order Detected' : 'Similar Patient Found'}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{warning.message}</p>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                <span className="font-medium">Similar Patient:</span> {warning.similarPatient.name} (MRN:{' '}
                {warning.similarPatient.mrn}) - {Math.round(warning.similarityScore * 100)}% match
              </div>
              {warning.canLinkToExisting && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-md">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <span className="font-medium">Tip:</span> You can add this order to the existing patient instead of creating a new one.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );

    default:
      // Exhaustive check - TypeScript will error if we miss a case
      // Using assertion to ensure exhaustiveness without unused variable warning
      warning satisfies never;
      return null;
  }
}

export function WarningList({ warnings, onProceed, onCancel, onLinkToExisting }: WarningListProps) {
  // Check if any warning allows linking to existing patient
  const linkableWarning = warnings.find(
    (w) => w.type === 'SIMILAR_PATIENT' && w.canLinkToExisting
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Card className="p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Review Warnings</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            We found {warnings.length} potential {warnings.length === 1 ? 'issue' : 'issues'} that require your
            attention. Please review and decide how to proceed.
          </p>
        </div>

        {/* Warnings List */}
        <div className="space-y-4">
          {warnings.map((warning, index) => (
            <Card key={index} className="p-4 bg-amber-50/50 dark:bg-amber-900/5 border-amber-200 dark:border-amber-900/20">
              <WarningItem warning={warning} />
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} size="lg">
            Cancel
          </Button>
          {linkableWarning && linkableWarning.type === 'SIMILAR_PATIENT' && onLinkToExisting && (
            <Button
              variant="default"
              onClick={() => onLinkToExisting(linkableWarning.similarPatient.id)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Add to Existing Patient
            </Button>
          )}
          <Button onClick={onProceed} size="lg">
            Create New Patient
          </Button>
        </div>
      </Card>
    </div>
  );
}
