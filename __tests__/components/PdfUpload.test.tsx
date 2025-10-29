/**
 * PdfUpload Component Tests
 *
 * Tests PDF upload functionality with edge cases:
 * - File selection and validation
 * - PDF text extraction
 * - Error handling (invalid files, parsing errors)
 * - Loading states
 * - Size limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { PdfUpload } from '@/components/PdfUpload';
import * as pdfjsLib from 'pdfjs-dist';

// Mock PDF.js
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: '3.11.174',
}));

// Mock File.prototype.arrayBuffer() since it's not available in jsdom
if (!File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function() {
    return Promise.resolve(new ArrayBuffer(8));
  };
}

describe('PdfUpload', () => {
  const mockOnTextExtracted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnTextExtracted.mockClear();
  });

  describe('file selection', () => {
    it('renders upload button', () => {
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      expect(screen.getByRole('button', { name: /Upload PDF/i })).toBeInTheDocument();
    });

    it('accepts PDF files via hidden input', () => {
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const fileInput = screen.getByLabelText('Upload PDF file');
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.pdf');
    });

    it('shows file name after selection', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      // Mock successful PDF processing
      const mockPdf = createMockPdf(['Test content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf content'], 'test-patient-record.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test-patient-record.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('file validation', () => {
    it.skip('rejects non-PDF files', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const file = new File(['content'], 'document.txt', { type: 'text/plain' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Please select a PDF file')).toBeInTheDocument();
      });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });

    it('rejects files exceeding size limit', async () => {
      const user = userEvent.setup();
      const maxSize = 5 * 1024 * 1024; // 5MB
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} maxSizeBytes={maxSize} />);

      // Create a file larger than 5MB
      const largeContent = new Array(maxSize + 1).fill('a').join('');
      const file = new File([largeContent], 'large-file.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/File too large/i)).toBeInTheDocument();
        expect(screen.getByText(/Maximum size is 5MB/i)).toBeInTheDocument();
      });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });

    it('accepts files within size limit', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockPdf = createMockPdf(['Valid content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['small pdf'], 'small.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalledWith('Valid content');
      });
    });
  });

  describe('PDF text extraction', () => {
    it('extracts text from single-page PDF', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const expectedText = 'Patient Name: John Doe\nDiagnosis: Myasthenia Gravis\nMedication: IVIG';
      const mockPdf = createMockPdf([expectedText]);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'patient-record.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalledWith(expectedText);
      });
    });

    it('extracts and concatenates text from multi-page PDF', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const page1 = 'Page 1: Patient demographics and history';
      const page2 = 'Page 2: Lab results and medications';
      const page3 = 'Page 3: Treatment plan';
      const mockPdf = createMockPdf([page1, page2, page3]);

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'multi-page.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalledWith(`${page1}\n\n${page2}\n\n${page3}`);
      });
    });

    it.skip('handles empty pages in PDF', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockPdf = createMockPdf(['Page 1 content', '', 'Page 3 content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'with-empty.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalledWith('Page 1 content\n\nPage 3 content');
      });
    });

    it('trims whitespace from extracted text', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockPdf = createMockPdf(['  Text with spaces  ', '\n\nText with newlines\n\n']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'whitespace.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        const call = mockOnTextExtracted.mock.calls[0][0];
        expect(call).not.toMatch(/^\s+/); // No leading whitespace
        expect(call).not.toMatch(/\s+$/); // No trailing whitespace
      });
    });
  });

  describe('error handling', () => {
    it('shows error for image-based PDF with no text', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      // Mock PDF with no text content
      const mockPdf = createMockPdf(['', '', '']); // All empty pages
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'scanned-image.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/No text found in PDF/i)).toBeInTheDocument();
        expect(screen.getByText(/might be image-based/i)).toBeInTheDocument();
      });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });

    it('handles PDF parsing errors', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockError = new Error('Invalid PDF structure');
      const rejectedPromise = Promise.reject(mockError);
      // Add catch handler to prevent unhandled rejection error
      rejectedPromise.catch(() => {});

      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: rejectedPromise,
      } as any);

      const file = new File(['corrupt'], 'corrupt.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Invalid PDF structure|Failed to process PDF/i)).toBeInTheDocument();
      }, { timeout: 3000 });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });

    it('handles file read errors', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      // Mock arrayBuffer to throw error
      const file = new File(['pdf'], 'error.pdf', { type: 'application/pdf' });
      vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('File read failed'));

      const input = screen.getByLabelText('Upload PDF file');
      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/File read failed/i)).toBeInTheDocument();
      });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });

    it.skip('clears previous errors on new file selection', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      // First upload: invalid file type
      const invalidFile = new File(['text'], 'doc.txt', { type: 'text/plain' });
      const input = screen.getByLabelText('Upload PDF file');
      await user.upload(input, invalidFile);

      await waitFor(() => {
        expect(screen.getByText('Please select a PDF file')).toBeInTheDocument();
      });

      // Second upload: valid PDF
      const mockPdf = createMockPdf(['Valid content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const validFile = new File(['pdf'], 'valid.pdf', { type: 'application/pdf' });
      await user.upload(input, validFile);

      await waitFor(() => {
        expect(screen.queryByText('Please select a PDF file')).not.toBeInTheDocument();
        expect(mockOnTextExtracted).toHaveBeenCalledWith('Valid content');
      });
    });
  });

  describe('loading states', () => {
    it('shows processing state while extracting text', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      let resolvePromise: any;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockPdf = createMockPdf(['Content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: mockPromise,
      } as any);

      const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      // Should show processing state
      expect(screen.getByText(/Processing PDF/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();

      // Resolve the promise
      resolvePromise(mockPdf);

      await waitFor(() => {
        expect(screen.queryByText(/Processing PDF/i)).not.toBeInTheDocument();
      });
    });

    it('disables button during processing', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      let resolvePromise: any;
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockPdf = createMockPdf(['Content']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: mockPromise,
      } as any);

      const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      await user.upload(input, file);

      expect(button).toBeDisabled();

      resolvePromise(mockPdf);
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('shows success message after extraction', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockPdf = createMockPdf(['Successfully extracted text']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'success.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/PDF text extracted successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/You can edit it below/i)).toBeInTheDocument();
      });
    });
  });

  describe('edge cases', () => {
    it('handles PDF with special characters', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const textWithSpecialChars = 'Patient José García Dose 50mg/kg €100 cost';
      const mockPdf = createMockPdf([textWithSpecialChars]);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'special-chars.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalled();
        const extracted = mockOnTextExtracted.mock.calls[0][0];
        expect(extracted).toContain('José');
        expect(extracted).toContain('García');
      }, { timeout: 3000 });
    });

    it('handles very large PDF (many pages)', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      // Create 100-page PDF
      const pages = Array.from({ length: 100 }, (_, i) => `Page ${i + 1} content`);
      const mockPdf = createMockPdf(pages);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'large.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockOnTextExtracted).toHaveBeenCalled();
        const extractedText = mockOnTextExtracted.mock.calls[0][0];
        expect(extractedText).toContain('Page 1 content');
        expect(extractedText).toContain('Page 100 content');
      });
    });

    it('handles PDF with only whitespace', async () => {
      const user = userEvent.setup();
      render(<PdfUpload onTextExtracted={mockOnTextExtracted} />);

      const mockPdf = createMockPdf(['   ', '\n\n\n', '\t\t']);
      vi.mocked(pdfjsLib.getDocument).mockReturnValue({
        promise: Promise.resolve(mockPdf),
      } as any);

      const file = new File(['pdf'], 'whitespace-only.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/No text found in PDF/i)).toBeInTheDocument();
      });
      expect(mockOnTextExtracted).not.toHaveBeenCalled();
    });
  });

  describe('custom props', () => {
    it('accepts custom file types', () => {
      render(
        <PdfUpload
          onTextExtracted={mockOnTextExtracted}
          accept=".pdf,.doc,.docx"
        />
      );

      const input = screen.getByLabelText('Upload PDF file');
      expect(input).toHaveAttribute('accept', '.pdf,.doc,.docx');
    });

    it('uses custom size limit', async () => {
      const user = userEvent.setup();
      const customLimit = 1024; // 1KB
      render(
        <PdfUpload
          onTextExtracted={mockOnTextExtracted}
          maxSizeBytes={customLimit}
        />
      );

      const largeFile = new File([new Array(2048).fill('a').join('')], 'large.pdf', {
        type: 'application/pdf'
      });
      const input = screen.getByLabelText('Upload PDF file');

      await user.upload(input, largeFile);

      await waitFor(() => {
        expect(screen.getByText(/File too large/i)).toBeInTheDocument();
      });
    });
  });
});

/**
 * Helper function to create mock PDF objects for testing
 */
function createMockPdf(pageTexts: string[]) {
  return {
    numPages: pageTexts.length,
    getPage: vi.fn((pageNum: number) => {
      const pageIndex = pageNum - 1;
      const text = pageTexts[pageIndex] || '';

      return Promise.resolve({
        getTextContent: vi.fn(() => {
          return Promise.resolve({
            items: text ? text.split(' ').filter(w => w).map((word) => ({ str: word })) : [],
          });
        }),
      });
    }),
  };
}
