#!/bin/bash
# Apply Four-Call Orchestration Fix

echo "🔧 Applying Four-Call Orchestration Fix..."
echo "This will fix the issue where only briefing is generated"
echo ""

# Step 1: Backup current files
echo "📦 Creating backups..."
timestamp=$(date +%Y%m%d_%H%M%S)
cp services/geminiService.ts "services/geminiService.ts.backup.$timestamp" 2>/dev/null || true
cp src/services/outputParser.ts "src/services/outputParser.ts.backup.$timestamp" 2>/dev/null || true

# Step 2: Apply the fixes
echo "🔄 Applying orchestration fixes..."
cp services/geminiServiceWithFourCalls.ts services/geminiService.ts
cp src/services/outputParserEnhanced.ts src/services/outputParser.ts

echo "✅ Four-Call Orchestration applied!"
echo ""
echo "📋 What was fixed:"
echo "  • System now makes 4 separate API calls (Briefing, Plays, Procurement, Annex)"
echo "  • Each call has its own error handling and retry logic"
echo "  • Fallback builders ensure tabs are never empty"
echo "  • Procurement values are sanitized ($20 → $20,000)"
echo "  • Errors are properly attributed to their correct stages"
echo ""
echo "🧪 Testing instructions:"
echo "  1. Restart dev server: npm run dev"
echo "  2. Upload files > 300KB to trigger distillation"
echo "  3. Watch console for: 'Calls scheduled: [BRIEFING_MD, PLAYS_MD, PROCUREMENT_JSON, ANNEX_JSON]'"
echo "  4. Check all tabs populate (even with fallback data if needed)"
echo ""
echo "🔄 To revert: cp services/geminiService.ts.backup.$timestamp services/geminiService.ts"
