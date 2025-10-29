# Error Handling Architecture

This document describes the error handling patterns used throughout the application and provides guidelines for consistent implementation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Error Handling Layers](#error-handling-layers)
3. [Standard Error Format](#standard-error-format)
4. [Result Type Pattern](#result-type-pattern)
5. [Domain Errors](#domain-errors)
6. [API Route Error Handling](#api-route-error-handling)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Architecture Overview

The application uses a **hybrid error handling approach** that combines:
- **Result types** for service layer (explicit success/failure)
- **Try/catch** for exception handling
- **Domain errors** for business logic failures
- **Centralized error handler** for API responses

This provides:
- ✅ Type-safe error handling at service boundaries
- ✅ Explicit business logic outcomes
- ✅ Consistent API error responses
- ✅ Comprehensive error logging

---

## Error Handling Layers

### Layer 1: Domain Layer
**Purpose**: Define business errors with structured data

```typescript
// lib/domain/errors.ts
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
```

**When to use**:
- Business rule violations
- Expected failure conditions
- Need structured error data

### Layer 2: Service Layer
**Purpose**: Return explicit success/failure with Result types

```typescript
// lib/services/patient-service.ts
async createPatient(input: PatientServiceInput): Promise<Result<PatientServiceResult>> {
  try {
    // Business logic...
    return {
      success: true,
      data: { patient, order, warnings },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
```

**When to use**:
- Service public methods
- Operations that can fail for business reasons
- Need to return warnings alongside success

### Layer 3: Infrastructure Layer
**Purpose**: Convert errors to HTTP responses

```typescript
// lib/infrastructure/error-handler.ts
export function handleError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }
  // ... handle other error types
}
```

**When to use**:
- Converting service errors to API responses
- Catch-all error handling in API routes

### Layer 4: API Layer
**Purpose**: Handle request/response cycle

```typescript
// app/api/*/route.ts
export async function POST(req: NextRequest) {
  try {
    const result = await service.operation(input);

    if (isFailure(result)) {
      return handleError(result.error); // Use centralized handler
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return handleError(error); // Use centralized handler
  }
}
```

---

## Standard Error Format

**All API errors** must follow this format:

```typescript
{
  success: false,
  error: {
    message: string,      // Human-readable error message
    code: string,         // Machine-readable error code
    details?: object      // Optional additional context
  }
}
```

### Error Codes

**Standard codes**:
- `VALIDATION_ERROR` - Input validation failed (400)
- `PATIENT_NOT_FOUND` - Patient doesn't exist (404)
- `PROVIDER_CONFLICT` - Provider NPI mismatch (409)
- `RATE_LIMIT_EXCEEDED` - Too many requests (429)
- `INTERNAL_ERROR` - Unexpected server error (500)
- `DATABASE_NOT_CONFIGURED` - Database connection issue (503)

**Custom codes**:
- `CARE_PLAN_GENERATION_FAILED` - LLM generation failed (500)
- `GENERATION_ERROR` - Example generation failed (500)
- `DELETE_ERROR` - Deletion failed (500)

---

## Result Type Pattern

### Definition

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
```

### Type Guards

```typescript
if (isSuccess(result)) {
  // TypeScript knows: result.data is T
  console.log(result.data);
}

if (isFailure(result)) {
  // TypeScript knows: result.error is E
  console.log(result.error);
}
```

### When to Use Result Types

✅ **Use Result types when**:
- Service public methods
- Operations that can fail for business reasons
- Need to return warnings alongside success
- Want explicit error handling at call site

❌ **Don't use Result types for**:
- Internal helper functions
- Operations that can only fail unexpectedly
- Database queries (use try/catch)

---

## Domain Errors

### Error Hierarchy

```
DomainError (abstract)
├── PatientNotFoundError
├── ProviderConflictError
├── DuplicatePatientError
├── CarePlanGenerationError
└── ValidationError
```

### Creating Custom Domain Errors

```typescript
export class MyCustomError extends DomainError {
  constructor(details: string) {
    super(
      'Human-readable message',
      'ERROR_CODE',           // SCREAMING_SNAKE_CASE
      400,                    // HTTP status code
      { details }             // Optional additional data
    );
  }
}
```

### Properties

- `message`: Human-readable error description
- `code`: Machine-readable identifier
- `statusCode`: HTTP status code to return
- `details`: Optional structured data

---

## API Route Error Handling

### Standard Pattern

```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Rate limiting (if applicable)
    const rateLimitResult = await checkRateLimit(req, 'operation');
    if (rateLimitResult) return rateLimitResult;

    // 2. Input validation
    const body = await req.json();
    const validatedInput = MySchema.parse(body); // Throws ZodError

    // 3. Service call
    const result = await service.operation(validatedInput);

    // 4. Handle Result type
    if (isFailure(result)) {
      return handleError(result.error);
    }

    // 5. Return success
    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    // 6. Catch-all error handler
    return handleError(error);
  }
}
```

### Common Patterns

#### Pattern 1: Service Returns Result

```typescript
const result = await service.operation(input);

if (isFailure(result)) {
  return handleError(result.error); // Centralized handler
}

return NextResponse.json({
  success: true,
  data: result.data,
});
```

#### Pattern 2: Direct Database Query

```typescript
const record = await prisma.model.findUnique({ where: { id } });

if (!record) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Record not found',
        code: 'NOT_FOUND',
      },
    },
    { status: 404 }
  );
}
```

#### Pattern 3: Validation Error

```typescript
const validationResult = MySchema.safeParse(body);

