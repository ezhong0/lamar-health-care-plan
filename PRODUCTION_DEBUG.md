# Production Bug: JSON Parsing Error on Vercel

## Issue
"Failed to execute 'json' on 'Response': Unexpected end of JSON input" occurring on production Vercel deployment.

## Root Cause Analysis

The validation endpoint (`/api/patients/validate`) is likely failing to connect to the database or crashing before returning proper JSON.

### Most Common Causes:

1. **Missing/Invalid DATABASE_URL in Vercel**
2. **Neon database connection issue**
3. **Prisma Client not generated in production build**
4. **Environment variable typo**

---

## Debugging Steps

### Step 1: Check Vercel Logs

1. Go to https://vercel.com/your-account/your-project
2. Click on your latest deployment
3. Go to "Functions" tab
4. Find `/api/patients/validate` function
5. Check the logs for errors

**Look for:**
- `Database connection failed`
- `Prisma Client not found`
- `Cannot connect to database server`
- Any error messages

---

### Step 2: Verify Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required variables:**

```
DATABASE_URL
└─ Should be: postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
└─ NOT: postgresql://localhost:5432/...

ANTHROPIC_API_KEY
└─ Should be: sk-ant-api03-...

NODE_ENV (optional, auto-set by Vercel)
└─ Should be: production
```

**Common mistakes:**
- ❌ Using localhost URL instead of Neon URL
- ❌ Missing `?sslmode=require` at the end of Neon URL
- ❌ Password has special characters that need URL encoding
- ❌ Using quotes around the value (Vercel doesn't need quotes)

---

### Step 3: Test Database Connection

**Add this health check endpoint:**

Create: `app/api/debug/db-test/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/infrastructure/db';

export async function GET() {
  try {
    // Try to query database
    await prisma.$queryRaw`SELECT 1 as result`;

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
```

**Then:**
1. Deploy to Vercel: `git add . && git commit -m "Add DB test" && git push`
2. Visit: `https://your-app.vercel.app/api/debug/db-test`
3. Check if database connects

---

### Step 4: Check Neon Database Settings

Go to your Neon dashboard:

1. **Verify database is running:**
   - Not suspended/paused
   - Has available compute hours
   - Connection limit not exceeded

2. **Get correct connection string:**
   - Go to Neon Dashboard → Your Project → Connection Details
   - Copy the **connection string with pooling** (recommended for serverless)
   - Should look like: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

3. **Test connection locally:**
   ```bash
   # Replace with your Neon URL
   psql "postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
   ```

---

### Step 5: Fix Prisma Client Generation

The issue might be that Prisma Client isn't being generated during Vercel build.

**Verify `package.json` has postinstall script:**

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**Or add to `vercel.json`:**

```json
{
  "buildCommand": "prisma generate && next build"
}
```

**Then redeploy:**
```bash
git add package.json
git commit -m "Fix Prisma generation"
git push
```

---

## Quick Fix (Most Likely Solution)

### Issue: DATABASE_URL pointing to localhost in production

**Symptom:** Works locally, fails in production with JSON parsing error.

**Solution:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Find `DATABASE_URL` and click "Edit"

3. Change from:
   ```
   ❌ postgresql://postgres:postgres@localhost:5432/lamar_health
   ```

4. To your Neon URL:
   ```
   ✅ postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

5. Make sure it's set for **Production** environment

6. **Redeploy** (Vercel will automatically redeploy when you change env vars)

---

## Testing After Fix

### 1. Check Health Endpoint
```bash
curl https://your-app.vercel.app/api/health
# Should return: {"status":"ok","database":"connected"}
```

### 2. Check Validation Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/patients/validate \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient",
    "mrn": "123456",
    "referringProvider": "Dr. Test",
    "referringProviderNPI": "1234567893",
    "primaryDiagnosis": "G70.00",
    "medicationName": "IVIG",
    "additionalDiagnoses": [],
    "medicationHistory": [],
    "patientRecords": "Test notes"
  }'

# Should return: {"success":true,"data":{"valid":true,"warnings":[]}}
```

### 3. Try Creating Patient in Browser
- Go to your production URL
- Navigate to /patients/new
- Fill out form
- Click Create Patient
- Should work without JSON error

---

## Prevention: Better Error Messages

The fixes I applied will help you diagnose this faster:

1. **Database connection check** - validation endpoint now checks DB first
2. **Better error messages** - shows "Database unavailable" instead of JSON error
3. **Status codes** - returns 503 for DB issues
4. **Logging** - logs errors to Vercel console

After redeploying, you'll see a clear error message like:
```
"Database is unavailable. Please ensure the database is running."
```

Instead of the cryptic JSON parsing error.

---

## If Still Not Working

### Check Vercel Function Logs

1. Vercel Dashboard → Deployments → Latest → Functions
2. Click on `/api/patients/validate`
3. Look for specific error messages

### Common Issues:

**Issue: "ECONNREFUSED" or "Connection refused"**
- DATABASE_URL is wrong
- Using localhost instead of Neon URL

**Issue: "P1001: Can't reach database server"**
- Neon database is paused/suspended
- Connection string is incorrect
- Firewall blocking connection

**Issue: "P1017: Server has closed the connection"**
- Connection limit reached on Neon
- Need connection pooling (add `?pgbouncer=true`)

**Issue: "Prisma Client not found"**
- Missing `prisma generate` in build
- Add postinstall script to package.json

---

## Vercel-Specific Configuration

### Recommended Neon Connection String for Vercel:

```
postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
```

**Important parameters:**
- `sslmode=require` - Required by Neon
- `pgbouncer=true` - Use connection pooling (recommended for serverless)
- `connect_timeout=15` - Prevent hanging connections

---

## Contact Support

If none of this works, provide:

1. **Vercel deployment URL**
2. **Screenshot of error**
3. **Vercel function logs** (from Functions tab)
4. **Environment variables** (WITHOUT actual passwords!)
   - DATABASE_URL format (e.g., "postgresql://...neon.tech/...")
   - ANTHROPIC_API_KEY present? (yes/no)
5. **Neon database status** (active/paused)

---

## TL;DR - Quick Checklist

- [ ] DATABASE_URL in Vercel points to Neon (not localhost)
- [ ] DATABASE_URL includes `?sslmode=require`
- [ ] Neon database is active (not paused)
- [ ] `prisma generate` runs during build
- [ ] Vercel redeployed after env var changes
- [ ] Test with `/api/health` endpoint
- [ ] Check Vercel function logs for specific errors

**Most likely fix:** Change DATABASE_URL in Vercel settings to your Neon connection string.
