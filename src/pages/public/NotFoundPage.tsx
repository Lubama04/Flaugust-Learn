import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Compass className="h-12 w-12 text-gray-300" aria-hidden="true" />
      <h1 className="mt-6 text-2xl font-bold text-dark">Page introuvable</h1>
      <p className="mt-2 max-w-md text-gray">Cette page n'existe pas ou a été déplacée.</p>
      <Link to="/" className="mt-6">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  )
}
