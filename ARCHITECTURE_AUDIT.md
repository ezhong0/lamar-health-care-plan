# Architecture Deep Dive & Audit

**Date**: 2025-10-28
**Scope**: Complete application analysis (components, hooks, services, pages)
**Focus**: Consistency, patterns, code quality

---

## Executive Summary

### Issues Found

**Critical (Fix Now):**
1. ❌ **OrdersPage** uses manual fetch instead of React Query (inconsistent with rest of app)
2. ❌ **PatientForm** has 5 `as any` type assertions (type safety issue)
3. ❌ Missing `useOrders()` hook to match established pattern

**Medium (Should Fix):**
4. ⚠️ **PatientForm.tsx** is 637 lines (too large, multiple responsibilities)
5. ⚠️ **Component state management** varies across pages (some use React Query, some don't)

**Low (Nice to Have):**
6. ⚠️ TODO comment in PatientForm ("Support multiple orders") - unclear if needed

---

## Pattern Analysis

### ✅ What's Good (Keep Doing)

#### 1. Services Layer - **Excellent**
All services use consistent dependency injection:
```typescript
// ✅ Consistent pattern across all services
export class PatientService {
  constructor(
    private readonly db: PrismaClient,
    private readonly providerService: ProviderService,
    private readonly duplicateDetector: DuplicateDetector
  ) {}
}
```

#### 2. Error Handling - **Good**
11/16 API routes use centralized `handleError()`:
```typescript
// ✅ Consistent error handling
try {
  // ... logic
} catch (error) {
  logger.error('Operation failed', { error });
  return handleError(error);
}
```

#### 3. React Query Usage - **Good (But Inconsistent)**
Most pages use React Query hooks:
```typescript
// ✅ Patients page
const { data, isLoading, error } = usePatients();

// ✅ Patient detail page
const { data: patient } = usePatient(id);

// ❌ Orders page - manual fetch!
const [orders, setOrders] = useState([]);
useEffect(() => { fetchOrders(); }, []);
```

---

## ❌ Critical Issues (Fix Required)

### Issue #1: OrdersPage Pattern Inconsistency

**Problem:**
OrdersPage uses manual `fetch` + `useState` + `useEffect` while all other pages use React Query hooks.

**Current Code (app/orders/page.tsx):**
```typescript
// ❌ INCONSISTENT - manual state management
const [orders, setOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchOrders();
}, [statusFilter]);

const fetchOrders = async () => {
  try {
    setLoading(true);
    const response = await fetch(`/api/orders?${params}`);
    const data = await response.json();
    setOrders(data.orders);
    setTotal(data.total);
  } catch (err) {
    setError('Failed to fetch orders');
  } finally {
    setLoading(false);
  }
};
```

**Should Be (React Query pattern):**
```typescript
// ✅ CONSISTENT - use React Query like other pages
const { data, isLoading, error } = useOrders();
```

**Impact:**
- Inconsistent caching strategy
- Manual error handling (every other page uses automatic)
- No automatic revalidation
- More boilerplate code

**Fix:** Create `useOrders()` hook in `lib/client/hooks.ts` and refactor OrdersPage.

---

### Issue #2: PatientForm Type Safety

**Problem:**
PatientForm has 5 `as any` type assertions, breaking type safety.

**Locations:**
```typescript
// components/PatientForm.tsx

// Line 72-75: Unsafe array assignment
formData.additionalDiagnoses = prefillData.additionalDiagnoses as any;
formData.medicationHistory = prefillData.medicationHistory as any;

// Line 91, 125: Unsafe setValue calls
setValue(key as keyof PatientInput, value as any);

// Line 207: Unsafe mutation data
const result = await createPatient.mutateAsync(dataWithFlag as any);
```

**Impact:**
- TypeScript can't catch errors
- Runtime bugs possible
- Defeats purpose of TypeScript

**Fix:** Properly type these with Zod schemas or type guards.

---

### Issue #3: Missing useOrders Hook

**Problem:**
We have hooks for patients (`usePatients`, `usePatient`, `useCreatePatient`) but nothing for orders.

**Current hooks (lib/client/hooks.ts):**
```typescript
export function usePatients() { ... }      // ✅ exists
export function usePatient(id) { ... }     // ✅ exists
export function useCreatePatient() { ... } // ✅ exists

export function useOrders() { ... }        // ❌ MISSING
```

**Impact:**
- Forces OrdersPage to use manual fetch
- Breaks consistency
- Loses React Query benefits (caching, revalidation, error handling)

**Fix:** Add `useOrders()` hook following the same pattern.

---

## ⚠️ Medium Issues (Should Fix)

### Issue #4: PatientForm Complexity

**Metrics:**
- **637 lines** (largest component)
- **8 state variables** (useState calls)
- **Multiple responsibilities**: Form handling, AI generation, draft saving, warning management, localStorage integration

**State variables:**
```typescript
const [warnings, setWarnings] = useState<Warning[]>([]);
const [showWarnings, setShowWarnings] = useState(false);
const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
const [pendingOrderData, setPendingOrderData] = useState<PatientInput | null>(null);
const [selectedExample, setSelectedExample] = useState<string>('');
const [isGeneratingAI, setIsGeneratingAI] = useState(false);
const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);
const [isLinking, setIsLinking] = useState(false);
```

**Responsibilities:**
1. Form validation (react-hook-form)
2. Patient creation (API call)
3. Warning handling (duplicate detection)
4. AI example generation
5. Draft saving to localStorage
6. Prefill from localStorage
7. Linking to existing patients
8. Textarea auto-expand

**Recommendation:**
Extract into smaller, focused components/hooks:
- `usePatientFormState()` - consolidate related state
- `useAIGeneration()` - AI generation logic
- `useDraftSaving()` - localStorage draft logic
- `WarningDialog` - separate component
- `PatientFormFields` - pure presentational component

**Trade-off:**
- **Pro**: More maintainable, testable, reusable
- **Con**: More files (but each is simpler)
- **Decision**: Refactor if this component needs frequent changes, otherwise document complexity

---

## 📊 Component Size Analysis

| Component | Lines | Complexity | Status |
|-----------|-------|------------|--------|
| PatientForm.tsx | 637 | High (8 useState, multiple concerns) | ⚠️ Refactor candidate |
| WarningList.tsx | 266 | Medium (single responsibility) | ✅ OK |
| CarePlanView.tsx | 213 | Low (display only) | ✅ OK |
| DemoScenarioSelector.tsx | 213 | Medium (single responsibility) | ✅ OK |
| PatientCard.tsx | 193 | Low (display only) | ✅ OK |
| DeleteConfirmationDialog.tsx | 160 | Low (single responsibility) | ✅ OK |

**Guideline**: Components over 300 lines should have a clear reason or be refactored.

---

## 📄 Page Size Analysis

| Page | Lines | React Hooks | React Query | Status |
|------|-------|-------------|-------------|--------|
| patients/page.tsx | 354 | 2 (useState) | ✅ Yes (usePatients) | ✅ OK |
| orders/page.tsx | 298 | 5 (useState, useEffect) | ❌ **Manual fetch** | ❌ Fix |
| patients/[id]/page.tsx | 294 | 1 (useState) | ✅ Yes (usePatient) | ✅ OK |
| providers/page.tsx | 257 | 4 (useState) | ❌ **Manual fetch** | ⚠️ Consider |
| providers/[id]/page.tsx | 273 | 2 (useState) | ❌ **Manual fetch** | ⚠️ Consider |

**Pattern:** Patients use React Query consistently, Orders/Providers don't.

**Recommendation:** Create hooks for consistency:
```typescript
export function useOrders() { ... }
export function useProviders() { ... }
export function useProvider(id: string) { ... }
```

---

## 🔍 Code Duplication Analysis

### Duplicate Pattern: Manual Fetch Logic

**Found in 3 places:**
1. `app/orders/page.tsx` - fetch orders
2. `app/providers/page.tsx` - fetch providers
3. `app/providers/[id]/page.tsx` - fetch provider details

**Pattern:**
```typescript
// ❌ Duplicated 3 times
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/...');
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

**Solution:** React Query hooks eliminate this duplication entirely.

---

## 🎯 Recommended Refactors

### Priority 1: Add Missing React Query Hooks (30 min)

**lib/client/api.ts:**
```typescript
// Add API functions
export async function listOrders() {
  return api.get<OrdersResponse>('/api/orders');
}

export async function listProviders() {
  return api.get<ProvidersResponse>('/api/providers');
}

export async function getProvider(id: string) {
  return api.get<ProviderResponse>(`/api/providers/${id}`);
}
```

**lib/client/hooks.ts:**
```typescript
export function useOrders() {
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.listOrders(),
    enabled: isClient,
  });
}

