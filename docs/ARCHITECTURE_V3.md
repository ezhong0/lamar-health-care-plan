# Care Plan Generator - Architecture Document
**Author:** Edward Zhong
**Version:** 3.0 - Quality-First Architecture
**Date:** 2025-10-27
**Timeline:** 10-12 hours for consistent excellence

---

## Executive Summary

### The Core Philosophy

> **Sophistication isn't about adding fancy features to basic code.**
>
> **Sophistication is architectural quality applied consistently throughout.**

This architecture demonstrates senior-level engineering through:
- ✅ **Consistent quality** across all features (not just "wow" features)
- ✅ **Clean boundaries** between layers (domain, service, infrastructure)
- ✅ **Production patterns** applied to prototype code
- ✅ **Maintainable design** that other engineers can understand and modify

**What we're NOT doing:**
- ❌ Basic implementation of everything + 3 fancy algorithms
- ❌ Inconsistent quality (some files great, some files rushed)
- ❌ Resume-driven development (adding cool features for impressiveness)

**What we ARE doing:**
- ✅ Core features (P0 + P1) implemented with production-quality patterns
- ✅ Every file demonstrates architectural discipline
- ✅ Code that senior engineers would be proud to maintain

---

## System Overview

### What We're Building

A web application for specialty pharmacies to:
1. Input patient information with validated forms
2. Detect duplicate patients, orders, and provider conflicts (warnings)
3. Generate AI-powered pharmacist care plans
4. Export data for pharmaceutical company reporting

### Key Features

**P0 (Core - 6 hours):**
- Patient form with comprehensive validation
- Database persistence with proper transactions
- LLM care plan generation with resilience
- Display and download care plans

**P1 (Validation - 4 hours):**
- Duplicate patient detection (fuzzy matching)
- Duplicate order detection
- Provider conflict detection
- Warning UI with clear user flow

**Quality Throughout (Built-in):**
- Domain-driven structure
- Type-safe error handling
- Comprehensive logging
- Strategic testing
- Resilient external calls

---

## Architectural Philosophy

### Why Clean Architecture Matters

**Most technical assessments look like this:**

```
app/api/patients/route.ts (400 lines)
├── Request parsing
├── Validation logic
├── Duplicate detection algorithm
├── Database calls
├── LLM prompting
└── Response formatting

Result: Works, but unmaintainable
```

**This architecture looks like this:**

```
app/api/patients/route.ts (50 lines)
└── Delegates to PatientService

lib/services/patient-service.ts (120 lines)
└── Orchestrates domain operations

lib/domain/
├── patient.ts (domain logic)
├── order.ts (domain logic)
└── provider.ts (domain logic)

Result: Works AND maintainable
```

**The difference:** Clear responsibilities, testable components, obvious structure.

---

## Layered Architecture

### The Three Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      INTERFACE LAYER                            │
│                   (Next.js App Router)                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ API Routes   │  │ Server       │  │ Client       │        │
│  │              │  │ Components   │  │ Components   │        │
│  │ - Parse req  │  │ - Fetch data │  │ - Forms      │        │
│  │ - Validate   │  │ - Pass props │  │ - Display    │        │
│  │ - Call svc   │  │              │  │ - Interact   │        │
│  │ - Format res │  │              │  │              │        │
│  └──────┬───────┘  └──────────────┘  └──────────────┘        │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                               │
│              (Application Orchestration)                        │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ PatientService       │  │ CarePlanService      │           │
│  │ - createPatient()    │  │ - generate()         │           │
│  │ - updatePatient()    │  │ - retry logic        │           │
│  │ - orchestrate flow   │  │ - timeout handling   │           │
│  └───────┬──────────────┘  └──────────────────────┘           │
│          │                                                      │
│  ┌───────┴──────────────┐  ┌──────────────────────┐           │
│  │ DuplicateDetector    │  │ ProviderService      │           │
│  │ - check duplicates   │  │ - upsert provider    │           │
│  │ - calculate scores   │  │ - validate NPI       │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                                │
│                 (Business Logic & Rules)                        │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Domain Entities      │  │ Domain Errors        │           │
│  │ - Patient            │  │ - DuplicateError     │           │
│  │ - Order              │  │ - ValidationError    │           │
│  │ - Provider           │  │ - ConflictError      │           │
│  │ - CarePlan           │  │                      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Validation           │  │ Result Types         │           │
│  │ - Zod schemas        │  │ - Success<T>         │           │
│  │ - NPI validator      │  │ - Failure<E>         │           │
│  │ - ICD-10 validator   │  │ - Warning types      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                           │
│              (External Dependencies)                            │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Database (Prisma)    │  │ LLM Client           │           │
│  │ - Repositories       │  │ (Anthropic)          │           │
│  │ - Transactions       │  │ - Retry wrapper      │           │
│  │ - Migrations         │  │ - Timeout handling   │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ Logger               │  │ Metrics              │           │
│  │ - Structured logging │  │ (future)             │           │
│  │ - Context injection  │  │                      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Responsibility | Does NOT |
|-------|---------------|----------|
| **Interface** | Parse requests, format responses, render UI | Business logic, validation rules |
| **Service** | Orchestrate operations, handle transactions | Domain rules, infrastructure details |
| **Domain** | Business rules, validation, types | Database calls, HTTP, external APIs |
| **Infrastructure** | External systems (DB, APIs, logging) | Business logic, orchestration |

