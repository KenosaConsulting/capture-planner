// Metadata schemas for self-describing data ingestion
// Based on expert recommendations for semantic metadata

export interface ColumnSpec {
  name: string;
  dtype: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'categorical';
  format?: string;  // e.g., 'YYYY-MM-DD' for dates
  unit?: string;    // e.g., 'USD' for currency
  currency?: string;
  allowed_values?: string[];
  code_list?: string;  // Reference to codebook
  description?: string;
  business_meaning?: string;
  is_required?: boolean;
  cyber_relevance?: boolean;
}

export interface SchemaSpec {
  version: string;
  schema_date: string;
  source_system: 'USASpending' | 'FPDS' | 'SAM' | 'other';
  primary_keys: string[];
  join_keys: string[];
  foreign_keys?: Record<string, string>;
  columns: ColumnSpec[];
  validation_rules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule_type: 'range' | 'regex' | 'enum' | 'not_null' | 'unique' | 'date_range';
  parameters: any;
  error_message: string;
}

export interface FileManifest {
  // Source Information
  source: string;
  source_system: string;
  source_url?: string;
  
  // Extraction Details
  extraction: {
    method: 'download' | 'api' | 'manual' | 'automated';
    timestamp_utc: string;
    filters: {
      awarding_agency?: string;
      date_range?: { start: string; end: string };
      psc?: string[];
      naics?: string[];
      keywords?: string[];
      competition_type?: string[];
      set_aside?: string[];
    };
    query?: string;
    api_endpoint?: string;
  };
  
  // File Profile
  file_profile: {
    filename: string;
    size_bytes: number;
    rows: number;
    columns: number;
    encoding: string;
    delimiter: string;
    quotechar: string;
    null_tokens: string[];
    has_header: boolean;
    checksum?: string;
  };
  
  // Schema & Keys
  schema_version: string;
  primary_keys: string[];
  join_keys: string[];
  
  // Fiscal Window
  fiscal_window: {
    min_action_date: string;
    max_action_date: string;
    fiscal_years: string[];
  };
  
  // Data Quality Metrics
  data_quality: {
    completeness_score: number;
    null_rate: number;
    duplicate_rows: number;
    invalid_dates: number;
    invalid_codes: number;
    outliers_detected: number;
    validation_passed: boolean;
    quality_issues: string[];
  };
  
  // Version Control
  dataset_version: string;
  created_at: string;
  created_by?: string;
}

export interface DataProfile {
  file: string;
  agency: string;
  rows: number;
  columns: number;
  null_rate: number;
  
  // Financial Metrics
  obligation_total_usd: number;
  award_count: number;
  avg_award_size_usd: number;
  median_award_size_usd: number;
  
  // Top Categories
  top_psc: Array<{
    code: string;
    name: string;
    share: number;
    is_cyber?: boolean;
  }>;
  
  top_naics: Array<{
    code: string;
    name: string;
    share: number;
    is_cyber?: boolean;
  }>;
  
  top_vendors: Array<{
    name: string;
    uei?: string;
    amount_usd: number;
    share: number;
    is_small_business?: boolean;
  }>;
  
  top_offices: Array<{
    code: string;
    name: string;
    amount_usd: number;
    share: number;
  }>;
  
  // Competition & Set-Aside Mix
  competition_mix: {
    full_open: number;
    other_than_full_open: number;
    not_competed: number;
    unknown: number;
  };
  
  set_aside_mix: {
    '8a': number;
    sdvosb: number;
    wosb: number;
    hubzone: number;
    small_business: number;
    full_and_open: number;
  };
  
  // Contract Vehicles
  vehicle_mix: Record<string, number>;
  
  // Temporal
  window: {
    start: string;
    end: string;
    fiscal_years: string[];
  };
  
  // Cyber Relevance
  cyber_metrics?: {
    cyber_relevant_spend_usd: number;
    cyber_relevant_percentage: number;
    top_cyber_psc: string[];
    top_cyber_naics: string[];
    cyber_keyword_hits: number;
  };
}

export interface CodebookEntry {
  code: string;
  title: string;
  description?: string;
  category?: string;
  subcategory?: string;
  is_cyber_relevant?: boolean;
  cyber_relevance_score?: number;
  keywords?: string[];
  parent_code?: string;
}

export interface Codebook {
  name: string;
  version: string;
  last_updated: string;
  source: string;
  entries: Record<string, CodebookEntry>;
}

export interface AgencyMapping {
  canonical_name: string;
  aliases: string[];
  awarding_agency_name: string;
  awarding_sub_agency_name?: string;
  funding_agency_name?: string;
  agency_code?: string;
  cgac_code?: string;
}

export interface DerivedFeatures {
  // Core identifiers
  contract_id: string;
  fiscal_year: string;
  
  // Financial
  obligation_usd: number;
  base_and_all_options_value: number;
  
  // Categorizations
  vehicle_type: string;
  competition_category: 'full_open' | 'competed' | 'not_competed' | 'other';
  set_aside_category: string;
  
  // Cyber relevance
  is_cyber: boolean;
  cyber_score: number;
  cyber_indicators: string[];
  
  // Vendor characteristics
  vendor_name: string;
  vendor_uei: string;
  vendor_small_business_flag: boolean;
  vendor_8a_flag: boolean;
  vendor_hubzone_flag: boolean;
  
  // Timing
  award_date: string;
  period_of_performance_start: string;
  period_of_performance_end: string;
  is_recompete_candidate: boolean;
  
  // Office/Location
  awarding_office: string;
  place_of_performance_state: string;
  
  // Account
  treasury_account: string;
  federal_account: string;
}

// Validation report structure
export interface ValidationReport {
  timestamp: string;
  file: string;
  passed: boolean;
  errors: Array<{
    field: string;
    rule: string;
    message: string;
    row_numbers?: number[];
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  stats: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    rows_with_warnings: number;
  };
}

// Configuration for agency normalization
export const CANON_AGENCY_MAP: Record<string, AgencyMapping> = {
  DOC: {
    canonical_name: 'DOC',
    aliases: ['Commerce', 'Dept of Commerce', 'COMMERCE'],
    awarding_agency_name: 'Department of Commerce',
    agency_code: '013'
  },
  USACE: {
    canonical_name: 'USACE',
    aliases: ['Army Corps', 'Corps of Engineers', 'ACOE'],
    awarding_agency_name: 'Department of the Army',
    awarding_sub_agency_name: 'U.S. Army Corps of Engineers',
    agency_code: '021'
  },
  IRS: {
    canonical_name: 'IRS',
    aliases: ['Internal Revenue', 'Revenue Service'],
    awarding_agency_name: 'Department of the Treasury',
    awarding_sub_agency_name: 'Internal Revenue Service',
    agency_code: '020'
  },
  HHS: {
    canonical_name: 'HHS',
    aliases: ['Health and Human Services', 'Health & Human Services'],
    awarding_agency_name: 'Department of Health and Human Services',
    agency_code: '075'
  },
  DOI: {
    canonical_name: 'DOI',
    aliases: ['Interior', 'Dept of Interior', 'INTERIOR'],
    awarding_agency_name: 'Department of the Interior',
    agency_code: '014'
  }
};