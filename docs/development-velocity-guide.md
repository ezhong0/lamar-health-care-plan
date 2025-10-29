# Development Velocity Guide

## Analysis of Your Git History

After analyzing your git history, here are the major patterns causing the 80% debugging time:

### 🔴 Problem #1: Deployment Configuration Hell (Oct 27, 6pm-7:30pm)

**What happened:** 15+ commits in 90 minutes trying to fix Prisma on Vercel:
- `Fix Prisma query engine not found on Vercel deployment`
- `Fix Prisma binaries not included in Vercel serverless functions`
- `Fix: Move outputFileTracingIncludes to root level`
- `DEFINITIVE FIX: Use official Prisma + Vercel configuration`
- Multiple Turbopack/webpack configuration attempts

**Time lost:** ~2 hours of trial-and-error

### 🔴 Problem #2: Generic "update" Commits (Oct 28, 12:23pm-3:02pm)

**What happened:** 20+ commits with message "update" in 2.5 hours (one every 10-15 minutes):
- Small incremental changes without clear goals
- Suggests testing in production or unclear debugging strategy
- No commit messages to track what was being fixed

**Time lost:** ~3 hours of unfocused iteration

### 🔴 Problem #3: AI Model Switching Indecision (Oct 27, 7pm-7:30pm)

**What happened:** Changed models 4 times in 30 minutes:
- Haiku → Sonnet 3.5 → Sonnet 4.5 → Haiku 4.5
- Each change required testing and verification

**Time lost:** ~1 hour

---

## 🚀 Actionable Tips to Improve Velocity

### 1. **Test Locally Before Deploying** ⭐ HIGHEST IMPACT

Your Prisma/Vercel debugging could have been avoided entirely.

**DO THIS:**
```bash
# Before any deployment, run local production build
npm run build

# If it builds successfully, deployment should work
# If it fails, you'll see the error immediately (not after 5 deployments)
```

**Set up a pre-deploy checklist:**
```bash
#!/bin/bash
# save as scripts/pre-deploy-check.sh

echo "🔍 Running pre-deployment checks..."

echo "1. Type checking..."
npm run type-check || exit 1

echo "2. Linting..."
npm run lint || exit 1

echo "3. Building..."
npm run build || exit 1

echo "4. Testing critical paths..."
npm run test || exit 1

echo "✅ All checks passed! Safe to deploy."
```

**Time saved:** 90% of deployment debugging

---

### 2. **Use Feature Flags, Not Model Switching**

Instead of changing models in code and deploying:

```typescript
// lib/config/constants.ts
export const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';

// .env.local (test different models locally)
AI_MODEL=claude-sonnet-4-5-20251001
```

**Or use a simple comparison script:**
```typescript
// scripts/compare-models.ts
const models = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20251001',
];

for (const model of models) {
  const start = Date.now();
  const result = await generateCarePlan(testPatient, model);
  const duration = Date.now() - start;

  console.log(`${model}: ${duration}ms, ${result.data.length} chars`);
}

// Run locally: npx tsx scripts/compare-models.ts
```

**Time saved:** 1-2 hours per model comparison

---

### 3. **Write Descriptive Commit Messages** ⭐ CRITICAL

Your 20+ "update" commits make debugging impossible to track.

**Bad:**
```bash
git commit -m "update"
git commit -m "fix"
git commit -m "changes"
```

**Good:**
```bash
git commit -m "Fix: DuplicatePatient warning message inconsistency"
git commit -m "Refactor: Extract MRN validation to separate function"
git commit -m "UI: Add loading state to care plan generation button"
```

**Use conventional commits:**
```
feat: Add new feature
fix: Bug fix
refactor: Code restructuring
docs: Documentation
style: Formatting
test: Add/update tests
chore: Maintenance
perf: Performance improvement
```

**Why this matters:**
- You can find "when did I break X?" in 10 seconds
- `git log --oneline` actually helps you
- When you return to code later, you understand what you did

**Time saved:** 30-60 minutes per debugging session

---

### 4. **Create a "Known Issues" Checklist**

Based on your history, create a checklist for common issues:

```markdown
# Known Issues Checklist

## Before Deploying to Vercel
- [ ] `npm run build` succeeds locally
- [ ] Prisma schema matches DATABASE_URL format
- [ ] All environment variables added to Vercel dashboard
- [ ] No dev dependencies imported in server code
- [ ] Database migrations applied to production DB

## When Adding New Dependencies
- [ ] Check compatibility with serverless (no fs, path.join issues)
- [ ] Verify Vercel supports the package
- [ ] Test in production-like environment (Vercel preview deployment)

## When Changing AI Generation
- [ ] Test with multiple example patients locally
- [ ] Verify output format matches expected structure
- [ ] Check token usage/cost implications
- [ ] Add timeout handling for slow responses

## When Modifying Database Schema
- [ ] Create migration: `npx prisma migrate dev --name <name>`
- [ ] Test rollback: `npx prisma migrate reset`
- [ ] Check foreign key constraints
- [ ] Verify indexes on frequently queried fields
```

