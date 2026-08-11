import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCourseChat } from '@/hooks/useCourseChat'
import { useToast } from '@/hooks/useToast'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageInput, type MessageInputSubmit } from '@/components/chat/MessageInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { uploadChatMedia, blobToBase64 } from '@/lib/chat-media'

interface CourseChatProps {
  courseId: string
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('ogg')) return 'ogg'
  const parts = mimeType.split('/')
  return parts[1] ?? 'bin'
}

export function CourseChat({ courseId }: CourseChatProps) {
  const userId = useAuthStore((s) => s.session?.user.id)
  const toast = useToast()
  const { messages, isLoading, sendMessage, isSending } = useCourseChat(courseId)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async (submission: MessageInputSubmit) => {
    if (!userId) return
    try {
      if (submission.audioBlob) {
        const ext = extensionFor(submission.audioBlob.type)
        const path = await uploadChatMedia(courseId, userId, submission.audioBlob, ext)
        const base64 = await blobToBase64(submission.audioBlob)
        let transcription = ''
        try {
          const { data } = await supabase.functions.invoke<{ result?: string; error?: string }>('ai-assistant', {
            body: { action: 'transcribe_audio', payload: { audio_base64: base64, mime_type: submission.audioBlob.type || 'audio/webm' } },
          })
          transcription = data?.result ?? ''
        } catch {
          // La transcription est un bonus : si elle échoue, le message vocal part quand même.
        }
        await sendMessage({ content: '', mediaUrl: path, mediaType: 'audio', transcription })
      } else if (submission.file) {
        const ext = submission.file.name.split('.').pop() ?? 'bin'
        const path = await uploadChatMedia(courseId, userId, submission.file, ext)
        const mediaType = submission.file.type.startsWith('image/') ? 'image' : 'file'
        await sendMessage({ content: submission.text, mediaUrl: path, mediaType })
      } else {
        await sendMessage({ content: submission.text })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi")
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-lightGray/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingSpinner label="Chargement de la discussion…" />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Aucun message pour l'instant"
            description="Posez une question, l'assistant IA et votre formateur peuvent vous répondre."
          />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} isOwnMessage={!message.is_ai && message.user_id === userId} />
          ))
        )}
        <div ref={scrollRef} />
      </div>
      <MessageInput onSend={handleSend} isSending={isSending} />
    </div>
  )
}
