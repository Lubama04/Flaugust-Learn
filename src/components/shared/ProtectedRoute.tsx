import { type ReactNode, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { useProfile } from '@/hooks/useProfile'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: ReactNode
  /** Si omis, toute personne connectée est autorisée. */
  allowedRoles?: UserRole[]
}

/**
 * Garde de route côté client : vérifie session + rôle.
 * Redirige vers /login si non connecté, /unauthorized si mauvais rôle.
 * Note : la sécurité réelle est appliquée par les policies RLS Supabase ;
 * ce composant améliore uniquement l'expérience utilisateur.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isSessionLoading = useAuthStore((s) => s.isLoading)
  const profileQuery = useProfile()

  const isLoading = isSessionLoading || (!!session && profileQuery.isLoading)
  const profile = profileQuery.data

  useEffect(() => {
    if (isLoading) return
    if (!session) {
      void navigate({ to: '/login' })
      return
    }
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
      void navigate({ to: '/unauthorized' })
    }
  }, [isLoading, session, profile, allowedRoles, navigate])

  if (isLoading || !session) {
    return <LoadingSpinner label="Vérification de la session…" />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <LoadingSpinner label="Redirection…" />
  }

  return <>{children}</>
}
