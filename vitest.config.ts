import { defineConfig } from 'vitest/config';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables for tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Run tests sequentially to avoid DOM conflicts
    pool: 'forks',
    // Ensure tests don't run in parallel within same file
    sequence: {
      shuffle: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
