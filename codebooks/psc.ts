// Product Service Code (PSC) Codebook
// Cyber-relevant PSCs are flagged for automatic detection

export const PSC_CODEBOOK = {
  name: 'Product Service Codes',
  version: '2025.01',
  last_updated: '2025-01-15',
  source: 'Federal Procurement Data System (FPDS)',
  
  // Top cyber-relevant PSCs
  entries: {
    // IT and Telecommunications - Software
    'D301': {
      code: 'D301',
      title: 'IT Facility Operation and Maintenance',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.9
    },
    'D302': {
      code: 'D302',
      title: 'IT Systems Development Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.95
    },
    'D307': {
      code: 'D307',
      title: 'IT Strategy and Architecture',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.9
    },
    'D308': {
      code: 'D308',
      title: 'Programming Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    },
    'D310': {
      code: 'D310',
      title: 'IT Cybersecurity and Data Backup Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 1.0
    },
    'D316': {
      code: 'D316',
      title: 'IT Network Management Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.85
    },
    'D317': {
      code: 'D317',
      title: 'IT Help Desk Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    },
    'D318': {
      code: 'D318',
      title: 'Integrated Hardware/Software/Services Solutions',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    },
    'D399': {
      code: 'D399',
      title: 'Other IT and Telecommunications Services',
      category: 'IT and Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    
    // Professional Services - Often cyber-related
    'R408': {
      code: 'R408',
      title: 'Program Management/Support Services',
      category: 'Professional Services',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.3
    },
    'R425': {
      code: 'R425',
      title: 'Engineering and Technical Services',
      category: 'Professional Services',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.4
    },
    'R497': {
      code: 'R497',
      title: 'Personal Services Contracts',
      category: 'Professional Services',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.2
    },
    'R499': {
      code: 'R499',
      title: 'Other Professional Services',
      category: 'Professional Services',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.3
    },
    
    // Hardware/Equipment - Cyber infrastructure
    '7010': {
      code: '7010',
      title: 'ADPE System Configuration',
      category: 'IT Hardware',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    '7021': {
      code: '7021',
      title: 'ADP Central Processing Unit, Digital',
      category: 'IT Hardware',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    },
    '7025': {
      code: '7025',
      title: 'ADP Input/Output and Storage Devices',
      category: 'IT Hardware',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    '7030': {
      code: '7030',
      title: 'ADP Software',
      category: 'IT Hardware',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.9
    },
    '7035': {
      code: '7035',
      title: 'ADP Support Equipment and Data Processing Supplies',
      category: 'IT Hardware',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    '5810': {
      code: '5810',
      title: 'Communications Security Equipment and Components',
      category: 'Communications',
      is_cyber_relevant: true,
      cyber_relevance_score: 1.0
    },
    
    // Support Services
    'H170': {
      code: 'H170',
      title: 'IT and Telecom - Cyber Security and Data Backup',
      category: 'Support Services',
      is_cyber_relevant: true,
      cyber_relevance_score: 1.0
    },
    'H119': {
      code: 'H119',
      title: 'Other IT and Telecommunications',
      category: 'Support Services',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    
    // Training
    'U009': {
      code: 'U009',
      title: 'Education/Training - General Science/Technology',
      category: 'Training',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.4
    },
    'U010': {
      code: 'U010',
      title: 'Education/Training - Certifications and Accreditations',
      category: 'Training',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.5
    }
  }
};

// Helper function to check if a PSC is cyber-relevant
export const isCyberRelevantPSC = (pscCode: string): boolean => {
  const entry = PSC_CODEBOOK.entries[pscCode];
  return entry?.is_cyber_relevant || false;
};

// Get cyber relevance score for a PSC
export const getCyberRelevanceScore = (pscCode: string): number => {
  const entry = PSC_CODEBOOK.entries[pscCode];
  return entry?.cyber_relevance_score || 0;
};

// Get all cyber-relevant PSCs
export const getCyberRelevantPSCs = (): string[] => {
  return Object.keys(PSC_CODEBOOK.entries).filter(code => 
    PSC_CODEBOOK.entries[code].is_cyber_relevant
  );
};

// PSC categories that typically contain cyber work
export const CYBER_PSC_CATEGORIES = [
  'IT and Telecommunications',
  'IT Hardware',
  'Communications',
  'Support Services'
];

// Keywords that indicate cyber relevance in PSC descriptions
export const CYBER_KEYWORDS_IN_PSC = [
  'cyber',
  'security',
  'information assurance',
  'network defense',
  'encryption',
  'firewall',
  'intrusion',
  'vulnerability',
  'threat',
  'authentication',
  'access control',
  'incident response',
  'forensics',
  'malware',
  'penetration testing',
  'siem',
  'soc',
  'zero trust'
];