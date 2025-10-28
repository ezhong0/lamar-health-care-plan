# Vercel Deployment Guide

## ✅ Fixes Applied

The following configurations have been added to fix Vercel deployment issues:

### 1. Prisma Configuration ✅

**File:** `prisma/schema.prisma`
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

**What it does:** Includes the Prisma query engine binary for Vercel's serverless environment (RHEL with OpenSSL 3.0)

### 2. Next.js Configuration ✅

**File:** `next.config.ts`
```typescript
serverExternalPackages: ['jsdom', '@prisma/client', 'prisma']
```

**What it does:** Tells Next.js to exclude these packages from bundling (they're handled externally in serverless)

### 3. Build Script ✅

**File:** `package.json`
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**What it does:** Ensures Prisma client is generated before deployment

### 4. Vercel Configuration ✅

**File:** `vercel.json`
```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

**What it does:**
- Generates Prisma client during build
- Runs migrations automatically
- Sets 60-second timeout for API routes (needed for LLM calls)

---

## 🚀 Deployment Steps

### Prerequisites

1. **Vercel Account:** Sign up at https://vercel.com
2. **Database:** PostgreSQL instance (recommended: Neon, Supabase, or Vercel Postgres)
3. **Anthropic API Key:** Get from https://console.anthropic.com

### Step 1: Connect to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link
```

### Step 2: Configure Environment Variables

In Vercel Dashboard (or via CLI):

```bash
# Production environment variables
vercel env add ANTHROPIC_API_KEY
# Paste your sk-ant-... key

vercel env add DATABASE_URL
# Paste your PostgreSQL connection string
# Format: postgresql://user:password@host:5432/database?sslmode=require

vercel env add NODE_ENV
# Enter: production

vercel env add LOG_LEVEL
# Enter: info
```

**IMPORTANT:** If using Vercel Postgres, your DATABASE_URL should look like:
```
postgres://user:password@host.pooler.neon.tech:5432/database?sslmode=require&pgbouncer=true
```

### Step 3: Deploy

```bash
# Deploy to production
vercel --prod
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "Prisma Client could not locate the Query Engine"

**Solution:** Already fixed in `prisma/schema.prisma` with `binaryTargets`

**Verify:**
```bash
# Check that binaryTargets includes rhel-openssl-3.0.x
cat prisma/schema.prisma | grep binaryTargets
```

### Issue 2: "Failed to load external module jsdom"

**Solution:** Already fixed in `next.config.ts` with `serverExternalPackages`

**Verify:**
```bash
# Check that jsdom is in serverExternalPackages
cat next.config.ts | grep serverExternalPackages
```

### Issue 3: "Database connection failed"

**Troubleshooting:**
1. Check DATABASE_URL format includes `?sslmode=require`
2. Verify database accepts connections from Vercel IPs
3. Test connection locally:
   ```bash
   psql "YOUR_DATABASE_URL"
   ```

### Issue 4: "Migrations not applied"

**Solution:**
```bash
# Apply migrations manually in Vercel deployment
vercel env pull .env.production
prisma migrate deploy --preview-feature
```

### Issue 5: "Function timeout (10s exceeded)"

**Solution:** Already fixed in `vercel.json` with 60-second timeout for API routes

---

## 📊 Post-Deployment Checks

### 1. Test API Endpoints

```bash
# Get your deployment URL
VERCEL_URL=$(vercel --prod | grep https)

# Test health endpoint
curl $VERCEL_URL/api/patients

# Test seed endpoint (optional)
curl -X POST $VERCEL_URL/api/seed
```

### 2. Check Logs

```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --follow
```

### 3. Verify Database Connection

In Vercel Dashboard:
- Go to Deployments → Latest Deployment → Functions
- Click on any API route
- Check logs for database connection

---

## 🔧 Troubleshooting Checklist

- [ ] Prisma binaryTargets includes `rhel-openssl-3.0.x`
- [ ] postinstall script runs `prisma generate`
- [ ] DATABASE_URL environment variable set in Vercel
- [ ] ANTHROPIC_API_KEY environment variable set in Vercel
- [ ] Database allows connections from Vercel (check firewall)
- [ ] DATABASE_URL includes `?sslmode=require` for secure connections
- [ ] Build command includes `prisma migrate deploy`
- [ ] serverExternalPackages includes jsdom and prisma packages

---

## 🎯 Expected Result

After successful deployment, you should see:

1. ✅ **Build succeeds** with no errors
2. ✅ **API routes respond** at `https://your-app.vercel.app/api/patients`
3. ✅ **Care plan generation works** (may take 10-30 seconds)
4. ✅ **Export endpoint works** at `https://your-app.vercel.app/api/export`

---

## 📞 Support

If you encounter issues:

1. **Check Vercel Logs:** `vercel logs`
2. **Check Prisma Docs:** https://www.prisma.io/docs/guides/deployment/deployment-guides/vercel
3. **Check Next.js Docs:** https://nextjs.org/docs/app/building-your-application/deploying/production

---

## 🔄 Redeployment

To redeploy after making changes:

```bash
# Commit your changes
git add .
git commit -m "Fix: deployment configuration"
git push

# Vercel auto-deploys on push to main branch
# Or manually deploy:
vercel --prod
```

---

## ✨ Optimization Tips

### Enable Edge Functions (Optional)

For faster response times, consider using Edge Runtime for non-database routes:

```typescript
// app/api/some-route/route.ts
export const runtime = 'edge';
```

**Note:** Don't use edge runtime for routes that use Prisma (database queries).

### Enable Caching (Optional)

Add caching headers to read-only endpoints:

```typescript
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  });
}
```

---

**All configuration files have been updated. Your deployment should now work! 🚀**
