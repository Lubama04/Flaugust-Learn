import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { withTimeout, formatDate } from '@/lib/utils'
import { SUBMISSION_MODE_LABELS, SUBMISSION_STATUS_LABELS, type SubmissionStatus } from '@/lib/submissions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorBox } from '@/components/tracking/TrackingParts'

interface SubmissionRow {
  id: string
  status: SubmissionStatus
  submission_text: string | null
  submission_file_url: string | null
  submission_google_url: string | null
  ai_score: number | null
  ai_feedback: string | null
  formateur_score: number | null
  formateur_feedback: string | null
  created_at: string
  updated_at: string
  exercises: {
    title: string
    submission_mode: string
    pass_score: number
    sessions: { title: string; modules: { courses: { title: string } | null } | null } | null
  } | null
  profiles: { full_name: string | null; email: string | null } | null
}

const STATUS_VARIANT: Record<SubmissionStatus, 'gray' | 'accent' | 'secondary' | 'default'> = {
  en_attente: 'gray',
  soumis: 'accent',
  valide_ia: 'secondary',
  valide_formateur: 'secondary',
  rejete: 'default',
}

async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('exercise_submissions')
      .select(
        '*, exercises(title, submission_mode, pass_score, sessions(title, modules(courses(title)))), profiles:profiles!exercise_submissions_apprenant_id_fkey(full_name, email)'
      )
      .neq('status', 'en_attente')
      .order('updated_at', { ascending: false })
      .limit(200),
    12_000,
    'Le chargement des soumissions prend trop de temps. Réessayez.'
  )
  if (error) throw error
  return data as unknown as SubmissionRow[]
}

export function SoumissionsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'review' | 'all'>('review')
  const [selected, setSelected] = useState<SubmissionRow | null>(null)
  const [score, setScore] = useState(80)
  const [feedback, setFeedback] = useState('')
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['formateur-submissions'],
    queryFn: fetchSubmissions,
    retry: false,
  })

  const review = useMutation({
    mutationFn: async (status: 'valide_formateur' | 'rejete') => {
      const { error } = await supabase.rpc('formateur_review_submission', {
        p_submission_id: selected!.id,
        p_status: status,
        p_score: score,
        p_feedback: feedback,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Révision enregistrée')
      setSelected(null)
      void queryClient.invalidateQueries({ queryKey: ['formateur-submissions'] })
      void queryClient.invalidateQueries({ queryKey: ['pending-submissions-count'] })
    },
    onError: () => toast.error("Impossible d'enregistrer la révision"),
  })

  const open = async (row: SubmissionRow) => {
    setSelected(row)
    setScore(row.formateur_score ?? row.ai_score ?? 80)
    setFeedback(row.formateur_feedback ?? row.ai_feedback ?? '')
    setFileUrl(null)
    if (row.submission_file_url) {
      const { data: signed } = await supabase.storage.from('exercise-submissions').createSignedUrl(row.submission_file_url, 600)
      setFileUrl(signed?.signedUrl ?? null)
    }
  }

  const rows = (data ?? []).filter((r) => filter === 'all' || r.status === 'soumis' || r.status === 'rejete')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-dark">Soumissions d'exercices</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'review' ? 'default' : 'outline'} onClick={() => setFilter('review')}>
            À réviser
          </Button>
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
            Toutes
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Chargement des soumissions…" />
      ) : isError ? (
        <ErrorBox error={error} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune soumission" description="Les soumissions de vos apprenants apparaîtront ici." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Apprenant</th>
                  <th className="px-6 py-3 font-medium">Exercice</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Score IA</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3">
                      <div className="font-medium text-dark">{r.profiles?.full_name || '-'}</div>
                      <div className="text-xs text-gray">{r.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-dark">{r.exercises?.title}</div>
                      <div className="text-xs text-gray">{r.exercises?.sessions?.modules?.courses?.title}</div>
                    </td>
                    <td className="px-6 py-3 text-gray">{SUBMISSION_MODE_LABELS[r.exercises?.submission_mode ?? ''] ?? '-'}</td>
                    <td className="px-6 py-3 text-gray">{formatDate(r.updated_at)}</td>
                    <td className="px-6 py-3 text-gray">{r.ai_score === null ? '-' : `${r.ai_score}/100`}</td>
                    <td className="px-6 py-3">
                      <Badge variant={STATUS_VARIANT[r.status]}>{SUBMISSION_STATUS_LABELS[r.status]}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => void open(r)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.exercises?.title} : {selected.profiles?.full_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.submission_text && (
                  <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-lightGray p-4 text-sm text-dark">
                    {selected.submission_text}
                  </div>
                )}
                {selected.submission_google_url && (
                  <a
                    href={selected.submission_google_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> Ouvrir le document de l'apprenant
                  </a>
                )}
                {selected.submission_file_url && (
                  <p className="text-sm">
                    {fileUrl ? (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" /> Télécharger le document
                      </a>
                    ) : (
                      <span className="text-gray">Préparation du lien…</span>
                    )}
                  </p>
                )}
                {selected.ai_feedback && (
                  <p className="rounded-lg border border-gray-100 p-3 text-sm text-gray">
                    <span className="font-medium text-dark">Avis de l'IA ({selected.ai_score}/100) : </span>
                    {selected.ai_feedback}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <label htmlFor="rev-score" className="text-xs text-gray">
                      Score (0 à 100)
                    </label>
                    <Input id="rev-score" type="number" min="0" max="100" value={score} onChange={(e) => setScore(Math.min(100, Math.max(0, Number(e.target.value))))} />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <label htmlFor="rev-feedback" className="text-xs text-gray">
                      Retour à l'apprenant
                    </label>
                    <Textarea id="rev-feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => review.mutate('valide_formateur')} disabled={review.isPending}>
                    Valider
                  </Button>
                  <Button variant="outline" onClick={() => review.mutate('rejete')} disabled={review.isPending}>
                    Rejeter
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
