import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SessionAccessResult {
  allowed: boolean
  reason?: 'session_not_completed' | 'exercise_not_passed' | string
  previous_session_id?: string
  exercise_id?: string
}

async function checkSessionAccess(sessionId: string, enrollmentId: string): Promise<SessionAccessResult> {
  const { data, error } = await supabase.functions.invoke<SessionAccessResult>('check-session-access', {
    body: { session_id: sessionId, enrollment_id: enrollmentId },
  })
  if (error) throw error
  return data ?? { allowed: false, reason: 'Erreur inconnue' }
}

/** Vérifie l'accès à une session via le Gate System (Edge Function). Résultat mis en cache 30s. */
export function useSessionAccess(sessionId: string | undefined, enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['session-access', sessionId, enrollmentId],
    queryFn: () => checkSessionAccess(sessionId!, enrollmentId!),
    enabled: !!sessionId && !!enrollmentId,
    staleTime: 30_000,
  })
}
