// Gemini Service with Distillation Integration
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { PipelineError } from '../src/types/errors';
import { CYBER_PROMPT_TEMPLATE } from '../constants';
import { runDistillationPipeline, DistillationPipelineResult } from '../src/services/distill';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in environment variables');
  console.error('Please set VITE_GEMINI_API_KEY or VITE_API_KEY in .env.local');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Helper to extract text from various response formats
function extractText(result: any): { text: string | null; meta: Record<string, unknown> } {
  const response = result?.response || result;
  const candidate = response?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const safetyRatings = candidate?.safetyRatings;

  let text: string | null = null;
  
  try {
    if (typeof response?.text === 'function') {
      text = response.text();
    } else if (typeof result?.text === 'string') {
      text = result.text;
    } else if (candidate?.content?.parts?.[0]?.text) {
      text = candidate.content.parts[0].text;
    }
  } catch (e) {
    console.error('Error extracting text from response:', e);
  }
  
  return { 
    text, 
    meta: { 
      finishReason, 
      safetyRatings, 
      candidateCount: response?.candidates?.length,
      raw: result 
    } 
  };
}

// Convert Gemini errors to our PipelineError format
function geminiErrorToPipelineError(e: any, stage: PipelineError['stage'] = 'MODEL_CALL'): PipelineError {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();

  if (/api[\s_-]?key/i.test(msg) || !apiKey) {
    return { 
      stage, 
      code: 'API_KEY_MISSING', 
      message: 'Gemini API key not found or invalid.', 
      hint: 'Check your .env.local file and ensure VITE_GEMINI_API_KEY or VITE_API_KEY is set correctly.',
      details: { error: msg, hasKey: !!apiKey }
    };
  }
  if (/blocked/i.test(msg) || /safety/i.test(msg)) {
    return { 
      stage, 
      code: 'MODEL_SAFETY_BLOCK', 
      message: 'Model blocked content for safety reasons.', 
      hint: 'Try removing sensitive terms from documents, or split the prompt into smaller sections.', 
      details: e 
    };
  }
  if (/rate[\s_-]?limit|quota/i.test(msg)) {
    return { 
      stage, 
      code: 'MODEL_RATE_LIMIT', 
      message: 'API rate limit or quota exceeded.', 
      hint: 'Wait a few minutes and try again.', 
      details: e 
    };
  }
  if (/max[\s_-]?tokens|length|too[\s_-]?long/i.test(msg)) {
    return { 
      stage, 
      code: 'MODEL_LENGTH_BLOCK', 
      message: 'Input or output exceeded token limits.', 
      hint: 'The distillation process will automatically handle this.', 
      details: e 
    };
  }
  
  return { 
    stage, 
    code: 'MODEL_SERVER_ERROR', 
    message: `Unexpected error: ${msg.substring(0, 100)}`, 
    hint: 'Check the debug panel for more details.',
    details: e 
  };
}

// Helper to read files
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

