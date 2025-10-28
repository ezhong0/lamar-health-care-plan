'use client';

/**
 * Toaster Component
 *
 * Elegant toast notifications using Sonner.
 * Provides consistent feedback for all user actions.
 *
 * Features:
 * - Auto-dismiss after 4s
 * - Bottom-right positioning
 * - Dark mode support
 * - Smooth animations
 * - Accessible
 */

import { Toaster as Sonner } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      toastOptions={{
        style: {
          background: theme === 'dark' ? 'oklch(0.205 0 0)' : 'white',
          border: `1px solid ${theme === 'dark' ? 'oklch(0.3 0 0)' : 'oklch(0.922 0 0)'}`,
          color: theme === 'dark' ? 'oklch(0.985 0 0)' : 'oklch(0.145 0 0)',
        },
        className: 'font-sans',
        duration: 4000,
      }}
      richColors
    />
  );
}
