/**
 * PatientCard Component Tests
 *
 * Tests patient card display and navigation.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PatientCard } from '@/components/PatientCard';
import type { PatientWithRelations } from '@/lib/api/contracts';

describe('PatientCard', () => {
  const mockPatient: PatientWithRelations = {
    id: 'patient-1',
    firstName: 'John',
    lastName: 'Doe',
    mrn: '123456',
    additionalDiagnoses: [],
    medicationHistory: [],
    patientRecords: 'Test records',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    orders: [
      {
        id: 'order-1',
        patientId: 'patient-1',
        providerId: 'provider-1',
        medicationName: 'IVIG',
        primaryDiagnosis: 'J45.50',
        status: 'pending',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        provider: {
          id: 'provider-1',
          name: 'Dr. Smith',
          npi: '1234567893',
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-15T10:30:00Z'),
        },
      },
    ],
    carePlans: [],
  };

  describe('basic rendering', () => {
    it('renders patient name', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders patient MRN', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText(/MRN: 123456/)).toBeInTheDocument();
    });

    it('renders medication name', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText('IVIG')).toBeInTheDocument();
    });

    it('renders primary diagnosis', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText('J45.50')).toBeInTheDocument();
    });

    it('renders provider name', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText(/Provider: Dr\. Smith/)).toBeInTheDocument();
    });
  });

  describe('care plan status', () => {
    it('shows no care plans when none exist', () => {
      render(<PatientCard patient={mockPatient} />);

      expect(screen.getByText('No care plans yet')).toBeInTheDocument();
    });

    it('shows care plan count when plans exist', () => {
      const patientWithCarePlans: PatientWithRelations = {
        ...mockPatient,
        carePlans: [
          {
            id: 'plan-1',
            patientId: 'patient-1',
            content: 'Care plan content',
            generatedBy: 'Claude AI',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'plan-2',
            patientId: 'patient-1',
            content: 'Another plan',
            generatedBy: 'Claude AI',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      render(<PatientCard patient={patientWithCarePlans} />);

      expect(screen.getByText('2 care plans')).toBeInTheDocument();
    });
  });

  describe('without orders', () => {
    it('renders patient info when no orders exist', () => {
      const patientWithoutOrders: PatientWithRelations = {
        ...mockPatient,
        orders: [],
      };

      render(<PatientCard patient={patientWithoutOrders} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/MRN: 123456/)).toBeInTheDocument();
    });

    it('does not show medication when no orders', () => {
      const patientWithoutOrders: PatientWithRelations = {
        ...mockPatient,
        orders: [],
      };

      render(<PatientCard patient={patientWithoutOrders} />);

      expect(screen.queryByText('Medication:')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('renders as a link to patient detail page', () => {
      render(<PatientCard patient={mockPatient} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/patients/patient-1');
    });
  });

  describe('edge cases', () => {
    it('handles long names gracefully', () => {
      const patientWithLongName: PatientWithRelations = {
        ...mockPatient,
        firstName: 'Christopher',
        lastName: 'Montgomery-Worthington-Smith',
      };

      render(<PatientCard patient={patientWithLongName} />);

      expect(screen.getByText(/Christopher Montgomery-Worthington-Smith/)).toBeInTheDocument();
    });

    it('handles special characters in names', () => {
      const patientWithSpecialChars: PatientWithRelations = {
        ...mockPatient,
        firstName: "O'Brien",
        lastName: 'Smith-Jones',
      };

      render(<PatientCard patient={patientWithSpecialChars} />);

      expect(screen.getByText(/O'Brien Smith-Jones/)).toBeInTheDocument();
    });

    it('handles long medication names', () => {
      const patientWithLongMed: PatientWithRelations = {
        ...mockPatient,
        orders: [
          {
            ...mockPatient.orders![0],
            medicationName: 'Intravenous Immunoglobulin (IVIG) - Privigen Brand',
          },
        ],
      };

      render(<PatientCard patient={patientWithLongMed} />);

      expect(screen.getByText(/Intravenous Immunoglobulin/)).toBeInTheDocument();
    });

    it('handles multiple orders correctly', () => {
      const patientWithMultipleOrders: PatientWithRelations = {
        ...mockPatient,
        orders: [
          {
            ...mockPatient.orders![0],
            medicationName: 'IVIG',
            createdAt: new Date('2024-01-20'),
          },
          {
            ...mockPatient.orders![0],
            id: 'order-2',
            medicationName: 'Prednisone',
            createdAt: new Date('2024-01-15'),
          },
        ],
      };

      render(<PatientCard patient={patientWithMultipleOrders} />);

      // Should show the latest order (IVIG)
      expect(screen.getByText('IVIG')).toBeInTheDocument();
    });
  });
});
