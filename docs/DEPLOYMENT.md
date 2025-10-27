# Deploying to Vercel

This guide walks you through deploying the Lamar Health Care Plan Generator to Vercel.

---

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Your code pushed to a GitHub repository

---

## Step-by-Step Deployment

### Step 1: Set Up Database (Vercel Postgres)

**Option A: Use Vercel Postgres (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a database name (e.g., `lamar-health-db`)
6. Select region (choose closest to your users)
7. Click **Create**

**Copy the connection string** - you'll need this for environment variables.

**Option B: Use External Database (Supabase, Railway, Neon)**

If you prefer an external provider:
- **Supabase:** https://supabase.com (free tier available)
- **Railway:** https://railway.app (simple setup)
- **Neon:** https://neon.tech (serverless Postgres)

Get the PostgreSQL connection string from your provider.

---

### Step 2: Push Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Care Plan Generator"

# Create GitHub repo at https://github.com/new
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/lamar-health.git
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy to Vercel

#### 3.1: Import Project

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your GitHub repository
4. Vercel will auto-detect Next.js settings

#### 3.2: Configure Environment Variables

Click **Environment Variables** and add:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Your Postgres connection string |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Your Anthropic API key |
| `NODE_ENV` | `production` | Production environment |

**Where to get these:**
- `DATABASE_URL`: From Vercel Postgres dashboard or your external provider
- `ANTHROPIC_API_KEY`: From https://console.anthropic.com/settings/keys
- `NODE_ENV`: Just set to `production`

**Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments.

#### 3.3: Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

#### 3.4: Deploy

Click **Deploy** and wait for the build to complete (2-3 minutes).

---

### Step 4: Run Database Migration

After first deployment, you need to initialize the database schema.

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migration
npx prisma migrate deploy
```

**Option B: Using Prisma Data Platform**

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Copy the `DATABASE_URL`
4. Run locally:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

**Option C: Via Vercel Build (Add to package.json)**

Update `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    // ... other scripts
  }
}
```

Then redeploy on Vercel.

---

### Step 5: Verify Deployment

1. Visit your deployment URL (e.g., `https://lamar-health.vercel.app`)
2. Test the patient form
3. Submit a test patient
4. Verify care plan generation works

---

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to your Vercel project
2. Click **Settings** → **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

### Enable Vercel Analytics (Recommended)

1. Go to your Vercel project
2. Click **Analytics** tab
3. Click **Enable**
4. Add to `app/layout.tsx`:
   ```tsx
   import { Analytics } from '@vercel/analytics/react';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

---

## Troubleshooting Common Issues

### Issue 1: Build fails with "Prisma Client not found"

**Solution:** Ensure Prisma generates client during build

Add to `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### Issue 2: Database connection fails

**Solution:** Check environment variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify `DATABASE_URL` is set correctly
3. Redeploy after updating

### Issue 3: API routes return 500 errors

**Solution:** Check function logs

1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment
3. Click **Functions** tab
4. View logs for errors

### Issue 4: Prisma migration fails

**Solution:** Run migration manually

```bash
# Pull production DATABASE_URL
vercel env pull .env.local

# Run migration
npx prisma migrate deploy
```

### Issue 5: ANTHROPIC_API_KEY not working

**Solution:** Verify API key and regenerate if needed

1. Go to https://console.anthropic.com/settings/keys
2. Create new API key
3. Update in Vercel environment variables
4. Redeploy

---

## Environment-Specific Configuration

### Development (Local)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lamar_health
ANTHROPIC_API_KEY=sk-ant-api03-...
NODE_ENV=development
```

### Preview (Vercel Preview Deployments)
- Uses same environment variables as Production
- Created automatically for each PR/branch

### Production (Vercel)
- Set via Vercel Dashboard
- Never commit production secrets to git

---

## Monitoring and Logs

### View Logs

**Real-time logs:**
```bash
vercel logs --follow
```

**Specific deployment:**
1. Go to Vercel Dashboard → Deployments
2. Click on deployment
3. View **Build Logs** or **Function Logs**

### Performance Monitoring

1. Vercel Dashboard → Analytics
2. Check:
   - Response times
   - Error rates
   - Traffic patterns

---

## Updating Your Deployment

### Automatic Deployments

Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature X"
git push origin main

# Vercel deploys automatically
```

### Manual Deployments

```bash
# Deploy using CLI
vercel --prod
```

---

## Database Management

### View Database

**Option A: Prisma Studio**
```bash
# Pull production URL
vercel env pull .env.local

# Open Prisma Studio
npx prisma studio
```

**Option B: Vercel Dashboard**
1. Go to Storage → Your Database
2. Click **Query** tab
3. Run SQL queries

### Backup Database

```bash
# Export data
pg_dump $DATABASE_URL > backup.sql

# Restore data
psql $DATABASE_URL < backup.sql
```

---

## Security Best Practices

### 1. Protect Environment Variables
- ✅ Never commit `.env` to git
- ✅ Use Vercel Environment Variables
- ✅ Rotate API keys regularly

### 2. Database Security
- ✅ Use connection pooling (Prisma handles this)
- ✅ Enable SSL (Vercel Postgres has this by default)
- ✅ Limit database access to Vercel IPs if possible

### 3. API Rate Limiting
- Consider adding rate limiting for API routes
- Use Vercel Edge Middleware for protection

---

## Cost Estimates

### Vercel
- **Hobby (Free):**
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Good for demo/prototype

- **Pro ($20/month):**
  - 1 TB bandwidth
  - Better performance
  - Custom domains

### Vercel Postgres
- **Free tier:**
  - 256 MB storage
  - 60 hours compute/month
  - Good for prototype

- **Pro ($0.25/10k rows):**
  - Pay as you grow

### Anthropic API
- **Claude 3.5 Sonnet:**
  - $3 per million input tokens
  - $15 per million output tokens
  - Estimate: ~$0.10-0.30 per care plan

**Total estimated cost for demo:** $0-20/month

---

## Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Test patient form submission
- [ ] Test care plan generation
- [ ] Test duplicate detection warnings
- [ ] Verify API routes work
- [ ] Check function logs for errors
- [ ] Set up custom domain (optional)
- [ ] Enable analytics (optional)
- [ ] Test on mobile devices
- [ ] Share demo URL with stakeholders

---

## Quick Reference Commands

```bash
# Deploy to Vercel
vercel --prod

# View logs
vercel logs --follow

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Check deployment status
vercel ls
```

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Vercel Community:** https://github.com/vercel/vercel/discussions

---

## Next Steps After Deployment

1. **Share the URL** with Lamar Health team
2. **Monitor logs** for first 24 hours
3. **Gather feedback** on UX and functionality
4. **Iterate** based on feedback
5. **Add tests** for production stability
6. **Set up monitoring** (Sentry, Datadog)
7. **Document API** for future developers

---

**Your deployment URL will be:** `https://lamar-health-[random].vercel.app`

You can customize this with a custom domain later.

Good luck with your deployment! 🚀
