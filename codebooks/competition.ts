// Competition Type Codebook
// Maps competition codes to readable labels

export const COMPETITION_CODEBOOK = {
  name: 'Competition Types',
  version: '2025.01',
  last_updated: '2025-01-15',
  source: 'Federal Acquisition Regulation (FAR)',
  
  entries: {
    'A': {
      code: 'A',
      title: 'Full and Open Competition',
      description: 'Full and open competition after exclusion of sources',
      category: 'Competed',
      competition_level: 'full'
    },
    'B': {
      code: 'B',
      title: 'Not Available for Competition',
      description: 'Not available for competition (e.g., sole source, urgency)',
      category: 'Not Competed',
      competition_level: 'none'
    },
    'C': {
      code: 'C',
      title: 'Not Competed',
      description: 'Not competed for other reasons',
      category: 'Not Competed',
      competition_level: 'none'
    },
    'D': {
      code: 'D',
      title: 'Full and Open Competition',
      description: 'Full and open competition',
      category: 'Competed',
      competition_level: 'full'
    },
    'E': {
      code: 'E',
      title: 'Follow-On to Competed Action',
      description: 'Follow-on to competed action',
      category: 'Competed',
      competition_level: 'partial'
    },
    'F': {
      code: 'F',
      title: 'Competed under SAP',
      description: 'Competed under simplified acquisition procedures',
      category: 'Competed',
      competition_level: 'simplified'
    },
    'G': {
      code: 'G',
      title: 'Not Competed under SAP',
      description: 'Not competed under simplified acquisition procedures',
      category: 'Not Competed',
      competition_level: 'none'
    },
    'CDO': {
      code: 'CDO',
      title: 'Competitive Delivery Order',
      description: 'Competitive Delivery Order Fair Opportunity Provided',
      category: 'Competed',
      competition_level: 'full'
    },
    'NDO': {
      code: 'NDO',
      title: 'Non-Competitive Delivery Order',
      description: 'Non-competitive Delivery Order',
      category: 'Not Competed',
      competition_level: 'none'
    }
  }
};

// Set-Aside Type Codebook
export const SET_ASIDE_CODEBOOK = {
  name: 'Set-Aside Types',
  version: '2025.01',
  last_updated: '2025-01-15',
  source: 'Small Business Administration (SBA)',
  
  entries: {
    'NONE': {
      code: 'NONE',
      title: 'No Set-Aside',
      description: 'Full and open competition',
      category: 'Full & Open'
    },
    '8A': {
      code: '8A',
      title: '8(a) Program',
      description: '8(a) Business Development Program',
      category: 'Small Business Set-Aside'
    },
    '8AN': {
      code: '8AN',
      title: '8(a) Sole Source',
      description: '8(a) Sole Source Award',
      category: 'Small Business Set-Aside'
    },
    'SBA': {
      code: 'SBA',
      title: 'Small Business Set-Aside',
      description: 'Small Business Set-Aside (FAR 19.5)',
      category: 'Small Business Set-Aside'
    },
    'SBP': {
      code: 'SBP',
      title: 'Small Business Set-Aside (Partial)',
      description: 'Partial Small Business Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'SDVOSBC': {
      code: 'SDVOSBC',
      title: 'SDVOSB Set-Aside',
      description: 'Service-Disabled Veteran-Owned Small Business Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'SDVOSBS': {
      code: 'SDVOSBS',
      title: 'SDVOSB Sole Source',
      description: 'Service-Disabled Veteran-Owned Small Business Sole Source',
      category: 'Small Business Set-Aside'
    },
    'WOSB': {
      code: 'WOSB',
      title: 'WOSB Set-Aside',
      description: 'Women-Owned Small Business Program Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'EDWOSB': {
      code: 'EDWOSB',
      title: 'EDWOSB Set-Aside',
      description: 'Economically Disadvantaged WOSB Program Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'HZC': {
      code: 'HZC',
      title: 'HUBZone Set-Aside',
      description: 'HUBZone Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'HZS': {
      code: 'HZS',
      title: 'HUBZone Sole Source',
      description: 'HUBZone Sole Source',
      category: 'Small Business Set-Aside'
    },
    'VSA': {
      code: 'VSA',
      title: 'Veteran Set-Aside',
      description: 'Veteran-Owned Small Business Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'VSS': {
      code: 'VSS',
      title: 'Veteran Sole Source',
      description: 'Veteran-Owned Small Business Sole Source',
      category: 'Small Business Set-Aside'
    },
    'ISB': {
      code: 'ISB',
      title: 'Indian Small Business',
      description: 'Buy Indian Set-Aside',
      category: 'Small Business Set-Aside'
    },
    'ISBEE': {
      code: 'ISBEE',
      title: 'Indian Small Business Economic Enterprise',
      description: 'Buy Indian Set-Aside for Indian Small Business Economic Enterprises',
      category: 'Small Business Set-Aside'
    }
  }
};

// IT Category Codebook
export const IT_CATEGORY_CODEBOOK = {
  name: 'IT Commercial Item Categories',
  version: '2025.01',
  last_updated: '2025-01-15',
  source: 'GSA Federal Supply Schedule',
  
  entries: {
    '70': {
      code: '70',
      title: 'General Purpose IT Equipment',
      description: 'General purpose commercial information technology equipment',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.5
    },
    '70II': {
      code: '70II',
      title: 'IT Services',
      description: 'Information technology services',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.8
    },
    '70III': {
      code: '70III',
      title: 'IT Software',
      description: 'Commercial software',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.7
    },
    '70IV': {
      code: '70IV',
      title: 'IT Security',
      description: 'Information technology security products and services',
      is_cyber_relevant: true,
      cyber_relevance_score: 1.0
    },
    '70V': {
      code: '70V',
      title: 'IT Telecommunications',
      description: 'Telecommunications equipment and services',
      is_cyber_relevant: true,
      cyber_relevance_score: 0.6
    }
  }
};

// Helper functions for all codebooks
export const getCompetitionLabel = (code: string): string => {
  return COMPETITION_CODEBOOK.entries[code]?.title || 'Unknown';
};

export const getSetAsideLabel = (code: string): string => {
  return SET_ASIDE_CODEBOOK.entries[code]?.title || code;
};

export const getITCategoryLabel = (code: string): string => {
  return IT_CATEGORY_CODEBOOK.entries[code]?.title || code;
};

export const isSmallBusinessSetAside = (code: string): boolean => {
  const entry = SET_ASIDE_CODEBOOK.entries[code];
  return entry?.category === 'Small Business Set-Aside';
};

export const isFullAndOpenCompetition = (code: string): boolean => {
  const entry = COMPETITION_CODEBOOK.entries[code];
  return entry?.competition_level === 'full';
};