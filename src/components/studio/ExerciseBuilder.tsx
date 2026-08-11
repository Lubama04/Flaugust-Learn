import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { QuizGenerator } from '@/components/ai/QuizGenerator'
import { QcmBuilder, type QcmQuestion } from '@/components/studio/QcmBuilder'
import { VraiFauxBuilder, type VraiFauxQuestion } from '@/components/studio/VraiFauxBuilder'
import { TexteTrousBuilder, type TexteTrousQuestion } from '@/components/studio/TexteTrousBuilder'
import { AssociationBuilder, type AssociationQuestion } from '@/components/studio/AssociationBuilder'
import { ReponseCourteBuilder, type ReponseCourteQuestion } from '@/components/studio/ReponseCourteBuilder'
import type { Exercise } from '@/types'
import type { Json } from '@/types/database'

type ExerciseType = Exercise['type']
type AnyQuestion = QcmQuestion | VraiFauxQuestion | TexteTrousQuestion | AssociationQuestion | ReponseCourteQuestion

const TYPE_LABELS: Record<ExerciseType, string> = {
  qcm: 'QCM (choix multiples)',
  vrai_faux: 'Vrai / Faux',
  texte_a_trous: 'Texte à trous',
  association: 'Association',
  reponse_courte: 'Réponse courte',
  ordre: 'Remise en ordre',
  upload: 'Dépôt de fichier',
}

const BUILDABLE_TYPES: ExerciseType[] = ['qcm', 'vrai_faux', 'texte_a_trous', 'association', 'reponse_courte']

interface ExerciseBuilderProps {
  /** Session cible (exercice de session) — exclusif avec courseId. */
  sessionId?: string
  /** Cours cible (examen final) — exclusif avec sessionId. */
  courseId: string | null
  onSaved: () => void
  onCancel: () => void
}

async function fetchExercise(sessionId?: string, courseId?: string | null) {
  let query = supabase.from('exercises').select('*')
  query = sessionId ? query.eq('session_id', sessionId) : query.eq('course_id', courseId!).eq('is_final_exam', true)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export function ExerciseBuilder({ sessionId, courseId, onSaved, onCancel }: ExerciseBuilderProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isFinalExam = !sessionId

  const { data: existing, isLoading } = useQuery({
    queryKey: ['exercise', sessionId ?? courseId, isFinalExam],
    queryFn: () => fetchExercise(sessionId, courseId),
  })

  const [type, setType] = useState<ExerciseType>('qcm')
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [passScore, setPassScore] = useState(70)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [questions, setQuestions] = useState<AnyQuestion[]>([])

  useEffect(() => {
    if (!existing) return
    setType(existing.type)
    setTitle(existing.title)
    setInstructions(existing.instructions)
    setPassScore(existing.pass_score)
    setMaxAttempts(existing.max_attempts)
    setQuestions((existing.questions as unknown as AnyQuestion[]) ?? [])
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        instructions,
        type,
        questions: questions as unknown as Json,
        pass_score: passScore,
        max_attempts: maxAttempts,
        is_final_exam: isFinalExam,
        session_id: isFinalExam ? null : (sessionId ?? null),
        course_id: isFinalExam ? courseId : null,
      }
      if (existing) {
        const { error } = await supabase.from('exercises').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('exercises').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Exercice enregistré')
      void queryClient.invalidateQueries({ queryKey: ['exercise'] })
      onSaved()
    },
    onError: () => toast.error("Erreur lors de l'enregistrement de l'exercice"),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!existing) return
      const { error } = await supabase.from('exercises').delete().eq('id', existing.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Exercice supprimé')
      void queryClient.invalidateQueries({ queryKey: ['exercise'] })
      onSaved()
    },
  })

  if (isLoading) return <LoadingSpinner label="Chargement de l'exercice…" />

  const canSave = title.trim().length > 0 && questions.length > 0

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ex-title">Titre de l'exercice</Label>
          <Input id="ex-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ex-type">Type</Label>
          <select
            id="ex-type"
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
            disabled={!!existing}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-dark disabled:opacity-60"
          >
            {BUILDABLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ex-instructions">Instructions</Label>
        <Textarea id="ex-instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ex-pass-score">Score de réussite (%)</Label>
          <Input
            id="ex-pass-score"
            type="number"
            min="0"
            max="100"
            value={passScore}
            onChange={(e) => setPassScore(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ex-max-attempts">Tentatives maximum</Label>
          <Input
            id="ex-max-attempts"
            type="number"
            min="1"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <Label>Questions</Label>
          {type === 'qcm' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setAiDialogOpen(true)}>
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Générer avec l'IA
            </Button>
          )}
        </div>
        {type === 'qcm' && (
          <QcmBuilder questions={questions as QcmQuestion[]} onChange={(q) => setQuestions(q)} />
        )}
        {type === 'vrai_faux' && (
          <VraiFauxBuilder questions={questions as VraiFauxQuestion[]} onChange={(q) => setQuestions(q)} />
        )}
        {type === 'texte_a_trous' && (
          <TexteTrousBuilder questions={questions as TexteTrousQuestion[]} onChange={(q) => setQuestions(q)} />
        )}
        {type === 'association' && (
          <AssociationBuilder questions={questions as AssociationQuestion[]} onChange={(q) => setQuestions(q)} />
        )}
        {type === 'reponse_courte' && (
          <ReponseCourteBuilder questions={questions as ReponseCourteQuestion[]} onChange={(q) => setQuestions(q)} />
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
          Enregistrer l'exercice
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        {existing && (
          <Button
            variant="ghost"
            className="ml-auto text-red-600 hover:bg-red-50"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            Supprimer l'exercice
          </Button>
        )}
      </div>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer des questions avec l'IA</DialogTitle>
          </DialogHeader>
          <QuizGenerator
            onInsert={(newQuestions) => {
              setQuestions((prev) => [...prev, ...newQuestions])
              setAiDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
