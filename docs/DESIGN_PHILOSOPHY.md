# Design Philosophy - Care Plan Generator
**Author:** Edward Zhong
**Date:** 2025-10-27
**Context:** Technical Interview Assessment

---

## Core Premise

**I can ship quickly. The question is: what should I ship?**

This document outlines my decision-making framework for this assessment. It's not about what I *can* build (I can build most things given time), but about demonstrating judgment: what creates maximum impact for this specific context while maintaining the quality bar of production-grade software.

---

## Design Goals (In Priority Order)

### 1. Demonstrate Senior-Level Technical Judgment ⭐⭐⭐⭐⭐

**What this means:**
- I know when to add complexity and when to resist it
- I can articulate trade-offs, not just make decisions
- I optimize for the actual constraints, not theoretical best practices
- I understand the difference between prototype code and production code (and which one this is)

**How I'm demonstrating this:**
- Explicit documentation of trade-offs in code comments
- Clean architectural boundaries throughout (not just in "fancy" parts)
- Skipping sophistication that would be over-engineering (no microservices, no event sourcing, no GraphQL)
- Each architectural decision has a "why" and a "why not"

### 2. Consistent Engineering Excellence ⭐⭐⭐⭐⭐

**The Core Insight:**

Sophistication isn't about adding fancy features to basic code.

Sophistication is **architectural quality applied consistently throughout**.

**What this means:**
- Not "basic implementation + 3 wow features"
- Instead: "Production-quality patterns applied to all features"
- Every file demonstrates senior-level thinking
- Code quality doesn't vary by feature

**How I'm demonstrating this:**

**Architectural Discipline:**
- Clear separation of concerns (domain → service → infrastructure)
- Domain-driven design (light) - code organized around business concepts
- Dependency injection for testability
- No business logic in API routes

**Type Safety Throughout:**
- Discriminated unions for variants (Warning types, Result types)
- Type guards for refinement
- No `any` types (except Prisma Json)
- Domain types separate from DB types

**Error Handling Excellence:**
- Domain-specific error classes
- Consistent error handling patterns
- Machine-readable error codes
- User-friendly messages
- Proper logging with context

**Resilience & Observability:**
- Retry logic with exponential backoff
- Timeouts on external calls
- Structured logging
- Transaction safety
- Graceful degradation

**Testability:**
- Pure functions where possible
- Dependency injection
- Mockable collaborators
- Clear interfaces

**This is what actually impresses senior engineers.**

### 3. Optimize for CTO Discussion Depth ⭐⭐⭐⭐

**What this means:**
- Every architectural choice should have 5-10 minutes of discussion material
- I should be able to answer "what would you do in production?" for any component
- I should be able to defend my choices and discuss alternatives intelligently

**How I'm doing this:**
- Each major component has documented trade-offs
- I've thought through scale considerations (even if not implementing them)
- I can discuss what I'd change at 10x, 100x, 1000x scale
- I know why I DIDN'T use popular alternatives (tRPC, Redux, GraphQL, LangChain)

### 4. High Code Quality, Maintainable Implementation ⭐⭐⭐⭐

**What this means:**
- Code that another senior engineer can read and understand quickly
- Type safety (TypeScript, Zod, Prisma)
- Clear separation of concerns
- Good error handling
- Readable over clever

**What high quality does NOT mean here:**
- Perfect abstraction layers (acceptable to be pragmatic)
- Every function unit tested (focus on critical paths)
- Zero technical debt (acceptable to note "would refactor this for production")

---

## The Sophistication Curve: Where to Land

```
Simple              Sweet Spot           Over-Engineered
<----------------------------------------|---------------------------------------->
❌                     ✅                           ❌
"Looks junior"      "Looks senior"         "Looks academic"

Examples:
- Just regex        - Healthcare            - Custom NLP
  validation          domain validation       for name matching
                      (Luhn, ICD-10)

- Text dump         - Structured JSON       - Full type system
  from LLM            with Zod validation     generator from LLM
                                              responses

- Simple            - Weighted scoring      - ML model trained
  threshold           with explainability     on embeddings
  duplicate check

- Naive saves       - Transactions with     - Event sourcing
  to DB               proper isolation        with CQRS
```

**My philosophy:** Land in the sweet spot for 3-4 key areas. Err on "simple" for everything else.

---

