// Updated App with Distillation Integration
import React, { useState, useCallback, useEffect } from 'react';
import { generateExecutiveBriefing } from './services/geminiService';
import { validateInputs, validateAllCsvFiles } from './src/services/validation';
import { parseOutput } from './src/services/outputParser';
import { onStatus, emit } from './src/services/status';
import type { PipelineError } from './src/types/errors';
import FileUpload from './components/FileUpload';
import OutputDisplay from './components/OutputDisplay';
import Loader from './components/Loader';
import { LogoIcon, SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [agencyName, setAgencyName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pipelineErrors, setPipelineErrors] = useState<PipelineError[]>([]);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [stageStatuses, setStageStatuses] = useState<Map<string, 'start' | 'ok' | 'fail'>>(new Map());
  const [parsedSections, setParsedSections] = useState<any>(null);
  const [distillationStats, setDistillationStats] = useState<any>(null);

  // Subscribe to status events
  useEffect(() => {
    const unsubscribe = onStatus(({ stage, status, note }) => {
      setStageStatuses(prev => new Map(prev).set(stage, status));
      if (status === 'fail' && note) {
        console.error(`Stage ${stage} failed:`, note);
      }
    });
    return unsubscribe;
  }, []);

  const handleFileChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setApiResponse(null);
    setPipelineErrors([]);
    setDebugData(null);
    setParsedSections(null);
    setDistillationStats(null);
  };

  const handleAgencyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgencyName(e.target.value);
  };

  const handleSubmit = useCallback(async () => {
    // Reset state
    setPipelineErrors([]);
    setApiResponse(null);
    setDebugData(null);
    setParsedSections(null);
    setStageStatuses(new Map());
    setDistillationStats(null);

    // Stage 1: Input Validation
    emit('INPUT_VALIDATION', 'start', 'Validating inputs...');
    const inputErrors = validateInputs(files, agencyName);
    
    if (inputErrors.length > 0) {
      setPipelineErrors(inputErrors);
      emit('INPUT_VALIDATION', 'fail', 'Input validation failed');
      return;
    }

    // Stage 2: CSV Validation
    emit('INPUT_VALIDATION', 'start', 'Checking CSV files...');
    const csvErrors = await validateAllCsvFiles(files);
    
    if (csvErrors.length > 0) {
      setPipelineErrors(csvErrors);
      emit('INPUT_VALIDATION', 'fail', 'CSV validation failed');
      return;
    }
    
    emit('INPUT_VALIDATION', 'ok', 'Validation complete');

    setIsLoading(true);
    setCurrentStage('Processing documents...');
    setProgress(20);

    try {
      // Check if distillation might be needed
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > 300_000) { // 300KB threshold
        setCurrentStage(`Large files detected (${(totalSize / 1024 / 1024).toFixed(1)}MB). May use distillation...`);
      }

      // Stage 3: Generate Briefing (with potential distillation)
      emit('MODEL_CALL', 'start', 'Generating briefing...');
      setProgress(40);
      
      const result = await generateExecutiveBriefing(
        files, 
        agencyName,
        (stage, status, note) => {
          emit(stage, status, note);
          if (stage === 'DISTILLATION') {
            setCurrentStage(`Distillation: ${note || 'Processing...'}`);
            // Update progress based on distillation stage
            if (status === 'start' && note?.includes('%')) {
              const match = note.match(/\((\d+)%\)/);
              if (match) {
                const distillProgress = parseInt(match[1], 10);
                setProgress(20 + (distillProgress * 0.3)); // 20-50% range for distillation
              }
            }
          } else if (stage === 'MODEL_CALL' && status === 'ok') {
            setProgress(80);
          }
        }
      );

      // Store distillation stats if available
      if (result.distillationUsed && result.distillationStats) {
        setDistillationStats(result.distillationStats);
      }

      // Stage 4: Parse Output
      emit('COMPOSE_BRIEFING', 'start', 'Parsing response...');
      setProgress(90);
      
      const parsed = parseOutput(result.rawText);
      
      if (parsed.errors.length > 0) {
        setPipelineErrors(parsed.errors);
        emit('COMPOSE_BRIEFING', 'fail', 'Output parsing had issues');
      } else {
        emit('COMPOSE_BRIEFING', 'ok', 'Briefing composed successfully');
      }

      // Set the response even if there are parsing errors
      setApiResponse(result.rawText);
      setParsedSections(parsed);

      // Store debug data
      setDebugData({
        runId: result.runId,
        promptLength: result.promptLength,
        modelMeta: result.meta,
        rawResponse: result.rawText,
        parsedSections: parsed,
        distillationUsed: result.distillationUsed,
        distillationStats: result.distillationStats,
        timestamp: new Date().toISOString()
      });

      setProgress(100);
      
      // Try to get stored data from localStorage for additional debug info
      try {
        const storedRequest = localStorage.getItem(`gcca.run.${result.runId}.request`);
        const storedMeta = localStorage.getItem(`gcca.run.${result.runId}.meta`);
        const storedDistillation = localStorage.getItem(`gcca.run.${result.runId}.distillation`);
        if (storedRequest || storedMeta) {
          setDebugData(prev => ({
            ...prev,
            storedRequest: storedRequest?.substring(0, 8000),
            storedMeta: storedMeta ? JSON.parse(storedMeta) : null,
            storedDistillation: storedDistillation ? JSON.parse(storedDistillation) : null
          }));
        }
      } catch (e) {
        console.warn('Could not retrieve debug data from localStorage:', e);
      }

    } catch (err: any) {
      // Handle PipelineError
      if (err?.stage) {
        setPipelineErrors([err]);
        emit(err.stage, 'fail', err.message);
      } else {
        // Generic error
        setPipelineErrors([{
          stage: 'MODEL_CALL',
          code: 'MODEL_SERVER_ERROR',
          message: err.message || 'An unexpected error occurred',
          hint: 'Check your internet connection and try again',
          details: err
        }]);
        emit('MODEL_CALL', 'fail', err.message);
      }
      console.error('Pipeline error:', err);
    } finally {
      setIsLoading(false);
      setCurrentStage('');
      setProgress(0);
    }
  }, [files, agencyName]);

  const isButtonDisabled = files.length === 0 || !agencyName || isLoading;

  // Get stage status icon
  const getStageIcon = (stage: string) => {
    const status = stageStatuses.get(stage);
    if (!status) return '○';
    if (status === 'start') return '◔';
    if (status === 'ok') return '✓';
    if (status === 'fail') return '✗';
    return '○';
  };

  // Calculate total file size
  const totalFileSize = files.reduce((sum, f) => sum + f.size, 0);
  const needsDistillation = totalFileSize > 300_000;

  return (
    <div className="min-h-screen bg-navy text-slate font-sans">
      <header className="py-4 px-6 md:px-10 border-b border-light-navy">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LogoIcon className="h-8 w-8 text-brand-accent"/>
            <h1 className="text-2xl font-bold text-lightest-slate">
              GovCon Capture Planner AI
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate">v2.0 - Multi-Stage Pipeline with Distillation</span>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs px-3 py-1 border border-slate rounded hover:bg-light-navy transition"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-light-navy p-6 rounded-lg shadow-lg border border-lightest-navy/20 flex flex-col">
            <h2 className="text-xl font-semibold text-lightest-slate mb-4">
              1. Upload Strategy & Procurement Package
            </h2>
            <p className="text-light-slate mb-4 text-sm">
              Upload documents including:
              • Strategic plans & cyber strategies (.txt, .md)
              • Procurement data & award CSVs (.csv)
              • Capability statements & past performance
              • GAO/IG reports & audit findings
            </p>
            <FileUpload onFileChange={handleFileChange} />

            {/* File Size Indicator */}
            {files.length > 0 && (
              <div className={`mt-2 p-2 rounded text-xs ${needsDistillation ? 'bg-yellow-900/30 text-yellow-300' : 'bg-green-900/30 text-green-300'}`}>
                Total size: {(totalFileSize / 1024 / 1024).toFixed(2)}MB
                {needsDistillation && ' - Will use intelligent distillation to process large files'}
              </div>
            )}

            <h2 className="text-xl font-semibold text-lightest-slate mt-8 mb-4">
              2. Specify Target Agency
            </h2>
            <p className="text-light-slate mb-4 text-sm">
              Enter the exact agency name (e.g., "DOC", "USACE", "IRS", "HHS", "DOI")
            </p>
            <input
              type="text"
              value={agencyName}
              onChange={handleAgencyNameChange}
              placeholder="e.g., DOC"
              className="w-full px-4 py-2 bg-navy border border-lightest-navy rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent text-lightest-slate"
            />

            {/* Error Display */}
            {pipelineErrors.length > 0 && (
              <div className="mt-6 rounded-md border border-rose-700 bg-rose-950/40 p-3 text-rose-200 text-sm space-y-2">
                {pipelineErrors.map((e, idx) => (
                  <div key={idx}>
                    <div className="font-semibold text-rose-300">
                      {e.stage} · {e.code}
                    </div>
                    <div className="text-rose-200">{e.message}</div>
                    {e.hint && (
                      <div className="text-rose-300/80 text-xs mt-1">
                        💡 Hint: {e.hint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pipeline Stage Indicator */}
            {isLoading && (
              <div className="mt-6 p-4 bg-navy rounded-md">
                <div className="text-xs text-light-slate mb-2">
                  Stage: {currentStage}
                </div>
                <div className="w-full bg-lightest-navy rounded-full h-2">
                  <div 
                    className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-slate mt-1">
                  {progress}% complete
                </div>
              </div>
            )}

            {/* Distillation Stats */}
            {distillationStats && (
              <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded text-green-300 text-xs">
                <div className="font-semibold mb-1">✓ Intelligent Distillation Applied</div>
                <div>• Input: {distillationStats.inputSizeMB.toFixed(1)}MB → Output: {distillationStats.outputSizeKB.toFixed(1)}KB</div>
                <div>• Reduction: {distillationStats.reductionRatio}</div>
                <div>• Evidence cards: {distillationStats.cardsGenerated}</div>
                <div>• Top signals: {distillationStats.topSignals.slice(0, 3).join(', ')}</div>
              </div>
            )}

            <div className="mt-auto pt-8">
              <button
                onClick={handleSubmit}
                disabled={isButtonDisabled}
                className={`w-full flex items-center justify-center px-6 py-3 font-bold text-navy rounded-md transition-colors duration-300
                  ${isButtonDisabled
                    ? 'bg-slate cursor-not-allowed'
                    : 'bg-brand-accent hover:bg-opacity-80'
                  }`}
              >
                <SparklesIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Processing Pipeline...' : 'Generate Executive Briefing'}
              </button>
            </div>

            {/* Pipeline Stages with Status */}
            <div className="mt-6 p-4 bg-navy rounded-md text-xs text-slate">
              <div className="font-semibold text-light-slate mb-2">Pipeline Stages:</div>
              <ol className="list-none space-y-1">
                <li className={stageStatuses.get('INPUT_VALIDATION') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('INPUT_VALIDATION') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('INPUT_VALIDATION')} Input Validation
                </li>
                {needsDistillation && (
                  <li className={stageStatuses.get('DISTILLATION') === 'fail' ? 'text-rose-400' : 
                                 stageStatuses.get('DISTILLATION') === 'ok' ? 'text-green-400' : ''}>
                    {getStageIcon('DISTILLATION')} Strategic Information Distillation
                  </li>
                )}
                <li className={stageStatuses.get('DOC_CLASSIFICATION') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('DOC_CLASSIFICATION') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('DOC_CLASSIFICATION')} Document Classification
                </li>
                <li className={stageStatuses.get('FACTS_EXTRACTION') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('FACTS_EXTRACTION') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('FACTS_EXTRACTION')} Strategic Facts Extraction
                </li>
                <li className={stageStatuses.get('PROCUREMENT_ANALYSIS') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('PROCUREMENT_ANALYSIS') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('PROCUREMENT_ANALYSIS')} Procurement Metrics Analysis
                </li>
                <li className={stageStatuses.get('MODEL_CALL') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('MODEL_CALL') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('MODEL_CALL')} AI Model Processing
                </li>
                <li className={stageStatuses.get('COMPOSE_BRIEFING') === 'fail' ? 'text-rose-400' : 
                               stageStatuses.get('COMPOSE_BRIEFING') === 'ok' ? 'text-green-400' : ''}>
                  {getStageIcon('COMPOSE_BRIEFING')} Executive Brief Composition
                </li>
              </ol>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-light-navy p-6 rounded-lg shadow-lg border border-lightest-navy/20 min-h-[70vh] flex flex-col">
            <h2 className="text-xl font-semibold text-lightest-slate mb-4">
              AI-Generated Briefing
            </h2>
            
            {isLoading && (
              <div className="flex-grow flex items-center justify-center">
                <Loader />
              </div>
            )}
            
            {!isLoading && !apiResponse && pipelineErrors.length === 0 && (
              <div className="flex-grow flex items-center justify-center text-center text-slate">
                <div>
                  <p className="mb-4">Your structured executive briefing will appear here.</p>
                  <p className="text-xs">
                    The enhanced pipeline now includes:
                    <br />• Strategic Information Distillation for large files
                    <br />• Clear error messages at every stage
                    <br />• CSV validation with helpful hints
                    <br />• Timeout protection (2 minutes max)
                    <br />• Debug information for troubleshooting
                  </p>
                </div>
              </div>
            )}
            
            {apiResponse && (
              <>
                <OutputDisplay response={apiResponse} />
                
                {/* Parsed Sections Warnings */}
                {parsedSections && parsedSections.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded text-yellow-300 text-xs">
                    <div className="font-semibold mb-1">⚠️ Output parsing warnings:</div>
                    {parsedSections.errors.map((e: PipelineError, idx: number) => (
                      <div key={idx}>• {e.message}</div>
                    ))}
                  </div>
                )}
                
                {/* Debug Panel */}
                {showDebug && debugData && (
                  <div className="mt-4 p-4 bg-navy rounded-md">
                    <h3 className="text-sm font-semibold text-light-slate mb-2">
                      Debug Information
                    </h3>
                    
                    <div className="text-xs text-slate mb-2">
                      Run ID: <code className="bg-lightest-navy/20 px-1 rounded">{debugData.runId}</code>
                    </div>
                    
                    <div className="text-xs text-slate mb-2">
                      Timestamp: {debugData.timestamp}
                    </div>
                    
                    <div className="text-xs text-slate mb-2">
                      Prompt Length: {debugData.promptLength?.toLocaleString()} characters
                    </div>

                    <div className="text-xs text-slate mb-2">
                      Distillation Used: {debugData.distillationUsed ? 'Yes' : 'No'}
                    </div>

                    {debugData.distillationStats && (
                      <details className="text-xs text-slate mt-2">
                        <summary className="cursor-pointer hover:text-light-slate">
                          Distillation Statistics
                        </summary>
                        <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-40">
                          {JSON.stringify(debugData.distillationStats, null, 2)}
                        </pre>
                      </details>
                    )}

                    <details className="text-xs text-slate mt-2">
                      <summary className="cursor-pointer hover:text-light-slate">
                        Model Metadata
                      </summary>
                      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-40">
                        {JSON.stringify(debugData.modelMeta || debugData.storedMeta, null, 2)}
                      </pre>
                    </details>
                    
                    <details className="text-xs text-slate mt-2">
                      <summary className="cursor-pointer hover:text-light-slate">
                        Request Prompt (first 2000 chars)
                      </summary>
                      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                        {debugData.storedRequest?.substring(0, 2000) || 'Not available'}
                      </pre>
                    </details>
                    
                    <details className="text-xs text-slate mt-2">
                      <summary className="cursor-pointer hover:text-light-slate">
                        Raw Response (first 2000 chars)
                      </summary>
                      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                        {debugData.rawResponse?.substring(0, 2000) || 'No response'}
                      </pre>
                    </details>

                    {parsedSections && (
                      <details className="text-xs text-slate mt-2">
                        <summary className="cursor-pointer hover:text-light-slate">
                          Parsed Sections
                        </summary>
                        <div className="mt-2 p-2 bg-lightest-navy/10 rounded">
                          <div>✓ Briefing: {parsedSections.briefingMarkdown ? `${parsedSections.briefingMarkdown.length} chars` : 'Missing'}</div>
                          <div>{parsedSections.signals ? '✓' : '✗'} Signals Ledger</div>
                          <div>{parsedSections.themes ? '✓' : '✗'} Themes Rollup</div>
                          <div>{parsedSections.sources ? '✓' : '✗'} Source Index</div>
                        </div>
                      </details>
                    )}
                    
                    <div className="mt-3 text-xs text-slate/60">
                      💡 Tip: Check browser console for additional logs
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;