// RunLedger type for tracking pipeline execution stages
export type StageFlag =
  | 'input_validation'
  | 'two_tier_distill'
  | 'basic_distill'
  | 'structured_facts'
  | 'procurement_metrics'
  | 'prompt_compose'
  | 'api_calls'
  | 'annex_parsed'
  | 'rendered';

export interface StageStatus {
  started: boolean;
  done: boolean;
  degraded?: boolean;
  error?: string;
}

export interface RunLedger {
  runId: string;
  agency: string;
  stages: Record<StageFlag, StageStatus>;
  coverage?: {
    covered: string[];
    missing: string[];
    weak: string[];
  };
  procurement?: {
    ok: boolean;
    metrics?: any;
    error?: string;
  };
  quality?: {
    overall: 'PASSED' | 'DEGRADED';
    reason?: string;
    citationCoverage?: number;
  };
  callsExecuted: string[];
  fallback?: {
    stage: string;
    reason: string;
    highSignal?: number;
  };
  runPacks?: any;
  cards?: any[];
}
