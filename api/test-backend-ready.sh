#!/bin/bash

# Test Backend Readiness Script
# This script checks if the backend is properly configured and ready to run

echo "🔍 Checking Backend Readiness..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the api directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the api directory${NC}"
    echo "   cd api && ./test-backend-ready.sh"
    exit 1
fi

echo "📦 Checking Dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules not found${NC}"
    echo "   Run: npm install"
    exit 1
fi

# Check critical dependencies
DEPS=("exifreader" "sharp" "axios" "@google/generative-ai" "@supabase/supabase-js" "express" "multer" "jsonwebtoken")
MISSING=0

for dep in "${DEPS[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $dep installed"
    else
        echo -e "${RED}✗${NC} $dep missing"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Some dependencies are missing${NC}"
    echo "   Run: npm install"
    exit 1
fi

echo ""
echo "🔧 Checking Configuration..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Copy .env.example to .env and configure it"
    exit 1
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Check critical env variables
ENV_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_KEY" "GEMINI_API_KEY" "JWT_SECRET")
MISSING_ENV=0

for var in "${ENV_VARS[@]}"; do
    if grep -q "^$var=" .env 2>/dev/null; then
        VALUE=$(grep "^$var=" .env | cut -d '=' -f2)
        if [ -z "$VALUE" ] || [ "$VALUE" = "your_${var,,}" ]; then
            echo -e "${RED}✗${NC} $var not configured"
            MISSING_ENV=1
        else
            echo -e "${GREEN}✓${NC} $var configured"
        fi
    else
        echo -e "${RED}✗${NC} $var missing"
        MISSING_ENV=1
    fi
done

if [ $MISSING_ENV -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some environment variables need configuration${NC}"
    echo "   Edit .env file with your actual values"
fi

echo ""
echo "📁 Checking File Structure..."

# Check critical files
FILES=(
    "server.js"
    "routes/reportRoutes.js"
    "routes/verificationRoutes.js"
    "controllers/reportController.js"
    "controllers/verificationController.js"
    "services/geminiService.js"
    "services/geminiVerificationService.js"
    "services/exifService.js"
    "services/geoService.js"
    "services/imageComparisonService.js"
    "services/databaseService.js"
    "services/resolutionService.js"
    "middleware/authMiddleware.js"
)

MISSING_FILES=0

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
        MISSING_FILES=1
    fi
done

if [ $MISSING_FILES -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Some critical files are missing${NC}"
    exit 1
fi

echo ""
echo "🗄️  Database Migration Status..."
echo -e "${YELLOW}⚠️  Manual check required:${NC}"
echo "   1. Go to: https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/sql/new"
echo "   2. Run: SELECT table_name FROM information_schema.tables"
echo "           WHERE table_schema = 'public'"
echo "           AND table_name IN ('resolution_uploads', 'authorized_workers', 'security_logs')"
echo "   3. Verify all 3 tables exist"
echo ""
echo "   If tables don't exist, apply migrations from:"
echo "   - supabase/migrations/20260216000001_create_resolution_uploads_table.sql"
echo "   - supabase/migrations/20260216000002_create_strict_verification_tables.sql"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $MISSING_ENV -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Backend is PARTIALLY ready${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in .env"
    echo "2. Apply database migrations (see above)"
    echo "3. Run: npm run dev"
else
    echo -e "${GREEN}✅ Backend is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Apply database migrations (if not done)"
    echo "2. Run: npm run dev"
    echo "3. Test endpoints with test-endpoint.sh and test-verification.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
