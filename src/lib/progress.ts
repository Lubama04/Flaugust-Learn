import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/types/database'

/**
 * Marque une session comme complétée (ou met à jour sa progression partielle) et
 * recalcule le pourcentage global de l'inscription via `enrollment_progress_view`.
 * Utilisé par tous les types de cartes de contenu (texte, vidéo, audio, PDF).
 */
export async function upsertSessionProgress(params: {
  enrollmentId: string
  sessionId: string
  isCompleted?: boolean
  timeSpentSeconds?: number
  lastPositionSeconds?: number
}) {
  const { enrollmentId, sessionId, isCompleted, timeSpentSeconds, lastPositionSeconds } = params

  const patch: TablesInsert<'session_progress'> = { enrollment_id: enrollmentId, session_id: sessionId }
  if (isCompleted !== undefined) {
    patch.is_completed = isCompleted
    if (isCompleted) patch.completed_at = new Date().toISOString()
  }
  if (timeSpentSeconds !== undefined) patch.time_spent_seconds = timeSpentSeconds
  if (lastPositionSeconds !== undefined) patch.last_position_seconds = lastPositionSeconds

  const { error } = await supabase
    .from('session_progress')
    .upsert(patch, { onConflict: 'enrollment_id,session_id' })

  if (error) throw error

  if (isCompleted) {
    await refreshEnrollmentProgress(enrollmentId)
  }
}

/** Recalcule enrollments.progress_pct à partir de la vue enrollment_progress_view. */
export async function refreshEnrollmentProgress(enrollmentId: string) {
  const { data, error } = await supabase
    .from('enrollment_progress_view')
    .select('progress_pct')
    .eq('enrollment_id', enrollmentId)
    .single()

  if (error || !data) return

  const progressPct = data.progress_pct ?? 0
  await supabase
    .from('enrollments')
    .update({
      progress_pct: progressPct,
      ...(progressPct >= 100 ? { completed_at: new Date().toISOString(), status: 'complete' } : {}),
    })
    .eq('id', enrollmentId)
}
