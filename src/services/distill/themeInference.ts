// Fixed theme inference - more flexible matching
export function inferTheme(text: string, signals?: string[]): string {
  const lower = text.toLowerCase();
  
  // Check mandatory themes with more flexible patterns
  if (/zero.?trust|zta|never.?trust|perimeter|identity.?verification/i.test(text)) {
    return 'Zero Trust';
  }
  
  if (/cdm|continuous.?diagnos|continuous.?monitor|dashboard|real.?time.?monitor/i.test(text)) {
    return 'CDM';
  }
  
  if (/identity|icam|privileged.?access|pam|authentication|credential|multi.?factor|mfa|piv|cac/i.test(text)) {
    return 'Identity/ICAM';
  }
  
  if (/cloud|fedram|iaas|paas|saas|cloud.?migration|aws|azure|gcp|hybrid.?cloud/i.test(text)) {
    return 'Cloud/FedRAMP';
  }
  
  if (/incident.?response|soc|siem|threat|security.?operation|csirt|forensic|breach/i.test(text)) {
    return 'IR/SOC';
  }
  
  if (/sbom|software.?bill|supply.?chain|scrm|third.?party|vendor.?risk|dependency/i.test(text)) {
    return 'SBOM/SCRM';
  }
  
  if (/governance|compliance|fisma|nist|rmf|ato|poa.?m|audit|policy|standard|framework/i.test(text)) {
    return 'Governance/Compliance';
  }
  
  // More flexible budget/procurement matching
  if (/budget|contract|procure|vehicle|small.?business|8.?a|sewp|award|obligation|spend|vendor|acquisition/i.test(text)) {
    return 'Budget/Vehicles/Small-biz';
  }
  
  // Additional themes with flexible matching
  if (/\bai\b|artificial.?intelligence|machine.?learning|\bml\b|automat|algorithm/i.test(text)) {
    return 'AI/ML';
  }
  
  if (/quantum|pqc|post.?quantum|cryptograph/i.test(text)) {
    return 'Quantum';
  }
  
  if (/devsecops|ci.?cd|pipeline|agile|devops|continuous.?integration/i.test(text)) {
    return 'DevSecOps';
  }
  
  // Check for any general security/cyber terms
  if (/security|cyber|protect|defend|vulnerab|risk|threat/i.test(text)) {
    return 'Governance/Compliance';
  }
  
  // Check for technology/IT terms
  if (/technology|system|software|hardware|network|infrastructure|data/i.test(text)) {
    return 'Other';
  }
  
  return 'Other';
}
