import { useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Volume2, Pause, Play, Square, StickyNote, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useTTS } from '@/hooks/useTTS'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { upsertSessionProgress } from '@/lib/progress'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

interface TexteCardProps {
  sessionId: string
  enrollmentId: string
  contentHtml: string
  isCompleted: boolean
  onCompleted: () => void
}

const RATES = [0.75, 1, 1.25, 1.5]
const AUTO_COMPLETE_SECONDS = 60

export function TexteCard({ sessionId, enrollmentId, contentHtml, isCompleted, onCompleted }: TexteCardProps) {
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const contentRef = useRef<HTMLDivElement>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const completedRef = useRef(isCompleted)
  completedRef.current = isCompleted

  // Le suivi mot-par-mot n'a pas d'équivalent avec un MP3 pré-rendu (VoiceRSS, pas d'événement de
  // limite de mot) : seul le texte brut est nécessaire pour la lecture, plus de découpage en
  // blocs annotés.
  const { sanitizedHtml, fullText } = useMemo(() => {
    const sanitized = DOMPurify.sanitize(contentHtml || '')
    const container = document.createElement('div')
    container.innerHTML = sanitized
    return { sanitizedHtml: sanitized, fullText: container.textContent ?? '' }
  }, [contentHtml])

  const {
    isPlaying,
    isPaused,
    isLoading,
    isSupported,
    rate,
    gender,
    speak,
    pause,
    resume,
    stop,
    changeRate,
    changeGender,
  } = useTTS()

  const markCompleted = async () => {
    if (completedRef.current) return
    completedRef.current = true
    try {
      await upsertSessionProgress({ enrollmentId, sessionId, isCompleted: true })
      onCompleted()
    } catch {
      completedRef.current = false
    }
  }

  // Complétion automatique après 60s de lecture ou lorsque le dernier bloc est visible.
  useEffect(() => {
    if (isCompleted) return
    const timer = setTimeout(() => void markCompleted(), AUTO_COMPLETE_SECONDS * 1000)

    const lastEl = contentRef.current?.querySelector('p:last-of-type, li:last-of-type, :scope > *:last-child')
    let observer: IntersectionObserver | null = null
    if (lastEl) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void markCompleted()
        },
        { threshold: 0.9 }
      )
      observer.observe(lastEl)
    }

    return () => {
      clearTimeout(timer)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleSaveNote = async () => {
    if (!noteText.trim() || !userId) return
    setSavingNote(true)
    try {
      const { error } = await supabase
        .from('learner_notes')
        .insert({ user_id: userId, session_id: sessionId, content: noteText.trim() })
      if (error) throw error
      toast.success('Note enregistrée')
      setNoteText('')
      setNoteOpen(false)
    } catch {
      toast.error("Erreur lors de l'enregistrement de la note")
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {isSupported && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-lightGray p-2">
            {!isPlaying && !isPaused && (
              <Button size="sm" variant="outline" onClick={() => speak(fullText)} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" /> Écouter
                  </>
                )}
              </Button>
            )}
            {isPlaying && (
              <Button size="sm" variant="outline" onClick={pause}>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
            {isPaused && (
              <Button size="sm" variant="outline" onClick={resume}>
                <Play className="mr-2 h-4 w-4" /> Reprendre
              </Button>
            )}
            {(isPlaying || isPaused) && (
              <Button size="sm" variant="ghost" onClick={stop}>
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeGender('female')}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  gender === 'female'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-gray-200 text-gray hover:bg-white'
                )}
              >
                👩 Voix féminine
              </button>
              <button
                type="button"
                onClick={() => changeGender('male')}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  gender === 'male'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-gray-200 text-gray hover:bg-white'
                )}
              >
                👨 Voix masculine
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRate(r)}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium',
                    rate === r ? 'bg-primary text-primary-foreground' : 'text-gray hover:bg-white'
                  )}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={contentRef}
          className={cn(
            'prose prose-sm max-w-none text-dark transition-opacity duration-1000',
            isPlaying && 'animate-pulse'
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        <div className="border-t border-gray-100 pt-4">
          {!noteOpen ? (
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>
              <StickyNote className="mr-2 h-4 w-4" /> Ajouter une note
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Votre note sur cette session…"
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
        </div>
      </CardContent>
    </Card>
  )
}
