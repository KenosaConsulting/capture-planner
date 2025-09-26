// Four-call generation pattern with budgeted API calls
import { EvidenceCard } from '../../types/distillation';
import { loadBudgetConfig } from './configLoader';

export interface PromptSection {
  type: 'BRIEFING_MD' | 'PLAYS_MD' | 'PROCUREMENT_JSON' | 'ANNEX_JSON';
  prompt: string;
  charCount: number;
  cardCount: number;
  withinBudget: boolean;
}

export interface GenerationResult {
  briefing?: string;
  plays?: string;
  procurement?: string;
  annex?: string;
  errors?: string[];
}

/**
 * Compose prompts for all four API calls
 */
export async function composeFourCallPrompts(
  evidenceCards: EvidenceCard[],
  procurementMetrics: any,
  agencyCode: string
): Promise<PromptSection[]> {
  const budgets = await loadBudgetConfig();
  const sections: PromptSection[] = [];
  
  // Sort cards by score
  const sortedCards = [...evidenceCards].sort((a, b) => b.total_score - a.total_score);
  
  // 1. BRIEFING_MD - Executive Summary + Posture
  const briefingPrompt = composeBriefingPrompt(
    sortedCards.slice(0, budgets.BRIEFING_MD.maxEvidenceCards),
    procurementMetrics,
    agencyCode
  );
  
  sections.push({
    type: 'BRIEFING_MD',
    prompt: await enforcePromptBudget(briefingPrompt, budgets.BRIEFING_MD.maxPromptChars),
    charCount: briefingPrompt.length,
    cardCount: Math.min(sortedCards.length, budgets.BRIEFING_MD.maxEvidenceCards),
    withinBudget: briefingPrompt.length <= budgets.BRIEFING_MD.maxPromptChars
  });
  
  // 2. PLAYS_MD - Three capture strategies
  const playsPrompt = composePlaysPrompt(
    sortedCards.slice(0, budgets.PLAYS_MD.maxEvidenceCards),
    agencyCode
  );
  
  sections.push({
    type: 'PLAYS_MD',
    prompt: await enforcePromptBudget(playsPrompt, budgets.PLAYS_MD.maxPromptChars),
    charCount: playsPrompt.length,
    cardCount: Math.min(sortedCards.length, budgets.PLAYS_MD.maxEvidenceCards),
    withinBudget: playsPrompt.length <= budgets.PLAYS_MD.maxPromptChars
  });
  
  // 3. PROCUREMENT_JSON - Metrics echo
  const procurementPrompt = composeProcurementPrompt(procurementMetrics);
  
  sections.push({
    type: 'PROCUREMENT_JSON',
    prompt: await enforcePromptBudget(procurementPrompt, budgets.PROCUREMENT_JSON.maxPromptChars),
    charCount: procurementPrompt.length,
    cardCount: 0, // No evidence cards for procurement
    withinBudget: procurementPrompt.length <= budgets.PROCUREMENT_JSON.maxPromptChars
  });
  
  // 4. ANNEX_JSON - Signals/Themes/Sources
  const annexPrompt = composeAnnexPrompt(
    sortedCards.slice(0, budgets.ANNEX_JSON.maxEvidenceCards),
    agencyCode
  );
  
  sections.push({
    type: 'ANNEX_JSON',
    prompt: await enforcePromptBudget(annexPrompt, budgets.ANNEX_JSON.maxPromptChars),
    charCount: annexPrompt.length,
    cardCount: Math.min(sortedCards.length, budgets.ANNEX_JSON.maxEvidenceCards),
    withinBudget: annexPrompt.length <= budgets.ANNEX_JSON.maxPromptChars
  });
  
  return sections;
}

/**
 * Compose BRIEFING_MD prompt
 */
function composeBriefingPrompt(
  cards: EvidenceCard[],
  metrics: any,
  agencyCode: string
): string {
  const cardsText = cards.map(card => 
    `[${card.id}] ${card.claim} (${card.class}, ${card.csf?.fn || 'N/A'})`
  ).join('\n');
  
  return `Generate an executive briefing for ${agencyCode} based on the following evidence cards and procurement metrics.

EVIDENCE CARDS:
${cardsText}

KEY METRICS:
- Total Contract Value: $${(metrics.total_value / 1_000_000).toFixed(1)}M
- Active Contracts: ${metrics.active_contracts}
- Top NAICS: ${metrics.top_naics?.join(', ') || 'N/A'}
- Growth Rate: ${metrics.growth_rate || 'N/A'}%

Generate a concise briefing with:
1. Executive Summary (≤180 words) - Key findings and strategic implications
2. Current Posture (3 bullets) - Agency's current cybersecurity state
3. Strategic Outlook (3 bullets) - Forward-looking recommendations

Format as Markdown. Each bullet should end with [doc_id:page] citation. Focus on actionable intelligence.`;
}

/**
 * Compose PLAYS_MD prompt
 */
