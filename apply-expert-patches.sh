#!/bin/bash

# Apply expert patches to fix $0 procurement values issue

echo "Applying expert patches to fix procurement metrics..."
echo ""

# Replace the original service with the fixed version
echo "✓ Replacing geminiService.ts with fixed version..."
cp services/geminiServiceFixed.ts services/geminiService.ts

echo ""
echo "Patches applied successfully!"
echo ""
echo "Key improvements:"
echo "1. ✓ Fixed CSV parsing for DOC/USAspending format"
echo "   - Proper field name detection (total_obligated_amount, etc.)"
echo "   - Normalized lowercase key comparison"
echo "   - Amount fallback regex scanning"
echo ""
echo "2. ✓ Fixed PROCUREMENT_JSON error"
echo "   - No longer calls LLM (generates locally)"
echo "   - Eliminates 'returned no text' errors"
echo ""
echo "3. ✓ Improved vehicle detection"
echo "   - Properly extracts BPA, IDC from idv_type"
echo "   - Maps award_type to vehicle families"
echo ""
echo "4. ✓ Better small business detection"
echo "   - Checks multiple fields including CO determination"
echo "   - Handles various boolean representations"
echo ""
echo "To test:"
echo "1. Run: npm run dev"
echo "2. Upload your DOC CSV file"
echo "3. You should now see real dollar amounts (not $0)"
echo ""