Keep this file open while developing. When you hit an issue, add it to the checklist.

**Time saved:** Prevents repeating the same mistakes

---

### 5. **Use Git Branches for Experiments**

Instead of committing "update" 20 times to main:

```bash
# Create experiment branch
git checkout -b experiment/optimize-care-plan-prompt

# Make changes, test locally
# If it works, merge to main with a good commit message
git checkout main
git merge experiment/optimize-care-plan-prompt -m "Optimize: Reduce care plan prompt from 2500 to 1800 tokens"

# If it doesn't work, delete branch (no messy history)
git branch -D experiment/optimize-care-plan-prompt
```

**Or use git stash for quick experiments:**
```bash
# Save current work
git stash save "Trying different duplicate detection threshold"

# Experiment...
# If it works: git stash drop
# If it doesn't: git stash pop (restore original code)
```

**Time saved:** Cleaner history, easier rollbacks

---

### 6. **Local Development Tools** ⭐ HIGH IMPACT

Set up tools to catch issues before committing:

**A. Pre-commit hooks (Husky):**
```bash
npm install -D husky lint-staged

# .husky/pre-commit
npm run type-check
npm run lint
npm test -- --bail
```

**B. VS Code tasks for common checks:**
```json
// .vscode/tasks.json
{
  "tasks": [
    {
      "label": "Quick Check (before commit)",
      "type": "shell",
      "command": "npm run type-check && npm run lint && npm run build",
      "problemMatcher": []
    }
  ]
}
```

**C. Watch mode for rapid iteration:**
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Type checking in watch mode
npx tsc --noEmit --watch

# Terminal 3: Tests in watch mode
npm run test:watch
```

**Time saved:** Catch errors in 5 seconds, not 5 minutes after deploy

---

### 7. **Debugging Strategy: Stop and Think**

When you hit a bug, **don't immediately start coding**. Take 2 minutes to:

1. **Write down the problem:**
   ```
   Problem: Prisma query engine not found on Vercel
   Expected: Database queries work
   Actual: PrismaClient initialization fails
   ```

2. **Check documentation first:**
   - Vercel docs → "Prisma" → Copy exact config
   - Don't guess configurations

3. **Search for the exact error:**
   ```bash
   # Search GitHub issues
   https://github.com/prisma/prisma/issues?q=vercel+query+engine

   # Search Vercel docs
   # Often has EXACT solution
   ```

4. **Try ONE solution at a time:**
   - Don't change 5 things and hope it works
   - Change one config, deploy, check logs
   - If it fails, you know which change caused it

**Your Prisma debugging could have been:**
1. Google "prisma vercel deployment 2024"
2. Find official docs: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
3. Copy exact next.config.js configuration
4. One deployment, done

**Instead it was:**
- 15 commits trying different approaches
- Lost 2 hours

**Time saved:** 80% of debugging time

---

### 8. **Use Console Logs Strategically**

Instead of committing changes to test, use temporary logs:

```typescript
// Add comprehensive logging (temporarily)
console.log('🔍 [DEBUG] Patient input:', JSON.stringify(input, null, 2));
console.log('🔍 [DEBUG] Validation result:', validationResult);
console.log('🔍 [DEBUG] Database query:', query);

// Test locally, see output
// Once fixed, remove logs (don't commit them)
```

**Better: Use environment-based logging:**
```typescript
// lib/utils/debug.ts
const DEBUG = process.env.DEBUG === 'true';

export function debug(label: string, data: unknown) {
  if (DEBUG) {
    console.log(`🔍 [${label}]`, JSON.stringify(data, null, 2));
  }
}

// Usage
debug('Patient Input', input);

// Enable: DEBUG=true npm run dev
// Disable: Just npm run dev (no logs)
```

**Time saved:** No need to commit just to add/remove logs

---

### 9. **Create Test Scripts for Common Scenarios**

Instead of testing through UI every time:

```typescript
// scripts/test-care-plan.ts
import { generateCarePlan } from '@/lib/services/care-plan-service';

const testPatient = {
  id: 'test-patient-1',
  firstName: 'Test',
  lastName: 'Patient',
  // ... other fields
};

async function testCarePlanGeneration() {
  console.log('Testing care plan generation...');

  const start = Date.now();
  const result = await generateCarePlan({ patientId: testPatient.id });
  const duration = Date.now() - start;

  if (result.success) {
    console.log(`✅ Generated in ${duration}ms`);
    console.log(`Length: ${result.data.content.length} chars`);
    console.log(`Preview: ${result.data.content.substring(0, 200)}...`);
  } else {
    console.log(`❌ Failed: ${result.error.message}`);
  }
}

testCarePlanGeneration();

