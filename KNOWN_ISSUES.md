# Known Issues Checklist

Use this checklist to prevent recurring issues. When you encounter a bug, add it here with the solution.

---

## 🚀 Before Deploying to Vercel

- [ ] `npm run build` succeeds locally
- [ ] All TypeScript errors resolved: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Prisma schema matches DATABASE_URL format (PostgreSQL, not SQLite)
- [ ] All environment variables added to Vercel dashboard:
  - `DATABASE_URL`
  - `ANTHROPIC_API_KEY`
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] No dev dependencies imported in server code (e.g., `dotenv/config`)
- [ ] Test build output size (should be <50MB for serverless)

### Common Vercel Deployment Issues

**Issue:** "Prisma query engine not found"
**Solution:** Ensure `next.config.ts` includes:
```typescript
experimental: {
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/**/*'],
  },
}
```

**Issue:** "Function timeout (10s default)"
**Solution:** Add `maxDuration` to route:
```typescript
export const maxDuration = 60; // 60 seconds for AI generation
```

**Issue:** "Environment variable undefined in production"
**Solution:**
1. Check Vercel dashboard → Project → Settings → Environment Variables
2. Ensure variable is set for "Production" environment
3. Redeploy after adding variables

---

## 🔧 When Adding New Dependencies

- [ ] Check package size: `npm view <package> dist.tarball`
- [ ] Verify serverless compatibility (no `fs`, `child_process` in browser code)
- [ ] Test in production build: `npm run build`
- [ ] Check Vercel build logs for warnings
- [ ] Verify package has TypeScript types (`@types/<package>` or built-in)

### Common Dependency Issues

**Issue:** "Module not found" in production but works locally
**Solution:**
- Check if it's in `devDependencies` (should be `dependencies`)
- Verify import path is correct (case-sensitive on Linux)

**Issue:** "Dynamic require of X is not supported"
**Solution:**
- Package is trying to use Node.js APIs in browser
- Use dynamic import: `const pkg = await import('package')`
- Or configure in `next.config.ts`: `webpack: (config) => { config.resolve.fallback = { fs: false }; }`

---

## 🤖 When Changing AI Generation

- [ ] Test with 3+ diverse example patients locally
- [ ] Verify output format matches expected structure (markdown sections)
- [ ] Check token usage: prompt + response should be <4000 tokens for Haiku
- [ ] Add timeout handling (60s max for Haiku)
- [ ] Test error handling (rate limit, network timeout)
- [ ] Verify cost per request (Haiku: ~$0.02, Sonnet: ~$0.10)

### AI Model Comparison (tested Oct 27, 2025)

| Model | Speed | Quality | Cost/Request | Best For |
|-------|-------|---------|--------------|----------|
| Haiku 4.5 | 3-5s | ★★★★☆ | $0.02 | Production (current) |
| Sonnet 3.5 | 8-12s | ★★★★★ | $0.10 | High-quality reviews |
| Sonnet 4.5 | 10-15s | ★★★★★ | $0.12 | Complex cases |

**Decision:** Use Haiku 4.5 for production (fast enough, good quality, low cost)

### Common AI Issues

**Issue:** "Rate limit exceeded"
**Solution:**
- Implement exponential backoff retry
- Add user-facing error message: "AI service busy, try again in 60s"
- Consider caching generated plans

**Issue:** "Response too slow (>10s)"
**Solution:**
- Switch to Haiku (faster model)
- Reduce prompt length (remove unnecessary context)
- Add streaming for progress indicator

**Issue:** "Generated content missing sections"
**Solution:**
- Check prompt structure (are all sections requested?)
- Increase `max_tokens` (current: 3500)
- Add validation to detect incomplete responses

---

## 🗄️ When Modifying Database Schema

- [ ] Create migration: `npx prisma migrate dev --name <descriptive-name>`
- [ ] Test migration: `npx prisma migrate reset` (WARNING: deletes data)
- [ ] Check foreign key constraints (cascade deletes?)
- [ ] Verify indexes on frequently queried fields
- [ ] Test rollback procedure
- [ ] Update TypeScript types: `npx prisma generate`
- [ ] Update any affected API routes/services

### Common Database Issues

**Issue:** "Foreign key constraint failed"
**Solution:**
- Check if referenced record exists
- Verify `onDelete: Cascade` is set if child should be deleted

**Issue:** "Unique constraint violation"
**Solution:**
- Check if record already exists before creating
- Consider using `upsert` instead of `create`

**Issue:** "Migration failed on production"
**Solution:**
- Never run `prisma migrate dev` on production
- Use `prisma migrate deploy` (applies pending migrations without prompts)
- Test migrations on staging database first

---

## 🧪 When Tests Fail

- [ ] Run tests in isolation: `npm test -- <test-file>`
- [ ] Check for test database pollution (each test should clean up)
- [ ] Verify test fixtures are up-to-date with schema changes
- [ ] Run with `--verbose` flag for detailed output
- [ ] Check if issue is timing (add `await` for async operations)