## Risk Management: How I'm Avoiding Over-Engineering

### Red Flags I'm Consciously Avoiding

❌ **Building abstractions I don't need**
- No repository pattern (Prisma is fine as the data layer)
- No service layer for trivial operations
- No interfaces for components that won't have multiple implementations

❌ **Premature optimization**
- Not building caching layer (would discuss it)
- Not building background job queue (would discuss it)
- Not building admin dashboard for everything

❌ **Analysis paralysis on tech choices**
- Not evaluating 5 different ORMs
- Not comparing 10 different UI libraries
- Using proven, documented stack (Next.js, Prisma, Tailwind)

❌ **Perfect abstraction from day 1**
- Direct Anthropic API calls (no interface)
- Colocation of related code (not premature separation)
- Acceptable to have some duplication

### Green Lights: Sophistication That's Worth It

✅ **Structured LLM outputs**
- Risk: LLM might return invalid JSON
- Mitigation: Zod validation, error handling, fallback
- Payoff: Huge demo impact, shows AI engineering maturity

✅ **Healthcare domain validation**
- Risk: Might implement algorithm incorrectly
- Mitigation: Test with real examples, document sources
- Payoff: Shows domain research, attention to correctness

✅ **Weighted duplicate detection**
- Risk: More complex than simple threshold
- Mitigation: Well-documented algorithm, tests
- Payoff: Shows algorithmic sophistication, explainability

✅ **Database transactions**
- Risk: Deadlocks, performance overhead
- Mitigation: Short transactions, timeouts, proper isolation
- Payoff: Shows I understand production data integrity

---

## Code Quality Standards for This Assessment

### What I'm Prioritizing

**Type Safety ✅**
- TypeScript strict mode
- Zod for runtime validation
- Prisma for type-safe queries
- No `any` types except for Prisma Json fields

**Readability ✅**
- Clear function names
- Comments explaining WHY, not WHAT
- Trade-off documentation
- Examples in comments

**Error Handling ✅**
- Try/catch with specific error types
- Zod error formatting
- Prisma error code handling
- User-friendly error messages

**Performance Awareness ✅**
- Database indexes where needed
- Documented query performance
- No N+1 queries
- Efficient algorithms (Jaccard similarity, trigram matching)

### What I'm Explicitly NOT Prioritizing (But Would in Production)

**Comprehensive Testing ⚠️**
- Focus: Critical paths (validation, duplicate detection, API routes)
- Skip: UI component unit tests, exhaustive edge cases
- Rationale: Time better spent on sophistication that impresses

