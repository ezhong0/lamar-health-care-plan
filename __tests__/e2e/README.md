# E2E Test Suite

Comprehensive end-to-end tests for the Lamar Health patient management system.

## Overview

The E2E test suite covers all critical user flows including:

- ✅ **Patient Creation** - Happy path and edge cases
- ✅ **Form Validation** - Client and server-side validation
- ✅ **Duplicate Detection** - MRN conflicts, similar names, provider conflicts
- ✅ **Care Plan Generation** - AI-powered care plan creation (with mocks)
- ✅ **Export Functionality** - CSV export for pharmaceutical reporting
- ✅ **Error Scenarios** - Network failures, XSS prevention, edge cases

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test __tests__/e2e/01-patient-creation.e2e.ts

# Run tests matching a pattern
npx playwright test --grep "duplicate"
```

## Test Structure

```
__tests__/e2e/
├── 01-patient-creation.e2e.ts    # Happy path patient creation
├── 02-form-validation.e2e.ts     # Form validation rules
├── 03-duplicate-detection.e2e.ts # Duplicate patient/order detection
├── 04-care-plan-generation.e2e.ts # AI care plan generation
├── 05-export.e2e.ts              # Data export functionality
├── 06-error-scenarios.e2e.ts     # Error handling and edge cases
├── helpers/
│   └── test-data.ts              # Test data factories and utilities
├── fixtures/
│   └── api-mocks.ts              # API mocking for external services
├── global-setup.ts               # Runs before all tests
└── global-teardown.ts            # Runs after all tests
```

## Key Features

### 🎯 Test Data Management

**Unique Test Data Generation**
- Uses timestamp-based MRNs to avoid collisions between test runs
- Factory functions for creating consistent test patients
- Pre-defined test patients for common scenarios

```typescript
import { createTestPatient, fillPatientForm } from './helpers/test-data';

// Generate unique patient
const patient = createTestPatient({
  firstName: 'John',
  lastName: 'Doe',
});

// Fill form with patient data
await fillPatientForm(page, patient);
```

### 🧹 Automatic Cleanup

**Database Cleanup**
- Automatic cleanup before and after test runs
- Prevents test pollution and ensures repeatability
- Only affects test data (MRN > 100000 or test prefixes)

**Cleanup API Endpoint**: `/api/test/cleanup`
- `DELETE` - Removes recent test patients
- `POST` - Full database reset (test mode only)

### 🎭 API Mocking

**External Service Mocks**
- Care plan generation (avoids AI API costs)
- Export functionality (predictable test data)
- Error scenarios (simulated failures)

```typescript
import { mockCarePlanAPI } from './fixtures/api-mocks';

// Mock AI API to avoid costs
await mockCarePlanAPI(page);
```

### 🔒 Security Testing

**XSS Prevention**
- Tests XSS injection attempts in all form fields
- Verifies sanitization of user input
- Ensures scripts are never executed

**Validation Testing**
- NPI checksum validation (Luhn algorithm)
- ICD-10 code format validation
- MRN uniqueness enforcement

## Configuration

### Playwright Config

Located in `/config/playwright.config.ts`:

```typescript
{
  workers: 1,                    // Single worker for DB safety
  fullyParallel: false,          // Sequential execution
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15000,        // Extra time for AI/DB operations
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  }
}
```

### Environment Variables

```bash
# Disable cleanup before tests (for debugging)
CLEANUP_BEFORE_TESTS=false npm run test:e2e

# Disable cleanup after tests (inspect DB state)
CLEANUP_AFTER_TESTS=false npm run test:e2e

# Enable debug logging
DEBUG_E2E=true npm run test:e2e
```

## Writing New Tests

### 1. Use Test Helpers

```typescript
import { createTestPatient, fillPatientForm, createPatientViaUI } from './helpers/test-data';

test('my new test', async ({ page }) => {
  // Create unique test patient
  const patient = createTestPatient({ mrn: '600001' });

  // Fill form
  await page.goto('/patients/new');
  await fillPatientForm(page, patient);

  // Or create patient directly
  const patientId = await createPatientViaUI(page, patient);
});
```

### 2. Mock External APIs

```typescript
import { setupCommonMocks, mockCarePlanAPI } from './fixtures/api-mocks';