### Common Test Issues

**Issue:** "Tests pass locally but fail in CI"
**Solution:**
- Check for hardcoded paths (use `path.join(__dirname, ...)`)
- Verify environment variables are set in CI
- Check for race conditions (parallel test execution)

**Issue:** "Test database not found"
**Solution:**
- Ensure `DATABASE_URL` in `.env.test` points to test database
- Run migrations on test DB: `npx prisma migrate deploy`

---

## 🎨 When UI Rendering Issues Occur

- [ ] Check browser console for errors
- [ ] Verify component key props (React list rendering)
- [ ] Check for hydration mismatches (server vs client rendering)
- [ ] Test in incognito mode (eliminate extension conflicts)
- [ ] Check CSS conflicts (Tailwind class ordering)

### Common UI Issues

**Issue:** "Hydration error: Text content does not match"
**Solution:**
- Don't use `Date.now()` or `Math.random()` directly in render
- Use `useEffect` for client-only code
- Check for `<p>` inside `<p>` (invalid HTML)

**Issue:** "Component not updating when state changes"
**Solution:**
- Check if you're mutating state directly (use `setState`)
- Verify React Query cache invalidation
- Check dependency array in `useEffect`

---

## 📊 Performance Issues

- [ ] Check Network tab for slow API calls
- [ ] Verify database queries use indexes (run `EXPLAIN ANALYZE`)
- [ ] Check bundle size: `npm run build` (should be <2MB JavaScript)
- [ ] Use React DevTools Profiler to find slow components
- [ ] Check for unnecessary re-renders

### Common Performance Bottlenecks

**Issue:** "API endpoint slow (>1s)"
**Solution:**
- Add database indexes on queried fields
- Use Prisma `include` instead of separate queries (N+1 problem)
- Add caching (React Query on client, Redis on server)

**Issue:** "Large bundle size"
**Solution:**
- Use dynamic imports: `const Component = dynamic(() => import('./Heavy'))`
- Check for duplicate dependencies: `npm dedupe`
- Analyze bundle: `npm run build -- --analyze`

---

## 🔒 Security Checklist

- [ ] All user input validated with Zod schemas
- [ ] SQL injection prevented (using Prisma parameterized queries)
- [ ] XSS prevented (React auto-escapes, DOMPurify for markdown)
- [ ] CSV injection prevented (formula character detection)
- [ ] Prompt injection guards in place (pattern detection)
- [ ] API keys not committed to git (in `.env.local`, not `.env`)
- [ ] CORS configured correctly (only allow trusted origins in production)

---

## 📝 Commit Message Guidelines

**Bad:** ❌
```
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
```

**Good:** ✅
```
git commit -m "Fix: Prevent duplicate patient creation with same MRN"
git commit -m "Feat: Add real-time duplicate detection to patient form"
git commit -m "Refactor: Extract NPI validation to separate service"
git commit -m "Docs: Add API reference for care plan endpoints"
```

**Format:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring (no behavior change)
- `perf:` Performance improvement
- `docs:` Documentation only
- `style:` Formatting (no code change)
- `test:` Add/update tests
- `chore:` Maintenance (dependencies, config)

---

## 🆘 When Stuck (>30 min debugging)

**STOP. Follow this protocol:**

1. **Take a 5-minute break** (seriously, walk away)

2. **Write down the problem:**
   - What I'm trying to do: _____
   - What's happening: _____
   - What I've tried: _____
   - Error message (exact text): _____

3. **Search the EXACT error message**
   - Google: `"exact error message" prisma vercel`
   - GitHub Issues: `repo:vercel/next.js "error message"`
   - Stack Overflow

4. **Check documentation**
   - Official docs (Vercel, Prisma, Next.js)
   - Often has EXACT solution for common issues

5. **Create minimal reproduction**
   - Remove everything unrelated
   - Test simplest possible version
   - Often reveals the actual problem

6. **Ask for help** (after 1 hour)
   - GitHub issue with reproduction steps
   - Discord/Slack with context
   - Don't waste 4 hours on a 10-minute solution

---

## 📌 Project-Specific Notes

### This Project's Common Issues

**Issue:** Validation warnings not showing
**Check:** `/api/patients/validate` called before submit?

**Issue:** Care plan generation timing out
**Check:** Using Haiku model? `maxDuration = 60` set?

**Issue:** Duplicate detection not working
**Check:** Database has enough patients to test? (need 2+ similar names)

**Issue:** CSV export contains formulas
**Check:** CSV injection protection applied to all fields?

---

## ✅ Pre-Commit Checklist (Quick)

Before every commit:
- [ ] Code builds: `npm run build`
- [ ] Types valid: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Commit message is descriptive

---

**Remember:** Add to this list every time you encounter a new issue. Future you will thank you!
