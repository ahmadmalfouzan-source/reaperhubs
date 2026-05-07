import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border-2 border-danger/20 rounded-[40px] p-10 text-center space-y-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 blur-[60px] pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto border border-danger/20 group-hover:scale-110 transition-transform duration-500">
               <AlertTriangle className="w-10 h-10 text-danger" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">System Malfunction</h2>
              <p className="text-muted text-sm italic leading-relaxed">
                Critical failure detected in the neural link. Transmission has been severed.
              </p>
              {this.state.error && (
                <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-mono text-danger/70 text-left overflow-auto max-h-32 scrollbar-none">
                   {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-3 py-4 bg-danger text-black font-bold rounded-2xl hover:bg-danger/90 transition-all shadow-lg shadow-danger/20 active:scale-95"
              >
                <RefreshCcw size={18} />
                Reboot System
              </button>
              <a
                href="/dashboard"
                className="w-full flex items-center justify-center gap-3 py-4 bg-surface-2 border border-border text-white font-bold rounded-2xl hover:bg-surface-3 transition-all active:scale-95"
              >
                <Home size={18} />
                Return to HQ
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
