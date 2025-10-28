# Testing Infrastructure

Comprehensive test suite with unit tests, integration tests, and E2E tests.

## Test Structure

```
__tests__/
├── helpers/                  # Test utilities
│   ├── factories.ts         # Test data factories
│   ├── test-db.ts          # Database test helpers
│   ├── matchers.ts         # Custom Vitest matchers
│   └── mocks.ts            # Mock implementations
├── unit/                    # Unit tests (isolated)
│   ├── domain/
│   │   ├── result.test.ts
│   │   └── errors.test.ts
│   ├── validation/
│   │   ├── npi-validator.test.ts
│   │   └── icd10-validator.test.ts
│   ├── services/
│   │   ├── duplicate-detector.test.ts
│   │   └── care-plan-service.test.ts
│   └── infrastructure/
│       └── retry.test.ts
├── integration/              # Integration tests (with DB)
│   └── api/
│       └── patients.integration.test.ts
└── e2e/                      # End-to-end tests (Playwright)
    └── ...existing E2E tests

## Test Philosophy

### Test Pyramid

1. **Unit Tests (70%)** - Fast, isolated, no external dependencies
   - Domain logic (Result types, errors)
   - Validation (NPI, ICD-10)
   - Services (business logic with mocked dependencies)
   - Infrastructure utilities

2. **Integration Tests (20%)** - Realistic, with test database
   - API routes with full stack
   - Database operations
   - Transaction behavior

3. **E2E Tests (10%)** - Full user flows
   - Patient creation flow
   - Form validation
   - Duplicate detection
   - Care plan generation

### Test Quality Principles

- **AAA Pattern** - Arrange, Act, Assert
- **Descriptive Names** - `should do X when Y`
- **One Concept** - Test one thing per test
- **Fast Execution** - Unit tests run in milliseconds
- **Deterministic** - Same input = same output
- **Isolated** - No test dependencies

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- __tests__/unit

# Run integration tests only
npm test -- __tests__/integration

# Run specific test file
npm test -- __tests__/unit/domain/result.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run tests with UI
npm run test:ui
```

## Test Helpers

### Factories

Generate test data with sensible defaults:

```typescript
import { createPatient, createProvider, generateValidNPI } from './helpers/factories';

const patient = createPatient({
  firstName: 'John', // Override default
});

const npi = generateValidNPI(); // Always valid Luhn checksum
```

### Test Database

Manage test database state:

```typescript
import { setupTestDb, teardownTestDb, testDb } from './helpers/test-db';

beforeEach(async () => {
  await setupTestDb(); // Clean database
});

afterAll(async () => {
  await teardownTestDb(); // Disconnect
});
```

### Custom Matchers

Domain-specific assertions:

```typescript
import './helpers/matchers';

expect(result).toBeSuccess();
expect(result).toBeFailure();
expect(result).toHaveWarnings();
expect(result).toHaveWarningType('SIMILAR_PATIENT');
```

### Mocks

Mock external dependencies:

```typescript
import { createMockAnthropicClient } from './helpers/mocks';

const mockClient = createMockAnthropicClient({
  response: 'Custom care plan',
  shouldFail: false,
  delay: 100,
});
```

## Test Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Domain | 100% | ✅ |
| Validation | 100% | ✅ |
| Services | 90%+ | ✅ |
| API Routes | 80%+ | ✅ |
| Infrastructure | 90%+ | ✅ |

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';

describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle error case', () => {
      expect(() => doSomething(invalidInput)).toThrow();
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, testDb } from '../helpers/test-db';

describe('Feature Integration', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('should work with database', async () => {
    // Create test data
    const patient = await testDb.patient.create({ ... });

    // Test functionality
    const result = await service.doSomething(patient.id);

    // Verify database state
    expect(result).toBeDefined();
  });
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "should create patient with valid data"
```

### Enable Verbose Logging

```typescript
process.env.LOG_LEVEL = 'debug';
```

### Use VSCode Debugger

1. Set breakpoint in test file
2. Run "Debug: JavaScript Debug Terminal"
3. Run `npm test` in debug terminal

## CI/CD Integration

Tests run automatically on:
- Push to any branch
- Pull requests
- Before deployment

CI Configuration:
```yaml
- name: Run unit tests
  run: npm test -- __tests__/unit

- name: Run integration tests
  run: npm test -- __tests__/integration

- name: Run E2E tests
  run: npm run test:e2e
```

## Test Database Setup

Integration tests require a PostgreSQL test database:

```bash
# Using Docker Compose
docker-compose up -d

# Or use existing Postgres
createdb lamar_health_test
```

Environment variable:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lamar_health_test"
```

## Performance

- Unit tests: <5 seconds total
- Integration tests: <30 seconds total
- E2E tests: <2 minutes total

## Best Practices

1. **Arrange data with factories** - Don't hardcode test data
2. **Clean database** - Use beforeEach to reset state
3. **Mock external APIs** - Don't call real Anthropic API
4. **Test behavior, not implementation** - Refactoring shouldn't break tests
5. **Use descriptive names** - Test name should describe expected behavior
6. **Keep tests focused** - One assertion concept per test
7. **Avoid test interdependencies** - Tests should run independently

## Troubleshooting

### Tests fail with "Database not found"

Ensure test database exists:
```bash
createdb lamar_health_test
```

### Tests hang or timeout

- Check for missing `await` keywords
- Ensure database connections are closed (`teardownTestDb()`)
- Verify no infinite loops in test logic

### Tests pass locally but fail in CI

- Environment variables might differ
- Check database configuration
- Verify all dependencies are installed

## Contributing

When adding new features:

1. Write unit tests first (TDD)
2. Add integration tests for API routes
3. Consider E2E tests for critical user flows
4. Aim for >90% coverage on business logic
5. Update this README if adding new test patterns
