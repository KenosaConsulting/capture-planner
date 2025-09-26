// Enhanced Deterministic Theme Tagger - Flexible Matching & Soft Fallbacks
// Replaces strict thresholding with partial matches and heuristics to improve coverage.

import { EvidenceCard } from '../../types/distillation';

// Expert's theme dictionaries with scoring rules
export interface ThemeDictionary {
  id: string;
  name: string;
  acronyms: string[];
  includeKeywords: string[];
  anchors: string[];
  synonyms: string[];
  excludeKeywords: string[];
  partialMatches?: string[];
}

/**
 * Theme dictionaries with partial match support
 */
export const THEME_DICTIONARIES: ThemeDictionary[] = [
  {
    id: 'zero-trust',
    name: 'Zero Trust',
    acronyms: ['ZTA', 'ZTNA', 'E3B'],
    includeKeywords: [
      'zero trust',
      'zero-trust architecture',
      'never trust always verify',
      'micro-segmentation',
      'implicit deny',
      'perimeter-less',
      'identity-centric'
    ],
    anchors: ['NIST SP 800-207', 'OMB M-22-09', 'OMB M-24-04'],
    synonyms: [
      'perimeter-less security',
      'identity-centric access',
      'continuous verification',
      'least privilege'
    ],
    partialMatches: ['trust','verify','identity','segment','access control'],
    excludeKeywords: ['trust relationship', 'trusted partner', 'zero tolerance']
  },
  {
    id: 'cdm',
    name: 'CDM',
    acronyms: ['CDM', 'ECDM'],
    includeKeywords: [
      'continuous diagnostics and mitigation',
      'cdm dashboard',
      'asset management',
      'hwam',
      'swam',
      'vulnerability management',
      'event management',
      'ism',
      'continuous monitoring'
    ],
    anchors: ['CISA CDM', 'FCEB dashboard', 'Agency-Wide Adaptive Risk Enumeration'],
    synonyms: ['continuous monitoring', 'diagnostics program', 'real-time monitoring'],
    partialMatches: ['diagnostic','monitor','vulnerability','asset','dashboard','real-time'],
    excludeKeywords: ['continuous improvement', 'diagnostics lab']
  },
  {
    id: 'identity-icam',
    name: 'Identity/ICAM',
    acronyms: ['ICAM', 'PIV', 'PKI', 'MFA', 'SSO', 'FIDO2', 'IdAM', 'PAM', 'CAC', 'RBAC'],
    includeKeywords: [
      'identity credential and access management',
      'privileged access management',
      'role-based access control',
      'phishing-resistant authentication',
      'hspd-12',
      'multi-factor authentication',
      'single sign-on',
      'credential management',
      'identity governance'
    ],
    anchors: ['OMB M-19-17', 'NIST SP 800-63', 'EO 14028'],
    synonyms: [
      'identity governance',
      'authentication',
      'authorization',
      'identity verification'
    ],
    partialMatches: ['credential','authentication','authorization','identity','access','privilege'],
    excludeKeywords: ['database identity column', 'brand identity']
  },
  {
    id: 'cloud-fedramp',
    name: 'Cloud/FedRAMP',
    acronyms: ['ATO', 'IL2', 'IL4', 'IL5', 'SaaS', 'PaaS', 'IaaS', 'CSP', 'CSPM', 'CWP'],
    includeKeywords: [
      'fedramp authorized',
      'fedramp',
      'authority to operate',
      'ato package',
      'cloud migration',
      'govcloud',
      'multi-cloud',
      'container security',
      'kubernetes',
      'cloud service provider',
      'cloud posture',
      'aws',
      'azure',
      'gcp',
      'hybrid cloud'
    ],
    anchors: ['FedRAMP Moderate', 'FedRAMP High', 'NIST SP 800-53'],
    synonyms: ['cloud posture management', 'cloud workload protection', 'cloud security'],
    partialMatches: ['cloud','aws','azure','kubernetes','container','migration','hybrid'],
    excludeKeywords: ['cloudy']
  },
  {
    id: 'ir-soc',
    name: 'IR/SOC',
    acronyms: ['IR', 'SOC', 'SIEM', 'SOAR', 'MITRE ATT&CK', 'NDR', 'EDR', 'XDR', 'CSIRT'],
    includeKeywords: [
      'incident response playbook',
      'incident response',
      'soc operations',
      'security operations center',
      'threat hunting',
      'log aggregation',
      'endpoint detection',
      'tabletop exercise',
      'forensics',
      'breach response',
      'security event',
      'threat intelligence'
    ],
    anchors: ['CISA playbooks', 'FCD 1', 'FCD 2'],
    synonyms: [
      'security operations',
      'major incident',
      'cyber event handling',
      'incident management',
      'threat detection'
    ],
    partialMatches: ['incident','threat','breach','detection','response','forensic','siem','soar','xdr'],
    excludeKeywords: ['social', 'HR incident']
  },
  {
    id: 'sbom-scrm',
    name: 'SBOM/SCRM',
    acronyms: ['SBOM', 'SCRM', 'CSCRM', 'SCA'],
    includeKeywords: [
      'software bill of materials',
      'supply chain risk management',
      'third-party risk',
      'software composition analysis',
      'secure by design',
      'vendor risk',
      'dependency vulnerability',
      'component inventory',
      'supply chain security',
      'vendor assessment'
    ],
    anchors: ['EO 14028', 'NIST SP 800-161', 'CISA SBOM', 'NTIA SBOM'],
    synonyms: [
      'component inventory',
      'dependency vulnerability',
      'bill of materials',
      'third party risk',
      'vendor management'
    ],
    partialMatches: ['supply chain','vendor','third party','dependency','component','software'],
    excludeKeywords: ['manufacturing BOM']
  },
  {
    id: 'governance-compliance',
    name: 'Governance/Compliance',
    acronyms: ['FISMA', 'RMF', 'ATO', 'POA&M', 'CMMC', 'HIPAA', 'HITECH', 'CJIS', 'NIST'],
    includeKeywords: [
      'risk management framework',
      'control assessment',
      'policy governance',
      'continuous authorization',
      'plan of actions and milestones',
      'audit finding',
      'compliance posture',
      'control baselines',
      'security controls',
      'governance framework',
      'regulatory compliance'
    ],
    anchors: [
      'NIST SP 800-53',
      'NIST SP 800-37',
      'NIST SP 800-171',
      'OMB A-130',
      'DFARS 252.204-7012',
      'NIST CSF'
    ],
    synonyms: ['cyber governance', 'compliance management', 'risk framework', 'audit compliance'],
    partialMatches: ['compliance','audit','risk','control','policy','governance','regulation','framework','nist','assessment','authorization'],
    excludeKeywords: ['corporate governance']
  },
  {
    id: 'budget-vehicles-smallbiz',
    name: 'Budget/Vehicles/Small-biz',
    acronyms: ['SEWP','CIO-SP','OASIS+','BPA','IDIQ','8(a)','ISBEE','HUBZone','WOSB','SDVOSB','GWAC'],
    includeKeywords: [
      'obligation',
      'appropriation',
      'plus-up',
      'spend plan',
      'vehicle on-ramp',
      'idiq ceiling',
      'set-aside',
      'past performance',
      'contract value',
      'contract award',
      'procurement',
      'acquisition',
      'small business',
      'supplier diversity',
      'vendor',
      'fy20'
    ],
    anchors: ['OMB passback', 'exhibit 53', 'exhibit 300', 'OSDBU', 'APEX'],
    synonyms: ['contract vehicle', 'small business utilization', 'procurement strategy'],
    partialMatches: ['budget','contract','procurement','acquisition','vendor','small business','obligation','spend','fy','$','million','billion'],
    excludeKeywords: ['vehicle automotive']
  }
];

