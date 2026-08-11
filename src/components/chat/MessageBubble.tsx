import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, AlertTriangle, FileText, Music, Video as VideoIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AISourceCard } from '@/components/chat/AISourceCard'
import { getChatMediaSignedUrl } from '@/lib/chat-media'
import type { AiChatSource, CourseMessage } from '@/types'

interface SenderLite {
  full_name: string
  avatar_url: string | null
}

async function fetchSenderLite(userId: string): Promise<SenderLite | null> {
  const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).single()
  return data
}

function useSender(userId: string | null) {
  return useQuery({
    queryKey: ['profile-lite', userId],
    queryFn: () => fetchSenderLite(userId!),
    enabled: !!userId,
    staleTime: 5 * 60_000,
  })
}

function MediaContent({ mediaUrl, mediaType }: { mediaUrl: string; mediaType: string | null }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getChatMediaSignedUrl(mediaUrl)
      .then((url) => {
        if (!cancelled) setSignedUrl(url)
      })
      .catch(() => {
        if (!cancelled) setSignedUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [mediaUrl])

  if (!signedUrl) return <p className="text-xs italic text-gray-400">Chargement du média…</p>

  if (mediaType === 'image') {
    return <img src={signedUrl} alt="Pièce jointe" className="max-h-56 rounded-lg object-cover" />
  }
  if (mediaType === 'audio') {
    return (
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 shrink-0 text-gray-400" />
        <audio src={signedUrl} controls className="h-8 max-w-[220px]" />
      </div>
    )
  }
  if (mediaType === 'video') {
    return (
      <div className="flex items-center gap-2">
        <VideoIcon className="h-4 w-4 shrink-0 text-gray-400" />
        <video src={signedUrl} controls className="max-h-56 rounded-lg" />
      </div>
    )
  }
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <FileText className="h-4 w-4" /> Fichier joint
    </a>
  )
}

interface MessageBubbleProps {
  message: CourseMessage
  isOwnMessage: boolean
}

export function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const { data: sender } = useSender(message.is_ai ? null : message.user_id)
  const initials = message.is_ai ? 'IA' : (sender?.full_name ?? '?').slice(0, 2).toUpperCase()
  const displayName = message.is_ai ? 'Assistant IA' : (sender?.full_name ?? 'Utilisateur')
  const sources = Array.isArray(message.ai_sources) ? (message.ai_sources as unknown as AiChatSource[]) : []

  return (
    <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        {message.is_ai ? (
          <AvatarFallback className="bg-secondary/10 text-secondary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <>
            {sender?.avatar_url && <AvatarImage src={sender.avatar_url} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </>
        )}
      </Avatar>

      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs font-medium text-gray-500">{displayName}</span>
          {message.is_flagged_urgent && (
            <Badge variant="accent" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Urgent
            </Badge>
          )}
        </div>
        <div
          className={`mt-0.5 rounded-2xl px-3 py-2 text-sm ${
            message.is_ai
              ? 'bg-secondary/10 text-dark'
              : isOwnMessage
                ? 'bg-primary text-primary-foreground'
                : 'bg-white text-dark shadow-sm'
          }`}
        >
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          {message.transcription && !message.content && (
            <p className="whitespace-pre-wrap break-words italic">🎤 {message.transcription}</p>
          )}
          {message.media_url && (
            <div className="mt-1.5">
              <MediaContent mediaUrl={message.media_url} mediaType={message.media_type} />
            </div>
          )}
          {message.is_ai && <AISourceCard sources={sources} />}
        </div>
        <span className="mt-0.5 px-1 text-[11px] text-gray-300">
          {new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
