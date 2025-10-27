# Interview Discussion Guide - 80/20 Knowledge
**Purpose:** Confidently discuss architecture and handle extension questions
**Audience:** You, preparing for CTO interview
**Time to review:** 30 minutes before interview

---

## Codebase Layout Guide

### Quick Navigation Map

```
lamar-health/
├── app/                          # Next.js App Router (Interface Layer)
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
│
├── components/                   # React Components (Interface Layer)
│   ├── ui/                      # shadcn/ui base components
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   ├── PatientForm.tsx          # Main patient form component
│   └── providers.tsx            # React Query provider
│
├── lib/                         # Core Application Logic
│   ├── api/                     # API Contracts (Shared Frontend/Backend)
│   │   └── contracts.ts         # Request/response types
│   │
│   ├── domain/                  # Domain Layer (Business Logic)
│   │   ├── types.ts             # Domain entities (Patient, Order, Provider, CarePlan)
│   │   ├── errors.ts            # Domain-specific errors (DuplicatePatientError, etc.)
│   │   ├── result.ts            # Result type (Success/Failure)
│   │   └── warnings.ts          # Warning types (discriminated unions)
│   │
│   ├── services/                # Service Layer (Orchestration)
│   │   └── [not yet implemented]
│   │
│   ├── validation/              # Validation Layer
│   │   └── schemas.ts           # Zod schemas for input validation
│   │
│   ├── client/                  # Frontend API Client
│   │   ├── api.ts               # API wrapper functions
│   │   └── hooks.ts             # React Query hooks
│   │
│   ├── infrastructure/          # Infrastructure Layer (External Systems)
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── logger.ts            # Structured logging
│   │   ├── retry.ts             # Retry utility with exponential backoff
│   │   └── error-handler.ts     # Centralized error handling
│   │
│   └── utils.ts                 # Utility functions (cn, etc.)
│
├── prisma/                      # Database Layer
│   ├── schema.prisma            # Database schema definition
│   └── migrations/              # Version-controlled DB migrations
│       └── 20251027211433_init/ # Initial migration
│
├── mocks/                       # MSW Mocks (Frontend Development)
│   ├── handlers.ts              # Mock API handlers
│   └── browser.ts               # MSW browser setup
│
├── __tests__/                   # Test Suites
│   ├── domain/                  # Domain layer tests
│   │   ├── errors.test.ts
│   │   └── result.test.ts
│   ├── infrastructure/          # Infrastructure layer tests
│   │   └── retry.test.ts
│   ├── services/                # Service layer tests (empty, ready)
│   ├── validation/              # Validation tests (empty, ready)
│   └── api/                     # API integration tests (empty, ready)
│
├── docs/                        # Documentation
│   └── INTERVIEW_GUIDE.md       # This file
│
├── public/                      # Static assets
│
├── vitest.config.ts             # Test configuration
├── next.config.ts               # Next.js configuration
├── prisma.config.ts             # Prisma configuration
└── package.json                 # Dependencies
```

### What Lives Where?

| Layer | Directory | Purpose | Examples |
|-------|-----------|---------|----------|
| **Interface** | `app/`, `components/` | HTTP handling, UI rendering | API routes, React components |
| **Service** | `lib/services/` | Business orchestration, transactions | PatientService, CarePlanService |
| **Domain** | `lib/domain/` | Business logic, types, rules | Patient type, DuplicatePatientError |
| **Infrastructure** | `lib/infrastructure/`, `prisma/` | External systems, DB, logging | Prisma client, logger, retry |
| **Validation** | `lib/validation/` | Input validation | Zod schemas, NPI validator |
| **Contracts** | `lib/api/` | Shared types for FE/BE | CreatePatientRequest |
| **Client** | `lib/client/` | Frontend API wrapper | React Query hooks |

### Finding Things Quickly

**"Where do I find...?"**

