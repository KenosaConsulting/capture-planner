# GovCon Capture Planner AI v2.0
## Multi-Stage Pipeline Implementation

### Overview
This is a restructured implementation of the GovCon Capture Planner based on expert recommendations. The tool now uses a **multi-stage pipeline** with enforced schemas instead of a single monolithic prompt.

### Key Improvements Implemented

#### 1. **Enforced Schema End-to-End** ✅
- Defined TypeScript interfaces for all data structures
- JSON schema validation at each stage
- Strict data contracts between pipeline stages

#### 2. **Separated Concerns** ✅
- **Stage 0**: Document Classification
- **Stage 1**: Strategic Facts Extraction (CSF 2.0 aligned)
- **Stage 2**: Procurement Metrics Analysis
- **Stage 3**: Findings Synthesis
- **Stage 4**: Executive Brief Composition
- **Stage 5**: Output Validation

#### 3. **Hard Filters & Scope Control** ✅
- Documents classified by type (strategy, csv, capability, audit, memo)
- Agency-specific filtering
- Rejection of non-relevant content

#### 4. **Deterministic Procurement Math** ✅
- Dedicated utilities for metric calculations
- CAGR, HHI, percentiles, fiscal year handling
- No narrative generation before metrics

#### 5. **Word Count Limits** ✅
- Executive summary: ≤180 words
- Bullet points: ≤25 words
- Findings: ≤80 words
- Enforced via validation stage

#### 6. **Proof Points & Assets** ✅
- Your capabilities baked into prompts:
  - DOI 10-day ATO
  - DHA <1yr track record
  - RMF/eMASS/STIG expertise
  - SOC/Splunk dashboards
  - Zero Trust scorecards

#### 7. **Vehicle Prioritization** ✅
- Prefers your vehicles:
  - 8(a) Direct Award
  - OASIS 8(a)
  - DOI IDIQs
  - OTA agreements

#### 8. **Quality Guardrails** ✅
- Final validation stage
- Checks for required sections
- Validates word limits
- Ensures proof points used

### File Structure

```
govcon-capture-planner-ai/
├── App.tsx                    # Updated UI with pipeline progress
├── services/
│   ├── geminiService.ts      # (Original - kept for reference)
│   └── pipelineService.ts    # New multi-stage pipeline
├── prompts/
│   └── templates.ts          # Stage-specific prompts
├── types/
│   └── schemas.ts            # TypeScript interfaces
├── utils/
│   └── dataProcessing.ts     # CSV parsing & metrics
└── components/               # UI components (unchanged)
```

### Usage

1. **Upload Documents**
   - Strategy documents (.txt, .md)
   - Procurement CSVs with award data
   - Capability statements
   - GAO/IG reports

2. **Specify Agency**
   - Use exact agency codes: DOC, USACE, IRS, HHS, DOI

3. **Pipeline Execution**
   - Watch progress through 6 stages
   - Debug mode shows intermediate results
   - Validation ensures quality output

### Expected Outputs

The pipeline generates:
1. **Executive Summary** (≤180 words)
2. **Current Posture** (3 bullets)
3. **Strategy Outlook** (3 bullets)  
4. **Zero Trust Maturity Score** (1-5 with rationale)
5. **Three Recommended Plays** with:
   - Specific offers
   - Proof points from your track record
   - Demo assets
   - Contract vehicles
   - Success metrics
6. **Procurement Snapshot** with metrics
7. **Path to Contract** with contacts
8. **Risks & Mitigations**
9. **30-Day Action Plan**

### Debug Features

Enable debug mode to see:
- Validation results
- Strategic facts extracted
- Procurement metrics calculated
- Key findings identified
- Raw JSON structures

### Next Steps

To deploy:
1. Set your Gemini API key in `.env.local`:
   ```
   API_KEY=your_gemini_api_key_here
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

### What Changed from v1.0

| v1.0 (Monolithic) | v2.0 (Pipeline) |
|-------------------|-----------------|
| Single prompt | 6 specialized prompts |
| No schemas | Strict TypeScript schemas |
| Mixed extraction & composition | Separated stages |
| No validation | CEPA-style evaluator |
| Generic outputs | Your proof points embedded |
| CSV handling in prompt | Deterministic metric calculation |
| No progress tracking | Stage-by-stage progress |

### Expert Recommendations Addressed

✅ **Root Cause 1**: "No enforced schema end-to-end"
- Solution: TypeScript interfaces + JSON validation

✅ **Root Cause 2**: "Mixed audiences in one pass"
- Solution: Executive-only brief with word limits

✅ **Root Cause 3**: "Unscoped retrieval"
- Solution: Document classification + agency filters

✅ **Root Cause 4**: "No hard separation of facts → findings → narrative"
- Solution: 5-stage pipeline with clear boundaries

✅ **Root Cause 5**: "Underspecified procurement math"
- Solution: Dedicated metrics calculation utilities

✅ **Root Cause 6**: "Missing pathways to contract"
- Solution: Vehicle preferences in composer prompt

✅ **Root Cause 7**: "Evidence isn't anchored to proof points"
- Solution: Your capabilities embedded in prompts

✅ **Root Cause 8**: "No complexity budget"
- Solution: Word limits enforced via validation

✅ **Root Cause 9**: "No evaluator stage"
- Solution: Stage 5 validation with error reporting

### Testing Recommendations

1. **Test with DOC package** containing:
   - Strategy documents
   - Procurement CSV
   - Capability statements

2. **Verify outputs**:
   - Executive summary stays under 180 words
   - Exactly 3 plays recommended
   - Your proof points appear
   - Metrics calculate correctly

3. **Check validation**:
   - Enable debug mode
   - Review validation results
   - Ensure no critical errors

### Support

For issues or questions about the implementation, refer to the expert feedback documents in the project root.
