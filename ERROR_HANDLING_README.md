# Error Handling Implementation Guide

## What Was Fixed

Based on expert analysis, we've implemented comprehensive error handling that addresses three critical issues:

### 1. ✅ API Key Configuration
- **Fixed**: Environment variable now properly named `VITE_GEMINI_API_KEY`
- **Location**: `.env.local`
- **Fallback**: Also supports `VITE_API_KEY` for backward compatibility

### 2. ✅ Gemini API Call Format
- **Fixed**: Content is now properly wrapped in the required format:
  ```javascript
  contents: [{ 
    role: 'user', 
    parts: [{ text: finalPrompt }]
  }]
  ```
- **Previously**: Was passing raw string which caused silent failures

### 3. ✅ Response Extraction
- **Fixed**: Now handles multiple response formats from different Gemini SDK versions
- **Extracts**: `finishReason`, `safetyRatings`, and actual text content
- **Fallbacks**: Multiple methods to extract text from various response shapes

## New Error Handling Features

### 🎯 Stage-Level Error Tracking
Every stage of the pipeline now reports its status:
- `INPUT_VALIDATION` - Checks files and agency
- `DOC_CLASSIFICATION` - Categorizes documents
- `FACTS_EXTRACTION` - Extracts strategic facts
- `PROCUREMENT_ANALYSIS` - Analyzes CSV data
- `MODEL_CALL` - Gemini API interaction
- `COMPOSE_BRIEFING` - Output parsing and validation

### 🔍 Specific Error Codes
Each error has a specific code and helpful hint:
- `API_KEY_MISSING` - Check your .env.local file
- `CSV_HEADER_MISMATCH` - Missing required columns
- `MODEL_SAFETY_BLOCK` - Content flagged by safety filters
- `MODEL_LENGTH_BLOCK` - Too much data for single request
- `OUTPUT_PARSE_FAILED` - Response format issues

### 📊 CSV Validation
Before sending to AI:
- Checks for required USASpending columns
- Validates row count
- Detects delimiter (comma, tab, semicolon, pipe)
- Provides specific column names that are missing

### ⏱️ Timeout Protection
- 2-minute timeout on API calls
- Prevents infinite waiting
- Clear timeout error messages

### 🐛 Debug Panel
Click "Show Debug" to see:
- Run ID for tracking
- Request prompt (first 2000 chars)
- Response metadata
- Parsed sections status
- Model finish reasons
- Safety ratings

## Common Error Messages & Solutions

### "API_KEY_MISSING"
**Solution**: 
1. Check `.env.local` has `VITE_GEMINI_API_KEY=your_key_here`
2. Restart the dev server after adding the key

### "CSV_HEADER_MISMATCH"
**Solution**: 
1. Export full schema from USASpending.gov
2. Required columns:
   - contract_award_unique_key
   - award_base_action_date
   - product_or_service_code
   - naics_code
   - total_obligated_amount

### "MODEL_SAFETY_BLOCK"
**Solution**:
1. Remove sensitive information from documents
2. Split large documents into smaller sections
3. Check safety ratings in debug panel

### "MODEL_LENGTH_BLOCK"
**Solution**:
1. Reduce number of documents
2. Use shorter documents
3. Process in batches

### "OUTPUT_SECTION_MISSING"
**Solution**:
1. Model didn't generate expected sections
2. Check debug panel for raw response
3. May need to adjust prompt template

## Testing the Error System

To test different error scenarios:

1. **Test API Key Error**: 
   - Temporarily rename your API key in `.env.local`
   - Should see: "Gemini API key not found or invalid"

2. **Test CSV Validation**:
   - Upload a CSV without required columns
   - Should see specific missing columns listed

3. **Test Input Validation**:
   - Try to generate without uploading files
   - Should see: "No files uploaded"

4. **Test Timeout**:
   - Upload very large files (>10MB total)
   - Should timeout after 2 minutes with clear message

## Troubleshooting

### Nothing happens when clicking Generate
1. Open browser console (F12)
2. Check for red error messages
3. Click "Show Debug" button
4. Look for stage that failed

### Briefing tab is empty but no error shown
1. Check debug panel for `finishReason`
2. If `SAFETY` - content was blocked
3. If `MAX_TOKENS` - response too long
4. If `STOP` - normal completion but parsing failed

### CSV uploads but shows errors
1. Download fresh export from USASpending.gov
2. Don't modify column names
3. Ensure file is actually CSV format (not Excel)

## Development Notes

### File Structure
```
govcon-capture-planner-ai/
├── src/
│   ├── types/
│   │   └── errors.ts          # Error type definitions
│   └── services/
│       ├── status.ts           # Event emitter for stages
│       ├── validation.ts       # Input & CSV validation
│       └── outputParser.ts     # Parse Gemini responses
├── services/
│   └── geminiService.ts       # Fixed Gemini API client
└── App.tsx                     # Updated with error display
```

### Key Improvements
- **Type Safety**: All errors use TypeScript interfaces
- **Event Bus**: Real-time status updates for each stage
- **LocalStorage**: Saves debug info for troubleshooting
- **Graceful Degradation**: Shows partial results even with errors
- **User-Friendly**: Clear messages with actionable hints

## Next Steps

If you continue to see issues:

1. **Enable Debug Mode**: Click "Show Debug" button
2. **Copy Run ID**: Found in debug panel
3. **Check Console**: Press F12 for browser console
4. **Save Debug Info**: 
   ```javascript
   // In console, get last run's data:
   const runIds = Object.keys(localStorage)
     .filter(k => k.startsWith('gcca.run.'))
     .map(k => k.split('.')[2])
     .sort();
   const lastRun = runIds[runIds.length - 1];
   console.log('Request:', localStorage.getItem(`gcca.run.${lastRun}.request`));
   console.log('Response:', localStorage.getItem(`gcca.run.${lastRun}.response`));
   console.log('Meta:', localStorage.getItem(`gcca.run.${lastRun}.meta`));
   ```

## Support

For persistent issues after implementing these fixes:
1. Verify Gemini API key is valid at: https://makersuite.google.com/app/apikey
2. Check API quotas and limits
3. Try with smaller test files first
4. Use example files from USASpending.gov

The system now provides clear, actionable error messages at every stage instead of silent failures.
