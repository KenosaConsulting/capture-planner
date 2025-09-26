// Scoring module for evidence cards
import { DistillationConfig } from '../../types/distillation';

/**
 * Infer NIST CSF 2.0 function from text
 */
export function inferCSF(text: string): { fn: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC', category?: string } | undefined {
  const lower = text.toLowerCase();
  
  // Governance (GV)
  if (/\b(governance|policy|policies|risk management|compliance|oversight|accountability|strategy)\b/i.test(text)) {
    return { fn: 'GV', category: 'Governance' };
  }
  
  // Identify (ID)
  if (/\b(asset|inventory|data classification|risk assessment|vulnerability assessment|discovery|mapping)\b/i.test(text)) {
    return { fn: 'ID', category: 'Asset Management' };
  }
  
  // Protect (PR)
  if (/\b(access control|authentication|encryption|patch|hardening|firewall|segmentation|backup|training)\b/i.test(text)) {
    return { fn: 'PR', category: 'Protective Technology' };
  }
  
  // Detect (DE)
  if (/\b(monitor|detect|alert|siem|logging|audit|anomaly|threat|visibility|continuous monitoring)\b/i.test(text)) {
    return { fn: 'DE', category: 'Security Continuous Monitoring' };
  }
  
  // Respond (RS)
  if (/\b(incident|response|containment|mitigation|investigation|forensics|escalation)\b/i.test(text)) {
    return { fn: 'RS', category: 'Incident Response' };
  }
  
  // Recover (RC)
  if (/\b(recovery|restore|resilience|continuity|disaster|backup|lessons learned)\b/i.test(text)) {
    return { fn: 'RC', category: 'Recovery Planning' };
  }
  
  // Default to Protect if no clear match
  return { fn: 'PR', category: 'General Security' };
}

/**
 * Infer timeframe from text
 */
export function inferTimeframe(text: string): 'near' | 'mid' | 'long' | undefined {
  const lower = text.toLowerCase();
  
  // Near-term indicators (0-6 months)
  if (/\b(immediate|urgent|critical|q[1-2]\s*2025|by\s+(january|february|march|april|may|june)\s*2025)\b/i.test(text)) {
    return 'near';
  }
  
  // Mid-term indicators (6-18 months)
  if (/\b(fy\s*2025|q[3-4]\s*2025|q[1-2]\s*2026|by\s+(end\s+of\s+)?2025)\b/i.test(text)) {
    return 'mid';
  }
  
  // Long-term indicators (18+ months)
  if (/\b(fy\s*202[6-9]|multi-year|long[- ]term|strategic|future|202[6-9])\b/i.test(text)) {
    return 'long';
  }
  
  return undefined;
}

/**
 * Score evidence based on specificity, compliance, and budget relevance
 */
export function scoreEvidence(
  text: string, 
  config: DistillationConfig
): {
  specificity: 1 | 2 | 3;
  compliance: 1 | 2 | 3;
  budget: 0 | 1 | 2 | 3;
  total: number;
} {
  
  // Score Specificity (1-3)
  let specificity: 1 | 2 | 3 = 1;
  const lower = text.toLowerCase();
  
  // High specificity: mentions specific systems, programs, or projects
  if (/\b[A-Z]{3,}\b/.test(text) || // Has acronyms
      /\b(system|platform|application|program)\s+[A-Z]/i.test(text) || // Named systems
      config.bureaus.some(bureau => lower.includes(bureau.toLowerCase()))) { // Specific bureau
    specificity = 3;
  }
  // Medium specificity: mentions agency or general programs
  else if (lower.includes(config.agency.toLowerCase()) ||
           config.signals.priority_high.some(signal => lower.includes(signal.toLowerCase()))) {
    specificity = 2;
  }
  // Low specificity: generic references
  else {
    specificity = 1;
  }
  
  // Score Compliance (1-3)
  let compliance: 1 | 2 | 3 = 1;
  
  // High compliance: contains mandate language and specific references
  if (/\b(shall|must|required by|mandated)\b/i.test(text) &&
      /\b(omb\s+m-|gao-|oig-|pub\.\s*l\.|executive order)\b/i.test(text)) {
    compliance = 3;
  }
  // Medium compliance: contains either mandate language or policy references
  else if (/\b(shall|must|required|compliance|adherence)\b/i.test(text) ||
           /\b(fisma|fedramp|nist\s+800|hipaa|section\s+508)\b/i.test(text)) {
    compliance = 2;
  }
  // Low compliance: general guidance
  else {
    compliance = 1;
  }
  
  // Score Budget (0-3)
  let budget: 0 | 1 | 2 | 3 = 0;
  
  // Extract budget amount if present
  const budgetMatch = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(million|billion|thousand)?/i);
  
  if (budgetMatch) {
    const amount = parseFloat(budgetMatch[1].replace(/,/g, ''));
    const multiplier = budgetMatch[2]?.toLowerCase();
    
    let actualAmount = amount;
    if (multiplier === 'billion') actualAmount *= 1_000_000_000;
    else if (multiplier === 'million') actualAmount *= 1_000_000;
    else if (multiplier === 'thousand') actualAmount *= 1_000;
    
    // Score based on amount
    if (actualAmount >= 100_000_000) budget = 3; // $100M+
    else if (actualAmount >= 10_000_000) budget = 2; // $10M-$100M
    else if (actualAmount >= 1_000_000) budget = 1; // $1M-$10M
    else budget = 0; // <$1M
  }
  // Also check for procurement-related terms
  else if (/\b(contract|procurement|acquisition|award|idiq|gwac|vehicle)\b/i.test(text)) {
    budget = 1; // Give some credit for procurement relevance
  }
  
  // Calculate total score using configured weights
  const total = 
    (config.scoringWeights.specificity * specificity) +
    (config.scoringWeights.compliance * compliance) +
    (config.scoringWeights.budget * budget);
  
  return { specificity, compliance, budget, total };
}

