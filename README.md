# AI Care Plan Generator

An automated care plan generation system for specialty pharmacies, built with Next.js, TypeScript, and Claude AI.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

This application streamlines pharmacist workflows by automating the creation of patient care plans, which are required for Medicare reimbursement and pharmaceutical reporting. The system reduces manual care plan creation time from 20-40 minutes to under 30 seconds.

### Key Features

- Patient data entry and validation
- NPI and ICD-10 code validation
- Duplicate patient and order detection
- Provider conflict detection
- AI-powered care plan generation using Claude 3.5 Sonnet
- Markdown rendering and downloadable output

## Technical Implementation

### Data Validation
- NPI validation using Luhn checksum algorithm
- ICD-10 format and chapter range validation
- Real-time form validation with Zod schemas

### Duplicate Detection
- Exact MRN matching
- Fuzzy name matching using Jaro-Winkler distance
- Provider conflict detection via NPI uniqueness

### Care Plan Generation
- Claude 3.5 Sonnet integration
- Retry logic with exponential backoff
- Timeout handling for API calls
- Markdown rendering with downloadable output

### Data Management
- PostgreSQL database with Prisma ORM
- Transaction management for atomic operations
- Structured JSON logging

## Architecture

The application uses a layered architecture with clear separation of concerns:

- **Interface Layer**: Next.js API routes and React components
- **Service Layer**: Business logic orchestration (PatientService, CarePlanService, DuplicateDetector)
- **Domain Layer**: Core types, errors, and business rules
- **Infrastructure Layer**: Database (Prisma), AI (Anthropic), logging, retry logic

### Design Patterns

**Result Types for Error Handling**
```typescript
type Result<T, E> = Success<T> | Failure<E>;

const result = await service.createPatient(input);
if (isFailure(result)) {
  return handleError(result.error);
}
const patient = result.data.patient;
```

**Dependency Injection**
```typescript
class PatientService {
  constructor(
    private readonly db: PrismaClient,
    private readonly duplicateDetector: DuplicateDetector
  ) {}
}
```

**Atomic Transactions**
```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations execute atomically
});
```

## Tech Stack

- **Frontend**: React 19, Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Query
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude 3.5 Sonnet
- **Testing**: Vitest, Playwright
- **Language**: TypeScript 5.0

## 📦 Getting Started

### Prerequisites

- Node.js 18+ (or use `nvm`)
- PostgreSQL 15+ (or use Docker Compose)
- Anthropic API key ([get one here](https://console.anthropic.com))

### 1. Clone the Repository

```bash
git clone https://github.com/ezhong0/lamar-health-care-plan.git
cd lamar-health-care-plan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

**Option A: Use Docker Compose (easiest)**
```bash
docker-compose up -d
```

**Option B: Use existing PostgreSQL**
```bash
# Update DATABASE_URL in .env
```

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lamar_health?schema=public"

# Anthropic API Key
ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Environment
NODE_ENV="development"
```

### 5. Run Migrations

```bash
npx prisma migrate dev
```

### 6. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## Deployment

The application can be deployed to Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `ANTHROPIC_API_KEY`
   - `NODE_ENV=production`
3. Deploy

## License

MIT License - See [LICENSE](LICENSE) for details.
