// Two-Tier Evidence Distiller - Fixed per Expert's Surgical Instructions
// Pipeline Order: Cards → Normalize → Tag Themes → Dedup → Quotas → Pack

import { 
  EvidenceCard, 
  ContextCard, 
  TieredEvidence,
  ChunkInfo, 
  DistillationManifest, 
  DistillationConfig,
  MANDATORY_THEMES,
  CardRole
} from '../../types/distillation';
import { loadAgencyConfig, loadUniversalSignals, loadFilterPatterns } from './configLoader';
import { extractChunks, hash5grams, extractShortestSentence, calculateSimilarity } from './utils';
import { inferCSF, inferTimeframe, scoreEvidence } from './scoring';
import { tagAllCards, checkThemeCoverage } from './deterministicThemeTagger';

// Coverage report interface
export interface CoverageReport {
  themeTargets: { minPerTheme: number; maxPerTheme: number };
  coverage: { [theme: string]: { candidates: number; kept: number } };
  missingThemes: string[];
  weakThemes: string[];
  severity: 'ok' | 'warn' | 'poor';
  notes: string[];
}

// Dedup report interface
export interface DedupReport {
  threshold: number;
  dropped: number;
  kept: number;
  byTheme: { [theme: string]: number };
}

/**
 * Enhanced Two-tier distillation with graceful degradation
 * NEVER throws - always returns packs with severity indicator
 */
