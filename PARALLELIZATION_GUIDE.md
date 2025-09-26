# Parallelization Implementation Guide (Priority 2)

## Quick Win: 40-50% Latency Reduction

Now that the two-tier evidence system is complete, here's how to implement parallelization for immediate performance gains.

## Current Sequential Flow (Slow)
```
BRIEFING_MD ----→ PLAYS_MD ----→ PROCUREMENT_JSON ----→ ANNEX_JSON
   (7s)            (7s)             (5s)                (6s)
                    Total: ~25-30 seconds
```

## Optimized Parallel Flow (Fast)
```
BRIEFING_MD ─┐
             ├─→ PROCUREMENT_JSON ─→ ANNEX_JSON
PLAYS_MD ────┘         (5s)            (6s)
  (7s parallel)
              Total: ~13-18 seconds (40-50% faster!)
```

## Implementation Code

### Step 1: Update twoTierOrchestrator.ts

Add this parallel execution function:

```typescript
/**
 * Execute API calls with parallelization
 * BRIEFING_MD and PLAYS_MD run in parallel
 * PROCUREMENT and ANNEX remain sequential
 */
async function executeParallelApiCalls(
  prompts: any,
  procurementMetrics: any,
  onProgress?: (stage: string, status: 'start' | 'ok' | 'fail', note?: string) => void
): Promise<{
  briefing: string | null;
  plays: string | null;
  procurement: any;
  annex: any;
  errors: PipelineError[];
}> {
  const results = {
    briefing: null as string | null,
    plays: null as string | null,
    procurement: null as any,
    annex: null as any,
    errors: [] as PipelineError[]
  };
  
  // PARALLEL GROUP 1: Briefing and Plays (independent)
  console.log('Starting parallel execution: BRIEFING_MD + PLAYS_MD');
  const parallelStartTime = Date.now();
  
  const [briefingResult, playsResult] = await Promise.allSettled([
    makeApiCall(prompts.briefing, 'BRIEFING_MD', onProgress),
    makeApiCall(prompts.plays, 'PLAYS_MD', onProgress)
  ]);
  
  const parallelTime = Date.now() - parallelStartTime;
  console.log(`Parallel execution completed in ${parallelTime}ms`);
  
  // Process briefing result
  if (briefingResult.status === 'fulfilled') {
    const match = briefingResult.value.text.match(/```markdown\n([\s\S]*?)\n```/);
    results.briefing = match ? match[1] : briefingResult.value.text;
  } else {
    results.errors.push({
      stage: 'BRIEFING_MD',
      code: 'PARALLEL_FAIL',
      message: briefingResult.reason?.message || 'Briefing generation failed',
      hint: 'Check prompt size and API limits'
    });
  }
  
  // Process plays result
  if (playsResult.status === 'fulfilled') {
    const match = playsResult.value.text.match(/```markdown\n([\s\S]*?)\n```/);
    results.plays = match ? match[1] : playsResult.value.text;
  } else {
    results.errors.push({
      stage: 'PLAYS_MD',
      code: 'PARALLEL_FAIL',
      message: playsResult.reason?.message || 'Plays generation failed',
      hint: 'Check prompt size and API limits'
    });
  }
  
  // SEQUENTIAL GROUP: Procurement then Annex
  // (These could be parallel too if they don't depend on each other)
  console.log('Starting sequential execution: PROCUREMENT_JSON → ANNEX_JSON');
  
  try {
    const procResult = await makeApiCall(prompts.procurement, 'PROCUREMENT_JSON', onProgress);
    const procMatch = procResult.text.match(/```json\n([\s\S]*?)\n```/);
    if (procMatch) {
      results.procurement = JSON.parse(procMatch[1]);
    }
  } catch (error: any) {
    console.error('PROCUREMENT_JSON failed:', error);
    results.procurement = procurementMetrics; // Fallback
  }
  
  try {
    const annexResult = await makeApiCall(prompts.annex, 'ANNEX_JSON', onProgress);
    const annexMatch = annexResult.text.match(/```json\n([\s\S]*?)\n```/);
    if (annexMatch) {
      results.annex = JSON.parse(annexMatch[1]);
    }
  } catch (error: any) {
    console.error('ANNEX_JSON failed:', error);
    results.errors.push({
      stage: 'ANNEX_JSON',
      code: 'SEQUENTIAL_FAIL',
      message: 'Annex generation failed',
      hint: 'Check dependencies and retry'
    });
  }
  
  return results;
}
```

### Step 2: Add Concurrency Control

```typescript
class ConcurrencyManager {
  private activeRequests = 0;
  private readonly maxConcurrent = 2; // Cap at 2-3 simultaneous
  private readonly queue: Array<() => Promise<any>> = [];
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at capacity
    while (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activeRequests++;
    try {
      return await fn();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }
  
  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.execute(next);
      }
    }
  }
}

const concurrencyManager = new ConcurrencyManager();
```

### Step 3: Add Retry Logic for Transient Failures

```typescript
async function makeApiCallWithRetry(
  prompt: string,
  stage: string,
  maxRetries: number = 1,
  onProgress?: (stage: string, status: 'start' | 'ok' | 'fail', note?: string) => void
): Promise<{ text: string; meta: any }> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry ${attempt}/${maxRetries} for ${stage}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
      
      return await makeApiCall(prompt, stage, onProgress, 60000); // Shorter timeout for retries
      
    } catch (error: any) {
      lastError = error;
      
      // Only retry on transient errors
      const isTransient = 
        error.code === 'TIMEOUT' ||
        error.message?.includes('503') ||
        error.message?.includes('502') ||
        error.message?.includes('Network');
      
      if (!isTransient || attempt === maxRetries) {
        throw error;
      }
      
      onProgress?.(stage, 'start', `Retrying due to transient error...`);
    }
  }
  
  throw lastError;
}
```

