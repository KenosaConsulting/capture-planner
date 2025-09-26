// Migration guide: How to switch from v1 to v2
// Copy-paste ready code snippets for transitioning

// ============================================
// STEP 1: Update package.json dependencies
// ============================================
// No new dependencies needed - uses same @google/genai

// ============================================
// STEP 2: Update imports in your main App
// ============================================

// OLD (v1):
// import { generateExecutiveBriefing } from './services/geminiService';

// NEW (v2):
import { runCapturePipeline, formatBriefForDisplay } from './services/pipelineService';

// ============================================
// STEP 3: Replace the submit handler
// ============================================

// OLD (v1):
/*
const handleSubmit = useCallback(async () => {
  try {
    const response = await generateExecutiveBriefing(files, agencyName);
    setApiResponse(response);
  } catch (err) {
    setError(err.message);
  }
}, [files, agencyName]);
*/

// NEW (v2):
const handleSubmitV2 = `
const handleSubmit = useCallback(async () => {
  if (files.length === 0 || !agencyName) {
    setError('Please upload at least one document and provide an agency name.');
    return;
  }

  setIsLoading(true);
  setError(null);
  setApiResponse(null);
  setCurrentStage('Initializing...');
  setProgress(0);

  try {
    const result = await runCapturePipeline(
      files, 
      agencyName,
      (stage, prog) => {
        setCurrentStage(stage);
        setProgress(prog);
      }
    );

    // Check validation
    if (!result.validation.valid) {
      console.warn('Validation warnings:', result.validation.warnings);
      if (result.validation.errors.length > 0) {
        setError(\`Validation errors: \${result.validation.errors.join(', ')}\`);
      }
    }

    // Format the brief for display
    const formattedBrief = formatBriefForDisplay(result.brief);
    setApiResponse(formattedBrief);

    // Store debug data
    setDebugData({
      brief: result.brief,
      validation: result.validation,
      intermediateResults: result.intermediateResults
    });

  } catch (err: any) {
    setError(\`Pipeline error: \${err.message}\`);
    console.error('Full error:', err);
  } finally {
    setIsLoading(false);
    setCurrentStage('');
    setProgress(0);
  }
}, [files, agencyName]);
`;

// ============================================
// STEP 4: Add new state variables for progress
// ============================================
const newStateVariables = `
// Add these to your component state:
const [currentStage, setCurrentStage] = useState<string>('');
const [progress, setProgress] = useState<number>(0);
const [showDebug, setShowDebug] = useState<boolean>(false);
const [debugData, setDebugData] = useState<any>(null);
`;

// ============================================
// STEP 5: Add progress indicator UI
// ============================================
const progressIndicatorUI = `
{/* Add this inside your input panel, after the agency name input */}
{isLoading && (
  <div className="mt-6 p-4 bg-navy rounded-md">
    <div className="text-xs text-light-slate mb-2">
      Stage: {currentStage}
    </div>
    <div className="w-full bg-lightest-navy rounded-full h-2">
      <div 
        className="bg-brand-accent h-2 rounded-full transition-all duration-300"
        style={{ width: \`\${progress}%\` }}
      />
    </div>
    <div className="text-xs text-slate mt-1">
      {progress}% complete
    </div>
  </div>
)}
`;

// ============================================
// STEP 6: Add debug panel (optional)
// ============================================
const debugPanelUI = `
{/* Add this to your header for debug toggle */}
<button
  onClick={() => setShowDebug(!showDebug)}
  className="text-xs px-3 py-1 border border-slate rounded hover:bg-light-navy transition"
>
  {showDebug ? 'Hide' : 'Show'} Debug
</button>

{/* Add this after OutputDisplay in the output panel */}
{showDebug && debugData && (
  <div className="mt-4 p-4 bg-navy rounded-md">
    <h3 className="text-sm font-semibold text-light-slate mb-2">
      Debug Information
    </h3>
    <details className="text-xs text-slate">
      <summary className="cursor-pointer hover:text-light-slate">
        Validation Results
      </summary>
      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto">
        {JSON.stringify(debugData.validation, null, 2)}
      </pre>
    </details>
    <details className="text-xs text-slate mt-2">
      <summary className="cursor-pointer hover:text-light-slate">
        Strategic Facts
      </summary>
      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto">
        {JSON.stringify(debugData.intermediateResults.facts, null, 2)}
      </pre>
    </details>
    <details className="text-xs text-slate mt-2">
      <summary className="cursor-pointer hover:text-light-slate">
        Procurement Metrics
      </summary>
      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto">
        {JSON.stringify(debugData.intermediateResults.metrics, null, 2)}
      </pre>
    </details>
    <details className="text-xs text-slate mt-2">
      <summary className="cursor-pointer hover:text-light-slate">
        Key Findings
      </summary>
      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto">
        {JSON.stringify(debugData.intermediateResults.findings, null, 2)}
      </pre>
    </details>
  </div>
)}
`;

// ============================================
// STEP 7: Test with sample data
// ============================================
const testingGuide = `
// Test the pipeline with these document types:

1. Strategy Document (save as strategy.txt):
"""
Department of Commerce Cybersecurity Strategy 2024-2027
The Department is implementing NIST Cybersecurity Framework 2.0...
Priority: Achieve Zero Trust Architecture by FY2026...
Gap: Limited SOC visibility across enterprise systems...
"""

2. Procurement CSV (save as awards.csv):
"""
award_date,obligated_amount,vendor_name,naics_code,product_or_service_code,set_aside_type
2024-01-15,500000,Acme Cyber Inc,541512,D399,8(a)
2024-02-20,750000,Security Plus LLC,541519,H170,SDVOSB
...
"""

3. Capability Statement (save as capabilities.txt):
"""
Our company achieved DOI 10-day ATO certification...
Successfully deployed Splunk SOC for DHA in under 1 year...
RMF/eMASS/STIG expertise with 50+ successful implementations...
"""
`;

// ============================================
// STEP 8: Environment variables
// ============================================
const envSetup = `
// .env.local
API_KEY=your_gemini_api_key_here

// Make sure to restart dev server after adding API key
`;

// ============================================
// QUICK MIGRATION CHECKLIST
// ============================================
const migrationChecklist = `
MIGRATION CHECKLIST:
□ 1. Copy new files to project:
   - /services/pipelineService.ts
   - /prompts/templates.ts  
   - /types/schemas.ts
   - /utils/dataProcessing.ts

□ 2. Update App.tsx with new imports

□ 3. Replace handleSubmit with pipeline version

□ 4. Add progress tracking state variables

□ 5. Add progress indicator UI

□ 6. (Optional) Add debug panel

□ 7. Test with sample documents

□ 8. Verify outputs match new schema

□ 9. Check validation passes

□ 10. Deploy!
`;

console.log('Migration Guide Loaded');
console.log('Copy the code snippets above to migrate from v1 to v2');
console.log(migrationChecklist);

export {
  handleSubmitV2,
  newStateVariables,
  progressIndicatorUI,
  debugPanelUI,
  testingGuide,
  envSetup,
  migrationChecklist
};