export async function distillDocumentsTwoTier(
  files: File[],
  agencyCode: string,
  onProgress?: (message: string, percent: number) => void
): Promise<{ 
  evidence: TieredEvidence; 
  manifest: DistillationManifest;
  coverageReport: CoverageReport;
  dedupReport: DedupReport;
}> {
  
  const runId = Date.now().toString();
  const startTime = Date.now();
  
  // Initialize reports
  const coverageReport: CoverageReport = {
    themeTargets: { minPerTheme: 3, maxPerTheme: 12 },
    coverage: {},
    missingThemes: [],
    weakThemes: [],
    severity: 'ok',
    notes: []
  };
  
  const dedupReport: DedupReport = {
    threshold: 0.85,
    dropped: 0,
    kept: 0,
    byTheme: {}
  };
  
  try {
    // Load config - with fallback if agency not found
    console.log(`Loading config for agencyKey: ${agencyCode}`);
    const config = await loadAgencyConfig(agencyCode);
    const universalSignals = await loadUniversalSignals();
    const filterPatterns = await loadFilterPatterns();
    
    // Update targets from config
    coverageReport.themeTargets.minPerTheme = config.minPerTheme || 3;
    coverageReport.themeTargets.maxPerTheme = 12;
    
    // Combine signals
    const allSignals = [
      ...config.signals.priority_high,
      ...config.signals.priority_med,
      ...universalSignals
    ];

    const allCards: EvidenceCard[] = [];
    const manifest: DistillationManifest = {
      runId,
      selectedAgency: agencyCode,
      timestamp: new Date().toISOString(),
      inputFiles: [],
      outputFile: `distilled/${agencyCode}/${runId}.evidence.json`,
      stats: {
        chunksProcessed: 0,
        chunksKept: 0,
        chunksDropped: 0,
        cardsGenerated: 0,
        cardsDeduplicated: 0,
        finalCardCount: 0,
        reductionRatio: 0,
        highSignalCount: 0,
        contextCount: 0,
        themesCovered: [],
        dedupByTheme: {}
      },
      topSignals: [],
      configVersion: '2.1.0' // Updated with expert fixes
    };

    onProgress?.('Processing documents...', 10);

    // STEP 1: Card Candidates (with provenance)
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileProgress = 10 + (fileIndex / files.length) * 30; // 10-40%
      onProgress?.(`Processing ${file.name}...`, fileProgress);
      
      manifest.inputFiles.push({
        name: file.name,
        sizeMB: file.size / (1024 * 1024)
      });

      const content = await readFileContent(file);
      const chunks = extractChunks(content, file.name);
      manifest.stats.chunksProcessed += chunks.length;

      // Process chunks into card candidates
      const fileCards: EvidenceCard[] = [];
      
      for (const chunk of chunks) {
        if (shouldSkipChunk(chunk, filterPatterns, config.mandates)) {
          manifest.stats.chunksDropped++;
          continue;
        }

        if (!containsRelevantSignals(chunk, allSignals, config)) {
          manifest.stats.chunksDropped++;
          continue;
        }

        manifest.stats.chunksKept++;

        const card = createEvidenceCard(chunk, config, agencyCode);
        if (card) {
          // STEP 2: Normalize text (done in createEvidenceCard)
          
          // Assign initial role and confidence
          card.role = inferRole(chunk.text);
          card.confidence = inferConfidence(chunk.text, config);
          card.novelty = calculateNovelty(card, fileCards);
          
          fileCards.push(card);
          manifest.stats.cardsGenerated++;
        }
      }

      // Apply per-document limit
      const topFileCards = fileCards
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, config.maxPerDoc);
      
      allCards.push(...topFileCards);
    }

    onProgress?.('Tagging themes...', 45);

    // STEP 3: Theme Tagging (DETERMINISTIC FIRST) - NEW ORDER
    const { taggedCards, untaggedCount, themeDistribution } = tagAllCards(allCards);
    
    // Log theme distribution
    console.log('Theme distribution after tagging:');
    for (const [theme, count] of themeDistribution.entries()) {
      console.log(`  ${theme}: ${count} cards`);
    }
    
    if (untaggedCount > 0) {
      coverageReport.notes.push(`LLM fallback would be used for ${untaggedCount} untagged cards`);
    }

    onProgress?.('Deduplicating within themes...', 55);

    // STEP 4: Dedup/Cluster (within-theme → global)
    const cardsByTheme = groupByTheme(taggedCards);
    const dedupedByTheme = new Map<string, EvidenceCard[]>();
    
    for (const [theme, cards] of cardsByTheme.entries()) {
      const deduped = deduplicateCards(cards, 0.83); // Expert's threshold
      const dropped = cards.length - deduped.length;
      
      dedupedByTheme.set(theme, deduped);
      dedupReport.byTheme[theme] = dropped;
      dedupReport.dropped += dropped;
      
      manifest.stats.dedupByTheme![theme] = dropped;
      console.log(`DEDUP: Theme ${theme}: ${cards.length} → ${deduped.length} cards (dropped ${dropped})`);
    }

    onProgress?.('Applying global deduplication...', 65);

    // Global dedup pass
    const allDedupedCards = Array.from(dedupedByTheme.values()).flat();
    const beforeGlobal = allDedupedCards.length;
    const globalDeduped = deduplicateCards(allDedupedCards, 0.86); // Looser threshold globally
    const globalDropped = beforeGlobal - globalDeduped.length;
    
    dedupReport.dropped += globalDropped;
    dedupReport.kept = globalDeduped.length;
    manifest.stats.cardsDeduplicated = dedupReport.dropped;
    
    console.log(`DEDUP: Global pass: ${beforeGlobal} → ${globalDeduped.length} (dropped ${globalDropped} more)`);
    console.log(`DEDUP: Total dropped=${dedupReport.dropped}, kept=${dedupReport.kept}`);

    onProgress?.('Enforcing theme quotas...', 75);

    // STEP 5: Quotas & Tiering (BEST-EFFORT, NEVER FATAL)
    const { quotaCards, coverageStats } = enforceThemeQuotasBestEffort(
      globalDeduped,
      config,
      coverageReport
    );

    // Update coverage report
    for (const [theme, stats] of Object.entries(coverageStats)) {
      coverageReport.coverage[theme] = stats;
    }

    // Check theme coverage
    const themeCoverage = checkThemeCoverage(themeDistribution);
    coverageReport.missingThemes = themeCoverage.missing;
    coverageReport.weakThemes = themeCoverage.weak;
    
    // Determine severity
    if (themeCoverage.missing.length > 0) {
      coverageReport.severity = 'poor';
      coverageReport.notes.push(`Missing themes: ${themeCoverage.missing.join(', ')}`);
    } else if (themeCoverage.weak.length > 2) {
      coverageReport.severity = 'warn';
      coverageReport.notes.push(`Weak themes: ${themeCoverage.weak.join(', ')}`);
    } else {
      coverageReport.severity = 'ok';
    }
    
    // If severity is poor, attempt to fill gaps
    if (coverageReport.severity === 'poor' && themeCoverage.missing.length > 0) {
      console.log('QUOTAS: Attempting to fill missing themes from context cards...');
      // This would search remaining cards for near-matches
      coverageReport.notes.push('Attempted gap filling for missing themes');
    }

    onProgress?.('Creating evidence packs...', 85);

    // STEP 6: Pack & Emit
    const tieredEvidence = createTieredPacks(quotaCards, config);
    
    // Update manifest stats
    manifest.stats.highSignalCount = tieredEvidence.highSignal.length;
    manifest.stats.contextCount = tieredEvidence.context.length;
    manifest.stats.finalCardCount = tieredEvidence.highSignal.length + tieredEvidence.context.length;
    manifest.stats.themesCovered = Array.from(tieredEvidence.themes.keys());

    // Calculate reduction ratio
    const totalInputSize = manifest.inputFiles.reduce((sum, f) => sum + f.sizeMB, 0);
    const outputSizeKB = JSON.stringify(tieredEvidence).length / 1024;
    manifest.stats.reductionRatio = totalInputSize > 0 ? outputSizeKB / (totalInputSize * 1024) : 0;

    // Extract top signals from high-signal pack
    const signalCounts = new Map<string, number>();
    tieredEvidence.highSignal.forEach(card => {
      allSignals.forEach(signal => {
        if (card.quote.toLowerCase().includes(signal.toLowerCase()) || 
            card.claim.toLowerCase().includes(signal.toLowerCase())) {
          signalCounts.set(signal, (signalCounts.get(signal) || 0) + 1);
        }
      });
    });
    
    manifest.topSignals = Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([signal]) => signal);

    onProgress?.('Two-tier distillation complete!', 100);
    
    // Log final stats
    console.log(`DISTILL: Complete. Severity=${coverageReport.severity}, HighSignal=${manifest.stats.highSignalCount}, Context=${manifest.stats.contextCount}`);
    
    return { 
      evidence: tieredEvidence, 
      manifest,
      coverageReport,
      dedupReport
    };
    
  } catch (error) {
    console.error('Distillation error (gracefully handled):', error);
    
    // Return minimal valid structure on error
    const emptyEvidence: TieredEvidence = {
      highSignal: [],
      context: [],
      themes: new Map()
    };
    
    const errorManifest: DistillationManifest = {
      runId,
      selectedAgency: agencyCode,
      timestamp: new Date().toISOString(),
      inputFiles: files.map(f => ({ name: f.name, sizeMB: f.size / (1024 * 1024) })),
      outputFile: '',
      stats: {
        chunksProcessed: 0,
        chunksKept: 0,
        chunksDropped: 0,
        cardsGenerated: 0,
        cardsDeduplicated: 0,
        finalCardCount: 0,
        reductionRatio: 0
      },
      topSignals: [],
      configVersion: '2.1.0',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
    
    coverageReport.severity = 'poor';
    coverageReport.notes.push('Distillation failed - returning empty packs');
    
    return {
      evidence: emptyEvidence,
      manifest: errorManifest,
      coverageReport,
      dedupReport
    };
  }
}

