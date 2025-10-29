/**
 * Test Utilities
 *
 * Reusable test utilities for component testing with all required providers.
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a fresh QueryClient for each test with optimized settings
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,  // Don't retry failed queries in tests
        gcTime: 0,     // Disable cache to avoid test pollution
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Renders component with all required providers (React Query, etc.)
 *
 * @example
 * ```typescript
 * import { renderWithProviders, screen } from '__tests__/utils/test-utils';
 *
 * renderWithProviders(<MyComponent />);
 * expect(screen.getByText('Hello')).toBeInTheDocument();
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
}

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react';
export { renderWithProviders as render };
