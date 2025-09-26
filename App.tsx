// App with Fixed Service Integration and Real Telemetry
import React, { useState, useCallback, useEffect } from 'react';
import { generateExecutiveBriefing } from './services/geminiServiceFixed';
import { validateInputs, validateAllCsvFiles } from './src/services/validation';
import { parseOutput } from './src/services/outputParser';
import { onStatus, emit } from './src/services/status';
import type { PipelineError } from './src/types/errors';
import type { RunLedger } from './types/runLedger';
import FileUpload from './components/FileUpload';
import OutputDisplay from './components/OutputDisplay';
import Loader from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';
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
  const [runLedger, setRunLedger] = useState<RunLedger | null>(null);
  const [parsedSections, setParsedSections] = useState<any>(null);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [rawResponses, setRawResponses] = useState<any>(null);

  // Subscribe to status events
  useEffect(() => {
    const unsubscribe = onStatus(({ stage, status, note }) => {
      console.log(`Stage update: ${stage} - ${status} - ${note}`);
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
    setRunLedger(null);
    setRawResponses(null);
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
    setRunLedger(null);
    setRawResponses(null);
    setShowRaw(false);

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

      // Stage 3: Generate Briefing with ledger tracking
      emit('MODEL_CALL', 'start', 'Generating briefing...');
      setProgress(40);
      
      const result = await generateExecutiveBriefing(
        files, 
        agencyName,
        (stage, status, note) => {
          emit(stage, status, note);
          setCurrentStage(`${stage}: ${note || status}`);
          
          // Update progress based on stage
          if (stage === 'PROCUREMENT_METRICS') {
            setProgress(30);
          } else if (stage.includes('DISTILL')) {
            if (note?.includes('%')) {
              const match = note.match(/\((\d+)%\)/);
              if (match) {
                const distillProgress = parseInt(match[1], 10);
                setProgress(30 + (distillProgress * 0.3)); // 30-60% range
              }
            } else {
              setProgress(50);
            }
          } else if (stage === 'BRIEFING_MD') {
            setProgress(70);
          } else if (stage === 'PLAYS_MD') {
            setProgress(80);
          } else if (stage === 'PROCUREMENT_JSON') {
            setProgress(85);
          } else if (stage === 'ANNEX_JSON') {
            setProgress(90);
          }
        }
      );

      // Store the run ledger
      if (result.ledger) {
        setRunLedger(result.ledger);
      }

      // Stage 4: Parse Output
      emit('COMPOSE_BRIEFING', 'start', 'Parsing response...');
      setProgress(95);
      
      const parsed = result.parsedSections || parseOutput(result.rawText);
      
      if (parsed.errors && parsed.errors.length > 0) {
        setPipelineErrors(parsed.errors);
        emit('COMPOSE_BRIEFING', 'fail', 'Output parsing had issues');
      } else {
        emit('COMPOSE_BRIEFING', 'ok', 'Briefing composed successfully');
      }

      // Set the response and sections
      setApiResponse(result.rawText);
      setParsedSections(parsed);
      setRawResponses(result);

      // Store debug data including ledger
      setDebugData({
        runId: result.runId,
        promptLength: result.promptLength,
        ledger: result.ledger,
        modelMeta: result.meta,
        rawResponse: result.rawText,
        parsedSections: parsed,
        distillationUsed: result.distillationUsed,
        distillationStats: result.distillationStats,
        timestamp: new Date().toISOString()
      });

      setProgress(100);
      
      // Try to get stored prompts from localStorage
      try {
        const runId = result.runId;
        const storedBriefing = localStorage.getItem(`gcca.run.${runId}.prompt.briefing`);
        const storedProcurement = localStorage.getItem(`gcca.run.${runId}.prompt.procurement`);
        if (storedBriefing || storedProcurement) {
          setDebugData(prev => ({
            ...prev,
            prompts: {
              briefing: storedBriefing?.substring(0, 2000),
              procurement: storedProcurement
            }
          }));
        }
      } catch (e) {
        console.warn('Could not retrieve prompts from localStorage:', e);
      }

    } catch (err: any) {
      // Handle errors
      if (err?.stage) {
        setPipelineErrors([err]);
        emit(err.stage, 'fail', err.message);
      } else {
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

  // Get stage status from ledger
  const getStageIcon = (stageKey: string) => {
    if (!runLedger) return '○';
    const stage = runLedger.stages[stageKey as keyof typeof runLedger.stages];
    if (!stage) return '○';
    if (stage.error) return '✗';
    if (stage.degraded) return '⚠';
    if (stage.done) return '✓';
    if (stage.started) return '◔';
    return '○';
  };

  const getStageClass = (stageKey: string) => {
    if (!runLedger) return '';
    const stage = runLedger.stages[stageKey as keyof typeof runLedger.stages];
    if (!stage) return '';
    if (stage.error) return 'text-rose-400';
    if (stage.degraded) return 'text-yellow-400';
    if (stage.done) return 'text-green-400';
    if (stage.started) return 'text-blue-400';
    return '';
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
            <span className="text-xs text-slate">v2.0 - Fixed Pipeline with Real Metrics</span>
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
              • <span className="text-yellow-300">Procurement data & award CSVs (.csv) - REQUIRED</span>
              • Capability statements & past performance
              • GAO/IG reports & audit findings
            </p>
            <FileUpload onFileChange={handleFileChange} />

            {/* File Size and CSV Indicator */}
            {files.length > 0 && (
              <div className="space-y-2 mt-2">
                <div className={`p-2 rounded text-xs ${needsDistillation ? 'bg-yellow-900/30 text-yellow-300' : 'bg-green-900/30 text-green-300'}`}>
                  Total size: {(totalFileSize / 1024 / 1024).toFixed(2)}MB
                  {needsDistillation && ' - Will use intelligent distillation'}
                </div>
                {files.find(f => f.name.toLowerCase().endsWith('.csv')) ? (
                  <div className="p-2 rounded text-xs bg-green-900/30 text-green-300">
                    ✓ CSV file detected - procurement metrics will be extracted
                  </div>
                ) : (
                  <div className="p-2 rounded text-xs bg-yellow-900/30 text-yellow-300">
                    ⚠ No CSV file - using placeholder procurement data
                  </div>
                )}
              </div>
            )}

            <h2 className="text-xl font-semibold text-lightest-slate mt-8 mb-4">
              2. Specify Target Agency
            </h2>
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

            {/* Current Stage Indicator */}
            {isLoading && (
              <div className="mt-6 p-4 bg-navy rounded-md">
                <div className="text-xs text-light-slate mb-2">
                  {currentStage}
                </div>
                <div className="w-full bg-lightest-navy rounded-full h-2">
                  <div 
                    className="bg-brand-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Procurement Metrics Display */}
            {runLedger?.procurement?.metrics && (
              <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded text-green-300 text-xs">
                <div className="font-semibold mb-2">✓ Procurement Metrics Extracted</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Total Value: ${(runLedger.procurement.metrics.totalContractValue / 1_000_000).toFixed(1)}M</div>
                  <div>Active Contracts: {runLedger.procurement.metrics.totalActions}</div>
                  <div>Small Biz: {runLedger.procurement.metrics.small_business_percentage || runLedger.procurement.metrics.smallBizPct}%</div>
                  <div>Expiring ≤180d: ${((runLedger.procurement.metrics.expiringNext180Days || 0) / 1_000_000).toFixed(1)}M</div>
                </div>
                {runLedger.procurement.metrics.topVehicles?.length > 0 && (
                  <div className="mt-2">
                    Top Vehicles: {runLedger.procurement.metrics.topVehicles.slice(0, 3).map(v => v.key).join(', ')}
                  </div>
                )}
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

            {/* Pipeline Stages with Real Status from Ledger */}
            <div className="mt-6 p-4 bg-navy rounded-md text-xs text-slate">
              <div className="font-semibold text-light-slate mb-2">Pipeline Stages:</div>
              <ol className="list-none space-y-1">
                <li className={getStageClass('input_validation')}>
                  {getStageIcon('input_validation')} Input Validation
                </li>
                <li className={getStageClass('procurement_metrics')}>
                  {getStageIcon('procurement_metrics')} Procurement Metrics Analysis
                </li>
                <li className={getStageClass('two_tier_distill')}>
                  {getStageIcon('two_tier_distill')} Two-tier Distillation
                  {runLedger?.stages.two_tier_distill?.degraded && (
                    <span className="ml-2 text-yellow-400">(degraded)</span>
                  )}
                </li>
                <li className={getStageClass('basic_distill')}>
                  {getStageIcon('basic_distill')} Basic Distillation (fallback)
                </li>
                <li className={getStageClass('prompt_compose')}>
                  {getStageIcon('prompt_compose')} Prompt Composition
                </li>
                <li className={getStageClass('api_calls')}>
                  {getStageIcon('api_calls')} API Calls (4 parallel)
                </li>
                <li className={getStageClass('annex_parsed')}>
                  {getStageIcon('annex_parsed')} Annex Parsing
                </li>
                <li className={getStageClass('rendered')}>
                  {getStageIcon('rendered')} Final Rendering
                </li>
              </ol>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-light-navy p-6 rounded-lg shadow-lg border border-lightest-navy/20 min-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-lightest-slate">
                AI-Generated Briefing
              </h2>
              {apiResponse && (
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-xs px-3 py-1 bg-navy border border-slate rounded hover:bg-lightest-navy/20 transition"
                >
                  {showRaw ? 'Hide Raw' : 'Show Raw'}
                </button>
              )}
            </div>
            
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
                    Fixed pipeline features:
                    <br />• ✓ Real procurement metrics from CSV
                    <br />• ✓ Graceful degradation (no hard failures)
                    <br />• ✓ Actual runtime telemetry
                    <br />• ✓ Theme coverage tracking
                    <br />• ✓ Metrics injection into all prompts
                  </p>
                </div>
              </div>
            )}
            
            {apiResponse && !showRaw && (
              <ErrorBoundary>
                <OutputDisplay response={apiResponse} />
                
                {/* Quality Indicators */}
                {runLedger?.quality && (
                  <div className={`mt-4 p-3 rounded text-xs ${
                    runLedger.quality.overall === 'PASSED' 
                      ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                      : 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-300'
                  }`}>
                    <div className="font-semibold">
                      Quality: {runLedger.quality.overall}
                      {runLedger.quality.reason && ` - ${runLedger.quality.reason}`}
                    </div>
                    {runLedger.quality.citationCoverage > 0 && (
                      <div>Citation Coverage: {Math.round(runLedger.quality.citationCoverage)}%</div>
                    )}
                  </div>
                )}
                
                {/* Coverage Report */}
                {runLedger?.coverage && (
                  <details className="mt-4 p-3 bg-navy rounded text-xs">
                    <summary className="cursor-pointer text-light-slate hover:text-lightest-slate">
                      Theme Coverage Report
                    </summary>
                    <div className="mt-2 space-y-1">
                      {runLedger.coverage.covered?.length > 0 && (
                        <div className="text-green-400">
                          ✓ Covered: {runLedger.coverage.covered.join(', ')}
                        </div>
                      )}
                      {runLedger.coverage.weak?.length > 0 && (
                        <div className="text-yellow-400">
                          ⚠ Weak: {runLedger.coverage.weak.join(', ')}
                        </div>
                      )}
                      {runLedger.coverage.missing?.length > 0 && (
                        <div className="text-rose-400">
                          ✗ Missing: {runLedger.coverage.missing.join(', ')}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </ErrorBoundary>
            )}

            {/* Raw Response Display */}
            {showRaw && rawResponses && (
              <div className="flex-grow overflow-auto">
                <pre className="text-xs p-4 bg-navy rounded whitespace-pre-wrap">
                  {JSON.stringify({
                    runId: rawResponses.runId,
                    promptLength: rawResponses.promptLength,
                    distillationUsed: rawResponses.distillationUsed,
                    ledger: rawResponses.ledger,
                    parsedSections: rawResponses.parsedSections,
                    rawText: rawResponses.rawText
                  }, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Debug Panel */}
            {showDebug && debugData && (
              <div className="mt-4 p-4 bg-navy rounded-md">
                <h3 className="text-sm font-semibold text-light-slate mb-2">
                  Debug Information
                </h3>
                
                <div className="text-xs space-y-2">
                  <div className="text-slate">
                    Run ID: <code className="bg-lightest-navy/20 px-1 rounded">{debugData.runId}</code>
                  </div>
                  
                  <div className="text-slate">
                    Total Prompt Size: {debugData.promptLength?.toLocaleString()} chars
                  </div>

                  {runLedger?.callsExecuted && (
                    <div className="text-slate">
                      API Calls: {runLedger.callsExecuted.join(', ')}
                    </div>
                  )}

                  {runLedger?.fallback && (
                    <div className="text-yellow-400">
                      Fallback: {runLedger.fallback.stage} - {runLedger.fallback.reason}
                      {runLedger.fallback.highSignal && ` (${runLedger.fallback.highSignal} cards)`}
                    </div>
                  )}

                  {debugData.prompts && (
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:text-light-slate">
                        View Prompts (first 2000 chars)
                      </summary>
                      <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-40 whitespace-pre-wrap text-[10px]">
                        {debugData.prompts.briefing || 'Not available'}
                      </pre>
                    </details>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer hover:text-light-slate">
                      Full Ledger
                    </summary>
                    <pre className="mt-2 p-2 bg-lightest-navy/10 rounded overflow-x-auto max-h-60 text-[10px]">
                      {JSON.stringify(runLedger, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
