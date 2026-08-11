import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ExerciseFeedbackItem {
  question_id: string
  correct: boolean | null
  correct_answer?: unknown
  user_answer?: unknown
  justification?: string
  pending_manual_review?: boolean
  model_answer?: string
}

export interface SubmitExerciseResult {
  score: number
  passed: boolean
  feedback: ExerciseFeedbackItem[] | null
  attempts_used: number
  attempts_remaining: number
  result_id: string
}

interface SubmitExerciseParams {
  exerciseId: string
  enrollmentId: string
  answers: Record<string, unknown>
  timeSpentSeconds: number
}

async function submitExercise(params: SubmitExerciseParams): Promise<SubmitExerciseResult> {
  const { data, error } = await supabase.functions.invoke<SubmitExerciseResult>('submit-exercise', {
    body: {
      exercise_id: params.exerciseId,
      enrollment_id: params.enrollmentId,
      answers: params.answers,
      time_spent_seconds: params.timeSpentSeconds,
    },
  })
  if (error) throw error
  if (!data) throw new Error('Réponse vide du serveur')
  return data
}

/** Soumet un exercice via l'Edge Function submit-exercise et invalide les caches concernés. */
export function useExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitExercise,
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['session-access'] })
      void queryClient.invalidateQueries({ queryKey: ['session-progress'] })
      void queryClient.invalidateQueries({ queryKey: ['enrollment', undefined] })
      void queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      void queryClient.invalidateQueries({ queryKey: ['exercise-results', variables.exerciseId] })
    },
  })
}