**Key Principle:** Dependency flows inward. Infrastructure depends on domain, not vice versa.

---

## Parallel Development Strategy

### Why This Architecture Enables Parallel Work

This layered architecture naturally supports **frontend and backend development in parallel** because:

1. **Clear Contracts:** Domain types and API contracts act as the interface between teams
2. **Independent Layers:** Frontend (components, pages) and backend (services, infrastructure) live in separate directories
3. **Minimal Dependencies:** Frontend depends only on types and API contracts, not implementation
4. **Testable Isolation:** Both tracks can test independently (MSW for frontend, mock DB for backend)

### Three-Phase Parallel Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: SHARED FOUNDATION (2h)              │
│                                                                 │
│  Both developers work together to establish contracts:         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ • Domain types (Patient, Order, Provider, CarePlan)      │ │
│  │ • Result & Warning types                                 │ │
│  │ • Zod validation schemas                                 │ │
│  │ • API contracts (request/response types)                 │ │
│  │ • MSW mock setup for frontend                            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                            ↓ SPLIT ↓

┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│  PHASE 2: BACKEND TRACK (6-7h)  │  │  PHASE 2: FRONTEND TRACK (6-7h) │
│                                 │  │                                 │
│  Infrastructure Layer:          │  │  Component Library:             │
│  • Prisma client                │  │  • PatientForm                  │
│  • Logger                       │  │  • WarningList                  │
│  • Retry utility                │  │  • CarePlanView                 │
│  • Error handler                │  │                                 │
│                                 │  │  Pages:                         │
│  Service Layer:                 │  │  • New patient page             │
│  • PatientService               │  │  • Patient detail page          │
│  • CarePlanService              │  │                                 │
│  • DuplicateDetector            │  │  Client API:                    │
│  • ProviderService              │  │  • API wrapper functions        │
│                                 │  │  • React Query hooks            │
│  API Routes:                    │  │                                 │
│  • POST /api/patients           │  │  Mocking:                       │
│  • POST /api/care-plans         │  │  • MSW handlers                 │
│                                 │  │  • Mock data generators         │
│  Tests:                         │  │                                 │
│  • Service layer tests          │  │  Tests:                         │
│  • Validation tests             │  │  • Component tests              │
│  • API integration tests        │  │  • Form validation tests        │
│                                 │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘

                            ↓ MERGE ↓

┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: INTEGRATION (1h)                    │
│                                                                 │
│  • Remove/disable MSW (or keep for testing)                    │
│  • Connect frontend to real backend                            │
│  • Fix any contract mismatches                                │
│  • End-to-end testing                                          │
│  • Final polish                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Contract Definition

**Critical for parallel work:** Define request/response types before splitting.

```typescript
// lib/api/contracts.ts

import { Patient, CarePlan, Warning } from '@/lib/domain/types';

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

### Frontend Mock Setup (MSW)

**Enables frontend development without backend:**

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { CreatePatientResponse } from '@/lib/api/contracts';

export const handlers = [
  // Mock patient creation
  http.post('/api/patients', async ({ request }) => {
    const body = await request.json();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return realistic mock response
    return HttpResponse.json<CreatePatientResponse>({
      success: true,
      data: {
        patient: {
          id: 'mock-patient-id',
          firstName: body.firstName,
          lastName: body.lastName,
          mrn: body.mrn,
          // ... rest of fields
        },
        warnings: [
          {
            type: 'SIMILAR_PATIENT',
            severity: 'medium',
            message: 'Similar patient found',
            similarPatient: {
              id: 'existing-id',
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

    return HttpResponse.json({
      success: true,
      data: {
        carePlan: {
          id: 'mock-careplan-id',
          content: '## Problem List\n\n1. Need for rapid immunomodulation...',
          generatedBy: 'claude-3-5-sonnet-20241022',
          createdAt: new Date().toISOString(),
        },
      },
    });
  }),
];
```

### Coordination Points

**When working in parallel, sync at these points:**

