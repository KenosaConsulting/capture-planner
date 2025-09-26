# 🎯 Quick Reference - Error System

## To Start Using

```bash
# 1. Install dependencies
npm install

# 2. Test your API key
npm run test-api

# 3. Start the app
npm run dev
```

## What's Different Now

### Before 😞
- Silent failures
- Blank briefing
- No idea why

### After 😊
- Clear error messages
- Stage indicators
- Debug panel
- Helpful hints

## Quick Fixes

| Error | Solution |
|-------|----------|
| `API_KEY_MISSING` | Add key to `.env.local`, restart server |
| `CSV_HEADER_MISMATCH` | Use USASpending.gov export, don't rename columns |
| `MODEL_SAFETY_BLOCK` | Remove sensitive content from documents |
| `MODEL_LENGTH_BLOCK` | Use fewer/smaller documents |
| `MISSING_FILES` | Upload both .txt/.md AND .csv files |
| `MISSING_AGENCY` | Enter agency code (DOC, USACE, etc.) |

## Visual Indicators

- ○ = Not started
- ◔ = In progress
- ✓ = Success (green)
- ✗ = Failed (red)

## Debug Mode

Click **"Show Debug"** button to see:
- Run ID
- Request preview
- Response preview
- Model metadata
- Parsed sections

## The 3 Critical Fixes

1. ✅ **API Key**: Now uses `VITE_GEMINI_API_KEY`
2. ✅ **API Format**: Content properly wrapped in `contents` array
3. ✅ **Response Parsing**: Handles all SDK response formats

---
**No more guessing!** Every error tells you exactly what's wrong and how to fix it.
