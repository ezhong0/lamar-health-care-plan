import { defineConfig } from 'vitest/config';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables for tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./config/vitest.setup.ts'],
    // Run tests sequentially to avoid database conflicts
    pool: 'forks',
    // @ts-expect-error - poolOptions is valid in Vitest 4.x but types may not be updated
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in single fork for database isolation
      },
    },
    // Run test files sequentially, not in parallel
    fileParallelism: false,
    // Ensure tests don't run in parallel within same file
    sequence: {
      shuffle: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../'),
    },
  },
});
