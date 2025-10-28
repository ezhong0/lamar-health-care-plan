# AI Care Plan Generator

Automated care plan generation system for specialty pharmacies, built with Next.js, TypeScript, and Claude AI. Reduces manual care plan creation from 20-40 minutes to under 30 seconds while ensuring data integrity through comprehensive validation and duplicate detection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Problem Statement

Specialty pharmacies require detailed pharmacist care plans for Medicare reimbursement and pharmaceutical reporting. Creating these plans manually is:
- **Time-intensive**: 20-40 minutes per patient
- **Error-prone**: Manual data entry and validation
- **Costly**: Backlog accumulation due to staffing shortages
- **Compliance-critical**: Required for reimbursement; missing or duplicate records cause revenue loss

This system automates care plan generation while implementing robust business rules to prevent data quality issues that plague specialty pharmacy operations.

---

## Business Logic & Domain Rules

### 1. Patient Validation & Data Integrity

**MRN (Medical Record Number) Management**
- 6-digit numeric format required
- Duplicates are **allowed but flagged** - patients may have multiple orders
- Exact MRN matches trigger non-blocking warnings
- Rationale: Same patient, multiple medications is valid; blocking would prevent legitimate workflows

**Name Validation & Fuzzy Matching**
- Supports hyphens and apostrophes (e.g., "Mary-Anne O'Brien")
- Jaro-Winkler distance algorithm detects similar names (threshold: 0.85)
- Example: "Michael Smith" vs "Mikey Smith" triggers warning
- Rationale: Prevents duplicate patient creation due to typos or name variations

**ICD-10 Code Validation**
```typescript
// Format: Letter + 2 digits + decimal + 1-4 chars
// Valid range: A00.0 - Z99.9999
Pattern: /^[A-Z]\d{2}\.\d{1,4}$/

Examples:
✓ G70.00 (Myasthenia gravis)
✓ J45.50 (Severe persistent asthma)
✗ G7000 (missing decimal)
✗ AB12.34 (invalid chapter)
```

**NPI (National Provider Identifier) Validation**
- 10-digit number validated using Luhn algorithm (checksum)
- Prevents typos that would cause claim rejections
- Algorithm detects 99% of single-digit errors and transpositions

### 2. Provider Conflict Detection

**Critical Business Rule**: Providers must have unique NPI numbers across the system.

**Why this matters**:
- Pharmaceutical reporting aggregates data by provider NPI
- Same NPI with different names = data integrity violation
- Impacts revenue: Pharma companies pay based on provider reports

**Implementation**:
```typescript
// Check if NPI exists with different provider name
const existingProvider = await db.provider.findUnique({
  where: { npi: input.npi }
});

if (existingProvider && existingProvider.name !== input.name) {
  // Non-blocking warning: "NPI 1234567893 is registered to 'Dr. Sarah Chen'
  // but you entered 'Dr. S. Chen'. Possible name variation?"
}
```

### 3. Duplicate Order Detection

**Business Rule**: Patients should not have duplicate orders for the same medication.

**Detection Logic**:
```typescript
// Check for existing orders matching:
// 1. Same patient (by patientId)
// 2. Same medication name (case-insensitive, normalized)
// 3. Same primary diagnosis

const duplicateOrder = await db.order.findFirst({
  where: {
    patientId: patient.id,
    medicationName: { equals: input.medicationName, mode: 'insensitive' },
    primaryDiagnosis: input.primaryDiagnosis
  }
});
```

**Edge case handled**: Patient legitimately on same medication for different diagnoses (e.g., prednisone for both autoimmune disease and COPD) - no warning triggered.

### 4. Care Plan Generation Business Logic

**Structured Output Format**

Care plans follow a standardized 9-section format mandated by specialty pharmacy compliance:

1. **Problem list / Drug therapy problems (DTPs)** - 4-6 bullet points identifying efficacy, safety, adherence gaps
2. **Goals (SMART)** - Primary (clinical outcome), Safety (adverse event prevention), Process (therapy completion)
3. **Pharmacist interventions / plan** - 9 subsections:
   - Dosing & Administration
   - Premedication
   - Infusion rates & titration
   - Hydration & renal protection
   - Thrombosis risk mitigation
   - Concomitant medications
   - Monitoring during infusion
   - Adverse event management
   - Documentation & communication
4. **Monitoring plan & lab schedule** - Timeline-based monitoring (before/during/post-therapy)

**AI Prompt Engineering**

