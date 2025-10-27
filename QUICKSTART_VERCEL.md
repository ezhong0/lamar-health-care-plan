# 🚀 Quick Start: Deploy to Vercel in 10 Minutes

## Step 1: Push to GitHub (2 min)

```bash
# If not already a git repo
git init
git add .
git commit -m "Initial commit"

# Create repo at https://github.com/new
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/lamar-health.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Vercel Postgres Database (3 min)

1. Go to https://vercel.com/dashboard
2. Click **Storage** → **Create Database** → **Postgres**
3. Name it `lamar-health-db`
4. Click **Create**
5. **Copy the `DATABASE_URL`** (you'll need this next)

---

## Step 3: Deploy to Vercel (3 min)

1. Go to https://vercel.com/new
2. **Import** your GitHub repository
3. **Add Environment Variables:**
   - `DATABASE_URL`: (paste from Step 2)
   - `ANTHROPIC_API_KEY`: `sk-ant-api03-...` (from https://console.anthropic.com)
   - `NODE_ENV`: `production`
4. Click **Deploy**

Wait 2-3 minutes for build to complete.

---

## Step 4: Run Database Migration (2 min)

**Option A: Via Vercel CLI (easiest)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link
vercel login
vercel link

# Pull env vars and migrate
vercel env pull .env.local
npx prisma migrate deploy
```

**Option B: Automatic on redeploy**
- Your `package.json` already has `prisma migrate deploy` in the build script
- Just push another commit and it will run automatically

---

## Step 5: Test Your Deployment ✅

Visit your Vercel URL: `https://your-app.vercel.app`

Test:
1. ✅ Page loads
2. ✅ Form submits
3. ✅ Care plan generates

---

## That's It! 🎉

Your app is live at: `https://your-app.vercel.app`

### Next Steps:
- Share URL with Lamar Health team
- Set up custom domain (optional)
- Monitor logs: `vercel logs --follow`

### Troubleshooting:
See full deployment guide: `docs/DEPLOYMENT.md`

---

## Environment Variables Checklist

Make sure you have these set in Vercel:

- [ ] `DATABASE_URL` - Your Postgres connection string
- [ ] `ANTHROPIC_API_KEY` - Your Claude API key
- [ ] `NODE_ENV` - Set to `production`

---

## Quick Commands

```bash
# Deploy
vercel --prod

# View logs
vercel logs --follow

# Pull env vars
vercel env pull

# Run migration
npx prisma migrate deploy
```

---

**Need help?** Check `docs/DEPLOYMENT.md` for detailed troubleshooting.
