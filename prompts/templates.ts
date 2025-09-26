// Prompt templates for each stage of the pipeline
// Based on expert recommendations for structured extraction and composition

export const PROMPTS = {
  // Stage 1: Extract strategic facts from documents
  EXTRACTOR: `System: You extract only atomic, verifiable facts from agency cyber strategy documents. Output must strictly follow the Strategic Facts JSON schema. Do not summarize. Do not infer. Include evidence_doc with filename+page for each item. Reject content that isn't about the target agency or the frameworks FISMA, NIST 800-53, CMMC, HIPAA, or Zero Trust. If nothing is found for a field, return an empty array for that field.

Target Agency: {AGENCY_NAME}

Input Documents:
{DOCUMENTS}

Output the Strategic Facts JSON strictly following this schema:
{
  "agency": "{AGENCY_NAME}",
  "frameworks": ["list of frameworks mentioned"],
  "facts": [
    {
      "csf_function": "GOVERN | IDENTIFY | PROTECT | DETECT | RESPOND | RECOVER",
      "category": "CSF category code",
      "subcategory": "CSF subcategory code",
      "statement": "atomic claim from document",
      "deadline": "YYYY-MM-DD or null",
      "owner_office": "office name or null",
      "evidence_doc": "filename.pdf",
      "page": page_number
    }
  ],
  "gaps": [
    {
      "statement": "gap description",
      "impact": "impact description",
      "evidence_doc": "filename",
      "page": page_number
    }
  ]
}

IMPORTANT: Output ONLY the JSON, no additional text.`,

  // Stage 2: Analyze procurement data
  PROCUREMENT_ANALYZER: `System: You are a procurement analyst. Compute the Procurement Metrics JSON strictly from the provided CSV. No narrative. If a metric can't be computed, set it to null and note missing_fields.

Target Agency: {AGENCY_NAME}
CSV Data:
{CSV_DATA}

Calculate these metrics and output JSON:
{
  "agency": "{AGENCY_NAME}",
  "window": ["FY2022", "FY2023", "FY2024", "FY2025YTD"],
  "totals": {
    "award_count": total_number_of_awards,
    "obligations_usd": total_obligation_amount,
    "cagr_3yr_pct": compound_annual_growth_rate
  },
  "distribution": {
    "median_award_usd": median_award_value,
    "p75_award_usd": 75th_percentile_award_value
  },
  "top_naics": [{"code": "NAICS_CODE", "share_pct": percentage}],
  "top_psc": [{"code": "PSC_CODE", "share_pct": percentage}],
  "vehicles": [{"name": "VEHICLE_NAME", "share_pct": percentage}],
  "set_asides": [{"type": "8(a) | SDVOSB | etc", "share_pct": percentage}],
  "vendor_concentration": {
    "hhi": herfindahl_hirschman_index,
    "top5_share_pct": percentage
  },
  "timing": {
    "qtr_peaks": ["Q1", "Q2", "Q3", or "Q4"],
    "recompete_flags": [{"program": "name", "eta": "FY202X"}]
  },
  "missing_fields": ["list of fields that couldn't be computed"]
}

IMPORTANT: Output ONLY the JSON, no additional text.`,

  // Stage 3: Synthesize findings
  FINDINGS_SYNTHESIZER: `System: Produce 5-7 implication-focused bullets for {AGENCY_NAME}. Each bullet = {finding, why_it_matters, evidence_refs} with at least one evidence ref to either a strategic fact or a metric. Max 80 words per bullet. No fluff.

Strategic Facts:
{STRATEGIC_FACTS}

Procurement Metrics:
{PROCUREMENT_METRICS}

Output JSON array of findings:
[
  {
    "finding": "concise finding statement",
    "why_it_matters": "procurement/capture implication",
    "evidence_refs": ["doc:page", "metric:field"]
  }
]

Focus on:
- Compliance mandates with deadlines
- Budget signals and procurement patterns
- Technology gaps requiring solutions
- Vehicle preferences and set-aside opportunities
- Timing patterns for engagement

IMPORTANT: Output ONLY the JSON array, no additional text.`,

  // Stage 4: Compose executive brief
  EXECUTIVE_COMPOSER: `System: Generate the {AGENCY_NAME} executive brief using the template below. Pull only from Findings and the two JSONs. Insert proof points and demo assets from your capability/campaign docs. Keep to word limits.

Agency: {AGENCY_NAME}
Strategic Facts: {STRATEGIC_FACTS}
Procurement Metrics: {PROCUREMENT_METRICS}
Findings: {FINDINGS}

Your company's proven capabilities:
- ATO Acceleration: DOI 10-day ATO; DHA <1yr track record
- RMF/eMASS/STIG/ACAS/SCAP proficiency
- SOC/Splunk dashboarding with MITRE mapping
- Insider Threat simulation capabilities
- GRC risk matrix and compliance overlays
- Zero Trust maturity scorecards
- Preferred vehicles: 8(a), OASIS 8(a), DOI IDIQs, OTA

Generate executive brief JSON:
{
  "executive_summary": "≤180 words synthesizing posture, priorities, and capture opportunities",
  "current_posture": ["3 bullets max on current cyber state"],
  "strategy_outlook": ["3 bullets max on where they're heading"],
  "zero_trust_maturity": {
    "score_1_to_5": estimated_score,
    "rationale": "≤40 words explaining score"
  },
  "plays": [
    {
      "name": "Play name aligned to agency needs",
      "offer": "Specific solution offering",
      "proof_point": "Your proven capability",
      "assets": ["Demo asset 1", "Demo asset 2"],
      "vehicle_pathways": ["Preferred contract vehicle"],
      "first_meeting_demo": ["What to show"],
      "success_metric": "Measurable outcome"
    }
  ],
  "procurement_snapshot": {copy procurement metrics here},
  "contacts_and_path_to_contract": ["Key office/person + next step + vehicle"],
  "risks_and_mitigations": ["3 risk items with mitigation strategies"],
  "next_30_days": ["5 concrete action items with owners"]
}

Select exactly 3 plays from:
- ATO Acceleration / RMF Fast-Track
- SOC Modernization (Splunk-centric)
- Insider Threat Program Development
- GRC Overlay Implementation
- Zero Trust Architecture Roadmap
- Cloud Security Posture Management

IMPORTANT: Output ONLY the JSON, no additional text.`,

  // Stage 5: Evaluate and validate
  EVALUATOR: `System: Validate the brief. Check all conditions and return validation result.

Brief to validate:
{BRIEF}

Validation criteria:
1. All required sections present
2. Executive summary ≤180 words
3. Exactly 3 plays defined
4. Each play has all required fields
5. At least 2 proof points reference actual capabilities
6. At least 1 vehicle pathway uses 8(a)/OASIS 8(a)
7. Procurement snapshot has valid metrics
8. All arrays have correct item counts

Output validation JSON:
{
  "valid": true/false,
  "errors": ["list of validation errors"],
  "warnings": ["list of warnings"],
  "stats": {
    "exec_summary_words": count,
    "plays_count": count,
    "proof_points_used": count,
    "preferred_vehicles_used": count
  }
}

IMPORTANT: Output ONLY the JSON, no additional text.`
};