| Checkpoint | Trigger | Action |
|------------|---------|--------|
| **Contract Verification** | After Phase 1 | Both developers confirm types match expectations |
| **Mid-Development Sync** | After 3-4 hours | Quick check: any contract changes needed? |
| **Pre-Integration Review** | Before Phase 3 | Backend: API routes ready. Frontend: Mock tests passing |
| **Integration Testing** | Phase 3 | Joint debugging of any contract mismatches |

### Trade-offs: Sequential vs Parallel

| Aspect | Sequential | Parallel |
|--------|-----------|----------|
| **Total Time** | 14-15 hours | 10-11 hours |
| **Coordination Overhead** | Low | Medium (contract definition upfront) |
| **Risk of Rework** | Low | Medium (if contracts change) |
| **Visual Progress** | Late (UI at end) | Early (UI works with mocks) |
| **Testing Isolation** | Sequential integration | Independent testing |
| **Team Scalability** | Doesn't scale | Scales to 2+ developers |

**For this assessment:** Parallel development demonstrates:
- ✅ Modern development workflows (contract-driven development)
- ✅ Architectural thinking (designed for parallel work)
- ✅ Faster delivery (30% time savings)
- ✅ Senior-level judgment (knowing when to parallelize)

---

## Data Model

### Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         PATIENTS                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id                 string (PK)                            │ │
│  │ first_name         string                                │ │
│  │ last_name          string                                │ │
│  │ mrn                string (UNIQUE)                       │ │
│  │ additional_diagnoses  text[]                            │ │
│  │ medication_history    text[]                            │ │
│  │ patient_records    text                                  │ │
│  │ created_at         timestamp                             │ │
│  │ updated_at         timestamp                             │ │
│  └────────────────┬─────────────────────────────────────────┘ │
└─────────────────┬─┴─────────────────────────────────────────────┘
                  │
                  │ 1:N
                  ▼
┌────────────────────────────────────────────────────────────────┐
│                          ORDERS                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id                 string (PK)                            │ │
│  │ patient_id         string (FK → patients)               │ │
│  │ provider_id        string (FK → providers)              │ │
│  │ medication_name    string                                │ │
│  │ primary_diagnosis  string (ICD-10)                      │ │
│  │ status             enum (pending, fulfilled, cancelled)  │ │
│  │ created_at         timestamp                             │ │
│  └────────────────┬─────────────────────────────────────────┘ │
└───────────────────┼───────────────────────────────────────────┘
                    │
                    │ N:1
                    ▼
┌────────────────────────────────────────────────────────────────┐
│                        PROVIDERS                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id                 string (PK)                            │ │
│  │ name               string                                │ │
│  │ npi                string(10) (UNIQUE)                   │ │
│  │ created_at         timestamp                             │ │
│  │ updated_at         timestamp                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                       CARE_PLANS                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ id                 string (PK)                            │ │
│  │ patient_id         string (FK → patients)               │ │
│  │ content            text (markdown)                       │ │
│  │ generated_by       string                                │ │
│  │ created_at         timestamp                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

Indexes:
  patients: UNIQUE(mrn), GIN(first_name gin_trgm_ops), GIN(last_name gin_trgm_ops)
  orders: INDEX(patient_id, medication_name), INDEX(provider_id)
  providers: UNIQUE(npi)
  care_plans: INDEX(patient_id, created_at DESC)
```

### Schema Design Rationale

**Order Model (Separate from Patient):**

**Why:**
- Requirements: "Same patient can have multiple orders with different medications"
- Requirements: "Duplicate order = same patient + same medication"
- Enables proper duplicate order detection
- Links orders to providers for pharmaceutical reporting

**Trade-off:**
- ✅ Supports business requirements correctly
- ✅ Clean data model (normalized)
- ✅ Easy to query orders independently
- ❌ Requires join for patient + orders display

**Alternative Considered:** Medication as array in Patient → Can't detect duplicate orders properly

---

**Provider Normalization:**

**Why:**
- Requirements: "Very important that provider only be entered once in system"
- NPI is unique government identifier
- Pharmaceutical reporting requires clean provider data

**Trade-off:**
- ✅ Referential integrity
- ✅ Conflict detection (upsert validates name matches NPI)
- ✅ Clean export data
- ❌ Extra table and FK management

**Alternative Considered:** Provider embedded in Order → Data duplication, inconsistency

---

**Arrays for Diagnoses/History:**

**Why:**
- PostgreSQL native array support
- Read-heavy access (display, care plan generation)
- Small lists (typically 2-5 items)

**Trade-off:**
- ✅ Simple schema
- ✅ Fast reads (no joins)
- ✅ Atomic updates
- ❌ Can't query "all patients with diagnosis X" efficiently

**Alternative Considered:** Separate diagnosis table → Overkill for prototype, but would use for production analytics

---

## Quality Dimensions

### 1. Type Safety

**Philosophy:** Use TypeScript's type system to make errors impossible, not just unlikely.

#### Domain Types (Separate from Database Types)

```typescript
// lib/domain/types.ts