- **Patient domain type** → `lib/domain/types.ts`
- **Create patient API contract** → `lib/api/contracts.ts`
- **Patient form validation** → `lib/validation/schemas.ts`
- **Error definitions** → `lib/domain/errors.ts`
- **Result type** → `lib/domain/result.ts`
- **Warning types** → `lib/domain/warnings.ts`
- **Retry logic** → `lib/infrastructure/retry.ts`
- **Logger** → `lib/infrastructure/logger.ts`
- **Database schema** → `prisma/schema.prisma`
- **Database client** → `lib/infrastructure/db.ts`
- **Patient form UI** → `components/PatientForm.tsx`
- **Mock API responses** → `mocks/handlers.ts`
- **React Query hooks** → `lib/client/hooks.ts`

### Dependency Flow

```
app/pages & components (Interface)
    ↓ imports
lib/services/ (Service Layer)
    ↓ imports
lib/domain/ (Domain Layer)
    ↑ used by
lib/infrastructure/ (Infrastructure)
```

**Key Rule:** Dependencies flow inward. Domain layer has zero dependencies. Infrastructure depends on domain, not vice versa.

---

## Core Mental Model (The 20% That Matters)

### The One-Sentence Pitch

> "I built a layered architecture with clear boundaries, type-safe error handling, and production-quality patterns applied consistently - demonstrating that I can write maintainable code, not just code that works."

**Memorize this.** It's your anchor for any architecture question.

---

## The 5 Core Concepts You MUST Know

### 1. **Layered Architecture (Not Hexagonal)**

**What it is:**
- Interface Layer (API routes, UI)
- Service Layer (orchestration, transactions)
- Domain Layer (business logic, types, rules)
- Infrastructure Layer (Prisma, Anthropic, logging)

**Why you chose it:**
- ✅ Clear boundaries (easy to navigate)
- ✅ Testable (dependency injection)
- ✅ Appropriate complexity (not over-engineered)
- ❌ NOT hexagonal (no ports/adapters - YAGNI for prototype)

**If they ask "Why not hexagonal?":**
> "Hexagonal requires interfaces for every infrastructure component. We're not swapping databases or LLM providers, so those interfaces would have exactly one implementation - pure overhead. The layered approach gives us 80% of the benefits (testability, clear boundaries) with 20% of the complexity. I can add ports/adapters later if we need multiple implementations."

**Files:**
- Interface: `app/`, `components/`
- Service: `lib/services/`
- Domain: `lib/domain/`
- Infrastructure: `lib/infrastructure/`, `prisma/`

---

### 2. **Result Types (Not Try/Catch for Business Logic)**

**What they are:**
- Type-safe success/failure wrapper
- Forces error handling at compile time
- Discriminated union: `Success<T>` or `Failure<E>`