**Perfect Abstraction ⚠️**
- Some code duplication is acceptable
- Direct dependencies on Anthropic SDK, Prisma (no interfaces)
- Rationale: YAGNI (You Aren't Gonna Need It) for prototype

**Production Observability ⚠️**
- No structured logging (just console.log)
- No metrics/tracing
- No error tracking (Sentry)
- Rationale: Would discuss in CTO interview, not implement

**Complete UI Polish ⚠️**
- Clean and functional, not pixel-perfect
- Basic responsive design
- Standard component library (shadcn/ui)
- Rationale: This is a backend/architecture interview, not UI/UX

---

## Decision Framework: Should I Build This Feature?

For each potential feature, I evaluate:

```
┌─────────────────────────────────────────────────────────────────┐
│ Decision Matrix                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  High CTO Interest ✅                                           │
│  Shows Technical Depth ✅                                       │
│  Realistic Time Estimate ✅        → BUILD IT                   │
│  Has Discussion Material ✅                                     │
│                                                                 │
│  High CTO Interest ✅                                           │
│  Complex to Implement ❌           → DISCUSS, DON'T BUILD      │
│  Limited Discussion Value ❌                                    │
│                                                                 │
│  Low CTO Interest ❌                                            │
│  Standard Implementation ❌        → SKIP ENTIRELY             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Examples:**

**Structured LLM Output**
- CTO Interest: ✅ High (shows AI expertise)
- Technical Depth: ✅ Zod schemas, error handling, JSON parsing
- Time: ✅ 3 hours (reasonable)
- Discussion: ✅ Schema evolution, LLM reliability, alternatives
- **Decision: BUILD**

**Background Job Queue**
- CTO Interest: ✅ High (shows production thinking)
- Technical Depth: ✅ Worker patterns, queuing
- Time: ❌ 2-3 hours for proper setup
- Discussion: ✅ Can discuss architecture without building
- **Decision: DISCUSS, DON'T BUILD**

**OAuth Authentication**
- CTO Interest: ❌ Low (not in requirements)
- Technical Depth: ❌ Standard NextAuth setup
- Time: ❌ 1-2 hours
- Discussion: ⚠️ Basic discussion only
- **Decision: SKIP**

---

## The Meta-Signal: What This Philosophy Document Shows

By writing this document, I'm demonstrating:

1. **Strategic Thinking:** I don't just build, I think about what to build
2. **Self-Awareness:** I know my strengths and what impresses technical leaders
3. **Pragmatism:** I can balance idealism (perfect code) with realism (ship it)
4. **Communication:** I can articulate technical decisions clearly
5. **Seniority:** Junior engineers build everything; senior engineers choose what to build

---

## Success Criteria

### During Demo (15 min)
- ✅ Features work without bugs
- ✅ Can explain 2-3 "wow" technical choices
- ✅ Code is readable when they look at it
- ✅ Can show sophistication without appearing over-engineered

### During CTO Discussion (30-45 min)
- ✅ Have deep answers for every architectural choice
- ✅ Can discuss production considerations intelligently
- ✅ Can defend choices against alternatives
- ✅ Can discuss what I'd change at scale
- ✅ Show breadth (AI + algorithms + database + domain)

### During Pair Programming (1 hour)
- ✅ Code is easy to navigate
- ✅ Can modify features quickly
- ✅ Can explain trade-offs while coding
- ✅ Can adapt to changing requirements

---

## Anti-Patterns I'm Actively Avoiding

**1. Resume-Driven Development**
❌ "I'll use tRPC because it's hot right now"
✅ "Next.js API routes are sufficient for this scope"

**2. The YAGNI Violator**
❌ "Let me build a plugin system for future extensibility"
✅ "Let me build what's needed, document extension points"

**3. The Perfectionist**
❌ "I need 100% test coverage and perfect abstraction"
✅ "I need critical path tests and clear code"

**4. The Cowboy**
❌ "I'll hack it together fast and it'll be impressive"
✅ "I'll move fast but maintain quality and explainability"

**5. The Academic**
❌ "Let me implement this from first principles with perfect patterns"
✅ "Let me use battle-tested tools and focus on domain problems"

---

## Timeline Philosophy

**My approach:** Start at 8-10 hours, deliver something exceptional.

**Why not 6 hours?**
- 6 hours gets P0 working + one sophistication point
- 8-10 hours gets P0 + P1 + multiple sophistication points
- The delta in "impressiveness" is massive
- Better to be late with something amazing than on-time with something standard

**Why not 15 hours?**
- Diminishing returns on additional polish
- Risk of over-engineering increases
- 8-10 hours is the sweet spot for "thoughtful but pragmatic"

**Time allocation:**
- 60% core functionality (P0 + P1 features)
- 30% sophistication points (structured LLM, weighted duplicates, healthcare validation)
- 10% polish and testing

---

## The Underlying Philosophy

**Build something that makes the CTO think:**

> "This person:
> - Ships quality code quickly
> - Makes smart architectural choices
> - Knows when to be sophisticated and when to be simple
> - Thinks about production concerns
> - Would raise the bar of our engineering team
> - I want them to start Monday"

Everything in this assessment is optimized for that outcome.

---

## Reflection Questions I'm Asking Myself

Before implementing any feature:

1. **"Will this impress the CTO?"** - If no, probably skip
2. **"Can I explain the trade-offs?"** - If no, understand it better first
3. **"Is this the right level of sophistication?"** - Too simple → looks junior; too complex → looks academic
4. **"Will this break during the demo?"** - If high risk, add error handling or skip
5. **"Would I be proud to discuss this code in detail?"** - If no, refactor or skip

After implementing any feature:

1. **"Can I defend this choice against alternatives?"**
2. **"Do I understand this well enough to teach it?"**
3. **"Have I documented the 'why' in comments?"**
4. **"Have I tested the critical path?"**
5. **"What would I change in production?"**

---

## Final Thought

**The goal is not to build the perfect system.**

**The goal is to demonstrate that I *could* build a production system, but I understand what's appropriate for a prototype, and I can articulate the difference.**

That's senior-level engineering judgment.

That's what gets you hired.
