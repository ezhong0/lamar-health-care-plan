/**
 * PatientForm Component Tests
 *
 * Tests comprehensive patient intake form with validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PatientForm } from '@/components/PatientForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/client/errors';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock the API hooks
vi.mock('@/lib/client/hooks', () => ({
  useCreatePatient: vi.fn(),
}));

// Import after mocking
import { useCreatePatient } from '@/lib/client/hooks';

// Helper to create mock mutation result with proper types
type MockMutationResult = ReturnType<typeof useCreatePatient>;
const createMockMutation = (overrides: Partial<MockMutationResult> = {}): MockMutationResult => ({
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
  data: undefined,
  isSuccess: false,
  reset: vi.fn(),
  mutate: vi.fn(),
  failureCount: 0,
  failureReason: null,
  isIdle: false,
  isPaused: false,
  status: 'idle',
  variables: undefined,
  submittedAt: 0,
  context: undefined,
  ...overrides,
});

describe('PatientForm', () => {
  let queryClient: QueryClient;
  const mockPush = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);

    vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
      mutateAsync: mockMutateAsync,
    }));
  });

  const renderForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <PatientForm />
      </QueryClientProvider>
    );
  };

  describe('form rendering', () => {
    it('renders all required form sections', () => {
      renderForm();

      expect(screen.getByText('Patient Information')).toBeInTheDocument();
      expect(screen.getByText('Provider Information')).toBeInTheDocument();
      expect(screen.getByText('Medication & Diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Patient Records')).toBeInTheDocument();
    });

    it('renders all input fields', () => {
      renderForm();

      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medical Record Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Referring Provider Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Provider NPI/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Medication Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Primary Diagnosis/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Clinical Notes/)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      renderForm();

      expect(screen.getByRole('button', { name: /Create Patient/i })).toBeInTheDocument();
    });

    it('has correct placeholders', () => {
      renderForm();

      expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1234567893')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('IVIG')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('G70.00')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows validation error for empty first name', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /Create Patient/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for empty last name', async () => {
      const user = userEvent.setup();
      renderForm();

      const submitButton = screen.getByRole('button', { name: /Create Patient/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
      });
    });

    it('validates MRN is exactly 6 digits', async () => {
      const user = userEvent.setup();
      renderForm();

      const mrnInput = screen.getByLabelText(/Medical Record Number/);
      await user.type(mrnInput, '12345'); // Only 5 digits

      const submitButton = screen.getByRole('button', { name: /Create Patient/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/MRN must be exactly 6 digits/i)).toBeInTheDocument();
      });
    });

    it('accepts valid 6-digit MRN', async () => {
      const user = userEvent.setup();
      renderForm();

      const mrnInput = screen.getByLabelText(/Medical Record Number/);
      await user.type(mrnInput, '123456');

      // Fill other required fields
      await user.type(screen.getByLabelText(/First Name/), 'John');
      await user.type(screen.getByLabelText(/Last Name/), 'Doe');

      const submitButton = screen.getByRole('button', { name: /Create Patient/i });
      await user.click(submitButton);

      // Should not show MRN validation error
      await waitFor(
        () => {
          expect(screen.queryByText(/MRN must be exactly 6 digits/i)).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('validates NPI is exactly 10 digits', async () => {
      const user = userEvent.setup();
      renderForm();

      const npiInput = screen.getByLabelText(/Provider NPI/);
      await user.type(npiInput, '123456789'); // Only 9 digits

      const submitButton = screen.getByRole('button', { name: /Create Patient/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/NPI must be exactly 10 digits/i)).toBeInTheDocument();
      });
    });

    it('accepts valid ICD-10 code', async () => {
      const user = userEvent.setup();
      renderForm();

      const diagnosisInput = screen.getByLabelText(/Primary Diagnosis/);
      await user.type(diagnosisInput, 'G70.00');

      // Valid ICD-10 code should not show error
      expect(screen.queryByText(/Invalid ICD-10/i)).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {

    it('navigates to patient detail on successful submission without warnings', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValue({
        success: true,
        data: {
          patient: { id: 'patient-123' },
          order: { id: 'order-456' },
          warnings: [],
        },
      });

      renderForm();

      // Fill in valid data
      await user.type(screen.getByLabelText(/First Name/), 'John');
      await user.type(screen.getByLabelText(/Last Name/), 'Doe');
      await user.type(screen.getByLabelText(/Medical Record Number/), '123456');
      await user.type(screen.getByLabelText(/Referring Provider Name/), 'Dr. Smith');
      await user.type(screen.getByLabelText(/Provider NPI/), '1234567893');
      await user.type(screen.getByLabelText(/Medication Name/), 'IVIG');
      await user.type(screen.getByLabelText(/Primary Diagnosis/), 'G70.00');
      await user.type(screen.getByLabelText(/Clinical Notes/), 'Test records');

      await user.click(screen.getByRole('button', { name: /Create Patient/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/patients/patient-123');
      });
    });


    it('disables submit button while pending', () => {
      vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
        mutateAsync: mockMutateAsync,
        isPending: true,
      }));

      renderForm();

      const submitButton = screen.getByRole('button', { name: /Creating.../i });
      expect(submitButton).toBeDisabled();
    });

    it('shows "Creating..." text while pending', () => {
      vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
        mutateAsync: mockMutateAsync,
        isPending: true,
      }));

      renderForm();

      expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays API error message', () => {
      const mockError = new ApiError(
        'Patient with MRN 123456 already exists',
        'DUPLICATE_PATIENT'
      );

      vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
        mutateAsync: mockMutateAsync,
        isError: true,
        error: mockError,
      }));

      renderForm();

      expect(
        screen.getByText(/Patient with MRN .* already exists/)
      ).toBeInTheDocument();
    });

    it('displays generic error for non-API errors', () => {
      const mockError = new Error('Network error');

      vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
        mutateAsync: mockMutateAsync,
        isError: true,
        error: mockError,
      }));

      renderForm();

      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('displays fallback error message for unknown errors', () => {
      vi.mocked(useCreatePatient).mockReturnValue(createMockMutation({
        mutateAsync: mockMutateAsync,
        isError: true,
        error: 'Unknown error' as unknown as Error,
      }));

      renderForm();

      expect(screen.getByText(/Failed to create patient. Please try again./)).toBeInTheDocument();
    });
  });

  describe('input constraints', () => {
    it('MRN input has maxLength of 6', () => {
      renderForm();

      const mrnInput = screen.getByLabelText(/Medical Record Number/) as HTMLInputElement;
      expect(mrnInput.maxLength).toBe(6);
    });

    it('MRN input has numeric inputMode', () => {
      renderForm();

      const mrnInput = screen.getByLabelText(/Medical Record Number/) as HTMLInputElement;
      expect(mrnInput.inputMode).toBe('numeric');
    });

    it('NPI input has maxLength of 10', () => {
      renderForm();

      const npiInput = screen.getByLabelText(/Provider NPI/) as HTMLInputElement;
      expect(npiInput.maxLength).toBe(10);
    });
  });
});
