// Utility functions for evidence distillation
import { ChunkInfo } from '../../types/distillation';

/**
 * Extract chunks from document text
 * Splits by paragraphs and sections, preserving structure
 */
export function extractChunks(text: string, docId: string): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  
  // Split by double newlines for paragraphs or single for lines
  const sections = text.split(/\n\s*\n/);
  let currentOffset = 0;
  let currentPage = 1;
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // Check for page markers (common in converted PDFs)
    const pageMatch = section.match(/(?:Page|PAGE)\s+(\d+)/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
    }
    
    // Extract heading if present (lines that are all caps or end with colon)
    let heading: string | undefined;
    const lines = section.split('\n');
    if (lines[0] && (lines[0] === lines[0].toUpperCase() || lines[0].endsWith(':'))) {
      heading = lines[0].trim();
    }
    
    chunks.push({
      text: section.trim(),
      docId,
      page: currentPage,
      heading,
      offset: currentOffset,
      length: section.length
    });
    
    currentOffset += section.length + 2; // Account for newlines
  }
  
  return chunks;
}

/**
 * Generate 5-gram hash for deduplication
 */
export function hash5grams(text: string): string {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (normalized.length < 5) {
    return normalized;
  }
  
  const grams: string[] = [];
  for (let i = 0; i <= normalized.length - 5; i++) {
    grams.push(normalized.substring(i, i + 5));
  }
  
  // Simple hash using first, middle, and last 5-grams
  const first = grams[0] || '';
  const middle = grams[Math.floor(grams.length / 2)] || '';
  const last = grams[grams.length - 1] || '';
  
  return `${first}_${middle}_${last}_${grams.length}`;
}

/**
 * Extract the shortest supporting sentence (≤220 chars)
 */
export function extractShortestSentence(text: string, maxLength: number = 220): string {
  // Split into sentences (basic sentence splitting)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Find sentences with key signals
  const keywordPatterns = [
    /\b(shall|must|required|mandatory)\b/i,
    /\$[\d,]+\s*(million|billion)/i,
    /\b(critical|priority|essential|key)\b/i,
    /\b(gap|weakness|issue|risk|vulnerability)\b/i,
    /\b(fy\s*20\d{2}|q[1-4]\s*20\d{2})\b/i
  ];
  
  // Sort sentences by relevance and length
  const scoredSentences = sentences
    .map(s => {
      const trimmed = s.trim();
      let score = 0;
      
      // Bonus for containing keywords
      for (const pattern of keywordPatterns) {
        if (pattern.test(trimmed)) {
          score += 10;
        }
      }
      
      // Penalty for being too long
      if (trimmed.length > maxLength) {
        score -= 5;
      }
      
      // Bonus for being concise
      if (trimmed.length < 100) {
        score += 3;
      }
      
      return { text: trimmed, score };
    })
    .filter(s => s.text.length > 20) // Minimum viable sentence
    .sort((a, b) => {
      // Prefer higher score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If equal score, prefer shorter
      return a.text.length - b.text.length;
    });
  
  if (scoredSentences.length === 0) {
    // Fallback: take first maxLength chars
    return text.substring(0, maxLength).trim();
  }
  
  const best = scoredSentences[0].text;
  
  // If best is still too long, truncate intelligently
  if (best.length > maxLength) {
    // Try to break at a natural point
    const truncated = best.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...';
    }
    return truncated + '...';
  }
  
  return best;
}

/**
 * Calculate similarity between two text snippets (Jaccard similarity)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  
  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));
  
  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Extract agency name from text
 */
export function extractAgencyFromText(text: string): string | null {
  const agencyPatterns = [
    { pattern: /\b(department\s+of\s+commerce|doc|nist|noaa|census|uspto)\b/i, agency: 'DOC' },
    { pattern: /\b(internal\s+revenue\s+service|irs|treasury|tigta)\b/i, agency: 'IRS' },
    { pattern: /\b(health\s+and\s+human\s+services|hhs|cms|nih|cdc|fda)\b/i, agency: 'HHS' },
    { pattern: /\b(department\s+of\s+interior|doi|nps|usgs|blm|fws)\b/i, agency: 'DOI' },
    { pattern: /\b(army\s+corps\s+of\s+engineers|usace|civil\s+works)\b/i, agency: 'USACE' },
  ];
  
  for (const { pattern, agency } of agencyPatterns) {
    if (pattern.test(text)) {
      return agency;
    }
  }
  
  return null;
}

/**
 * Parse budget amount from text
 */
export function parseBudgetAmount(text: string): number | null {
  const patterns = [
    /\$\s*([\d,]+(?:\.\d+)?)\s*billion/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*million/i,
    /\$\s*([\d,]+(?:\.\d+)?)\s*thousand/i,
    /\$\s*([\d,]+(?:\.\d+)?)/i,
  ];
  
  const multipliers = [1_000_000_000, 1_000_000, 1_000, 1];
  
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return amount * multipliers[i];
    }
  }
  
  return null;
}

/**
 * Extract date from text
 */
export function extractDate(text: string): string | null {
  // Look for common date patterns
  const patterns = [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    /\b\d{4}-\d{2}-\d{2}\b/,
    /\b(fy|fiscal\s+year)\s*\d{4}/i,
    /\b(q[1-4])\s*\d{4}/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * Check if text contains mandate language
 */
export function containsMandateLanguage(text: string): boolean {
  const mandatePatterns = [
    /\b(shall|must|required|mandatory)\b/i,
    /\b(comply|compliance|adherence)\b/i,
    /\b(regulation|directive|order|mandate)\b/i,
    /\b(omb\s+m-|executive\s+order|public\s+law)\b/i,
  ];
  
  return mandatePatterns.some(pattern => pattern.test(text));
}

/**
 * Detect document type from text patterns
 */
export function detectDocumentType(text: string): 'OIG' | 'GAO' | 'NIST' | 'OMB' | 'other' {
  const typePatterns = [
    { pattern: /\b(office\s+of\s+inspector\s+general|oig)\b/i, type: 'OIG' as const },
    { pattern: /\b(government\s+accountability\s+office|gao-\d)/i, type: 'GAO' as const },
    { pattern: /\b(nist|national\s+institute\s+of\s+standards)/i, type: 'NIST' as const },
    { pattern: /\b(omb|office\s+of\s+management\s+and\s+budget|m-\d{2}-\d{2})\b/i, type: 'OMB' as const },
  ];
  
  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }
  
  return 'other';
}
