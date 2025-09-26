// Multi-stage pipeline implementation based on expert recommendations
// Replaces single monolithic Gemini call with structured data flow

import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  StrategicFacts, 
  ProcurementMetrics, 
  Finding, 
  ExecutiveBrief, 
  PipelineState 
} from '../types/schemas';
import { 
  PROMPTS, 
  DOCUMENT_CLASSIFIER_PROMPT,
  COMPANY_CAPABILITIES 
} from '../prompts/templates';
import { 
  ingestProcurementData 
} from './ingestionService';
import {
  FileManifest,
  DataProfile,
  DerivedFeatures
} from '../types/metadata';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY || '');

// Utility: Read file as text
const readFileAsText = (file: File): Promise<{ name: string, content: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ name: file.name, content: reader.result as string });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// Utility: Clean JSON from response
const extractJSON = (response: string): any => {
  // Remove markdown code blocks if present
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Find JSON object or array
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }
  
  try {
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    // Try to fix common issues
    const fixed = jsonMatch[1]
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/'/g, '"');     // Replace single quotes with double
    
    return JSON.parse(fixed);
  }
};

// Stage 0: Classify and organize documents
export const classifyDocuments = async (
  files: File[]
): Promise<PipelineState['rawFiles']> => {
  const classified = await Promise.all(
    files.map(async (file) => {
      const content = await readFileAsText(file);
      const preview = content.content.substring(0, 500);
      
      const prompt = DOCUMENT_CLASSIFIER_PROMPT
        .replace('{FILENAME}', file.name)
        .replace('{PREVIEW}', preview);
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      const category = (response.text() || 'other').trim().toLowerCase();
      
      return {
        name: content.name,
        content: content.content,
        type: category as any
      };
    })
  );
  
  return classified;
};

// Stage 1: Extract strategic facts
export const extractStrategicFacts = async (
  documents: PipelineState['rawFiles'],
  agencyName: string
): Promise<StrategicFacts> => {
  const strategyDocs = documents.filter(d => 
    ['strategy', 'audit', 'memo'].includes(d.type)
  );
  
  if (strategyDocs.length === 0) {
    return {
      agency: agencyName,
      frameworks: [],
      facts: [],
      gaps: []
    };
  }
  
  const docsContent = strategyDocs
    .map(d => `--- ${d.name} ---\n${d.content}`)
    .join('\n\n');
  
  const prompt = PROMPTS.EXTRACTOR
    .replace(/{AGENCY_NAME}/g, agencyName)
    .replace('{DOCUMENTS}', docsContent);
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = result.response;
  
  const text = response.text();
  if (!text) {
    throw new Error('Failed to extract strategic facts');
  }
  
  return extractJSON(text) as StrategicFacts;
};

// Stage 2: Analyze procurement metrics (Enhanced with metadata)
export const analyzeProcurement = async (
  documents: PipelineState['rawFiles'],
  agencyName: string
): Promise<{
  metrics: ProcurementMetrics;
  metadata?: {
    manifest: FileManifest;
    profile: DataProfile;
    features: DerivedFeatures[];
  };
}> => {
  const csvDocs = documents.filter(d => d.type === 'csv');
  
  // Default empty metrics if no CSV
  if (csvDocs.length === 0) {
    return {
      metrics: {
        agency: agencyName,
        window: [],
        totals: { award_count: 0, obligations_usd: 0, cagr_3yr_pct: 0 },
        distribution: { median_award_usd: 0, p75_award_usd: 0 },
        top_naics: [],
        top_psc: [],
        vehicles: [],
        set_asides: [],
        vendor_concentration: { hhi: 0, top5_share_pct: 0 },
        timing: { qtr_peaks: [], recompete_flags: [] },
        missing_fields: ['No CSV data provided']
      }
    };
  }
  
  // Process CSV through ingestion pipeline first
  const csvFile = new File([csvDocs[0].content], csvDocs[0].name, { type: 'text/csv' });
  const ingestionResult = await ingestProcurementData(csvFile, agencyName);
  
  // Use the data profile to build procurement metrics
  const profile = ingestionResult.profile;
  
  const metrics: ProcurementMetrics = {
    agency: agencyName,
    window: profile.window.fiscal_years,
    totals: {
      award_count: profile.award_count,
      obligations_usd: profile.obligation_total_usd,
      cagr_3yr_pct: 0 // Would calculate from features
    },
    distribution: {
      median_award_usd: profile.median_award_size_usd,
      p75_award_usd: 0 // Would calculate from features
    },
    top_naics: profile.top_naics.map(n => ({
      code: n.code,
      share_pct: n.share * 100
    })),
    top_psc: profile.top_psc.map(p => ({
      code: p.code,
      share_pct: p.share * 100
    })),
    vehicles: Object.entries(profile.vehicle_mix).map(([name, share]) => ({
      name,
      share_pct: share * 100
    })),
    set_asides: Object.entries(profile.set_aside_mix).map(([type, share]) => ({
      type,
      share_pct: share * 100
    })),
    vendor_concentration: {
      hhi: 0, // Would calculate from vendor data
      top5_share_pct: 0 // Would calculate from vendor data
    },
    timing: {
      qtr_peaks: [],
      recompete_flags: []
    },
    missing_fields: ingestionResult.validation.errors.map(e => e.field)
  };
  
  return {
    metrics,
    metadata: {
      manifest: ingestionResult.manifest,
      profile: ingestionResult.profile,
      features: ingestionResult.features
    }
  };
};

