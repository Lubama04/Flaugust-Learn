import { Link, useNavigate } from '@tanstack/react-router'
import { GraduationCap, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { signOut, dashboardPathForRole } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/catalogue', label: 'Catalogue' },
] as const

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()
  const session = useAuthStore((s) => s.session)
  const { data: profile } = useProfile()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Déconnexion réussie')
      await navigate({ to: '/' })
    } catch {
      toast.error('Erreur lors de la déconnexion')
    }
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-primary">
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
          FlaugustLearn
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-gray hover:text-primary"
              activeProps={{ className: 'text-primary' }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {session && profile ? (
            <>
              <Link
                to={dashboardPathForRole(profile.role)}
                className="text-sm font-medium text-gray hover:text-primary"
              >
                Tableau de bord
              </Link>
              <Link to="/profil">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link to="/inscription">
                <Button>Commencer gratuitement</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Ouvrir le menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm font-medium text-dark" onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          {session && profile ? (
            <>
              <Link to={dashboardPathForRole(profile.role)} className="text-sm font-medium text-dark" onClick={() => setMenuOpen(false)}>
                Tableau de bord
              </Link>
              <Link to="/profil" className="text-sm font-medium text-dark" onClick={() => setMenuOpen(false)}>
                Mon profil
              </Link>
              <Button variant="outline" onClick={handleSignOut}>
                Se déconnecter
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full">
                  Connexion
                </Button>
              </Link>
              <Link to="/inscription" onClick={() => setMenuOpen(false)}>
                <Button className="w-full">Commencer gratuitement</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