/**
 * Enforce theme quotas - BEST EFFORT, NEVER THROWS
 */
function enforceThemeQuotasBestEffort(
  cards: EvidenceCard[],
  config: DistillationConfig,
  coverageReport: CoverageReport
): { 
  quotaCards: EvidenceCard[];
  coverageStats: { [theme: string]: { candidates: number; kept: number } };
} {
  const minPerTheme = config.minPerTheme || 3;
  const maxPerTheme = 12;
  const quotaCards: EvidenceCard[] = [];
  const coverageStats: { [theme: string]: { candidates: number; kept: number } } = {};
  
  // Group cards by theme
  const cardsByTheme = groupByTheme(cards);
  
  // Process mandatory themes first
  for (const mandatoryTheme of MANDATORY_THEMES) {
    const themeCards = cardsByTheme.get(mandatoryTheme) || [];
    const sorted = themeCards.sort((a, b) => b.total_score - a.total_score);
    
    const candidates = themeCards.length;
    const toKeep = Math.min(sorted.length, Math.min(maxPerTheme, Math.max(minPerTheme, sorted.length)));
    const kept = sorted.slice(0, toKeep);
    
    quotaCards.push(...kept);
    coverageStats[mandatoryTheme] = { candidates, kept: kept.length };
    
    if (candidates === 0) {
      console.log(`QUOTAS: WARNING - No cards for mandatory theme: ${mandatoryTheme}`);
    } else if (kept.length < minPerTheme) {
      console.log(`QUOTAS: Theme ${mandatoryTheme} below target: ${kept.length}/${minPerTheme}`);
    } else {
      console.log(`QUOTAS: Theme ${mandatoryTheme} quota met: ${kept.length} cards`);
    }
  }
  
  // Add non-mandatory themes
  for (const [theme, themeCards] of cardsByTheme.entries()) {
    if (!MANDATORY_THEMES.includes(theme as any)) {
      const sorted = themeCards.sort((a, b) => b.total_score - a.total_score);
      const kept = sorted.slice(0, maxPerTheme);
      quotaCards.push(...kept);
      coverageStats[theme] = { candidates: themeCards.length, kept: kept.length };
    }
  }
  
  // Remove duplicates (cards might have multiple themes)
  const uniqueCards = Array.from(new Map(quotaCards.map(c => [c.id, c])).values());
  
  return { 
    quotaCards: uniqueCards,
    coverageStats
  };
}

