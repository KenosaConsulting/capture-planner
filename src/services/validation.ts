// Input validation and CSV preflight checks
import type { PipelineError } from '../types/errors';

// Required headers for USASpending CSV files
const REQUIRED_HEADERS = [
  'contract_award_unique_key',
  'award_base_action_date',
  'product_or_service_code',
  'naics_code',
  'total_obligated_amount'
];

// Alternative headers that might be present
const ALTERNATIVE_HEADERS: { [key: string]: string[] } = {
  'contract_award_unique_key': ['award_id', 'contract_id', 'award_unique_key'],
  'award_base_action_date': ['action_date', 'award_date', 'date'],
  'product_or_service_code': ['psc', 'psc_code', 'product_service_code'],
  'naics_code': ['naics', 'industry_code'],
  'total_obligated_amount': ['amount', 'obligated_amount', 'total_amount', 'value']
};

export async function sniffCsv(file: File): Promise<{ 
  headers: string[]; 
  rowCount: number;
  delimiter: string;
}> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  
  if (lines.length === 0) {
    return { headers: [], rowCount: 0, delimiter: ',' };
  }

  // Detect delimiter
  const firstLine = lines[0];
  const delimiters = [',', '\t', ';', '|'];
  let delimiter = ',';
  let maxCount = 0;
  
  for (const delim of delimiters) {
    const count = (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      delimiter = delim;
    }
  }

  // Parse headers
  const headers = firstLine
    .split(delimiter)
    .map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  return { 
    headers, 
    rowCount: lines.length - 1, // Subtract header row
    delimiter 
  };
}

export async function validateCsv(file: File): Promise<PipelineError[]> {
  const errors: PipelineError[] = [];
  
  try {
    const { headers, rowCount, delimiter } = await sniffCsv(file);
    
    // Check if CSV is empty
    if (rowCount === 0) {
      errors.push({ 
        stage: 'INPUT_VALIDATION', 
        code: 'CSV_EMPTY', 
        message: `${file.name} has no data rows.`,
        hint: 'Ensure your CSV file contains actual procurement data, not just headers.' 
      });
      return errors;
    }

    // Check for required headers (with alternatives)
    const missingHeaders: string[] = [];
    
    for (const required of REQUIRED_HEADERS) {
      const alternatives = ALTERNATIVE_HEADERS[required] || [];
      const allPossible = [required, ...alternatives];
      
      if (!allPossible.some(h => headers.includes(h))) {
        missingHeaders.push(required);
      }
    }
    
    if (missingHeaders.length > 0) {
      errors.push({
        stage: 'INPUT_VALIDATION',
        code: 'CSV_HEADER_MISMATCH',
        message: `${file.name} missing required columns.`,
        hint: `Missing: ${missingHeaders.join(', ')}. Export full schema from USASpending.gov or ensure column names match.`,
        details: { headers, missing: missingHeaders, delimiter }
      });
    }

    // Warn if CSV is suspiciously small
    if (rowCount < 10 && errors.length === 0) {
      console.warn(`Warning: ${file.name} only has ${rowCount} rows. Consider using a larger dataset for better analysis.`);
    }

  } catch (error) {
    errors.push({
      stage: 'INPUT_VALIDATION',
      code: 'CSV_EMPTY',
      message: `Failed to read ${file.name}.`,
      hint: 'Ensure the file is a valid CSV format.',
      details: error
    });
  }

  return errors;
}

export function validateInputs(files: File[], agency: string): PipelineError[] {
  const errors: PipelineError[] = [];
  
  // Check agency name
  if (!agency || agency.trim() === '') {
    errors.push({ 
      stage: 'INPUT_VALIDATION', 
      code: 'MISSING_AGENCY', 
      message: 'Enter a target agency.', 
      hint: 'Use DOC, USACE, IRS, HHS, DOI, or other valid agency codes.' 
    });
  }
  
  // Check files
  if (files.length === 0) {
    errors.push({ 
      stage: 'INPUT_VALIDATION', 
      code: 'MISSING_FILES', 
      message: 'No files uploaded.', 
      hint: 'Upload strategy docs (.txt/.md) and a CSV of awards.' 
    });
  } else {
    // Check for CSV
    const hasCSV = files.some(f => f.name.toLowerCase().endsWith('.csv'));
    if (!hasCSV) {
      errors.push({ 
        stage: 'INPUT_VALIDATION', 
        code: 'CSV_EMPTY', 
        message: 'No CSV provided.', 
        hint: 'Upload an awards CSV for procurement metrics analysis.' 
      });
    }

    // Check for strategy docs
    const hasStrategyDoc = files.some(f => 
      f.name.toLowerCase().endsWith('.txt') || 
      f.name.toLowerCase().endsWith('.md')
    );
    if (!hasStrategyDoc) {
      errors.push({
        stage: 'INPUT_VALIDATION',
        code: 'MISSING_FILES',
        message: 'No strategy documents provided.',
        hint: 'Upload .txt or .md files containing strategic plans or cyber strategies.'
      });
    }

    // Check for unsupported file types
    const unsupportedFiles = files.filter(f => {
      const ext = f.name.toLowerCase().split('.').pop();
      return !['csv', 'txt', 'md'].includes(ext || '');
    });
    
    if (unsupportedFiles.length > 0) {
      errors.push({
        stage: 'INPUT_VALIDATION',
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `Unsupported file types detected.`,
        hint: `Only .csv, .txt, and .md files are supported. Remove: ${unsupportedFiles.map(f => f.name).join(', ')}`,
        details: { unsupportedFiles: unsupportedFiles.map(f => f.name) }
      });
    }
  }
  
  return errors;
}

// Validate all CSV files in the input
export async function validateAllCsvFiles(files: File[]): Promise<PipelineError[]> {
  const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
  const allErrors: PipelineError[] = [];
  
  for (const csvFile of csvFiles) {
    const errors = await validateCsv(csvFile);
    allErrors.push(...errors);
  }
  
  return allErrors;
}