// Add timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms = 120000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject({
        stage: 'MODEL_CALL',
        code: 'MODEL_SERVER_ERROR',
        message: `Request timed out after ${ms / 1000} seconds`,
        hint: 'The AI model took too long to respond. Try with fewer documents.'
      });
    }, ms);

    promise
      .then(value => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

export interface GenerationResult {
  rawText: string;
  meta: Record<string, unknown>;
  runId: string;
  promptLength: number;
  distillationUsed: boolean;
  distillationStats?: {
    inputSizeMB: number;
    outputSizeKB: number;
    reductionRatio: string;
    cardsGenerated: number;
    topSignals: string[];
  };
}

/**
 * Main function with automatic distillation for large inputs
 */
export async function generateExecutiveBriefingWithDistillation(
  files: File[], 
  agencyName: string,
  onProgress?: (stage: string, status: 'start' | 'ok' | 'fail', note?: string) => void
): Promise<GenerationResult> {
  const runId = String(Date.now());
  
  onProgress?.('MODEL_CALL', 'start', 'Analyzing document size...');
  
  try {
    // Check API key first
    if (!apiKey) {
      throw geminiErrorToPipelineError(new Error('API key missing'), 'MODEL_CALL');
    }

    // Calculate total file size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const shouldDistill = totalSize > 300_000; // 300KB threshold
    
    let finalPrompt: string;
    let distillationResult: DistillationPipelineResult | null = null;
    let distillationUsed = false;
    
    if (shouldDistill) {
      onProgress?.('DISTILLATION', 'start', `Large files detected (${(totalSize / 1024 / 1024).toFixed(1)}MB). Starting distillation...`);
      
      // Find CSV file if present
      const csvFile = files.find(f => f.name.endsWith('.csv'));
      const docFiles = files.filter(f => !f.name.endsWith('.csv'));
      
      // Run distillation pipeline
      distillationResult = await runDistillationPipeline({
        files: docFiles,
        csvFile,
        agencyCode: agencyName,
        onProgress: (stage, percent) => {
          onProgress?.('DISTILLATION', 'start', `${stage} (${percent}%)`);
        }
      });
      
      if (!distillationResult.success) {
        console.warn('Distillation had issues:', distillationResult.errors);
        // Fall back to regular processing
        onProgress?.('DISTILLATION', 'fail', 'Distillation failed, using regular processing');
      } else {
        distillationUsed = true;
        onProgress?.('DISTILLATION', 'ok', `Distilled to ${distillationResult.evidenceCards?.length || 0} evidence cards`);
        
        // Use the distilled prompts
        if (distillationResult.prompts?.briefing) {
          finalPrompt = distillationResult.prompts.briefing;
        } else {
          // Fallback if no prompt was generated
          finalPrompt = await buildPromptFromEvidenceCards(
            distillationResult.evidenceCards || [],
            agencyName
          );
        }
      }
    }
    
    // If not distilled or distillation failed, use regular processing
    if (!distillationUsed) {
      onProgress?.('MODEL_CALL', 'start', 'Processing documents normally...');
      
      // Read all files
      const fileContents = await Promise.all(files.map(readFileAsText));
      
      const sourcePackContent = fileContents.map(file => 
        `--- START OF DOCUMENT: ${file.name} ---\n\n${file.content}\n\n--- END OF DOCUMENT: ${file.name} ---`
      ).join('\n\n');

      const filledPromptTemplate = CYBER_PROMPT_TEMPLATE.replace(/{AGENCY_NAME}/g, agencyName);

      finalPrompt = `
CONTEXT FROM ATTACHED SOURCE DOCUMENTS:

${sourcePackContent}

---

PROMPT TO EXECUTE:

${filledPromptTemplate}

---

Diagnostics footer (mandatory):
Append a fenced json block titled run_diagnostics with:
{ "sections_emitted": ["briefing", "signals_ledger", "themes_rollup", "source_index"], "token_usage_hint": "approximate", "warnings": [] }
      `;
    }

    onProgress?.('MODEL_CALL', 'start', 'Calling Gemini API...');
    
    // Store prompt for debugging
    try {
      localStorage.setItem(`gcca.run.${runId}.request`, finalPrompt.substring(0, 50000));
      localStorage.setItem(`gcca.run.${runId}.timestamp`, new Date().toISOString());
      localStorage.setItem(`gcca.run.${runId}.distilled`, String(distillationUsed));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    console.log('Calling Gemini with prompt length:', finalPrompt.length, 'Distilled:', distillationUsed);
    
    const result = await withTimeout(
      model.generateContent({
        contents: [{ 
          role: 'user', 
          parts: [{ text: finalPrompt }]
        }]
      }),
      120000 // 2 minute timeout
    );

    const { text, meta } = extractText(result);
    
    console.log('Gemini response meta:', {
      hasText: !!text,
      textLength: text?.length || 0,
      finishReason: meta.finishReason,
      distillationUsed
    });

    // Store response for debugging
    try {
      localStorage.setItem(`gcca.run.${runId}.response`, text?.substring(0, 50000) || '');
      localStorage.setItem(`gcca.run.${runId}.meta`, JSON.stringify(meta, null, 2));
      if (distillationResult?.manifest) {
        localStorage.setItem(`gcca.run.${runId}.distillation`, JSON.stringify(distillationResult.manifest));
      }
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    // Check for empty response
    if (!text || !text.trim()) {
      const finishReason = (meta as any)?.finishReason;
      
      const err: PipelineError = {
        stage: 'MODEL_CALL',
        code: finishReason === 'SAFETY' ? 'MODEL_SAFETY_BLOCK'
             : finishReason === 'MAX_TOKENS' ? 'MODEL_LENGTH_BLOCK'
             : 'MODEL_SERVER_ERROR',
        message: 'Model returned no text.',
        hint: finishReason === 'SAFETY' 
          ? 'The content was blocked for safety. Try removing sensitive information.'
          : finishReason === 'MAX_TOKENS'
          ? 'Output was too long. Try with fewer documents.'
          : 'Open Debug panel to check finishReason and safety ratings.',
        details: { finishReason, meta }
      };
      
      onProgress?.('MODEL_CALL', 'fail', err.message);
      throw err;
    }

    onProgress?.('MODEL_CALL', 'ok', 'Response received successfully');
    
    // Build result with distillation stats if used
    const result_final: GenerationResult = { 
      rawText: text, 
      meta, 
      runId,
      promptLength: finalPrompt.length,
      distillationUsed
    };
    
    if (distillationUsed && distillationResult?.manifest) {
      const stats = distillationResult.manifest.stats;
      result_final.distillationStats = {
        inputSizeMB: distillationResult.manifest.inputFiles.reduce((sum, f) => sum + f.sizeMB, 0),
        outputSizeKB: (stats.finalCardCount * 0.5), // Estimate
        reductionRatio: `${(stats.chunksProcessed / Math.max(stats.finalCardCount, 1)).toFixed(0)}:1`,
        cardsGenerated: stats.finalCardCount,
        topSignals: distillationResult.manifest.topSignals
      };
    }
    
    return result_final;
    
  } catch (error) {
    // If it's already a PipelineError, pass it through
    if ((error as any)?.stage) {
      onProgress?.('MODEL_CALL', 'fail', (error as any).message);
      throw error;
    }
    
    // Convert to PipelineError
    const pipelineError = geminiErrorToPipelineError(error, 'MODEL_CALL');
    onProgress?.('MODEL_CALL', 'fail', pipelineError.message);
    throw pipelineError;
  }
}

/**
 * Build prompt from evidence cards when distillation succeeds but prompt generation fails
 */
async function buildPromptFromEvidenceCards(
  cards: any[],
  agencyName: string
): Promise<string> {
  const cardsText = cards
    .slice(0, 30) // Take top 30 cards
    .map(card => `• ${card.claim} [${card.source_doc}, ${card.class}]`)
    .join('\n');
  
  const filledPromptTemplate = CYBER_PROMPT_TEMPLATE.replace(/{AGENCY_NAME}/g, agencyName);
  
  return `
EVIDENCE CARDS FROM DISTILLATION:

${cardsText}

---

PROMPT TO EXECUTE:

${filledPromptTemplate}

---

Diagnostics footer (mandatory):
Append a fenced json block titled run_diagnostics with:
{ "sections_emitted": ["briefing", "signals_ledger", "themes_rollup", "source_index"], "token_usage_hint": "approximate", "warnings": [] }
  `;
}

// Keep the original function for backward compatibility
export { generateExecutiveBriefingWithDistillation as generateExecutiveBriefing };
