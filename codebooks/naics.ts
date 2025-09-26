// North American Industry Classification System (NAICS) Codebook
// Cyber-relevant NAICS codes for procurement analysis

export const NAICS_CODEBOOK = {
  name: 'NAICS Codes',
  version: '2022',
  last_updated: '2025-01-15',
  source: 'U.S. Census Bureau',
  
  entries: {
    // Computer Systems Design and Related Services
    '541511': {
      code: '541511',
      title: 'Custom Computer Programming Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Computer Systems Design',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.9
    },
    '541512': {
      code: '541512',
      title: 'Computer Systems Design Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Computer Systems Design',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.95
    },
    '541513': {
      code: '541513',
      title: 'Computer Facilities Management Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Computer Systems Design',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    '541519': {
      code: '541519',
      title: 'Other Computer Related Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Computer Systems Design',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    },
    
    // Data Processing and Hosting
    '518210': {
      code: '518210',
      title: 'Data Processing, Hosting, and Related Services',
      category: 'Information',
      subcategory: 'Data Processing',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    },
    
    // Software Publishers
    '511210': {
      code: '511210',
      title: 'Software Publishers',
      category: 'Information',
      subcategory: 'Publishing Industries',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.85
    },
    
    // Telecommunications
    '517110': {
      code: '517110',
      title: 'Wired Telecommunications Carriers',
      category: 'Information',
      subcategory: 'Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    },
    '517210': {
      code: '517210',
      title: 'Wireless Telecommunications Carriers',
      category: 'Information',
      subcategory: 'Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    },
    '517911': {
      code: '517911',
      title: 'Telecommunications Resellers',
      category: 'Information',
      subcategory: 'Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    '517919': {
      code: '517919',
      title: 'All Other Telecommunications',
      category: 'Information',
      subcategory: 'Telecommunications',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    },
    
    // Computer and Electronic Product Manufacturing
    '334111': {
      code: '334111',
      title: 'Electronic Computer Manufacturing',
      category: 'Manufacturing',
      subcategory: 'Computer and Electronic Product',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    '334118': {
      code: '334118',
      title: 'Computer Terminal and Other Computer Peripheral Equipment Manufacturing',
      category: 'Manufacturing',
      subcategory: 'Computer and Electronic Product',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.4
    },
    '334290': {
      code: '334290',
      title: 'Other Communications Equipment Manufacturing',
      category: 'Manufacturing',
      subcategory: 'Computer and Electronic Product',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    
    // Management and Technical Consulting Services
    '541611': {
      code: '541611',
      title: 'Administrative Management and General Management Consulting Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Management Consulting',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.3
    },
    '541612': {
      code: '541612',
      title: 'Human Resources Consulting Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Management Consulting',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.1
    },
    '541614': {
      code: '541614',
      title: 'Process, Physical Distribution, and Logistics Consulting Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Management Consulting',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.2
    },
    '541618': {
      code: '541618',
      title: 'Other Management Consulting Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Management Consulting',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.3
    },
    
    // Scientific and Technical Services
    '541330': {
      code: '541330',
      title: 'Engineering Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Engineering',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.4
    },
    '541690': {
      code: '541690',
      title: 'Other Scientific and Technical Consulting Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Scientific and Technical',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.4
    },
    '541990': {
      code: '541990',
      title: 'All Other Professional, Scientific, and Technical Services',
      category: 'Professional, Scientific, and Technical Services',
      subcategory: 'Other',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.3
    },
    
    // Educational Services
    '611420': {
      code: '611420',
      title: 'Computer Training',
      category: 'Educational Services',
      subcategory: 'Computer Training',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    '611430': {
      code: '611430',
      title: 'Professional and Management Development Training',
      category: 'Educational Services',
      subcategory: 'Professional Training',
      is_cyber_relevant: false,
      cyber_relevance_score: 0.4
    },
    
    // Security Services
    '561611': {
      code: '561611',
      title: 'Investigation Services',
      category: 'Administrative and Support Services',
      subcategory: 'Investigation and Security',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    '561621': {
      code: '561621',
      title: 'Security Systems Services (except Locksmiths)',
      category: 'Administrative and Support Services',
      subcategory: 'Investigation and Security',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    }
  }
};

// Helper functions
export const isCyberRelevantNAICS = (naicsCode: string): boolean => {
  // Handle both 6-digit and partial codes
  const fullCode = naicsCode.padEnd(6, '0');
  const entry = NAICS_CODEBOOK.entries[fullCode];
  return entry?.is_cyber_relevant || false;
};

export const getCyberRelevanceScoreNAICS = (naicsCode: string): number => {
  const fullCode = naicsCode.padEnd(6, '0');
  const entry = NAICS_CODEBOOK.entries[fullCode];
  return entry?.cyber_relevance_score || 0;
};

export const getCyberRelevantNAICS = (): string[] => {
  return Object.keys(NAICS_CODEBOOK.entries).filter(code => 
    NAICS_CODEBOOK.entries[code].is_cyber_relevant
  );
};

// Primary cyber NAICS codes
export const PRIMARY_CYBER_NAICS = [
  '541511', // Custom Computer Programming Services
  '541512', // Computer Systems Design Services
  '541519', // Other Computer Related Services
  '518210', // Data Processing, Hosting
  '511210', // Software Publishers
  '561621'  // Security Systems Services
];

// NAICS categories typically associated with cyber work
export const CYBER_NAICS_CATEGORIES = [
  'Computer Systems Design',
  'Data Processing',
  'Software',
  'Telecommunications',
  'Investigation and Security'
];