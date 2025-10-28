/**
 * Client-side Providers
 *
 * Wraps the application with necessary providers (React Query, MSW in dev)
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Note: In client components, we can't import server-side env module directly
// Instead, we check the public env var which is embedded at build time
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: false, // Disable retries - fail fast for better UX and test performance
          },
        },
      })
  );

  // Initialize MSW when explicitly enabled via environment variable
  // Set NEXT_PUBLIC_USE_MOCKS=true for frontend-only development with mocked APIs
  // Set NEXT_PUBLIC_USE_MOCKS=false (or omit) to use real backend APIs
  useEffect(() => {
    if (useMocks) {
      const initMSW = async () => {
        const { worker } = await import('@/mocks/browser');
        await worker.start({
          onUnhandledRequest: 'bypass',
        });
        console.log('🎭 MSW mocking enabled');
      };

      initMSW();
    }
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
