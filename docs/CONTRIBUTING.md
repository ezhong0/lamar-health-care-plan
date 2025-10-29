# Contributing Guide

## Development Philosophy

This project demonstrates production-grade development practices for healthcare applications. Contributions should maintain the high standards established in the codebase.

## Core Principles

### 1. Type Safety First

TypeScript is used throughout with strict mode enabled. Never use `any` - instead use proper types or `unknown` with type guards.

**Good:**
```typescript
function processPatient(data: unknown): Patient {
  const validated = PatientSchema.parse(data);
  return validated;
}
```

**Bad:**
```typescript
function processPatient(data: any): any {
  return data;
}
```

### 2. Result Types Over Exceptions

Use the `Result<T, E>` pattern instead of throwing exceptions for expected errors.

**Good:**
```typescript
async function createPatient(input: PatientInput): Promise<Result<Patient>> {
  if (!input.mrn) {
    return { success: false, error: new ValidationError('MRN required') };
  }

  const patient = await db.patient.create({ data: input });
  return { success: true, data: patient };
}
```

**Bad:**
```typescript
async function createPatient(input: PatientInput): Promise<Patient> {
  if (!input.mrn) {
    throw new Error('MRN required'); // Forces caller to use try-catch
  }

  return await db.patient.create({ data: input });
}
```

### 3. Dependency Injection

Services should receive dependencies through constructor injection, not import them directly.

**Good:**
```typescript
class PatientService {
  constructor(
    private db: PrismaClient,
    private validator: ValidationService
  ) {}

  async createPatient(input: PatientInput) {
    // Can easily mock db and validator in tests
    const validation = await this.validator.validate(input);
    // ...
  }
}
```

**Bad:**
```typescript
import { db } from '@/lib/db';
import { validator } from '@/lib/validator';

class PatientService {
  async createPatient(input: PatientInput) {
    // Hard to test - must mock modules
    const validation = await validator.validate(input);
    // ...
  }
}
```

### 4. Separation of Concerns

Each layer should have a single responsibility:

```
┌─────────────────────────────────────┐
│ Presentation (React)                │  ← UI only, no business logic
├─────────────────────────────────────┤
│ API Layer (Route Handlers)          │  ← HTTP interface, validation
├─────────────────────────────────────┤
│ Service Layer                       │  ← Business logic orchestration
├─────────────────────────────────────┤
│ Domain Layer                        │  ← Core business rules
├─────────────────────────────────────┤
│ Infrastructure (DB, External APIs)  │  ← External integrations
└─────────────────────────────────────┘
```

**Don't:** Put database queries in React components
**Don't:** Put business logic in API route handlers
**Do:** Keep each layer focused on its responsibility

## Code Standards

### File Organization

```
lib/
├── domain/           # Core business types, rules (pure TypeScript)
├── services/         # Business logic orchestration
├── infrastructure/   # Database, external APIs, logging
├── validation/       # Zod schemas, validators
├── utils/           # Pure utility functions
└── config/          # Configuration constants
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `patient-service.ts`)
- **Classes:** `PascalCase` (e.g., `PatientService`)
- **Functions:** `camelCase` (e.g., `createPatient`)
- **Constants:** `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Types/Interfaces:** `PascalCase` (e.g., `PatientInput`)

### Documentation

Every public function should have JSDoc comments:

```typescript
/**
 * Create a new patient record with medication order
 *
 * Validates input, checks for duplicates, and creates patient
 * and order in a single transaction.
 *
 * @param input - Patient creation data
 * @param skipWarnings - Skip duplicate detection (default: false)
 * @returns Result with created patient and order, plus any warnings
 *
 * @example
 * const result = await createPatient({
 *   firstName: 'John',
 *   lastName: 'Smith',
 *   mrn: '123456',
 *   // ...
 * });
 *
 * if (result.success) {
 *   console.log('Created patient:', result.data.patient.id);
 * }
 */
async function createPatient(
  input: PatientInput,
  skipWarnings = false
): Promise<Result<PatientServiceResult>> {
  // ...
}
```

### Error Handling

