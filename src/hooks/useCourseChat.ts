import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import type { CourseMessage } from '@/types'

const MESSAGE_PAGE_SIZE = 100

async function fetchMessages(courseId: string): Promise<CourseMessage[]> {
  const { data, error } = await supabase
    .from('course_messages')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE)
  if (error) throw error
  return [...data].reverse()
}

interface SendMessageParams {
  content: string
  mediaUrl?: string
  mediaType?: string
  transcription?: string
}

/**
 * Chat temps réel d'une formation : historique + realtime (INSERT) + envoi via
 * l'Edge Function chat-ai-triage (qui insère le message utilisateur puis, si une clé
 * Gemini est configurée, la réponse IA — voir supabase/functions/chat-ai-triage).
 */
export function useCourseChat(courseId: string | undefined) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const [isSending, setIsSending] = useState(false)

  const queryKey = ['course-messages', courseId]

  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => fetchMessages(courseId!),
    enabled: !!courseId,
  })

  useEffect(() => {
    if (!courseId) return

    const channel = supabase
      .channel(`course-messages-${courseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'course_messages', filter: `course_id=eq.${courseId}` },
        (payload) => {
          const newMessage = payload.new as CourseMessage
          if (newMessage.is_private) return
          queryClient.setQueryData<CourseMessage[]>(queryKey, (old) => {
            if (!old) return [newMessage]
            if (old.some((m) => m.id === newMessage.id)) return old
            return [...old, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const sendMessage = useCallback(
    async (params: SendMessageParams) => {
      if (!courseId) return
      setIsSending(true)
      try {
        const { data, error } = await supabase.functions.invoke<{ error?: string }>('chat-ai-triage', {
          body: {
            course_id: courseId,
            content: params.content,
            media_url: params.mediaUrl,
            media_type: params.mediaType,
            transcription: params.transcription,
          },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        // Filet de sécurité si l'événement realtime arrive en retard ou est manqué.
        void queryClient.invalidateQueries({ queryKey })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi du message")
        throw err
      } finally {
        setIsSending(false)
      }
    },
    [courseId, queryClient, toast, queryKey]
  )

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage,
    isSending,
    currentUserId: userId,
  }
}
