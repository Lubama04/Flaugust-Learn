import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Music } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useVideoProgress } from '@/hooks/useVideoProgress'

interface AudioCardProps {
  sessionId: string
  enrollmentId: string
  contentUrl: string
  isCompleted: boolean
}

export function AudioCard({ sessionId, enrollmentId, contentUrl, isCompleted }: AudioCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const isExternal = contentUrl.startsWith('http')

  const { lastPositionSeconds, isCompleted: completedFromProgress, reportProgress } = useVideoProgress(
    enrollmentId,
    sessionId
  )
  const completed = isCompleted || completedFromProgress

  useEffect(() => {
    if (isExternal) return
    let cancelled = false
    supabase.functions
      .invoke<{ signedUrl: string }>('get-signed-url', {
        body: { bucket: 'course-documents', path: contentUrl, enrollment_id: enrollmentId },
      })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setSignedUrl(data.signedUrl)
      })
    return () => {
      cancelled = true
    }
  }, [contentUrl, enrollmentId, isExternal])

  const src = isExternal ? contentUrl : signedUrl

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3 text-primary">
          <Music className="h-6 w-6" aria-hidden="true" />
          <span className="text-sm font-medium text-dark">Contenu audio</span>
          {completed && (
            <span className="ml-auto flex items-center gap-1 text-sm text-lime">
              <CheckCircle2 className="h-4 w-4" /> Complété
            </span>
          )}
        </div>
        {src ? (
          <audio
            ref={audioRef}
            src={src}
            controls
            className="w-full"
            onLoadedMetadata={() => {
              if (audioRef.current && lastPositionSeconds > 0) {
                audioRef.current.currentTime = lastPositionSeconds
              }
            }}
            onTimeUpdate={() => {
              const audio = audioRef.current
              if (audio?.duration) void reportProgress(audio.currentTime, audio.duration)
            }}
          />
        ) : (
          <p className="text-sm text-gray-400">Chargement de l'audio…</p>
        )}
      </CardContent>
    </Card>
  )
}
