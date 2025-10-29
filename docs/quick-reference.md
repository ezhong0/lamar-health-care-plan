# Quick Reference Guide

## Common Development Tasks

### Running the Application

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Open http://localhost:3000
```

### Database Operations

```bash
# Create a new migration
npx prisma migrate dev --name add_patient_notes

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### Testing

```bash
# Run E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/patient-creation.spec.ts

# Debug tests
npx playwright test --debug
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Format code
npm run format
```

## Common Code Patterns

### Creating a New API Endpoint

**1. Create route handler:**
```typescript
// app/api/patients/[id]/notes/route.ts
import { NextRequest } from 'next/server';
import { NoteInputSchema } from '@/lib/validation/schemas';
import { noteService } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = NoteInputSchema.parse(body);

    const result = await noteService.createNote({
      patientId: params.id,
      ...validated
    });

    if (!result.success) {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { success: false, error: 'Invalid input' },
      { status: 400 }
    );
  }
}
```

**2. Add Zod schema:**
```typescript
// lib/validation/schemas.ts
export const NoteInputSchema = z.object({
  content: z.string().min(1).max(5000),
  category: z.enum(['clinical', 'administrative', 'pharmacy']),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;
```

**3. Create service:**
```typescript
// lib/services/note-service.ts
export class NoteService {
  constructor(private db: PrismaClient) {}

  async createNote(input: CreateNoteInput): Promise<Result<Note>> {
    try {
      const note = await this.db.note.create({
        data: input
      });

      return { success: true, data: note };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}
```

**4. Add React Query hook:**
```typescript
// lib/client/hooks.ts
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NoteInput) => {
      const res = await fetch(`/api/patients/${input.patientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
```

### Adding a New Database Model

**1. Update Prisma schema:**
```prisma
// prisma/schema.prisma
model PatientNote {
  id        String   @id @default(cuid())
  patientId String
  patient   Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  content   String   @db.Text
  category  String
  authorId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([patientId])
  @@index([createdAt])
}

model Patient {
  // ... existing fields
  notes     PatientNote[]  // Add relation
}
```

**2. Create migration:**
```bash
npx prisma migrate dev --name add_patient_notes
```

**3. Define domain type:**
```typescript
// lib/domain/types.ts
export type NoteId = string & { readonly __brand: 'NoteId' };

export type Note = {
  id: NoteId;
  patientId: PatientId;
  content: string;
  category: 'clinical' | 'administrative' | 'pharmacy';
  authorId?: UserId;
  createdAt: Date;
  updatedAt: Date;
};
```

### Handling Errors with Result Types

```typescript
// Service method
async function createPatient(input: PatientInput): Promise<Result<Patient>> {
  // Validation
  if (!input.mrn) {
    return {
      success: false,
      error: new ValidationError('MRN is required')
    };
  }

  // Database operation
  try {
    const patient = await db.patient.create({ data: input });
    return { success: true, data: patient };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

// Usage in API handler
const result = await patientService.createPatient(input);

if (!result.success) {
  return Response.json(
    { success: false, error: result.error.message },
    { status: 400 }
  );
}

return Response.json(result);

// Usage in React component
const { mutateAsync: createPatient } = useCreatePatient();

try {
  const result = await createPatient(formData);

  if (result.success) {
    toast.success('Patient created');
    router.push(`/patients/${result.data.id}`);
  } else {
    toast.error(result.error);
  }
} catch (error) {
  toast.error('Network error');
}
```

### Adding AI-Generated Content

```typescript
// Service method
async generateContent(input: ContentInput): Promise<Result<string>> {
  const prompt = this.buildPrompt(input);

  try {
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return {
        success: false,
        error: new Error('Unexpected response type')
      };
    }

    return { success: true, data: content.text };
  } catch (error) {
    logger.error('AI generation failed', { error });

    if (error.status === 429) {
      return {
        success: false,
        error: new Error('Rate limit exceeded. Try again in 60 seconds.')
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error('AI generation failed')
    };
  }
}

// Prompt building
private buildPrompt(input: ContentInput): string {
  return `
You are a clinical pharmacist assistant.

## Patient Context
${this.sanitize(input.patientData)}

## Task
Generate ${input.contentType} following these guidelines:
- Professional medical tone
- Evidence-based recommendations
- 500-1000 words

Generate the content:
  `.trim();
}
```

### Form Validation with Zod

```typescript
// Define schema
const PatientFormSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  mrn: z.string().regex(/^\d{6}$/, 'MRN must be exactly 6 digits'),
  referringProviderNPI: z.string().refine(
    (npi) => validateNPI(npi),
    'Invalid NPI checksum'
  ),
});

// React Hook Form integration
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function PatientForm() {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(PatientFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      // ...
    }
  });

  const onSubmit = async (data: PatientFormData) => {
    const result = await createPatient(data);
    // Handle result
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input
        {...form.register('firstName')}
        placeholder="First Name"
      />
      {form.formState.errors.firstName && (
        <span>{form.formState.errors.firstName.message}</span>
      )}
      {/* More fields */}
    </form>
  );
}
```

## Environment Variables

```bash
# .env.local

