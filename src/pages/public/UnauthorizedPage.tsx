import { Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <ShieldAlert className="h-12 w-12 text-accent" aria-hidden="true" />
      <h1 className="mt-6 text-2xl font-bold text-dark">Accès non autorisé</h1>
      <p className="mt-2 max-w-md text-gray">
        Vous n'avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <Link to="/" className="mt-6">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  )
}
