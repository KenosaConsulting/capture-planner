#!/bin/bash
# Emergency Fix Script - Get the app working in 2 minutes

echo "🔧 Emergency Fix for Blank Screen Issue"
echo "======================================"
echo ""

# Step 1: Backup current files
timestamp=$(date +%Y%m%d_%H%M%S)
echo "📦 Creating backups..."
cp components/OutputDisplay.tsx "components/OutputDisplay.tsx.backup.$timestamp"
cp App.tsx "App.tsx.backup.$timestamp"

# Step 2: Apply the fixed OutputDisplay (no external dependencies)
echo "🔄 Applying fixed OutputDisplay component..."
cp components/OutputDisplayFixed.tsx components/OutputDisplay.tsx

# Step 3: Add error boundary to App.tsx
echo "🛡️ Adding error boundary..."
# Note: You'll need to manually import and wrap the output panel with ErrorBoundary

echo ""
echo "✅ Emergency fixes applied!"
echo ""
echo "📋 Manual steps required:"
echo "1. In App.tsx, add at the top:"
echo "   import ErrorBoundary from './components/ErrorBoundary';"
echo ""
echo "2. Wrap the OutputDisplay component (around line 298):"
echo "   Replace: {apiResponse && ("
echo "            <>"
echo "              <OutputDisplay response={apiResponse} />"
echo ""
echo "   With:    {apiResponse && ("
echo "            <ErrorBoundary>"
echo "              <OutputDisplay response={apiResponse} />"
echo ""
echo "3. Close the ErrorBoundary where you close the fragment"
echo ""
echo "4. Restart the dev server: npm run dev"
echo ""
echo "🎯 This will:"
echo "  • Remove ReactMarkdown dependency (uses plain text rendering)"
echo "  • Add error boundary to catch any crashes"
echo "  • Show diagnostics instead of blank screen"
echo ""
echo "💡 The briefing will show as formatted text instead of full markdown,"
echo "   but the app won't crash!"
