// Evidence Card Types and Interfaces - Updated with Expert's Fixes
// Two-tier evidence system with multi-theme support

export type CardRole = 'claim' | 'metric' | 'context' | 'evidence' | 'counterpoint';

export interface EvidenceCard {
  // Identity
  id: string;                    // stable id (docId:page:offset)
  hash: string;                  // 5-gram content hash for deduplication
  created_at: string;            // ISO timestamp
  
  // Targeting
  agency: string;                // User-selected agency or 'GENERAL'
  bureau?: string;               // Matched sub-organization
  
  // Content - THE KEY PART
  quote: string;                 // ≤220 chars, verbatim extract
  claim: string;                 // 1-sentence summary/paraphrase
  
  // Classification
  csf?: {                        // NIST CSF 2.0 mapping
    fn: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
    category?: string;
    subcategory?: string;
  };
  class: 'mandate' | 'priority' | 'gap' | 'trend';
  role?: CardRole;               // claim|metric|context|evidence|counterpoint
  theme?: string;                // Primary theme for display
  themes?: string[];             // NEW: Multiple themes per card (up to 2)
  confidence?: 'high' | 'medium' | 'low';  // confidence level
  novelty?: number;              // 0-1, uniqueness score
  
  // Scoring (determines inclusion)
  specificity_1_3: 1 | 2 | 3;
  compliance_1_3: 1 | 2 | 3;
  budget_1_3: 0 | 1 | 2 | 3;
  total_score: number;
  
  // Metadata
  source_doc: string;
  source_type?: 'OIG' | 'GAO' | 'NIST' | 'OMB' | 'other';
  page?: number;
  section_hint?: string;         // heading if available
  date?: string;                 // document date if known
  timeframe?: 'near' | 'mid' | 'long';
  
  // Lineage for auditability
  span_start?: number;           // byte offset in original
  span_end?: number;             // byte offset in original
}

// Required themes for coverage - from Expert's dictionaries
export const MANDATORY_THEMES = [
  'Zero Trust',
  'CDM',
  'Identity/ICAM',
  'Cloud/FedRAMP',
  'IR/SOC',
  'SBOM/SCRM',
  'Governance/Compliance',
  'Budget/Vehicles/Small-biz'
] as const;

export type MandatoryTheme = typeof MANDATORY_THEMES[number];

export interface DistillationManifest {
  runId: string;
  selectedAgency: string;
  timestamp: string;
  inputFiles: {
    name: string;
    sizeMB: number;
  }[];
  outputFile: string;
  stats: {
    chunksProcessed: number;
    chunksKept: number;
    chunksDropped: number;
    cardsGenerated: number;
    cardsDeduplicated: number;
    finalCardCount: number;
    reductionRatio: number;
    // Two-tier stats
    highSignalCount?: number;
    contextCount?: number;
    themesCovered?: string[];
    dedupByTheme?: { [theme: string]: number };
  };
  topSignals: string[];
  configVersion: string;
  errors?: string[];
}

export interface ChunkInfo {
  text: string;
  docId: string;
  page?: number;
  heading?: string;
  offset: number;
  length: number;
}

// Context cards are shorter summaries for background
export interface ContextCard {
  id: string;
  theme: string;
  summary: string;      // ≤100 chars
  source_doc: string;
  page?: number;
  confidence: 'high' | 'medium' | 'low';
}

// Two-tier evidence packs
export interface TieredEvidence {
  highSignal: EvidenceCard[];    // ~40±8 for citations
  context: ContextCard[];         // ~60±20 for background
  themes: Map<string, number>;   // theme -> card count
}

export interface DistillationConfig {
  agency: string;
  maxCards: number;
  minPerCSF: number;
  maxPerDoc: number;
  // Two-tier configuration
  highSignalTarget?: number;      // Target ~40
  contextTarget?: number;         // Target ~60
  minPerTheme?: number;          // Minimum cards per theme
  signals: {
    priority_high: string[];
    priority_med: string[];
  };
  mandates: string[];
  bureaus: string[];
  scoringWeights: {
    specificity: number;
    compliance: number;
    budget: number;
  };
}