// Branded types for IDs (prevents mixing patient ID with order ID)
export type PatientId = string & { readonly __brand: 'PatientId' };
export type OrderId = string & { readonly __brand: 'OrderId' };
export type ProviderId = string & { readonly __brand: 'ProviderId' };

export function toPatientId(id: string): PatientId {
  return id as PatientId;
}

// Domain entities (what we think about in business logic)
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
```

**Why this matters:**
- Can't accidentally pass OrderId where PatientId expected
- Domain types are independent of database schema
- Easy to add computed fields without DB changes

---

#### Result Types (Explicit Success/Failure)

```typescript
// lib/domain/result.ts

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

// Type guards
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

// Usage forces error handling
const result = await patientService.createPatient(input);

if (isFailure(result)) {
  // TypeScript knows result.error exists
  return handleError(result.error);
}

// TypeScript knows result.data exists
const { data: patient, warnings } = result;
```

**Why this matters:**
- Can't ignore errors (compile-time enforcement)
- No try/catch for business logic errors (only unexpected errors)
- Clear separation: expected failures vs unexpected exceptions

---

#### Discriminated Unions for Variants

```typescript
// lib/domain/warnings.ts

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

// Type-safe handling with exhaustive checking
function renderWarning(warning: Warning) {
  switch (warning.type) {
    case 'DUPLICATE_PATIENT':
      return <DuplicatePatientAlert warning={warning} />;
    case 'DUPLICATE_ORDER':
      return <DuplicateOrderAlert warning={warning} />;
    case 'PROVIDER_CONFLICT':
      return <ProviderConflictAlert warning={warning} />;
    case 'SIMILAR_PATIENT':
      return <SimilarPatientAlert warning={warning} />;
    // If we add a new warning type and forget to handle it, TypeScript errors
  }
}
```

**Why this matters:**
- Each warning type has its own shape
- Can't access fields that don't exist on that variant
- Compiler ensures all cases handled

---

### 2. Error Handling

**Philosophy:** Errors are part of the domain. Model them explicitly.

#### Domain-Specific Errors

```typescript
// lib/domain/errors.ts

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

---

#### Centralized Error Handler

```typescript
// lib/infrastructure/error-handler.ts

import { NextResponse } from 'next/server';
import { DomainError } from '@/lib/domain/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

export function handleError(error: unknown): NextResponse {
  // Domain errors (expected)
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

  // Validation errors
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

  // Database errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error('Database error', { code: error.code, message: error.message });

    // P2002: Unique constraint violation
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

    // P2025: Record not found
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

  // Unexpected errors (log with full details)
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

**Why this matters:**
- Consistent error response format
- Machine-readable error codes
- Appropriate logging (warn for expected, error for unexpected)
- User-friendly messages

---

### 3. Service Layer Design

**Philosophy:** Services orchestrate, they don't implement business logic.

#### Patient Service

```typescript
// lib/services/patient-service.ts

import { PrismaClient } from '@prisma/client';
import { Result, Success, Failure } from '@/lib/domain/result';
import { Patient, PatientId, toPatientId } from '@/lib/domain/types';
import { Warning } from '@/lib/domain/warnings';
import { DuplicatePatientError } from '@/lib/domain/errors';
import { DuplicateDetector } from './duplicate-detector';
import { ProviderService } from './provider-service';
import { PatientInput } from '@/lib/validation/schemas';
import { logger } from '@/lib/infrastructure/logger';

export class PatientService {
  constructor(
    private readonly db: PrismaClient,
    private readonly duplicateDetector: DuplicateDetector,
    private readonly providerService: ProviderService
  ) {}

