#!/bin/bash

# Apply Fixed Pipeline with Real Telemetry and Procurement Metrics
# This script applies all the fixes from the expert documentation

echo "Applying GovCon Capture Planner AI fixes..."

# Backup current files
echo "Creating backups..."
timestamp=$(date +%Y%m%d_%H%M%S)
cp App.tsx "App.tsx.backup.$timestamp"
cp services/geminiService.ts "services/geminiService.ts.backup.$timestamp"

# Apply the fixed versions
echo "Applying fixed service with ledger support..."
cp services/geminiServiceFixed.ts services/geminiService.ts

echo "Applying fixed App with real telemetry..."
cp AppFixed.tsx App.tsx

echo "✓ Fixes applied successfully!"
echo ""
echo "Key improvements implemented:"
echo "1. ✓ Two-tier pipeline now degrades gracefully instead of throwing"
echo "2. ✓ CSV procurement metrics are properly extracted and injected"
echo "3. ✓ Pipeline stages show real runtime status from ledger"
echo "4. ✓ Debug panel shows actual telemetry data"
echo "5. ✓ 'Show Raw' toggle for viewing complete responses"
echo "6. ✓ Theme coverage tracking with 8 mandatory themes"
echo "7. ✓ Lowered MIN_HIGHSIGNAL threshold from 20 to 12"
echo ""
echo "To run the application:"
echo "npm run dev"
echo ""
echo "Test with your CSV file to see procurement metrics!"
