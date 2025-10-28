/**
 * Patient Card Component
 *
 * Displays patient information in a card format for the patient list page.
 * Linear-inspired design with clean typography and subtle interactions.
 *
 * Features:
 * - Patient name, MRN, medication, diagnosis
 * - Referring provider and care plan status
 * - Delete button (appears on hover)
 * - Smooth animations (Framer Motion)
 * - Confirmation dialog before deletion
 * - Toast notifications for feedback
 * - Click to navigate to patient detail
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { PatientWithRelations } from '@/lib/api/contracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

interface PatientCardProps {
  patient: PatientWithRelations;
  onDelete?: () => void;
}

export function PatientCard({ patient, onDelete }: PatientCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const latestOrder = patient.orders?.[0];
  const carePlanCount = patient.carePlans?.length || 0;
  const orderCount = patient.orders?.length || 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to patient detail
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    const toastId = toast.loading('Deleting patient...');

    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete patient');
      }

      toast.success('Patient deleted successfully', {
        id: toastId,
        description: `${patient.firstName} ${patient.lastName} and all associated data have been removed.`,
      });

      // Invalidate React Query cache to refresh patient list
      await queryClient.invalidateQueries({ queryKey: ['patients'] });

      // Call optional callback (for parent to refresh list)
      onDelete?.();

      // Refresh the page to update the patient list
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete patient', {
        id: toastId,
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link href={`/patients/${patient.id}`}>
          <Card className="p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer relative group">
            <div className="space-y-3">
              {/* Header with Patient Name/MRN and Delete Button */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    MRN: {patient.mrn}
                  </p>
                </div>

                {/* Delete Button - Appears on Hover */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="h-8 w-8 p-0 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-500 dark:hover:bg-red-950/50 transition-colors"
                    aria-label={`Delete ${patient.firstName} ${patient.lastName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
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
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        patientName={`${patient.firstName} ${patient.lastName}`}
        orderCount={orderCount}
        carePlanCount={carePlanCount}
      />
    </>
  );
}
