// Error handling types for the GovCon Capture Planner pipeline

export type PipelineStage =
  | 'INPUT_VALIDATION'
  | 'DOC_CLASSIFICATION'
  | 'FACTS_EXTRACTION'
  | 'PROCUREMENT_ANALYSIS'
  | 'FINDINGS_SYNTHESIS'
  | 'COMPOSE_BRIEFING'
  | 'MODEL_CALL'
  | 'BRIEFING_MD'
  | 'PLAYS_MD'
  | 'PROCUREMENT_JSON'
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
    | 'CALL_FAILED'
    | 'TIMEOUT'
    | 'EMPTY_RESPONSE'
    | 'OUTPUT_TOO_SHORT'
    | 'EMPTY_ARRAY'
    | 'SUSPICIOUS_VALUE'
    | 'INVALID_PERCENTAGE'
    | 'DATA_INCONSISTENCY'
    | 'FALLBACK_USED'
    | 'NO_SECTIONS_FOUND';
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