# Database
DATABASE_URL="postgresql://user:pass@host/db"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Optional: Logging
LOG_LEVEL="info"  # debug | info | warn | error

# Optional: Features
ENABLE_AI_GENERATION="true"
MAX_RETRIES="3"
```

## Useful SQL Queries

```sql
-- Find patients with duplicate MRNs
SELECT mrn, COUNT(*) as count
FROM "Patient"
GROUP BY mrn
HAVING COUNT(*) > 1;

-- Find patients with multiple orders
SELECT p.id, p."firstName", p."lastName", COUNT(o.id) as order_count
FROM "Patient" p
LEFT JOIN "Order" o ON o."patientId" = p.id
GROUP BY p.id, p."firstName", p."lastName"
HAVING COUNT(o.id) > 1
ORDER BY order_count DESC;

-- Find orders without care plans
SELECT o.id, o."medicationName", p."firstName", p."lastName"
FROM "Order" o
JOIN "Patient" p ON p.id = o."patientId"
LEFT JOIN "CarePlan" cp ON cp."orderId" = o.id
WHERE cp.id IS NULL;

-- Recent activity
SELECT
  p."firstName",
  p."lastName",
  o."medicationName",
  o."createdAt"
FROM "Order" o
JOIN "Patient" p ON p.id = o."patientId"
ORDER BY o."createdAt" DESC
LIMIT 10;
```

## Debugging Tips

### Enable Detailed Logging

```typescript
// lib/infrastructure/logger.ts
logger.level = 'debug';  // Show all logs

// In service methods
logger.debug('Detailed context', {
  patientId,
  input: JSON.stringify(input),
  state: currentState,
});
```

### Prisma Query Logging

```typescript
// lib/infrastructure/database.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### React Query DevTools

```tsx
// app/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### API Response Inspection

```bash
# Test endpoint with curl
curl -v http://localhost:3000/api/patients

# Pretty print JSON
curl http://localhost:3000/api/patients | jq '.'

# Test with body
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d @patient-data.json
```

## Performance Optimization

### Database Query Optimization

```typescript
// ❌ Bad: N+1 queries
const patients = await db.patient.findMany();
for (const patient of patients) {
  const orders = await db.order.findMany({
    where: { patientId: patient.id }
  });
}

// ✅ Good: Single query with join
const patients = await db.patient.findMany({
  include: { orders: true }
});
```

### React Query Caching

```typescript
// Configure cache times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,  // 1 minute
      cacheTime: 300000,  // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Prefetch for faster navigation
queryClient.prefetchQuery({
  queryKey: ['patient', patientId],
  queryFn: () => fetchPatient(patientId),
});
```

### AI Generation

```typescript
// Cache generated content
const cached = await redis.get(`careplan:${orderId}`);
if (cached) {
  return JSON.parse(cached);
}

const generated = await generateCarePlan(orderId);
await redis.set(`careplan:${orderId}`, JSON.stringify(generated), {
  ex: 3600  // 1 hour
});
```

## Common Issues & Solutions

### Issue: "PrismaClient is not configured"

**Solution:**
```bash
npx prisma generate
```

### Issue: "Cannot find module '@/lib/..'"

**Solution:** Check `tsconfig.json` has correct path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Issue: "Invalid API key" for Claude

**Solution:** Check `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Issue: Database connection errors

**Solution:** Verify `DATABASE_URL` in `.env.local` and database is running:
```bash
# Test connection
npx prisma db push
```

### Issue: Type errors after schema change

**Solution:**
```bash
npx prisma generate
npm run type-check
```

## Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] API keys valid and secured
- [ ] CORS configured correctly
- [ ] Error monitoring set up (optional)
- [ ] Database backups configured (recommended)

## Additional Resources

- [Full Architecture Guide](architecture.md)
- [API Documentation](api-reference.md)
- [Validation Rules](validation-rules.md)
- [Contributing Guide](CONTRIBUTING.md)

## Getting Help

1. Check this quick reference
2. Review full documentation in `/docs`
3. Search codebase for similar patterns
4. Check error logs: `npm run dev` output
5. Open GitHub issue with details

---

**Pro Tip:** Keep this reference handy. Most common tasks follow these patterns, making development faster and more consistent.
