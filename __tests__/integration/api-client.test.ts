/**
 * Integration Tests for API Client
 *
 * Tests the actual client-side API calls to ensure they work correctly.
 * These tests should catch issues like JSON parsing errors.
 *
 * NOTE: These tests require the Next.js dev server to be running.
 * Run with: npm run dev (in separate terminal)
 * Or run E2E tests instead: npm run test:e2e
 */

import { listPatients } from '@/lib/client/api';

describe.skip('API Client Integration (requires running server)', () => {
  it('should fetch patients list from real API without JSON parse errors', async () => {
    // This test will fail if the API returns HTML instead of JSON
    const response = await listPatients();

    expect(response).toBeDefined();
    expect(response.success).toBe(true);

    if (response.success && response.data) {
      expect(Array.isArray(response.data.patients)).toBe(true);

      // Verify the shape of patient data
      if (response.data.patients.length > 0) {
        const patient = response.data.patients[0];
        expect(patient).toHaveProperty('id');
        expect(patient).toHaveProperty('firstName');
        expect(patient).toHaveProperty('lastName');
        expect(patient).toHaveProperty('mrn');
      }
    }
  });

  it('should handle the response correctly when there are no patients', async () => {
    // Even with no patients, should return valid JSON
    const response = await listPatients();

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });
});