/**
 * Scoring weights with partial match support
 */
const SCORING_WEIGHTS = {
  EXACT_PHRASE: 3,
  ACRONYM: 2,
  ANCHOR: 5,
  SYNONYM: 1,
  PARTIAL_MATCH: 0.5,
  EXCLUSION: -4
};

function calculateThemeScore(text: string, d: ThemeDictionary): number {
  const lower = text.toLowerCase();
  let score = 0;
  d.includeKeywords.forEach(k => { if (lower.includes(k.toLowerCase())) score += SCORING_WEIGHTS.EXACT_PHRASE; });
  d.acronyms.forEach(a => { if (new RegExp(`\\b${a}\\b`, 'i').test(text)) score += SCORING_WEIGHTS.ACRONYM; });
  d.anchors.forEach(a => { if (lower.includes(a.toLowerCase())) score += SCORING_WEIGHTS.ANCHOR; });
  d.synonyms.forEach(s => { if (lower.includes(s.toLowerCase())) score += SCORING_WEIGHTS.SYNONYM; });
  (d.partialMatches ?? []).forEach(p => { if (new RegExp(`\\b${p}\\b`, 'i').test(text)) score += SCORING_WEIGHTS.PARTIAL_MATCH; });
  d.excludeKeywords.forEach(x => { if (lower.includes(x.toLowerCase())) score = Math.max(0, score + SCORING_WEIGHTS.EXCLUSION); });
  return score;
}