// Helper prompt for document classification
export const DOCUMENT_CLASSIFIER_PROMPT = `Classify this document into one of these categories:
- strategy: Strategic plans, cyber strategies, digital transformation roadmaps
- csv: Procurement data, award data, spending data
- capability: Capability statements, past performance, case studies
- audit: GAO reports, IG reports, audit findings
- memo: Policy memos, directives, guidance documents
- other: Everything else

Document name: {FILENAME}
First 500 characters: {PREVIEW}

Output only the category name, nothing else.`;

// Proof points and assets to reference
export const COMPANY_CAPABILITIES = {
  proof_points: {
    ato: 'DOI 10-day ATO; DHA <1yr',
    rmf: 'RMF/eMASS/STIG/ACAS/SCAP proficiency',
    soc: 'SOC/Splunk dashboards with MITRE ATT&CK mapping',
    insider: 'IRS Insider Threat simulation experience',
    grc: 'NIST 800-53 / HIPAA GRC overlays',
    zt: 'Zero Trust maturity assessment and roadmaps'
  },
  
  demo_assets: [
    'SOC/Splunk alert to MITRE map demonstration',
    'Insider threat simulation walkthrough',
    'RMF acceleration toolkit',
    'GRC risk matrix dashboard',
    'Zero Trust maturity scorecard',
    'Compliance gap analysis tool'
  ],
  
  preferred_vehicles: [
    '8(a) Direct Award',
    'OASIS 8(a) Pool 1',
    'DOI Cybersecurity IDIQ',
    'GSA Schedules',
    'CIO-SP4',
    'OTA agreements'
  ]
};

// Word count limits for different sections
export const WORD_LIMITS = {
  executive_summary: 180,
  bullet_point: 25,
  play_description: 50,
  rationale: 40,
  finding: 80
};
