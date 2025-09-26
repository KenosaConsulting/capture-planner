// Event bus for pipeline status updates

export type StatusListener = (status: { 
  stage: string; 
  status: 'start' | 'ok' | 'fail'; 
  note?: string 
}) => void;

const listeners: StatusListener[] = [];

export function onStatus(listener: StatusListener) {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function emit(stage: string, status: 'start' | 'ok' | 'fail', note?: string) {
  listeners.forEach(l => l({ stage, status, note }));
}

// Helper to emit all three states for a successful operation
export function emitSuccess(stage: string, note?: string) {
  emit(stage, 'start', note);
  setTimeout(() => emit(stage, 'ok', note), 100);
}

// Helper to emit failure with error details
export function emitError(stage: string, error: any) {
  const message = error?.message || String(error);
  emit(stage, 'fail', message);
}