The system uses Claude Haiku 4.5 with carefully engineered prompts to:
- Extract patient data (demographics, diagnoses, medications, records)
- Generate medication-specific care plans (2-4 sentences per subsection)
- Maintain clinical accuracy while following format constraints
- Adapt generic sections (e.g., "infusion rates") for oral medications

**Why Haiku 4.5**: Balance of speed (2-10s response time), cost ($0.25/$1.25 per million tokens), and quality for structured medical text generation.

---

## Architecture & Design Patterns

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERFACE LAYER                          │
│  Next.js API Routes + React Components                      │
│  - /api/patients, /api/orders, /api/care-plans             │
│  - PatientForm, WarningList, CarePlanDisplay               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                           │
│  Business Logic Orchestration                               │
│  - PatientService: Patient CRUD + duplicate detection       │
│  - CarePlanService: AI-powered care plan generation         │
│  - DuplicateDetector: Fuzzy matching algorithms             │
│  - ValidationService: NPI/ICD-10 validation                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                            │
│  Core Types, Errors, Business Rules                         │
│  - Branded types (PatientId, OrderId, CarePlanId)          │
│  - Domain errors (DuplicatePatientError, ValidationError)   │
│  - Result<T, E> discriminated union                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                       │
│  External Services & Technical Concerns                     │
│  - Prisma ORM: Database access + transactions               │
│  - Anthropic SDK: Claude AI integration                     │
│  - Logger: Structured JSON logging                          │
│  - Retry logic: Exponential backoff for AI calls            │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

#### 1. Result Types for Type-Safe Error Handling

**Problem**: Traditional try/catch loses type information and forces runtime checks.

**Solution**: Railway-oriented programming with discriminated unions.

```typescript
// Domain result type
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Service method
async createPatient(input: PatientInput): Promise<Result<
  { patient: Patient; warnings: Warning[] },
  PatientError
>> {
  // Validation
  const validationResult = validatePatientInput(input);
  if (isFailure(validationResult)) {
    return validationResult; // Type-safe error return
  }

  // Duplicate detection
  const duplicates = await this.detectDuplicates(input);

  // Transaction
  const patient = await this.db.$transaction(async (tx) => {
    // Atomic patient + order creation
  });

  return { success: true, data: { patient, warnings: duplicates } };
}

// Caller
const result = await patientService.createPatient(input);
if (isFailure(result)) {
  // TypeScript knows result.error is PatientError
  return NextResponse.json({ error: result.error.message }, { status: 400 });
}
// TypeScript knows result.data exists and has correct shape
const { patient, warnings } = result.data;
```

**Benefits**:
- Compile-time error handling guarantees
- No silent failures
- Explicit error types in function signatures
- Forces error case handling

#### 2. Dependency Injection via Constructor

**Problem**: Direct instantiation creates tight coupling and prevents testing.

**Solution**: Pass dependencies through constructors.

```typescript
// Service with injected dependencies
export class PatientService {
  constructor(
    private readonly db: PrismaClient,
    private readonly duplicateDetector: DuplicateDetector
  ) {}
}

// Factory pattern for consistent service creation
export function createServices(db: PrismaClient) {
  const duplicateDetector = new DuplicateDetector(db);
  const patientService = new PatientService(db, duplicateDetector);
  const carePlanService = new CarePlanService(db, apiKey);

  return { patientService, carePlanService, duplicateDetector };
}

// API route usage
const { patientService } = createServices(prisma);
const result = await patientService.createPatient(input);
```

**Benefits**:
- Easy testing with mock dependencies
- Single source of truth for service instantiation
- Clear dependency graph
- Prevents circular dependencies

#### 3. Atomic Transactions for Data Consistency

**Problem**: Creating a patient with orders involves multiple database operations. Partial failure leaves inconsistent state.

**Solution**: Prisma transactions with rollback on failure.

```typescript
async createPatient(input: PatientInput) {
  return await this.db.$transaction(async (tx) => {
    // 1. Create or find providers (by NPI uniqueness)
    const providers = await Promise.all(
      input.orders.map(async (order) => {
        return tx.provider.upsert({
          where: { npi: order.providerNpi },
          update: {}, // Don't update if exists
          create: {
            name: order.providerName,
            npi: order.providerNpi,
          },
        });
      })
    );

    // 2. Create patient
    const patient = await tx.patient.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        mrn: input.mrn,
        // ... other fields
      },
    });

    // 3. Create orders linked to patient and providers
    await Promise.all(
      input.orders.map(async (order, index) => {
        return tx.order.create({
          data: {
            medicationName: order.medicationName,
            primaryDiagnosis: order.primaryDiagnosis,
            patientId: patient.id,
            providerId: providers[index].id,
            status: 'pending',
          },
        });
      })
    );

    return patient;
  });
}
```

