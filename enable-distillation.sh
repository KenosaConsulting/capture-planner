#!/bin/bash
# Quick migration script to enable distillation

echo "🚀 Enabling Strategic Information Distiller..."

# Step 1: Backup current files
echo "📦 Creating backups..."
cp App.tsx App.tsx.backup.$(date +%Y%m%d_%H%M%S)
cp services/geminiService.ts services/geminiService.ts.backup.$(date +%Y%m%d_%H%M%S)

# Step 2: Apply the distillation-enabled versions
echo "🔄 Applying distillation updates..."
cp AppWithDistillation.tsx App.tsx
cp services/geminiServiceWithDistillation.ts services/geminiService.ts

# Step 3: Install required dependencies (optional - remove YAML dependency if not wanted)
# echo "📥 Installing dependencies..."
# npm install js-yaml @types/js-yaml

echo "✅ Distillation enabled!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Test with files > 300KB to trigger distillation"
echo "3. Check the debug panel for distillation statistics"
echo ""
echo "🔄 To revert: cp App.tsx.backup.* App.tsx"
