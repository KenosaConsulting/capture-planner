// Schema definitions for the capture planner pipeline
// Based on expert recommendations for structured data flow

export interface StrategicFacts {
  agency: string;
  frameworks: string[];
  facts: Array<{
    csf_function: 'GOVERN' | 'IDENTIFY' | 'PROTECT' | 'DETECT' | 'RESPOND' | 'RECOVER';
    category: string;
    subcategory: string;
    statement: string;
    deadline: string | null;
    owner_office: string | null;
    evidence_doc: string;
    page: number;
  }>;
  gaps: Array<{
    statement: string;
    impact: string;
    evidence_doc: string;
    page: number;
  }>;
}

export interface ProcurementMetrics {
  agency: string;
  window: string[];
  totals: {
    award_count: number;
    obligations_usd: number;
    cagr_3yr_pct: number;
  };
  distribution: {
    median_award_usd: number;
    p75_award_usd: number;
  };
  top_naics: Array<{
    code: string;
    share_pct: number;
  }>;
  top_psc: Array<{
    code: string;
    share_pct: number;
  }>;
  vehicles: Array<{
    name: string;
    share_pct: number;
  }>;
  set_asides: Array<{
    type: string;
    share_pct: number;
  }>;
  vendor_concentration: {
    hhi: number;
    top5_share_pct: number;
  };
  timing: {
    qtr_peaks: string[];
    recompete_flags: Array<{
      program: string;
      eta: string;
    }>;
  };
  missing_fields: string[];
}

export interface Finding {
  finding: string;
  why_it_matters: string;
  evidence_refs: string[];
}

export interface Play {
  name: string;
  offer: string;
  proof_point: string;
  assets: string[];
  vehicle_pathways: string[];
  first_meeting_demo: string[];
  success_metric: string;
}

export interface ExecutiveBrief {
  executive_summary: string;
  current_posture: string[];
  strategy_outlook: string[];
  zero_trust_maturity: {
    score_1_to_5: number;
    rationale: string;
  };
  plays: Play[];
  procurement_snapshot: ProcurementMetrics;
  contacts_and_path_to_contract: string[];
  risks_and_mitigations: string[];
  next_30_days: string[];
}

export interface SignalRecord {
  record_id: string;
  agency: string;
  subagency_bureau?: string;
  program_office?: string;
  fiscal_year_reference?: string;
  source_title: string;
  source_type: 'strategy' | 'budget' | 'GAO' | 'TIGTA' | 'memo' | 'brief' | 'other';
  source_date?: string;
  source_location: string;
  source_url?: string;
  category: 'Strategic Priorities' | 'Compliance & Frameworks' | 'Capabilities & Operations' | 'Funding & Procurement Signals' | 'Emerging Trends';
  extracted_mention: string;
  contextual_summary: string;
  naics_candidates?: string;
  psc_candidates?: string;
  vehicle_candidates?: string;
  contract_type_signals?: string;
  keywords_normalized: string;
  control_families_800_53?: string;
  cmmc_domains?: string;
  fedramp_impact_level?: string;
  zero_trust_pillars?: string;
  capability_archetype?: string;
  supply_chain_security_flag: boolean;
  ai_security_flag: boolean;
  quantum_resistance_flag: boolean;
  specificity_score: number;
  scope_score: number;
  budget_signal_score: number;
  compliance_pressure_score: number;
  timing_score: number;
  overall_priority_score: number;
  recommendation: 'Bid' | 'Shape' | 'Monitor';
  immediate_actions: string;
  intel_gaps: string;
  outreach_targets: string;
  notes?: string;
}

export interface PipelineState {
  agency: string;
  rawFiles: Array<{
    name: string;
    content: string;
    type: 'strategy' | 'csv' | 'capability' | 'other';
  }>;
  strategicFacts?: StrategicFacts;
  procurementMetrics?: ProcurementMetrics;
  findings?: Finding[];
  executiveBrief?: ExecutiveBrief;
  signals?: SignalRecord[];
  errors: string[];
}
