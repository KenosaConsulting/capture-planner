// Configuration Loader - Loads and parses configs
// Note: YAML parsing removed to avoid dependency. Configs are now inline.
import { DistillationConfig } from '../../types/distillation';

// Cache for loaded configs
const configCache = new Map<string, any>();

/**
 * Load agency configuration from YAML file
 */
export async function loadAgencyConfig(agencyCode: string): Promise<DistillationConfig> {
  const cacheKey = `agency_${agencyCode}`;
  
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }

  try {
    // In a real implementation, this would read from file system
    // For now, we'll use the configuration inline
    const configs: { [key: string]: DistillationConfig } = {
      'DOC': {
        agency: 'DOC',
        maxCards: 80,  // Increased from 24 per expert recommendation
        minPerCSF: 3,   // Increased for better coverage
        maxPerDoc: 20,  // Increased from 12 for richer context
        minPerTheme: 2, // New: ensure theme coverage
        signals: {
          priority_high: ['ECDM', 'TLS 1.3', 'HPC Security', 'Enterprise Cybersecurity', 'Zero Trust Architecture'],
          priority_med: ['supply chain', 'DevSecOps', 'cloud migration', 'post-quantum cryptography', 'PQC']
        },
        mandates: ['OIG-25-006-A', 'GAO-24-106137', 'OMB M-', 'FISMA', 'FedRAMP'],
        bureaus: ['NIST', 'USPTO', 'NOAA', 'Census', 'ITA', 'BIS', 'EDA'],
        scoringWeights: {
          specificity: 0.4,
          compliance: 0.35,
          budget: 0.25
        }
      },
      'IRS': {
        agency: 'IRS',
        maxCards: 80,
        minPerCSF: 3,
        maxPerDoc: 20,
        minPerTheme: 2,
        signals: {
          priority_high: ['tax processing', 'identity verification', 'fraud detection', 'return integrity', 'FISMA POA&M'],
          priority_med: ['taxpayer data protection', 'e-authentication', 'Get Transcript', 'payment systems']
        },
        mandates: ['TIGTA', 'GAO', 'OMB M-', 'FISMA', 'Section 508'],
        bureaus: ['Criminal Investigation', 'Large Business and International', 'Small Business/Self-Employed'],
        scoringWeights: {
          specificity: 0.35,
          compliance: 0.4,
          budget: 0.25
        }
      },
      'HHS': {
        agency: 'HHS',
        maxCards: 80,
        minPerCSF: 3,
        maxPerDoc: 20,
        minPerTheme: 2,
        signals: {
          priority_high: ['HIPAA', 'EHR', 'PHI', 'patient data', 'healthcare.gov', 'medical device security'],
          priority_med: ['telehealth', 'drug supply chain', 'clinical trials', 'public health data']
        },
        mandates: ['HIPAA', 'HITECH', 'GAO', 'OIG', 'OMB M-'],
        bureaus: ['CMS', 'NIH', 'CDC', 'FDA', 'HRSA', 'SAMHSA', 'IHS'],
        scoringWeights: {
          specificity: 0.35,
          compliance: 0.45,
          budget: 0.2
        }
      },
      'DOI': {
        agency: 'DOI',
        maxCards: 60,
        minPerCSF: 2,
        maxPerDoc: 12,
        signals: {
          priority_high: ['land management systems', 'wildfire', 'resource protection', 'geospatial data', 'critical minerals'],
          priority_med: ['park visitor systems', 'wildlife tracking', 'water resources', 'tribal systems', 'energy management']
        },
        mandates: ['GAO', 'OIG', 'OMB M-', 'FISMA', 'FITARA'],
        bureaus: ['NPS', 'USGS', 'BLM', 'FWS', 'BOR', 'BOEM', 'BIA'],
        scoringWeights: {
          specificity: 0.35,
          compliance: 0.35,
          budget: 0.3
        }
      },
      'USACE': {
        agency: 'USACE',
        maxCards: 60,
        minPerCSF: 2,
        maxPerDoc: 12,
        signals: {
          priority_high: ['SCADA', 'OT security', 'critical infrastructure', 'water resources', 'dam safety', 'CIP'],
          priority_med: ['navigation systems', 'flood control', 'hydropower', 'environmental restoration', 'military construction']
        },
        mandates: ['GAO', 'DODIG', 'OMB M-', 'FISMA', 'Critical Infrastructure Protection'],
        bureaus: ['Civil Works', 'Military Programs', 'Research and Development', 'Real Estate', 'Contracting'],
        scoringWeights: {
          specificity: 0.4,
          compliance: 0.3,
          budget: 0.3
        }
      }
    };

    const config = configs[agencyCode];
    if (!config) {
      console.warn(`No configuration found for agency ${agencyCode}, using default`);
      return configs['DOC']; // Default fallback
    }

    configCache.set(cacheKey, config);
    return config;
    
  } catch (error) {
    console.error(`Error loading config for agency ${agencyCode}:`, error);
    throw error;
  }
}