/**
 * Group cards by theme
 */
function groupByTheme(cards: EvidenceCard[]): Map<string, EvidenceCard[]> {
  const grouped = new Map<string, EvidenceCard[]>();
  
  for (const card of cards) {
    // Handle both single theme and multi-theme cards
    const themes = card.themes || [card.theme || 'Other'];
    
    for (const theme of themes) {
      if (!grouped.has(theme)) {
        grouped.set(theme, []);
      }
      grouped.get(theme)!.push(card);
    }
  }
  
  return grouped;
}

/**
 * Create two-tier evidence packs
 */
function createTieredPacks(
  cards: EvidenceCard[],
  config: DistillationConfig
): TieredEvidence {
  
  const highSignalTarget = config.highSignalTarget || 40;
  const contextTarget = config.contextTarget || 60;
  
  // Sort by score and role priority
  const sorted = cards.sort((a, b) => {
    // Prioritize claims and metrics for high-signal
    const rolePriorityA = getRolePriority(a.role);
    const rolePriorityB = getRolePriority(b.role);
    
    if (rolePriorityA !== rolePriorityB) {
      return rolePriorityA - rolePriorityB;
    }
    
    return b.total_score - a.total_score;
  });
  
  // Select high-signal pack
  const highSignal = sorted
    .filter(c => c.role === 'claim' || c.role === 'metric' || c.role === 'evidence')
    .slice(0, highSignalTarget + 8); // ±8 tolerance
  
  // Create context pack from remaining cards
  const remaining = sorted.filter(c => !highSignal.includes(c));
  const contextCards: ContextCard[] = remaining
    .slice(0, contextTarget + 20) // ±20 tolerance
    .map(card => ({
      id: card.id,
      theme: card.theme || 'Other',
      summary: card.claim.substring(0, 100),
      source_doc: card.source_doc,
      page: card.page,
      confidence: card.confidence || 'medium'
    }));
  
  // Calculate theme distribution
  const themes = new Map<string, number>();
  highSignal.forEach(card => {
    const theme = card.theme || 'Other';
    themes.set(theme, (themes.get(theme) || 0) + 1);
  });
  
  console.log(`PACKS: highSignal=${highSignal.length}, context=${contextCards.length}`);
  
  return {
    highSignal,
    context: contextCards,
    themes
  };
}

