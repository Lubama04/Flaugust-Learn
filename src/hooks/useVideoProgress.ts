import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { upsertSessionProgress } from '@/lib/progress'

const SAVE_INTERVAL_SECONDS = 10
const COMPLETION_THRESHOLD = 0.9

async function fetchProgress(enrollmentId: string, sessionId: string) {
  const { data, error } = await supabase
    .from('session_progress')
    .select('last_position_seconds, is_completed')
    .eq('enrollment_id', enrollmentId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Suit la progression de lecture d'une vidéo : sauvegarde la position toutes les 10s,
 * reprend depuis la dernière position, et marque la session complétée à 90% regardé.
 */
export function useVideoProgress(enrollmentId: string | undefined, sessionId: string | undefined) {
  const queryClient = useQueryClient()
  const lastSavedAtRef = useRef(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['session-progress', enrollmentId, sessionId],
    queryFn: () => fetchProgress(enrollmentId!, sessionId!),
    enabled: !!enrollmentId && !!sessionId,
  })

  useEffect(() => {
    setIsCompleted(existing?.is_completed ?? false)
  }, [existing?.is_completed])

  const reportProgress = useCallback(
    async (currentSeconds: number, durationSeconds: number) => {
      if (!enrollmentId || !sessionId || durationSeconds <= 0) return

      const ratio = currentSeconds / durationSeconds
      const shouldComplete = !isCompleted && ratio >= COMPLETION_THRESHOLD
      const now = Date.now()
      const shouldSavePosition = now - lastSavedAtRef.current >= SAVE_INTERVAL_SECONDS * 1000

      if (!shouldComplete && !shouldSavePosition) return

      lastSavedAtRef.current = now
      await upsertSessionProgress({
        enrollmentId,
        sessionId,
        lastPositionSeconds: Math.floor(currentSeconds),
        timeSpentSeconds: Math.floor(currentSeconds),
        ...(shouldComplete ? { isCompleted: true } : {}),
      })

      if (shouldComplete) {
        setIsCompleted(true)
        void queryClient.invalidateQueries({ queryKey: ['session-progress'] })
        void queryClient.invalidateQueries({ queryKey: ['session-access'] })
      }
    },
    [enrollmentId, sessionId, isCompleted, queryClient]
  )

  return {
    lastPositionSeconds: existing?.last_position_seconds ?? 0,
    isCompleted,
    reportProgress,
  }
}
