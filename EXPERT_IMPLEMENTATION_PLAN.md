# 🔧 Expert-Recommended Implementation Plan

## Status After Expert Review

### ✅ Completed Fixes (Based on Expert Feedback)

1. **Card Count Increased**
   - Was: 24 cards (too aggressive)
   - Now: 80 cards
   - Expert recommended: 60-120 with two tiers

2. **Deduplication Fixed**
   - Was: Broken (cardsDeduplicated: 0)
   - Now: Working with 0.85 similarity threshold
   - Expert recommended: Cosine sim with source+line anchors

3. **Prompt Logging Added**
   - Was: No logging (Prompt Length: 0)
   - Now: Stores prompts and calculates total length

4. **PLAYS Schema Simplified**
   - Was: 7 fields causing truncation
   - Now: 5 fields (Name, Offer, Proof, Vehicles, Win Theme)

## 📊 Expert's Analysis Summary

**Key Metrics from Latest Run:**
- Distillation: 1,719 → 24 cards (98.6% reduction) **TOO AGGRESSIVE**
- cardsDeduplicated: 0 → **DEDUP NOT RUNNING** (NOW FIXED)
- Prompt Length: 0 → **NO LOGGING** (NOW FIXED)
- PLAYS: Truncating at "Demo:" → **SCHEMA TOO COMPLEX** (SIMPLIFIED)

## 🎯 Expert's Priority Directives (To Implement)

### 1. Two-Tier Evidence System (CRITICAL)
**Expert Quote:** "Move from a hard cap to a budgeted, two-tier pack"

```typescript
interface TieredEvidence {
  highSignal: EvidenceCard[];  // 30-48 cards for citations
  context: MicroCard[];         // 40-80 snippets for background
}
```

**Implementation:**
- High-signal pack: Highest scoring by (authority × recency × cyber-specificity × procurement-relevance)
- Context pack: 1-line snippets for background
- Enforce coverage: At least 1 card per major theme

### 2. Parallelize Calls (15-18s target)
**Expert Quote:** "Run BRIEFING_MD and PLAYS_MD in parallel off the same distilled context"

```typescript
// Current: Sequential (30s)
await briefing();
await plays();
await procurement();
await annex();

// Target: Parallel (15s)
const [briefing, plays] = await Promise.all([
  makeApiCall(briefingPrompt, 'BRIEFING_MD'),
  makeApiCall(playsPrompt, 'PLAYS_MD')
]);
await procurement();
await annex();
```

### 3. Theme Coverage Constraints
**Expert Quote:** "Enforce coverage constraints: at least one card per major theme"

Required themes per expert:
- Zero Trust / ZTA
- CDM / ECDM  
- TIC 3.0
- SBOM
- CISA BODs
- FISMA / NIST
- CMMC
- Cloud / FedRAMP
- Procurement trends

### 4. Quality Gates & Validation
**Expert Quote:** "Block export unless: schema validations pass, support ratio ≥90%, and no dangling citations"

```typescript
interface QualityScore {
  grounding: number;     // 0-4: claims with citations
  coverage: number;      // 0-4: themes hit
  actionability: number; // 0-4: specific plays
  recency: number;       // 0-4: FY recency
}
```

### 5. Section-Level Retry Ladder
**Expert Quote:** "Implement a 3-step retry ladder (per section)"

1. **Full**: Current prompt, full card budget
2. **Lean**: Halve card budget, drop low-signal topics
3. **Minimal**: Headlines + bullets only

## 🚀 Expert's "Do This Now" List

1. **Distillation**
   - ✅ Replace hard cap 24 with High-signal 80
   - ⬜ Add Context tier (60 ± 20 micro-cards)
   - ✅ Fix dedup (was broken)
   - ⬜ Enforce theme coverage constraints

2. **PLAYS**
   - ✅ Reduce to 5 fields
   - ⬜ Generate in batches (5 per call)
   - ⬜ Set explicit stop sequences

3. **Orchestration**
   - ⬜ Parallelize BRIEFING/PLAYS
   - ⬜ Add AbortController with 90s budget
   - ⬜ Auto-retry at Lean rung on timeout

4. **Validation**
   - ⬜ Add schema validators
   - ⬜ Check citation coverage (≥90%)
   - ⬜ Gate export if any score <2

5. **UX & Telemetry**
   - ⬜ Show "Cards used / total"
   - ⬜ Display per-call latency
   - ⬜ Add "Regenerate [section] (Lean)" buttons
   - ✅ Log prompt lengths

## 📈 Expected Improvements

Per expert analysis, implementing these changes will:
- **Cut latency ~40-50%** (30s → 15s)
- **Improve completeness** (no more truncation)
- **Increase confidence** (quality gates)
- **Enable debugging** (proper telemetry)

## 🎯 Expert's Bottom Line

**"If you implement just three changes this sprint:**
1. ✅ PLAYS schema fix
2. ⬜ Two-tier evidence with dedup + coverage
3. ⬜ Parallelize BRIEFING/PLAYS with abort + degrade

**Result:** Cut latency 40-50% and materially improve completeness without re-architecting."

## 📊 Current vs Target Metrics

| Metric | Current | Target (Expert) |
|--------|---------|-----------------|
| Evidence Cards | 80 (fixed) | 80-120 with tiers |
| Deduplication | Working | + source anchoring |
| Latency | ~30s | 15-18s |
| PLAYS Completion | Truncates | Full generation |
| Quality Gates | None | 4-dimension scoring |
| Retry Logic | None | 3-rung ladder |
| Theme Coverage | Random | Enforced quotas |

## 🔥 Next Immediate Action

**Expert's #1 Priority:** Implement two-tier evidence system with theme coverage
- This alone will "materially improve briefing depth"
- Combined with parallelization = 50% latency reduction
