import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo | null) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  lastStage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      lastStage: 'INIT'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('ErrorBoundary caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary details:', { error, errorInfo });
    
    // Get last known stage from localStorage
    let lastStage = 'UNKNOWN';
    try {
      const runs = Object.keys(localStorage)
        .filter(k => k.startsWith('gcca.run.'))
        .sort()
        .reverse();
      if (runs.length > 0) {
        const runId = runs[0].match(/gcca\.run\.(\d+)/)?.[1];
        lastStage = localStorage.getItem(`gcca.stage.${runId}`) || 'UNKNOWN';
      }
    } catch (e) {
      console.warn('Could not retrieve last stage');
    }
    
    this.setState({
      error,
      errorInfo,
      lastStage
    });
  }

  copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      lastStage: this.state.lastStage,
      error: {
        message: this.state.error?.message,
        stack: this.state.error?.stack
      },
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      localStorage: Object.keys(localStorage).filter(k => k.startsWith('gcca.'))
    };
    
    const text = JSON.stringify(diagnostics, null, 2);
    navigator.clipboard.writeText(text);
    alert('Diagnostics copied to clipboard');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo);
      }

      return (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 m-4">
          <h2 className="text-xl font-bold text-red-400 mb-4">
            Application Error Caught
          </h2>
          
          <div className="space-y-4">
            <div className="bg-red-950/50 rounded p-4">
              <p className="text-red-300 font-semibold mb-2">Error Message:</p>
              <code className="text-red-200 text-sm">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>

            <div className="text-sm text-red-200">
              <p><strong>Last Pipeline Stage:</strong> {this.state.lastStage}</p>
              <p><strong>Component:</strong> {this.state.errorInfo?.componentStack?.split('\n')[1]?.trim() || 'Unknown'}</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={this.copyDiagnostics}
                className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded transition"
              >
                Copy Diagnostics
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded transition"
              >
                Reload Page
              </button>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-red-300 hover:text-red-200">
                Show Stack Trace
              </summary>
              <pre className="mt-2 p-4 bg-red-950/50 rounded text-xs text-red-200 overflow-auto max-h-60">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;