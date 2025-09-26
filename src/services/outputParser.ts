// Enhanced Output Parser with Proper Section Attribution
import type { PipelineError } from '../types/errors';

export interface ParsedOutput {
  briefingMarkdown: string | null;
  plays: string | null;
  signals: any[] | null;
  themes: any[] | null;
  sources: any[] | null;
  procurement: any | null;
  errors: PipelineError[];
  diagnostics?: any;
}

/**
 * Parse the combined output from four API calls
 * Each section should be attributed to its correct stage
 */
export function parseOutput(rawText: string): ParsedOutput {
  const result: ParsedOutput = {
    briefingMarkdown: null,
    plays: null,
    signals: null,
    themes: null,
    sources: null,
    procurement: null,
    errors: []
  };

  if (!rawText || !rawText.trim()) {
    result.errors.push({
      stage: 'COMPOSE_BRIEFING',
      code: 'EMPTY_RESPONSE',
      message: 'Received empty response from API',
      hint: 'Check API connection and retry'
    });
    return result;
  }

  // Extract Briefing (Markdown)
  const briefingMatch = rawText.match(/```markdown\n([\s\S]*?)\n```/);
  if (briefingMatch) {
    result.briefingMarkdown = briefingMatch[1].trim();
  } else {
    // Only mark as missing if we expect it but don't find it
    const hasBriefingHeader = rawText.includes('Executive Briefing') || 
                              rawText.includes('Executive Summary');
    if (hasBriefingHeader) {
      result.errors.push({
        stage: 'BRIEFING_MD',
        code: 'OUTPUT_SECTION_MISSING',
        message: 'Briefing section header found but markdown block missing',
        hint: 'The model may have returned unformatted text'
      });
    }
  }

  // Extract Plays (second Markdown block)
  const markdownBlocks = rawText.match(/```markdown\n([\s\S]*?)\n```/g) || [];
  if (markdownBlocks.length > 1) {
    const playsMatch = markdownBlocks[1].match(/```markdown\n([\s\S]*?)\n```/);
    if (playsMatch) {
      result.plays = playsMatch[1].trim();
    }
  }
  
  // Alternative: Look for plays in a specific section
  if (!result.plays) {
    const playsSection = rawText.match(/## Strategic Capture Plays\n+```markdown\n([\s\S]*?)\n```/);
    if (playsSection) {
      result.plays = playsSection[1].trim();
    }
  }

  // Extract JSON sections (can be multiple blocks)
  const jsonBlocks = rawText.match(/```json\n([\s\S]*?)\n```/g) || [];
  
  jsonBlocks.forEach((block, index) => {
    try {
      const jsonStr = block.replace(/```json\n|\n```/g, '').trim();
      const json = JSON.parse(jsonStr);
      
      // Check for annex data (signals, themes, sources)
      if (json.signals_ledger && !result.signals) {
        result.signals = json.signals_ledger;
      }
      if (json.themes_rollup && !result.themes) {
        result.themes = json.themes_rollup;
      }
      if (json.source_index && !result.sources) {
        result.sources = json.source_index;
      }
      
      // Check for procurement data
      if (json.total_value !== undefined && json.active_contracts !== undefined) {
        result.procurement = json;
      }
      
      // Check for diagnostics
      if (json.sections_emitted || json.errors || json.filled_by_fallback) {
        result.diagnostics = json;
      }
      
    } catch (e) {
      console.warn(`Failed to parse JSON block ${index}:`, e);
      // Don't add error here - it might be a different format
    }
  });

  // Check diagnostics to determine what was actually emitted
  if (result.diagnostics) {
    const emitted = result.diagnostics.sections_emitted || [];
    const fallbacks = result.diagnostics.filled_by_fallback || [];
    const diagErrors = result.diagnostics.errors || [];
    
    // Only report missing sections if they were supposed to be emitted
    if (emitted.includes('briefing') && !result.briefingMarkdown) {
      result.errors.push({
        stage: 'BRIEFING_MD',
        code: 'OUTPUT_SECTION_MISSING',
        message: 'Briefing was marked as emitted but not found in output',
        hint: 'Check markdown formatting'
      });
    }
    
    if (emitted.includes('plays') && !result.plays) {
      result.errors.push({
        stage: 'PLAYS_MD',
        code: 'OUTPUT_SECTION_MISSING',
        message: 'Plays were marked as emitted but not found in output',
        hint: 'Check for second markdown block'
      });
    }
    
    // For annex sections, check if they were filled by fallback
    if (fallbacks.includes('signals_ledger')) {
      result.errors.push({
        stage: 'ANNEX_JSON',
        code: 'FALLBACK_USED',
        message: 'signals_ledger was generated using fallback data',
        hint: 'API call may have partially failed'
      });
    }
    
    if (fallbacks.includes('themes_rollup')) {
      result.errors.push({
        stage: 'ANNEX_JSON',
        code: 'FALLBACK_USED',
        message: 'themes_rollup was generated using fallback data',
        hint: 'API call may have partially failed'
      });
    }
    
    if (fallbacks.includes('source_index')) {
      result.errors.push({
        stage: 'ANNEX_JSON',
        code: 'FALLBACK_USED',
        message: 'source_index was generated using fallback data',
        hint: 'API call may have partially failed'
      });
    }
    
    // Add any errors from diagnostics
    diagErrors.forEach((error: string) => {
      const [stage, code] = error.split(':').map(s => s.trim());
      if (stage && code) {
        result.errors.push({
          stage: stage as any,
          code: code as any,
          message: `${stage} reported: ${code}`,
          hint: 'Check debug panel for details'
        });
      }
    });
  } else {
    // No diagnostics found - check what we actually got
    if (!result.briefingMarkdown && !result.plays && !result.signals && !result.themes && !result.sources) {
      result.errors.push({
        stage: 'ORCHESTRATION',
        code: 'NO_SECTIONS_FOUND',
        message: 'No recognizable sections found in output',
        hint: 'The response format may be incorrect or calls may not have executed'
      });
    }
  }

  // Validate section contents
  if (result.briefingMarkdown && result.briefingMarkdown.length < 100) {
    result.errors.push({
      stage: 'BRIEFING_MD',
      code: 'OUTPUT_TOO_SHORT',
      message: 'Briefing is suspiciously short',
      hint: 'The model may have been interrupted'
    });
  }

  if (result.signals && result.signals.length === 0) {
    result.errors.push({
      stage: 'ANNEX_JSON',
      code: 'EMPTY_ARRAY',
      message: 'signals_ledger is empty',
      hint: 'No signals were extracted from evidence cards'
    });
  }

  if (result.themes && result.themes.length === 0) {
    result.errors.push({
      stage: 'ANNEX_JSON',
      code: 'EMPTY_ARRAY',
      message: 'themes_rollup is empty',
      hint: 'No themes were identified'
    });
  }

  if (result.sources && result.sources.length === 0) {
    result.errors.push({
      stage: 'ANNEX_JSON',
      code: 'EMPTY_ARRAY',
      message: 'source_index is empty',
      hint: 'No source documents were indexed'
    });
  }

  return result;
}

/**
 * Validate procurement values for sanity
 */
export function validateProcurementData(data: any): PipelineError[] {
  const errors: PipelineError[] = [];
  
  if (!data) return errors;
  
  // Check for suspiciously low contract values
  if (data.total_value && data.total_value < 100000) {
    errors.push({
      stage: 'PROCUREMENT_ANALYSIS',
      code: 'SUSPICIOUS_VALUE',
      message: `Total contract value ($${data.total_value}) seems too low`,
      hint: 'Values may be in thousands or parsing may have failed'
    });
  }
  
  // Check for impossible percentages
  if (data.small_business_percentage && 
      (data.small_business_percentage < 0 || data.small_business_percentage > 100)) {
    errors.push({
      stage: 'PROCUREMENT_ANALYSIS',
      code: 'INVALID_PERCENTAGE',
      message: `Small business percentage (${data.small_business_percentage}%) is invalid`,
      hint: 'Percentage must be between 0 and 100'
    });
  }
  
  // Check for mismatched set-aside data
  if (data.set_aside_percentage === 0 && data.small_business_percentage > 0) {
    errors.push({
      stage: 'PROCUREMENT_ANALYSIS',
      code: 'DATA_INCONSISTENCY',
      message: 'Set-aside is 0% but small business percentage is positive',
      hint: 'Data may be from different sources or incorrectly parsed'
    });
  }
  
  return errors;
}

/**
 * Format errors for display with actionable guidance
 */
export function formatErrorsForDisplay(errors: PipelineError[]): string[] {
  const messages: string[] = [];
  
  // Group errors by stage
  const byStage = new Map<string, PipelineError[]>();
  errors.forEach(error => {
    if (!byStage.has(error.stage)) {
      byStage.set(error.stage, []);
    }
    byStage.get(error.stage)!.push(error);
  });
  
  // Format each stage's errors
  byStage.forEach((stageErrors, stage) => {
    if (stage === 'ORCHESTRATION') {
      messages.push(`⚠️ Pipeline Issue: ${stageErrors.map(e => e.message).join('; ')}`);
    } else if (stage === 'ANNEX_JSON' && stageErrors.some(e => e.code === 'FALLBACK_USED')) {
      const fallbackCount = stageErrors.filter(e => e.code === 'FALLBACK_USED').length;
      messages.push(`ℹ️ Used fallback data for ${fallbackCount} annex section(s)`);
    } else if (stageErrors.some(e => e.code === 'OUTPUT_SECTION_MISSING')) {
      const missing = stageErrors
        .filter(e => e.code === 'OUTPUT_SECTION_MISSING')
        .map(e => e.message);
      messages.push(`❌ Missing output: ${missing.join(', ')}`);
    } else {
      stageErrors.forEach(error => {
        messages.push(`${stage}: ${error.message}`);
        if (error.hint) {
          messages.push(`  → ${error.hint}`);
        }
      });
    }
  });
  
  return messages;
}
