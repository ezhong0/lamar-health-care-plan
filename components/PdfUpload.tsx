/**
 * PDF Upload Component
 *
 * Allows users to upload PDF files and extract text content.
 * Uses PDF.js to parse PDFs client-side for privacy and performance.
 *
 * Design decisions:
 * - Client-side parsing (no server upload needed)
 * - Extracts text from all pages and concatenates
 * - Shows loading state during parsing
 * - Allows user to edit extracted text
 * - Preserves formatting where possible
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfUploadProps {
  onTextExtracted: (text: string) => void;
  accept?: string;
  maxSizeBytes?: number;
}

export function PdfUpload({
  onTextExtracted,
  accept = '.pdf',
  maxSizeBytes = 10 * 1024 * 1024, // 10MB default
}: PdfUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    // Validate file type
    if (!file.type.includes('pdf')) {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      return;
    }

    try {
      setIsProcessing(true);
      const text = await extractTextFromPdf(file);
      onTextExtracted(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const numPages = pdf.numPages;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Concatenate text items from the page
      const pageText = textContent.items
        .map((item: any) => {
          // TextItem has 'str' property, others might not
          return 'str' in item ? item.str : '';
        })
        .join(' ');

      textParts.push(pageText.trim());
    }

    // Join all pages with double newline for separation
    const fullText = textParts.join('\n\n').trim();

    if (!fullText) {
      throw new Error('No text found in PDF. The PDF might be image-based.');
    }

    return fullText;
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload PDF file"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={isProcessing}
          className="relative"
        >
          {isProcessing ? (
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
              Processing PDF...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload PDF
            </>
          )}
        </Button>
        {fileName && !isProcessing && !error && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {fileName}
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing && (
        <p className="text-xs text-neutral-500">
          Extracting text from PDF... This may take a few moments for large files.
        </p>
      )}

      {fileName && !isProcessing && !error && (
        <p className="text-xs text-green-600 dark:text-green-500">
          ✓ PDF text extracted successfully. You can edit it below if needed.
        </p>
      )}
    </div>
  );
}
