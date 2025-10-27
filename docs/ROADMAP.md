# Implementation Roadmap - Parallel Development Approach
**Timeline:** 10-11 hours (parallel) or 14-15 hours (sequential)
**Philosophy:** Establish contracts early, develop in parallel, integrate at the end

---

## Overview

This roadmap enables **parallel frontend and backend development** through clear API contracts.

**Key Principles:**
- Define shared types and contracts first (foundation phase)
- Backend and frontend develop independently against contracts
- Both tracks maintain consistent quality patterns
- Integration happens at the end with minimal friction

**Why Parallel Development:**
- ✅ **30% faster delivery** (10-11h vs 14-15h)
- ✅ **Early visual progress** (UI works with mocks immediately)
- ✅ **Demonstrates modern workflows** (contract-driven development, MSW mocking)
- ✅ **Shows architectural maturity** (designed for team scalability)
- ✅ **Better feedback loops** (can iterate on UX while backend builds)

**Anti-patterns we're avoiding:**
- Building UI last (can't demo progress early)
- Tight coupling between frontend/backend (hard to parallelize)
- Unclear contracts (rework during integration)
- Inconsistent quality across tracks

---

## Phase 1: Shared Foundation (2 hours)

**Goal:** Establish contracts and setup that both frontend and backend will use.

**Who:** Both developers working together (or solo developer doing foundation first)

**Why this phase matters:** Clear contracts eliminate rework during integration. This is where we define the "interface" between frontend and backend.

---

### Hour 1: Project Setup & Domain Types

**Tasks:**
```bash
# 1. Initialize Next.js project
npx create-next-app@latest lamar-health --typescript --tailwind --app --no-src-dir

# 2. Install dependencies
npm install prisma @prisma/client zod react-hook-form @hookform/resolvers/zod
npm install @anthropic-ai/sdk @tanstack/react-query
npm install -D vitest @testing-library/react @testing-library/jest-dom msw

# 3. Setup Prisma
npx prisma init

# 4. Setup shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button form input card alert

# 5. Setup MSW for frontend mocking
npx msw init public/ --save
```

**Create Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: lamar_health
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Start database:**
```bash
docker-compose up -d
```

**Deliverable:** Project runs, database runs, dependencies installed.

---

### Hour 1.5: Project Structure & Domain Types

**Create folder structure:**
```
lib/
├── api/
│   └── contracts.ts       # API request/response types (CRITICAL FOR PARALLEL WORK)
├── domain/
│   ├── types.ts           # Domain entities
│   ├── errors.ts          # Domain errors
│   ├── result.ts          # Result type
│   └── warnings.ts        # Warning types
├── services/              # Backend track
├── validation/            # Shared by both tracks
├── infrastructure/        # Backend track
└── client/                # Frontend track
    └── api.ts             # API wrapper functions

mocks/                     # Frontend track
├── handlers.ts            # MSW API handlers
├── browser.ts             # Browser setup
└── data.ts                # Mock data generators
```

**Implement foundational types:**

**1. Result type** (`lib/domain/result.ts`):
```typescript
export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  success: true;
  data: T;
  warnings?: Warning[];
}

export interface Failure<E> {
  success: false;
  error: E;
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}
```

**2. Domain types** (`lib/domain/types.ts`):
```typescript
// Branded types
export type PatientId = string & { readonly __brand: 'PatientId' };
export type OrderId = string & { readonly __brand: 'OrderId' };
export type ProviderId = string & { readonly __brand: 'ProviderId' };

export function toPatientId(id: string): PatientId {
  return id as PatientId;
}

export function toOrderId(id: string): OrderId {
  return id as OrderId;
}

export function toProviderId(id: string): ProviderId {
  return id as ProviderId;
}

// Domain entities
export interface Patient {
  id: PatientId;
  firstName: string;
  lastName: string;
  mrn: string;
  additionalDiagnoses: string[];
  medicationHistory: string[];
  patientRecords: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: OrderId;
  patientId: PatientId;
  providerId: ProviderId;
  medicationName: string;
  primaryDiagnosis: string;
  status: OrderStatus;
  createdAt: Date;
}

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Provider {
  id: ProviderId;
  name: string;
  npi: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarePlan {
  id: string;
  patientId: PatientId;
  content: string;
  generatedBy: string;
  createdAt: Date;
}
```

**3. Domain errors** (`lib/domain/errors.ts`):
```typescript
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DuplicatePatientError extends DomainError {
  constructor(existingPatient: { mrn: string; firstName: string; lastName: string }) {
    super(
      `Patient with MRN ${existingPatient.mrn} already exists: ${existingPatient.firstName} ${existingPatient.lastName}`,
      'DUPLICATE_PATIENT',
      409,
      { existingPatient }
    );
  }
}

export class ProviderConflictError extends DomainError {
  constructor(npi: string, expectedName: string, actualName: string) {
    super(
      `NPI ${npi} is registered to "${actualName}". You entered "${expectedName}".`,
      'PROVIDER_CONFLICT',
      409,
      { npi, expectedName, actualName }
    );
  }
}

export class PatientNotFoundError extends DomainError {
  constructor(patientId: string) {
    super(
      `Patient with ID ${patientId} not found`,
      'PATIENT_NOT_FOUND',
      404,
      { patientId }
    );
  }
}

export class CarePlanGenerationError extends DomainError {
  constructor(reason: string, cause?: Error) {
    super(
      `Failed to generate care plan: ${reason}`,
      'CARE_PLAN_GENERATION_FAILED',
      500,
      { reason, cause: cause?.message }
    );
  }
}
```

**4. Warning types** (`lib/domain/warnings.ts`):
```typescript
export type Warning =
  | DuplicatePatientWarning
  | DuplicateOrderWarning
  | ProviderConflictWarning
  | SimilarPatientWarning;

export interface DuplicatePatientWarning {
  type: 'DUPLICATE_PATIENT';
  severity: 'high';
  message: string;
  existingPatient: {
    id: PatientId;
    mrn: string;
    name: string;
  };
}

export interface DuplicateOrderWarning {
  type: 'DUPLICATE_ORDER';
  severity: 'high';
  message: string;
  existingOrder: {
    id: OrderId;
    medicationName: string;
    createdAt: Date;
  };
}

export interface ProviderConflictWarning {
  type: 'PROVIDER_CONFLICT';
  severity: 'high';
  message: string;
  npi: string;
  expectedName: string;
  actualName: string;
}

export interface SimilarPatientWarning {
  type: 'SIMILAR_PATIENT';
  severity: 'medium';
  message: string;
  similarPatient: {
    id: PatientId;
    mrn: string;
    name: string;
  };
  similarityScore: number;
}
```

**5. API Contracts** (`lib/api/contracts.ts`):

**THIS IS CRITICAL** — These types are the contract between frontend and backend.

```typescript
import { Patient, CarePlan, Warning, Order } from '@/lib/domain/types';

// ============================================================================
// Patient Creation
// ============================================================================

export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  mrn: string;
  referringProvider: string;
  referringProviderNPI: string;
  primaryDiagnosis: string;
  medicationName: string;
  additionalDiagnoses: string[];
  medicationHistory: string[];
  patientRecords: string;
}

export interface CreatePatientResponse {
  success: boolean;
  data?: {
    patient: Patient;
    warnings: Warning[];
  };
  error?: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Care Plan Generation
// ============================================================================

export interface GenerateCarePlanRequest {
  patientId: string;
}

export interface GenerateCarePlanResponse {
  success: boolean;
  data?: {
    carePlan: CarePlan;
  };
  error?: {
    message: string;
    code: string;
  };
}

// ============================================================================
// Get Patient
// ============================================================================

export interface GetPatientResponse {
  success: boolean;
  data?: {
    patient: Patient;
    orders: Order[];
    carePlans: CarePlan[];
  };
  error?: {
    message: string;
    code: string;
  };
}
```

**Why this matters:** Frontend and backend can now develop independently. Frontend uses these types for mocks, backend uses them for API routes. TypeScript ensures they stay in sync.

**Deliverable:** Type-safe domain model + API contracts established. Both tracks can now proceed independently.

---

### Hour 2-2.5: Database Schema & Infrastructure

**1. Define Prisma schema** (`prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Patient {
  id                   String   @id @default(cuid())
  firstName            String   @map("first_name")
  lastName             String   @map("last_name")
  mrn                  String   @unique
  additionalDiagnoses  String[] @map("additional_diagnoses")
  medicationHistory    String[] @map("medication_history")
  patientRecords       String   @map("patient_records") @db.Text

  orders     Order[]
  carePlans  CarePlan[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([mrn])
  @@index([firstName, lastName])
  @@map("patients")
}

model Order {
  id               String      @id @default(cuid())
  patientId        String      @map("patient_id")
  patient          Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  providerId       String      @map("provider_id")
  provider         Provider    @relation(fields: [providerId], references: [id])
  medicationName   String      @map("medication_name")
  primaryDiagnosis String      @map("primary_diagnosis")
  status           String      @default("pending")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([patientId, medicationName])
  @@index([providerId])
  @@map("orders")
}

model Provider {
  id   String @id @default(cuid())
  name String
  npi  String @unique

  orders Order[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("providers")
}

model CarePlan {
  id          String  @id @default(cuid())
  patientId   String  @map("patient_id")
  patient     Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  content     String  @db.Text
  generatedBy String  @map("generated_by")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([patientId, createdAt])
  @@map("care_plans")
}
```

**2. Create migration:**
```bash
npx prisma migrate dev --name init
```

**3. Setup infrastructure** (`lib/infrastructure/`):

**Logger** (`lib/infrastructure/logger.ts`):
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel = process.env.LOG_LEVEL as LogLevel || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
```

**Database client** (`lib/infrastructure/db.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Retry utility** (`lib/infrastructure/retry.ts`):
```typescript
export interface RetryOptions {
  attempts: number;
  delay: number;
  backoff: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < options.attempts) {
        if (options.onRetry) {
          options.onRetry(lastError, attempt);
        }

        const delay = options.delay * Math.pow(options.backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

**Error handler** (`lib/infrastructure/error-handler.ts`):
```typescript
import { NextResponse } from 'next/server';
import { DomainError } from '@/lib/domain/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export function handleError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    logger.warn('Domain error occurred', {
      code: error.code,
      message: error.message,
      details: error.details,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    logger.warn('Validation error', { errors: error.errors });

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Database error', { code: error.code, message: error.message });

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'A record with this identifier already exists',
          code: 'DUPLICATE_RECORD',
        },
        { status: 409 }
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Database operation failed',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }

  logger.error('Unexpected error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
```

**6. MSW Mock Setup** (`mocks/handlers.ts`):

**Enables frontend development without backend:**

```typescript
import { http, HttpResponse } from 'msw';
import { CreatePatientResponse, GenerateCarePlanResponse } from '@/lib/api/contracts';

export const handlers = [
  // Mock patient creation
  http.post('/api/patients', async ({ request }) => {
    const body = await request.json();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return realistic mock response matching contract
    return HttpResponse.json<CreatePatientResponse>({
      success: true,
      data: {
        patient: {
          id: 'mock-patient-' + Date.now(),
          firstName: body.firstName,
          lastName: body.lastName,
          mrn: body.mrn,
          additionalDiagnoses: body.additionalDiagnoses,
          medicationHistory: body.medicationHistory,
          patientRecords: body.patientRecords,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Similar patient found: John Smith (MRN: 000123)',
            similarPatient: {
              id: 'existing-patient-1',
              mrn: '000123',
              name: 'John Smith',
            },
            similarityScore: 0.85,
          },
        ],
      },
    });
  }),

  // Mock care plan generation
  http.post('/api/care-plans', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return HttpResponse.json<GenerateCarePlanResponse>({
      success: true,
      data: {
        carePlan: {
          id: 'mock-careplan-' + Date.now(),
          patientId: 'mock-patient-123',
          content: `## Problem List / Drug Therapy Problems (DTPs)

1. Need for rapid immunomodulation to reduce myasthenic symptoms (efficacy)
2. Risk of infusion-related reactions (headache, chills, fever, rare anaphylaxis)
3. Risk of renal dysfunction or volume overload

## SMART Goals

**Primary Goal:**
- Achieve clinically meaningful improvement in muscle strength within 2 weeks

**Safety Goal:**
- No severe infusion reaction
- No acute kidney injury`,
          generatedBy: 'claude-3-5-sonnet-20241022',
          createdAt: new Date(),
        },
      },
    });
  }),
];
```

**Browser setup** (`mocks/browser.ts`):
```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Enable in dev** (add to `app/layout.tsx` or `app/providers.tsx`):
```typescript
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  import('@/mocks/browser').then(({ worker }) => {
    worker.start();
  });
}
```