1. **Use domain-specific errors:**
```typescript
// lib/domain/errors.ts
export class PatientNotFoundError extends Error {
  constructor(patientId: string) {
    super(`Patient not found: ${patientId}`);
    this.name = 'PatientNotFoundError';
  }
}
```

2. **Return Result types:**
```typescript
if (!patient) {
  return {
    success: false,
    error: new PatientNotFoundError(patientId)
  };
}
```

3. **Log appropriately:**
```typescript
logger.error('Failed to create patient', {
  error: error.message,
  patientId,
  duration: Date.now() - startTime
});
```

### Validation

Use Zod for all input validation:

```typescript
import { z } from 'zod';

const PatientInputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  mrn: z.string().regex(/^\d{6}$/, 'MRN must be exactly 6 digits'),
  // ...
});

type PatientInput = z.infer<typeof PatientInputSchema>;
```

**Benefits:**
- Runtime validation with TypeScript types automatically derived
- Clear error messages
- Composable schemas

## Testing Guidelines

### Unit Tests

Test pure functions and domain logic in isolation:

```typescript
describe('NPI Validator', () => {
  it('should validate correct NPI with Luhn checksum', () => {
    const result = validateNPI('1234567893');
    expect(result.success).toBe(true);
  });

  it('should reject invalid Luhn checksum', () => {
    const result = validateNPI('1234567890');
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

Test API endpoints with test database:

```typescript
describe('POST /api/patients', () => {
  it('should create patient with valid input', async () => {
    const response = await fetch('/api/patients', {
      method: 'POST',
      body: JSON.stringify(validPatientInput)
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests

Use Playwright for user workflows:

```typescript
test('should create patient and generate care plan', async ({ page }) => {
  await page.goto('/');

  // Fill form
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Smith');
  // ...

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page.locator('text=Patient created')).toBeVisible();
});
```

## Database Migrations

### Creating Migrations

1. Update `schema.prisma`
2. Generate migration: `npx prisma migrate dev --name descriptive-name`
3. Test migration on development database
4. Commit both schema and migration files

### Migration Best Practices

- **Backwards compatible:** Don't break existing code
- **Incremental:** Small, focused changes
- **Reversible:** Document rollback procedure
- **Tested:** Test on copy of production data

### Example Migration

```prisma
// Adding a new field
model Patient {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  // New field (optional to allow existing records)
  middleName String?  @default("")
}
```

## AI/LLM Integration Guidelines

### Prompt Engineering

1. **Be specific:** Clear instructions produce better results
2. **Provide context:** Include relevant patient data
3. **Use examples:** Show desired output format
4. **Constrain output:** Request specific structure/length

### Example Prompt Structure

```typescript
const prompt = `
You are a clinical pharmacist creating a care plan.

## Patient Information
${sanitizePatientData(patient)}

## Task
Generate a care plan following this structure:
1. Problem list (4-6 bullets)
2. SMART Goals (3 goals)
3. Pharmacist interventions (9 sections)
4. Monitoring plan

## Requirements
- Medically accurate
- Evidence-based
- 1500-2000 words total
- Professional tone

Generate the care plan:
`;
```

### Error Handling

```typescript
try {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3500,
    messages: [{ role: 'user', content: prompt }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    return { success: false, error: new Error('Unexpected response type') };
  }

  return { success: true, data: content.text };
} catch (error) {
  if (error.status === 429) {
    // Rate limit - wait and retry
    return { success: false, error: new RateLimitError() };
  }

  logger.error('AI generation failed', { error });
  return { success: false, error };
}
```

## Performance Optimization

### Database Queries

1. **Use indexes:** Add indexes for frequently queried fields
```prisma
model Patient {
  mrn       String   @index
  lastName  String   @index
}
```

2. **Eager loading:** Prevent N+1 queries
```typescript
// Good: One query with join
const patients = await db.patient.findMany({
  include: { orders: true }
});

// Bad: N+1 queries
const patients = await db.patient.findMany();
for (const patient of patients) {
  const orders = await db.order.findMany({
    where: { patientId: patient.id }
  });
}
```

3. **Pagination:** Don't load all records
```typescript
const patients = await db.patient.findMany({
  take: 50,
  skip: page * 50,
  orderBy: { createdAt: 'desc' }
});
```

### React Query

Use React Query for API calls:

```typescript
import { useQuery } from '@tanstack/react-query';

function PatientList() {
  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 60000, // Cache for 1 minute
  });

  // React Query handles caching, revalidation, loading states
}
```

## Security Best Practices

### Input Validation

**Always validate** user input with Zod before processing:

```typescript
const result = PatientInputSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    success: false,
    error: result.error.message
  });
}
```

### SQL Injection Prevention

Use Prisma's parameterized queries (never raw SQL with user input):

```typescript
// Safe: Prisma handles parameterization
const patient = await db.patient.findFirst({
  where: { mrn: userInput }
});

// Dangerous: Don't do this
const patient = await db.$queryRaw`
  SELECT * FROM Patient WHERE mrn = '${userInput}'
`;
```

### XSS Prevention

React automatically escapes content:

```tsx
// Safe: React escapes patientName
<div>{patientName}</div>

// Dangerous: Don't use dangerouslySetInnerHTML with user input
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## Git Workflow

### Commit Messages

Use conventional commits:

```
feat: Add duplicate patient detection
fix: Correct NPI validation checksum
docs: Update API documentation
refactor: Extract validation logic to service
test: Add integration tests for patient creation
```

### Branch Strategy

```
main              ← Production-ready code
  └─ feature/duplicate-detection  ← Feature branches
  └─ fix/npi-validation          ← Bug fixes
```

### Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] No console.logs or debug code

## Code Review Guidelines

### As a Reviewer

Look for:
- **Correctness:** Does it work as intended?
- **Type safety:** Any `any` types or unsafe casts?
- **Error handling:** Are errors handled properly?
- **Performance:** Any obvious performance issues?
- **Security:** Any security vulnerabilities?
- **Documentation:** Are public APIs documented?
- **Tests:** Are critical paths tested?

### As an Author

- Keep PRs small and focused
- Write clear PR descriptions
- Add screenshots for UI changes
- Respond to feedback constructively

## Adding New Features

### Step-by-Step Process

1. **Design first:** Think through the architecture
2. **Define types:** Create domain types and schemas
3. **Write tests:** TDD when possible
4. **Implement service:** Business logic in service layer
5. **Add API endpoint:** Route handler for HTTP interface
6. **Build UI:** React components with forms/displays
7. **Test integration:** End-to-end testing
8. **Document:** Update API docs and README

### Example: Adding Patient Notes Feature

```typescript
// 1. Define domain type
type PatientNote = {
  id: NoteId;
  patientId: PatientId;
  content: string;
  authorId: UserId;
  createdAt: Date;
};

// 2. Create Zod schema
const PatientNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  patientId: z.string(),
});

// 3. Service method
class PatientNoteService {
  async createNote(input: CreateNoteInput): Promise<Result<PatientNote>> {
    // Validation, business logic, database operation
  }
}

// 4. API endpoint
// app/api/patients/[id]/notes/route.ts
export async function POST(req: Request) {
  const result = await noteService.createNote(input);
  return Response.json(result);
}

// 5. React component
function NoteForm({ patientId }: { patientId: string }) {
  const createNote = useCreateNote();
  // Form UI with validation
}
```

## Why These Practices Matter

This project demonstrates how to build healthcare applications that are:

1. **Type-Safe:** Catch bugs at compile time, not runtime
2. **Testable:** Dependency injection and Result types make testing straightforward
3. **Maintainable:** Clear separation of concerns and consistent patterns
4. **Scalable:** Architecture supports growth without major refactoring
5. **Secure:** Multiple layers of validation and input sanitization
6. **Observable:** Comprehensive logging for debugging and monitoring
7. **Resilient:** Graceful error handling and retry logic

These patterns are not just for demonstration - they're production-ready practices used by leading healthcare software companies.

## Questions or Issues?

For questions about contributing:
1. Check existing documentation in `/docs`
2. Review similar code in the codebase
3. Open a discussion on GitHub

Remember: **Quality over speed.** Take time to do it right the first time.
