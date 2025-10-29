# Troubleshooting Guide

## Common Issues

### "Failed to execute 'json' on 'Response': Unexpected end of JSON input"

**Symptom:** Error message appears when trying to create a patient with the "Create Patient" button.

**Root Cause:** The validation endpoint is failing to return proper JSON. This is almost always due to the PostgreSQL database not running.

**Solution:**

#### Option 1: Start PostgreSQL with Docker (Recommended)
```bash
# Make sure Docker Desktop is running first!
docker-compose up -d postgres

# Verify it's running:
docker-compose ps

# Check logs if needed:
docker-compose logs postgres
```

#### Option 2: Start PostgreSQL locally
```bash
# If you have PostgreSQL installed via Homebrew:
brew services start postgresql@15

# Verify connection:
psql -h localhost -p 5432 -U postgres -d lamar_health
```

#### Option 3: Check database connection
```bash
# Run the health check:
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","database":"connected"}
```

### Verify the Fix

After starting the database:

1. Refresh the patient creation page
2. Fill out the form with valid data
3. Click "Create Patient"
4. You should either:
   - See a success message and navigate to patient details, OR
   - See warnings (duplicates) if applicable

---

## Database Not Starting?

### Check Docker Status
```bash
# Is Docker running?
docker ps

# Start Docker Desktop if not running
# Then retry: docker-compose up -d postgres
```

### Port Already in Use
```bash
# Check if port 5432 is already in use:
lsof -i :5432

# If another PostgreSQL is running:
brew services stop postgresql
# OR
sudo systemctl stop postgresql
```

### Database Migration Issues
```bash
# Reset and recreate database:
npm run db:reset

# This will:
# 1. Drop existing database
# 2. Create fresh schema
# 3. Run migrations
# 4. Seed demo data (optional)
```

---

## Development Server Issues

### Port 3000 Already in Use
```bash
# Find process using port 3000:
lsof -i :3000

# Kill it:
kill -9 <PID>

# Or use different port:
PORT=3001 npm run dev
```

### Build Errors
```bash
# Clean build artifacts:
rm -rf .next
npm run build

# If TypeScript errors:
npx tsc --noEmit
```

---

## Testing Issues

### E2E Tests Failing
```bash
# Make sure dev server is running:
npm run dev

# In another terminal, run E2E tests:
npm run test:e2e

# If tests timeout, increase timeout in playwright.config.ts:
# actionTimeout: 30000  (increase from 15000)
```

### Unit Tests Database Errors
```bash
# Tests require PostgreSQL running:
docker-compose up -d postgres

# Run tests:
npm test

# For specific test file:
npm test -- __tests__/components/PatientForm.test.tsx
```

---

## PDF Upload Issues

### "No text found in PDF"
**Cause:** PDF is image-based (scanned document) with no extractable text.

**Solution:**
- Use a text-based PDF (created digitally, not scanned)
- Or implement OCR (future enhancement with Tesseract.js)

### "Failed to process PDF"
**Cause:** PDF file is corrupted or has unsupported format.

**Solution:**
- Try a different PDF file
- Check file size (must be < 10MB)
- Ensure it's a valid PDF (not renamed .doc or other format)

---

## Production Deployment Issues

### Environment Variables
```bash
# Ensure these are set:
DATABASE_URL="postgresql://user:password@host:5432/lamar_health"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_USE_MOCKS="false"
```

### Database Connection Pooling
```bash
# For production, use connection pooling:
DATABASE_URL="postgresql://user:password@host:5432/lamar_health?pgbouncer=true&connection_limit=10"
```

### Build Fails in Production
```bash
# Prisma client generation:
npm run prisma:generate

# Build with verbose output:
npm run build -- --debug
```

---

## Getting Help

### Check Logs
```bash
# Application logs (console):
# Look for structured JSON logs with error details

# Docker logs:
docker-compose logs -f postgres

# Database query logs (if enabled):
# Check DATABASE_URL has ?log=query
```

### Debug Mode
```bash
# Run dev server with debug logging:
DEBUG=* npm run dev

# Or specific namespace:
DEBUG=prisma:* npm run dev
```

### Health Checks
```bash
# API health:
curl http://localhost:3000/api/health

# Database connection:
npm run prisma:studio  # Opens Prisma Studio

# LLM connection:
curl http://localhost:3000/api/examples/scenario
```

---

## Quick Fixes Checklist

- [ ] Is Docker Desktop running?
- [ ] Is PostgreSQL running? (`docker-compose ps`)
- [ ] Is dev server running? (`npm run dev`)
- [ ] Are environment variables set? (Check `.env` file)
- [ ] Did you run migrations? (`npm run db:push`)
- [ ] Is port 3000 available?
- [ ] Is port 5432 available?
- [ ] Did you install dependencies? (`npm install`)
- [ ] Is your ANTHROPIC_API_KEY valid?

---

## Still Having Issues?

1. **Check the console** for detailed error messages
2. **Review logs** in Docker or application console
3. **Try resetting everything:**
   ```bash
   docker-compose down -v
   rm -rf .next node_modules
   npm install
   docker-compose up -d postgres
   npm run db:push
   npm run dev
   ```

4. **Contact Support** with:
   - Error message (full text)
   - Steps to reproduce
   - Environment (OS, Node version, Docker version)
   - Relevant logs