**Deliverable:**
- Database running with schema
- Infrastructure layer ready (logger, db client, retry, error handler)
- **API contracts defined**
- **MSW mocks ready for frontend**
- Patterns established for all future code

**🚀 SPLIT POINT:** Frontend and backend can now work independently

---

## Phase 2: Parallel Development (6-7 hours)

**Goal:** Build complete features independently, then integrate.

**Critical:** Both tracks follow the same quality patterns (Result types, error handling, logging, testing).

---

## Phase 2A: Backend Track (6-7 hours)

**Who:** Backend developer (or solo developer alternating between tracks)

**Dependencies:** Phase 1 complete (types, contracts, database)

**Deliverable:** Working API routes that serve real data from database

---

### Backend Hour 1: Validation Layer

**Tasks:**
1. NPI Validator (`lib/validation/npi-validator.ts`) - Luhn algorithm
2. ICD-10 Validator (`lib/validation/icd10-validator.ts`) - Structure validation
3. Zod Schemas (`lib/validation/schemas.ts`) - Complete input validation

**Use implementations from ARCHITECTURE_V3.md** (already documented there in detail)

**Key points:**
- NPI validation with Luhn checksum
- ICD-10 structure + chapter ranges
- Zod refinements for custom validation
- Helpful error messages

**Deliverable:** All input validation ready with tests