// Run: npx tsx scripts/test-care-plan.ts
// Much faster than clicking through UI
```

**Time saved:** 30 seconds per test → 5 seconds per test

---

### 10. **Documentation-Driven Development**

Before implementing complex features, write docs first:

```markdown
## Feature: Real-time Duplicate Detection

### Goal
Show duplicate warnings as user types, not after submit

### Technical Approach
1. Debounce input (300ms)
2. Call /api/patients/validate on each change
3. Show warnings in real-time below form
4. Cache results to avoid redundant API calls

### Potential Issues
- Rate limiting (too many API calls)
- Race conditions (fast typing)
- Stale results (user changes field after validation)

### Testing Plan
1. Type rapidly and verify debouncing works
2. Check no duplicate API calls for same input
3. Verify warnings clear when input changes
4. Test with slow network (throttle to 3G)

### Rollback Plan
If issues, disable real-time and revert to submit-time validation
```

**Why this helps:**
- Forces you to think through the problem
- Identifies issues before coding
- Provides a clear success criteria
- Makes debugging systematic (check each step)

**Time saved:** Prevents "code first, think later" problems

---

## 📊 Expected Improvement

If you implement these tips:

**Before:**
- 20% design/development
- 80% debugging

**After:**
- 60% design/development
- 40% debugging (and more efficient)

**How:**
- Local testing (-50% deployment debugging)
- Better commit messages (-30% time finding what broke)
- Systematic debugging (-30% trial-and-error)
- Test scripts (-50% manual testing time)
- Pre-commit checks (-40% catching bugs late)

---

## 🎯 Start Here (Quick Wins)

**Week 1: Foundation**
1. Set up pre-commit hooks (30 minutes)
2. Create `scripts/pre-deploy-check.sh` (15 minutes)
3. Start using descriptive commit messages (immediate)

**Week 2: Debugging Tools**
4. Add debug utility with DEBUG flag (20 minutes)
5. Create test scripts for common scenarios (1 hour)
6. Set up VS Code tasks (15 minutes)

**Week 3: Process**
7. Create "Known Issues" checklist (30 minutes)
8. Use branches for experiments (immediate)
9. Write docs before coding complex features (ongoing)

---

## 📈 Measuring Improvement

Track these metrics:

```bash
# Count commits per day
git log --since="2025-10-01" --pretty=format:"%ad" --date=short | sort | uniq -c

# Count "fix" vs "feat" commits (should be more feat)
git log --oneline | grep -c "fix:"
git log --oneline | grep -c "feat:"

# Average commits per feature (should decrease)
# Fewer commits = less debugging
```

**Goal metrics:**
- Fix commits < 30% of total
- Average 3-5 commits per feature (not 20+)
- Zero "update" commits with unclear purpose
- Build succeeds locally before every deployment

---

## 💡 Mindset Shift

**Old mindset:**
- "Let me try this and see if it works" (deploy → fail → fix → deploy)
- "I'll commit now and write better messages later" (never happens)
- "I'll test this quickly in production" (causes more bugs)

**New mindset:**
- "Let me verify this works locally before deploying" (one deploy, success)
- "Let me write a clear commit message now" (helps future me)
- "Let me test this thoroughly locally" (catches bugs early)

**Remember:** Every minute spent on setup and testing saves 10 minutes of debugging later.

---

## 🔥 Emergency Debugging Protocol

When you're stuck debugging for >30 minutes:

**STOP. Do this:**

1. **Take a 5-minute break** - Seriously. Walk away.

2. **Write down the problem clearly:**
   ```
   What I'm trying to do: _____
   What's happening: _____
   What I've tried: _____
   Error message (exact text): _____
   ```

3. **Search the EXACT error message** - Not paraphrased. Copy-paste.

4. **Check if it's a known issue:**
   - Search your "Known Issues" checklist
   - Search project GitHub issues
   - Search dependency docs

5. **Rubber duck debug:**
   - Explain the problem out loud (to yourself, or Claude)
   - Often you'll realize the issue while explaining

6. **Simplify:**
   - Create minimal reproduction
   - Remove everything unrelated
   - Test the simplest possible version

7. **If still stuck after 1 hour:** Ask for help (GitHub issue, Discord, colleague)
   - Include: problem description, error message, what you've tried
   - Don't waste 4 hours on something that someone else solved in 10 minutes

---

## Summary

Your 80% debugging time comes from:
1. ❌ Not testing locally before deploying (Prisma issues)
2. ❌ Unclear commit messages (can't track what broke)
3. ❌ Unsystematic debugging (trying random solutions)
4. ❌ Manual testing through UI (slow iteration)
5. ❌ Making multiple changes at once (can't isolate issues)

**Fix these, and your velocity will 3-5x.**

Start with the "Quick Wins" section. Implement one tip per day. Track your progress by counting how many "fix" commits you make per week.

**Goal:** Reduce from 20+ debugging commits per day to <5 fix commits per week.

You've got this! 🚀
