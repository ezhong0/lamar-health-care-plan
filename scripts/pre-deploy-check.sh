#!/bin/bash
# Pre-deployment checklist
# Run this before every deployment to catch issues early
# Usage: ./scripts/pre-deploy-check.sh

set -e  # Exit on any error

echo "🔍 Running pre-deployment checks..."
echo ""

# Check 1: Type checking
echo "1️⃣  Type checking..."
if npm run type-check 2>&1 | grep -q "error TS"; then
    echo "❌ Type check failed!"
    exit 1
fi
echo "✅ Types are valid"
echo ""

# Check 2: Linting
echo "2️⃣  Linting..."
if ! npm run lint --silent; then
    echo "❌ Linting failed!"
    echo "💡 Run: npm run lint:fix"
    exit 1
fi
echo "✅ No linting errors"
echo ""

# Check 3: Build
echo "3️⃣  Building production bundle..."
if ! npm run build; then
    echo "❌ Build failed!"
    echo "💡 Fix build errors before deploying"
    exit 1
fi
echo "✅ Build successful"
echo ""

# Check 4: Environment variables
echo "4️⃣  Checking environment variables..."
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "💡 Make sure environment variables are set in Vercel dashboard"
fi

required_vars=("DATABASE_URL" "ANTHROPIC_API_KEY")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.local 2>/dev/null; then
        echo "⚠️  Warning: ${var} not found in .env.local"
    else
        echo "✅ ${var} is set"
    fi
done
echo ""

# Check 5: Database connection (optional, comment out if not needed)
# echo "5️⃣  Testing database connection..."
# if npx prisma db execute --stdin <<< "SELECT 1" >/dev/null 2>&1; then
#     echo "✅ Database connection successful"
# else
#     echo "⚠️  Warning: Could not connect to database"
# fi
# echo ""

# Success!
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All pre-deployment checks passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Safe to deploy! 🚀"
echo ""
echo "Next steps:"
echo "  git push origin main           # Deploy to Vercel"
echo "  vercel --prod                 # Or deploy directly with Vercel CLI"