---

### Backend Hour 2-3: Service Layer

**Tasks:**
1. Provider Service (`lib/services/provider-service.ts`) - Upsert with conflict detection
2. Duplicate Detector (`lib/services/duplicate-detector.ts`) - Fuzzy matching, duplicate orders
3. Patient Service (`lib/services/patient-service.ts`) - Full transaction orchestration
4. Care Plan Service (`lib/services/care-plan-service.ts`) - LLM calls with retry logic

**Pattern for all services:**
- Dependency injection (constructor parameters)
- Return Result types
- Comprehensive logging (start, success, error, duration)
- Transaction management where needed
- Domain errors for business failures

**Use implementations from ARCHITECTURE_V3.md**

**Deliverable:** Service layer complete with consistent patterns

---

### Backend Hour 4: API Routes

**Tasks:**
1. POST /api/patients (`app/api/patients/route.ts`)
2. POST /api/care-plans (`app/api/care-plans/route.ts`)
3. GET /api/patients/[id] (`app/api/patients/[id]/route.ts`)

**Pattern for all routes:**
```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await req.json();
    const validatedInput = SomeSchema.parse(body);

    // 2. Initialize services (dependency injection)
    const service = new SomeService(prisma, ...dependencies);

    // 3. Call service
    const result = await service.doSomething(validatedInput);

    // 4. Handle result
    if (isFailure(result)) {
      return handleError(result.error);
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      warnings: result.warnings,
    });
  } catch (error) {
    return handleError(error);
  }
}
```