// Stage 3: Synthesize findings
export const synthesizeFindings = async (
  facts: StrategicFacts,
  metrics: ProcurementMetrics,
  agencyName: string
): Promise<Finding[]> => {
  const prompt = PROMPTS.FINDINGS_SYNTHESIZER
    .replace(/{AGENCY_NAME}/g, agencyName)
    .replace('{STRATEGIC_FACTS}', JSON.stringify(facts, null, 2))
    .replace('{PROCUREMENT_METRICS}', JSON.stringify(metrics, null, 2));
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = result.response;
  
  const text = response.text();
  if (!text) {
    throw new Error('Failed to synthesize findings');
  }
  
  return extractJSON(text) as Finding[];
};

// Stage 4: Compose executive brief
export const composeExecutiveBrief = async (
  facts: StrategicFacts,
  metrics: ProcurementMetrics,
  findings: Finding[],
  agencyName: string
): Promise<ExecutiveBrief> => {
  const prompt = PROMPTS.EXECUTIVE_COMPOSER
    .replace(/{AGENCY_NAME}/g, agencyName)
    .replace('{STRATEGIC_FACTS}', JSON.stringify(facts, null, 2))
    .replace('{PROCUREMENT_METRICS}', JSON.stringify(metrics, null, 2))
    .replace('{FINDINGS}', JSON.stringify(findings, null, 2));
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  const response = result.response;
  
  const text = response.text();
  if (!text) {
    throw new Error('Failed to compose executive brief');
  }
  
  return extractJSON(text) as ExecutiveBrief;
};

