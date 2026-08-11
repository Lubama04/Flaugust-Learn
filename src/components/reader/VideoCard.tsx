import { useEffect, useRef, useState } from 'react'
import { StickyNote, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { useVideoProgress } from '@/hooks/useVideoProgress'
import { upsertSessionProgress } from '@/lib/progress'

interface VideoCardProps {
  sessionId: string
  enrollmentId: string
  contentUrl: string
  isCompleted: boolean
  onCompleted: () => void
}

function extractYoutubeId(url: string): string | null {
  const patterns = [/youtu\.be\/([\w-]+)/, /youtube\.com\/watch\?v=([\w-]+)/, /youtube\.com\/embed\/([\w-]+)/]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1] ?? null
  }
  return null
}

export function VideoCard({ sessionId, enrollmentId, contentUrl, isCompleted, onCompleted }: VideoCardProps) {
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const youtubeId = extractYoutubeId(contentUrl)
  const isExternal = contentUrl.startsWith('http') && !youtubeId
  const { lastPositionSeconds, isCompleted: completedFromProgress, reportProgress } = useVideoProgress(
    enrollmentId,
    sessionId
  )
  const completed = isCompleted || completedFromProgress

  useEffect(() => {
    if (youtubeId || isExternal) return
    let cancelled = false
    supabase.functions
      .invoke<{ signedUrl: string }>('get-signed-url', {
        body: { bucket: 'course-videos', path: contentUrl, enrollment_id: enrollmentId },
      })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setSignedUrl(data.signedUrl)
      })
    return () => {
      cancelled = true
    }
  }, [contentUrl, enrollmentId, youtubeId, isExternal])

  const handleLoadedMetadata = () => {
    if (videoRef.current && lastPositionSeconds > 0) {
      videoRef.current.currentTime = lastPositionSeconds
    }
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video || !video.duration) return
    void reportProgress(video.currentTime, video.duration)
  }

  const handleSaveNote = async () => {
    if (!noteText.trim() || !userId) return
    setSavingNote(true)
    try {
      const timestamp = videoRef.current ? Math.floor(videoRef.current.currentTime) : null
      const { error } = await supabase.from('learner_notes').insert({
        user_id: userId,
        session_id: sessionId,
        content: noteText.trim(),
        video_timestamp_seconds: timestamp,
      })
      if (error) throw error
      toast.success('Note horodatée enregistrée')
      setNoteText('')
      setNoteOpen(false)
    } catch {
      toast.error("Erreur lors de l'enregistrement de la note")
    } finally {
      setSavingNote(false)
    }
  }

  const markYoutubeCompleted = async () => {
    try {
      await upsertSessionProgress({ enrollmentId, sessionId, isCompleted: true })
      onCompleted()
    } catch {
      toast.error('Erreur lors de la mise à jour de la progression')
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full bg-black">
        {youtubeId ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
            title="Vidéo de la session"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isExternal ? (
          <video ref={videoRef} src={contentUrl} controls className="h-full w-full" onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} />
        ) : signedUrl ? (
          <video
            ref={videoRef}
            src={signedUrl}
            controls
            className="h-full w-full"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">Chargement de la vidéo…</div>
        )}
      </div>

      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          {completed && (
            <span className="flex items-center gap-1 text-sm text-lime">
              <CheckCircle2 className="h-4 w-4" /> Session complétée
            </span>
          )}
          {youtubeId && !completed && (
            <Button size="sm" variant="outline" onClick={markYoutubeCompleted} className="ml-auto">
              Marquer comme terminé
            </Button>
          )}
        </div>

        {!noteOpen ? (
          <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>
            <StickyNote className="mr-2 h-4 w-4" /> Note horodatée
          </Button>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Votre note à ce moment de la vidéo…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
