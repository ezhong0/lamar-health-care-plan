/**
 * WarningList Component Tests
 *
 * Tests the warning display component with different warning types
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { WarningList } from '@/components/WarningList';
import type { Warning } from '@/lib/domain/warnings';
import { toPatientId, toOrderId } from '@/lib/domain/types';

describe('WarningList', () => {
  it('displays header with warning count', () => {
    const warnings: Warning[] = [
      {
        type: 'SIMILAR_PATIENT',
        severity: 'medium',
        message: 'A similar patient exists in the system',
        similarPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'John Doe',
        },
        similarityScore: 0.85,
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Review Warnings')).toBeInTheDocument();
    expect(screen.getByText(/We found 1 potential issue/)).toBeInTheDocument();
  });

  it('displays multiple warnings correctly', () => {
    const warnings: Warning[] = [
      {
        type: 'SIMILAR_PATIENT',
        severity: 'medium',
        message: 'Similar patient found',
        similarPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'John Doe',
        },
        similarityScore: 0.85,
      },
      {
        type: 'DUPLICATE_ORDER',
        severity: 'high',
        message: 'Duplicate order detected',
        existingOrder: {
          id: toOrderId('order-1'),
          medicationName: 'IVIG',
          createdAt: new Date('2024-01-01'),
        },
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/We found 2 potential issues/)).toBeInTheDocument();
    expect(screen.getByText('Similar patient found')).toBeInTheDocument();
    expect(screen.getByText('Duplicate order detected')).toBeInTheDocument();
  });

  it('displays duplicate patient warning with details', () => {
    const warnings: Warning[] = [
      {
        type: 'DUPLICATE_PATIENT',
        severity: 'high',
        message: 'This patient already exists',
        existingPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'Jane Smith',
        },
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Duplicate Patient')).toBeInTheDocument();
    expect(screen.getByText('This patient already exists')).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/MRN: 123456/)).toBeInTheDocument();
  });

  it('displays provider conflict warning with all details', () => {
    const warnings: Warning[] = [
      {
        type: 'PROVIDER_CONFLICT',
        severity: 'high',
        message: 'Provider name does not match NPI',
        npi: '1234567890',
        expectedName: 'Dr. Smith',
        actualName: 'Dr. Jones',
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Provider Name Mismatch')).toBeInTheDocument();
    expect(screen.getByText('Provider name does not match NPI')).toBeInTheDocument();
    expect(screen.getByText(/NPI:/)).toBeInTheDocument();
    expect(screen.getByText(/1234567890/)).toBeInTheDocument();
    expect(screen.getByText(/Expected:/)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Provided:/)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Jones/)).toBeInTheDocument();
  });

  it('calls onProceed when Proceed button is clicked', async () => {
    const onProceed = vi.fn();
    const warnings: Warning[] = [
      {
        type: 'SIMILAR_PATIENT',
        severity: 'medium',
        message: 'Similar patient found',
        similarPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'John Doe',
        },
        similarityScore: 0.85,
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={onProceed}
        onCancel={() => {}}
      />
    );

    const proceedButton = screen.getByRole('button', { name: /Proceed Anyway/i });
    await userEvent.click(proceedButton);

    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const warnings: Warning[] = [
      {
        type: 'SIMILAR_PATIENT',
        severity: 'medium',
        message: 'Similar patient found',
        similarPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'John Doe',
        },
        similarityScore: 0.85,
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await userEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('displays similarity score as percentage', () => {
    const warnings: Warning[] = [
      {
        type: 'SIMILAR_PATIENT',
        severity: 'medium',
        message: 'Similar patient found',
        similarPatient: {
          id: toPatientId('patient-1'),
          mrn: '123456',
          name: 'John Doe',
        },
        similarityScore: 0.856,
      },
    ];

    render(
      <WarningList
        warnings={warnings}
        onProceed={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/86% match/)).toBeInTheDocument();
  });
});