**Deliverable:** API routes working, returning proper responses

---

### Backend Hour 5-6: Testing

**Tests to write:**
1. Validation tests (`__tests__/validation/`)
   - NPI validator (valid, invalid checksum, wrong format)
   - ICD-10 validator (valid, invalid, edge cases)
   - Zod schemas (all fields, edge cases)

2. Service tests (`__tests__/services/`)
   - PatientService (create patient, duplicate detection, warnings)
   - CarePlanService (generation, retry logic, timeouts)
   - DuplicateDetector (fuzzy matching, scores)

3. API integration tests (`__tests__/api/`)
   - POST /api/patients (success, validation errors, duplicate errors)
   - POST /api/care-plans (success, not found, LLM failures)

**Mock strategy:**
- Mock Prisma client for service tests
- Mock services for API route tests
- Use test database for integration tests

**Deliverable:** Critical paths covered with tests

---

## Phase 2B: Frontend Track (6-7 hours)

**Who:** Frontend developer (or solo developer alternating between tracks)

**Dependencies:** Phase 1 complete (types, contracts, MSW mocks)

**Deliverable:** Working UI that interacts with MSW mocks

---

### Frontend Hour 1: Client API Layer

**1. API Wrapper** (`lib/client/api.ts`):

```typescript
import {
  CreatePatientRequest,
  CreatePatientResponse,
  GenerateCarePlanRequest,
  GenerateCarePlanResponse,
  GetPatientResponse,
} from '@/lib/api/contracts';

export async function createPatient(
  data: CreatePatientRequest
): Promise<CreatePatientResponse> {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create patient');
  }

  return response.json();
}

export async function generateCarePlan(
  data: GenerateCarePlanRequest
): Promise<GenerateCarePlanResponse> {
  const response = await fetch('/api/care-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate care plan');
  }

  return response.json();
}

export async function getPatient(id: string): Promise<GetPatientResponse> {
  const response = await fetch(`/api/patients/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch patient');
  }

  return response.json();
}
```

**2. React Query Hooks** (optional but recommended):

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import * as api from '@/lib/client/api';

export function useCreatePatient() {
  return useMutation({
    mutationFn: api.createPatient,
  });
}

export function useGenerateCarePlan() {
  return useMutation({
    mutationFn: api.generateCarePlan,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.getPatient(id),
  });
}
```

