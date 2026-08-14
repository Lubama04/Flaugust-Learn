import { Outlet, Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-lightGray">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
            FlaugustLearn
          </div>
          <p className="mt-3 text-sm text-gray">
            Plateforme e-learning professionnelle d'Établissement Flaugust Business.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-dark">Navigation</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray">
            <li><Link to="/" className="hover:text-primary">Accueil</Link></li>
            <li><Link to="/catalogue" className="hover:text-primary">Catalogue</Link></li>
            <li><Link to="/inscription" className="hover:text-primary">S'inscrire</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-dark">Compte</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray">
            <li><Link to="/login" className="hover:text-primary">Connexion</Link></li>
            <li><Link to="/verify-certificat" className="hover:text-primary">Vérifier un certificat</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-dark">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray">
            <li>Établissement Flaugust Business</li>
            <li>Tchad</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-4 text-center text-xs text-gray sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Flaugust Business. Tous droits réservés.
      </div>
    </footer>
  )
}