/**
 * Apply recency boost to score
 */
export function applyRecencyBoost(score: number, dateStr: string | null | undefined): number {
  if (!dateStr) return score;
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const monthsDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    // Boost if within last 24 months
    if (monthsDiff <= 24) {
      return score + 0.5;
    }
    // Penalty if older than 36 months
    else if (monthsDiff > 36) {
      return score - 0.2;
    }
  } catch (e) {
    // Invalid date, no adjustment
  }
  
  return score;
}

/**
 * Score card diversity for CSF coverage
 */
export function scoreDiversity(cards: { csf?: { fn: string } }[]): number {
  const csfFunctions = new Set(cards.map(c => c.csf?.fn).filter(Boolean));
  
  // Max diversity score when all 6 CSF functions are represented
  return csfFunctions.size / 6;
}

/**
 * Rank evidence cards with diversity bonus
 */
export function rankEvidenceCards(
  cards: { 
    total_score: number; 
    csf?: { fn: string };
    date?: string;
  }[]
): number[] {
  // First, apply recency boost
  const boostedCards = cards.map((card, index) => ({
    index,
    score: applyRecencyBoost(card.total_score, card.date),
    csf: card.csf?.fn
  }));
  
  // Group by CSF function
  const cardsByCSF = new Map<string | undefined, typeof boostedCards>();
  boostedCards.forEach(card => {
    const key = card.csf;
    if (!cardsByCSF.has(key)) {
      cardsByCSF.set(key, []);
    }
    cardsByCSF.get(key)!.push(card);
  });
  
  // Sort within each group
  cardsByCSF.forEach(group => {
    group.sort((a, b) => b.score - a.score);
  });
  
  // Interleave to ensure diversity
  const ranked: number[] = [];
  let round = 0;
  
  while (ranked.length < cards.length) {
    let addedInRound = false;
    
    // Take one from each CSF function per round
    for (const [, group] of cardsByCSF) {
      if (group.length > round) {
        ranked.push(group[round].index);
        addedInRound = true;
        
        if (ranked.length >= cards.length) break;
      }
    }
    
    // If no cards added in this round, add remaining by score
    if (!addedInRound) {
      const remaining = boostedCards
        .filter(c => !ranked.includes(c.index))
        .sort((a, b) => b.score - a.score)
        .map(c => c.index);
      
      ranked.push(...remaining);
      break;
    }
    
    round++;
  }
  
  return ranked;
}

/**
 * Calculate confidence score for evidence
 */
export function calculateConfidence(card: {
  source_type?: 'OIG' | 'GAO' | 'NIST' | 'OMB' | 'other';
  specificity_1_3: number;
  compliance_1_3: number;
}): number {
  let confidence = 0.5; // Base confidence
  
  // Source authority bonus
  const sourceWeights = {
    'OIG': 0.3,
    'GAO': 0.3,
    'OMB': 0.25,
    'NIST': 0.2,
    'other': 0.1
  };
  
  confidence += sourceWeights[card.source_type || 'other'];
  
  // Specificity bonus
  confidence += (card.specificity_1_3 / 3) * 0.15;
  
  // Compliance bonus
  confidence += (card.compliance_1_3 / 3) * 0.1;
  
  return Math.min(confidence, 1.0); // Cap at 1.0
}