export function useProviders() {
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['providers'],
    queryFn: () => api.listProviders(),
    enabled: isClient,
  });
}

export function useProvider(id: string) {
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['provider', id],
    queryFn: () => api.getProvider(id),
    enabled: !!id && isClient,
  });
}
```

**Benefits:**
- Consistent pattern across app
- Automatic caching
- Automatic revalidation
- Built-in error/loading states
- Remove ~50 lines of boilerplate per page

---

### Priority 2: Fix PatientForm Type Safety (20 min)

**Replace `as any` with proper types:**

```typescript
// BEFORE (unsafe)
formData.additionalDiagnoses = prefillData.additionalDiagnoses as any;

// AFTER (type-safe)
if (Array.isArray(prefillData.additionalDiagnoses)) {
  formData.additionalDiagnoses = prefillData.additionalDiagnoses.filter(
    (item): item is string => typeof item === 'string'
  );
}

// BEFORE (unsafe)
setValue(key as keyof PatientInput, value as any);

// AFTER (type-safe)
if (key in PatientInputSchema.shape) {
  setValue(key as keyof PatientInput, value);
}

// BEFORE (unsafe)
const result = await createPatient.mutateAsync(dataWithFlag as any);

// AFTER (type-safe)
const validatedData: CreatePatientRequest = {
  ...data,
  _ignoreWarnings: true,
};
const result = await createPatient.mutateAsync(validatedData);
```

---

### Priority 3: Consider PatientForm Refactor (2-3 hours, optional)

**Only if:**
- This component is frequently modified
- Team finds it hard to maintain
- Adding new features requires touching many lines

**Extract to:**
```typescript
// hooks/usePatientFormState.ts
export function usePatientFormState() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);
  // ... consolidate related state

  return { warnings, showWarnings, /* ... */ };
}