**Deliverable:** Type-safe API client ready for use in components

---

### Frontend Hour 2-3: Core Components

**1. Patient Form** (`components/PatientForm.tsx`):

**Features:**
- React Hook Form with Zod resolver
- Inline validation errors
- Loading states
- Success/error handling
- Warning modal display

**Pattern:**
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientInputSchema } from '@/lib/validation/schemas';
import { useCreatePatient } from '@/lib/client/hooks';

export function PatientForm() {
  const createPatient = useCreatePatient();

  const form = useForm({
    resolver: zodResolver(PatientInputSchema),
    defaultValues: { ... },
  });

  async function onSubmit(data) {
    try {
      const result = await createPatient.mutateAsync(data);
      // Handle success + warnings
    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

**2. Warning List** (`components/WarningList.tsx`):

**Features:**
- Type-safe handling of different warning types (discriminated union)
- Different icons/colors per severity
- Expandable details
- Action buttons (Continue, Cancel)

**3. Care Plan View** (`components/CarePlanView.tsx`):

**Features:**
- Markdown rendering
- Download button
- Print button
- Loading skeleton during generation

**Deliverable:** Core components working with MSW mocks

---

### Frontend Hour 4-5: Pages & Integration

**1. New Patient Page** (`app/patients/new/page.tsx`):

```typescript
import { PatientForm } from '@/components/PatientForm';

export default function NewPatientPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">New Patient</h1>
      <PatientForm />
    </div>
  );
}
```

**2. Patient Detail Page** (`app/patients/[id]/page.tsx`):

```typescript
'use client';

import { usePatient } from '@/lib/client/hooks';
import { CarePlanView } from '@/components/CarePlanView';

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = usePatient(params.id);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8">
      {/* Patient info display */}
      {/* Orders list */}
      {/* Care plans */}
    </div>
  );
}
```

**3. Layout & Navigation** (`app/layout.tsx`):

- React Query provider
- MSW initialization (dev only)
- Global styles
- Navigation header

**Deliverable:** Full user flow working with MSW mocks

---

### Frontend Hour 6: Polish & Testing

**Tasks:**
1. Styling consistency (Linear-inspired aesthetic)
2. Loading states everywhere
3. Error boundaries
4. Responsive design basics
5. Component tests (form validation, warning display)

**Deliverable:** Polished UI ready for backend integration

---

## Phase 3: Integration (1 hour)

**Goal:** Connect frontend to real backend and fix any contract mismatches.

**Who:** Both developers together

---

### Integration Tasks

**1. Disable MSW** (or keep for testing):
```typescript
// Only enable MSW if explicitly set
if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
  // ... MSW setup
}
```

**2. Test end-to-end flows:**
- Create patient with real database
- Verify warnings appear correctly
- Generate care plan with real LLM
- Download care plan
- Check all error states

**3. Fix any contract mismatches:**
- TypeScript will catch most issues
- Test edge cases (empty arrays, null values, etc.)
- Verify error responses match contract

**4. Performance check:**
- Database queries efficient?
- LLM calls have timeouts?
- UI responsive?

**Deliverable:** Fully integrated application

---

## Phase 4: Final Polish (1 hour)

**Tasks:**
1. Add example patient data seeds
2. Update README with setup instructions
3. Environment variable validation
4. Final testing pass
5. Demo script preparation

**Deliverable:** Production-ready codebase for demo

---

## Coordination Points for Parallel Work

**When working in parallel, sync at these checkpoints:**

| Time | Checkpoint | Action |
|------|------------|--------|
| **After Phase 1 (2h)** | Contract verification | Both confirm types match expectations, no questions |
| **Mid-development (4h)** | Quick sync | Any contract changes needed? Any blockers? |
| **Before integration (7-8h)** | Pre-integration review | Backend: APIs work. Frontend: Mocks work. |
| **Integration (9h)** | Joint integration | Debug contract mismatches together |

---

## Time Estimates Summary

| Phase | Backend Track | Frontend Track | Combined (Parallel) | Sequential |
|-------|---------------|----------------|---------------------|------------|
| **Phase 1: Foundation** | 2h | 2h | 2h | 2h |
| **Phase 2: Development** | 6-7h | 6-7h | 6-7h | 13-14h |
| **Phase 3: Integration** | 1h | 1h | 1h | - |
| **Phase 4: Polish** | 0.5h | 0.5h | 1h | 1h |
| **TOTAL** | 9.5-10.5h | 9.5-10.5h | **10-11h** | **16-17h** |

**Savings:** 30-40% time reduction with parallel development

---

## Success Criteria

### Backend Track Complete When:
- ✅ All API routes return correct responses
- ✅ Validation catches all error cases
- ✅ Duplicate detection works with fuzzy matching
- ✅ Care plans generate with retry logic
- ✅ Tests pass for critical paths
- ✅ Logging is comprehensive

### Frontend Track Complete When:
- ✅ All pages render correctly
- ✅ Forms validate on submit
- ✅ Warnings display properly
- ✅ Loading/error states handled
- ✅ MSW mocks work reliably
- ✅ Styling matches Linear aesthetic

### Integration Complete When:
- ✅ Frontend connects to real backend
- ✅ No contract mismatches
- ✅ End-to-end flows work
- ✅ Error handling works correctly
- ✅ Performance is acceptable

---

## What a CTO Will Notice

**During demo:**
- ✅ "Wow, this actually works end-to-end"
- ✅ "The warnings are actually helpful, not just logging"
- ✅ "The UI is surprisingly polished for a technical assessment"
- ✅ "The error messages are professional"

**During code review:**
- ✅ "Every file follows the same patterns"
- ✅ "The separation allows for parallel development"
- ✅ "The architecture is testable"
- ✅ "This person thinks about team scalability"

**During technical discussion:**
- ✅ "They understand contract-driven development"
- ✅ "They've used modern tooling (MSW, React Query)"
- ✅ "They made deliberate architectural choices"
- ✅ "They balanced speed with quality"

---

## Final Thoughts

**This roadmap demonstrates:**
1. **Modern workflows** — Contract-driven development, MSW mocking
2. **Architectural thinking** — Designed for parallel work from day 1
3. **Speed without shortcuts** — Quality maintained in both tracks
4. **Team scalability** — Shows understanding of real-world development

**Not because of fancy features, but because of thoughtful design.**

---

**End of Roadmap**

*This roadmap represents a commitment to both speed and quality. The parallel approach demonstrates senior-level judgment: knowing when parallelization provides value, and how to structure code to enable it.*
