'use client';

/**
 * Delete Confirmation Dialog
 *
 * Elegant, accessible confirmation dialog for patient deletion.
 * Shows what will be deleted and requires explicit confirmation.
 *
 * Features:
 * - Clear visual hierarchy
 * - Shows impact (orders, care plans to be deleted)
 * - Destructive action styling
 * - Smooth animations
 * - Accessible keyboard navigation
 */

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  patientName: string;
  orderCount?: number;
  carePlanCount?: number;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  patientName,
  orderCount = 0,
  carePlanCount = 0,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalItems = 1 + orderCount + carePlanCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/50">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle className="text-left">Delete Patient?</DialogTitle>
          </div>
          <DialogDescription className="text-left text-base">
            This will permanently delete{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {patientName}
            </span>{' '}
            and all associated data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Impact Summary */}
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4 space-y-3">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            The following will be permanently deleted:
          </p>
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  1
                </span>{' '}
                patient record
              </span>
            </li>
            {orderCount > 0 && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {orderCount}
                  </span>{' '}
                  medication {orderCount === 1 ? 'order' : 'orders'}
                </span>
              </li>
            )}
            {carePlanCount > 0 && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {carePlanCount}
                  </span>{' '}
                  care {carePlanCount === 1 ? 'plan' : 'plans'}
                </span>
              </li>
            )}
          </ul>
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              Total: {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Patient
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
