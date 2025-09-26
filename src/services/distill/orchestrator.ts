// Main orchestrator for the distillation pipeline
import { distillDocuments } from './distiller';
import { composeFourCallPrompts, validatePromptSections, GenerationResult } from './fourCallPattern';
import { EvidenceCard, DistillationManifest } from '../../types/distillation';

export interface DistillationPipelineOptions {
  files: File[];
  csvFile?: File;
  agencyCode: string;
  onProgress?: (stage: string, percent: number) => void;
  onStageComplete?: (stage: string, data: any) => void;
}

export interface DistillationPipelineResult {
  success: boolean;
  manifest?: DistillationManifest;
  evidenceCards?: EvidenceCard[];
  prompts?: {
    briefing: string;
    plays: string;
    procurement: string;
    annex: string;
  };
  errors?: string[];
  runId: string;
}

/**
 * Main pipeline orchestrator
 */
export async function runDistillationPipeline(
  options: DistillationPipelineOptions
): Promise<DistillationPipelineResult> {
  const { files, csvFile, agencyCode, onProgress, onStageComplete } = options;
  const runId = Date.now().toString();
  const errors: string[] = [];
  
  try {
    // Stage 1: Check if distillation is needed
    onProgress?.('Analyzing files...', 10);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const needsDistillation = totalSize > 300_000; // 300KB threshold
    
    if (!needsDistillation) {
      onProgress?.('Files small enough, skipping distillation', 100);
      return {
        success: true,
        runId,
        errors: ['Distillation not needed for small files']
      };
    }
    
    // Stage 2: Distill documents to evidence cards
    onProgress?.('Distilling evidence from documents...', 20);
    const { cards, manifest } = await distillDocuments(
      files,
      agencyCode,
      (msg, pct) => onProgress?.(`Distillation: ${msg}`, 20 + (pct * 0.3))
    );
    
    if (cards.length === 0) {
      throw new Error('No evidence cards generated from documents');
    }
    
    onStageComplete?.('distillation', {
      cardCount: cards.length,
      reductionRatio: manifest.stats.reductionRatio,
      topSignals: manifest.topSignals.slice(0, 5)
    });
    
    // Stage 3: Process procurement metrics from CSV
    onProgress?.('Processing procurement metrics...', 60);
    const procurementMetrics = csvFile 
      ? await processProcurementCSV(csvFile)
      : generateDefaultMetrics();
    
    onStageComplete?.('procurement', procurementMetrics);
    
    // Stage 4: Compose four-call prompts
    onProgress?.('Composing API prompts...', 70);
    const promptSections = await composeFourCallPrompts(
      cards,
      procurementMetrics,
      agencyCode
    );
    
    // Validate prompts
    const validation = validatePromptSections(promptSections);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }
    
    // Extract prompts
    const prompts = {
      briefing: promptSections.find(s => s.type === 'BRIEFING_MD')?.prompt || '',
      plays: promptSections.find(s => s.type === 'PLAYS_MD')?.prompt || '',
      procurement: promptSections.find(s => s.type === 'PROCUREMENT_JSON')?.prompt || '',
      annex: promptSections.find(s => s.type === 'ANNEX_JSON')?.prompt || ''
    };
    
    onStageComplete?.('prompts', {
      sections: promptSections.map(s => ({
        type: s.type,
        charCount: s.charCount,
        withinBudget: s.withinBudget
      }))
    });
    
    // Stage 5: Save artifacts (optional)
    onProgress?.('Saving distillation artifacts...', 90);
    await saveDistillationArtifacts(runId, agencyCode, cards, manifest);
    
    onProgress?.('Distillation pipeline complete!', 100);
    
    return {
      success: validation.valid,
      manifest,
      evidenceCards: cards,
      prompts,
      errors: errors.length > 0 ? errors : undefined,
      runId
    };
    
  } catch (error) {
    console.error('Distillation pipeline error:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      runId
    };
  }
}

/**
 * Process procurement CSV file
 */
async function processProcurementCSV(file: File): Promise<any> {
  // This would normally parse the CSV and extract metrics
  // For now, return a mock structure
  return {
    total_value: 425_000_000,
    active_contracts: 127,
    growth_rate: 12.5,
    top_vendors: [
      { name: 'Vendor A', value: 50_000_000 },
      { name: 'Vendor B', value: 35_000_000 },
      { name: 'Vendor C', value: 28_000_000 }
    ],
    top_naics: ['541512', '541511', '541519'],
    top_psc: ['D307', 'D399', 'H170'],
    vehicle_distribution: {
      'CIO-SP4': 0.35,
      'SEWP': 0.25,
      '8(a)': 0.20,
      'Open': 0.20
    },
    small_business_percentage: 42,
    competition_rate: 78,
    avg_contract_duration_months: 36,
    upcoming_recompetes: 8
  };
}

/**
 * Generate default metrics when no CSV provided
 */
function generateDefaultMetrics(): any {
  return {
    total_value: 0,
    active_contracts: 0,
    growth_rate: 0,
    top_vendors: [],
    top_naics: [],
    top_psc: [],
    vehicle_distribution: {},
    small_business_percentage: 0,
    competition_rate: 0,
    avg_contract_duration_months: 0,
    upcoming_recompetes: 0,
    _note: 'No procurement data provided'
  };
}

/**
 * Save distillation artifacts for debugging/audit
 */
async function saveDistillationArtifacts(
  runId: string,
  agencyCode: string,
  cards: EvidenceCard[],
  manifest: DistillationManifest
): Promise<void> {
  try {
    // Save to localStorage for now (in production, this would go to a proper store)
    const artifacts = {
      runId,
      agencyCode,
      timestamp: new Date().toISOString(),
      cardCount: cards.length,
      manifest,
      // Only save top 10 cards to avoid storage bloat
      sampleCards: cards.slice(0, 10)
    };
    
    const key = `distillation_${runId}`;
    localStorage.setItem(key, JSON.stringify(artifacts));
    
    // Clean up old artifacts (keep last 5)
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('distillation_'));
    if (allKeys.length > 5) {
      const toDelete = allKeys
        .sort()
        .slice(0, allKeys.length - 5);
      toDelete.forEach(k => localStorage.removeItem(k));
    }
  } catch (error) {
    console.warn('Failed to save distillation artifacts:', error);
  }
}

/**
 * Load distillation artifacts
 */
export async function loadDistillationArtifacts(runId: string): Promise<any | null> {
  try {
    const key = `distillation_${runId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load distillation artifacts:', error);
    return null;
  }
}

/**
 * Get distillation statistics for UI display
 */
export function getDistillationStats(manifest: DistillationManifest): {
  inputSizeMB: number;
  outputSizeKB: number;
  reductionRatio: string;
  cardsGenerated: number;
  topSignals: string[];
  processingTime?: number;
} {
  const inputSizeMB = manifest.inputFiles.reduce((sum, f) => sum + f.sizeMB, 0);
  const outputSizeKB = (manifest.stats.finalCardCount * 0.5); // Rough estimate: 0.5KB per card
  const reductionRatio = `${(inputSizeMB * 1024 / outputSizeKB).toFixed(0)}:1`;
  
  return {
    inputSizeMB: parseFloat(inputSizeMB.toFixed(2)),
    outputSizeKB: parseFloat(outputSizeKB.toFixed(2)),
    reductionRatio,
    cardsGenerated: manifest.stats.finalCardCount,
    topSignals: manifest.topSignals.slice(0, 5)
  };
}