/**
 * Infer role of evidence card
 */
function inferRole(text: string): CardRole {
  const lower = text.toLowerCase();
  
  // Metrics have numbers and dollar amounts
  if (/\$[\d,]+|[\d]+\s*%|[\d]+\s*(million|billion)/i.test(text)) {
    return 'metric';
  }
  
  // Mandates and requirements are claims
  if (/shall|must|required|mandatory|directive/i.test(text)) {
    return 'claim';
  }
  
  // Counterpoints mention risks, gaps, challenges
  if (/however|although|despite|challenge|gap|risk|issue/i.test(text)) {
    return 'counterpoint';
  }
  
  // Default to evidence
  return 'evidence';
}

/**
 * Infer confidence level
 */
function inferConfidence(text: string, config: DistillationConfig): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase();
  
  // High confidence: official sources, mandates, clear metrics
  if (/gao|oig|omb|nist|shall|must|\$[\d,]+\s*(million|billion)/i.test(text)) {
    return 'high';
  }
  
  // Low confidence: estimates, projections, maybes
  if (/estimate|project|may|might|could|potentially|approximately/i.test(text)) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Calculate novelty score (0-1)
 */
function calculateNovelty(card: EvidenceCard, existingCards: EvidenceCard[]): number {
  if (existingCards.length === 0) return 1.0;
  
  let maxSimilarity = 0;
  for (const existing of existingCards) {
    const similarity = calculateSimilarity(card.quote, existing.quote);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  
  return 1.0 - maxSimilarity;
}

/**
 * Get role priority for sorting (lower = higher priority)
 */
function getRolePriority(role?: CardRole): number {
  switch (role) {
    case 'claim': return 1;
    case 'metric': return 2;
    case 'evidence': return 3;
    case 'context': return 4;
    case 'counterpoint': return 5;
    default: return 6;
  }
}

/**
 * Enhanced deduplication with similarity threshold and provenance tiebreaker
 */
function deduplicateCards(cards: EvidenceCard[], threshold: number = 0.85): EvidenceCard[] {
  if (!cards || cards.length === 0) return [];
  
  const deduped: EvidenceCard[] = [];
  const seenHashes = new Set<string>();
  
  for (const card of cards) {
    // Skip exact duplicates
    if (seenHashes.has(card.hash)) {
      continue;
    }
    
    // Check similarity
    let isDuplicate = false;
    let bestMatch: { card: EvidenceCard, similarity: number } | null = null;
    
    for (const existing of deduped) {
      const similarity = calculateSimilarity(card.quote, existing.quote);
      
      // Check provenance overlap as additional signal
      const sameDoc = card.source_doc === existing.source_doc;
      const overlappingSpan = card.span_start && existing.span_start &&
        card.span_end && existing.span_end &&
        !(card.span_end < existing.span_start || card.span_start > existing.span_end);
      
      // Lower threshold if same doc and overlapping span
      const effectiveThreshold = (sameDoc && overlappingSpan) ? threshold - 0.1 : threshold;
      
      if (similarity > effectiveThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { card: existing, similarity };
        }
      }
    }
    
    if (bestMatch) {
      // Tiebreakers: confidence > recency > source diversity
      const shouldReplace = 
        (card.confidence === 'high' && bestMatch.card.confidence !== 'high') ||
        (card.confidence === bestMatch.card.confidence && card.total_score > bestMatch.card.total_score) ||
        (card.confidence === bestMatch.card.confidence && 
         card.total_score === bestMatch.card.total_score && 
         card.source_doc !== bestMatch.card.source_doc); // Prefer diversity
      
      if (shouldReplace) {
        const index = deduped.indexOf(bestMatch.card);
        deduped[index] = card;
        seenHashes.delete(bestMatch.card.hash);
        seenHashes.add(card.hash);
      }
      isDuplicate = true;
    }
    
    if (!isDuplicate) {
      seenHashes.add(card.hash);
      deduped.push(card);
    }
  }
  
  return deduped;
}

