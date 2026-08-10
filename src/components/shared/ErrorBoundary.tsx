import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En production, brancher ici un service de monitoring (Sentry, etc.)
    // au lieu d'un console.log — volontairement omis pour cette phase.
    void error
    void info
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertTriangle className="h-10 w-10 text-accent" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-dark">Une erreur est survenue</h2>
          <p className="max-w-md text-sm text-gray">
            Quelque chose s'est mal passé. Essayez de rafraîchir la page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Rafraîchir
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