/**
 * Enhanced theme tagging with lower threshold and fallbacks
 */
export function tagCardThemes(card: EvidenceCard): string[] {
  const text = `${card.quote} ${card.claim}`;
  const scored = THEME_DICTIONARIES
    .map(d => ({ theme: d.name, score: calculateThemeScore(text, d) }))
    .filter(s => s.score >= 2) // lowered threshold from 5 to 2
    .sort((a,b) => b.score - a.score);

  if (scored.length > 0) return scored.slice(0, 2).map(s => s.theme);

  // Soft fallback @ ≥1
  const loose = THEME_DICTIONARIES
    .map(d => ({ theme: d.name, score: calculateThemeScore(text, d) }))
    .filter(s => s.score >= 1)
    .sort((a,b) => b.score - a.score);
  if (loose.length > 0) return [loose[0].theme];

  // Heuristic fallback based on common terms
  const lower = text.toLowerCase();
  if (/\b(budget|contract|procurement|acquisition|obligation|spend|fy|\$|million|billion)\b/i.test(lower)) return ['Budget/Vehicles/Small-biz'];
  if (/\b(compliance|audit|policy|control|risk|framework|nist|rmf|ato)\b/i.test(lower)) return ['Governance/Compliance'];
  if (/\b(cloud|aws|azure|gcp|saas|paas|iaas|kubernetes|container)\b/i.test(lower)) return ['Cloud/FedRAMP'];
  if (/\b(incident|threat|breach|detection|soar|siem|xdr)\b/i.test(lower)) return ['IR/SOC'];

  return ['Other'];
}

/**
 * Batch tagging with distribution logging
 */
export function tagAllCards(cards: EvidenceCard[]): {
  taggedCards: EvidenceCard[];
  untaggedCount: number;
  themeDistribution: Map<string, number>;
} {
  const themeDistribution = new Map<string, number>();
  let untaggedCount = 0;

  const taggedCards = cards.map((card, index) => {
    const themes = tagCardThemes(card);
    for (const theme of themes) {
      themeDistribution.set(theme, (themeDistribution.get(theme) || 0) + 1);
      if (theme === 'Other') untaggedCount++;
    }
    if (index % 10 === 0) {
      console.log(`TAGGER: Processing card ${index + 1}/${cards.length}`);
    }
    return { ...card, theme: themes[0], themes };
  });

  console.log('TAGGER: Theme distribution after deterministic pass:');
  for (const [theme, count] of themeDistribution.entries()) {
    console.log(`  ${theme}: ${count} cards`);
  }
  if (untaggedCount > 0) {
    console.log(`TAGGER: ${untaggedCount} cards untagged after deterministic pass; marked for LLM fallback`);
  }

  const mandatoryThemes = [
    'Zero Trust','CDM','Identity/ICAM','Cloud/FedRAMP',
    'IR/SOC','SBOM/SCRM','Governance/Compliance','Budget/Vehicles/Small-biz'
  ];
  const covered = mandatoryThemes.filter(t => themeDistribution.has(t));
  const missing = mandatoryThemes.filter(t => !themeDistribution.has(t));

  console.log(`TAGGER: Coverage: ${covered.length}/8 mandatory themes`);
  if (missing.length > 0) console.log(`TAGGER: Missing themes: ${missing.join(', ')}`);

  return { taggedCards, untaggedCount, themeDistribution };
}

/**
 * Coverage helper
 */
export function checkThemeCoverage(themeDistribution: Map<string, number>): {
  covered: string[];
  missing: string[];
  weak: string[];
} {
  const mandatoryThemes = [
    'Zero Trust','CDM','Identity/ICAM','Cloud/FedRAMP',
    'IR/SOC','SBOM/SCRM','Governance/Compliance','Budget/Vehicles/Small-biz'
  ];
  const covered: string[] = [];
  const missing: string[] = [];
  const weak: string[] = [];

  for (const theme of mandatoryThemes) {
    const count = themeDistribution.get(theme) || 0;
    if (count === 0) missing.push(theme);
    else if (count < 3) { weak.push(theme); covered.push(theme); }
    else covered.push(theme);
  }
  return { covered, missing, weak };
}