### Step 4: Update Progress Tracking for Parallel Execution

```typescript
interface ParallelProgress {
  briefing: 'pending' | 'running' | 'complete' | 'failed';
  plays: 'pending' | 'running' | 'complete' | 'failed';
  procurement: 'pending' | 'running' | 'complete' | 'failed';
  annex: 'pending' | 'running' | 'complete' | 'failed';
  overallPercent: number;
}

function calculateOverallProgress(progress: ParallelProgress): number {
  const weights = {
    briefing: 30,
    plays: 30,
    procurement: 20,
    annex: 20
  };
  
  let total = 0;
  
  for (const [key, status] of Object.entries(progress)) {
    if (key === 'overallPercent') continue;
    
    const weight = weights[key as keyof typeof weights];
    if (status === 'complete') total += weight;
    else if (status === 'running') total += weight * 0.5;
  }
  
  return total;
}
```

### Step 5: Monitor and Log Performance

```typescript
interface LatencyMetrics {
  briefing_ms: number;
  plays_ms: number;
  procurement_ms: number;
  annex_ms: number;
  parallel_group_ms: number;
  sequential_group_ms: number;
  total_ms: number;
  speedup_ratio: number;
}

function logLatencyMetrics(metrics: LatencyMetrics) {
  console.table({
    'Parallel Group (Briefing + Plays)': `${metrics.parallel_group_ms}ms`,
    'Sequential Group (Procurement + Annex)': `${metrics.sequential_group_ms}ms`,
    'Total Time': `${metrics.total_ms}ms`,
    'Speedup vs Sequential': `${metrics.speedup_ratio.toFixed(1)}x faster`
  });
  
  // Store for analytics
  localStorage.setItem('latency_metrics', JSON.stringify(metrics));
}
```

## Testing the Parallelization

### Test Script
```typescript
// Test with timing
async function testParallelPerformance() {
  console.log('Testing parallel vs sequential performance...');
  
  // Sequential baseline
  const seqStart = Date.now();
  await makeApiCall(prompts.briefing, 'BRIEFING_MD');
  await makeApiCall(prompts.plays, 'PLAYS_MD');
  const seqTime = Date.now() - seqStart;
  
  // Parallel optimized
  const parStart = Date.now();
  await Promise.all([
    makeApiCall(prompts.briefing, 'BRIEFING_MD'),
    makeApiCall(prompts.plays, 'PLAYS_MD')
  ]);
  const parTime = Date.now() - parStart;
  
  console.log(`Sequential: ${seqTime}ms`);
  console.log(`Parallel: ${parTime}ms`);
  console.log(`Speedup: ${(seqTime / parTime).toFixed(1)}x`);
}
```

## Acceptance Tests

### 1. Latency Reduction Test
```typescript
it('should reduce latency by 40-50%', async () => {
  const sequentialTime = await measureSequentialTime();
  const parallelTime = await measureParallelTime();
  
  const reduction = (sequentialTime - parallelTime) / sequentialTime;
  expect(reduction).toBeGreaterThan(0.4); // At least 40% reduction
});
```

### 2. No Race Conditions Test
```typescript
it('should produce consistent results across multiple runs', async () => {
  const runs = await Promise.all([
    runParallelPipeline(testData),
    runParallelPipeline(testData),
    runParallelPipeline(testData)
  ]);
  
  // All runs should produce identical structure
  expect(runs[0].structure).toEqual(runs[1].structure);
  expect(runs[1].structure).toEqual(runs[2].structure);
});
```

### 3. Error Isolation Test
```typescript
it('should isolate failures in parallel calls', async () => {
  // Simulate PLAYS_MD failure
  const result = await runParallelWithFailure('PLAYS_MD');
  
  expect(result.briefing).toBeDefined(); // Should still work
  expect(result.plays).toBeNull(); // Should fail gracefully
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].stage).toBe('PLAYS_MD');
});
```

## Configuration Options

```typescript
interface ParallelConfig {
  enabled: boolean;              // Feature flag for parallelization
  maxConcurrent: number;          // Max simultaneous calls (2-3)
  retryEnabled: boolean;          // Enable fast retries
  timeoutMs: number;              // Per-call timeout
  bufferResults: boolean;         // Buffer until complete
}

const parallelConfig: ParallelConfig = {
  enabled: true,
  maxConcurrent: 2,
  retryEnabled: true,
  timeoutMs: 60000,
  bufferResults: true
};
```

## Rollback Plan

If parallelization causes issues:

```typescript
// Feature flag to disable
if (!parallelConfig.enabled) {
  return executeSequentialApiCalls(prompts, procurementMetrics, onProgress);
}

// Metrics to monitor
- Error rate increase > 5%
- Timeout rate increase > 10%  
- Quality gate failures increase
- User complaints about inconsistency
```

## Expected Results

### Before Parallelization:
- Total latency: 25-30 seconds
- User experience: Sequential progress bar
- Error handling: Fail-fast on first error

### After Parallelization:
- Total latency: **13-18 seconds (40-50% reduction)**
- User experience: Parallel progress indicators
- Error handling: Isolated failures, partial success possible

## Next Steps

1. **Implement the parallel execution function** in twoTierOrchestrator.ts
2. **Add concurrency control** to prevent API overload
3. **Test with real data** to verify latency improvements
4. **Monitor error rates** during rollout
5. **Consider parallelizing PROCUREMENT + ANNEX** if independent (additional 3-4s savings)

The infrastructure from the two-tier system makes this straightforward - the prompts are already pre-composed and isolated, so parallelization is just a matter of changing the execution pattern!