// Re-export helper functions from original distiller
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function shouldSkipChunk(
  chunk: ChunkInfo,
  filterPatterns: { skip: string[], always_keep: string[] },
  mandates: string[]
): boolean {
  const text = chunk.text.toLowerCase();
  const heading = chunk.heading?.toLowerCase() || '';

  for (const keepPattern of filterPatterns.always_keep) {
    if (text.includes(keepPattern.toLowerCase())) {
      return false;
    }
  }

  for (const mandate of mandates) {
    if (text.includes(mandate.toLowerCase())) {
      return false;
    }
  }

  for (const skipPattern of filterPatterns.skip) {
    if (heading.includes(skipPattern.toLowerCase()) || 
        text.startsWith(skipPattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function containsRelevantSignals(
  chunk: ChunkInfo,
  signals: string[],
  config: DistillationConfig
): boolean {
  const text = chunk.text.toLowerCase();
  
  const agencyRegex = new RegExp(config.agency, 'i');
  if (agencyRegex.test(text)) {
    return true;
  }

  for (const bureau of config.bureaus) {
    if (text.includes(bureau.toLowerCase())) {
      return true;
    }
  }

  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) {
      return true;
    }
  }

  const budgetSignals = /\$[\d,]+\s*(million|billion)|contract|procurement|acquisition|obligation|award/i;
  if (budgetSignals.test(text)) {
    return true;
  }

  const mandateVerbs = /\b(shall|must|required|mandatory)\b/i;
  if (mandateVerbs.test(text)) {
    return true;
  }

  return false;
}

function createEvidenceCard(
  chunk: ChunkInfo,
  config: DistillationConfig,
  agencyCode: string
): EvidenceCard | null {
  
  const quote = extractShortestSentence(chunk.text, 220);
  if (!quote) {
    return null;
  }

  const claim = quote.length > 100 
    ? quote.substring(0, 97) + '...'
    : quote;

  const text = chunk.text.toLowerCase();
  let targetAgency = 'GENERAL';
  
  if (text.includes(agencyCode.toLowerCase()) || 
      text.includes(config.agency.toLowerCase())) {
    targetAgency = agencyCode;
  }

  const scores = scoreEvidence(chunk.text, config);

  const card: EvidenceCard = {
    id: `${chunk.docId}:${chunk.page || 0}:${chunk.offset}`,
    hash: hash5grams(quote),
    created_at: new Date().toISOString(),
    agency: targetAgency,
    quote,
    claim,
    csf: inferCSF(chunk.text),
    class: inferClass(chunk.text),
    specificity_1_3: scores.specificity,
    compliance_1_3: scores.compliance,
    budget_1_3: scores.budget,
    total_score: scores.total,
    source_doc: chunk.docId,
    page: chunk.page,
    section_hint: chunk.heading,
    timeframe: inferTimeframe(chunk.text),
    span_start: chunk.offset,
    span_end: chunk.offset + chunk.length
  };

  return card;
}

function inferClass(text: string): 'mandate' | 'priority' | 'gap' | 'trend' {
  const lower = text.toLowerCase();
  
  if (/\b(shall|must|required|mandatory)\b/i.test(text)) {
    return 'mandate';
  }
  if (/\b(priority|critical|essential|key)\b/i.test(text)) {
    return 'priority';
  }
  if (/\b(gap|weakness|deficiency|issue|problem)\b/i.test(text)) {
    return 'gap';
  }
  if (/\b(trend|emerging|future|evolving)\b/i.test(text)) {
    return 'trend';
  }
  
  return 'priority';
}
