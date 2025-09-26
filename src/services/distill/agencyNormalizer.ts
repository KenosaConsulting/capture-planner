// Agency Normalization - Expert's Fix A
// Normalizes user input to canonical agency keys

/**
 * Agency alias map from expert
 */
const AGENCY_ALIASES: { [key: string]: string[] } = {
  'DOC': [
    'DOC', 
    'DEPT OF COMMERCE', 
    'DEPARTMENT OF COMMERCE', 
    'U.S. DEPARTMENT OF COMMERCE',
    'COMMERCE',
    'DEPT COMMERCE'
  ],
  'USACE': [
    'USACE', 
    'ARMY CORPS', 
    'U.S. ARMY CORPS OF ENGINEERS', 
    'CORPS OF ENGINEERS',
    'ACE',
    'ARMY CORPS OF ENGINEERS'
  ],
  'IRS': [
    'IRS', 
    'INTERNAL REVENUE SERVICE', 
    'TREASURY IRS',
    'REVENUE SERVICE'
  ],
  'HHS': [
    'HHS', 
    'HEALTH AND HUMAN SERVICES', 
    'DEPARTMENT OF HEALTH AND HUMAN SERVICES',
    'HEALTH HUMAN SERVICES',
    'DHHS'
  ],
  'DOI': [
    'DOI', 
    'INTERIOR', 
    'DEPARTMENT OF THE INTERIOR', 
    'U.S. DOI',
    'DEPT OF INTERIOR',
    'DEPARTMENT OF INTERIOR'
  ]
};

/**
 * Normalize agency input to canonical key
 * Steps: trim → collapse whitespace → uppercase → alias map
 */
export function normalizeAgencyCode(input: string | undefined): string {
  // Handle undefined/null/empty
  if (!input || input.trim() === '') {
    console.warn('Agency input is empty, defaulting to DOC');
    return 'DOC';
  }

  // Step 1: Trim and collapse whitespace
  let normalized = input.trim().replace(/\s+/g, ' ');
  
  // Step 2: Replace common punctuation with spaces
  normalized = normalized.replace(/[.,\-_]/g, ' ').replace(/\s+/g, ' ');
  
  // Step 3: Convert to uppercase
  normalized = normalized.toUpperCase();
  
  // Step 4: Apply alias map - look for longest match first
  for (const [agencyKey, aliases] of Object.entries(AGENCY_ALIASES)) {
    // Sort aliases by length (longest first) to match most specific
    const sortedAliases = aliases.sort((a, b) => b.length - a.length);
    
    for (const alias of sortedAliases) {
      if (normalized === alias || normalized.includes(alias)) {
        console.log(`AGENCY_RESOLVE: "${input}" → ${agencyKey} (${getAgencyFullName(agencyKey)})`);
        return agencyKey;
      }
    }
  }
  
  // If no match found, check if it's already a valid key
  if (Object.keys(AGENCY_ALIASES).includes(normalized)) {
    console.log(`AGENCY_RESOLVE: "${input}" → ${normalized} (already normalized)`);
    return normalized;
  }
  
  // Default fallback
  console.warn(`No agency match for "${input}", defaulting to DOC`);
  return 'DOC';
}

/**
 * Get full agency name for display
 */
export function getAgencyFullName(agencyKey: string): string {
  const names: { [key: string]: string } = {
    'DOC': 'Department of Commerce',
    'USACE': 'U.S. Army Corps of Engineers',
    'IRS': 'Internal Revenue Service',
    'HHS': 'Department of Health and Human Services',
    'DOI': 'Department of the Interior'
  };
  
  return names[agencyKey] || agencyKey;
}
