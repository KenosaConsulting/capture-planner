#!/bin/bash
# Verify Emergency Fix Script

echo "🔍 Verifying Emergency Fix Implementation"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_GOOD=true

# Check 1: ErrorBoundary exists
echo -n "1. Checking ErrorBoundary component... "
if [ -f "components/ErrorBoundary.tsx" ]; then
    echo -e "${GREEN}✅ EXISTS${NC}"
else
    echo -e "${RED}❌ MISSING${NC}"
    ALL_GOOD=false
fi

# Check 2: OutputDisplay is fixed (no ReactMarkdown)
echo -n "2. Checking OutputDisplay (no ReactMarkdown)... "
if grep -q "ReactMarkdown" components/OutputDisplay.tsx; then
    echo -e "${RED}❌ STILL HAS REACTMARKDOWN${NC}"
    ALL_GOOD=false
else
    echo -e "${GREEN}✅ CLEAN${NC}"
fi

# Check 3: App.tsx imports ErrorBoundary
echo -n "3. Checking App.tsx imports ErrorBoundary... "
if grep -q "import ErrorBoundary" App.tsx; then
    echo -e "${GREEN}✅ IMPORTED${NC}"
else
    echo -e "${RED}❌ NOT IMPORTED${NC}"
    ALL_GOOD=false
fi

# Check 4: App.tsx uses ErrorBoundary
echo -n "4. Checking App.tsx uses ErrorBoundary wrapper... "
if grep -q "<ErrorBoundary>" App.tsx; then
    echo -e "${GREEN}✅ WRAPPED${NC}"
else
    echo -e "${RED}❌ NOT WRAPPED${NC}"
    ALL_GOOD=false
fi

# Check 5: No CDN markdown imports in index.html
echo -n "5. Checking index.html for problematic CDN imports... "
if grep -q "react-markdown\|highlight.js\|marked" index.html; then
    echo -e "${RED}❌ FOUND PROBLEMATIC IMPORTS${NC}"
    ALL_GOOD=false
else
    echo -e "${GREEN}✅ CLEAN${NC}"
fi

# Check 6: Backup files exist
echo -n "6. Checking for backup files... "
BACKUP_COUNT=$(ls -1 *.backup.* 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $BACKUP_COUNT backups found${NC}"
else
    echo -e "${YELLOW}⚠️  No backups (not critical)${NC}"
fi

echo ""
echo "=========================================="

# Final status
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "The emergency fix is properly installed."
    echo "Your app should now:"
    echo "  • Not crash on missing ReactMarkdown"
    echo "  • Show errors gracefully with ErrorBoundary"
    echo "  • Display briefings as formatted text"
    echo ""
    echo "Next step: Run 'npm run dev' and test the app!"
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please review the failed checks above."
    echo "You may need to run: ./emergency-fix.sh"
fi

echo ""
echo "📋 Quick Test Plan:"
echo "  1. Start dev server: npm run dev"
echo "  2. Upload any test file"
echo "  3. Enter 'DOC' as agency"
echo "  4. Click Generate Briefing"
echo "  5. Verify no crash occurs"