**Why you chose them:**
- ✅ Explicit error handling (can't forget)
- ✅ Type-safe (compiler enforces checks)
- ✅ Separates expected failures (business logic) from unexpected (infrastructure)

**If they ask "Why not just throw errors?":**
> "Throwing is for unexpected errors (DB down, LLM timeout). Result types are for expected failures (duplicate patient, validation error). Makes error handling visible in the type system - you can't accidentally ignore errors because TypeScript forces you to check. Try/catch is still used, but only at boundaries (API routes, external calls)."

**Files:**
- Definition: `lib/domain/result.ts`
- Usage: All service layer functions return `Result<T, E>`

---

### 3. **Domain Types Separate from Database Types**

**What it means:**
- Domain types represent business concepts (Patient, Order, CarePlan)
- Database types are Prisma-generated (database schema shape)
- They're intentionally separate, not coupled

**Why you chose it:**
- ✅ Domain logic doesn't depend on Prisma
- ✅ Can add computed fields without DB changes
- ✅ Easier to test (pure domain logic)

**If they ask "Isn't this duplication?":**
> "It's intentional decoupling. Domain types represent business concepts, database types represent storage. They happen to be similar now, but if we add a computed field like 'fullName', it goes in domain type without touching the database. Keeps business logic independent of persistence details."

**Files:**
- Domain types: `lib/domain/types.ts`
- Database schema: `prisma/schema.prisma`
- Mapping happens in service layer

---

### 4. **Dependency Injection (Not Singletons)**

**What it looks like:**
- Services receive dependencies via constructor
- No global singletons imported directly
- Dependencies are explicit, not hidden

**Why you chose it:**
- ✅ Testable (can inject mocks)
- ✅ Explicit dependencies (clear what service needs)
- ✅ No global state

**If they ask "Why not just import singleton services?":**
> "DI makes dependencies explicit and testable. In tests, I inject mock implementations. With singletons, I'd need to mock at the module level, which is fragile. DI is slightly more verbose but dramatically easier to test."

**Files:**
- Service definitions: `lib/services/`
- Services instantiated in API routes with injected dependencies

---

### 5. **Resilient External Calls**

**What it includes:**
- Retry with exponential backoff (3 attempts, 1s → 2s → 4s)
- Timeout handling (30s for LLM calls)
- Comprehensive logging (start, success, failure with duration)

**Why you chose it:**
- ✅ External systems fail (design for it)
- ✅ Graceful degradation
- ✅ Observable (can debug production issues)

**If they ask "Isn't this overkill for a prototype?":**
> "This is where prototypes typically fall short - they work in happy path but fail ungracefully in production. The retry and timeout add 20 lines of code but make the difference between 'works in demo' and 'works in production.' It's not overkill - it's demonstrating I know how production systems behave."

**Files:**
- Retry utility: `lib/infrastructure/retry.ts`
- Logger: `lib/infrastructure/logger.ts`
- Used in: CarePlanService for LLM calls

---

## Discussion Framework: The RADAR Model

**Use this mental model to answer ANY architecture question:**

**R - Rationale:** Why I chose this approach
**A - Alternatives:** What else I considered
**D - Drawbacks:** What are the costs
**A - At Scale:** What would change if 10x, 100x, 1000x
**R - Real World:** How this maps to production

### Example: "Why Prisma?"

**R - Rationale:**
> "Type-safe queries, automatic migrations, great DX. Prevents SQL injection and type mismatches at compile time."

**A - Alternatives:**
> "Considered Drizzle (lighter weight) and TypeORM (more features). Prisma hits the sweet spot for developer experience and type safety."

**D - Drawbacks:**
> "Adds an abstraction layer over raw SQL. For complex queries with specific optimizations, raw SQL might be better. But for 95% of queries, Prisma's safety is worth it."

**A - At Scale:**
> "At 1M+ records, would consider: connection pooling with Prisma Accelerate, read replicas for reporting, potentially raw SQL for performance-critical queries. But the Prisma schema stays valuable as documentation."

**R - Real World:**
> "Prisma is production-ready - used by Vercel, GitHub, and thousands of companies. The type safety prevents entire classes of bugs."

**This framework works for ANY technology choice.**

---

## Key Trade-Offs You Made

**Memorize these 5 trade-offs - they'll come up:**

### 1. **Layered vs Hexagonal**
- ✅ Chose: Layered with DI
- ❌ Not: Hexagonal (ports & adapters)
- **Why:** No need for multiple implementations, layered gives testability without overhead

### 2. **Result Types vs Exceptions**
- ✅ Chose: Result types for business logic
- ❌ Not: Only try/catch
- **Why:** Compile-time enforcement of error handling, clear separation of expected vs unexpected

### 3. **Arrays vs Normalized Tables (diagnoses)**
- ✅ Chose: Arrays in Patient table
- ❌ Not: Separate diagnosis table with foreign keys
- **Why:** Simpler for read-heavy access, 2-5 items typical. Would normalize for analytics/complex queries.

### 4. **Direct Anthropic SDK vs LangChain**
- ✅ Chose: Direct SDK with retry wrapper
- ❌ Not: LangChain
- **Why:** Simple use case (single LLM call), LangChain adds abstraction for agent workflows we don't need

### 5. **Structured Logging vs Console.log**
- ✅ Chose: JSON structured logging with context
- ❌ Not: Plain console.log
- **Why:** Production-ready from day 1, machine-readable, includes context for debugging

---

## Handling Extension Questions

**They'll ask: "How would you add X?" or "What if we needed Y?"**

### The Extension Framework

**Use this 4-step process for ANY extension question:**

```
1. CLARIFY - Ask questions about requirements
2. LOCATE - Where in the architecture does this fit?
3. EXTEND - What needs to change?
4. RISKS - What could go wrong?
```

---

### Example Extension 1: "Add Authentication"

**1. CLARIFY:**
> "What type of auth? Role-based access control? Is this for internal users (medical assistants) or would patients log in too?"

**2. LOCATE:**
> "Auth is cross-cutting. Would add:
> - Infrastructure: NextAuth.js setup, session management
> - Middleware: Protect API routes (new middleware layer)
> - Service layer: Add userId parameter to all operations for audit trail
> - Domain: User entity, Role enum types"

**3. EXTEND:**
> "Would create:
> - Middleware function to check session and throw UnauthorizedError
> - Update all service methods to accept userId parameter
> - Add structured logging with userId context
> - Define User domain type with id, email, role
> - Add users table to Prisma schema"

**4. RISKS:**
> "Main risks: session management complexity, need to update all API routes, database migration for user table. Mitigation: use NextAuth.js (battle-tested), add middleware wrapper to reduce boilerplate, plan database migration carefully."

**Time estimate:** "2-3 days for basic auth, 1 week for full RBAC"

**Files affected:**
- New: `lib/infrastructure/auth.ts`, `lib/domain/user.ts`
- Modified: All services, all API routes, `prisma/schema.prisma`

---

### Example Extension 2: "Add Caching for Care Plans"

**1. CLARIFY:**
> "Cache where? LLM responses (before saving to DB) or database reads? How should cache invalidate - time-based or event-based?"

**2. LOCATE:**
> "Caching belongs in infrastructure layer, accessed by service layer."

**3. EXTEND:**
> "Would create:
> - CacheService class in infrastructure with get/set methods
> - Redis client wrapper with JSON serialization
> - Inject CacheService into CarePlanService constructor
> - Check cache before LLM call, set cache after generation
> - Use namespaced keys like `careplan:{patientId}`
> - TTL of 1 hour (configurable)"

**4. RISKS:**
> "Cache invalidation is hard. If patient data changes, need to invalidate care plan cache. Could use event-based invalidation (when patient updates, delete cache) or short TTL (5-10 min). Also need Redis in infrastructure - adds operational complexity."

**Time estimate:** "1 day for basic caching, 2-3 days with proper invalidation strategy"

**Files affected:**
- New: `lib/infrastructure/cache.ts`
- Modified: `lib/services/care-plan-service.ts` (add cache dependency)
- Infrastructure: Docker Compose for Redis, environment variables

---

### Example Extension 3: "Support Multiple Languages"

**1. CLARIFY:**
> "UI language or care plan language? If care plans: should Claude generate in multiple languages or should we translate? What's acceptable latency?"

**2. LOCATE:**
> "UI language: i18n library in frontend. Care plan language: prompt engineering in service layer."

**3. EXTEND:**
> "Would create:
> - Language type in domain: 'en' | 'es' | 'zh' | 'fr'
> - Add language field to CarePlan type and database schema
> - Update CarePlanService to accept language parameter
> - Create language-specific prompt instructions map
> - Modify buildPrompt method to include language instructions
> - For UI: integrate next-i18next or similar i18n library
> - Create translation files for each supported language"

**4. RISKS:**
> "LLM quality varies by language - English is best, others may have medical terminology issues. Would need native speakers to validate. Also increases token costs (longer prompts). For UI language, need translation files and testing across locales."

**Time estimate:** "UI only: 3-4 days. Care plans: 1 week + validation time"

**Files affected:**
- Modified: `lib/domain/types.ts` (add Language type)
- Modified: `lib/services/care-plan-service.ts` (language support)
- Modified: `prisma/schema.prisma` (add language field)
- New: `locales/` directory with translation files (for UI)

---

### Example Extension 4: "Add Background Job Queue"

**1. CLARIFY:**
> "For care plan generation specifically? What should user see while job runs - polling, webhooks, or page refresh?"

**2. LOCATE:**
> "New infrastructure layer: job queue (BullMQ, Trigger.dev). Service layer becomes job producer. New worker layer consumes jobs."

**3. EXTEND:**
> "Would create:
> - JobQueue class in infrastructure with enqueue/getStatus methods
> - Worker process that consumes jobs and calls CarePlanService
> - Modify API route to enqueue job instead of executing directly
> - Add job status tracking in database (jobs table)
> - Frontend polling using React Query with refetchInterval
> - Job failure handling and retry logic in worker
> - Monitoring dashboard for queue health"

**4. RISKS:**
> "Operational complexity - need Redis for queue, worker processes, monitoring, failure handling. Users need feedback (polling adds latency). Job retention policies needed. Error handling becomes async (user might leave before job completes)."

**Time estimate:** "3-5 days (queue setup, worker, UI polling, monitoring)"

**Files affected:**
- New: `lib/infrastructure/job-queue.ts`
- New: `workers/careplan-worker.ts`
- Modified: `app/api/care-plans/route.ts` (enqueue instead of execute)
- Modified: `prisma/schema.prisma` (add jobs table)
- Modified: Frontend components (add polling UI)
- Infrastructure: Redis for queue, worker deployment config

---

## Quick Reference: Technology Choices

**Be ready to defend these:**

| Technology | Why I Chose It | Alternative | Why Not Alternative |
|------------|----------------|-------------|---------------------|
| **Next.js** | Full-stack, server components, great DX | Remix, SvelteKit | Less mature, smaller ecosystem |
| **Prisma** | Type-safe, migrations, DX | Drizzle, TypeORM | Drizzle: newer. TypeORM: more complex |
| **Zod** | Runtime + compile-time validation | Yup, Joi | Better TS inference than Yup, lighter than Joi |
| **PostgreSQL** | Reliable, pg_trgm for fuzzy matching | MongoDB, MySQL | Mongo: no fuzzy text. MySQL: weaker text search |
| **Anthropic Claude** | Excellent at medical text, structured outputs | GPT-4, open source | GPT-4: less consistent. OSS: quality/reliability |
| **React Hook Form** | Performance, minimal re-renders | Formik | Formik is older, slower |
| **Tailwind** | Fast iteration, no context switching | CSS-in-JS, modules | Faster than writing CSS, standard in Next.js |

---

## Scaling Discussion Framework

**When they ask about scale, use this progression:**

### **Current (10k patients):**
- ✅ Works as-is
- DB: Small PostgreSQL instance
- LLM: Direct API calls
- Caching: None needed

### **Medium (100k patients):**
- 🔧 Add read replicas for reporting
- 🔧 Connection pooling (Prisma Accelerate)
- 🔧 Cache care plans (Redis, 1-hour TTL)
- 🔧 Consider pagination for large lists

### **Large (1M patients):**
- 🔧 Background job queue for care plans
- 🔧 Database partitioning (by hospital/region)
- 🔧 CDN for static assets
- 🔧 Move to microservices if clear boundaries emerge

### **Very Large (10M+ patients):**
- 🔧 Microservices (patient service, care plan service, duplicate detection service)
- 🔧 Event-driven architecture (Kafka/EventBridge)
- 🔧 Separate read/write databases (CQRS)
- 🔧 Machine learning for duplicate detection (replace algorithmic scoring)

**Key phrase:** "At current scale, the architecture handles load easily. The layered design makes these changes localized - we can add caching to infrastructure layer without changing services."

---

## Red Flags to Avoid

**Don't say these things:**

❌ "I would have used X but didn't have time"
- **Why bad:** Sounds like you compromised on quality
- **Say instead:** "I chose Y because it fit the requirements. X would be appropriate if..."

❌ "This is just a prototype, so I skipped..."
- **Why bad:** Implies you cut corners
- **Say instead:** "This demonstrates production-quality patterns. In production, I'd add..."

❌ "I'm not sure why I did it that way"
- **Why bad:** Looks like you didn't think through decisions
- **Say instead:** Use the RADAR framework to reconstruct reasoning

❌ "The AI generated most of this"
- **Why bad:** Downplays your contribution
- **Say instead:** "I architected the system for parallel development using two AI agents - demonstrates understanding of modern AI-assisted workflows"

❌ "This is the best way to do it"
- **Why bad:** Shows inflexibility, lack of nuance
- **Say instead:** "This is appropriate for this context. Trade-offs are..."

---

## Confidence Builders

### You Made Excellent Decisions

**Your architecture demonstrates:**
1. ✅ Clear separation of concerns (layered architecture)
2. ✅ Type safety throughout (Result types, branded types, discriminated unions)
3. ✅ Production patterns (retry, timeout, logging, transactions)
4. ✅ Testability (dependency injection)
5. ✅ Appropriate complexity (not over-engineered, not under-engineered)
6. ✅ Modern workflows (parallel AI development, contract-driven)

**This is senior-level work.**

### You Can Handle Any Question

**Use these frameworks:**
- Architecture questions → RADAR model
- Extension questions → CLARIFY-LOCATE-EXTEND-RISKS
- Scale questions → 10k → 100k → 1M → 10M progression
- Trade-off questions → Pros/Cons table in your head

**You've thought through everything.**

### You're the Expert on Your Code

**They're testing:**
- Can you explain your decisions? ✅ Yes (RADAR)
- Can you think through changes? ✅ Yes (extension framework)
- Do you understand trade-offs? ✅ Yes (documented)
- Can you scale systems? ✅ Yes (scaling progression)

**You're prepared.**

---

## The Interview Loop

### Opening (5 min)
**They ask:** "Walk me through the architecture"

**You say:**
> "I built a layered architecture with four clear layers: interface (API routes, UI), service (orchestration), domain (business logic), and infrastructure (external systems). Each layer has a specific responsibility, dependencies flow inward, and I used dependency injection for testability. The key sophistication is consistent quality throughout - Result types for error handling, comprehensive logging, resilient external calls. I also used two Claude Code instances in parallel to speed development - clear API contracts enabled independent frontend and backend streams. Let me show you..."

[Open to the component diagram in ARCHITECTURE_V3.md]

---

### Deep Dive (15-20 min)
**They ask specific questions about:**
- Technology choices → Use technology reference table + RADAR
- Design decisions → Use RADAR framework
- Trade-offs → Reference your documented trade-offs
- Alternatives → Show you considered options

**Stay calm, use frameworks, be specific.**

---

### Extension Discussion (10-15 min)
**They ask:** "How would you add X?"

**You use:** CLARIFY-LOCATE-EXTEND-RISKS framework

**You sound thoughtful, thorough, and experienced.**

---

### Pair Programming (30-60 min)
**They ask you to modify something**

**Your approach:**
1. Read the current code
2. Identify which layer it belongs to
3. Make minimal changes
4. Follow existing patterns
5. Explain as you go

**The architecture makes this easy - clear structure, obvious patterns.**

---

## Final Checklist (Review Right Before Interview)

**Can you explain (in 2 minutes each):**
- [ ] Layered architecture and why not hexagonal
- [ ] Result types and why not just exceptions
- [ ] Domain types separate from DB types
- [ ] Dependency injection for testability
- [ ] Resilient external calls (retry, timeout, logging)

**Can you handle:**
- [ ] "Why did you choose X?" → RADAR framework
- [ ] "How would you add Y?" → CLARIFY-LOCATE-EXTEND-RISKS
- [ ] "What about scale?" → 10k/100k/1M/10M progression
- [ ] "Why not Z?" → Trade-offs, appropriate complexity

**Do you remember:**
- [ ] Your one-sentence pitch
- [ ] 5 key trade-offs you made
- [ ] Technology choice justifications
- [ ] Parallel AI development strategy

**If yes to all: You're ready.** 🚀

---

## Emergency De-Stress

**If you blank during the interview:**

**Breathe.** You know this.

**Anchor:** "Let me think through this systematically..."

**Use a framework:**
- Architecture question → RADAR
- Extension question → CLARIFY-LOCATE-EXTEND-RISKS
- Scale question → Current/Medium/Large/VeryLarge

**It's okay to:**
- Ask for clarification
- Take 10 seconds to think
- Say "I'd need to check X to be sure"
- Draw a diagram

**It's not okay to:**
- Guess wildly
- Say "I don't know" without trying
- Blame the AI
- Get defensive

**You've got this.**

---

## Parting Wisdom

**What impresses CTOs:**
- Clear thinking
- Articulated trade-offs
- Appropriate complexity
- Growth mindset

**What doesn't impress:**
- Knowing everything
- Perfect code
- Fancy algorithms
- Zero mistakes

**Your architecture is excellent. Your preparation is thorough. Your thinking is clear.**

**Walk in confident. You're ready to have a senior-level technical discussion.**

**Now go show them what you've built.** 💪
