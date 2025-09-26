// Two-Tier Prompt Composer with Expert's Packing Rules
import { TieredEvidence, EvidenceCard, ContextCard } from '../../types/distillation';
import { loadBudgetConfig } from './configLoader';

export interface TwoTierPromptSection {
  type: 'BRIEFING_MD' | 'PLAYS_MD' | 'PROCUREMENT_JSON' | 'ANNEX_JSON';
  prompt: string;
  charCount: number;
  highSignalUsed: number;
  contextUsed: number;
  withinBudget: boolean;
  packingStrategy: string;
}

/**
 * Compose prompts using two-tier evidence packs
 * Following expert's rules: BRIEFING gets high-signal only, PLAYS gets mix, etc.
 */
export async function composeTwoTierPrompts(
  evidence: TieredEvidence,
  procurementMetrics: any,
  agencyCode: string
): Promise<{ promptSections: TwoTierPromptSection[], totalLength: number }> {
  
  const budgets = await loadBudgetConfig();
  const sections: TwoTierPromptSection[] = [];
  let totalLength = 0;
  
  // 1. BRIEFING_MD - High-signal only with mandatory citations
  const briefingPrompt = await composeBriefingWithHighSignal(
    evidence.highSignal,
    evidence.context.slice(0, 10), // Optional context, capped
    procurementMetrics,
    agencyCode,
    budgets.BRIEFING_MD
  );
  
  sections.push({
    type: 'BRIEFING_MD',
    prompt: briefingPrompt.prompt,
    charCount: briefingPrompt.prompt.length,
    highSignalUsed: briefingPrompt.highSignalCount,
    contextUsed: briefingPrompt.contextCount,
    withinBudget: briefingPrompt.prompt.length <= budgets.BRIEFING_MD.maxPromptChars,
    packingStrategy: 'high-signal-priority'
  });
  totalLength += briefingPrompt.prompt.length;
  
  // 2. PLAYS_MD - Mix of both with hard caps per play
  const playsPrompt = await composePlaysWithMixedEvidence(
    evidence.highSignal,
    evidence.context,
    agencyCode,
    budgets.PLAYS_MD
  );
  
  sections.push({
    type: 'PLAYS_MD',
    prompt: playsPrompt.prompt,
    charCount: playsPrompt.prompt.length,
    highSignalUsed: playsPrompt.highSignalCount,
    contextUsed: playsPrompt.contextCount,
    withinBudget: playsPrompt.prompt.length <= budgets.PLAYS_MD.maxPromptChars,
    packingStrategy: 'mixed-batch-generation'
  });
  totalLength += playsPrompt.prompt.length;
  
  // 3. PROCUREMENT_JSON - Metrics echo with consistency checks
  const procurementPrompt = composeProcurementWithConsistency(
    procurementMetrics,
    evidence
  );
  
  sections.push({
    type: 'PROCUREMENT_JSON',
    prompt: procurementPrompt.prompt,
    charCount: procurementPrompt.prompt.length,
    highSignalUsed: 0,
    contextUsed: 0,
    withinBudget: procurementPrompt.prompt.length <= budgets.PROCUREMENT_JSON.maxPromptChars,
    packingStrategy: 'metrics-echo'
  });
  totalLength += procurementPrompt.prompt.length;
  
  // 4. ANNEX_JSON - High-signal for traceability
  const annexPrompt = await composeAnnexWithHighSignal(
    evidence.highSignal,
    evidence.themes,
    agencyCode,
    budgets.ANNEX_JSON
  );
  
  sections.push({
    type: 'ANNEX_JSON',
    prompt: annexPrompt.prompt,
    charCount: annexPrompt.prompt.length,
    highSignalUsed: annexPrompt.highSignalCount,
    contextUsed: 0,
    withinBudget: annexPrompt.prompt.length <= budgets.ANNEX_JSON.maxPromptChars,
    packingStrategy: 'high-signal-traceability'
  });
  totalLength += annexPrompt.prompt.length;
  
  return { promptSections: sections, totalLength };
}

/**
 * BRIEFING_MD: High-signal only with ≥90% citation requirement
 */