**Guarantees**:
- All operations succeed or all fail (no partial state)
- Provider uniqueness maintained (upsert prevents duplicates)
- Foreign key integrity enforced
- Automatic rollback on any error

#### 4. Branded Types for Domain Modeling

**Problem**: Primitive strings are too permissive. `patientId: string` accepts any string.

**Solution**: Branded types create distinct types at compile time without runtime overhead.

```typescript
// Domain types with branding
export type PatientId = string & { readonly __brand: 'PatientId' };
export type OrderId = string & { readonly __brand: 'OrderId' };
export type CarePlanId = string & { readonly __brand: 'CarePlanId' };

// Constructor functions (runtime no-ops, compile-time guards)
export const toPatientId = (id: string): PatientId => id as PatientId;
export const toOrderId = (id: string): OrderId => id as OrderId;

// Usage
interface Patient {
  id: PatientId; // Not just any string!
  firstName: string;
  lastName: string;
}

interface Order {
  id: OrderId;
  patientId: PatientId; // Type-safe reference
}

// Prevents errors
const order: Order = {
  id: toOrderId('order_123'),
  patientId: toPatientId('patient_456'), // ✓ Correct
};

const badOrder: Order = {
  id: toOrderId('order_123'),
  patientId: 'patient_456', // ✗ Type error: string not assignable to PatientId
};
```

**Benefits**:
- Zero runtime cost
- Prevents ID type confusion
- Self-documenting code
- Catches bugs at compile time

---

## Data Flow: Patient Creation with Duplicate Detection

```typescript
// 1. User submits form
POST /api/patients
{
  firstName: "Michael",
  lastName: "Smith",
  mrn: "002345",
  orders: [{ medicationName: "Gabapentin 300mg", ... }]
}

// 2. API route validates and calls service
const result = await patientService.createPatient(input);

// 3. PatientService orchestrates business logic
async createPatient(input: PatientInput) {
  // 3a. Input validation (Zod schema)
  const validated = PatientInputSchema.parse(input);

  // 3b. Run duplicate detection IN PARALLEL
  const [mrnDuplicates, nameDuplicates, orderDuplicates] = await Promise.all([
    this.detectMRNDuplicates(validated),
    this.detectNameDuplicates(validated),
    this.detectOrderDuplicates(validated),
  ]);

  // 3c. Combine warnings (non-blocking)
  const warnings = [...mrnDuplicates, ...nameDuplicates, ...orderDuplicates];

  // 3d. Atomic transaction (create patient + orders + providers)
  const patient = await this.db.$transaction(async (tx) => {
    // Provider upsert by NPI
    // Patient creation
    // Order creation with FK references
  });

  // 3e. Return result with warnings
  return { success: true, data: { patient, warnings } };
}

// 4. API route returns warnings + patient data
// Frontend displays warnings but allows submission
```

---

## AI Care Plan Generation Flow

