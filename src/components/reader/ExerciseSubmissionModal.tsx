import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, FileCheck, FileText, Hourglass, Upload, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ObligationBadge } from '@/components/reader/ObligationBadge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/hooks/useToast'
import { MAX_UPLOAD_BYTES, requestAiValidation } from '@/lib/submissions'
import type { Exercise } from '@/types'

interface Props {
  exercise: Exercise
  open: boolean
  onClose: () => void
  onSubmitted: () => void
}

const ALLOWED_EXT = ['pdf', 'docx', 'xlsx']

/** Modale des exercices à soumission : texte libre, dépôt de document, Google Docs ou Sheets. */
export function ExerciseSubmissionModal({ exercise, open, onClose, onSubmitted }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.session?.user.id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [googleUrl, setGoogleUrl] = useState('')
  const [resubmitting, setResubmitting] = useState(false)

  const queryKey = ['my-submission', exercise.id, userId]
  const { data: existing } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_submissions')
        .select('*')
        .eq('exercise_id', exercise.id)
        .eq('apprenant_id', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  const submit = useMutation({
    mutationFn: async () => {
      let fields: { submission_text?: string | null; submission_file_url?: string | null; submission_google_url?: string | null } = {}
      if (exercise.submission_mode === 'texte_libre') {
        fields = { submission_text: text.trim() }
      } else if (exercise.submission_mode === 'upload_document') {
        if (!file) throw new Error('Aucun fichier')
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const path = `${userId}/${exercise.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('exercise-submissions').upload(path, file, { upsert: false })
        if (upErr) throw upErr
        fields = { submission_file_url: path }
      } else {
        fields = { submission_google_url: googleUrl.trim() }
      }

      const { data, error } = await supabase
        .from('exercise_submissions')
        .upsert({ exercise_id: exercise.id, apprenant_id: userId!, status: 'soumis', ...fields }, { onConflict: 'exercise_id,apprenant_id' })
        .select('id')
        .single()
      if (error) throw error

      try {
        return await requestAiValidation(data.id)
      } catch {
        // La validation IA est un confort : sans elle, le formateur reçoit la soumission à réviser.
        return { status: 'soumis' as const, pending_review: true }
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['session-access'] })
      setResubmitting(false)
      setText('')
      setFile(null)
      setGoogleUrl('')
      if (result?.status === 'valide_ia') toast.success('Exercice validé !')
      else if (result?.status === 'rejete') toast.error('Exercice à revoir, consultez le retour')
      else toast.success('Soumission envoyée, en attente de révision')
      onSubmitted()
    },
    onError: (err) => toast.error(err instanceof Error && err.message !== 'Aucun fichier' ? "Erreur lors de l'envoi" : 'Choisissez un fichier'),
  })

  const handleFile = (f: File | undefined) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) return toast.error('Formats acceptés : PDF, Word, Excel')
    if (f.size > MAX_UPLOAD_BYTES) return toast.error('Fichier trop volumineux (20 Mo maximum)')
    setFile(f)
  }

  const mode = exercise.submission_mode
  const isGoogle = mode === 'google_doc' || mode === 'google_sheet'
  const locked = existing && !resubmitting
  const validated = existing?.status === 'valide_ia' || existing?.status === 'valide_formateur'
  const feedback = existing?.formateur_feedback || existing?.ai_feedback
  const score = existing?.formateur_score ?? existing?.ai_score

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-1">
            <ObligationBadge level={exercise.obligation_level} />
          </div>
          <DialogTitle>{exercise.title}</DialogTitle>
          {exercise.instructions && <DialogDescription className="whitespace-pre-line">{exercise.instructions}</DialogDescription>}
        </DialogHeader>

        {locked ? (
          <div className="space-y-4 text-center">
            {validated ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-lime" />
            ) : existing.status === 'rejete' ? (
              <XCircle className="mx-auto h-12 w-12 text-red-400" />
            ) : (
              <Hourglass className="mx-auto h-12 w-12 text-accent" />
            )}
            <p className="font-semibold text-dark">
              {validated
                ? 'Exercice validé'
                : existing.status === 'rejete'
                  ? 'Exercice à revoir'
                  : 'Soumission reçue, en attente de révision par le formateur'}
            </p>
            {score !== null && score !== undefined && <p className="text-2xl font-bold text-dark">{score}/100</p>}
            {feedback && <p className="rounded-lg bg-lightGray p-3 text-left text-sm text-gray">{feedback}</p>}
            <div className="flex justify-center gap-2">
              {validated ? (
                <Button onClick={onClose}>Continuer</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Fermer
                  </Button>
                  <Button onClick={() => setResubmitting(true)}>Soumettre à nouveau</Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'texte_libre' && (
              <>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Rédigez votre réponse..."
                  rows={10}
                  className="resize-y text-sm"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{text.length} caractères</span>
                  {exercise.ai_auto_validate && <span>Validé automatiquement par l'IA</span>}
                </div>
              </>
            )}

            {mode === 'upload_document' && (
              <>
                <div
                  onDrop={(e) => {
                    e.preventDefault()
                    handleFile(e.dataTransfer.files[0])
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center transition-colors hover:border-primary"
                >
                  <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-2 text-gray">Déposez votre document ici</p>
                  <p className="text-xs text-gray-400">PDF, Word, Excel · 20 Mo max</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => fileRef.current?.click()}>
                    Choisir un fichier
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>
                {file && (
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700">{file.name}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">Seuls les PDF sont corrigés automatiquement, les autres formats sont révisés par le formateur.</p>
              </>
            )}

            {isGoogle && (
              <>
                <div className="rounded-xl bg-blue-50 p-6 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-blue-500" />
                  <p className="mb-4 text-sm text-blue-700">
                    Cet exercice se fait sur {mode === 'google_doc' ? 'Google Docs' : 'Google Sheets'}.
                    {exercise.google_template_url && " Un document avec les consignes va s'ouvrir."}
                  </p>
                  {exercise.google_template_url && (
                    <Button type="button" onClick={() => window.open(exercise.google_template_url!, '_blank', 'noopener')}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Ouvrir le document
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray">Une fois terminé, partagez votre document (accès par lien) et collez son adresse :</p>
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/..."
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => submit.mutate()}
                disabled={
                  submit.isPending ||
                  (mode === 'texte_libre' && !text.trim()) ||
                  (mode === 'upload_document' && !file) ||
                  (isGoogle && !/^https:\/\/docs\.google\.com\//.test(googleUrl.trim()))
                }
              >
                {submit.isPending ? 'Envoi et correction…' : mode === 'upload_document' ? 'Soumettre le document' : 'Soumettre pour validation'}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