async function composeBriefingWithHighSignal(
  highSignal: EvidenceCard[],
  contextOptional: ContextCard[],
  metrics: any,
  agencyCode: string,
  budget: any
): Promise<{ prompt: string, highSignalCount: number, contextCount: number }> {
  
  // Select top claims and metrics for briefing
  const claims = highSignal.filter(c => c.role === 'claim').slice(0, 10);
  const metricsCards = highSignal.filter(c => c.role === 'metric').slice(0, 5);
  const priorities = highSignal.filter(c => c.class === 'priority').slice(0, 10);
  
  const selectedCards = [...claims, ...metricsCards, ...priorities]
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, budget.maxEvidenceCards || 30);
  
  // Format cards with provenance
  const cardsText = selectedCards.map(card => 
    `[${card.id}] CLAIM: "${card.claim}" | THEME: ${card.theme || 'General'} | CSF: ${card.csf?.fn || 'N/A'} | CONFIDENCE: ${card.confidence || 'medium'}`
  ).join('\n');
  
  // Include optional context (capped)
  const contextText = contextOptional.length > 0
    ? `\nCONTEXT CARDS (background only):\n${contextOptional.map(c => `- ${c.summary} [${c.theme}]`).join('\n')}`
    : '';
  
  const prompt = `Generate an executive briefing for ${agencyCode} cybersecurity capture strategy.

INSTRUCTIONS:
- Every bullet point MUST end with [doc_id:page] citation from the evidence cards
- Citation coverage must be ≥90% of all bullets
- Focus on actionable intelligence and strategic implications
- Use specific evidence to support each claim

HIGH-SIGNAL EVIDENCE (${selectedCards.length} cards):
${cardsText}
${contextText}

KEY PROCUREMENT METRICS:
- Total Contract Value: $${(metrics.total_value / 1_000_000).toFixed(1)}M
- Active Contracts: ${metrics.active_contracts}
- Growth Rate: ${metrics.growth_rate}%
- Top Vehicles: ${Object.keys(metrics.vehicle_distribution || {}).join(', ')}
- Small Business %: ${metrics.small_business_percentage}%

REQUIRED OUTPUT STRUCTURE:
# Executive Briefing: ${agencyCode} Cybersecurity Capture

## Executive Summary (150-180 words)
Synthesize the most critical findings with specific citations. Focus on:
- Current cybersecurity posture and gaps
- Budget trajectory and procurement patterns
- Strategic opportunities for engagement

## Current Posture (3 bullets)
- [Specific finding with evidence] [doc_id:page]
- [Specific finding with evidence] [doc_id:page]  
- [Specific finding with evidence] [doc_id:page]

## Strategic Recommendations (3 bullets)
- [Actionable recommendation based on evidence] [doc_id:page]
- [Actionable recommendation based on evidence] [doc_id:page]
- [Actionable recommendation based on evidence] [doc_id:page]

## Quick Wins (2 bullets)
- [Immediate opportunity] [doc_id:page]
- [Immediate opportunity] [doc_id:page]

Ensure EVERY bullet has a citation. Focus on specificity and actionability.`;

  // Auto-shrink if needed
  const finalPrompt = await enforceCharLimit(prompt, budget.maxPromptChars);
  
  return {
    prompt: finalPrompt,
    highSignalCount: selectedCards.length,
    contextCount: contextOptional.length
  };
}

/**
 * PLAYS_MD: Mixed evidence with batch generation
 */
async function composePlaysWithMixedEvidence(
  highSignal: EvidenceCard[],
  context: ContextCard[],
  agencyCode: string,
  budget: any
): Promise<{ prompt: string, highSignalCount: number, contextCount: number }> {
  
  // Select diverse evidence for plays
  const mandates = highSignal.filter(c => c.class === 'mandate').slice(0, 5);
  const gaps = highSignal.filter(c => c.class === 'gap').slice(0, 5);
  const trends = highSignal.filter(c => c.class === 'trend').slice(0, 5);
  const priorities = highSignal.filter(c => c.class === 'priority').slice(0, 10);
  
  const selectedHighSignal = [...mandates, ...gaps, ...trends, ...priorities]
    .slice(0, budget.maxEvidenceCards || 25);
  
  // Add relevant context
  const relevantContext = context
    .filter(c => ['Zero Trust', 'Cloud/FedRAMP', 'CDM'].includes(c.theme))
    .slice(0, 15);
  
  const highSignalText = selectedHighSignal.map(card =>
    `[${card.id}] ${card.claim} | CLASS: ${card.class} | THEME: ${card.theme || 'General'}`
  ).join('\n');
  
  const contextText = relevantContext.map(c =>
    `[CTX] ${c.summary} | ${c.theme}`
  ).join('\n');
  
  const prompt = `Generate 3 strategic capture plays for ${agencyCode} based on evidence analysis.

BATCH GENERATION RULES:
- Generate exactly 3 plays in one response
- Each play must cite at least 1 high-signal evidence card
- Hard cap: 25 words per field (except vehicle_pathways)
- Focus on differentiated capabilities that address specific gaps

HIGH-SIGNAL EVIDENCE (${selectedHighSignal.length} cards):
${highSignalText}

SUPPORTING CONTEXT (${relevantContext.length} items):
${contextText}

OUR PROVEN CAPABILITIES:
- Zero Trust architecture implementation (500+ endpoints)
- CDM dashboard integration (Dashboard 6.0 ready)
- FedRAMP High authorization services
- 60-day ATO acceleration methodology
- Automated RMF continuous monitoring platform
- NIST CSF 2.0 implementation expertise

VEHICLE ACCESS:
- CIO-SP4 (Small Business)
- 8(a) STARS III
- SEWP V
- GSA Schedules (IT, Professional Services)

Generate exactly 3 plays with this JSON structure:
[
  {
    "play_number": 1,
    "play_name": "Memorable name (≤5 words)",
    "targeted_gap": "Specific gap from evidence (≤25 words)", 
    "our_solution": "What we offer to address gap (≤25 words)",
    "proof_point": "Specific past performance (≤25 words)",
    "differentiator": "Why we're uniquely qualified (≤25 words)",
    "vehicle_pathways": ["8(a)", "CIO-SP4", "etc"],
    "first_meeting_demo": "Tangible demonstration (≤25 words)",
    "success_metric": "Measurable outcome (≤25 words)",
    "evidence_refs": ["card_id_1", "card_id_2"]
  },
  // Play 2...
  // Play 3...
]

Focus on plays that directly address the mandates and gaps identified in evidence.`;

  const finalPrompt = await enforceCharLimit(prompt, budget.maxPromptChars);
  
  return {
    prompt: finalPrompt,
    highSignalCount: selectedHighSignal.length,
    contextCount: relevantContext.length
  };
}

