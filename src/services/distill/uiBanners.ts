// UI Banner Messages - Expert's Fix G & H
// Provides user-friendly coverage status messages

import { CoverageReport, DedupReport } from './twoTierDistiller';
import { QualityGateResults } from './twoTierOrchestrator';

export interface BannerContent {
  severity: 'ok' | 'warn' | 'poor';
  title: string;
  message: string;
  actions?: string[];
  diagnostics: string;
  color: 'green' | 'yellow' | 'red';
}

/**
 * Generate UI banner content based on coverage report
 */
export function generateCoverageBanner(
  coverageReport: CoverageReport,
  dedupReport: DedupReport,
  telemetry?: any
): BannerContent {
  
  const { severity, missingThemes, weakThemes, notes } = coverageReport;
  
  // Build diagnostics footer (always visible)
  const diagnostics = `Agency: ${telemetry?.agencyKey || 'N/A'} · ` +
    `High-signal: ${telemetry?.high_signal_count || 0} · ` +
    `Context: ${telemetry?.context_count || 0} · ` +
    `Dedup dropped: ${dedupReport.dropped} · ` +
    `PLAYS prompt: ${telemetry?.prompts?.PLAYS_MD?.chars || 'N/A'} chars`;
  
  switch (severity) {
    case 'ok':
      return {
        severity: 'ok',
        title: 'Coverage: Complete',
        message: `All mandatory themes are represented (≥3 cards each). ` +
          `Dedup removed ${dedupReport.dropped} duplicates. ` +
          `Proceed to export.`,
        color: 'green',
        diagnostics
      };
      
    case 'warn':
      const themesBelowTarget = weakThemes || [];
      return {
        severity: 'warn',
        title: 'Coverage: Partial',
        message: `The following themes are below target: ${themesBelowTarget.join(', ')}.`,
        actions: [
          `Regenerate with "boost ${themesBelowTarget[0]}"`,
          'Include +5 context cards for weak themes'
        ],
        color: 'yellow',
        diagnostics
      };
      
    case 'poor':
      return {
        severity: 'poor',
        title: 'Coverage: Insufficient',
        message: `No evidence found for: ${missingThemes.join(', ')}. ` +
          `Two-tier distillation produced a thin pack ` +
          `(${telemetry?.high_signal_count || 0} high-signal / ${telemetry?.context_count || 0} context).`,
        actions: [
          'Expand search window (+10% chunks)',
          'Enable LLM fallback tagging',
          'Proceed with fallback distillation (reduced quality)'
        ],
        color: 'red',
        diagnostics
      };
      
    default:
      return {
        severity: 'poor',
        title: 'Status: Unknown',
        message: 'Unable to determine coverage status.',
        color: 'yellow',
        diagnostics
      };
  }
}

/**
 * Generate quality gates summary for UI
 */
export function generateQualityGatesSummary(qualityGates: QualityGateResults): string[] {
  const summary: string[] = [];
  
  // Citation coverage
  const citationIcon = qualityGates.citation_coverage.passed ? '✓' : '✗';
  summary.push(
    `${citationIcon} Citation Coverage: ${(qualityGates.citation_coverage.ratio * 100).toFixed(1)}% (target: ≥90%)`
  );
  
  // Theme coverage
  const themeIcon = qualityGates.theme_coverage.passed ? '✓' : '✗';
  const themeCoverage = qualityGates.theme_coverage;
  summary.push(
    `${themeIcon} Theme Coverage: ${themeCoverage.covered.length} themes covered` +
    (themeCoverage.missing.length > 0 ? ` (missing: ${themeCoverage.missing.join(', ')})` : '')
  );
  
  // Procurement consistency
  if (qualityGates.procurement_consistency.issues.length > 0) {
    summary.push(`⚠️ Procurement: ${qualityGates.procurement_consistency.issues.join('; ')}`);
  }
  
  // Schema validation
  if (qualityGates.schema_validation.errors.length > 0) {
    summary.push(`⚠️ Schema: ${qualityGates.schema_validation.errors.join('; ')}`);
  }
  
  // Overall
  const overallIcon = qualityGates.overall_passed ? '✅' : '⚠️';
  summary.push(`${overallIcon} Overall: ${qualityGates.overall_passed ? 'PASSED' : 'NEEDS REVIEW'}`);
  
  return summary;
}

/**
 * Generate telemetry display for diagnostics drawer
 */
export function generateTelemetryDisplay(telemetry: any): { [key: string]: string } {
  return {
    'Run ID': telemetry.runId,
    'Agency': `${telemetry.agencyKey} (${telemetry.agencyName})`,
    'Input Size': `${telemetry.inputSizeMB.toFixed(2)} MB`,
    'Output Size': `${telemetry.outputSizeKB.toFixed(2)} KB`,
    'Reduction Ratio': telemetry.reductionRatio,
    'High-Signal Cards': String(telemetry.high_signal_count),
    'Context Cards': String(telemetry.context_count),
    'Support Ratio': `${(telemetry.support_ratio * 100).toFixed(1)}%`,
    'Dedup Rate': `${(telemetry.dedup_rate * 100).toFixed(1)}%`,
    'Processing Time': `${(telemetry.processingTimeMs / 1000).toFixed(1)}s`,
    'Token Budget': String(telemetry.token_budget_used)
  };
}

/**
 * Check if export should be blocked
 */
export function shouldBlockExport(
  coverageReport: CoverageReport,
  qualityGates: QualityGateResults
): { blocked: boolean; reason?: string } {
  
  // Block on POOR severity
  if (coverageReport.severity === 'poor') {
    return {
      blocked: true,
      reason: 'Coverage insufficient. Missing mandatory themes.'
    };
  }
  
  // Block on very low citation coverage
  if (qualityGates.citation_coverage.ratio < 0.8) {
    return {
      blocked: true,
      reason: 'Citation coverage below 80%. Quality too low for export.'
    };
  }
  
  // Block on critical schema errors
  if (qualityGates.schema_validation.errors.length > 2) {
    return {
      blocked: true,
      reason: 'Multiple schema validation errors. Please regenerate.'
    };
  }
  
  return { blocked: false };
}
