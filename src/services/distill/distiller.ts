// Main Evidence Distiller - The core engine that converts large docs to evidence cards
import { EvidenceCard, ChunkInfo, DistillationManifest, DistillationConfig } from '../../types/distillation';
import { loadAgencyConfig, loadUniversalSignals, loadFilterPatterns } from './configLoader';
import { extractChunks, hash5grams, extractShortestSentence, calculateSimilarity } from './utils';
import { inferCSF, inferTimeframe, scoreEvidence } from './scoring';

/**
 * Main distillation function - converts large documents to evidence cards
 */
export async function distillDocuments(
  files: File[],
  agencyCode: string,
  onProgress?: (message: string, percent: number) => void
): Promise<{ cards: EvidenceCard[], manifest: DistillationManifest }> {
  
  const runId = Date.now().toString();
  const startTime = Date.now();
  const config = await loadAgencyConfig(agencyCode);
  const universalSignals = await loadUniversalSignals();
  const filterPatterns = await loadFilterPatterns();
  
  // Combine agency-specific and universal signals
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
      reductionRatio: 0
    },
    topSignals: [],
    configVersion: '1.0.0'
  };

  // Process each file
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const fileProgress = (fileIndex / files.length) * 100;
    onProgress?.(`Processing ${file.name}...`, fileProgress);
    
    // Track file info
    manifest.inputFiles.push({
      name: file.name,
      sizeMB: file.size / (1024 * 1024)
    });

    // Read file content
    const content = await readFileContent(file);
    
    // Extract chunks from the document
    const chunks = extractChunks(content, file.name);
    manifest.stats.chunksProcessed += chunks.length;

    // Process each chunk
    const fileCards: EvidenceCard[] = [];
    
    for (const chunk of chunks) {
      // Check if chunk should be skipped
      if (shouldSkipChunk(chunk, filterPatterns, config.mandates)) {
        manifest.stats.chunksDropped++;
        continue;
      }

      // Check if chunk contains relevant signals
      if (!containsRelevantSignals(chunk, allSignals, config)) {
        manifest.stats.chunksDropped++;
        continue;
      }

      manifest.stats.chunksKept++;

      // Create evidence card from chunk
      const card = createEvidenceCard(chunk, config, agencyCode);
      if (card) {
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

  onProgress?.('Deduplicating evidence cards...', 80);

  // Deduplicate cards
  const dedupedCards = deduplicateCards(allCards);
  manifest.stats.cardsDeduplicated = allCards.length - dedupedCards.length;

  onProgress?.('Applying diversity rules...', 90);

  // Apply diversity rules (ensure minimum per CSF function)
  const diversifiedCards = applyDiversityRules(dedupedCards, config);

  // Final sorting and limiting
  const finalCards = diversifiedCards
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, config.maxCards);

  manifest.stats.finalCardCount = finalCards.length;

  // Calculate reduction ratio
  const totalInputSize = manifest.inputFiles.reduce((sum, f) => sum + f.sizeMB, 0);
  const outputSizeKB = JSON.stringify(finalCards).length / 1024;
  manifest.stats.reductionRatio = outputSizeKB / (totalInputSize * 1024);

  // Extract top signals
  const signalCounts = new Map<string, number>();
  finalCards.forEach(card => {
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

  onProgress?.('Distillation complete!', 100);

  return { cards: finalCards, manifest };
}

/**
 * Read file content as text
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Check if chunk should be skipped based on filters
 */
function shouldSkipChunk(
  chunk: ChunkInfo,
  filterPatterns: { skip: string[], always_keep: string[] },
  mandates: string[]
): boolean {
  const text = chunk.text.toLowerCase();
  const heading = chunk.heading?.toLowerCase() || '';

  // Check if contains override patterns (always keep)
  for (const keepPattern of filterPatterns.always_keep) {
    if (text.includes(keepPattern.toLowerCase())) {
      return false;
    }
  }

  // Check if contains mandate keywords
  for (const mandate of mandates) {
    if (text.includes(mandate.toLowerCase())) {
      return false;
    }
  }

  // Check skip patterns
  for (const skipPattern of filterPatterns.skip) {
    if (heading.includes(skipPattern.toLowerCase()) || 
        text.startsWith(skipPattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Check if chunk contains relevant signals
 */
function containsRelevantSignals(
  chunk: ChunkInfo,
  signals: string[],
  config: DistillationConfig
): boolean {
  const text = chunk.text.toLowerCase();

  // Check for agency/bureau mentions
  const agencyRegex = new RegExp(config.agency, 'i');
  if (agencyRegex.test(text)) {
    return true;
  }

  for (const bureau of config.bureaus) {
    if (text.includes(bureau.toLowerCase())) {
      return true;
    }
  }

  // Check for signals
  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) {
      return true;
    }
  }

  // Check for budget signals
  const budgetSignals = /\$[\d,]+\s*(million|billion)|contract|procurement|acquisition|obligation|award/i;
  if (budgetSignals.test(text)) {
    return true;
  }

  // Check for mandate verbs
  const mandateVerbs = /\b(shall|must|required|mandatory)\b/i;
  if (mandateVerbs.test(text)) {
    return true;
  }

  return false;
}

/**
 * Create an evidence card from a chunk
 */
function createEvidenceCard(
  chunk: ChunkInfo,
  config: DistillationConfig,
  agencyCode: string
): EvidenceCard | null {
  
  // Extract the shortest supporting sentence as the quote
  const quote = extractShortestSentence(chunk.text, 220);
  if (!quote) {
    return null;
  }

  // Create a claim (for now, use the quote as the claim)
  const claim = quote.length > 100 
    ? quote.substring(0, 97) + '...'
    : quote;

  // Determine agency targeting
  const text = chunk.text.toLowerCase();
  let targetAgency = 'GENERAL';
  
  if (text.includes(agencyCode.toLowerCase()) || 
      text.includes(config.agency.toLowerCase())) {
    targetAgency = agencyCode;
  }

  // Score the evidence
  const scores = scoreEvidence(chunk.text, config);

  // Create the card
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

/**
 * Infer the class of evidence
 */
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
  
  return 'priority'; // default
}

/**
 * Deduplicate cards based on content similarity
 * FIXED: Was not actually deduplicating due to logic error
 */
function deduplicateCards(cards: EvidenceCard[]): EvidenceCard[] {
  if (!cards || cards.length === 0) return [];
  
  const deduped: EvidenceCard[] = [];
  const seenHashes = new Set<string>();
  const seenContent = new Map<string, EvidenceCard>();

  for (const card of cards) {
    // Skip if exact hash match
    if (seenHashes.has(card.hash)) {
      console.log(`Dedup: Skipping duplicate hash ${card.hash}`);
      continue;
    }

    // Check similarity with existing cards
    let isDuplicate = false;
    let bestMatch: { card: EvidenceCard, similarity: number } | null = null;
    
    for (const existing of deduped) {
      const similarity = calculateSimilarity(card.quote, existing.quote);
      if (similarity > 0.85) { // Lowered threshold per expert recommendation
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { card: existing, similarity };
        }
      }
    }
    
    if (bestMatch) {
      // Keep the one with higher score
      if (card.total_score > bestMatch.card.total_score) {
        // Replace the existing card
        const index = deduped.indexOf(bestMatch.card);
        deduped[index] = card;
        seenHashes.delete(bestMatch.card.hash);
        seenHashes.add(card.hash);
        console.log(`Dedup: Replaced lower-scoring card (${bestMatch.similarity} similarity)`);
      } else {
        console.log(`Dedup: Skipping lower-scoring duplicate (${bestMatch.similarity} similarity)`);
      }
      isDuplicate = true;
    }

    if (!isDuplicate) {
      seenHashes.add(card.hash);
      deduped.push(card);
    }
  }

  console.log(`Deduplication: ${cards.length} -> ${deduped.length} (removed ${cards.length - deduped.length})`);
  return deduped;
}

/**
 * Apply diversity rules to ensure minimum coverage per CSF function
 */
function applyDiversityRules(
  cards: EvidenceCard[],
  config: DistillationConfig
): EvidenceCard[] {
  
  const csfFunctions = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
  const cardsByCSF = new Map<string, EvidenceCard[]>();
  const cardsWithoutCSF: EvidenceCard[] = [];

  // Group cards by CSF function
  for (const card of cards) {
    if (card.csf?.fn) {
      const existing = cardsByCSF.get(card.csf.fn) || [];
      existing.push(card);
      cardsByCSF.set(card.csf.fn, existing);
    } else {
      cardsWithoutCSF.push(card);
    }
  }

  // Ensure minimum per CSF
  const diversified: EvidenceCard[] = [];
  
  for (const fn of csfFunctions) {
    const fnCards = cardsByCSF.get(fn) || [];
    const sorted = fnCards.sort((a, b) => b.total_score - a.total_score);
    
    // Take at least minPerCSF if available
    const toTake = Math.min(sorted.length, config.minPerCSF);
    diversified.push(...sorted.slice(0, toTake));
  }

  // Add remaining high-score cards
  const remaining = cards
    .filter(c => !diversified.includes(c))
    .sort((a, b) => b.total_score - a.total_score);

  const spaceleft = config.maxCards - diversified.length;
  diversified.push(...remaining.slice(0, spaceleft));

  return diversified;
}
