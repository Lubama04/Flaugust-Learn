import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

/**
 * Filet de sécurité pour toute erreur de rendu React non rattrapée : affiche un message propre
 * plutôt qu'un écran blanc ou la page d'erreur générique de la plateforme d'hébergement.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur application non rattrapée :', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-lightGray p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="mb-4 text-5xl">😕</div>
            <h1 className="mb-2 text-xl font-bold text-dark">Une erreur est survenue</h1>
            <p className="mb-6 text-gray">
              Ne vous inquiétez pas, vos données sont sauvegardées. Rechargez la page pour continuer.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Recharger la page
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/'
              }}
              className="mt-3 text-sm text-gray-400 transition-colors hover:text-gray"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