if (!validationResult.success) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.issues,
      },
    },
    { status: 400 }
  );
}
```

---

## Best Practices

### DO ✅

1. **Use centralized error handler**
   ```typescript
   catch (error) {
     return handleError(error); // ✅
   }
   ```

2. **Log errors with context**
   ```typescript
   logger.error('Operation failed', {
     requestId,
     patientId,
     error: error instanceof Error ? error.message : 'Unknown',
   });
   ```

3. **Return structured errors**
   ```typescript
   return NextResponse.json({
     success: false,
     error: {
       message: 'Clear error message',
       code: 'ERROR_CODE',
     },
   }, { status: 400 });
   ```

4. **Check Result types**
   ```typescript
   if (isFailure(result)) {
     return handleError(result.error);
   }
   ```

5. **Use domain errors for business failures**
   ```typescript
   throw new PatientNotFoundError(patientId);
   ```

### DON'T ❌

1. **Don't throw strings**
   ```typescript
   throw 'Something went wrong'; // ❌
   throw new Error('Something went wrong'); // ✅
   ```

2. **Don't ignore error types**
   ```typescript
   catch (error) {
     console.log(error); // ❌
     return handleError(error); // ✅
   }
   ```

3. **Don't return inconsistent formats**
   ```typescript
   return NextResponse.json({ error: 'Failed' }); // ❌
   return NextResponse.json({
     success: false,
     error: { message: 'Failed', code: 'ERROR' }
   }); // ✅
   ```

4. **Don't mix Result types with throws in same function**
   ```typescript
   async function bad(): Promise<Result<T>> {
     if (error) throw new Error(); // ❌ Inconsistent!
     return { success: false, error: new Error() }; // ✅
   }
   ```

5. **Don't catch errors silently**
   ```typescript
   try {
     await operation();
   } catch (e) {
     // ❌ Silent failure
   }
   ```

---

## Examples

### Example 1: Service with Result Type

```typescript
// lib/services/patient-service.ts
export class PatientService {
  async createPatient(input: PatientServiceInput): Promise<Result<PatientServiceResult>> {
    try {
      const result = await this.db.$transaction(async (tx) => {
        // Business logic...
        return { patient, order, warnings };
      });

      return {
        success: true,
        data: result,
        warnings: result.warnings,
      };
    } catch (error) {
      if (error instanceof DomainError) {
        return {
          success: false,
          error: error,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }
}
```

### Example 2: API Route with Error Handling

```typescript
// app/api/patients/route.ts
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimit(req, 'patientCreate');
    if (rateLimitResult) return rateLimitResult;

    // Validation
    const body = await req.json();
    const validatedInput = PatientInputSchema.parse(body);

    // Service call
    const { patientService } = createPatientServices(prisma);
    const result = await patientService.createPatient(validatedInput);

    // Handle Result type
    if (isFailure(result)) {
      return handleError(result.error);
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        data: {
          patient: result.data.patient,
          order: result.data.order,
          warnings: result.data.warnings,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Patient creation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });

    return handleError(error);
  }
}
```

### Example 3: Custom Domain Error

```typescript
// lib/domain/errors.ts
export class InsufficientStockError extends DomainError {
  constructor(medicationName: string, available: number, requested: number) {
    super(
      `Insufficient stock for ${medicationName}: ${available} available, ${requested} requested`,
      'INSUFFICIENT_STOCK',
      409,
      { medicationName, available, requested }
    );
  }
}

// Usage in service:
if (stock < requested) {
  throw new InsufficientStockError(medication, stock, requested);
}
```

---

## Migration Guide

### Converting Manual Error Responses to handleError()

**Before:**
```typescript
catch (error) {
  return NextResponse.json(
    {
      success: false,
      error: 'Something went wrong',
    },
    { status: 500 }
  );
}
```

**After:**
```typescript
catch (error) {
  return handleError(error);
}
```

### Converting Throw to Result Type

**Before:**
```typescript
async function operation() {
  if (!valid) {
    throw new ValidationError('Invalid input');
  }
  return data;
}
```

**After:**
```typescript
async function operation(): Promise<Result<Data>> {
  if (!valid) {
    return {
      success: false,
      error: new ValidationError('Invalid input'),
    };
  }
  return {
    success: true,
    data,
  };
}
```

---

## Testing Error Handling

### Test Standard Error Format

```typescript
it('should return standard error format', async () => {
  const response = await POST(invalidRequest);
  const data = await response.json();

  expect(data).toHaveProperty('success');
  expect(data.success).toBe(false);
  expect(data).toHaveProperty('error');
  expect(data.error).toHaveProperty('message');
  expect(data.error).toHaveProperty('code');
});
```

### Test Domain Errors

```typescript
it('should throw PatientNotFoundError', async () => {
  const result = await service.getPatient('non-existent');

  expect(isFailure(result)).toBe(true);
  if (isFailure(result)) {
    expect(result.error).toBeInstanceOf(PatientNotFoundError);
  }
});
```

### Test HTTP Status Codes

```typescript
it('should return 404 for not found', async () => {
  const response = await GET(requestWithInvalidId);

  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.error.code).toBe('PATIENT_NOT_FOUND');
});
```

---

## Summary

The error handling architecture provides:

1. **Type Safety**: Result types ensure errors are handled at compile time
2. **Consistency**: Standard error format across all API endpoints
3. **Clarity**: Explicit success/failure at service boundaries
4. **Logging**: Comprehensive error logging with context
5. **User Experience**: Clear, actionable error messages

**Key principle**: Errors should be **expected**, **explicit**, and **actionable**.