/**
 * Load universal signals configuration
 */
export async function loadUniversalSignals(): Promise<string[]> {
  const cacheKey = 'universal_signals';
  
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }

  const signals = [
    // Zero Trust & Identity
    'Zero Trust', 'zero trust architecture', 'ZTA', 'ICAM', 'identity management', 'privileged access', 'PAM',
    
    // Cloud & DevSecOps
    'DevSecOps', 'CI/CD', 'cloud security', 'cloud migration', 'FedRAMP', 'IaaS', 'PaaS', 'SaaS',
    
    // Security Operations
    'SOC', 'Security Operations Center', 'SIEM', 'incident response', 'threat hunting', 'continuous monitoring', 'CDM', 'ECDM',
    
    // Compliance
    'FISMA', 'NIST 800-53', 'NIST CSF', 'RMF', 'ATO', 'POA&M',
    
    // Emerging Tech
    'artificial intelligence', 'AI security', 'machine learning', 'quantum', 'post-quantum cryptography', 'PQC',
    
    // Network
    'TLS 1.3', 'encryption', 'PKI', 'network segmentation', 'microsegmentation',
    
    // Supply Chain
    'supply chain', 'SBOM', 'software bill of materials', 'third-party risk', 'vendor risk',
    
    // Data Protection
    'data loss prevention', 'DLP', 'data classification', 'data governance', 'privacy',
    
    // Vulnerability Management
    'vulnerability', 'patch management', 'penetration testing', 'security assessment', 'STIG',
    
    // Logging
    'logging', 'log management', 'visibility', 'monitoring', 'audit trail'
  ];

  configCache.set(cacheKey, signals);
  return signals;
}

/**
 * Load filter patterns
 */
export async function loadFilterPatterns(): Promise<{ skip: string[], always_keep: string[] }> {
  return {
    skip: [
      'table of contents',
      'acknowledgments',
      'acknowledgements', 
      'preface',
      'foreword',
      'glossary',
      'appendix',
      'appendices',
      'references',
      'bibliography',
      'index',
      'list of figures',
      'list of tables',
      'about the authors',
      'copyright'
    ],
    always_keep: [
      'SHALL',
      'MUST', 
      'REQUIRED',
      'OMB M-',
      'Executive Order',
      'million',
      'billion',
      'contract value',
      'obligation'
    ]
  };
}

/**
 * Load budget configuration - FIXED per Expert's recommendations
 */
export async function loadBudgetConfig(): Promise<{ [key: string]: { maxPromptChars: number, maxEvidenceCards: number } }> {
  return {
    'BRIEFING_MD': {
      maxPromptChars: 16000,  // Expert: 12-16k chars target
      maxEvidenceCards: 40     // Expert: High-signal only
    },
    'PLAYS_MD': {
      maxPromptChars: 8000,    // Expert: 5-8k chars target (was causing 639 char issue)
      maxEvidenceCards: 25     // Expert: Mix of high-signal + context
    },
    'PROCUREMENT_JSON': {
      maxPromptChars: 800,     // Expert: Keep lean, metrics echo
      maxEvidenceCards: 0      // No evidence cards for procurement
    },
    'ANNEX_JSON': {
      maxPromptChars: 10000,   // Expert: 8-10k chars target
      maxEvidenceCards: 40     // Expert: High-signal only for traceability
    }
  };
}