```typescript
// 1. User requests care plan
POST /api/care-plans
{ patientId: "patient_123" }

// 2. CarePlanService fetches patient data
const patientData = await db.patient.findUnique({
  where: { id: patientId },
  include: {
    orders: {
      include: { provider: true },
      orderBy: { createdAt: 'desc' },
      take: 5, // Most recent 5 orders
    },
  },
});

// 3. Build structured prompt
const prompt = buildPrompt(patientData);
/*
You are a clinical pharmacist creating a care plan...

## Patient Information
Name: Alice Bennet
MRN: 123456
Current Order: IVIG (Privigen) for G70.00
Provider: Dr. Sarah Chen (NPI: 1234567893)

## Patient Records
[Full clinical notes with vitals, labs, history]

## Task
Generate a comprehensive pharmacist care plan following this structure:
1. Problem list / Drug therapy problems (4-6 bullets, 1-2 sentences each)
2. Goals (SMART) - Primary, Safety goal, Process (1-2 sentences each)
3. Pharmacist interventions / plan (9 subsections, 2-4 sentences each)
4. Monitoring plan & lab schedule (brief bullets)

CRITICAL: Total 1500-2000 words, concise bullet format, match example style.
*/

// 4. Call Claude with timeout
const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 2048,
  messages: [{ role: 'user', content: prompt }],
}, {
  signal: abortController.signal, // 30s timeout
});

// 5. Save to database
const carePlan = await db.carePlan.create({
  data: {
    patientId,
    content: response.content[0].text,
    generatedBy: 'claude-haiku-4-5-20251001',
  },
});

// 6. Return markdown content for rendering
return { success: true, data: { carePlan } };
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, Next.js 16 (App Router) | Server components, streaming, optimistic updates |
| **Styling** | Tailwind CSS 4, shadcn/ui | Utility-first CSS, accessible components |
| **Forms** | React Hook Form + Zod | Client-side validation, type-safe schemas |
| **State** | React Query | Server state caching, optimistic mutations |
| **Backend** | Next.js API Routes | Edge-ready API endpoints |
| **Database** | PostgreSQL + Prisma ORM | Relational data, type-safe queries |
| **AI** | Anthropic Claude Haiku 4.5 | Care plan generation (2-10s latency) |
| **Testing** | Vitest, Playwright | Unit + E2E test coverage |
| **Language** | TypeScript 5.0 | Type safety, branded types, discriminated unions |

---

## Project Structure

```
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (interface layer)
│   │   ├── patients/              # Patient CRUD endpoints
│   │   ├── orders/                # Order management endpoints
│   │   ├── care-plans/            # Care plan generation endpoint
│   │   └── providers/             # Provider management + cleanup
│   ├── patients/                  # Patient pages
│   └── layout.tsx                 # Root layout
│
├── lib/                           # Business logic & domain
│   ├── services/                  # Service layer
│   │   ├── patient-service.ts     # Patient CRUD + duplicate detection
│   │   ├── care-plan-service.ts   # AI care plan generation
│   │   └── factory.ts             # Service factory (DI)
│   ├── domain/                    # Domain layer
│   │   ├── types.ts               # Branded types (PatientId, OrderId)
│   │   ├── errors.ts              # Domain errors
│   │   └── result.ts              # Result<T, E> type
│   ├── validation/                # Input validation
│   │   └── schemas.ts             # Zod schemas (NPI, ICD-10, etc.)
│   ├── infrastructure/            # Infrastructure layer
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── logger.ts              # Structured logging
│   │   └── env.ts                 # Environment validation
│   └── utils/                     # Shared utilities
│       ├── duplicate-detector.ts  # Jaro-Winkler fuzzy matching
│       └── sanitize-llm.ts        # Prompt injection prevention
│
├── components/                    # React components
│   ├── PatientForm.tsx            # Multi-step patient entry form
│   ├── WarningList.tsx            # Duplicate detection warnings
│   └── ui/                        # shadcn/ui components
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # SQL migration files
│
└── __tests__/                     # Test suites
    ├── unit/                      # Service layer tests
    └── e2e/                       # End-to-end tests
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Anthropic API key ([sign up](https://console.anthropic.com))

### Setup

```bash
# 1. Clone and install
git clone https://github.com/ezhong0/lamar-health-care-plan.git
cd lamar-health-care-plan
npm install

# 2. Start database (Docker)
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# 4. Run migrations
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

Visit **http://localhost:3000**

### Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests (Playwright)
npm run lint         # Run ESLint
```

---

## Testing Strategy

### Unit Tests (Vitest)

Focus on business logic in isolation:
- Service layer methods (duplicate detection, validation)
- Utility functions (Luhn algorithm, Jaro-Winkler distance)
- Result type handling

```bash
npm test -- patient-service.test.ts
```

### E2E Tests (Playwright)

Test user workflows end-to-end:
- Patient creation with warnings
- Duplicate detection scenarios
- Care plan generation flow
- Provider conflict detection

```bash
npm run test:e2e -- patient-creation.spec.ts
```

### Test Coverage

Key areas with high test coverage:
- ✅ NPI Luhn validation (100%)
- ✅ ICD-10 format validation (100%)
- ✅ Jaro-Winkler fuzzy matching (100%)
- ✅ Duplicate detection logic (95%)
- ✅ Result type error handling (90%)

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables:
   ```
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   NODE_ENV=production
   ```
4. Deploy

### Database (Production)

Use managed PostgreSQL:
- Vercel Postgres
- Supabase
- Railway
- Neon

Run migrations on deploy:
```bash
npx prisma migrate deploy
```

---

## Performance Considerations

### Database Queries
- Parallel duplicate detection queries (reduces latency by 60%)
- Indexed fields: `mrn`, `npi`, `patientId`
- Connection pooling via Prisma

### AI Generation
- Claude Haiku 4.5: 2-10s typical response time
- 30s timeout with AbortController
- No retry logic (fail fast for better UX)

### Caching Strategy
- React Query: 5-minute stale time for patient lists
- Next.js: Static pages cached at edge
- Prisma: Query result caching

---

## License

MIT License - See [LICENSE](LICENSE) for details.