// hooks/useAIGeneration.ts
export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateExample = async (records: string) => {
    // ... AI logic
  };

  return { isGenerating, error, generateExample };
}

// components/PatientFormFields.tsx (presentational)
export function PatientFormFields({ register, errors }: Props) {
  return (
    // ... just the form fields, no logic
  );
}

// components/PatientForm.tsx (orchestration)
export function PatientForm() {
  const formState = usePatientFormState();
  const aiGeneration = useAIGeneration();
  const draftSaving = useDraftSaving();

  // Orchestrate, don't implement
}
```

**Trade-off:**
- **Benefit**: Each piece is simpler, more testable
- **Cost**: More files to navigate
- **Decision**: Only if complexity is causing bugs or slowing development

---

## ✅ Immediate Action Plan

### Fix Today (High Impact, Low Effort):

1. **Add React Query hooks** (30 min)
   - Create `useOrders()`, `useProviders()`, `useProvider(id)`
   - Refactor OrdersPage to use `useOrders()`
   - Remove manual fetch logic

2. **Fix PatientForm type safety** (20 min)
   - Replace 5 `as any` with proper type guards
   - Ensure type safety throughout

### Consider This Week (Medium Impact, Medium Effort):

3. **Add hooks for providers pages** (30 min)
   - Refactor ProvidersPage to use React Query
   - Maintain consistency

### Future (Low Priority):

4. **PatientForm refactor** (2-3 hours)
   - Only if needed for maintainability
   - Document complexity for now

---

## 📈 Metrics After Fixes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| React Query Usage | 2/5 pages | 5/5 pages | 100% consistency |
| `as any` in components | 5 | 0 | 100% type-safe |
| Manual fetch boilerplate | ~150 lines | 0 lines | Removed |
| Hook consistency | 60% | 100% | 40% improvement |

---

## Summary

**Strengths:**
- ✅ Excellent service layer architecture (consistent DI)
- ✅ Good error handling (centralized in most places)
- ✅ Clean file organization
- ✅ Good test coverage on critical paths

**Areas for Improvement:**
- ❌ **Inconsistent data fetching** (React Query vs manual fetch)
- ❌ **Type safety gaps** (5 `as any` in PatientForm)
- ⚠️ **Missing hooks** for orders and providers

**Impact of Fixes:**
- Consistent patterns across entire app
- Better type safety
- Less boilerplate
- Automatic caching and revalidation
- Easier maintenance

**Philosophy:**
Focus on **consistency and pragmatism**. Fix what's broken (inconsistent patterns, type safety). Don't over-engineer what's working (PatientForm complexity is manageable for now).
