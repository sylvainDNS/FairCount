import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  /** Contenu à afficher */
  readonly children: ReactNode;
  /** Composant de fallback personnalisé */
  readonly fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log l'erreur pour debugging (peut être envoyé à un service de monitoring plus tard)
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-4 text-red-500" aria-hidden="true">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Une erreur est survenue
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Nous sommes désolés, quelque chose s'est mal passé. Veuillez réessayer.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={this.handleReset}>
                Réessayer
              </Button>
              <Button onClick={this.handleReload}>Recharger la page</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