/**
 * PROCUREMENT_JSON: Echo with consistency validation
 */
function composeProcurementWithConsistency(
  metrics: any,
  evidence: TieredEvidence
): { prompt: string } {
  
  // Add validation notes based on evidence
  const validationNotes = {
    evidence_alignment: {
      budget_cards_found: evidence.highSignal.filter(c => c.role === 'metric').length,
      vehicle_mentions: evidence.highSignal.filter(c => /8\(a\)|sewp|cio-sp/i.test(c.quote)).length,
      themes_with_budget: Array.from(evidence.themes.keys()).filter(theme => 
        theme === 'Budget/Vehicles/Small-biz'
      )
    }
  };
  
  const enhancedMetrics = {
    ...metrics,
    _validation: validationNotes,
    _timestamp: new Date().toISOString()
  };
  
  const prompt = `Return the following procurement metrics as valid JSON without modification:

${JSON.stringify(enhancedMetrics, null, 2)}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;
  
  return { prompt };
}

/**
 * ANNEX_JSON: High-signal only for traceability
 */
async function composeAnnexWithHighSignal(
  highSignal: EvidenceCard[],
  themes: Map<string, number>,
  agencyCode: string,
  budget: any
): Promise<{ prompt: string, highSignalCount: number }> {
  
  // Use all high-signal cards for comprehensive annex
  const selectedCards = highSignal.slice(0, budget.maxEvidenceCards || 40);
  
  const cardsText = selectedCards.map(card =>
    `[${card.id}] "${card.quote}" | CLAIM: ${card.claim} | SOURCE: ${card.source_doc} | PAGE: ${card.page || 'N/A'} | CLASS: ${card.class} | CSF: ${card.csf?.fn || 'N/A'} | THEME: ${card.theme || 'General'}`
  ).join('\n');
  
  // Pre-calculate theme summary
  const themeSummary = Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => `${theme}: ${count} cards`)
    .join(', ');
  
  const prompt = `Generate technical annex for ${agencyCode} capture strategy based on evidence analysis.

HIGH-SIGNAL EVIDENCE (${selectedCards.length} cards):
${cardsText}

THEME DISTRIBUTION: ${themeSummary}

Generate a JSON annex with three sections:

{
  "signals_ledger": [
    {
      "signal": "Key technology/mandate/system name",
      "signal_type": "technology|mandate|system|program",
      "frequency": <number of occurrences>,
      "strength": "high|medium|low",
      "context": "Brief context (≤20 words)",
      "first_seen": "source_doc_name",
      "card_ids": ["id1", "id2", "..."]
    }
    // Include top 15-20 signals
  ],
  
  "themes_rollup": [
    {
      "theme": "Theme name",
      "card_count": <number>,
      "key_findings": [
        "Finding 1 (≤30 words)",
        "Finding 2 (≤30 words)"
      ],
      "evidence_strength": "high|medium|low",
      "strategic_importance": "critical|high|medium|low",
      "representative_cards": ["id1", "id2", "id3"]
    }
    // Include all themes with cards
  ],
  
  "source_index": [
    {
      "source": "Document name",
      "source_type": "OIG|GAO|NIST|OMB|RFI|other",
      "publication_date": "YYYY-MM-DD or unknown",
      "cards_extracted": <number>,
      "key_topics": ["topic1", "topic2"],
      "reliability": "authoritative|reliable|preliminary"
    }
    // Include all source documents
  ],
  
  "traceability_matrix": {
    "total_cards": ${selectedCards.length},
    "by_class": {
      "mandate": <count>,
      "priority": <count>,
      "gap": <count>,
      "trend": <count>
    },
    "by_csf_function": {
      "GV": <count>,
      "ID": <count>,
      "PR": <count>,
      "DE": <count>,
      "RS": <count>,
      "RC": <count>
    },
    "by_confidence": {
      "high": <count>,
      "medium": <count>,
      "low": <count>
    }
  }
}

Focus on technical accuracy and complete traceability. Ensure all card_ids reference actual evidence cards.`;

  const finalPrompt = await enforceCharLimit(prompt, budget.maxPromptChars);
  
  return {
    prompt: finalPrompt,
    highSignalCount: selectedCards.length
  };
}

/**
 * Enforce character limit with intelligent shrinking
 */
async function enforceCharLimit(prompt: string, maxChars: number): Promise<string> {
  if (prompt.length <= maxChars) {
    return prompt;
  }
  
  // Progressive shrinking strategy
  let shrunk = prompt;
  
  // Step 1: Remove quotes longer than 100 chars
  shrunk = shrunk.replace(/"[^"]{100,}"/g, (match) => {
    return '"' + match.substring(1, 98) + '..."';
  });
  
  if (shrunk.length <= maxChars) {
    return shrunk;
  }
  
  // Step 2: Reduce evidence cards by removing middle section
  const lines = shrunk.split('\n');
  const evidenceStart = lines.findIndex(l => l.includes('EVIDENCE') || l.includes('CARDS'));
  const evidenceEnd = lines.findIndex((l, i) => i > evidenceStart && /^[A-Z]/.test(l));
  
  if (evidenceStart >= 0 && evidenceEnd > evidenceStart) {
    const evidenceLines = lines.slice(evidenceStart + 1, evidenceEnd);
    const keepRatio = Math.min(0.7, maxChars / shrunk.length);
    const keepCount = Math.floor(evidenceLines.length * keepRatio);
    
    // Keep first 40% and last 30%
    const firstPart = Math.floor(keepCount * 0.6);
    const lastPart = keepCount - firstPart;
    
    const reduced = [
      ...evidenceLines.slice(0, firstPart),
      `[... ${evidenceLines.length - keepCount} cards omitted for space ...]`,
      ...evidenceLines.slice(-lastPart)
    ];
    
    shrunk = [
      ...lines.slice(0, evidenceStart + 1),
      ...reduced,
      ...lines.slice(evidenceEnd)
    ].join('\n');
  }
  
  if (shrunk.length <= maxChars) {
    return shrunk;
  }
  
  // Step 3: Hard truncate with warning
  const truncatePoint = maxChars - 150;
  return shrunk.substring(0, truncatePoint) + '\n\n[WARNING: Prompt truncated to fit token budget. Results may be incomplete.]';
}

/**
 * Validate prompt sections
 */
export function validatePromptSections(sections: TwoTierPromptSection[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const section of sections) {
    // Check budget compliance
    if (!section.withinBudget) {
      errors.push(`${section.type}: Exceeds character budget (${section.charCount} chars)`);
    }
    
    // Check for truncation warnings
    if (section.prompt.includes('[WARNING: Prompt truncated')) {
      errors.push(`${section.type}: Was truncated, may affect quality`);
    }
    
    // Check minimum evidence requirements
    if (section.type === 'BRIEFING_MD' && section.highSignalUsed < 10) {
      errors.push(`${section.type}: Insufficient high-signal cards (${section.highSignalUsed} < 10)`);
    }
    
    if (section.type === 'PLAYS_MD' && section.highSignalUsed < 5) {
      errors.push(`${section.type}: Insufficient evidence for plays (${section.highSignalUsed} < 5)`);
    }
    
    // Check JSON sections
    if (section.type.endsWith('_JSON')) {
      if (section.prompt.includes('```')) {
        errors.push(`${section.type}: Contains markdown code blocks`);
      }
      
      // Basic JSON validation
      const jsonStart = section.prompt.lastIndexOf('{');
      const jsonEnd = section.prompt.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        errors.push(`${section.type}: Malformed JSON structure`);
      }
    }
    
    // Check for empty prompts
    if (section.prompt.trim().length === 0) {
      errors.push(`${section.type}: Empty prompt`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
