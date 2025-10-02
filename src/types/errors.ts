// Error handling types for the GovCon Capture Planner pipeline

export type PipelineStage =
  | 'INPUT_VALIDATION'
  | 'DOC_CLASSIFICATION'
  | 'FACTS_EXTRACTION'
  | 'PROCUREMENT_ANALYSIS'
  | 'FINDINGS_SYNTHESIS'
  | 'COMPOSE_BRIEFING'
  | 'MODEL_CALL'
  | 'PROCUREMENT_METRICS'
  | 'TWO_TIER_DISTILL'
  | 'BASIC_DISTILL'
  | 'PROMPT_COMPOSE'
  | 'API_CALLS'
  | 'ANNEX_PARSED'
  | 'RENDERED'
  | 'BRIEFING_MD'
  | 'PLAYS_MD'
  | 'ANNEX_JSON'
  | 'ORCHESTRATION';

export interface PipelineError {
  stage: PipelineStage;
  code:
    | 'MISSING_FILES'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'MISSING_AGENCY'
    | 'CSV_HEADER_MISMATCH'
    | 'CSV_EMPTY'
    | 'API_KEY_MISSING'
    | 'MODEL_SAFETY_BLOCK'
    | 'MODEL_LENGTH_BLOCK'
    | 'MODEL_RATE_LIMIT'
    | 'MODEL_INVALID_REQUEST'
    | 'MODEL_SERVER_ERROR'
    | 'OUTPUT_PARSE_FAILED'
    | 'OUTPUT_SECTION_MISSING'
    | 'TIMEOUT'
    | 'CALL_FAILED'
    | 'EMPTY_RESPONSE'
    | 'FALLBACK_USED'
    | 'NO_SECTIONS_FOUND'
    | 'OUTPUT_TOO_SHORT'
    | 'EMPTY_ARRAY'
    | 'SUSPICIOUS_VALUE'
    | 'INVALID_PERCENTAGE'
    | 'DATA_INCONSISTENCY';
  message: string;         // short, user-facing
  hint?: string;           // concrete next step
  details?: unknown;       // raw object (finishReason, safety ratings, etc.)
}

export interface DebugInfo {
  runId: string;
  requestPrompt: string;
  modelMeta?: any;
  rawResponse?: string;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: PipelineError[];
  warnings: string[];
}
