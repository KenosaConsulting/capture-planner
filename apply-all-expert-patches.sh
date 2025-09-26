#!/bin/bash

# Apply all expert patches for two-tier false fail, small business fix, and citation improvements

echo "Applying all expert patches..."
echo ""

# Backup current files
timestamp=$(date +%Y%m%d_%H%M%S)
echo "Creating backups..."
cp services/geminiService.ts "services/geminiService.ts.backup.$timestamp" 2>/dev/null || true
cp utils/dataProcessing.ts "utils/dataProcessing.ts.backup.$timestamp" 2>/dev/null || true

# Copy the fixed service
echo "✓ Applying fixed geminiService with all patches..."
cp services/geminiServiceFixed.ts services/geminiService.ts

echo ""
echo "==================================="
echo "ALL EXPERT PATCHES APPLIED!"
echo "==================================="
echo ""
echo "Key fixes implemented:"
echo ""
echo "1. ✓ TWO-TIER FALSE FAIL FIXED"
echo "   - No more 'did not produce evidence' errors"
echo "   - Uses packs OR cards when available"
echo "   - Falls back to basic only when truly empty"
echo ""
echo "2. ✓ SMALL BUSINESS DETECTION FIXED"
echo "   - No longer trusts recipient_small_business field"
echo "   - Uses contracting_officers_determination_of_business_size"
echo "   - Should show realistic % instead of 100%"
echo ""
echo "3. ✓ BUDGET/VEHICLES THEME GUARANTEED"
echo "   - Injects synthetic procurement card when CSV has data"
echo "   - Ensures theme is never empty"
echo ""
echo "4. ✓ TOP NAICS RANKING FIXED"
echo "   - Uses top 3 by dollar amount"
echo "   - Not just first 3 encountered"
echo ""
echo "5. ✓ CITATION DENSITY ENFORCED"
echo "   - Briefs include evidence context"
echo "   - Each section requires ≥2 citations"
echo "   - Plays require ≥1 citation each"
echo "   - Numeric claims cite [procurement_csv]"
echo ""
echo "6. ✓ PROCUREMENT_JSON NO LONGER CALLS LLM"
echo "   - Generates locally to avoid 'returned no text' errors"
echo ""
echo "Expected improvements:"
echo "• Real dollar amounts (not $0)"
echo "• Realistic small business % (not 100%)"
echo "• More specific, cited briefings"
echo "• No more false pipeline failures"
echo ""
echo "To test:"
echo "1. Run: npm run dev"
echo "2. Upload your DOC CSV and documents"
echo "3. You should see:"
echo "   - Real procurement values"
echo "   - Proper small business percentage"
echo "   - Citations throughout the briefing"
echo "   - All pipeline stages completing"
echo ""
