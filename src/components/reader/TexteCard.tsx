import { useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { upsertSessionProgress } from '@/lib/progress'
import { useToast } from '@/hooks/useToast'
import { CardNavigator } from '@/components/reader/CardNavigator'

interface TexteCardProps {
  sessionId: string
  enrollmentId: string
  contentHtml: string
  isCompleted: boolean
  onCompleted: () => void
}

/**
 * Session texte affichée en petites cartes de lecture (CardNavigator) plutôt qu'en un seul bloc.
 * La session est marquée terminée quand l'apprenant valide la dernière carte, un signal plus
 * fiable qu'un minuteur ou une simple visibilité de fin de page.
 */
export function TexteCard({ sessionId, enrollmentId, contentHtml, isCompleted, onCompleted }: TexteCardProps) {
  const toast = useToast()
  const userId = useAuthStore((s) => s.session?.user.id)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const completedRef = useRef(isCompleted)
  completedRef.current = isCompleted

  const handleAllCardsComplete = async () => {
    if (completedRef.current) return
    completedRef.current = true
    try {
      await upsertSessionProgress({ enrollmentId, sessionId, isCompleted: true })
      onCompleted()
    } catch {
      completedRef.current = false
      // Échec silencieux avant ce correctif : le clic sur "Terminer" ne produisait alors
      // aucun effet visible en cas d'erreur réseau ou de session expirée, ressemblant à un
      // bouton figé plutôt qu'à une erreur récupérable.
      toast.error('Impossible de valider cette session. Vérifiez votre connexion et réessayez.')
    }
  }

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
    <div className="space-y-6">
      <CardNavigator contentHtml={contentHtml} onComplete={() => void handleAllCardsComplete()} />

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
    </div>
  )
}