function composePlaysPrompt(
  cards: EvidenceCard[],
  agencyCode: string
): string {
  const cardsText = cards.map(card =>
    `[${card.id}] ${card.claim} (${card.class})`
  ).join('\n');
  
  const capabilityProofs = [
    'ATO acceleration (60-day fast track)',
    'RMF automation platform',
    'Continuous monitoring (ECDM-ready)',
    'STIG compliance automation',
    'Zero Trust architecture expertise'
  ];
  
  return `Generate 3 strategic capture plays for ${agencyCode} based on evidence cards.

EVIDENCE CARDS:
${cardsText}

OUR PROVEN CAPABILITIES:
${capabilityProofs.map(c => `- ${c}`).join('\n')}

Generate exactly 3 plays in this structure:
{
  "play_name": "Short memorable name (≤5 words)",
  "offer": "What we're proposing (≤25 words)",
  "proof_point": "Specific capability reference (≤25 words)",
  "assets": "Key differentiators (≤25 words)",
  "vehicle_pathways": "Contract vehicles (8(a), SEWP, CIO-SP4, etc.)",
  "first_meeting_demo": "What to show in first meeting (≤25 words)",
  "success_metric": "Measurable outcome (≤25 words)"
}

Focus on plays that directly address the evidence card findings.`;
}

/**
 * Compose PROCUREMENT_JSON prompt
 */
function composeProcurementPrompt(metrics: any): string {
  return `Echo the following procurement metrics exactly as JSON:

${JSON.stringify(metrics, null, 2)}

Return the exact same JSON structure without modifications.`;
}

/**
 * Compose ANNEX_JSON prompt
 */
function composeAnnexPrompt(
  cards: EvidenceCard[],
  agencyCode: string
): string {
  const cardsText = cards.map(card =>
    `[${card.id}] ${card.quote} | ${card.claim} | ${card.source_doc} | ${card.class} | ${card.csf?.fn || 'N/A'}`
  ).join('\n');
  
  return `Generate technical annex for ${agencyCode} based on evidence cards.

EVIDENCE CARDS:
${cardsText}

Generate JSON with three sections:
{
  "signals_ledger": [
    {
      "signal": "Key technology or mandate signal",
      "frequency": "Number of mentions",
      "context": "Brief context (≤20 words)",
      "card_ids": ["id1", "id2"]
    }
  ],
  "themes_rollup": [
    {
      "theme": "Strategic theme name",
      "description": "Theme description (≤30 words)",
      "evidence_strength": "high|medium|low",
      "supporting_cards": 3
    }
  ],
  "source_index": [
    {
      "source": "Document name",
      "type": "OIG|GAO|NIST|OMB|other",
      "date": "Publication date if known",
      "cards_extracted": 5
    }
  ]
}

Focus on technical accuracy and traceability.`;
}

/**
 * Enforce prompt budget with auto-shrink
 */
async function enforcePromptBudget(
  prompt: string,
  maxChars: number
): Promise<string> {
  if (prompt.length <= maxChars) {
    return prompt;
  }
  
  // Auto-shrink sequence
  let shrunk = prompt;
  
  // Step 1: Remove quotes, keep claims
  shrunk = shrunk.replace(/\[[\w:]+\]\s*"[^"]{50,}"/g, (match) => {
    const idMatch = match.match(/\[([\w:]+)\]/);
    return idMatch ? `[${idMatch[1]}] <quote removed for space>` : '';
  });
  
  if (shrunk.length <= maxChars) {
    return shrunk;
  }
  
  // Step 2: Reduce evidence cards by 20%
  const lines = shrunk.split('\n');
  const evidenceStart = lines.findIndex(l => l.includes('EVIDENCE CARDS:'));
  const evidenceEnd = lines.findIndex((l, i) => i > evidenceStart && l.trim() === '');
  
  if (evidenceStart >= 0 && evidenceEnd > evidenceStart) {
    const evidenceLines = lines.slice(evidenceStart + 1, evidenceEnd);
    const reduced = evidenceLines.slice(0, Math.floor(evidenceLines.length * 0.8));
    
    shrunk = [
      ...lines.slice(0, evidenceStart + 1),
      ...reduced,
      ...lines.slice(evidenceEnd)
    ].join('\n');
  }
  
  if (shrunk.length <= maxChars) {
    return shrunk;
  }
  
  // Step 3: Truncate with warning
  return shrunk.substring(0, maxChars - 100) + '\n\n[TRUNCATED DUE TO SIZE LIMITS]';
}

/**
 * Validate prompt sections before API calls
 */
export function validatePromptSections(sections: PromptSection[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const section of sections) {
    if (!section.withinBudget) {
      errors.push(`${section.type}: Prompt exceeds budget (${section.charCount} chars)`);
    }
    
    if (section.prompt.includes('[TRUNCATED')) {
      errors.push(`${section.type}: Prompt was truncated, may affect quality`);
    }
    
    if (section.type !== 'PROCUREMENT_JSON' && section.cardCount === 0) {
      errors.push(`${section.type}: No evidence cards available`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle pagination for large annexes
 */
export function paginateAnnex(
  cards: EvidenceCard[],
  pageSize: number = 30
): EvidenceCard[][] {
  const pages: EvidenceCard[][] = [];
  
  for (let i = 0; i < cards.length; i += pageSize) {
    pages.push(cards.slice(i, i + pageSize));
  }
  
  return pages;
}