  async createPatient(input: PatientInput): Promise<Result<{ patient: Patient; warnings: Warning[] }>> {
    const startTime = Date.now();

    try {
      logger.info('Creating patient', { mrn: input.mrn });

      const result = await this.db.$transaction(async (tx) => {
        // 1. Check for exact duplicate by MRN
        const existingPatient = await tx.patient.findUnique({
          where: { mrn: input.mrn },
        });

        if (existingPatient) {
          throw new DuplicatePatientError({
            mrn: existingPatient.mrn,
            firstName: existingPatient.firstName,
            lastName: existingPatient.lastName,
          });
        }

        // 2. Check for similar patients (warnings, not errors)
        const warnings = await this.duplicateDetector.findSimilarPatients(input, tx);

        // 3. Upsert provider and validate
        const provider = await this.providerService.upsertProvider(
          {
            name: input.referringProvider,
            npi: input.referringProviderNPI,
          },
          tx
        );

        // 4. Create patient
        const patientRecord = await tx.patient.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            mrn: input.mrn,
            additionalDiagnoses: input.additionalDiagnoses,
            medicationHistory: input.medicationHistory,
            patientRecords: input.patientRecords,
          },
        });

        // 5. Create order
        const orderRecord = await tx.order.create({
          data: {
            patientId: patientRecord.id,
            providerId: provider.id,
            medicationName: input.medicationName,
            primaryDiagnosis: input.primaryDiagnosis,
            status: 'pending',
          },
        });

        // 6. Check for duplicate orders
        const duplicateOrderWarnings = await this.duplicateDetector.findDuplicateOrders(
          toPatientId(patientRecord.id),
          input.medicationName,
          tx
        );

        const patient: Patient = {
          id: toPatientId(patientRecord.id),
          firstName: patientRecord.firstName,
          lastName: patientRecord.lastName,
          mrn: patientRecord.mrn,
          additionalDiagnoses: patientRecord.additionalDiagnoses,
          medicationHistory: patientRecord.medicationHistory,
          patientRecords: patientRecord.patientRecords,
          createdAt: patientRecord.createdAt,
          updatedAt: patientRecord.updatedAt,
        };

        return {
          patient,
          warnings: [...warnings, ...duplicateOrderWarnings],
        };
      });

      const duration = Date.now() - startTime;
      logger.info('Patient created successfully', {
        patientId: result.patient.id,
        mrn: result.patient.mrn,
        warningCount: result.warnings.length,
        duration,
      });

      return {
        success: true,
        data: result,
        warnings: result.warnings,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof DuplicatePatientError) {
        logger.warn('Duplicate patient detected', {
          mrn: input.mrn,
          duration,
        });

        return {
          success: false,
          error,
        };
      }

      logger.error('Failed to create patient', {
        mrn: input.mrn,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  async getPatient(id: PatientId): Promise<Result<Patient>> {
    try {
      const patientRecord = await this.db.patient.findUnique({
        where: { id },
      });

      if (!patientRecord) {
        return {
          success: false,
          error: new PatientNotFoundError(id),
        };
      }

      const patient: Patient = {
        id: toPatientId(patientRecord.id),
        firstName: patientRecord.firstName,
        lastName: patientRecord.lastName,
        mrn: patientRecord.mrn,
        additionalDiagnoses: patientRecord.additionalDiagnoses,
        medicationHistory: patientRecord.medicationHistory,
        patientRecords: patientRecord.patientRecords,
        createdAt: patientRecord.createdAt,
        updatedAt: patientRecord.updatedAt,
      };

      return {
        success: true,
        data: patient,
      };
    } catch (error) {
      logger.error('Failed to get patient', {
        patientId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }
}
```

**What makes this excellent:**
- ✅ Dependency injection (testable)
- ✅ Transaction management (data integrity)
- ✅ Comprehensive logging with context
- ✅ Result types (explicit error handling)
- ✅ Single responsibility (orchestration, not implementation)
- ✅ Duration tracking (performance awareness)

---

### 4. Resilient External Calls

**Philosophy:** External systems fail. Design for it.

#### LLM Service with Resilience

```typescript
// lib/services/care-plan-service.ts

import Anthropic from '@anthropic-ai/sdk';
import { Result } from '@/lib/domain/result';
import { CarePlan, PatientId } from '@/lib/domain/types';
import { CarePlanGenerationError } from '@/lib/domain/errors';
import { logger } from '@/lib/infrastructure/logger';
import { retry, RetryOptions } from '@/lib/infrastructure/retry';

export class CarePlanService {
  private readonly anthropic: Anthropic;

  constructor(
    private readonly db: PrismaClient,
    apiKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async generateCarePlan(patientId: PatientId): Promise<Result<CarePlan>> {
    const startTime = Date.now();

    try {
      logger.info('Generating care plan', { patientId });

      // 1. Fetch patient data
      const patient = await this.getPatientWithOrders(patientId);

      if (!patient) {
        return {
          success: false,
          error: new PatientNotFoundError(patientId),
        };
      }

      // 2. Call LLM with retry and timeout
      const content = await this.callLLMWithResilience(patient);

      // 3. Save care plan
      const carePlanRecord = await this.db.carePlan.create({
        data: {
          patientId,
          content,
          generatedBy: 'claude-3-5-sonnet-20241022',
        },
      });

      const duration = Date.now() - startTime;
      logger.info('Care plan generated successfully', {
        patientId,
        carePlanId: carePlanRecord.id,
        contentLength: content.length,
        duration,
      });

      return {
        success: true,
        data: {
          id: carePlanRecord.id,
          patientId: toPatientId(carePlanRecord.patientId),
          content: carePlanRecord.content,
          generatedBy: carePlanRecord.generatedBy,
          createdAt: carePlanRecord.createdAt,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Care plan generation failed', {
        patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      return {
        success: false,
        error: new CarePlanGenerationError(
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        ),
      };
    }
  }

  private async callLLMWithResilience(patient: PatientWithOrders): Promise<string> {
    const retryOptions: RetryOptions = {
      attempts: 3,
      delay: 1000,
      backoff: 2,
      onRetry: (error, attempt) => {
        logger.warn('LLM call failed, retrying', {
          patientId: patient.id,
          attempt,
          error: error.message,
        });
      },
    };

    return await retry(
      () => this.callLLMWithTimeout(patient),
      retryOptions
    );
  }

  private async callLLMWithTimeout(patient: PatientWithOrders): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn('LLM request timeout', { patientId: patient.id });
    }, 30000); // 30s timeout

    try {
      const prompt = this.buildPrompt(patient);

      const response = await this.anthropic.messages.create(
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM request timed out after 30 seconds');
      }

      throw error;
    }
  }

  private buildPrompt(patient: PatientWithOrders): string {
    const order = patient.orders[0]; // Current order

    return `You are a clinical pharmacist creating a care plan for IVIG therapy.

Patient Information:
- Name: ${patient.firstName} ${patient.lastName}
- MRN: ${patient.mrn}
- Primary Diagnosis: ${order.primaryDiagnosis}
- Additional Diagnoses: ${patient.additionalDiagnoses.join(', ') || 'None'}
- Current Medications: ${patient.medicationHistory.join(', ') || 'None'}
- Medication for this order: ${order.medicationName}

Clinical Records:
${patient.patientRecords}

Generate a comprehensive pharmacist care plan following this structure:

## Problem List / Drug Therapy Problems (DTPs)
[4-6 problems related to drug therapy]

## SMART Goals
[3-4 specific, measurable, achievable, relevant, time-bound goals]

## Pharmacist Interventions / Plan
[Detailed interventions covering dosing, administration, monitoring, etc.]

## Monitoring Plan & Lab Schedule
[Table with parameters, frequency, thresholds, documentation]

Be specific and clinically detailed. Use professional pharmacist language.`;
  }

  private async getPatientWithOrders(patientId: PatientId) {
    return await this.db.patient.findUnique({
      where: { id: patientId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }
}
```

---

#### Retry Utility

```typescript
// lib/infrastructure/retry.ts

export interface RetryOptions {
  attempts: number;
  delay: number; // Initial delay in ms
  backoff: number; // Multiplier for exponential backoff
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

**What makes this excellent:**
- ✅ Retry with exponential backoff
- ✅ Timeout handling
- ✅ Graceful degradation
- ✅ Comprehensive logging
- ✅ Callback for retry events
- ✅ Type-safe

---

### 5. Logging & Observability

**Philosophy:** You can't fix what you can't see.

#### Structured Logger

```typescript
// lib/infrastructure/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel = 'info';

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

    // In production, would send to structured logging service (Datadog, CloudWatch, etc.)
    // For now, pretty print to console
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

**Usage throughout codebase:**

```typescript
// Every significant operation logs:
logger.info('Operation starting', { userId, resourceId });

// Success:
logger.info('Operation completed', { userId, resourceId, duration });

// Expected errors:
logger.warn('Validation failed', { userId, errors });

// Unexpected errors:
logger.error('Unexpected error', { userId, error: err.message, stack: err.stack });
```

**Why this matters:**
- ✅ Machine-readable (JSON)
- ✅ Context included (can trace requests)
- ✅ Consistent format
- ✅ Production-ready (easy to pipe to log aggregator)

---

## Project Structure

```
lamar-health/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Version-controlled DB changes
│
├── src/
│   ├── app/                       # Next.js app router (interface layer)
│   │   ├── api/
│   │   │   ├── patients/
│   │   │   │   └── route.ts       # POST /api/patients
│   │   │   └── care-plans/
│   │   │       └── route.ts       # POST /api/care-plans
│   │   │
│   │   ├── patients/
│   │   │   ├── new/
│   │   │   │   └── page.tsx       # Patient creation form
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Patient detail page
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── lib/
│   │   ├── api/                   # API contracts (shared by FE/BE)
│   │   │   └── contracts.ts       # Request/response types
│   │   │
│   │   ├── domain/                # Domain layer (business logic)
│   │   │   ├── types.ts           # Domain entities (Patient, Order, etc.)
│   │   │   ├── errors.ts          # Domain-specific errors
│   │   │   ├── result.ts          # Result type
│   │   │   └── warnings.ts        # Warning types
│   │   │
│   │   ├── services/              # Service layer (orchestration)
│   │   │   ├── patient-service.ts
│   │   │   ├── care-plan-service.ts
│   │   │   ├── duplicate-detector.ts
│   │   │   └── provider-service.ts
│   │   │
│   │   ├── validation/            # Validation
│   │   │   ├── schemas.ts         # Zod schemas
│   │   │   ├── npi-validator.ts   # NPI Luhn algorithm
│   │   │   └── icd10-validator.ts # ICD-10 structure validation
│   │   │
│   │   ├── client/                # Frontend API client
│   │   │   └── api.ts             # API wrapper functions
│   │   │
│   │   └── infrastructure/        # Infrastructure layer
│   │       ├── db.ts              # Prisma client singleton
│   │       ├── logger.ts          # Structured logging
│   │       ├── retry.ts           # Retry utility
│   │       └── error-handler.ts   # Centralized error handling
│   │
│   ├── components/                # React components (interface layer)
│   │   ├── ui/                    # shadcn/ui base components
│   │   ├── PatientForm.tsx
│   │   ├── WarningList.tsx
│   │   └── CarePlanView.tsx
│   │
│   └── mocks/                     # MSW mocks for frontend development
│       ├── handlers.ts            # API mock handlers
│       ├── browser.ts             # Browser mock setup
│       └── data.ts                # Mock data generators
│
├── __tests__/                     # Tests (co-located with source preferred)
│   ├── services/
│   ├── validation/
│   └── api/
│
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Why this structure:**
- ✅ Clear layers (domain, service, infrastructure)
- ✅ Easy to find things ("where does X live?")
- ✅ Testable (each layer can be tested independently)
- ✅ Follows dependency rule (dependencies flow inward)
- ✅ No circular dependencies possible

---

## Implementation Roadmap

### Two Approaches: Sequential vs Parallel

**Sequential Timeline:** 14-15 hours (single developer, end-to-end)
**Parallel Timeline:** 10-11 hours (two developers working simultaneously)

See detailed roadmap in `ROADMAP.md` for phase-by-phase breakdown.

---

### High-Level Parallel Approach

**Phase 1: Shared Foundation (2 hours)** — Both developers together
- Project setup (Next.js, Prisma, Docker)
- Domain types (Patient, Order, Provider, CarePlan)
- Result & Warning types
- Zod validation schemas
- **API contracts** (`lib/api/contracts.ts`)
- MSW mock setup
- Database schema and migrations

**Deliverable:** Clear contract between frontend and backend

---

**Phase 2: Parallel Development (6-7 hours)** — Independent work

**Backend Track:**
1. Infrastructure layer (logger, db, retry, error handler) — 1h
2. Services (Patient, CarePlan, Provider, Duplicate) — 3h
3. API routes (POST /api/patients, POST /api/care-plans) — 1h
4. Service & validation tests — 2h

**Frontend Track:**
1. Component library (PatientForm, WarningList, CarePlanView) — 3h
2. Pages (new patient, patient detail) — 2h
3. Client API wrapper with React Query — 1h
4. Component tests — 1h

**Deliverable:** Backend works with real DB, frontend works with MSW mocks

---

**Phase 3: Integration (1 hour)** — Joint work
- Remove/disable MSW (or keep for tests)
- Connect frontend to real backend
- Fix any contract mismatches
- End-to-end testing
- Final polish

**Deliverable:** Fully integrated, working application

---

### Why Parallel Development for This Assessment

**Benefits:**
- ✅ **30% faster** (10-11h vs 14-15h)
- ✅ **Early visual progress** (can demo UI with mocks immediately)
- ✅ **Demonstrates modern practices** (contract-driven development, MSW)
- ✅ **Shows architectural thinking** (designed for team scalability)
- ✅ **More realistic** (how actual teams work)

**Risks mitigated:**
- Clear API contracts defined upfront
- Type-safe interfaces prevent mismatches
- MSW mocks match real API shape
- Integration phase reserved for debugging

**For solo development:** Can still follow parallel approach by alternating between tracks (e.g., 1h backend, 1h frontend, repeat). Provides variety and allows mental context switching.

---

### Sequential Approach (Alternative)

If you prefer sequential development:
1. Foundation → Domain → Validation → Infrastructure (4h)
2. Services → API Routes → Tests (5h)
3. UI → Integration → Polish (5h)

**Total:** 14h

**When to use sequential:**
- Solo developer who prefers completing backend first
- Unfamiliar with MSW or mocking strategies
- Want to minimize coordination complexity

**Trade-off:** Slower delivery, no early visual feedback, but simpler mental model.

---

## What Makes This Architecture Exceptional

### 1. Consistent Quality

**Every file follows the same patterns:**
- Clear responsibilities
- Dependency injection
- Result types
- Comprehensive logging
- Error handling

**No quality variance:** Service layer is just as well-designed as domain layer.

---

### 2. Production Patterns in Prototype Code

**This isn't "prototype quality":**
- Retry logic with backoff
- Timeout handling
- Transaction management
- Structured logging
- Domain-specific errors

**But it's also not over-engineered:**
- No microservices
- No event sourcing
- No complex abstractions
- Just solid, clean code

---

### 3. Testable by Design

**Every layer can be tested independently:**
```typescript
// Test service without database
const mockDb = createMockDb();
const service = new PatientService(mockDb, mockDetector, mockProvider);

// Test validator without anything
expect(validateNPI('1234567893')).toBe(true);

// Test duplicate detector with test database
const detector = new DuplicateDetector(testDb);
```

---

### 4. Clear Boundaries

**You can answer:**
- "Where does validation live?" → `lib/validation/`
- "Where does business logic live?" → `lib/domain/` and `lib/services/`
- "Where do we call external APIs?" → `lib/infrastructure/` and `lib/services/`
- "Where is error handling?" → `lib/infrastructure/error-handler.ts` + domain errors

**New team member can navigate in 10 minutes.**

---

### 5. Type Safety Everywhere

**Compiler catches:**
- Passing wrong ID type
- Ignoring error cases
- Missing warning cases
- Accessing non-existent fields
- Null/undefined bugs

**Fewer runtime errors possible.**

---

## CTO Discussion Points

### "Why this architecture?"

> "I optimized for consistent engineering excellence over flashy features. Every file follows production patterns: dependency injection, result types, comprehensive logging, domain-specific errors. The architecture demonstrates that I can write maintainable code, not just code that works."

### "Why not just put everything in API routes?"

> "Clear boundaries make code maintainable. API routes are interface layer—they parse requests and format responses. Services orchestrate business operations. Domain layer contains business rules. This separation makes testing easy and changes localized. For a prototype, it adds maybe 20% more code, but that code is 10x easier to understand and modify."

### "Why Result types instead of throwing errors?"

> "Result types make errors explicit in the type system. You can't forget to handle errors—TypeScript forces you. Try/catch is for unexpected errors (infrastructure failures). Result types are for expected failures (validation, business rules). Makes error handling visible and type-safe."

### "How would this scale?"

> "Current architecture supports 100k patients easily. At 1M+: add read replicas, cache layer (Redis), background jobs for care plans. At 10M+: consider event-driven architecture, separate services, CQRS. But the layered architecture makes those changes easier—clear boundaries mean you can swap implementations without rewriting business logic."

### "Why not microservices?"

> "Microservices solve organizational problems (multiple teams) and scaling problems (different services scale differently). This prototype has neither problem. Microservices add: network latency, distributed transactions, deployment complexity, debugging difficulty. Monolith with clear boundaries gives 90% of benefits with 10% of complexity. Would reconsider at 5+ engineers or clear scaling bottlenecks."

### "How do you ensure quality?"

> "Three mechanisms: (1) Architecture—layered design forces separation. (2) Types—TypeScript + Result types catch errors at compile time. (3) Patterns—every service follows same structure (logging, error handling, transactions). New code naturally follows patterns because they're consistent and obvious."

---

## Production Considerations

**What we'd add for production (in priority order):**

### 1. Authentication & Authorization (Week 1)
- NextAuth.js with role-based access
- JWT sessions with secure cookies
- Middleware for protected routes
- Audit logging of access

### 2. Comprehensive Testing (Week 1)
- Increase coverage to 80%+
- E2E tests with Playwright
- Load testing with k6
- Contract tests for API

### 3. Observability (Week 2)
- APM (Datadog, New Relic)
- Error tracking (Sentry)
- Metrics (Prometheus)
- Distributed tracing

### 4. Background Jobs (Week 2)
- BullMQ or Trigger.dev
- Async care plan generation
- Job retry and failure handling
- Status polling UI

### 5. Caching (Week 2)
- Redis for care plan caching
- Patient data fingerprinting
- Cache invalidation strategy
- CDN for static assets

### 6. HIPAA Compliance (Week 3-4)
- Field-level encryption
- BAAs with vendors
- Audit logging
- Access controls
- De-identification for analytics

---

## Final Thoughts

**This architecture represents a philosophy:**

> Build production-quality code at prototype speed.

**How?**
- Clear patterns (easy to follow)
- Type safety (catch errors early)
- Good defaults (logging, errors, resilience)
- No premature optimization (but no poor patterns either)

**The result:**
- Code that works
- Code that's maintainable
- Code that demonstrates senior-level thinking
- Code that impresses CTOs

**Not because of fancy algorithms, but because of consistent excellence.**

---

**End of Architecture Document**

*This document represents a commitment to quality. Every implementation decision follows these principles. The codebase demonstrates that sophistication isn't about features—it's about discipline.*