test.beforeEach(async ({ page }) => {
  // Mock all common APIs (care plan, etc.)
  await setupCommonMocks(page);
});
```

### 3. Use Semantic Selectors

```typescript
// ✅ Good - uses accessible labels/roles
await page.getByLabel('First Name').fill('John');
await page.getByRole('button', { name: 'Create Patient' }).click();

// ❌ Bad - brittle CSS selectors
await page.locator('#first-name').fill('John');
await page.locator('.submit-btn').click();
```

## Test Data Factories

### createTestPatient()

Generates a unique patient with timestamp-based MRN:

```typescript
const patient = createTestPatient({
  firstName: 'John',      // Override defaults
  mrn: '600001',          // Specific MRN
  // ... other fields
});
```

### Predefined Test Patients

```typescript
import { TEST_PATIENTS } from './helpers/test-data';

// Patient for care plan generation
const patient = TEST_PATIENTS.carePlan;

// Patient for duplicate detection
const patient = TEST_PATIENTS.duplicateTest;
```

### Valid Test Data

```typescript
import { VALID_NPIS, VALID_ICD10_CODES, INVALID_NPIS } from './helpers/test-data';

// Valid NPI with correct Luhn checksum
const npi = VALID_NPIS.npi1; // '1234567893'

// Invalid NPI for validation tests
const badNpi = INVALID_NPIS.invalidChecksum; // '1234567890'
```

## Debugging Tests

### Visual Debugging

```bash
# Open Playwright Inspector
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# Pause on failure
npx playwright test --debug
```

### Trace Viewer

After a test run with failures:

```bash
# View trace
npx playwright show-trace test-results/.../trace.zip
```

### Screenshots & Videos

Failed tests automatically capture:
- Screenshots at point of failure
- Video recording of entire test
- Trace with full DOM snapshots

Located in: `test-results/`

## Troubleshooting

### Tests failing due to duplicate MRN

**Cause**: Database not cleaned between runs

**Fix**:
```bash
# Manually clean test data
curl -X DELETE http://localhost:3000/api/test/cleanup

# Or check cleanup is enabled
CLEANUP_BEFORE_TESTS=true npm run test:e2e
```

### Dev server not starting

**Cause**: Port 3000 already in use

**Fix**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run test:e2e
```

### Care plan tests timing out

**Cause**: AI API not mocked or too slow

**Fix**: Ensure `mockCarePlanAPI(page)` is called in `beforeEach`

### Browser not found

**Fix**:
```bash
npx playwright install chromium
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Always use test helpers** - Don't duplicate patient creation logic
2. **Mock external APIs** - Avoid costs and flakiness
3. **Use unique MRNs** - Prevent test pollution
4. **Test cleanup** - Verify tests clean up after themselves
5. **Semantic selectors** - Use labels/roles, not CSS selectors
6. **Clear assertions** - One concept per test
7. **Document edge cases** - Explain why tests exist

## Performance

- **Test Suite Duration**: ~30-60 seconds (with mocks)
- **Workers**: 1 (database safety)
- **Parallel**: false (prevents race conditions)

### Optimization Tips

- Use `createPatientViaUI()` helper instead of manual form filling
- Mock all external API calls
- Run specific test files during development
- Use test fixtures for complex setups

## Coverage

| Feature | Tests | Coverage |
|---------|-------|----------|
| Patient Creation | 3 | ✅ Complete |
| Form Validation | 6 | ✅ Complete |
| Duplicate Detection | 6 | ✅ Complete |
| Care Plan | 5 | ✅ Complete |
| Export | 4 | ✅ Complete |
| Error Handling | 9 | ✅ Complete |

**Total**: 33 E2E tests

## Contributing

When adding new features:

1. Add E2E test in appropriate file
2. Use existing helpers where possible
3. Mock external APIs
4. Ensure cleanup works
5. Update this README if adding new patterns

## Questions?

See:
- [Playwright Docs](https://playwright.dev)
- [Project Architecture](../../docs/ARCHITECTURE.md)
- [Testing Strategy](../../docs/TESTING.md)
