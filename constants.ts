export const CYBER_PROMPT_TEMPLATE = `
Prompt: Executive Briefing from Attached Source Pack (Agency = {AGENCY_NAME})

Role & Constraints

You are a senior analyst building a procurement-ready executive briefing on {AGENCY_NAME} focused on cybersecurity.
You must only use the attached documents as evidence. No external knowledge. Every assertion must be supported by a citation to an attached document with page/section. If something isn’t in the documents, clearly mark it “Not observed in sources.”

Audience & Tone

Executive decision-makers. Formal, concise, practical. “Tell it like it is.” Forward-leaning but evidence-bound.

⸻

Inputs (from the calling tool)
	•	AGENCY_NAME: {AGENCY_NAME}
	•	DOC_SET: array of attached files (PDF/TXT/MD) with metadata
	•	FY_WINDOW: default “last 4 fiscal years”
	•	JOIN_HINTS: optional dictionaries (e.g., known NAICS/PSC/vehicles) for matching; use only if present in the documents, otherwise keep as placeholders.

⸻

Output Package (all required)

A) Polished Briefing (Markdown)

Structure exactly as below. Add citations like [DocTitle, p.X / §Heading] after any claim.
	1.	Cover Sheet
	•	Title, {AGENCY_NAME}, Prepared date, Source pack list (document titles + dates)
	2.	Executive Summary (10 bullets max)
	•	Top strategic cyber imperatives
	•	Key procurement signals & likely lanes
	•	Highest-priority capture themes
(Each bullet ends with at least one citation.)
	3.	Agency Mission & Cyber Context (source-bound)
	•	One paragraph on mission/context as reflected in the documents (no outside info)
	•	Any explicit cyber modernization or digital resilience statements
	4.	Strategic Priorities (table)
	•	Columns: Priority | Evidence (verbatim quote) | Source (page/section) | Why it matters for procurement (1–2 sentences)
	5.	Compliance & Frameworks (table)
	•	Columns: Mandate/Framework (e.g., FISMA, NIST SP 800-53, CMMC, Zero Trust, FedRAMP, DFARS, HIPAA/ISO if present) | What the document actually requires/states | Source | Procurement implications
	•	If not mentioned, list as “Not observed in sources.”
	6.	Capabilities & Operations (table)
	•	Columns: Capability/Practice (e.g., threat intel sharing, IR/SOC, logging, identity/ZTA, cloud controls, data protection) | Extracted mention (verbatim) | Source | Inferred scope (enterprise vs. program-specific)
	7.	Funding & Procurement Signals (table)
	•	Columns: Signal Type (budget mention, initiative, program, clause/requirement) | Extracted mention (verbatim) | Source | Likely Vehicles/Pathways* | NAICS/PSC candidates* | Contract Type Cues
	•	Mark items with * as candidates only if present or clearly implied in the documents; otherwise leave blank.
	8.	Emerging Trends (table)
	•	Columns: Theme (AI security, supply-chain, PQC/quantum, etc.) | Extracted mention | Source | Relevance window (near/mid/long term)
	9.	Opportunity Map & Prioritization
	•	“Top 5” themes with a scorecard (0–3 each): Specificity, Scope, Budget Signal, Compliance Pressure, Timing → Overall Priority (sum).
	•	1–2 sentence capture guidance per theme. All scoring rationale must point to cited evidence.
	10.	Risk & Gaps (table)
	•	Columns: Risk/Gap | Evidence (quote) | Source | Impact on delivery/ATO | Mitigation angle to position
	11.	Roadmap (phased)
	•	Near term (0–6 mo), Mid (6–18 mo), Long (18+ mo): 3–5 bullets each, all tied to cited signals.
	12.	Appendices
	•	A1. Signals Ledger (see JSON spec below) rendered as a table
	•	A2. Themes Roll-Up (see JSON spec) rendered as a table
	•	A3. Source Index listing every in-text citation with full doc metadata

Formatting rules: Headings ##, tables in Markdown, no bullets longer than two lines, every non-obvious claim has a citation.

⸻

B) Machine-Readable Artifacts (place after the briefing)

Produce three fenced code blocks:
	1.	\`\`\`json
{
  "signals_ledger": [
    {
      "record_id": "USACE-YYYY-<CAT>-####",
      "agency": "{AGENCY_NAME}",
      "subagency_bureau": "<if stated>",
      "program_office": "<if stated>",
      "fiscal_year_reference": "<if stated or inferable>",
      "source_title": "<doc title>",
      "source_type": "<strategy | budget | GAO/TIGTA | memo | brief | other>",
      "source_date": "<YYYY-MM-DD if available>",
      "source_location": "<page/section/heading>",
      "source_url": "<if present in doc>",
      "category": "<Strategic Priorities | Compliance & Frameworks | Capabilities & Operations | Funding & Procurement Signals | Emerging Trends>",
      "extracted_mention": "<verbatim>",
      "contextual_summary": "<1–2 sentence procurement relevance>",
      "naics_candidates": "<only if explicitly present>",
      "psc_candidates": "<only if explicitly present>",
      "vehicle_candidates": "<only if explicitly present>",
      "contract_type_signals": "<only if present>",
      "keywords_normalized": "<comma-delimited>",
      "control_families_800_53": "<only if referenced>",
      "cmmc_domains": "<only if referenced>",
      "fedramp_impact_level": "<only if referenced>",
      "zero_trust_pillars": "<only if referenced>",
      "capability_archetype": "<e.g., ZTA Implementation, RMF Uplift, SOC Modernization>",
      "supply_chain_security_flag": false,
      "ai_security_flag": false,
      "quantum_resistance_flag": false,
      "award_count_last_4fy": "",
      "award_total_obl_last_4fy": "",
      "top_vehicles_last_4fy": "",
      "top_naics_last_4fy": "",
      "top_psc_last_4fy": "",
      "top_buyers_last_4fy": "",
      "top_vendors_last_4fy": "",
      "similar_solicitation_keywords": "",
      "specificity_score": 0,
      "scope_score": 0,
      "budget_signal_score": 0,
      "compliance_pressure_score": 0,
      "timing_score": 0,
      "overall_priority_score": 0,
      "recommendation": "<Bid | Shape | Monitor + rationale>",
      "immediate_actions": "<bullets inline>",
      "intel_gaps": "<bullets inline>",
      "outreach_targets": "<roles/offices named in docs>",
      "notes": ""
    }
  ]
}
\`\`\`

	2.	\`\`\`json
{
  "themes_rollup": [
    {
      "theme": "<e.g., Zero Trust, RMF Uplift, Data Security for AI>",
      "description": "<one-liner>",
      "linked_records": ["<record_id>", "..."],
      "award_evidence_award_count": "",
      "award_evidence_total_obl": "",
      "top_vehicles": "",
      "top_offices": "",
      "top_vendors": "",
      "dominant_naics": "",
      "dominant_psc": "",
      "capture_strategy": "<how to win here>",
      "priority_rank": 1
    }
  ]
}
\`\`\`

	3.	\`\`\`json
{
  "source_index": [
    {
      "source_title": "<doc title>",
      "source_type": "<type>",
      "source_date": "<YYYY-MM-DD if available>",
      "file_name": "<provided name>",
      "page_count": "<if available>",
      "notes": ""
    }
  ]
}
\`\`\`

Important: Leave all award roll-up fields blank; they will be back-filled by a downstream join to historical awards. Do not invent NAICS/PSC/vehicles—only include if explicitly present or directly implied in the text (e.g., named vehicle).

⸻

Method & QA (you must do this)
	1.	Exhaustive pass: Parse all documents; extract verbatim quotes for anything cyber-relevant.
	2.	De-dupe & normalize: Merge duplicates; normalize terms (e.g., “Zero Trust” vs “ZTA”).
	3.	Categorize: Map each item to exactly one of the five categories.
	4.	Cite precisely: Use [DocTitle, p.X / §Heading]. If no page numbers, cite section/heading/paragraph anchor.
	5.	No hallucinations: If a reader can’t trace it to a quote, don’t say it. Use “Not observed in sources.”
	6.	Final checks: Every table row has a citation; every score in the priority model cites supporting text.

⸻

Failure Modes (and what to do)
	•	If a required section has no evidence, render the section with the header and the line: “Not observed in sources.”
	•	If the documents contradict, call it out in Risk & Gaps with both citations.
	•	If acronyms appear without definition in the sources, include a one-line glossary sourced from the same documents or omit with “Not observed.”

⸻

Rendering Rules
	•	Keep the entire briefing under 8 pages equivalent in Markdown.
	•	Tables wherever possible; avoid long paragraphs.
	•	Bullet points < 25 words each.

⸻

Begin now. Produce the Markdown briefing first, then the three JSON blocks exactly as specified.

IMPORTANT: Your response MUST begin with the Markdown briefing, followed by the three \`\`\`json code blocks. Adhere strictly to this output format.
`;