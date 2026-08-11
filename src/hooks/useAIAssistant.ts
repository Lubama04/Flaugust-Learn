import { useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

export type AIAction =
  | 'assistant_question'
  | 'correct_short_answer'
  | 'generate_quiz'
  | 'summarize_session'
  | 'recommend_courses'

interface AIAssistantResponse {
  result: string
}

/**
 * Hook générique pour appeler l'Edge Function ai-assistant (Gemini 2.0 Flash).
 * Limite côté client : max 10 requêtes par minute (fenêtre glissante), pour éviter
 * un usage abusif — la protection définitive reste côté serveur (clé API, quotas Google).
 */
export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timestampsRef = useRef<number[]>([])

  const canAsk = useCallback(() => {
    const now = Date.now()
    timestampsRef.current = timestampsRef.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    return timestampsRef.current.length < RATE_LIMIT_MAX
  }, [])

  const ask = useCallback(async (action: AIAction, payload: Record<string, unknown>): Promise<string> => {
    if (!canAsk()) {
      const message = 'Trop de requêtes — merci de patienter une minute avant de reposer une question.'
      setError(message)
      throw new Error(message)
    }

    setIsLoading(true)
    setError(null)
    try {
      timestampsRef.current.push(Date.now())
      const { data, error: fnError } = await supabase.functions.invoke<AIAssistantResponse | { error: string }>(
        'ai-assistant',
        { body: { action, payload } }
      )
      if (fnError) throw fnError
      if (!data || 'error' in data) throw new Error((data as { error?: string })?.error ?? 'Erreur inconnue')
      return data.result
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'appel à l'assistant"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [canAsk])

  return { ask, isLoading, error, canAsk }
}
