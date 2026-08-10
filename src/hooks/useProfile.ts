import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'
import type { Profile } from '@/types'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    // PGRST116 = 0 ligne retournée (profil pas encore créé par le trigger)
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

/** Charge le profil de l'utilisateur connecté et le synchronise avec le store global. */
export function useProfile() {
  const session = useAuthStore((s) => s.session)
  const setProfile = useAuthStore((s) => s.setProfile)
  const userId = session?.user.id

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  })

  useEffect(() => {
    setProfile(query.data ?? null)
  }, [query.data, setProfile])

  return query
}

/** Force le rechargement du profil (ex: après modification dans /profil). */
export function useInvalidateProfile() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user.id)
  return () => queryClient.invalidateQueries({ queryKey: ['profile', userId] })
}