// Stage 5: Validate output
export const validateBrief = async (
  brief: ExecutiveBrief
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> => {
  const prompt = PROMPTS.EVALUATOR
    .replace('{BRIEF}', JSON.stringify(brief, null, 2));
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const genResult = await model.generateContent(prompt);
  const response = genResult.response;
  
  const text = response.text();
  if (!text) {
    return {
      valid: false,
      errors: ['Validation failed - no response'],
      warnings: []
    };
  }
  
  try {
    const result = extractJSON(text);
    return {
      valid: result.valid,
      errors: result.errors || [],
      warnings: result.warnings || []
    };
  } catch {
    return {
      valid: false,
      errors: ['Validation response parsing failed'],
      warnings: []
    };
  }
};

// Main pipeline orchestrator
export const runCapturePipeline = async (
  files: File[],
  agencyName: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<{
  brief: ExecutiveBrief;
  validation: { valid: boolean; errors: string[]; warnings: string[] };
  intermediateResults: {
    facts: StrategicFacts;
    metrics: ProcurementMetrics;
    findings: Finding[];
  };
}> => {
  try {
    // Stage 0: Classify documents
    onProgress?.('Classifying documents...', 10);
    const classifiedDocs = await classifyDocuments(files);
    
    // Stage 1: Extract strategic facts
    onProgress?.('Extracting strategic facts...', 25);
    const facts = await extractStrategicFacts(classifiedDocs, agencyName);
    
    // Stage 2: Analyze procurement (with metadata)
    onProgress?.('Analyzing procurement data...', 40);
    const procurementResult = await analyzeProcurement(classifiedDocs, agencyName);
    const metrics = procurementResult.metrics;
    const procurementMetadata = procurementResult.metadata;
    
    // Stage 3: Synthesize findings
    onProgress?.('Synthesizing findings...', 55);
    const findings = await synthesizeFindings(facts, metrics, agencyName);
    
    // Stage 4: Compose brief
    onProgress?.('Composing executive brief...', 70);
    const brief = await composeExecutiveBrief(facts, metrics, findings, agencyName);
    
    // Stage 5: Validate
    onProgress?.('Validating output...', 85);
    const validation = await validateBrief(brief);
    
    // If validation fails on first pass, try to fix
    if (!validation.valid && validation.errors.length > 0) {
      console.warn('First pass validation failed, attempting fixes:', validation.errors);
      // Could implement auto-correction logic here
    }
    
    onProgress?.('Complete!', 100);
    
    return {
      brief,
      validation,
      intermediateResults: {
        facts,
        metrics,
        findings
      }
    };
    
  } catch (error) {
    console.error('Pipeline error:', error);
    throw error;
  }
};

// Format brief for display (converts JSON to readable Markdown)
export const formatBriefForDisplay = (brief: ExecutiveBrief): string => {
  const sections = [];
  
  // Executive Summary
  sections.push('# Executive Summary\n');
  sections.push(brief.executive_summary);
  
  // Current Posture
  sections.push('\n## Current Posture\n');
  brief.current_posture.forEach(bullet => {
    sections.push(`• ${bullet}`);
  });
  
  // Strategy Outlook
  sections.push('\n## Strategy Outlook\n');
  brief.strategy_outlook.forEach(bullet => {
    sections.push(`• ${bullet}`);
  });
  
  // Zero Trust Maturity
  sections.push('\n## Zero Trust Maturity\n');
  sections.push(`**Score:** ${brief.zero_trust_maturity.score_1_to_5}/5`);
  sections.push(`**Rationale:** ${brief.zero_trust_maturity.rationale}`);
  
  // Recommended Plays
  sections.push('\n## Recommended Plays\n');
  brief.plays.forEach((play, idx) => {
    sections.push(`\n### Play ${idx + 1}: ${play.name}`);
    sections.push(`**Offer:** ${play.offer}`);
    sections.push(`**Proof Point:** ${play.proof_point}`);
    sections.push(`**Assets:** ${play.assets.join(', ')}`);
    sections.push(`**Vehicles:** ${play.vehicle_pathways.join(', ')}`);
    sections.push(`**First Meeting Demo:** ${play.first_meeting_demo.join(', ')}`);
    sections.push(`**Success Metric:** ${play.success_metric}`);
  });
  
  // Procurement Snapshot
  sections.push('\n## Procurement Snapshot\n');
  sections.push(`**Total Awards (Last 4 FY):** ${brief.procurement_snapshot.totals.award_count}`);
  sections.push(`**Total Obligations:** $${(brief.procurement_snapshot.totals.obligations_usd / 1000000).toFixed(1)}M`);
  sections.push(`**3-Year CAGR:** ${brief.procurement_snapshot.totals.cagr_3yr_pct}%`);
  
  if (brief.procurement_snapshot.top_naics.length > 0) {
    sections.push('\n**Top NAICS Codes:**');
    brief.procurement_snapshot.top_naics.forEach(naics => {
      sections.push(`• ${naics.code}: ${naics.share_pct}%`);
    });
  }
  
  if (brief.procurement_snapshot.vehicles.length > 0) {
    sections.push('\n**Top Vehicles:**');
    brief.procurement_snapshot.vehicles.forEach(vehicle => {
      sections.push(`• ${vehicle.name}: ${vehicle.share_pct}%`);
    });
  }
  
  // Contacts & Path to Contract
  sections.push('\n## Contacts & Path to Contract\n');
  brief.contacts_and_path_to_contract.forEach(contact => {
    sections.push(`• ${contact}`);
  });
  
  // Risks & Mitigations
  sections.push('\n## Risks & Mitigations\n');
  brief.risks_and_mitigations.forEach(risk => {
    sections.push(`• ${risk}`);
  });
  
  // Next 30 Days
  sections.push('\n## Next 30 Days\n');
  brief.next_30_days.forEach((action, idx) => {
    sections.push(`${idx + 1}. ${action}`);
  });
  
  return sections.join('\n');
};
