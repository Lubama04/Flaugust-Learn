import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

/**
 * Hook global d'authentification : synchronise la session Supabase avec le store Zustand.
 * À monter une seule fois, à la racine de l'app (voir App.tsx).
 */
export function useAuthListener() {
  const setSession = useAuthStore((s) => s.setSession)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setSession, setLoading])
}

interface SignUpParams {
  fullName: string
  email: string
  phone?: string
  password: string
}

export async function signUp({ fullName, email, phone, password }: SignUpParams) {
  // Le nom et le téléphone sont passés en metadata ; repris par le trigger SQL
  // handle_new_user(). Le rôle n'est jamais envoyé depuis le client : tout nouvel inscrit est
  // 'apprenant' par défaut côté serveur (handle_new_user l'impose, indépendamment de ce que
  // contiendrait raw_user_meta_data) — devenir formateur passe par une promotion admin.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone || undefined },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  useAuthStore.getState().reset()
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}

/** Redirection post-login selon le rôle du profil. */
export function dashboardPathForRole(role: UserRole | undefined): string {
  switch (role) {
    case 'formateur':
      return '/formateur'
    case 'admin':
      return '/admin'
    default:
      return '/dashboard'
  }
}
